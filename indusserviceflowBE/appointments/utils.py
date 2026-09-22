import random
from datetime import datetime, time, timedelta
from decimal import Decimal
from django.db.models import Max
from django.utils import timezone
from customers.models import Customer
from services.models import Service

SLOT_FREEING_STATUSES = ["Cancelled", "No Show", "Left Queue"]
DEFAULT_DAY_START_MIN = 6 * 60
DEFAULT_DAY_END_MIN = 22 * 60
NO_SHOW_GRACE_MINUTES = 15

FREE_EMPLOYEE_GRACE_MINUTES = 5

# A service leg that still has work outstanding, vs one that has
# reached a final state one way or another.
OPEN_SERVICE_STATUSES = ["Pending", "Confirmed", "Waiting", "In Progress"]

TERMINAL_SERVICE_STATUSES = ["Completed", "Cancelled", "No Show", "Left Queue"]


def derive_appointment_status(appointment, service_rows=None):
    """
    The status an appointment *should* have, given the current state
    of its individual service legs.

    An appointment is a container for one or more service legs, and
    each leg is completed independently by whichever employee is
    assigned to it. So the appointment's own status is a summary, and
    is never a reason to stop working a leg:

      - any leg In Progress            -> "In Progress"
      - some legs still open           -> "Waiting" once any leg has
                                          been finished, otherwise the
                                          appointment's booked state
                                          ("Waiting" if a leg is
                                          already waiting, else
                                          "Confirmed")
      - every leg finished, at least
        one of them Completed          -> "Completed"
      - every leg finished, none
        Completed                      -> that shared terminal status
                                          (Cancelled / No Show /
                                          Left Queue)

    Completing one leg therefore marks that leg Completed and leaves
    the rest untouched - the appointment only rolls up to "Completed"
    once nothing is outstanding.
    """

    rows = list(
        appointment.services.all() if service_rows is None else service_rows
    )

    if not rows:
        return appointment.status

    statuses = [row.status for row in rows]

    if "In Progress" in statuses:
        return "In Progress"

    open_statuses = [s for s in statuses if s in OPEN_SERVICE_STATUSES]

    if open_statuses:

        if "Completed" in statuses:
            return "Waiting"

        return "Waiting" if "Waiting" in open_statuses else "Confirmed"

    if "Completed" in statuses:
        return "Completed"

    for terminal in SLOT_FREEING_STATUSES:
        if all(s == terminal for s in statuses):
            return terminal

    return "Left Queue"


def sync_appointment_status(appointment, actor="SYSTEM", service_rows=None):
    """
    Recalculate and persist an appointment's status from its service
    legs. Call this after changing any single leg, instead of each
    caller re-deriving the roll-up by hand.
    """

    appointment.status = derive_appointment_status(appointment, service_rows)
    appointment.updated_by = actor
    appointment.save()

    return appointment.status


def generate_appointment_number():
    """
    Generate a unique appointment number.
    Example: APT-483921
    """
    from .models import Appointment

    while True:
        appointment_number = f"APT-{random.randint(100000, 999999)}"

        if not Appointment.objects.filter(
            appointment_number=appointment_number
        ).exists():
            return appointment_number


def generate_token_number(org_id, appointment_date):
    """
    Generate the next token number for an organization
    on a given appointment date.

    Must be called from inside a transaction.atomic() block in the
    caller so the select_for_update lock below actually holds until
    the new Appointment row is inserted. Locking existing rows for
    this org/date closes the race for the common case (an appointment
    already exists today); it can't lock a row that doesn't exist yet,
    so the very first booking of the day for an org still has a small
    residual race — handle that at the call site by retrying on
    IntegrityError against the (org_id, date, token_number) constraint.
    """

    from .models import Appointment

    appointments = Appointment.objects.select_for_update().filter(
        org_id=org_id, date=appointment_date
    )

    max_token = 0

    for appointment in appointments:
        try:
            token = int(appointment.token_number)
            if token > max_token:
                max_token = token
        except (ValueError, TypeError):
            continue

    return str(max_token + 1)


def _employee_free_since(employee_id, target_date):
    """
    When this employee last became free (idle, waiting to call
    someone) on target_date - i.e. the moment their previous service
    leg was wrapped up, one way or another (completed or skipped/
    transferred away, both of which are 'Left Queue' from their own
    point of view).

    AppointmentService.updated_on is auto_now, so the last save() that
    moved a leg out of 'In Progress' is exactly the timestamp we want
    for both a normal completion and a skip - no need to special-case
    completed_at.

    If the employee hasn't touched any service yet today, they've
    effectively been free since their shift started (or since the
    start of the day if they have no shift configured) - that's the
    earliest they could plausibly have called anyone.
    """

    from .models import AppointmentService
    from employees.models import Employee

    last_finished_at = AppointmentService.objects.filter(
        employee_id=employee_id,
        appointment__date=target_date,
        status__in=["Completed", "Left Queue"],
    ).aggregate(Max("updated_on"))["updated_on__max"]

    if last_finished_at is not None:
        return last_finished_at

    shift = (
        Employee.objects.filter(employee_id=employee_id)
        .select_related("shift")
        .values_list("shift__start_time", flat=True)
        .first()
    )

    day_start_time = shift or time.min
    naive = datetime.combine(target_date, day_start_time)
    return timezone.make_aware(naive, timezone.get_current_timezone())


def _next_in_line_free_since(target_date, org_id=None):
    """
    For every appointment that is currently "up next" for a free
    employee - i.e. exactly the appointment that call_next would serve
    right now for that employee - map its appointment id to the
    datetime that employee has been free/idle since.

    A customer at the front of a free employee's queue is, by
    definition, about to be called, so flipping them to 'No Show' the
    instant their own booked-slot grace period lapses would punish
    them for how long the *queue* took to reach them (earlier
    customers running over, an employee being tied up, etc.), not for
    actually failing to show up.

    That protection isn't unconditional forever, though: if the
    employee has been sitting free for a while and still hasn't
    called them, something's wrong (customer stepped away, wandered
    off) and the slot needs to be freed. See auto_mark_no_shows for
    how FREE_EMPLOYEE_GRACE_MINUTES is applied on top of this.

    Anyone further back in an employee's queue - or in the queue of an
    employee who is still busy with someone else - isn't in this map
    at all and remains eligible for the normal grace-period sweep,
    which is what keeps a genuinely-abandoned booking from jamming the
    queue forever.
    """

    from .models import AppointmentService

    same_day_legs = AppointmentService.objects.filter(
        appointment__date=target_date,
    )

    if org_id is not None:
        same_day_legs = same_day_legs.filter(appointment__org_id=org_id)

    employee_ids = (
        same_day_legs.filter(
            status__in=["Confirmed", "Waiting"],
            employee_id__isnull=False,
        )
        .values_list("employee_id", flat=True)
        .distinct()
    )

    free_since_by_appointment_id = {}

    for employee_id in employee_ids:

        is_busy = same_day_legs.filter(
            employee_id=employee_id,
            status="In Progress",
        ).exists()

        if is_busy:
            continue

        pending = same_day_legs.filter(
            employee_id=employee_id,
            status__in=["Confirmed", "Waiting"],
            appointment__status__in=["Confirmed", "Waiting", "In Progress"],
        ).select_related("appointment")

        next_row = min(
            pending,
            key=lambda row: int(row.appointment.token_number),
            default=None,
        )

        if next_row is not None:
            free_since_by_appointment_id[next_row.appointment_id] = (
                _employee_free_since(employee_id, target_date)
            )

    return free_since_by_appointment_id


def _auto_mark_no_shows_for_date(org_id, target_date, now_local):
    """
    The actual per-day sweep used by auto_mark_no_shows - see that
    function's docstring for the full behavior. Split out so
    auto_mark_no_shows can run it across more than one date at once.
    """

    from .models import Appointment

    candidates = (
        Appointment.objects.filter(
            status__in=["Confirmed", "Waiting"],
            date=target_date,
        )
        .exclude(services__status__in=["In Progress", "Completed"])
        .distinct()
        .prefetch_related("services")
    )

    if org_id is not None:
        candidates = candidates.filter(org_id=org_id)

    next_in_line_free_since = _next_in_line_free_since(target_date, org_id=org_id)

    grace = timedelta(minutes=NO_SHOW_GRACE_MINUTES)
    free_employee_grace = timedelta(minutes=FREE_EMPLOYEE_GRACE_MINUTES)
    affected = []

    for appointment in candidates:
        naive = datetime.combine(appointment.date, appointment.time)
        scheduled_dt = timezone.make_aware(naive, timezone.get_current_timezone())

        if now_local < scheduled_dt + grace:
            continue

        free_since = next_in_line_free_since.get(appointment.appointment_id)
        if free_since is not None and now_local < free_since + free_employee_grace:
            continue

        appointment.status = "No Show"
        appointment.updated_by = "SYSTEM"
        appointment.save()

        for row in appointment.services.filter(
            status__in=["Pending", "Confirmed", "Waiting"]
        ):
            row.status = "No Show"
            row.updated_by = "SYSTEM"
            record_waiting_time(row, ended_at=now_local)
            row.save(
                update_fields=["status", "updated_by", "updated_on", "waiting_time_min"]
            )

        affected.append(appointment)

    return affected


def auto_mark_no_shows(org_id=None, date=None):
    """
    Flip any appointment still sitting in 'Confirmed'/'Waiting' - with
    none of its services ever having been called (no leg is or was
    'In Progress'/'Completed') - to 'No Show' once its own booked
    slot is more than NO_SHOW_GRACE_MINUTES in the past.

    This is what stops a very-late customer from silently blocking,
    or worse jumping ahead of, everyone who arrived on time: once the
    grace period lapses the slot is freed ('No Show' is one of
    SLOT_FREEING_STATUSES) and every one of that appointment's
    service legs is bumped to 'Left Queue' so it stops counting
    against employee availability or the live queue. If the customer
    does then turn up, staff re-book them like a fresh walk-in rather
    than resuming a queue slot that's already been given away.

    Exception: an appointment that's currently up next for a free
    employee gets extra slack - see _next_in_line_free_since. Being
    overdue only because the queue itself ran behind isn't a no-show,
    so once this customer's own grace period lapses we check whether
    their employee is actually free and, if so, for how long:

      - employee still busy, or free for FREE_EMPLOYEE_GRACE_MINUTES
        or less -> keep waiting, don't mark as a no-show yet.
      - employee has been free for longer than
        FREE_EMPLOYEE_GRACE_MINUTES and still hasn't called them ->
        no longer protected, mark as a no-show like anyone else.

    Never touches an appointment that was actually started (any leg
    ever 'In Progress'/'Completed') no matter how old it is - that one
    is on the employee to finish, stay over for, or transfer; this
    function only closes out bookings nobody ever called in, which is
    a customer no-show regardless of which day it happened on.

    date=None (the default, used by every real caller) sweeps every
    date up to and including today that still has this kind of
    candidate - not just today - so a booking from days ago that
    nobody ever called never sits there forever just because the day
    changed. Pass an explicit `date` to check only that one day.

    Idempotent and cheap to call from every queue/appointments read -
    it only ever touches rows that are already overdue, so calling it
    from more than one request handler at the same instant just costs
    a couple of extra queries, never a double-write.

    Returns the list of Appointment objects that were flipped.
    """

    from .models import Appointment

    now_local = timezone.localtime()
    today = now_local.date()

    if date is not None:
        if date > today:
            return []
        dates_to_check = [date]
    else:
        pending_dates = (
            Appointment.objects.filter(
                status__in=["Confirmed", "Waiting"],
                date__lte=today,
            )
            .exclude(services__status__in=["In Progress", "Completed"])
        )

        if org_id is not None:
            pending_dates = pending_dates.filter(org_id=org_id)

        dates_to_check = list(
            pending_dates.order_by("date").values_list("date", flat=True).distinct()
        )

    affected = []

    for target_date in dates_to_check:
        affected.extend(_auto_mark_no_shows_for_date(org_id, target_date, now_local))

    return affected


def get_or_create_customer(
    org_id,
    customer_name,
    mobile,
    email=None,
    gender=None,
    created_by="System",
):
    """
    Return an existing customer if the mobile number
    already exists for the organization.
    Otherwise create a new customer.
    """

    customer = Customer.objects.filter(organization_id=org_id, Mobile=mobile).first()

    if customer:

        updated = False

        if customer.CustomerName != customer_name:
            customer.CustomerName = customer_name
            updated = True

        if email and customer.Email != email:
            customer.Email = email
            updated = True

        if gender and customer.Gender != gender:
            customer.Gender = gender
            updated = True

        if updated:
            customer.UpdatedBy = created_by
            customer.save()

        return customer

    return Customer.objects.create(
        organization_id=org_id,
        CustomerName=customer_name,
        Mobile=mobile,
        Email=email,
        Gender=gender,
        CreatedBy=created_by,
        UpdatedBy=created_by,
    )


def get_services(service_ids):
    """
    Return all active services for the given IDs.
    """

    return Service.objects.filter(service_id__in=service_ids, status="Active")


def calculate_total_fee(services):
    """
    Calculate the total fee.
    """

    total_fee = Decimal("0.00")

    for service in services:
        total_fee += service.fee

    return total_fee


def calculate_total_duration(services):
    """
    Calculate the total duration in minutes.
    """

    total_duration = 0

    for service in services:
        total_duration += service.duration

    return total_duration


def _time_to_minutes(t):

    if isinstance(t, str):
        parts = t.split(":")
        return int(parts[0]) * 60 + int(parts[1])
    return t.hour * 60 + t.minute


def _minutes_to_time_str(minutes):
    minutes = minutes % (24 * 60)
    return f"{minutes // 60:02d}:{minutes % 60:02d}"


def _minutes_to_time(minutes):
    minutes = minutes % (24 * 60)
    return time(hour=minutes // 60, minute=minutes % 60)


def compute_sequential_offsets(ordered_durations):
    """
    Multi-service appointments run their legs back-to-back (leg 0
    starts at the appointment's own start time, leg 1 starts the
    moment leg 0's duration elapses, and so on) rather than all in
    parallel at the same clock time. Given an ordered list of leg
    durations, return the parallel list of cumulative offsets (in
    minutes) — offset[0] is always 0, offset[i] is the sum of every
    duration before it.

    Every place that reasons about a leg's own start time (slot
    search, busy-range reconstruction, conflict checks at booking
    time, and display of per-service times) must use this same rule
    against the same canonical ordering, or the read side and write
    side will disagree about what's actually booked.
    """

    offsets = []
    running = 0

    for duration in ordered_durations:
        offsets.append(running)
        running += duration or 0

    return offsets


def compute_service_leg_start_times(appointment_time, service_rows):
    """
    Given an appointment's own start time and its AppointmentService
    rows in canonical order (Meta.ordering on AppointmentService is
    appointment_service_id — i.e. insertion order, which matches the
    order `assignments`/`service_ids` arrived in from the frontend),
    return a list of (row, start_time) tuples using the same
    sequential-offset rule as the slot search: each leg starts
    immediately after the previous leg's duration elapses.

    start_time is a datetime.time, matching the type of
    Appointment.time, so callers can drop it straight into an API
    response or serializer field.
    """

    offsets = compute_sequential_offsets(
        [row.duration_min or 0 for row in service_rows]
    )

    base_start_min = _time_to_minutes(appointment_time)

    return [
        (row, _minutes_to_time(base_start_min + offset))
        for row, offset in zip(service_rows, offsets)
    ]


def get_leg_start_time(appointment_service_row):
    """
    Convenience wrapper around compute_service_leg_start_times for
    call sites that only have a single AppointmentService row (e.g.
    an employee's own schedule) rather than the full ordered list.
    Walks the row's siblings on its parent appointment to compute its
    offset. Costs one extra query per row unless the caller has
    already prefetched appointment__services — fine at this data
    scale, but worth prefetching if this is called in a loop over
    many rows.
    """

    siblings = list(appointment_service_row.appointment.services.all())

    for row, start_time in compute_service_leg_start_times(
        appointment_service_row.appointment.time, siblings
    ):
        if row.appointment_service_id == appointment_service_row.appointment_service_id:
            return start_time

    return appointment_service_row.appointment.time


def get_scheduled_datetime(appointment_service_row):
    """
    Timezone-aware datetime this service leg was actually booked to
    start - the appointment's date combined with the leg's own
    sequential start time (get_leg_start_time). This is the zero-point
    every waiting-time calculation should measure from.
    """

    leg_time = get_leg_start_time(appointment_service_row)
    naive = datetime.combine(appointment_service_row.appointment.date, leg_time)
    return timezone.make_aware(naive, timezone.get_current_timezone())


def record_waiting_time(appointment_service_row, ended_at=None):
    """
    Compute and set waiting_time_min on this leg - the minutes between
    its scheduled start (get_scheduled_datetime) and `ended_at` (the
    moment its wait actually ended: called in for service, or swept
    as No Show / Left Queue). Defaults `ended_at` to now.

    Does not save() - callers already save the row (often with an
    explicit update_fields list), so this just sets the attribute for
    that same save to pick up.
    """

    ended_at = ended_at or timezone.now()
    scheduled_dt = get_scheduled_datetime(appointment_service_row)

    appointment_service_row.waiting_time_min = max(
        0,
        round((ended_at - scheduled_dt).total_seconds() / 60),
    )


def get_employee_busy_ranges(employee_id, date, exclude_appointment_id=None):
    """
    (start_minute, end_minute) ranges this employee is already booked
    for on the given date, excluding appointments in a slot-freeing
    status (cancelled / no-show / left queue), which no longer hold
    the slot.

    A multi-service appointment's legs run sequentially, not all at
    appointment.time — so for each appointment we walk every one of
    its services in canonical order, tracking a running offset, and
    only emit a busy range for the leg(s) actually assigned to this
    employee. (We need every leg's duration, including legs staffed
    by other employees, to know this employee's own leg's offset —
    that's why this queries whole appointments rather than just this
    employee's AppointmentService rows.)

    `exclude_appointment_id` leaves one appointment's own ranges out
    of the result — used when rescheduling that same appointment, so
    its still-not-yet-moved old slot doesn't collide with the new
    slot being checked for it.
    """

    from .models import Appointment

    appointments = (
        Appointment.objects.filter(
            date=date,
            services__employee_id=employee_id,
        )
        .exclude(status__in=SLOT_FREEING_STATUSES)
        .distinct()
        .prefetch_related("services")
    )

    if exclude_appointment_id is not None:
        appointments = appointments.exclude(appointment_id=exclude_appointment_id)

    ranges = []

    for appointment in appointments:

        service_rows = list(appointment.services.all())

        legs = compute_service_leg_start_times(appointment.time, service_rows)

        for row, start_time in legs:

            if row.employee_id != employee_id:
                continue

            if row.status not in ("Pending", "Confirmed", "Waiting", "In Progress"):
                continue

            start_min = _time_to_minutes(start_time)
            end_min = start_min + (row.duration_min or 0)

            ranges.append((start_min, end_min))

    return ranges


def _ranges_overlap(start1, end1, start2, end2):
    return start1 < end2 and start2 < end1


def _shift_bounds(shift):
    """
    Return (start_min, end_min) for a shift, in minutes past midnight
    of the shift's start day.

    Most shifts are same-day (e.g. 09:00-18:00) and this is just
    (start, end). An overnight shift (e.g. 21:00-06:00, where the
    end clock-time is not after the start clock-time) instead has
    its end pushed past 1440 — i.e. treated as 21:00-30:00 — so
    every other comparison in this module (scan range, break window,
    busy ranges) can keep treating the shift as one contiguous
    interval instead of special-casing the midnight wrap.
    """

    start_min = _time_to_minutes(shift.start_time)
    end_min = _time_to_minutes(shift.end_time)

    if end_min <= start_min:
        end_min += 24 * 60

    return start_min, end_min


def employee_is_free(
    employee,
    date,
    start_min,
    duration_min,
    now_min=None,
    busy_cache=None,
    exclude_appointment_id=None,
):
    """
    Whether `employee` can take a service of `duration_min` starting
    at `start_min` (minutes since midnight) on `date`, given their
    shift and any bookings they already hold that day.

    `exclude_appointment_id` (only honoured when `busy_cache` isn't
    used, i.e. for one-off checks like rescheduling) leaves that
    appointment's own existing ranges out of the busy check - see
    get_employee_busy_ranges.
    """

    if employee is None or employee.status != "Active":
        return False

    shift = employee.shift

    if shift is None or shift.status != "Active":
        return False

    shift_start, shift_end = _shift_bounds(shift)

    end_min = start_min + duration_min

    if start_min < shift_start or end_min > shift_end:
        return False

    if now_min is not None and start_min <= now_min:
        return False

    if shift.break_start is not None and shift.break_end is not None:

        break_start_min = _time_to_minutes(shift.break_start)
        break_end_min = _time_to_minutes(shift.break_end)

        if break_start_min < shift_start:
            break_start_min += 24 * 60

        if break_end_min <= break_start_min:
            break_end_min += 24 * 60

        if _ranges_overlap(start_min, end_min, break_start_min, break_end_min):
            return False

    if busy_cache is not None:

        busy = busy_cache.get(employee.employee_id)

        if busy is None:
            busy = get_employee_busy_ranges(employee.employee_id, date)
            busy_cache[employee.employee_id] = busy

    else:
        busy = get_employee_busy_ranges(
            employee.employee_id, date, exclude_appointment_id=exclude_appointment_id
        )

    for busy_start, busy_end in busy:
        if _ranges_overlap(start_min, end_min, busy_start, busy_end):
            return False

    return True


def compute_available_slots(
    date,
    duration_lookup,
    candidate_employees_by_key,
    interval_min=None,
    now_min=None,
):
    """
    Shared slot-scan used by both booking flows.

    duration_lookup: {key: duration_min} — one entry per required
        "leg" of the appointment (a service, keyed however the
        caller likes — e.g. by service_id).

    candidate_employees_by_key: {key: [Employee, ...]} — the
        employee(s) who could staff that leg. For the org-admin flow
        this is a single explicitly-assigned employee; for public
        booking (no employee chosen yet) this is every employee
        qualified for that service, and the slot is available if ANY
        one of them is free.

    interval_min: step between candidate slot start times. When not
        given, defaults to the appointment's own total duration (the
        sum of every leg in duration_lookup, since legs run
        back-to-back) so slots line up with how long the service(s)
        actually take instead of a generic fixed grid — e.g. a
        45-minute service offers slots at :00/:45/:30(next hour)
        rather than every 30 minutes regardless of length.

    Returns a sorted list of "HH:MM" strings where every key in
    duration_lookup has at least one free, qualified employee. A
    candidate start time is skipped entirely if it (or any of its
    sequential legs) would fall inside a staffing employee's break
    window — see employee_is_free.
    """

    if interval_min is None:
        interval_min = max(sum(duration_lookup.values()) or 30, 5)

    all_employees = [
        employee
        for employees in candidate_employees_by_key.values()
        for employee in employees
    ]

    if not all_employees:
        return []

    shift_bounds = [
        _shift_bounds(e.shift) for e in all_employees if e.shift is not None
    ]

    if not shift_bounds:
        return []

    shift_starts = [b[0] for b in shift_bounds]
    shift_ends = [b[1] for b in shift_bounds]

    scan_start = min(shift_starts)
    scan_end = max(shift_ends)

    keys_in_order = list(duration_lookup.keys())

    offsets_by_key = dict(
        zip(
            keys_in_order,
            compute_sequential_offsets([duration_lookup[key] for key in keys_in_order]),
        )
    )

    busy_cache = {}
    available = []

    start_min = scan_start

    while start_min < scan_end:

        slot_ok = True

        for key, duration_min in duration_lookup.items():

            leg_start_min = start_min + offsets_by_key[key]

            employees = candidate_employees_by_key.get(key, [])

            if not any(
                employee_is_free(
                    employee,
                    date,
                    leg_start_min,
                    duration_min,
                    now_min=now_min,
                    busy_cache=busy_cache,
                )
                for employee in employees
            ):
                slot_ok = False
                break

        if slot_ok:
            available.append(_minutes_to_time_str(start_min))

        start_min += interval_min

    return available
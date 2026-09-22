import random
import string

from django.utils import timezone

from .models import Employee

DEFAULT_PASSWORD = "Welcome@123"


def get_shift_window_status(shift, at=None):
    """
    Where `at` (a datetime.time, defaults to the current local time)
    falls relative to a Shift's [start_time, end_time) window.

    Returns one of:
      - "no_shift"    - employee has no shift assigned at all.
      - "not_started" - shift exists but hasn't begun yet.
      - "on_shift"    - `at` is inside the shift window right now.
      - "ended"       - shift has already finished for the day.

    Handles shifts that cross midnight (end_time < start_time, e.g. a
    22:00-06:00 night shift) by treating "on shift" as anything from
    start_time through midnight, or from midnight through end_time.

    For an overnight shift, there is an unavoidable ambiguity in the
    dead zone between end_time and start_time on the clock (e.g.
    07:00 for a 22:00-06:00 shift): a bare time-of-day comparison
    can't tell "last night's shift already ended" from "tonight's
    shift hasn't started yet" without knowing which calendar day is
    meant. We deliberately resolve that ambiguity as "not_started"
    rather than "ended" - the previous behaviour treated the whole
    dead zone as "ended", which is what caused appointments to be
    marked Left Queue for employees whose shift genuinely had not
    started yet. Callers that need to auto-expire stale appointments
    should only act on the unambiguous "ended" state.
    """

    if shift is None:
        return "no_shift"

    if at is None:
        at = timezone.localtime().time()

    start, end = shift.start_time, shift.end_time

    if start == end:

        return "on_shift"

    if start < end:

        if at < start:
            return "not_started"
        if at >= end:
            return "ended"
        return "on_shift"

    if at >= start or at < end:
        return "on_shift"

    return "not_started"


def generate_unique_username(employee_name):

    if not employee_name:
        raise ValueError("Employee name is required")

    base = "".join(
        character for character in employee_name.lower() if character.isalnum()
    )

    while True:

        random_part = "".join(random.choices(string.digits, k=4))

        username = f"{base}{random_part}"

        if not Employee.objects.filter(username=username).exists():

            return username


def generate_employee_code():
    """
    Generate the next EMP#### code.

    Must be called from inside a transaction.atomic() block in the
    caller so the select_for_update lock below actually holds until
    the new Employee row is inserted, closing the race where two
    concurrent create requests both read the same "last" employee_id
    and generate the same code. The caller should still retry on
    IntegrityError as defense in depth (mirrors how appointment
    numbers/token numbers are generated in appointments/utils.py).
    """

    last_employee = (
        Employee.objects.select_for_update().order_by("-employee_id").first()
    )

    if last_employee:

        next_number = last_employee.employee_id + 1

    else:

        next_number = 1

    return f"EMP{next_number:04d}"


def calculate_employee_rating(employee):
    """
    An employee's rating is the average of the star ratings customers
    have actually left for them, one per completed service leg (see
    feedback.models.Feedback - a customer rates each employee who
    served them on an appointment separately). This is the *only*
    source of the rating shown anywhere (booking page, employee
    lists, etc.); nobody - org admin included - can type in a score
    directly, only customers via their post-visit feedback link, so
    it always reflects genuine feedback and can't be gamed or played
    favourites with.

    Returns None when the employee has no feedback yet (nothing to
    rate), otherwise a float rounded to 2 decimal places.
    """

    from django.db.models import Avg

    from feedback.models import Feedback

    result = Feedback.objects.filter(employee_id=employee.employee_id).aggregate(
        average=Avg("rating")
    )

    average = result["average"]

    if average is None:
        return None

    return round(average, 2)


def generate_employee_code():
    """
    Generate the next EMP#### code.

    Must be called from inside a transaction.atomic() block in the
    caller so the select_for_update lock below actually holds until
    the new Employee row is inserted, closing the race where two
    concurrent create requests both read the same "last" employee_id
    and generate the same code. The caller should still retry on
    IntegrityError as defense in depth (mirrors how appointment
    numbers/token numbers are generated in appointments/utils.py).
    """

    last_employee = (
        Employee.objects.select_for_update().order_by("-employee_id").first()
    )

    if last_employee:

        next_number = last_employee.employee_id + 1

    else:

        next_number = 1

    return f"EMP{next_number:04d}"

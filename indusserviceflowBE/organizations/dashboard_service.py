from datetime import datetime, time, timedelta

from django.db.models import Avg, Count, F, Max, Q
from django.db.models.functions import ExtractHour
from django.utils import timezone


# ============================================================
# DASHBOARD COLORS
# ============================================================

COLORS = [
    "#0EA5D9",
    "#14B88A",
    "#F59E0B",
    "#8B5CF6",
    "#EC4899",
    "#64748B",
]


# ============================================================
# CUSTOMER FLOW TIME SLOTS
# ============================================================

SLOT_MAP = [
    ("8-10 AM", 8, 10),
    ("12-2 PM", 12, 14),
    ("4-6 PM", 16, 18),
    ("8-10 PM", 20, 22),
]


# ============================================================
# DATE HELPERS
# ============================================================

def _day_range(date_value):
    """
    Return timezone-aware start/end datetime for a date.
    """

    start = timezone.make_aware(
        datetime.combine(
            date_value,
            time.min,
        )
    )

    end = start + timedelta(days=1)

    return start, end


def _seconds_to_minutes(seconds):
    """
    Convert seconds to rounded minutes.
    """

    if seconds is None:
        return 0

    return round(seconds / 60)


class DashboardService:

    # ========================================================
    # MAIN STATISTICS
    # ========================================================

    @staticmethod
    def get_stats(org_id) -> dict:
        """
        Return organization dashboard KPI statistics.

        All values are calculated from the database.
        """

        from appointments.models import Appointment
        from appointments.models import AppointmentService
        from employees.models import Employee

        today = timezone.localdate()
        month_start = today.replace(day=1)

        # ----------------------------------------------------
        # THIS MONTH'S APPOINTMENTS (month_start -> today)
        # Used for the monthly analysis figures below.
        # ----------------------------------------------------

        appointments_today = Appointment.objects.filter(
            org_id=org_id,
            date__range=(month_start, today),
        )

        # ----------------------------------------------------
        # LIVE APPOINTMENTS (today only)
        # Used only for the two "right now" queue counters,
        # which are not meaningful as a monthly sum.
        # ----------------------------------------------------

        appointments_live = Appointment.objects.filter(
            org_id=org_id,
            date=today,
        )
        
        # ----------------------------------------------------
        # PATIENTS THIS MONTH
        # ----------------------------------------------------

        patients_today = appointments_today.count()

        # ----------------------------------------------------
        # PATIENTS SERVED
        # ----------------------------------------------------

        patients_served = appointments_today.filter(
            status="Completed"
        ).count()

        # ----------------------------------------------------
        # ACTIVE QUEUE
        # Waiting + In Progress
        # ----------------------------------------------------

        active_queue = appointments_live.filter(
            status__in=[
                "Waiting",
                "In Progress",
            ]
        ).count()

        # ----------------------------------------------------
        # QUEUE LENGTH
        # Waiting only
        # ----------------------------------------------------

        queue_length = appointments_live.filter(
            status="Waiting"
        ).count()

        # ----------------------------------------------------
        # WAIT TIME
        #
        # There is no dedicated queue_entered_at field in the
        # provided Appointment model.
        #
        # Therefore:
        #
        # Appointment.created_on
        #             ↓
        # AppointmentService.started_at
        #
        # is used as the available wait-time calculation.
        # ----------------------------------------------------

        wait_rows = (
            AppointmentService.objects
            .filter(
                appointment__org_id=org_id,
                appointment__date__range=(month_start, today),
                started_at__isnull=False,
                appointment__created_on__isnull=False,
            )
            .values(
                "appointment_id",
                "appointment__created_on",
                "started_at",
            )
        )

        wait_minutes = []

        for row in wait_rows:

            created_at = row["appointment__created_on"]
            started_at = row["started_at"]

            if not created_at or not started_at:
                continue

            seconds = (
                started_at - created_at
            ).total_seconds()

            # Ignore invalid negative values.
            if seconds < 0:
                continue

            wait_minutes.append(
                seconds / 60
            )

        if wait_minutes:
            avg_wait_time = round(
                sum(wait_minutes)
                / len(wait_minutes)
            )

            max_wait_time = round(
                max(wait_minutes)
            )
        else:
            avg_wait_time = 0
            max_wait_time = 0

        # ----------------------------------------------------
        # EMPLOYEE UTILIZATION
        #
        # Actual completed/in-progress service time is compared
        # against active employee shift capacity.
        # ----------------------------------------------------

        active_employees = Employee.objects.filter(
            org_id=org_id,
            status="Active",
        ).select_related("shift")

        total_shift_minutes = 0
        used_service_minutes = 0

        # ----------------------------------------------------
        # Shift capacity
        # ----------------------------------------------------

        for employee in active_employees:

            shift = employee.shift

            if not shift:
                continue

            start_time = shift.start_time
            end_time = shift.end_time

            start_minutes = (
                start_time.hour * 60
                + start_time.minute
            )

            end_minutes = (
                end_time.hour * 60
                + end_time.minute
            )

            # Overnight shift
            if end_minutes <= start_minutes:
                end_minutes += 24 * 60

            shift_minutes = (
                end_minutes
                - start_minutes
            )

            # Remove break time if available.
            if (
                shift.break_start
                and shift.break_end
            ):

                break_start = (
                    shift.break_start.hour * 60
                    + shift.break_start.minute
                )

                break_end = (
                    shift.break_end.hour * 60
                    + shift.break_end.minute
                )

                if break_end <= break_start:
                    break_end += 24 * 60

                shift_minutes -= (
                    break_end
                    - break_start
                )

            if shift_minutes > 0:
                total_shift_minutes += shift_minutes

        # Scale one day's shift capacity across every day in the
        # month-to-date range, so utilization reflects the whole
        # period rather than a single day's capacity.
        days_in_range = (today - month_start).days + 1
        total_shift_minutes *= days_in_range

        # ----------------------------------------------------
        # Actual service duration
        # ----------------------------------------------------

        service_rows = (
            AppointmentService.objects
            .filter(
                appointment__org_id=org_id,
                appointment__date__range=(month_start, today),
                employee__isnull=False,
            )
            .filter(
                status__in=[
                    "In Progress",
                    "Completed",
                ]
            )
            .values(
                "actual_duration_min",
                "started_at",
                "completed_at",
                "duration_min",
            )
        )

        for row in service_rows:

            actual_duration = (
                row["actual_duration_min"]
            )

            if actual_duration is not None:
                used_service_minutes += (
                    actual_duration
                )
                continue

            started_at = row["started_at"]
            completed_at = row["completed_at"]

            if started_at and completed_at:

                seconds = (
                    completed_at
                    - started_at
                ).total_seconds()

                if seconds > 0:
                    used_service_minutes += (
                        seconds / 60
                    )

        if total_shift_minutes > 0:

            employee_utilization = round(
                (
                    used_service_minutes
                    / total_shift_minutes
                )
                * 100,
                1,
            )

            # Don't show impossible utilization.
            employee_utilization = min(
                employee_utilization,
                100,
            )

        else:
            employee_utilization = 0

        # ----------------------------------------------------
        # PEAK HOUR
        #
        # Group appointments by actual hour.
        # ----------------------------------------------------

        peak_row = (
            appointments_today
            .annotate(
                appointment_hour=ExtractHour(
                    "time"
                )
            )
            .values("appointment_hour")
            .annotate(
                count=Count("appointment_id")
            )
            .order_by(
                "-count",
                "appointment_hour",
            )
            .first()
        )

        if peak_row:
            peak_hour_number = peak_row[
                "appointment_hour"
            ]

            peak_hour = (
                datetime
                .strptime(
                    f"{peak_hour_number:02d}:00",
                    "%H:%M",
                )
                .strftime("%I %p")
                .lstrip("0")
            )

        else:
            peak_hour = "N/A"

        # ----------------------------------------------------
        # FINAL STATS
        # ----------------------------------------------------

        return {
            "patients_today": patients_today,
            "patients_served": patients_served,
            "active_queue": active_queue,
            "avg_wait_time": avg_wait_time,
            "max_wait_time": max_wait_time,
            "queue_length": queue_length,
            "employee_utilization": employee_utilization,
            "peak_hour": peak_hour,
            "period_start": month_start.isoformat(),
            "period_end": today.isoformat(),
        }

    # ========================================================
    # QUEUE LENGTH TREND
    # ========================================================

    @staticmethod
    def get_queue_length_trend(org_id) -> list:
        """
        Show this month's daily appointment volume, one point per
        calendar day from the 1st of the month through today.
        """

        from appointments.models import Appointment

        today = timezone.localdate()
        month_start = today.replace(day=1)

        rows = (
            Appointment.objects
            .filter(
                org_id=org_id,
                date__range=(month_start, today),
            )
            .values("date")
            .annotate(
                value=Count("appointment_id")
            )
            .order_by("date")
        )

        counts_by_date = {row["date"]: row["value"] for row in rows}

        result = []
        cursor = month_start
        while cursor <= today:
            result.append(
                {
                    "time": cursor.strftime("%d %b"),
                    "value": counts_by_date.get(cursor, 0),
                }
            )
            cursor += timedelta(days=1)

        return result

    # ========================================================
    # SERVICE DISTRIBUTION
    # ========================================================

    @staticmethod
    def get_service_distribution(org_id) -> list:
        """
        Show this month's appointments grouped by service.
        """

        from appointments.models import AppointmentService

        today = timezone.localdate()
        month_start = today.replace(day=1)

        rows = (
            AppointmentService.objects
            .filter(
                appointment__org_id=org_id,
                appointment__date__range=(month_start, today),
            )
            .exclude(
                appointment__status__in=[
                    "Cancelled",
                    "No Show",
                ]
            )
            .values("service_name")
            .annotate(
                value=Count(
                    "appointment_service_id"
                )
            )
            .order_by("-value")
        )

        total = sum(
            row["value"]
            for row in rows
        )

        total = total or 1

        result = []

        for index, row in enumerate(rows):

            percentage = round(
                row["value"]
                / total
                * 100
            )

            result.append(
                {
                    "name": row["service_name"],
                    "value": row["value"],
                    "pct": percentage,
                    "color": COLORS[
                        index % len(COLORS)
                    ],
                }
            )

        return result

    # ========================================================
    # WAIT TIME TREND
    # ========================================================

    @staticmethod
    def get_wait_time_trend(org_id) -> list:
        """
        Calculate average wait time grouped by appointment hour,
        aggregated across this month's appointments.

        Wait time:
            created_on -> started_at
        """

        from appointments.models import AppointmentService

        today = timezone.localdate()
        month_start = today.replace(day=1)

        rows = (
            AppointmentService.objects
            .filter(
                appointment__org_id=org_id,
                appointment__date__range=(month_start, today),
                started_at__isnull=False,
            )
            .values(
                "appointment__time",
                "appointment__created_on",
                "started_at",
            )
            .order_by(
                "appointment__time"
            )
        )

        hourly_wait = {}

        for row in rows:

            created_at = (
                row["appointment__created_on"]
            )

            started_at = row["started_at"]

            if not created_at or not started_at:
                continue

            seconds = (
                started_at - created_at
            ).total_seconds()

            if seconds < 0:
                continue

            hour = (
                row["appointment__time"]
                .hour
            )

            hourly_wait.setdefault(
                hour,
                []
            )

            hourly_wait[hour].append(
                seconds / 60
            )

        result = []

        for hour in sorted(hourly_wait):

            values = hourly_wait[hour]

            average = round(
                sum(values) / len(values),
                1,
            )

            result.append(
                {
                    "time": datetime
                    .strptime(
                        f"{hour:02d}:00",
                        "%H:%M",
                    )
                    .strftime("%H:%M"),
                    "value": average,
                }
            )

        return result

    # ========================================================
    # EMPLOYEE UTILIZATION
    # ========================================================

    @staticmethod
    def get_employee_utilization(org_id) -> list:
        """
        Calculate employee utilization using actual service
        minutes against employee shift minutes.
        """

        from employees.models import Employee
        from appointments.models import AppointmentService

        today = timezone.localdate()
        month_start = today.replace(day=1)
        days_in_range = (today - month_start).days + 1

        employees = (
            Employee.objects
            .filter(
                org_id=org_id,
                status="Active",
            )
            .select_related("shift")
        )

        result = []

        for employee in employees:

            shift = employee.shift

            if not shift:
                result.append(
                    {
                        "name": employee.employee_name,
                        "value": 0,
                    }
                )
                continue

            # ----------------------------------------------
            # Shift minutes
            # ----------------------------------------------

            start_minutes = (
                shift.start_time.hour * 60
                + shift.start_time.minute
            )

            end_minutes = (
                shift.end_time.hour * 60
                + shift.end_time.minute
            )

            if end_minutes <= start_minutes:
                end_minutes += 24 * 60

            shift_minutes = (
                end_minutes
                - start_minutes
            )

            # Break
            if (
                shift.break_start
                and shift.break_end
            ):

                break_start = (
                    shift.break_start.hour * 60
                    + shift.break_start.minute
                )

                break_end = (
                    shift.break_end.hour * 60
                    + shift.break_end.minute
                )

                if break_end <= break_start:
                    break_end += 24 * 60

                shift_minutes -= (
                    break_end
                    - break_start
                )

            # Scale one day's shift minutes across the whole
            # month-to-date range being analyzed.
            shift_minutes *= days_in_range

            # ----------------------------------------------
            # Employee's services this month
            # ----------------------------------------------

            services = (
                AppointmentService.objects
                .filter(
                    employee_id=employee.employee_id,
                    appointment__date__range=(month_start, today),
                )
                .filter(
                    status__in=[
                        "In Progress",
                        "Completed",
                    ]
                )
                .values(
                    "actual_duration_min",
                    "started_at",
                    "completed_at",
                )
            )

            used_minutes = 0

            for service in services:

                if (
                    service[
                        "actual_duration_min"
                    ] is not None
                ):

                    used_minutes += service[
                        "actual_duration_min"
                    ]

                    continue

                started_at = service[
                    "started_at"
                ]

                completed_at = service[
                    "completed_at"
                ]

                if started_at and completed_at:

                    seconds = (
                        completed_at
                        - started_at
                    ).total_seconds()

                    if seconds > 0:
                        used_minutes += (
                            seconds / 60
                        )

                elif started_at:

                    # For an In Progress service,
                    # calculate until now.
                    seconds = (
                        timezone.now()
                        - started_at
                    ).total_seconds()

                    if seconds > 0:
                        used_minutes += (
                            seconds / 60
                        )

            if shift_minutes > 0:

                utilization = round(
                    (
                        used_minutes
                        / shift_minutes
                    )
                    * 100,
                    1,
                )

                utilization = min(
                    utilization,
                    100,
                )

            else:
                utilization = 0

            result.append(
                {
                    "name": employee.employee_name,
                    "value": utilization,
                }
            )

        return result

    # ========================================================
    # PEAK HOURS
    # ========================================================

    @staticmethod
    def get_peak_hours(org_id) -> list:
        """
        Return this month's appointment count grouped by hour.
        """

        from appointments.models import Appointment

        today = timezone.localdate()
        month_start = today.replace(day=1)

        rows = (
            Appointment.objects
            .filter(
                org_id=org_id,
                date__range=(month_start, today),
            )
            .annotate(
                appointment_hour=ExtractHour(
                    "time"
                )
            )
            .values(
                "appointment_hour"
            )
            .annotate(
                value=Count("appointment_id")
            )
            .order_by(
                "appointment_hour"
            )
        )

        result = []

        for row in rows:

            hour = row[
                "appointment_hour"
            ]

            if hour is None:
                continue

            label = (
                datetime
                .strptime(
                    f"{hour:02d}:00",
                    "%H:%M",
                )
                .strftime("%H:%M")
            )

            result.append(
                {
                    "hour": label,
                    "value": row["value"],
                }
            )

        return result

    # ========================================================
    # CUSTOMER FLOW
    # ========================================================

    @staticmethod
    def get_customer_flow(org_id) -> list:
        """
        Booked vs served appointments for this month, grouped
        into time-of-day slots.
        """

        from appointments.models import Appointment

        today = timezone.localdate()
        month_start = today.replace(day=1)

        result = []

        for (
            slot_label,
            start_hour,
            end_hour,
        ) in SLOT_MAP:

            booked = (
                Appointment.objects
                .filter(
                    org_id=org_id,
                    date__range=(month_start, today),
                    time__gte=(
                        f"{start_hour:02d}:00"
                    ),
                    time__lt=(
                        f"{end_hour:02d}:00"
                    ),
                )
                .exclude(
                    status__in=[
                        "Cancelled",
                        "No Show",
                    ]
                )
                .count()
            )

            served = (
                Appointment.objects
                .filter(
                    org_id=org_id,
                    date__range=(month_start, today),
                    time__gte=(
                        f"{start_hour:02d}:00"
                    ),
                    time__lt=(
                        f"{end_hour:02d}:00"
                    ),
                    status="Completed",
                )
                .count()
            )

            result.append(
                {
                    "slot": slot_label,
                    "booked": booked,
                    "served": served,
                }
            )

        return result

    # ========================================================
    # WAIT DISTRIBUTION
    # ========================================================

    @staticmethod
    def get_wait_distribution(org_id) -> list:
        """
        Calculate this month's customers by wait-time bucket.
        """

        from appointments.models import AppointmentService

        today = timezone.localdate()
        month_start = today.replace(day=1)

        rows = (
            AppointmentService.objects
            .filter(
                appointment__org_id=org_id,
                appointment__date__range=(month_start, today),
                started_at__isnull=False,
            )
            .values(
                "appointment__created_on",
                "started_at",
            )
        )

        distribution = {
            "0-5m": 0,
            "5-10m": 0,
            "10-20m": 0,
            "30m+": 0,
        }

        for row in rows:

            created_at = (
                row["appointment__created_on"]
            )

            started_at = row["started_at"]

            if not created_at or not started_at:
                continue

            seconds = (
                started_at - created_at
            ).total_seconds()

            if seconds < 0:
                continue

            minutes = seconds / 60

            if minutes <= 5:
                distribution["0-5m"] += 1

            elif minutes <= 10:
                distribution["5-10m"] += 1

            elif minutes <= 20:
                distribution["10-20m"] += 1

            else:
                distribution["30m+"] += 1

        return [
            {
                "range": "0-5m",
                "value": distribution["0-5m"],
            },
            {
                "range": "5-10m",
                "value": distribution["5-10m"],
            },
            {
                "range": "10-20m",
                "value": distribution["10-20m"],
            },
            {
                "range": "30m+",
                "value": distribution["30m+"],
            },
        ]

    # ========================================================
    # QUEUE STATUS
    # ========================================================

    @staticmethod
    def get_queue_status(org_id) -> list:
        """
        Current today's queue status.
        """

        from appointments.models import Appointment

        today = timezone.localdate()

        queryset = Appointment.objects.filter(
            org_id=org_id,
            date=today,
        )

        done = queryset.filter(
            status="Completed"
        ).count()

        serving = queryset.filter(
            status="In Progress"
        ).count()

        waiting = queryset.filter(
            status="Waiting"
        ).count()

        total = (
            done
            + serving
            + waiting
        )

        if total == 0:
            return [
                {
                    "label": "Done",
                    "value": 0,
                    "pct": 0,
                    "color": "#64748B",
                },
                {
                    "label": "Serving",
                    "value": 0,
                    "pct": 0,
                    "color": "#0EA5D9",
                },
                {
                    "label": "Waiting",
                    "value": 0,
                    "pct": 0,
                    "color": "#F59E0B",
                },
            ]

        return [
            {
                "label": "Done",
                "value": done,
                "pct": round(
                    done / total * 100
                ),
                "color": "#64748B",
            },
            {
                "label": "Serving",
                "value": serving,
                "pct": round(
                    serving / total * 100
                ),
                "color": "#14B88A",
            },
            {
                "label": "Waiting",
                "value": waiting,
                "pct": round(
                    waiting / total * 100
                ),
                "color": "#F59E0B",
            },
        ]
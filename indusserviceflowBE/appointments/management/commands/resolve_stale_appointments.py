from django.core.management.base import BaseCommand
from django.db import transaction
from django.db.models import F
from django.utils import timezone
 
from appointments.email_utils import send_left_queue_email
from appointments.models import AppointmentService
from appointments.utils import record_waiting_time
 
 
class Command(BaseCommand):
 
    help = (
        "Marks appointment services still 'Confirmed'/'Waiting' as "
        "'Left Queue' once the assigned employee's shift has ended "
        "(or the appointment date has passed), and emails the "
        "affected customers. Intended to run on a schedule, "
        "independent of any employee having a browser tab open."
    )
 
    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="List what would be changed without touching the database or sending emails.",
        )
 
    def handle(self, *args, **options):
 
        dry_run = options["dry_run"]
 
        now_local = timezone.localtime()
        today = now_local.date()
        now_time = now_local.time()
 
        stale_services = AppointmentService.objects.select_related(
            "appointment",
            "appointment__customer",
            "employee",
            "employee__shift",
        ).filter(
            status__in=["Confirmed", "Waiting"],
            appointment__status__in=["Confirmed", "Waiting"],
        ).filter(
            appointment__date__lt=today
        ) | AppointmentService.objects.select_related(
            "appointment",
            "appointment__customer",
            "employee",
            "employee__shift",
        ).filter(
            status__in=["Confirmed", "Waiting"],
            appointment__status__in=["Confirmed", "Waiting"],
            appointment__date=today,
            employee__shift__end_time__lte=now_time,
            # Only same-day shifts (start_time < end_time) can be
            # judged "ended" from a bare end_time <= now comparison.
            # For an overnight shift (e.g. 22:00-06:00, so
            # start_time > end_time), end_time <= now is also true for
            # every hour BEFORE that night's shift has even started
            # (e.g. 9 AM is "after" 06:00), which used to get an
            # employee's not-yet-started shift wrongly swept up as
            # stale/"Left Queue". Excluding wrapping shifts here means
            # they simply aren't auto-expired by this command; see
            # employees.utils.get_shift_window_status for the full
            # reasoning and the equivalent guard used elsewhere.
            employee__shift__start_time__lt=F("employee__shift__end_time"),
        )
 
        stale_services = stale_services.distinct()
 
        if not stale_services.exists():
            self.stdout.write(self.style.SUCCESS("No stale appointments found. Nothing to do."))
            return
 
        self.stdout.write(f"Found {stale_services.count()} stale appointment service row(s):")
 
        appointments_to_touch = {}
        emailed_appointment_ids = set()
 
        for row in stale_services:
 
            appointment = row.appointment
 
            self.stdout.write(
                f"  - Appointment {appointment.appointment_number} "
                f"(date={appointment.date}, token={appointment.token_number}) "
                f"service='{row.service_name}' "
                f"employee={row.employee.employee_name if row.employee else 'unassigned'}"
            )
 
            appointments_to_touch.setdefault(appointment.appointment_id, appointment)
 
        if dry_run:
            self.stdout.write(self.style.WARNING("\nDry run only - nothing was changed."))
            return
 
        with transaction.atomic():
 
            for row in stale_services:
                row.status = "Left Queue"
                row.updated_by = "SYSTEM"
                record_waiting_time(row, ended_at=now_local)
                row.save()
 
            for appointment_id, appointment in appointments_to_touch.items():
 
                appointment.refresh_from_db()
 
                if appointment.services.filter(
                    status__in=["Pending", "Confirmed", "Waiting", "In Progress"]
                ).exists():
                    appointment.status = (
                        "In Progress"
                        if appointment.services.filter(status="In Progress").exists()
                        else "Waiting"
                    )
                else:
                    appointment.status = "Left Queue"
 
                appointment.updated_by = "SYSTEM"
                appointment.save()
 
        for appointment in appointments_to_touch.values():
 
            appointment.refresh_from_db()
 
            if appointment.status != "Left Queue":
                continue
 
            if appointment.appointment_id in emailed_appointment_ids:
                continue
 
            emailed_appointment_ids.add(appointment.appointment_id)
 
            try:
                send_left_queue_email(appointment.customer, appointment)
            except Exception:
                pass
 
        self.stdout.write(
            self.style.SUCCESS(
                f"\nMarked {stale_services.count()} appointment service row(s) as 'Left Queue' "
                f"across {len(appointments_to_touch)} appointment(s). "
                f"Emailed {len(emailed_appointment_ids)} customer(s)."
            )
        )
from django.utils import timezone

from rest_framework.response import Response
from rest_framework import status


def success_response(data=None, message="Success", status_code=status.HTTP_200_OK):
    return Response({'success': True, 'message': message, 'data': data}, status=status_code)


def error_response(message="Error", errors=None, status_code=status.HTTP_400_BAD_REQUEST):
    return Response({'success': False, 'message': message, 'errors': errors}, status=status_code)


def export_filename(base_name, extension):
    """
    Builds a download filename with the date the file was exported
    stamped on the end, e.g. export_filename("customers", "pdf") ->
    "customers_2026-08-26.pdf".

    Every module's CSV/Excel/PDF export (and the customer history
    export) goes through this, so whoever downloads a file can always
    tell exactly when it was generated - even if they export the same
    report again later the same day/week and end up with two files.

    `base_name` can already contain its own date segment (e.g. the
    queue export's day-being-exported, "queue_2026-08-20") - the
    exported-on date is simply appended after it.
    """

    exported_on = timezone.now().strftime("%Y-%m-%d")

    return f"{base_name}_{exported_on}.{extension}"

from django.core.mail import send_mail
from django.conf import settings


def send_employee_credentials(employee_name, email, username, password):

    subject = "Employee Account Created - Indus Service Flow"

    message = f"""
Dear {employee_name},

Welcome to Indus Service Flow.

Your employee account has been created successfully.

Login Credentials
-----------------

Username : {username}
Password : {password}


Please login using these credentials and change your password after your first login.

For security reasons, do not share your login credentials with anyone.


If you did not request this account creation, please contact your Organization Administrator.


Regards,

Indus Service Flow Team
"""

    send_mail(subject, message, settings.EMAIL_HOST_USER, [email], fail_silently=False)


def send_employee_profile_update_email(employee_name, email, changes):

    change_details = ""

    for item in changes:

        change_details += (
            f"{item['field']} : " f"{item['old_value']} " f"→ " f"{item['new_value']}\n"
        )

    subject = "Employee Profile Updated - Indus Service Flow"

    message = f"""
Dear {employee_name},

Your employee profile has been updated successfully.


Updated Details
---------------

{change_details}


If you requested these changes, no action is required.

If you notice any incorrect information, please contact your Organization Administrator.


Regards,

Indus Service Flow Team
"""

    send_mail(subject, message, settings.EMAIL_HOST_USER, [email], fail_silently=False)

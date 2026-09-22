from django.contrib.auth.hashers import check_password as verify_raw_password
from django.contrib.auth.hashers import make_password

from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import AuthenticationFailed

from .models import Employee


class EmployeeUser:
    """
    Lightweight stand-in for an Employee so it can be used anywhere
    DRF/Django expects `request.user` (permission classes, views, etc.),
    without having to make Employee a second AUTH_USER_MODEL.
    """

    is_authenticated = True
    is_anonymous = False
    is_staff = False
    is_superuser = False
    role = "EMPLOYEE"

    _WRITABLE_FIELD_MAP = {
        "name": "employee_name",
        "email": "email",
        "mobile": "mobile",
        "updated_by": "updated_by",
        "must_change_password": "must_change_password",
    }

    def __init__(self, employee):
        self.employee = employee
        self.id = employee.employee_id
        self.pk = employee.employee_id
        self.username = employee.username
        self.name = employee.employee_name
        self.email = employee.email
        self.mobile = employee.mobile
        self.status = employee.status

        self.organization = employee.org
        self.organization_id = employee.org_id

    def __getattr__(self, item):
        return getattr(self.employee, item)

    def __setattr__(self, key, value):
        object.__setattr__(self, key, value)

   
        if key == "employee" or not hasattr(self, "employee"):
            return

        model_field = self._WRITABLE_FIELD_MAP.get(key)
        if model_field is not None:
            setattr(self.employee, model_field, value)

    def check_password(self, raw_password):    
        return verify_raw_password(raw_password, self.employee.password)

    def set_password(self, raw_password):
        self.employee.password = make_password(raw_password)

    def __str__(self):
        return self.username


class EmployeeAwareJWTAuthentication(JWTAuthentication):
    """
    Drop-in replacement for rest_framework_simplejwt.authentication.
    JWTAuthentication.

    Tokens issued by the normal /api/auth/login/ endpoint (for
    SUPER_ADMIN / ORG_ADMIN users) behave exactly as before.

    Tokens issued by /api/employees/login/ carry an extra "actor":
    "employee" claim (see employees.employee_auth.EmployeeLoginSerializer).
    When that claim is present, the user is looked up in the Employee
    table instead of users.User.
    """

    def get_user(self, validated_token):

        if validated_token.get("actor") != "employee":
            return super().get_user(validated_token)

        employee_id = validated_token.get("employee_id")

        if employee_id is None:
            raise AuthenticationFailed(
                "Token contained no recognizable employee identification.",
                code="employee_identification_not_found",
            )

        try:
            employee = Employee.objects.get(employee_id=employee_id)
        except Employee.DoesNotExist:
            raise AuthenticationFailed(
                "Employee not found.",
                code="employee_not_found",
            )

        if employee.status != "Active":
            raise AuthenticationFailed(
                "Employee account is not active.",
                code="employee_inactive",
            )

        return EmployeeUser(employee)
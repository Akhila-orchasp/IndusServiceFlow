from rest_framework import serializers
from django.contrib.auth import authenticate
from django.contrib.auth.hashers import check_password as verify_raw_password
from django.contrib.auth.password_validation import validate_password
from rest_framework_simplejwt.tokens import RefreshToken

from users.models import User
from employees.models import Employee


class SuperAdminSerializer(serializers.ModelSerializer):

    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = [
            "username",
            "name",
            "email",
            "mobile",
            "password",
        ]

    def create(self, validated_data):

        if User.objects.filter(role="SUPER_ADMIN").exists():
            raise serializers.ValidationError("Super Admin already exists.")

        user = User.objects.create(
            username=validated_data["username"],
            name=validated_data["name"],
            email=validated_data["email"],
            mobile=validated_data["mobile"],
            role="SUPER_ADMIN",
            status="Active",
            organization=None,
            created_by="System",
        )

        user.set_password(validated_data["password"])
        user.save()

        return user


class LoginSerializer(serializers.Serializer):

    username = serializers.CharField(required=False)
    email = serializers.EmailField(required=False)
    password = serializers.CharField(write_only=True)

    resolved_actor = None
    resolved_instance = None

    def validate(self, attrs):

        username = attrs.get("username")
        email = attrs.get("email")
        password = attrs.get("password")

        if not username and not email:
            raise serializers.ValidationError(
                {"message": "Username or Email is required."}
            )

        user = (
            User.objects.filter(email=email).first()
            if email
            else User.objects.filter(username=username).first()
        )

        if user is not None:
            return self._validate_user(user, password)

        # An email is only unique within one organization, so logging
        # in by email can match the same person in several orgs. The
        # username is still globally unique and matches at most one.
        employees = list(
            Employee.objects.filter(email__iexact=email)
            if email
            else Employee.objects.filter(username=username)
        )

        if employees:
            return self._validate_employee_candidates(employees, password)

        raise serializers.ValidationError({"username": "Invalid Username or Email."})

    def _validate_employee_candidates(self, employees, password):
        """
        Resolve which employee record is actually logging in when an
        email is shared across organizations: only the records whose
        password matches are considered, and if that still leaves
        more than one active account the caller is asked to use their
        (globally unique) employee username instead.
        """

        if len(employees) == 1:
            return self._validate_employee(employees[0], password)

        matched = [
            employee
            for employee in employees
            if verify_raw_password(password, employee.password)
        ]

        if not matched:
            raise serializers.ValidationError({"password": "Invalid Password."})

        active = [employee for employee in matched if employee.status == "Active"]

        if not active:
            raise serializers.ValidationError({"message": "Your account is not active."})

        if len(active) > 1:
            raise serializers.ValidationError(
                {
                    "message": (
                        "This email is registered with more than one "
                        "organization. Please sign in with your employee "
                        "username instead."
                    )
                }
            )

        return self._validate_employee(active[0], password)

    def _validate_user(self, user, password):

        authed = authenticate(username=user.username, password=password)

        if authed is None:
            raise serializers.ValidationError({"password": "Invalid Password."})

        if user.status == "Pending":
            raise serializers.ValidationError(
                {
                    "message": "Your account is pending approval. Please wait for the Super Admin to approve your organization."
                }
            )

        if user.status == "Rejected":
            raise serializers.ValidationError(
                {
                    "message": "Your organization registration has been rejected. Please contact the administrator."
                }
            )

        if user.status != "Active":
            raise serializers.ValidationError(
                {"message": "Your account is not active."}
            )

        self.resolved_actor = "user"
        self.resolved_instance = user

        refresh = RefreshToken.for_user(user)

        return {
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "username": user.username,
            "name": user.name,
            "email": user.email,
            "role": user.role,
            "status": user.status,
            "org_id": user.organization_id,
            "organization_name": (
                user.organization.organization_name if user.organization_id else None
            ),
        }

    def _validate_employee(self, employee, password):

        if not verify_raw_password(password, employee.password):
            raise serializers.ValidationError({"password": "Invalid Password."})

        if employee.status != "Active":
            raise serializers.ValidationError(
                {"message": "Your account is not active."}
            )

        self.resolved_actor = "employee"
        self.resolved_instance = employee

        refresh = RefreshToken()
        refresh["actor"] = "employee"
        refresh["employee_id"] = employee.employee_id
        refresh["username"] = employee.username
        refresh["role"] = "EMPLOYEE"

        access = refresh.access_token
        access["actor"] = "employee"
        access["employee_id"] = employee.employee_id
        access["username"] = employee.username
        access["role"] = "EMPLOYEE"

        return {
            "access": str(access),
            "refresh": str(refresh),
            "username": employee.username,
            "name": employee.employee_name,
            "email": employee.email,
            "role": "EMPLOYEE",
            "status": employee.status,
            "org_id": employee.org_id,
            "organization_name": (
                employee.org.organization_name if employee.org_id else None
            ),
            "employee_id": employee.employee_id,
            "designation": employee.designation,
            "must_change_password": employee.must_change_password,
        }


class ForgotPasswordSerializer(serializers.Serializer):

    username = serializers.CharField(required=False, allow_blank=False)

    email = serializers.EmailField(required=False, allow_blank=False)

    def validate(self, attrs):

        username = attrs.get("username")
        email = attrs.get("email")

        if not username and not email:
            raise serializers.ValidationError("Username or Email is required.")

        if username:
            if not User.objects.filter(username=username).exists():
                raise serializers.ValidationError("No user found with this username.")

        if email:
            if not User.objects.filter(email=email).exists():
                raise serializers.ValidationError("No user found with this email.")

        return attrs


class VerifyOtpSerializer(serializers.Serializer):

    username = serializers.CharField(required=False, allow_blank=False)

    email = serializers.EmailField(required=False, allow_blank=False)

    otp = serializers.CharField()

    def validate(self, attrs):

        if not attrs.get("username") and not attrs.get("email"):
            raise serializers.ValidationError("Username or Email is required.")

        return attrs


class ResetPasswordSerializer(serializers.Serializer):

    username = serializers.CharField(required=False, allow_blank=False)

    email = serializers.EmailField(required=False, allow_blank=False)

    otp = serializers.CharField(max_length=6)

    new_password = serializers.CharField(write_only=True, min_length=8)

    confirm_password = serializers.CharField(write_only=True, min_length=8)

    def validate(self, attrs):

        if not attrs.get("username") and not attrs.get("email"):
            raise serializers.ValidationError("Username or Email is required.")

        if attrs["new_password"] != attrs["confirm_password"]:

            raise serializers.ValidationError(
                {"confirm_password": "Passwords do not match."}
            )

        validate_password(attrs["new_password"])

        return attrs


class ChangePasswordSerializer(serializers.Serializer):

    current_password = serializers.CharField(write_only=True)

    new_password = serializers.CharField(write_only=True, min_length=8)

    confirm_password = serializers.CharField(write_only=True, min_length=8)

    def validate(self, attrs):

        if attrs["new_password"] != attrs["confirm_password"]:

            raise serializers.ValidationError(
                {"confirm_password": "Passwords do not match."}
            )

        validate_password(attrs["new_password"])

        return attrs
from django.contrib import admin

from .models import Shift, Employee, EmployeeService


@admin.register(Shift)
class ShiftAdmin(admin.ModelAdmin):
    list_display = (
        "shift_id",
        "shift_name",
        "org",
        "start_time",
        "end_time",
        "break_start",
        "break_end",
        "status",
    )
    list_filter = ("status", "org")
    search_fields = ("shift_name",)


@admin.register(Employee)
class EmployeeAdmin(admin.ModelAdmin):
    list_display = (
        "employee_id",
        "employee_name",
        "employee_code",
        "shift",
        "status",
    )
    list_filter = ("status",)
    search_fields = ("employee_name", "employee_code", "email")


@admin.register(EmployeeService)
class EmployeeServiceAdmin(admin.ModelAdmin):
    list_display = ("employee_service_id", "employee", "service", "status")
    list_filter = ("status",)
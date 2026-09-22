from django.contrib import admin
from .models import Simulation, SimulationResult, SimulationTrend


class SimulationResultInline(admin.StackedInline):
    model = SimulationResult
    can_delete = False
    readonly_fields = (
        'total_customers', 'customers_served', 'currently_waiting',
        'left_without_service', 'average_waiting_time', 'maximum_waiting_time',
        'idle_time', 'utilization',
    )


class SimulationTrendInline(admin.TabularInline):
    model = SimulationTrend
    extra = 0
    readonly_fields = ('hour', 'average_wait', 'maximum_queue', 'utilization')
    can_delete = False


@admin.register(Simulation)
class SimulationAdmin(admin.ModelAdmin):
    list_display = (
        'id', 'organization', 'arrival_probability', 'service_probability',
        'number_of_arrivals', 'time_horizon', 'status', 'created_by', 'created_at',
    )
    list_filter = ('status', 'organization', 'created_at')
    search_fields = ('organization__name', 'created_by__username')
    readonly_fields = ('status', 'created_at', 'updated_at')
    inlines = [SimulationResultInline, SimulationTrendInline]


@admin.register(SimulationResult)
class SimulationResultAdmin(admin.ModelAdmin):
    list_display = (
        'simulation', 'total_customers', 'customers_served',
        'utilization', 'average_waiting_time',
    )
    readonly_fields = ('simulation',)


@admin.register(SimulationTrend)
class SimulationTrendAdmin(admin.ModelAdmin):
    list_display = ('simulation', 'hour', 'average_wait', 'maximum_queue', 'utilization')
    list_filter = ('simulation',)

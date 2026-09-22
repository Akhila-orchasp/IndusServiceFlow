from django.conf import settings
from django.db import models
from common.models import TimeStampedModel
from organizations.models import Organization


class Simulation(TimeStampedModel):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('running', 'Running'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ]

    organization = models.ForeignKey(
        Organization, on_delete=models.CASCADE, related_name='simulations'
    )
    arrival_probability = models.FloatField(
        help_text="Probability of customer arrival per time unit (0.0 - 1.0)"
    )
    service_probability = models.FloatField(
        help_text="Probability of serving a customer per time unit (0.0 - 1.0)"
    )
    number_of_arrivals = models.PositiveIntegerField(
        help_text="Simulated number of customer arrivals"
    )
    time_horizon = models.PositiveIntegerField(
        help_text="Simulation time horizon in hours"
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='simulations'
    )

    class Meta:
        db_table = 'simulations'
        ordering = ['-created_at']

    def __str__(self):
        return f"Simulation #{self.pk} - {self.organization.organization_name} [{self.status}]"


class SimulationResult(models.Model):
    simulation = models.OneToOneField(
        Simulation, on_delete=models.CASCADE, related_name='result'
    )
    total_customers = models.PositiveIntegerField(default=0)
    customers_served = models.PositiveIntegerField(default=0)
    currently_waiting = models.PositiveIntegerField(default=0)
    left_without_service = models.PositiveIntegerField(default=0)
    average_waiting_time = models.FloatField(default=0.0)
    maximum_waiting_time = models.FloatField(default=0.0)
    idle_time = models.FloatField(default=0.0)
    utilization = models.FloatField(default=0.0, help_text="Utilization percentage 0-100")
    recommended_doctors = models.PositiveIntegerField(default=1)
    recommendation_message = models.CharField(max_length=255, blank=True, default='')

    class Meta:
        db_table = 'simulation_results'

    def __str__(self):
        return f"Result for Simulation #{self.simulation_id}"


class SimulationTrend(models.Model):
    simulation = models.ForeignKey(
        Simulation, on_delete=models.CASCADE, related_name='trends'
    )
    hour = models.PositiveIntegerField()
    average_wait = models.FloatField(default=0.0)
    maximum_queue = models.PositiveIntegerField(default=0)
    utilization = models.FloatField(default=0.0)

    class Meta:
        db_table = 'simulation_trends'
        ordering = ['hour']

    def __str__(self):
        return f"Trend Hour {self.hour} - Simulation #{self.simulation_id}"

from rest_framework import serializers
from .models import Simulation, SimulationResult, SimulationTrend


class SimulationResultSerializer(serializers.ModelSerializer):
    class Meta:
        model = SimulationResult
        fields = '__all__'


class SimulationTrendSerializer(serializers.ModelSerializer):
    class Meta:
        model = SimulationTrend
        exclude = ('simulation',)


class SimulationSerializer(serializers.ModelSerializer):
    created_by_username = serializers.CharField(source='created_by.username', read_only=True)
    result = SimulationResultSerializer(read_only=True)

    class Meta:
        model = Simulation
        fields = [
            'id', 'organization', 'arrival_probability', 'service_probability',
            'number_of_arrivals', 'time_horizon', 'status',
            'created_by', 'created_by_username', 'created_at', 'updated_at', 'result',
        ]
        read_only_fields = ('status', 'created_by', 'created_at', 'updated_at')


class SimulationRunSerializer(serializers.Serializer):
    organization_id = serializers.IntegerField()
    arrival_probability = serializers.FloatField(min_value=0.01, max_value=1.0)
    service_probability = serializers.FloatField(min_value=0.01, max_value=1.0)
    number_of_arrivals = serializers.IntegerField(min_value=1, max_value=100000)
    time_horizon = serializers.IntegerField(min_value=1, max_value=720)
    num_doctors = serializers.IntegerField(min_value=1, max_value=50, default=1)


class SimulationListSerializer(serializers.ModelSerializer):
    created_by_username = serializers.CharField(source='created_by.username', read_only=True)

    class Meta:
        model = Simulation
        fields = [
            'id', 'arrival_probability', 'service_probability',
            'number_of_arrivals', 'time_horizon', 'status',
            'created_by_username', 'created_at',
        ]


class DashboardSerializer(serializers.Serializer):
    total_customers = serializers.IntegerField()
    customers_served = serializers.IntegerField()
    currently_waiting = serializers.IntegerField()
    left_without_service = serializers.IntegerField()
    average_waiting_time = serializers.FloatField()
    maximum_waiting_time = serializers.FloatField()
    idle_time = serializers.FloatField()
    utilization = serializers.FloatField()
    total_simulations = serializers.IntegerField()
    recommended_doctors = serializers.IntegerField()
    recommendation_message = serializers.CharField()

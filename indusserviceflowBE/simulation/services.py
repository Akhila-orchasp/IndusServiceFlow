import numpy as np
from collections import deque
from dataclasses import dataclass, field
from typing import List
from django.db import transaction
from django.db.models import Avg, Max, Sum
from organizations.models import Organization
from .models import Simulation, SimulationResult, SimulationTrend

# ── Constants ─────────────────────────────────────────────────────────────────
SERVICE_TIME   = 15   # Fixed service time per patient (minutes)
MAX_WAIT_LIMIT = 15   # Max acceptable wait time (minutes)
WORK_DAY_HOURS = 8    # Hospital working hours
MINUTES_PER_HOUR = 60 


@dataclass
class Doctor:
    """Represents a single doctor with a fixed service slot."""
    doctor_id: int
    available_at: int = 0   # minute at which this doctor becomes free


@dataclass
class Patient:
    """Tracks every patient's timeline through the system."""
    patient_id: int
    arrival_time: int
    service_start: int = 0
    service_end:   int = 0

    @property
    def waiting_time(self) -> int:
        return self.service_start - self.arrival_time


def _simulate_with_doctors(arrival_minutes: List[int], num_doctors: int) -> List[Patient]:
    """
    Core FIFO simulation with a fixed doctor pool.

    - Service time is always fixed at SERVICE_TIME minutes.
    - Patients are assigned to the earliest-available doctor.
    - If all doctors are busy the patient joins the FIFO queue.
    - Simulation ends at WORK_DAY_HOURS * 60 minutes; patients still
      in queue at that point are left_without_service.

    Returns a list of served Patient objects.
    """
    total_minutes = WORK_DAY_HOURS * MINUTES_PER_HOUR
    doctors: List[Doctor] = [Doctor(doctor_id=i) for i in range(num_doctors)]
    queue: deque = deque()          # FIFO queue of Patient objects
    served: List[Patient] = []

    # Index arrivals by minute for O(1) lookup
    arrivals_by_minute: dict = {}
    for t in arrival_minutes:
        arrivals_by_minute.setdefault(t, 0)
        arrivals_by_minute[t] += 1

    patient_counter = 0

    for minute in range(total_minutes):
        # 1. New patients arrive this minute
        for _ in range(arrivals_by_minute.get(minute, 0)):
            patient_counter += 1
            queue.append(Patient(patient_id=patient_counter, arrival_time=minute))

        # 2. Assign queued patients to any doctor that is now free
        while queue:
            # Find the doctor who becomes free earliest
            earliest_doctor = min(doctors, key=lambda d: d.available_at)
            if earliest_doctor.available_at > minute:
                # No doctor free yet at this minute
                break
            patient = queue.popleft()
            # Service starts at max(doctor_free_time, patient_arrival)
            start = max(earliest_doctor.available_at, patient.arrival_time)
            patient.service_start = start
            patient.service_end   = start + SERVICE_TIME
            earliest_doctor.available_at = patient.service_end
            served.append(patient)

    return served


def _compute_recommended_doctors(arrival_minutes: List[int]) -> int:
    """
    Binary-search for the minimum number of doctors such that
    no patient waits more than MAX_WAIT_LIMIT minutes.
    Starts at 1 and increments until the constraint is satisfied.
    """
    for num_docs in range(1, len(arrival_minutes) + 1):
        served = _simulate_with_doctors(arrival_minutes, num_docs)
        if not served:
            return num_docs
        if max(p.waiting_time for p in served) <= MAX_WAIT_LIMIT:
            return num_docs
    return 1


def _hourly_trends(served: List[Patient], total_minutes: int, num_doctors: int) -> List[dict]:
    """
    Compute per-hour metrics:
      - average_wait  : mean waiting time of patients whose service started this hour
      - maximum_queue : peak queue length observed during this hour
      - utilization   : % of total doctor-minutes that were busy this hour
    """
    hours = total_minutes // MINUTES_PER_HOUR
    trends = []

    for h in range(hours):
        h_start = h * MINUTES_PER_HOUR
        h_end   = h_start + MINUTES_PER_HOUR

        # Patients whose service started in this hour
        hour_patients = [p for p in served if h_start <= p.service_start < h_end]
        avg_wait = round(float(np.mean([p.waiting_time for p in hour_patients])), 2) \
                   if hour_patients else 0.0

        # Peak queue length: count patients arrived but not yet started service each minute
        peak_queue = 0
        for minute in range(h_start, h_end):
            in_queue = sum(
                1 for p in served
                if p.arrival_time <= minute < p.service_start
            )
            peak_queue = max(peak_queue, in_queue)

        # Doctor utilization: busy doctor-minutes / total doctor-minutes
        busy_minutes = sum(
            min(p.service_end, h_end) - max(p.service_start, h_start)
            for p in served
            if p.service_start < h_end and p.service_end > h_start
        )
        utilization = round((busy_minutes / (MINUTES_PER_HOUR * num_doctors)) * 100, 2)

        trends.append({
            'hour':          h + 1,
            'average_wait':  avg_wait,
            'maximum_queue': peak_queue,
            'utilization':   min(utilization, 100.0),
        })

    return trends


def run_monte_carlo(
    arrival_prob: float,
    num_customers: int,
    num_doctors: int = 1,
    # kept for backward-compat but ignored (service time is fixed)
    service_prob: float = 1.0,
    time_horizon: int = WORK_DAY_HOURS,
) -> dict:
    """
    Monte Carlo Hospital Queue Simulation.

    Randomness is used ONLY for patient arrival times.
    Service time is always fixed at SERVICE_TIME (15 min) per patient.

    Steps
    -----
    1. Generate random arrival minutes using arrival_probability.
    2. Simulate the queue with `num_doctors` doctors (FIFO, fixed service).
    3. Determine the minimum doctors needed so max wait <= MAX_WAIT_LIMIT.
    4. Compute hourly trends.
    5. Return aggregated results.
    """
    rng = np.random.default_rng()
    total_minutes = WORK_DAY_HOURS * MINUTES_PER_HOUR   # always 480

    # ── Step 1: Generate arrival times (Monte Carlo randomness) ─────────────────
    arrival_minutes: List[int] = []
    for minute in range(total_minutes):
        if len(arrival_minutes) >= num_customers:
            break
        if rng.random() < arrival_prob:
            arrival_minutes.append(minute)

    total_arrived = len(arrival_minutes)

    # ── Step 2: Simulate with requested doctor count ─────────────────────────
    served = _simulate_with_doctors(arrival_minutes, num_doctors)
    customers_served  = len(served)
    left_without_service = total_arrived - customers_served

    currently_waiting = left_without_service   # in queue, not served

    # ── Step 3: Wait-time metrics ────────────────────────────────────────
    wait_times = [p.waiting_time for p in served]
    avg_waiting_time = round(float(np.mean(wait_times)), 2) if wait_times else 0.0
    max_waiting_time = float(max(wait_times)) if wait_times else 0.0

    # ── Step 4: Idle time & utilisation ────────────────────────────────────
    total_busy_minutes = customers_served * SERVICE_TIME
    total_doctor_minutes = total_minutes * num_doctors
    idle_minutes = total_doctor_minutes - total_busy_minutes
    utilization  = round((total_busy_minutes / total_doctor_minutes) * 100, 2)
    idle_time    = round(idle_minutes / MINUTES_PER_HOUR, 2)   # in hours

    # ── Step 5: Doctor recommendation ──────────────────────────────────────
    recommended_doctors = _compute_recommended_doctors(arrival_minutes)
    extra = recommended_doctors - num_doctors
    if extra > 0:
        recommendation_message = f'Need {extra} More Employee{"s" if extra > 1 else ""}'
    elif max_waiting_time > MAX_WAIT_LIMIT:
        recommendation_message = f'Need {recommended_doctors} Employee{"s" if recommended_doctors > 1 else ""}'
    else:
        recommendation_message = 'Current staffing is sufficient'

    # ── Step 6: Hourly trends ─────────────────────────────────────────────
    trends = _hourly_trends(served, total_minutes, num_doctors)

    return {
        'total_customers':        total_arrived,
        'customers_served':       customers_served,
        'currently_waiting':      currently_waiting,
        'left_without_service':   left_without_service,
        'average_waiting_time':   avg_waiting_time,
        'maximum_waiting_time':   max_waiting_time,
        'idle_time':              idle_time,
        'utilization':            utilization,
        'recommended_doctors':    extra,
        'recommendation_message': recommendation_message,
        'trends':                 trends,
    }


class SimulationService:

    @staticmethod
    @transaction.atomic
    def run_simulation(validated_data: dict, user) -> Simulation:
        try:
            org = Organization.objects.get(pk=validated_data['organization_id'])
        except Organization.DoesNotExist:
            raise ValueError(f"Organization with id={validated_data['organization_id']} does not exist.")

        simulation = Simulation.objects.create(
            organization=org,
            arrival_probability=validated_data['arrival_probability'],
            service_probability=validated_data['service_probability'],
            number_of_arrivals=validated_data['number_of_arrivals'],
            time_horizon=validated_data['time_horizon'],
            status='running',
            created_by=user if user.is_authenticated else None,
        )

        try:
            result_data = run_monte_carlo(
                arrival_prob=validated_data['arrival_probability'],
                service_prob=validated_data['service_probability'],
                num_customers=validated_data['number_of_arrivals'],
                num_doctors=validated_data.get('num_doctors', 1),
                time_horizon=validated_data['time_horizon'],
            )

            SimulationResult.objects.create(
                simulation=simulation,
                total_customers=result_data['total_customers'],
                customers_served=result_data['customers_served'],
                currently_waiting=result_data['currently_waiting'],
                left_without_service=result_data['left_without_service'],
                average_waiting_time=result_data['average_waiting_time'],
                maximum_waiting_time=result_data['maximum_waiting_time'],
                idle_time=result_data['idle_time'],
                utilization=result_data['utilization'],
                recommended_doctors=result_data['recommended_doctors'],
                recommendation_message=result_data['recommendation_message'],
            )

            SimulationTrend.objects.bulk_create([
                SimulationTrend(
                    simulation=simulation,
                    hour=t['hour'],
                    average_wait=t['average_wait'],
                    maximum_queue=t['maximum_queue'],
                    utilization=t['utilization'],
                )
                for t in result_data['trends']
            ])

            simulation.status = 'completed'
            simulation.save(update_fields=['status'])

        except Exception:
            simulation.status = 'failed'
            simulation.save(update_fields=['status'])
            raise

        return simulation

    @staticmethod
    def get_dashboard(organization_id: int) -> dict:
        from django.db.models import Avg, Max, Sum, Count
        results = SimulationResult.objects.filter(
            simulation__organization_id=organization_id,
            simulation__status='completed',
        )
        agg = results.aggregate(
            total_customers=Sum('total_customers'),
            customers_served=Sum('customers_served'),
            currently_waiting=Sum('currently_waiting'),
            left_without_service=Sum('left_without_service'),
            average_waiting_time=Avg('average_waiting_time'),
            maximum_waiting_time=Max('maximum_waiting_time'),
            idle_time=Avg('idle_time'),
            utilization=Avg('utilization'),
            recommended_doctors=Max('recommended_doctors'),
        )
        total_simulations = Simulation.objects.filter(
            organization_id=organization_id
        ).count()

        return {
            'total_customers':        agg['total_customers'] or 0,
            'customers_served':       agg['customers_served'] or 0,
            'currently_waiting':      agg['currently_waiting'] or 0,
            'left_without_service':   agg['left_without_service'] or 0,
            'average_waiting_time':   round(agg['average_waiting_time'] or 0, 2),
            'maximum_waiting_time':   round(agg['maximum_waiting_time'] or 0, 2),
            'idle_time':              round(agg['idle_time'] or 0, 2),
            'utilization':            round(agg['utilization'] or 0, 2),
            'total_simulations':      total_simulations,
            'recommended_doctors':    int(agg.get('recommended_doctors') or 1),
            'recommendation_message': '',
        }

    @staticmethod
    def get_history(organization_id: int):
        return Simulation.objects.filter(
            organization_id=organization_id
        ).select_related('created_by')

    @staticmethod
    def get_result(simulation_id: int, organization_id: int):
        return SimulationResult.objects.select_related('simulation').get(
            simulation_id=simulation_id,
            simulation__organization_id=organization_id,
        )

    @staticmethod
    def get_trends(simulation_id: int, organization_id: int):
        return SimulationTrend.objects.filter(
            simulation_id=simulation_id,
            simulation__organization_id=organization_id,
        )

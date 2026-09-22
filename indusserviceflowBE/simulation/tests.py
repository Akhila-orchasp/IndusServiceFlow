from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from common.models import Organization, OrganizationMember
from .models import Simulation, SimulationResult
from .services import SimulationService, run_monte_carlo


class MonteCarloTest(TestCase):
    def test_basic_simulation(self):
        result = run_monte_carlo(0.5, 0.6, 100, 2)
        self.assertIn('total_customers', result)
        self.assertIn('customers_served', result)
        self.assertIn('trends', result)
        self.assertGreaterEqual(result['total_customers'], 0)
        self.assertGreaterEqual(result['utilization'], 0)
        self.assertLessEqual(result['utilization'], 100)

    def test_trends_length(self):
        result = run_monte_carlo(0.5, 0.6, 100, 3)
        self.assertEqual(len(result['trends']), 3)

    def test_zero_arrivals(self):
        result = run_monte_carlo(0.0, 0.9, 10, 1)
        self.assertEqual(result['customers_served'], 0)


class SimulationServiceTest(TestCase):
    def setUp(self):
        User = get_user_model()
        self.user = User.objects.create_user('testuser', password='pass')
        self.org = Organization.objects.create(name='Test Org', slug='test-org')
        OrganizationMember.objects.create(user=self.user, organization=self.org, role='admin')

    def test_run_simulation(self):
        data = {
            'organization_id': self.org.id,
            'arrival_probability': 0.5,
            'service_probability': 0.6,
            'number_of_arrivals': 50,
            'time_horizon': 1,
        }
        sim = SimulationService.run_simulation(data, self.user)
        self.assertEqual(sim.status, 'completed')
        self.assertTrue(hasattr(sim, 'result'))

    def test_dashboard(self):
        data = {
            'organization_id': self.org.id,
            'arrival_probability': 0.5,
            'service_probability': 0.6,
            'number_of_arrivals': 50,
            'time_horizon': 1,
        }
        SimulationService.run_simulation(data, self.user)
        dashboard = SimulationService.get_dashboard(self.org.id)
        self.assertIn('total_customers', dashboard)
        self.assertIn('utilization', dashboard)


class SimulationAPITest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user('apiuser', password='pass')
        self.org = Organization.objects.create(name='API Org', slug='api-org')
        OrganizationMember.objects.create(user=self.user, organization=self.org, role='admin')
        response = self.client.post('/api/auth/token/', {'username': 'apiuser', 'password': 'pass'})
        self.token = response.data['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.token}')

    def test_run_simulation_api(self):
        payload = {
            'organization_id': self.org.id,
            'arrival_probability': 0.5,
            'service_probability': 0.6,
            'number_of_arrivals': 50,
            'time_horizon': 1,
        }
        response = self.client.post('/api/simulation/run/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['data']['status'], 'completed')

    def test_dashboard_api(self):
        response = self.client.get(f'/api/simulation/dashboard/?org_id={self.org.id}')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_history_api(self):
        response = self.client.get(f'/api/simulation/history/?org_id={self.org.id}')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_run_invalid_payload(self):
        response = self.client.post('/api/simulation/run/', {}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

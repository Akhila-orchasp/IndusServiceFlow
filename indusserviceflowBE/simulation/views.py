from rest_framework.views import APIView
from rest_framework.generics import ListAPIView, RetrieveAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rest_framework.pagination import PageNumberPagination

from rest_framework.permissions import AllowAny

from common.utils import success_response, error_response
from .models import Simulation, SimulationResult
from .serializers import (
    SimulationRunSerializer, SimulationSerializer,
    SimulationListSerializer, SimulationResultSerializer,
    SimulationTrendSerializer, DashboardSerializer,
)
from .services import SimulationService
from .utils import generate_pdf_report, generate_excel_report, generate_csv_report


class SimulationPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100


class DashboardView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        org_id = request.query_params.get('org_id')
        if not org_id:
            return error_response("org_id query parameter is required.")
        data = SimulationService.get_dashboard(org_id)
        serializer = DashboardSerializer(data)
        return success_response(serializer.data)


class RunSimulationView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = SimulationRunSerializer(data=request.data)
        if not serializer.is_valid():
            return error_response("Validation failed.", serializer.errors)
        try:
            simulation = SimulationService.run_simulation(serializer.validated_data, request.user)
            result_serializer = SimulationSerializer(simulation)
            return success_response(result_serializer.data, "Simulation completed.", status.HTTP_201_CREATED)
        except Exception as e:
            return error_response(str(e), status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)


class SimulationResultView(RetrieveAPIView):
    permission_classes = [AllowAny]
    serializer_class = SimulationResultSerializer

    def get_object(self):
        org_id = self.request.query_params.get('org_id')
        return SimulationService.get_result(self.kwargs['pk'], org_id)

    def retrieve(self, request, *args, **kwargs):
        try:
            instance = self.get_object()
            serializer = self.get_serializer(instance)
            return success_response(serializer.data)
        except SimulationResult.DoesNotExist:
            return error_response("Result not found.", status_code=status.HTTP_404_NOT_FOUND)


class SimulationTrendView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, pk):
        org_id = request.query_params.get('org_id')
        trends = SimulationService.get_trends(pk, org_id)
        serializer = SimulationTrendSerializer(trends, many=True)
        return success_response(serializer.data)


class SimulationHistoryView(ListAPIView):
    permission_classes = [AllowAny]
    serializer_class = SimulationListSerializer
    pagination_class = SimulationPagination

    def get_queryset(self):
        org_id = self.request.query_params.get('org_id')
        return SimulationService.get_history(org_id)

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(queryset, many=True)
        return success_response(serializer.data)


class SimulationHistoryDetailView(RetrieveAPIView):
    permission_classes = [AllowAny]
    serializer_class = SimulationSerializer

    def get_object(self):
        org_id = self.request.query_params.get('org_id')
        return Simulation.objects.select_related('created_by', 'result').get(
            pk=self.kwargs['pk'],
            organization_id=org_id,
        )

    def retrieve(self, request, *args, **kwargs):
        try:
            instance = self.get_object()
            serializer = self.get_serializer(instance)
            return success_response(serializer.data)
        except Simulation.DoesNotExist:
            return error_response("Simulation not found.", status_code=status.HTTP_404_NOT_FOUND)


class ExportPDFView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, pk):
        org_id = request.query_params.get('org_id')
        try:
            simulation = Simulation.objects.get(pk=pk, organization_id=org_id)
            result = simulation.result
            trends = simulation.trends.all()
            return generate_pdf_report(simulation, result, trends)
        except Simulation.DoesNotExist:
            return error_response("Simulation not found.", status_code=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return error_response(str(e), status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ExportExcelView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, pk):
        org_id = request.query_params.get('org_id')
        try:
            simulation = Simulation.objects.get(pk=pk, organization_id=org_id)
            result = simulation.result
            trends = simulation.trends.all()
            return generate_excel_report(simulation, result, trends)
        except Simulation.DoesNotExist:
            return error_response("Simulation not found.", status_code=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return error_response(str(e), status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ExportCSVView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, pk):
        org_id = request.query_params.get('org_id')
        try:
            simulation = Simulation.objects.get(pk=pk, organization_id=org_id)
            result = simulation.result
            trends = simulation.trends.all()
            return generate_csv_report(simulation, result, trends)
        except Simulation.DoesNotExist:
            return error_response("Simulation not found.", status_code=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return error_response(str(e), status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)

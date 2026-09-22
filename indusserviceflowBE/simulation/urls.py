from django.urls import path
from .views import (
    DashboardView, RunSimulationView, SimulationResultView,
    SimulationTrendView, SimulationHistoryView, SimulationHistoryDetailView,
    ExportPDFView, ExportExcelView, ExportCSVView,
)

urlpatterns = [
    path('dashboard/', DashboardView.as_view(), name='simulation-dashboard'),
    path('run/', RunSimulationView.as_view(), name='simulation-run'),
    path('result/<int:pk>/', SimulationResultView.as_view(), name='simulation-result'),
    path('trend/<int:pk>/', SimulationTrendView.as_view(), name='simulation-trend'),
    path('history/', SimulationHistoryView.as_view(), name='simulation-history'),
    path('history/<int:pk>/', SimulationHistoryDetailView.as_view(), name='simulation-history-detail'),
    path('export/pdf/<int:pk>/', ExportPDFView.as_view(), name='simulation-export-pdf'),
    path('export/excel/<int:pk>/', ExportExcelView.as_view(), name='simulation-export-excel'),
    path('export/csv/<int:pk>/', ExportCSVView.as_view(), name='simulation-export-csv'),
]

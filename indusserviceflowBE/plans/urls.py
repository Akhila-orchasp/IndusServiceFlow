from django.urls import path
from . import views

urlpatterns = [
    path("add/", views.add_plan),
    path("", views.get_plans),
    path("<int:id>/", views.get_plan),
    path("update/<int:id>/", views.update_plan),
]
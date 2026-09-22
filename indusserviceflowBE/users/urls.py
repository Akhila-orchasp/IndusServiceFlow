from django.urls import path
from .views import (
    get_users,
    get_user,
    export_users,
)

urlpatterns = [
    path("", get_users),
    path("<int:pk>/", get_user),
    path("export/", export_users),
]
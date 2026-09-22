from django.urls import path
from .views import (
    add_category,
    get_categories,
    get_category_by_id,
    update_category,
    delete_category,
    export_categories,
)

urlpatterns = [
    path("add/", add_category),
    path("", get_categories),
    path("export/", export_categories),
    path("<int:id>/", get_category_by_id),
    path("update/<int:id>/", update_category),
    path("delete/<int:id>/", delete_category),
]

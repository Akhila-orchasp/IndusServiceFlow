from rest_framework.permissions import BasePermission
from .models import Simulation
from common.models import OrganizationMember


class IsOrgMember(BasePermission):
    def has_permission(self, request, view):
        org_id = (
            view.kwargs.get('org_id')
            or request.query_params.get('org_id')
            or request.data.get('organization_id')
        )
        if not org_id or not request.user or not request.user.is_authenticated:
            return False
        return OrganizationMember.objects.filter(
            user=request.user, organization_id=org_id
        ).exists()


class IsSimulationOwnerOrMember(BasePermission):
    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False
        if isinstance(obj, Simulation):
            return OrganizationMember.objects.filter(
                user=request.user, organization=obj.organization
            ).exists()
        return False

from rest_framework.permissions import BasePermission
from .models import OrganizationMember


class IsOrganizationMember(BasePermission):
    def has_permission(self, request, view):
        org_id = view.kwargs.get('org_id') or request.query_params.get('org_id')
        if not org_id:
            return False
        return OrganizationMember.objects.filter(
            user=request.user, organization_id=org_id
        ).exists()


class IsOrganizationAdmin(BasePermission):
    def has_permission(self, request, view):
        org_id = view.kwargs.get('org_id') or request.query_params.get('org_id')
        if not org_id:
            return False
        return OrganizationMember.objects.filter(
            user=request.user, organization_id=org_id, role='admin'
        ).exists()

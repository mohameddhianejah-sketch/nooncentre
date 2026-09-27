from rest_framework.permissions import BasePermission, SAFE_METHODS
from rest_framework.exceptions import PermissionDenied


def _denied():
    """Raise an explicit 403 (not DRF's default 401 for anonymous requests), so
    that a non-staff caller always receives 403 Forbidden on admin endpoints."""
    raise PermissionDenied()


class IsAdminOrReadOnly(BasePermission):
    """Anyone can read (GET/HEAD/OPTIONS). Only authenticated staff can write."""

    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        if not (request.user and request.user.is_authenticated and request.user.is_staff):
            _denied()
        return True


class IsStaffOnly(BasePermission):
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated and request.user.is_staff):
            _denied()
        return True


class IsMasterAdminOnly(BasePermission):
    """Seul le super admin (le compte ng_admin maître) peut promouvoir/rétrograder.
    Un admin 'promu' (is_staff mais pas superuser) ne peut PAS en promouvoir d'autres."""
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated
                and request.user.is_staff and request.user.is_superuser):
            _denied()
        return True

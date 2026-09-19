"""
Project-level error views.

NOON Center serves a separate React SPA (built with Vite). Django is only an
API backend plus the built-in admin. For anything that reaches Django without
matching a route (or when an unhandled error escapes outside DRF views), these
handlers return a minimal safe JSON payload instead of an HTML debug page.
"""

from django.http import JsonResponse


def json_404(request, exception=None):
    return JsonResponse({'detail': 'Not found.'}, status=404)


def json_500(request):
    return JsonResponse({'detail': 'Server error'}, status=500)
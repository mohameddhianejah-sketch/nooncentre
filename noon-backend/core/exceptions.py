"""
Centralized DRF exception handling for the NOON Center API.

The default DRF handler already turns APIException subclasses (401, 403,
404, 405, 429, ...) and validation errors into well-formed JSON. This
handler:

* keeps that default behavior (so form-level 400 validation errors keep
  their per-field shape and are never replaced by a generic page),
* passes through Retry-After when a throttled view sets ``wait_seconds``,
* catches anything the default handler does not recognise (unhandled
  exceptions, database errors, ...) and returns a safe JSON 500 instead of
  a Django/Python traceback, while still logging the real error server-side.

No technical details (tracebacks, SQL, file paths, env vars) ever reach the
client via the API.
"""

import logging

from django.http import Http404
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler as drf_exception_handler

logger = logging.getLogger('noon_backend.api')


def custom_exception_handler(exc, context):
    response = drf_exception_handler(exc, context)

    # Handled by DRF (APIException, Http404, PermissionDenied, ValidationError...).
    # Keep the safe JSON it produces. We only enrich 429 with Retry-After
    # when the throttled view provided an explicit wait time.
    if response is not None:
        if response.status_code == status.HTTP_429_TOO_MANY_REQUESTS:
            wait = getattr(exc, 'wait_seconds', None)
            if wait and not response.has_header('Retry-After'):
                response['Retry-After'] = str(wait)
        return response

    # Plain Django 404 (non-API routes, unknown paths).
    if isinstance(exc, Http404):
        return Response(
            {'detail': 'Not found.'},
            status=status.HTTP_404_NOT_FOUND,
        )

    # Any unhandled exception (programming error, DB outage, ...).
    # Log the full traceback for developers, return a sanitized response.
    request = context.get('request')
    logger.exception(
        'Unhandled API exception on %s %s',
        getattr(request, 'method', '?'),
        getattr(request, 'path', '?'),
    )
    return Response(
        {'detail': 'Server error', 'status': 500},
        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
    )
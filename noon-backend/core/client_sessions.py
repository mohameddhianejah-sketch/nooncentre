from django.core import signing
from rest_framework.exceptions import AuthenticationFailed

from .models import ClientAccount


CLIENT_SESSION_SALT = 'core.client-session'
CLIENT_SESSION_MAX_AGE = 60 * 60 * 12


def issue_client_session(client):
    return signing.dumps({'client_id': client.pk}, salt=CLIENT_SESSION_SALT)


def get_client_session(request, required=True):
    authorization = request.headers.get('Authorization', '')
    scheme, separator, token = authorization.partition(' ')
    if not separator or scheme != 'Client' or not token:
        if required:
            raise AuthenticationFailed('client_session_required')
        return None

    try:
        payload = signing.loads(
            token,
            salt=CLIENT_SESSION_SALT,
            max_age=CLIENT_SESSION_MAX_AGE,
        )
        client_id = int(payload['client_id'])
    except (signing.BadSignature, KeyError, TypeError, ValueError):
        raise AuthenticationFailed('client_session_invalid_or_expired')

    client = ClientAccount.objects.filter(pk=client_id).first()
    if client is None:
        raise AuthenticationFailed('client_session_invalid_or_expired')
    return client
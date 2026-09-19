"""sending SMS verification codes.

With Twilio credentials configured in settings, codes are sent via the Twilio
REST API. Without credentials (dev mode), the code is only logged and returned
to the caller so it can be exposed in DEBUG responses.
"""
import logging
import random
import re

from django.conf import settings

logger = logging.getLogger(__name__)


def generate_code(length=6):
    return ''.join(str(random.randint(0, 9)) for _ in range(length))


def normalize_phone(value):
    value = (value or '').strip()
    digits = re.sub(r'\D', '', value)
    return ('+' + digits) if value.startswith('+') else digits


def send_verification_code(phone, code):
    sid = getattr(settings, 'TWILIO_ACCOUNT_SID', '')
    token = getattr(settings, 'TWILIO_AUTH_TOKEN', '')
    from_number = getattr(settings, 'TWILIO_FROM_NUMBER', '')

    if sid and token and from_number:
        try:
            from twilio.rest import Client
        except ImportError as exc:
            raise RuntimeError(
                'Twilio SDK not installed (pip install twilio)'
            ) from exc
        Client(sid, token).messages.create(
            to=normalize_phone(phone),
            from_=from_number,
            body=f"NOON Center : votre code de vérification est {code}",
        )
        return None

    # Dev mode: no provider configured — log the code so it can be exposed in DEBUG.
    logger.info('SMS (dev) %s -> code %s', phone, code)
    return code
"""Send owner notifications through the WhatsApp Business API via Twilio."""
import logging

from django.conf import settings

from .sms import normalize_phone

logger = logging.getLogger(__name__)


def send_whatsapp_message(phone, body):
    sid = getattr(settings, 'TWILIO_ACCOUNT_SID', '')
    token = getattr(settings, 'TWILIO_AUTH_TOKEN', '')
    from_number = getattr(settings, 'TWILIO_WHATSAPP_FROM', '')

    if not (sid and token and from_number and phone):
        logger.warning('WhatsApp notification skipped: Twilio WhatsApp settings are incomplete')
        return False

    try:
        from twilio.rest import Client
        Client(sid, token).messages.create(
            to=f'whatsapp:{normalize_phone(phone)}',
            from_=from_number if from_number.startswith('whatsapp:') else f'whatsapp:{from_number}',
            body=body,
        )
    except Exception:
        logger.exception('WhatsApp notification failed for %s', phone)
        return False
    return True

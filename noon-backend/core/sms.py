"""Phone number normalization helpers."""
import re


def normalize_phone(value):
    value = (value or '').strip()
    digits = re.sub(r'\D', '', value)
    return ('+' + digits) if value.startswith('+') else digits
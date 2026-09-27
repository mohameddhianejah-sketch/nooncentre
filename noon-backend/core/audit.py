"""Helpers for the admin activity log (core.AdminAuditLog)."""

from .models import AdminAuditLog


def log_action(user, action, target_type='', target_key='', details=''):
    """Append a lightweight audit entry. Failures are swallowed — logging must
    never break the primary request."""
    try:
        actor = user if (user and getattr(user, 'is_authenticated', False)) else None
        AdminAuditLog.objects.create(
            user=actor,
            action=str(action)[:60],
            target_type=str(target_type)[:50],
            target_key=str(target_key or '')[:255],
            details=str(details or '')[:1000],
        )
    except Exception:
        pass
from datetime import timedelta

from django.utils import timezone
from rest_framework.authentication import TokenAuthentication
from rest_framework.exceptions import AuthenticationFailed


class ExpiringTokenAuthentication(TokenAuthentication):
    lifetime = timedelta(hours=12)

    def authenticate_credentials(self, key):
        user, token = super().authenticate_credentials(key)
        if timezone.now() >= token.created + self.lifetime:
            token.delete()
            raise AuthenticationFailed('Admin session expired.')
        return user, token
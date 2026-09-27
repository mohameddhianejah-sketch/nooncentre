from getpass import getpass

from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.core.management.base import BaseCommand, CommandError

from core.models import ClientAccount
from core.sms import normalize_phone


class Command(BaseCommand):
    help = 'Set or reset a client password from the trusted server console.'

    def handle(self, *args, **options):
        phone = input('Client phone number: ').strip()
        client = ClientAccount.objects.filter(phone=normalize_phone(phone)).first()
        if client is None:
            raise CommandError('No client account found for that phone number.')
        if client.user and client.user.is_staff:
            raise CommandError('Use the admin account login for this client.')

        password = getpass('New client password: ')
        confirmation = getpass('Confirm client password: ')
        if password != confirmation:
            raise CommandError('Passwords do not match.')

        User = get_user_model()
        candidate = User(username=client.phone, first_name=client.name)
        try:
            validate_password(password, user=candidate)
        except ValidationError as error:
            raise CommandError('; '.join(error.messages)) from error

        client.set_password(password)
        client.save(update_fields=['password_hash'])
        self.stdout.write(self.style.SUCCESS('Client password set.'))
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError

from core.models import ClientAccount
from core.sms import normalize_phone


class Command(BaseCommand):
    help = (
        "Link a Django admin/superuser to a client account (name + phone) so that "
        "entering that name and phone on the site opens the admin email + password step."
        "\n\nUsage: python manage.py link_superadmin <phone> <username-or-email>"
    )

    def add_arguments(self, parser):
        parser.add_argument('phone', nargs='?', help='Phone number of the client account')
        parser.add_argument('account', nargs='?', help="Django username or email of the admin user")

    def handle(self, *args, **options):
        phone = options.get('phone') or input('Client phone number: ').strip()
        account_ref = options.get('account') or input('Admin username or email: ').strip()

        account = ClientAccount.objects.filter(phone=normalize_phone(phone)).first()
        if not account:
            raise CommandError(f'No client account with phone {phone!r}.')

        User = get_user_model()
        user = User.objects.filter(username=account_ref).first() or User.objects.filter(email__iexact=account_ref).first()
        if not user:
            raise CommandError(f'No Django user {account_ref!r}.')

        account.user = user
        account.is_admin = True
        account.save(update_fields=['user', 'is_admin'])

        self.stdout.write(self.style.SUCCESS(
            f"Linked {account.name} ({account.phone}) to Django user '{user.username}'"
            f" (staff={user.is_staff}, superuser={user.is_superuser})."
        ))
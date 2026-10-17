"""Caisse (point of sale) API.

Cashiers are Django users in the "Caissiere" group with is_staff=False: they
sign in through /api/caisse/login/ only, and every admin endpoint (which checks
is_staff) refuses them. Admins manage cashier accounts and read the sales.
"""

from collections import defaultdict
from datetime import date as date_type
from decimal import Decimal, ROUND_HALF_UP

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.utils import timezone
from rest_framework import serializers, status
from rest_framework.authtoken.models import Token
from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.permissions import AllowAny, BasePermission
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView

from .audit import log_action
from .models import Booking, ClientAccount, Sale, SaleLine, Service
from .permissions import IsStaffOnly, _denied

CASHIER_GROUP = 'Caissiere'
CENT = Decimal('0.01')


def is_cashier(user):
    return bool(
        user and user.is_authenticated and user.is_active and not user.is_staff
        and user.groups.filter(name=CASHIER_GROUP).exists()
    )


def money(value):
    return Decimal(value).quantize(CENT, rounding=ROUND_HALF_UP)


class IsCashier(BasePermission):
    def has_permission(self, request, view):
        if not is_cashier(request.user):
            _denied()
        return True


class IsCashierOrStaff(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        if not (is_cashier(user) or (user and user.is_authenticated and user.is_staff)):
            _denied()
        return True


class CaisseLoginRateThrottle(AnonRateThrottle):
    scope = 'caisse_login'


def _requested_day(request):
    """The ?date= day for staff; cashiers are always limited to today."""
    today = timezone.localdate()
    if not request.user.is_staff:
        return today
    raw = request.query_params.get('date')
    if not raw:
        return today
    try:
        return date_type.fromisoformat(raw)
    except ValueError:
        raise serializers.ValidationError({'date': 'Date invalide (AAAA-MM-JJ).'})


# ---------------------------------------------------------------- auth

class CaisseLoginView(ObtainAuthToken):
    """POST {username, password} -> {token, username, name} for cashier accounts only."""
    permission_classes = [AllowAny]
    throttle_classes = [CaisseLoginRateThrottle]

    def post(self, request, *args, **kwargs):
        serializer = self.serializer_class(data=request.data, context={'request': request})
        if not serializer.is_valid():
            return Response({'detail': 'Identifiant ou mot de passe incorrect.'},
                            status=status.HTTP_401_UNAUTHORIZED)
        user = serializer.validated_data['user']
        if not is_cashier(user):
            return Response({'detail': 'Ce compte n’est pas un compte caisse.'},
                            status=status.HTTP_401_UNAUTHORIZED)
        Token.objects.filter(user=user).delete()
        token = Token.objects.create(user=user)
        user.last_login = timezone.now()
        user.save(update_fields=['last_login'])
        return Response({'token': token.key, 'username': user.username,
                         'name': user.first_name or user.username})


class CaisseMeView(APIView):
    permission_classes = [IsCashier]

    def get(self, request):
        u = request.user
        return Response({'username': u.username, 'name': u.first_name or u.username})


# ---------------------------------------------------------------- bookings

def _match_services(label):
    """Map a booking's service_label ("A · B") back to active services."""
    ids = []
    for part in (label or '').split('·'):
        name = part.strip()
        if not name:
            continue
        svc = (Service.objects.filter(is_active=True, name_fr=name).first()
               or Service.objects.filter(is_active=True, name_ar=name).first())
        if svc:
            ids.append(svc.id)
    return ids


class CaisseBookingsView(APIView):
    """GET — the day's reservations still to be paid (pending or confirmed)."""
    permission_classes = [IsCashierOrStaff]

    def get(self, request):
        day = _requested_day(request)
        qs = Booking.objects.filter(preferred_date=day, status__in=['pending', 'confirmed'])
        qs = qs.order_by('preferred_time', 'created_at')
        return Response([
            {
                'id': b.id,
                'name': b.name,
                'phone': b.phone,
                'service_label': b.service_label,
                'preferred_time': b.preferred_time.strftime('%H:%M') if b.preferred_time else None,
                'category_times': b.category_times or {},
                'status': b.status,
                'service_ids': _match_services(b.service_label),
            }
            for b in qs
        ])


# ---------------------------------------------------------------- sales

class SaleLineSerializer(serializers.ModelSerializer):
    class Meta:
        model = SaleLine
        fields = ['id', 'service', 'name', 'unit_price', 'quantity', 'line_total']


class SaleSerializer(serializers.ModelSerializer):
    number = serializers.CharField(read_only=True)
    cashier_name = serializers.SerializerMethodField()
    lines = SaleLineSerializer(many=True, read_only=True)

    class Meta:
        model = Sale
        fields = [
            'id', 'number', 'created_at', 'cashier_name', 'booking', 'client_name', 'client_phone',
            'subtotal', 'discount', 'total', 'payment_method', 'cash_amount', 'card_amount',
            'cash_received', 'change_given', 'status', 'cancel_reason', 'cancelled_at', 'lines',
        ]

    def get_cashier_name(self, obj):
        if not obj.cashier:
            return ''
        return obj.cashier.first_name or obj.cashier.username


class SaleLineInput(serializers.Serializer):
    service_id = serializers.IntegerField(required=False)
    name = serializers.CharField(required=False, max_length=150)
    unit_price = serializers.DecimalField(required=False, max_digits=9, decimal_places=2, min_value=Decimal('0.01'))
    quantity = serializers.IntegerField(min_value=1, max_value=99, default=1)

    def validate(self, attrs):
        if not attrs.get('service_id') and not (attrs.get('name') and attrs.get('unit_price')):
            raise serializers.ValidationError('Chaque ligne doit être un service ou un article avec un prix.')
        return attrs


class SaleInput(serializers.Serializer):
    lines = SaleLineInput(many=True)
    discount_type = serializers.ChoiceField(choices=['amount', 'percent'], default='amount')
    discount_value = serializers.DecimalField(max_digits=9, decimal_places=2, min_value=Decimal('0'), default=0)
    payment_method = serializers.ChoiceField(choices=[c[0] for c in Sale.PAYMENT_CHOICES])
    card_amount = serializers.DecimalField(max_digits=9, decimal_places=2, min_value=Decimal('0'), required=False)
    cash_received = serializers.DecimalField(max_digits=9, decimal_places=2, min_value=Decimal('0'), required=False)
    booking_id = serializers.IntegerField(required=False, allow_null=True)
    client_name = serializers.CharField(required=False, allow_blank=True, max_length=100)
    client_phone = serializers.CharField(required=False, allow_blank=True, max_length=30)

    def validate_lines(self, lines):
        if not lines:
            raise serializers.ValidationError('Le ticket est vide.')
        return lines


class SalesView(APIView):
    """GET the day's tickets; POST (cashier) rings up a new ticket."""

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsCashier()]
        return [IsCashierOrStaff()]

    def get(self, request):
        day = _requested_day(request)
        qs = Sale.objects.filter(created_at__date=day).select_related('cashier').prefetch_related('lines')
        return Response(SaleSerializer(qs, many=True).data)

    def post(self, request):
        data = SaleInput(data=request.data)
        data.is_valid(raise_exception=True)
        v = data.validated_data

        with transaction.atomic():
            lines = []
            for item in v['lines']:
                qty = item['quantity']
                if item.get('service_id'):
                    svc = Service.objects.filter(pk=item['service_id'], is_active=True).first()
                    if not svc:
                        raise serializers.ValidationError({'lines': 'Un service du ticket n’existe plus.'})
                    name, price = svc.name_fr, money(svc.price_tnd)
                else:
                    svc, name, price = None, item['name'].strip(), money(item['unit_price'])
                lines.append((svc, name, price, qty, money(price * qty)))

            subtotal = money(sum(line[4] for line in lines))
            if v['discount_type'] == 'percent':
                if v['discount_value'] > 100:
                    raise serializers.ValidationError({'discount_value': 'La remise ne peut pas dépasser 100 %.'})
                discount = money(subtotal * v['discount_value'] / 100)
            else:
                discount = money(v['discount_value'])
            discount = min(discount, subtotal)
            total = subtotal - discount

            method = v['payment_method']
            card = cash = Decimal('0')
            if method == 'card':
                card = total
            elif method == 'cash':
                cash = total
            else:
                card = money(v.get('card_amount') or 0)
                if not (Decimal('0') < card < total):
                    raise serializers.ValidationError(
                        {'card_amount': 'Pour un paiement mixte, la part carte doit être entre 0 et le total.'})
                cash = total - card
            received = money(v['cash_received']) if v.get('cash_received') is not None else cash
            if cash and received < cash:
                raise serializers.ValidationError({'cash_received': 'Montant reçu en espèces insuffisant.'})
            if not cash:
                received = Decimal('0')

            booking = None
            client = None
            name = (v.get('client_name') or '').strip()
            phone = (v.get('client_phone') or '').strip()
            if v.get('booking_id'):
                booking = Booking.objects.select_for_update().filter(pk=v['booking_id']).first()
                if not booking or booking.status in ('cancelled', 'done'):
                    raise serializers.ValidationError({'booking_id': 'Cette réservation n’est plus à encaisser.'})
                client = booking.client
                name = name or booking.name
                phone = phone or booking.phone
            if not client and phone:
                client = ClientAccount.objects.filter(phone=phone).first()

            sale = Sale.objects.create(
                cashier=request.user, booking=booking, client=client,
                client_name=name, client_phone=phone,
                subtotal=subtotal, discount=discount, total=total, payment_method=method,
                cash_amount=cash, card_amount=card, cash_received=received,
                change_given=received - cash if cash else Decimal('0'),
            )
            SaleLine.objects.bulk_create([
                SaleLine(sale=sale, service=svc, name=n, unit_price=p, quantity=q, line_total=t)
                for svc, n, p, q, t in lines
            ])
            if booking:
                booking.status = 'done'
                booking.save(update_fields=['status'])

        log_action(request.user, 'sale_created', 'sale', sale.number, f"{total} TND ({method})")
        sale = Sale.objects.select_related('cashier').prefetch_related('lines').get(pk=sale.pk)
        return Response(SaleSerializer(sale).data, status=status.HTTP_201_CREATED)


class SaleCancelView(APIView):
    """POST {reason} — cancel a ticket. Cashiers may only cancel today's tickets."""
    permission_classes = [IsCashierOrStaff]

    def post(self, request, pk):
        reason = (request.data.get('reason') or '').strip()
        if not reason:
            return Response({'detail': 'Indiquez le motif de l’annulation.'}, status=status.HTTP_400_BAD_REQUEST)
        with transaction.atomic():
            sale = Sale.objects.select_for_update().filter(pk=pk).first()
            if not sale:
                return Response({'detail': 'Ticket introuvable.'}, status=status.HTTP_404_NOT_FOUND)
            if not request.user.is_staff and timezone.localtime(sale.created_at).date() != timezone.localdate():
                return Response({'detail': 'Seuls les tickets du jour peuvent être annulés à la caisse.'},
                                status=status.HTTP_403_FORBIDDEN)
            if sale.status == 'cancelled':
                return Response({'detail': 'Ce ticket est déjà annulé.'}, status=status.HTTP_400_BAD_REQUEST)
            sale.status = 'cancelled'
            sale.cancel_reason = reason[:255]
            sale.cancelled_by = request.user
            sale.cancelled_at = timezone.now()
            sale.save(update_fields=['status', 'cancel_reason', 'cancelled_by', 'cancelled_at'])
            if sale.booking and sale.booking.status == 'done':
                sale.booking.status = 'confirmed'
                sale.booking.save(update_fields=['status'])
        log_action(request.user, 'sale_cancelled', 'sale', sale.number, reason[:200])
        sale = Sale.objects.select_related('cashier').prefetch_related('lines').get(pk=sale.pk)
        return Response(SaleSerializer(sale).data)


class CaisseSummaryView(APIView):
    """GET — end-of-day report: totals per payment method, services sold, cashiers."""
    permission_classes = [IsCashierOrStaff]

    def get(self, request):
        day = _requested_day(request)
        sales = list(Sale.objects.filter(created_at__date=day).select_related('cashier').prefetch_related('lines'))
        paid = [s for s in sales if s.status == 'paid']
        cancelled = [s for s in sales if s.status == 'cancelled']

        services = defaultdict(lambda: {'quantity': 0, 'total': Decimal('0')})
        cashiers = defaultdict(lambda: {'count': 0, 'total': Decimal('0')})
        for s in paid:
            for line in s.lines.all():
                services[line.name]['quantity'] += line.quantity
                services[line.name]['total'] += line.line_total
            who = (s.cashier.first_name or s.cashier.username) if s.cashier else '—'
            cashiers[who]['count'] += 1
            cashiers[who]['total'] += s.total

        def total_of(items, field):
            return str(money(sum((getattr(s, field) for s in items), Decimal('0'))))

        return Response({
            'date': day.isoformat(),
            'count': len(paid),
            'total': total_of(paid, 'total'),
            'cash_total': total_of(paid, 'cash_amount'),
            'card_total': total_of(paid, 'card_amount'),
            'discount_total': total_of(paid, 'discount'),
            'cancelled_count': len(cancelled),
            'cancelled_total': total_of(cancelled, 'total'),
            'services': sorted(
                ({'name': n, 'quantity': d['quantity'], 'total': str(money(d['total']))} for n, d in services.items()),
                key=lambda x: -Decimal(x['total']),
            ),
            'cashiers': [{'name': n, 'count': d['count'], 'total': str(money(d['total']))}
                         for n, d in cashiers.items()],
        })


# ---------------------------------------------------------------- cashier accounts (admin)

class CashierSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, trim_whitespace=False)

    class Meta:
        model = get_user_model()
        fields = ['id', 'username', 'first_name', 'is_active', 'last_login', 'password']
        read_only_fields = ['id', 'last_login']

    def validate_username(self, value):
        value = value.strip().lower()
        User = get_user_model()
        qs = User.objects.filter(username__iexact=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError('Cet identifiant est déjà utilisé.')
        return value

    def validate(self, attrs):
        password = attrs.get('password')
        if not self.instance and not password:
            raise serializers.ValidationError({'password': 'Mot de passe requis.'})
        if password:
            candidate = self.instance or get_user_model()(
                username=attrs.get('username', ''), first_name=attrs.get('first_name', ''))
            try:
                validate_password(password, user=candidate)
            except DjangoValidationError as error:
                raise serializers.ValidationError({'password': error.messages}) from error
        return attrs

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = get_user_model()(is_staff=False, is_superuser=False, **validated_data)
        user.set_password(password)
        user.save()
        user.groups.add(Group.objects.get_or_create(name=CASHIER_GROUP)[0])
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        for field, value in validated_data.items():
            setattr(instance, field, value)
        if password:
            instance.set_password(password)
        instance.save()
        if password or not instance.is_active:
            Token.objects.filter(user=instance).delete()
        return instance


def _cashiers():
    return get_user_model().objects.filter(groups__name=CASHIER_GROUP, is_staff=False).order_by('username')


class CashierListView(APIView):
    permission_classes = [IsStaffOnly]

    def get(self, request):
        return Response(CashierSerializer(_cashiers(), many=True).data)

    def post(self, request):
        serializer = CashierSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        log_action(request.user, 'cashier_created', 'cashier', user.username)
        return Response(CashierSerializer(user).data, status=status.HTTP_201_CREATED)


class CashierDetailView(APIView):
    permission_classes = [IsStaffOnly]

    def patch(self, request, pk):
        user = _cashiers().filter(pk=pk).first()
        if not user:
            return Response({'detail': 'Compte caisse introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = CashierSerializer(user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        log_action(request.user, 'cashier_updated', 'cashier', user.username,
                   ', '.join(k for k in request.data.keys() if k != 'password') or 'password')
        return Response(CashierSerializer(user).data)

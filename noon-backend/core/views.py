from datetime import timedelta
from collections import Counter
from math import ceil
from django.db.models import Count, Q
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.authtoken.models import Token
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.throttling import AnonRateThrottle
from django.utils import timezone

from .models import (
    ServiceCategory, Service, Testimonial, GalleryItem, OpeningHour, SiteSettings, Booking,
    ClientAccount, AdminAuditLog,
)
from .serializers import (
    ServiceCategorySerializer, ServiceSerializer, TestimonialSerializer, GalleryItemSerializer,
    OpeningHourSerializer, SiteSettingsSerializer, BookingSerializer,
    ClientAccountSerializer, ClientProfileUpdateSerializer, ClientPasswordChangeSerializer,
    ClientSignupSerializer,
    AdminAuditLogSerializer,
)
from .permissions import IsAdminOrReadOnly, IsMasterAdminOnly, IsStaffOnly
from .client_sessions import get_client_session, issue_client_session
from .sms import normalize_phone
from .whatsapp import send_whatsapp_message
from .audit import log_action


class LoginRateThrottle(AnonRateThrottle):
    scope = 'login'


class ClientSignupRateThrottle(AnonRateThrottle):
    scope = 'client_signup'


class ClientLoginRateThrottle(AnonRateThrottle):
    scope = 'client_login'


class AdminLookupRateThrottle(AnonRateThrottle):
    scope = 'admin_lookup'


class PublicBookingRateThrottle(AnonRateThrottle):
    scope = 'public_booking'


def paginate(request, qs, serializer, default_size=20, max_size=100):
    """Hand-rolled ?page= & page_size= pagination."""
    page = request.query_params.get('page')
    if not page:
        return Response(serializer(qs, many=True, context={'request': request}).data)
    try:
        page = max(1, int(page))
        page_size = max(1, min(int(request.query_params.get('page_size', default_size)), max_size))
    except (TypeError, ValueError):
        page = 1
        page_size = default_size
    total = qs.count()
    pages = max(1, ceil(total / page_size))
    page = min(page, pages)
    start = (page - 1) * page_size
    items = qs[start:start + page_size]
    return Response({
        'count': total,
        'page': page,
        'page_size': page_size,
        'pages': pages,
        'results': serializer(items, many=True, context={'request': request}).data,
    })


class ServiceCategoryViewSet(viewsets.ModelViewSet):
    queryset = ServiceCategory.objects.all()
    serializer_class = ServiceCategorySerializer
    permission_classes = [IsAdminOrReadOnly]


class ServiceViewSet(viewsets.ModelViewSet):
    serializer_class = ServiceSerializer
    permission_classes = [IsAdminOrReadOnly]

    def get_queryset(self):
        qs = Service.objects.select_related('category').all()
        if not (self.request.user and self.request.user.is_staff):
            qs = qs.filter(is_active=True)
        return qs


class TestimonialViewSet(viewsets.ModelViewSet):
    serializer_class = TestimonialSerializer
    permission_classes = [IsAdminOrReadOnly]

    def get_permissions(self):
        if self.action == 'create':
            return [AllowAny()]
        return [IsAdminOrReadOnly()]

    def create(self, request, *args, **kwargs):
        if request.user.is_staff:
            return super().create(request, *args, **kwargs)

        client = get_client_session(request)
        data = request.data.copy()
        data['client_id'] = client.pk
        data['phone'] = client.phone
        data['author_fr'] = client.name
        data['author_ar'] = client.name
        data['is_active'] = False
        data['order'] = 0
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def get_queryset(self):
        qs = Testimonial.objects.select_related('client').all()
        if not (self.request.user and self.request.user.is_staff):
            qs = qs.filter(is_active=True, client__isnull=False)
        return qs


class GalleryItemViewSet(viewsets.ModelViewSet):
    serializer_class = GalleryItemSerializer
    permission_classes = [IsAdminOrReadOnly]

    def get_queryset(self):
        qs = GalleryItem.objects.all()
        if not (self.request.user and self.request.user.is_staff):
            qs = qs.filter(is_active=True)
        return qs

    def create(self, request, *args, **kwargs):
        resp = super().create(request, *args, **kwargs)
        obj = GalleryItem.objects.filter(pk=resp.data.get('id')).first()
        log_action(request.user, 'gallery_uploaded', 'gallery',
                   obj.id if obj else '', obj.title_fr or 'Nouvelle photo')
        return resp

    def update(self, request, *args, **kwargs):
        resp = super().update(request, *args, **kwargs)
        obj = self.get_object()
        log_action(request.user, 'gallery_updated', 'gallery', obj.id, obj.title_fr or f'Photo {obj.id}')
        return resp

    def destroy(self, request, *args, **kwargs):
        obj = self.get_object()
        log_action(request.user, 'gallery_deleted', 'gallery', obj.id, obj.title_fr or f'Photo {obj.id}')
        return super().destroy(request, *args, **kwargs)


class OpeningHourViewSet(viewsets.ModelViewSet):
    queryset = OpeningHour.objects.all()
    serializer_class = OpeningHourSerializer
    permission_classes = [IsAdminOrReadOnly]


class BookingViewSet(viewsets.ModelViewSet):
    queryset = Booking.objects.all()
    serializer_class = BookingSerializer

    def get_permissions(self):
        if self.action == 'create':
            return [AllowAny()]
        return [IsStaffOnly()]

    def get_throttles(self):
        if self.action == 'create' and not self.request.user.is_authenticated:
            return [PublicBookingRateThrottle()]
        return super().get_throttles()

    def create(self, request, *args, **kwargs):
        response = super().create(request, *args, **kwargs)
        booking = Booking.objects.get(pk=response.data['id'])
        site_settings = SiteSettings.load()
        times = ', '.join(
            f'{slug}: {time}' for slug, time in (booking.category_times or {}).items()
        ) or '—'
        message = (
            'Nouvelle demande de rendez-vous NOON Center\n'
            f'Nom : {booking.name}\n'
            f'Téléphone : {booking.phone}\n'
            f'Services : {booking.service_label or "—"}\n'
            f'Date : {booking.preferred_date or "—"}\n'
            f'Horaires : {times}\n'
            f'Note : {booking.message or "—"}'
        )
        notification_sent = send_whatsapp_message(site_settings.whatsapp, message)
        data = dict(response.data)
        data['notification_sent'] = notification_sent
        return Response(data, status=response.status_code, headers=response.headers)

    def list(self, request, *args, **kwargs):
        qs = self.filter_queryset(self.get_queryset())
        q = (request.query_params.get('q') or '').strip()
        if q:
            qs = qs.filter(Q(name__icontains=q) | Q(phone__icontains=q) | Q(service_label__icontains=q))
        s = (request.query_params.get('status') or '').strip()
        if s:
            qs = qs.filter(status=s)
        return paginate(request, qs, BookingSerializer)

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        old_status = instance.status
        resp = super().update(request, *args, **kwargs)
        instance.refresh_from_db()
        if instance.status != old_status:
            log_action(request.user, 'booking_status_changed', 'booking',
                       instance.id, f"{old_status} -> {instance.status}")
        return resp


class ClientAccountViewSet(viewsets.ModelViewSet):
    serializer_class = ClientAccountSerializer

    def get_queryset(self):
        return ClientAccount.objects.annotate(booking_count=Count('bookings', distinct=True))

    def get_permissions(self):
        if self.action in ('create', 'check', 'client_login'):
            return [AllowAny()]
        if self.action in ('promote', 'demote'):
            return [IsMasterAdminOnly()]
        return [IsStaffOnly()]

    def get_throttles(self):
        if self.action == 'check':
            return [AdminLookupRateThrottle()]
        if self.action == 'create':
            return [ClientSignupRateThrottle()]
        if self.action == 'client_login':
            return [ClientLoginRateThrottle()]
        return super().get_throttles()

    def create(self, request, *args, **kwargs):
        serializer = ClientSignupSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        client = serializer.save()
        data = ClientAccountSerializer(client, context={'request': request}).data
        data['session_token'] = issue_client_session(client)
        return Response(data, status=status.HTTP_201_CREATED)

    def list(self, request, *args, **kwargs):
        qs = self.get_queryset()
        q = (request.query_params.get('q') or '').strip()
        if q:
            qs = qs.filter(Q(name__icontains=q) | Q(phone__icontains=q))
        return paginate(request, qs, ClientAccountSerializer)

    def update(self, request, *args, **kwargs):
        resp = super().update(request, *args, **kwargs)
        obj = self.get_object()
        log_action(request.user, 'client_updated', 'client', obj.id, obj.name)
        return resp

    def destroy(self, request, *args, **kwargs):
        obj = self.get_object()
        log_action(request.user, 'client_deleted', 'client', obj.id, obj.name)
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=['post'], permission_classes=[IsMasterAdminOnly], url_path='promote')
    def promote(self, request, pk=None):
        """Solo le super admin : crée le vrai compte Django (email + mot de passe, is_staff=True)
        qui permettra à ce client de se connecter à /admin avec email + mot de passe."""
        client = self.get_object()
        email = (request.data.get('email') or '').strip().lower()
        password = request.data.get('password') or ''
        if not email or '@' not in email or len(email) < 6:
            return Response({'detail': 'email_invalid'}, status=status.HTTP_400_BAD_REQUEST)
        User = get_user_model()
        prospective_user = User(username=email, email=email, first_name=client.name[:30])
        try:
            validate_password(password, user=prospective_user)
        except DjangoValidationError as error:
            return Response(
                {'detail': 'password_not_strong', 'errors': error.messages},
                status=status.HTTP_400_BAD_REQUEST,
            )
        user, created = User.objects.get_or_create(
            username=email, defaults={
                'email': email, 'first_name': client.name[:30], 'is_staff': True, 'is_active': True,
            },
        )
        if not created:
            user.email, user.is_staff, user.is_active = email, True, True
        user.set_password(password)
        user.save()
        client.user = user
        client.is_admin = True
        client.save(update_fields=['user', 'is_admin'])
        log_action(request.user, 'client_promoted', 'client', client.id, f"{client.name} (compte admin {email})")
        data = ClientAccountSerializer(client, context={'request': request}).data
        data['admin_email'] = email
        return Response(data)

    @action(detail=True, methods=['post'], permission_classes=[IsMasterAdminOnly], url_path='demote')
    def demote(self, request, pk=None):
        """Solo le super admin : révoque l'accès admin — email + mot de passe ne fonctionnent plus."""
        client = self.get_object()
        if client.user:
            client.user.is_staff = False
            client.user.is_active = False
            client.user.save(update_fields=['is_staff', 'is_active'])
            admin_email = client.user.email
        else:
            admin_email = ''
        client.is_admin = False
        client.save(update_fields=['is_admin'])
        log_action(request.user, 'client_demoted', 'client', client.id, f"{client.name} (admin révoqué)")
        return Response(ClientAccountSerializer(client, context={'request': request}).data)

    @staticmethod
    def _find_client(phone):
        """Find a client by normalized phone, name-agnostic."""
        norm = normalize_phone(phone)
        digits = norm.lstrip('+')
        for acc in ClientAccount.objects.all():
            if normalize_phone(acc.phone).lstrip('+') == digits:
                return acc
        return None

    @action(
        detail=False,
        methods=['post'],
        permission_classes=[AllowAny],
        throttle_classes=[AdminLookupRateThrottle],
    )
    def check(self, request):
        """Client login: check an account exists for the given name + phone.

        Also tells the frontend whether this person is an admin (linked Django
        account with staff rights) so the UI can ask for email + password and
        open the back-office, instead of treating them as a plain client.
        """
        raw_name = request.data.get('name')
        raw_phone = request.data.get('phone')
        name = raw_name.strip() if isinstance(raw_name, str) else ''
        phone = raw_phone.strip() if isinstance(raw_phone, str) else ''
        account = None
        if name and phone:
            account = self._find_client(phone)
            if account and account.name.lower() != name.lower():
                account = None
        if not account:
            return Response({'is_admin': False, 'client_exists': False})
        user = account.user
        is_admin = bool(user and user.is_active and user.is_staff)
        return Response({
            'is_admin': is_admin,
            'client_exists': True,
            'name': account.name if is_admin else '',
            'admin_role': ('superadmin' if user.is_superuser else 'admin') if is_admin else None,
        })

    @action(
        detail=False,
        methods=['post'],
        permission_classes=[AllowAny],
        throttle_classes=[ClientLoginRateThrottle],
        url_path='login',
    )
    def client_login(self, request):
        raw_name = request.data.get('name')
        raw_phone = request.data.get('phone')
        name = raw_name.strip() if isinstance(raw_name, str) else ''
        phone = raw_phone.strip() if isinstance(raw_phone, str) else ''
        password = request.data.get('password')
        client = self._find_client(phone) if name and phone else None
        if (
            not isinstance(password, str)
            or
            not client
            or client.name.casefold() != name.casefold()
            or (client.user and client.user.is_staff)
            or not client.check_password(password)
        ):
            raise AuthenticationFailed('Invalid client credentials.')

        data = ClientAccountSerializer(client, context={'request': request}).data
        data['session_token'] = issue_client_session(client)
        return Response(data)


class SiteSettingsView(APIView):
    """Singleton settings — GET is public, PUT/PATCH requires staff."""

    def get_permissions(self):
        if self.request.method in ('PUT', 'PATCH'):
            return [IsStaffOnly()]
        return [AllowAny()]

    def get(self, request):
        obj = SiteSettings.load()
        return Response(SiteSettingsSerializer(obj).data)

    def patch(self, request):
        obj = SiteSettings.load()
        serializer = SiteSettingsSerializer(obj, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        log_action(request.user, 'settings_updated', 'settings', obj.pk, 'Contenu / footer / coordonnées modifiés')
        return Response(serializer.data)


class AuthMeView(APIView):
    """GET /api/auth/me/ — identity of the authenticated (admin) Django user."""
    permission_classes = [IsStaffOnly]

    def get(self, request):
        u = request.user
        return Response({
            'username': u.username,
            'first_name': u.first_name or '',
            'last_name': u.last_name or '',
            'email': u.email or '',
            'is_staff': u.is_staff,
            'is_superuser': u.is_superuser,
        })


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        Token.objects.filter(user=request.user).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ClientMeView(APIView):
    """Self-service profile for the client identified by a verified session.
    GET -> own profile; PATCH -> update own name/phone/birthday/avatar."""
    permission_classes = [AllowAny]

    def get(self, request):
        client = get_client_session(request)
        return Response(ClientAccountSerializer(client, context={'request': request}).data)

    def patch(self, request):
        client = get_client_session(request)
        serializer = ClientProfileUpdateSerializer(
            client, data=request.data, partial=True, context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        if 'phone' in serializer.validated_data:
            serializer.validated_data['phone'] = normalize_phone(serializer.validated_data['phone'])
        serializer.save()
        try:
            client.refresh_from_db()
        except ClientAccount.DoesNotExist:
            pass
        log_action(None, 'profile_updated', 'client', client.id, client.name)
        return Response(ClientAccountSerializer(client, context={'request': request}).data)


class ClientPasswordChangeView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        client = get_client_session(request)
        serializer = ClientPasswordChangeSerializer(
            data=request.data,
            context={'client': client},
        )
        serializer.is_valid(raise_exception=True)
        client.set_password(serializer.validated_data['new_password'])
        client.session_version += 1
        client.save(update_fields=['password_hash', 'session_version'])
        return Response({'session_token': issue_client_session(client)})


class MyBookingsView(APIView):
    """GET /api/bookings/my/ — reservations for the verified client session."""
    permission_classes = [AllowAny]

    def get(self, request):
        client = get_client_session(request)
        qs = Booking.objects.filter(client=client)
        s = (request.query_params.get('status') or '').strip()
        if s:
            qs = qs.filter(status=s)
        return Response(BookingSerializer(qs, many=True, context={'request': request}).data)


class MyBookingCancelView(APIView):
    """POST /api/bookings/my/cancel/ {booking_id} — cancels an own PENDING booking."""
    permission_classes = [AllowAny]

    def post(self, request):
        client = get_client_session(request)
        bid = request.data.get('booking_id')
        if not bid:
            return Response({'detail': 'missing_fields'}, status=status.HTTP_400_BAD_REQUEST)
        booking = Booking.objects.filter(pk=bid, client=client).first()
        if not booking:
            return Response({'detail': 'no_booking'}, status=status.HTTP_404_NOT_FOUND)
        if booking.status != 'pending':
            return Response({'detail': 'not_pending'}, status=status.HTTP_400_BAD_REQUEST)
        booking.status = 'cancelled'
        booking.save(update_fields=['status'])
        log_action(None, 'booking_cancelled_by_client', 'booking', booking.id, booking.name)
        return Response(BookingSerializer(booking, context={'request': request}).data)


class AuditLogView(APIView):
    """GET /api/admin/audit-logs/?limit= — staff-only activity log."""
    permission_classes = [IsStaffOnly]

    def get(self, request):
        qs = AdminAuditLog.objects.select_related('user').all()
        try:
            limit = max(1, min(int(request.query_params.get('limit', 200)), 500))
        except (TypeError, ValueError):
            limit = 200
        serializer = AdminAuditLogSerializer(qs[:limit], many=True)
        return Response(serializer.data)


class LoginView(ObtainAuthToken):
    """POST {email|username, password} -> {token, username, is_staff}

    The identifier can be either the Django username or the account's email
    address, so admins sign in to the back-office with their email + password.
    """
    permission_classes = [AllowAny]
    throttle_classes = [LoginRateThrottle]

    def post(self, request, *args, **kwargs):
        data = request.data.copy()
        identifier = data.get('username')
        if isinstance(identifier, str):
            identifier = identifier.strip()
            data['username'] = identifier
            if '@' in identifier:
                from django.contrib.auth.models import User
                match = User.objects.filter(email__iexact=identifier).first()
                if match:
                    data['username'] = match.username
        serializer = self.serializer_class(data=data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        if not user.is_active or not user.is_staff:
            return Response(
                {'detail': 'Invalid administrator credentials.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        Token.objects.filter(user=user).delete()
        token = Token.objects.create(user=user)
        return Response({
            'token': token.key,
            'username': user.username,
            'email': user.email,
            'is_staff': user.is_staff,
            'is_superuser': user.is_superuser,
        })


class AvailabilityView(APIView):
    """GET /api/availability/?date=YYYY-MM-DD
    Returns opening hours and booked times for a given date."""
    permission_classes = [AllowAny]

    def get(self, request):
        date_str = request.query_params.get('date')
        if not date_str:
            return Response({'detail': 'date parameter required'}, status=400)
        try:
            from datetime import date as date_type
            d = date_type.fromisoformat(date_str)
        except ValueError:
            return Response({'detail': 'Invalid date format'}, status=400)

        weekday = d.weekday()
        try:
            hour = OpeningHour.objects.get(weekday=weekday)
            is_closed = hour.is_closed
            open_time = hour.open_time.strftime('%H:%M') if hour.open_time else None
            close_time = hour.close_time.strftime('%H:%M') if hour.close_time else None
        except OpeningHour.DoesNotExist:
            is_closed = True
            open_time = None
            close_time = None

        booked_qs = Booking.objects.filter(preferred_date=d).exclude(status='cancelled')

        # Flat total per time slot (kept for backward compatibility)
        booked_slots = {}
        # Per-category counts per time slot: {"10:00": {"visage": 1, "mains": 1}}
        category_counts = {}
        for b in booked_qs:
            cat_times = b.category_times or {}
            if cat_times:
                # New-style: each category can have its own preferred time
                for slug, tval in cat_times.items():
                    if not tval:
                        continue
                    key = tval[:5]
                    booked_slots[key] = booked_slots.get(key, 0) + 1
                    per_slot = category_counts.setdefault(key, {})
                    per_slot[slug] = per_slot.get(slug, 0) + 1
            else:
                # Legacy booking: single time shared by all listed categories
                t = b.preferred_time
                if t:
                    key = t.strftime('%H:%M')
                    booked_slots[key] = booked_slots.get(key, 0) + 1
                    per_slot = category_counts.setdefault(key, {})
                    for slug in [s.strip() for s in b.category_slugs.split(',') if s.strip()]:
                        per_slot[slug] = per_slot.get(slug, 0) + 1

        capacities = {
            c.slug: c.capacity
            for c in ServiceCategory.objects.all()
        }

        return Response({
            'date': date_str,
            'weekday': weekday,
            'is_closed': is_closed,
            'open_time': open_time,
            'close_time': close_time,
            'booked_times': sorted(booked_slots.keys()),
            'booked_counts': booked_slots,
            'category_counts': category_counts,
            'capacities': capacities,
        })


class DashboardSummaryView(APIView):
    permission_classes = [IsStaffOnly]

    def get(self, request):
        today = timezone.localdate()
        bookings = list(Booking.objects.select_related('client').order_by('-created_at'))
        trend_start = today - timedelta(days=6)
        trend_counts = Counter(
            booking.preferred_date.isoformat()
            for booking in bookings
            if booking.preferred_date and trend_start <= booking.preferred_date <= today
        )
        service_counts = Counter()
        for booking in bookings:
            for label in (booking.service_label or '').split(' · '):
                label = label.strip()
                if label:
                    service_counts[label] += 1

        return Response({
            'total_clients': ClientAccount.objects.count(),
            'total_bookings': Booking.objects.count(),
            'pending_bookings': Booking.objects.filter(status='pending').count(),
            'confirmed_bookings': Booking.objects.filter(status='confirmed').count(),
            'cancelled_bookings': Booking.objects.filter(status='cancelled').count(),
            'done_bookings': Booking.objects.filter(status='done').count(),
            'bookings_today': Booking.objects.filter(preferred_date=today).count(),
            'gallery_count': GalleryItem.objects.filter(is_active=True).count(),
            'total_services': Service.objects.filter(is_active=True).count(),
            'total_testimonials': Testimonial.objects.filter(is_active=True).count(),
            'booking_trend': [
                {
                    'date': (trend_start + timedelta(days=offset)).isoformat(),
                    'count': trend_counts.get((trend_start + timedelta(days=offset)).isoformat(), 0),
                }
                for offset in range(7)
            ],
            'service_demand': [
                {'label': label, 'count': count}
                for label, count in service_counts.most_common(5)
            ],
            'recent_bookings': [
                {
                    'id': booking.id,
                    'name': booking.name,
                    'avatar_url': (
                        request.build_absolute_uri(booking.client.avatar.url)
                        if booking.client and booking.client.avatar else ''
                    ),
                    'service_label': booking.service_label,
                    'preferred_date': booking.preferred_date.isoformat() if booking.preferred_date else None,
                    'preferred_time': booking.preferred_time.strftime('%H:%M') if booking.preferred_time else None,
                    'status': booking.status,
                }
                for booking in bookings[:6]
            ],
        })

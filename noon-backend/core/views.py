from datetime import timedelta
from django.conf import settings
from django.db.models import Count
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.authtoken.models import Token
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.utils import timezone

from .models import (
    ServiceCategory, Service, Testimonial, GalleryItem, OpeningHour, SiteSettings, Booking,
    ClientAccount, PhoneVerification,
)
from .serializers import (
    ServiceCategorySerializer, ServiceSerializer, TestimonialSerializer, GalleryItemSerializer,
    OpeningHourSerializer, SiteSettingsSerializer, BookingSerializer,
    ClientAccountSerializer,
)
from .permissions import IsAdminOrReadOnly, IsStaffOnly
from .sms import generate_code, normalize_phone, send_verification_code


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


class ClientAccountViewSet(viewsets.ModelViewSet):
    serializer_class = ClientAccountSerializer

    def get_queryset(self):
        return ClientAccount.objects.annotate(booking_count=Count('bookings', distinct=True))

    def get_permissions(self):
        if self.action in ('create', 'check', 'send_code', 'verify'):
            return [AllowAny()]
        return [IsStaffOnly()]

    @staticmethod
    def _find_client(phone):
        norm = normalize_phone(phone)
        for acc in ClientAccount.objects.all():
            if normalize_phone(acc.phone) == norm:
                return acc
        return None

    @action(detail=False, methods=['post'], permission_classes=[AllowAny], url_path='send-code')
    def send_code(self, request):
        """Send a 6-digit code to the phone; refuses if the account already exists."""
        phone = (request.data.get('phone') or '').strip()
        if not phone:
            return Response({'detail': 'phone_required'}, status=status.HTTP_400_BAD_REQUEST)
        if self._find_client(phone):
            return Response({'detail': 'account_exists'}, status=status.HTTP_409_CONFLICT)

        code = generate_code()
        PhoneVerification.objects.update_or_create(
            phone=normalize_phone(phone), defaults={'code': code, 'attempts': 0}
        )
        debug_code = send_verification_code(normalize_phone(phone), code)
        data = {'sent': True, 'resend_after': 30}
        if debug_code and getattr(settings, 'DEBUG', False):
            data['debug_code'] = debug_code
        return Response(data)

    @action(detail=False, methods=['post'], permission_classes=[AllowAny], url_path='verify')
    def verify(self, request):
        """Check the SMS code and create the client account only if it matches."""
        phone = (request.data.get('phone') or '').strip()
        code = (request.data.get('code') or '').strip()
        name = (request.data.get('name') or '').strip()
        birthday = request.data.get('birthday') or None
        if not phone or not code:
            return Response({'detail': 'missing_fields'}, status=status.HTTP_400_BAD_REQUEST)

        norm = normalize_phone(phone)
        record = PhoneVerification.objects.filter(phone=norm).first()
        if not record:
            return Response({'detail': 'no_code', 'message': 'Aucun code envoyé pour ce numéro'}, status=status.HTTP_400_BAD_REQUEST)

        record.attempts += 1
        if record.attempts > 5:
            record.delete()
            return Response({'detail': 'too_many_attempts'}, status=status.HTTP_400_BAD_REQUEST)
        if timezone.now() - record.created_at > timedelta(minutes=10):
            record.delete()
            return Response({'detail': 'expired'}, status=status.HTTP_400_BAD_REQUEST)
        if record.code != code:
            record.save(update_fields=['attempts'])
            return Response({'detail': 'wrong_code'}, status=status.HTTP_400_BAD_REQUEST)

        record.delete()
        account = self._find_client(norm)
        if account is None:
            account = ClientAccount.objects.create(name=name or 'Client', phone=norm)
        else:
            if name and account.name != name:
                account.name = name
                account.save(update_fields=['name'])
        if birthday and account.birthday != birthday:
            account.birthday = birthday
            account.save(update_fields=['birthday'])
        return Response(ClientAccountSerializer(account).data)

    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def check(self, request):
        """Client login: check an account exists for the given name + phone."""
        name = (request.data.get('name') or '').strip()
        phone = (request.data.get('phone') or '').strip()
        account = None
        if name and phone:
            account = self._find_client(phone)
            if account and account.name.lower() != name.lower():
                account = None
        if not account:
            return Response({'detail': 'no_client'}, status=status.HTTP_404_NOT_FOUND)
        return Response(ClientAccountSerializer(account).data)


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
        return Response(serializer.data)


class LoginView(ObtainAuthToken):
    """POST {username, password} -> {token, is_staff}"""
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        data = request.data.copy()
        if isinstance(data.get('username'), str):
            data['username'] = data['username'].strip()
        if isinstance(data.get('password'), str):
            data['password'] = data['password'].strip()
        serializer = self.serializer_class(data=data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        token, _ = Token.objects.get_or_create(user=user)
        return Response({
            'token': token.key,
            'username': user.username,
            'is_staff': user.is_staff,
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
        return Response({
            'total_bookings': Booking.objects.count(),
            'pending_bookings': Booking.objects.filter(status='pending').count(),
            'bookings_today': Booking.objects.filter(preferred_date=today).count(),
            'total_services': Service.objects.filter(is_active=True).count(),
            'total_testimonials': Testimonial.objects.filter(is_active=True).count(),
        })

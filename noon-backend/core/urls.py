from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ServiceCategoryViewSet, ServiceViewSet, TestimonialViewSet, GalleryItemViewSet,
    OpeningHourViewSet, BookingViewSet, ClientAccountViewSet, SiteSettingsView,
    LoginView, LogoutView, DashboardSummaryView, AvailabilityView, AuthMeView, ClientMeView,
    ClientPasswordChangeView,
    MyBookingsView, MyBookingCancelView, AuditLogView,
)

router = DefaultRouter()
router.register('categories', ServiceCategoryViewSet, basename='category')
router.register('services', ServiceViewSet, basename='service')
router.register('testimonials', TestimonialViewSet, basename='testimonial')
router.register('gallery', GalleryItemViewSet, basename='gallery')
router.register('hours', OpeningHourViewSet, basename='hour')
router.register('bookings', BookingViewSet, basename='booking')
router.register('clients', ClientAccountViewSet, basename='client')

urlpatterns = [
    # Specific self-service/staff paths must precede the router include so they
    # are not captured by the <pk> detail routes.
    path('auth/me/', AuthMeView.as_view(), name='auth-me'),
    path('auth/logout/', LogoutView.as_view(), name='auth-logout'),
    path('clients/me/', ClientMeView.as_view(), name='client-me'),
    path('clients/me/password/', ClientPasswordChangeView.as_view(), name='client-password-change'),
    path('bookings/my/cancel/', MyBookingCancelView.as_view(), name='my-booking-cancel'),
    path('bookings/my/', MyBookingsView.as_view(), name='my-bookings'),
    path('admin/audit-logs/', AuditLogView.as_view(), name='audit-logs'),
    path('', include(router.urls)),
    path('settings/', SiteSettingsView.as_view(), name='site-settings'),
    path('auth/login/', LoginView.as_view(), name='auth-login'),
    path('availability/', AvailabilityView.as_view(), name='availability'),
    path('dashboard/summary/', DashboardSummaryView.as_view(), name='dashboard-summary'),
]

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ServiceCategoryViewSet, ServiceViewSet, TestimonialViewSet, GalleryItemViewSet,
    OpeningHourViewSet, BookingViewSet, ClientAccountViewSet, SiteSettingsView,
    LoginView, DashboardSummaryView, AvailabilityView,
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
    path('', include(router.urls)),
    path('settings/', SiteSettingsView.as_view(), name='site-settings'),
    path('auth/login/', LoginView.as_view(), name='auth-login'),
    path('availability/', AvailabilityView.as_view(), name='availability'),
    path('dashboard/summary/', DashboardSummaryView.as_view(), name='dashboard-summary'),
]

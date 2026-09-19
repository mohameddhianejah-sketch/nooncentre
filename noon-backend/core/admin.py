from django.contrib import admin
from .models import ServiceCategory, Service, Testimonial, GalleryItem, OpeningHour, SiteSettings, Booking, ClientAccount

admin.site.site_header = "NOON Center — Administration"
admin.site.site_title = "NOON Center Admin"
admin.site.index_title = "Gestion du site"


@admin.register(ServiceCategory)
class ServiceCategoryAdmin(admin.ModelAdmin):
    list_display = ['name_fr', 'name_ar', 'slug', 'order', 'capacity', 'duration_minutes']
    prepopulated_fields = {'slug': ('name_fr',)}


@admin.register(Service)
class ServiceAdmin(admin.ModelAdmin):
    list_display = ['name_fr', 'category', 'price_tnd', 'is_package', 'is_active', 'order']
    list_filter = ['category', 'is_active', 'is_package']
    list_editable = ['price_tnd', 'is_active', 'order']
    search_fields = ['name_fr', 'name_ar']


@admin.register(Testimonial)
class TestimonialAdmin(admin.ModelAdmin):
    list_display = ['author_fr', 'client', 'rating', 'text_fr', 'is_active', 'order']
    list_filter = ['is_active', 'client']
    list_editable = ['is_active', 'order']


@admin.register(GalleryItem)
class GalleryItemAdmin(admin.ModelAdmin):
    list_display = ['title_fr', 'is_active', 'order', 'image']
    list_editable = ['is_active', 'order']
    search_fields = ['title_fr', 'title_ar', 'description_fr', 'description_ar']


@admin.register(OpeningHour)
class OpeningHourAdmin(admin.ModelAdmin):
    list_display = ['get_weekday_display', 'is_closed', 'open_time', 'close_time']
    list_editable = ['is_closed', 'open_time', 'close_time']


@admin.register(SiteSettings)
class SiteSettingsAdmin(admin.ModelAdmin):
    def has_add_permission(self, request):
        return not SiteSettings.objects.exists()


@admin.register(ClientAccount)
class ClientAccountAdmin(admin.ModelAdmin):
    list_display = ['name', 'phone', 'birthday', 'last_booking_at', 'created_at']
    fields = ['name', 'phone', 'birthday', 'avatar']
    search_fields = ['name', 'phone']
    date_hierarchy = 'created_at'


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = ['name', 'phone', 'service_label', 'preferred_date', 'preferred_time', 'status', 'created_at']
    list_filter = ['status', 'language']
    list_editable = ['status']
    search_fields = ['name', 'phone']
    date_hierarchy = 'created_at'

from rest_framework import serializers
from .sms import normalize_phone
from .models import ServiceCategory, Service, Testimonial, GalleryItem, OpeningHour, SiteSettings, Booking, ClientAccount


class ServiceSerializer(serializers.ModelSerializer):
    category_slug = serializers.SlugRelatedField(source='category', slug_field='slug', read_only=True)

    class Meta:
        model = Service
        fields = [
            'id', 'category', 'category_slug', 'name_fr', 'name_ar',
            'description_fr', 'description_ar', 'price_tnd', 'old_price_tnd',
            'is_package', 'is_active', 'order',
        ]


class ServiceCategorySerializer(serializers.ModelSerializer):
    services = ServiceSerializer(many=True, read_only=True)

    class Meta:
        model = ServiceCategory
        fields = ['id', 'name_fr', 'name_ar', 'description_fr', 'description_ar', 'slug', 'order', 'capacity', 'duration_minutes', 'services']


class TestimonialSerializer(serializers.ModelSerializer):
    client_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    avatar = serializers.ImageField(write_only=True, required=False)
    client_name = serializers.CharField(source='client.name', read_only=True)
    client_photo_url = serializers.SerializerMethodField()

    class Meta:
        model = Testimonial
        fields = ['id', 'client_id', 'avatar', 'client_name', 'client_photo_url', 'author_fr', 'author_ar', 'text_fr', 'text_ar', 'rating', 'is_active', 'order']

    def validate(self, attrs):
        request = self.context.get('request')
        client_id = self.initial_data.get('client_id')
        phone = self.initial_data.get('phone')
        if request and not request.user.is_staff and not client_id:
            raise serializers.ValidationError({'client_id': 'Un compte client est requis.'})
        if client_id:
            from .models import ClientAccount
            client = ClientAccount.objects.filter(pk=client_id).first()
            if not client or (phone and normalize_phone(phone) != normalize_phone(client.phone)):
                raise serializers.ValidationError({'client_id': 'Compte client invalide.'})
            attrs['client'] = client
        return attrs

    def create(self, validated_data):
        validated_data.pop('client_id', None)
        avatar = validated_data.pop('avatar', None)
        testimonial = super().create(validated_data)
        if avatar and testimonial.client:
            testimonial.client.avatar = avatar
            testimonial.client.save(update_fields=['avatar'])
        return testimonial

    def update(self, instance, validated_data):
        validated_data.pop('client_id', None)
        return super().update(instance, validated_data)

    def get_client_photo_url(self, obj):
        if not obj.client or not obj.client.avatar:
            return ''
        request = self.context.get('request')
        url = obj.client.avatar.url
        return request.build_absolute_uri(url) if request else url


class GalleryItemSerializer(serializers.ModelSerializer):
    photo_url = serializers.SerializerMethodField()

    class Meta:
        model = GalleryItem
        fields = [
            'id', 'image', 'image_url', 'photo_url', 'title_fr', 'title_ar',
            'description_fr', 'description_ar', 'is_active', 'order',
        ]

    def get_photo_url(self, obj):
        if obj.image:
            request = self.context.get('request')
            url = obj.image.url
            return request.build_absolute_uri(url) if request else url
        return obj.image_url


class OpeningHourSerializer(serializers.ModelSerializer):
    weekday_label = serializers.CharField(source='get_weekday_display', read_only=True)

    class Meta:
        model = OpeningHour
        fields = ['id', 'weekday', 'weekday_label', 'is_closed', 'open_time', 'close_time']


class SiteSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = SiteSettings
        fields = '__all__'


class ClientAccountSerializer(serializers.ModelSerializer):
    booking_count = serializers.IntegerField(read_only=True, default=0)
    avatar_url = serializers.SerializerMethodField()

    class Meta:
        model = ClientAccount
        fields = ['id', 'name', 'phone', 'birthday', 'avatar', 'avatar_url', 'created_at', 'last_booking_at', 'booking_count']

    def get_avatar_url(self, obj):
        if not obj.avatar:
            return ''
        request = self.context.get('request')
        url = obj.avatar.url
        return request.build_absolute_uri(url) if request else url


class BookingSerializer(serializers.ModelSerializer):
    service_name = serializers.CharField(source='service.name_fr', read_only=True, default=None)
    client_id = serializers.IntegerField(required=False, allow_null=True)
    birthday = serializers.DateField(required=False, allow_null=True, write_only=True,
                                     help_text="Optional client birthday (used to create/update the account)")

    class Meta:
        model = Booking
        fields = [
            'id', 'name', 'phone', 'client_id', 'service', 'service_name', 'service_label',
            'category_slugs', 'category_times', 'preferred_date', 'preferred_time',
            'message', 'language', 'status', 'created_at', 'birthday',
        ]
        read_only_fields = ['id', 'created_at', 'status']

    def create(self, validated_data):
        # allow status to default server-side regardless of client input
        validated_data.pop('status', None)
        birthday = validated_data.pop('birthday', None)
        client_id = validated_data.pop('client_id', None)

        client = None
        if client_id:
            client = ClientAccount.objects.filter(pk=client_id).first()
        if client is None:
            phone = (validated_data.get('phone') or '').strip()
            if phone:
                defaults = {'name': validated_data.get('name', '')}
                if birthday:
                    defaults['birthday'] = birthday
                client, _ = ClientAccount.objects.get_or_create(phone=phone, defaults=defaults)
                if client.name != validated_data.get('name'):
                    client.name = validated_data.get('name', client.name)
                    client.save(update_fields=['name'])
                if birthday and client.birthday != birthday:
                    client.birthday = birthday
                    client.save(update_fields=['birthday'])

        booking = super().create(validated_data)
        booking.client = client
        booking.save(update_fields=['client'])

        if client:
            from django.utils import timezone
            client.last_booking_at = timezone.now()
            client.save(update_fields=['last_booking_at'])
        return booking

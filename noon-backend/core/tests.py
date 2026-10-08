from datetime import timedelta

from django.utils import timezone
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from core.client_sessions import issue_client_session
from core.models import Booking, ClientAccount, SiteSettings, Testimonial
from core.serializers import SiteSettingsSerializer


class SiteSettingsFounderPhotoTests(TestCase):
    def test_founder_photo_field_exists(self):
        self.assertTrue(hasattr(SiteSettings, 'founder_photo'))

    def test_public_settings_serializer_uses_an_explicit_allowlist(self):
        expected_fields = {
            'site_name', 'tagline_fr', 'tagline_ar', 'about_fr', 'about_ar',
            'founder_name', 'founder_photo', 'founded_year', 'address_fr', 'address_ar',
            'phone', 'whatsapp', 'facebook_url', 'map_query', 'latitude', 'longitude',
        }

        self.assertEqual(set(SiteSettingsSerializer().fields), expected_fields)


class ClientSessionAccessTests(TestCase):
    def setUp(self):
        self.client_account = ClientAccount.objects.create(name='Client One', phone='21620000001')
        self.other_client = ClientAccount.objects.create(name='Client Two', phone='21620000002')
        self.api = APIClient()

    def test_client_id_alone_cannot_read_profile(self):
        response = self.api.get(f'/api/clients/me/?client_id={self.client_account.pk}')

        self.assertIn(response.status_code, (401, 403))

    def test_session_cannot_read_another_client_profile(self):
        self.api.credentials(HTTP_AUTHORIZATION=f'Client {issue_client_session(self.client_account)}')

        response = self.api.get(f'/api/clients/me/?client_id={self.other_client.pk}')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['id'], self.client_account.pk)

    def test_public_booking_cannot_be_attached_to_arbitrary_client(self):
        response = self.api.post('/api/bookings/', {
            'name': 'Guest',
            'phone': '21629999999',
            'client_id': self.other_client.pk,
        }, format='json')

        self.assertEqual(response.status_code, 201)
        booking = Booking.objects.get(pk=response.data['id'])
        self.assertIsNone(booking.client_id)

    def test_client_signup_hashes_password_and_issues_profile_session(self):
        password = 'Beryl-Delta-7391!'
        response = self.api.post('/api/clients/', {
            'name': 'New Client',
            'phone': '+216 20 300 001',
            'password': password,
        }, format='json')

        self.assertEqual(response.status_code, 201)
        client = ClientAccount.objects.get(phone='+21620300001')
        self.assertTrue(client.check_password(password))
        self.assertNotEqual(client.password_hash, password)
        self.assertNotIn('password_hash', response.data)
        self.assertTrue(response.data['session_token'])

        self.api.credentials(HTTP_AUTHORIZATION=f"Client {response.data['session_token']}")
        profile = self.api.get('/api/clients/me/')
        self.assertEqual(profile.status_code, 200)
        self.assertEqual(profile.data['id'], client.pk)

    def test_client_password_login_and_phone_profile_update(self):
        client = ClientAccount.objects.create(name='Client One', phone='21620300004')
        client.set_password('Beryl-Delta-7391!')
        client.save(update_fields=['password_hash'])

        invalid = self.api.post('/api/clients/login/', {
            'name': client.name,
            'phone': client.phone,
            'password': 'wrong-password',
        }, format='json')
        self.assertEqual(invalid.status_code, 401)

        valid = self.api.post('/api/clients/login/', {
            'name': client.name,
            'phone': client.phone,
            'password': 'Beryl-Delta-7391!',
        }, format='json')
        self.assertEqual(valid.status_code, 200)
        self.assertTrue(valid.data['session_token'])
        self.api.credentials(HTTP_AUTHORIZATION=f"Client {valid.data['session_token']}")

        updated = self.api.patch('/api/clients/me/', {
            'name': 'Updated Client',
            'phone': '+216 20 300 005',
        }, format='json')

        self.assertEqual(updated.status_code, 200)
        self.assertEqual(updated.data['name'], 'Updated Client')
        self.assertEqual(updated.data['phone'], '+21620300005')

    def test_client_password_change_persists_hash_and_revokes_old_session(self):
        client = ClientAccount.objects.create(name='Client One', phone='21620300006')
        old_password = 'Beryl-Delta-7391!'
        new_password = 'Topaz-Ocean-5824!'
        client.set_password(old_password)
        client.save(update_fields=['password_hash'])
        old_session = issue_client_session(client)
        self.api.credentials(HTTP_AUTHORIZATION=f'Client {old_session}')

        rejected = self.api.post('/api/clients/me/password/', {
            'current_password': 'incorrect-current-password',
            'new_password': new_password,
        }, format='json')
        self.assertEqual(rejected.status_code, 400)
        client.refresh_from_db()
        self.assertTrue(client.check_password(old_password))

        changed = self.api.post('/api/clients/me/password/', {
            'current_password': old_password,
            'new_password': new_password,
        }, format='json')

        self.assertEqual(changed.status_code, 200)
        client.refresh_from_db()
        self.assertTrue(client.check_password(new_password))
        self.assertFalse(client.check_password(old_password))
        self.assertGreater(client.session_version, 1)

        old_session_response = self.api.get('/api/clients/me/')
        self.assertIn(old_session_response.status_code, (401, 403))
        self.api.credentials(HTTP_AUTHORIZATION=f"Client {changed.data['session_token']}")
        new_session_response = self.api.get('/api/clients/me/')
        self.assertEqual(new_session_response.status_code, 200)

    def test_staff_admin_cannot_promote_another_client(self):
        staff = get_user_model().objects.create_user(username='staff-user', is_staff=True)
        self.api.force_authenticate(user=staff)

        response = self.api.post(
            f'/api/clients/{self.other_client.pk}/promote/',
            {'email': 'new-admin@example.invalid', 'password': 'long-enough-password'},
            format='json',
        )

        self.assertEqual(response.status_code, 403)

    def test_promoted_admin_password_must_pass_django_validators(self):
        master = get_user_model().objects.create_superuser(
            username='master-user',
            email='master@example.invalid',
            password='valid-master-password',
        )
        self.api.force_authenticate(user=master)

        response = self.api.post(
            f'/api/clients/{self.other_client.pk}/promote/',
            {'email': 'weak-admin@example.invalid', 'password': 'password'},
            format='json',
        )

        self.assertEqual(response.status_code, 400)
        self.assertFalse(get_user_model().objects.filter(username='weak-admin@example.invalid').exists())

    def test_admin_logout_revokes_api_token(self):
        staff = get_user_model().objects.create_user(username='logout-user', is_staff=True)
        token = Token.objects.create(user=staff)
        self.api.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')

        response = self.api.post('/api/auth/logout/')

        self.assertEqual(response.status_code, 204)
        self.assertFalse(Token.objects.filter(pk=token.pk).exists())

    def test_client_testimonial_requires_session_and_is_not_published_automatically(self):
        body = {
            'client_id': self.other_client.pk,
            'phone': self.other_client.phone,
            'author_fr': 'Impersonated',
            'text_fr': 'A review',
            'is_active': True,
        }
        denied = self.api.post('/api/testimonials/', body, format='json')
        self.assertIn(denied.status_code, (401, 403))

        self.api.credentials(HTTP_AUTHORIZATION=f'Client {issue_client_session(self.client_account)}')
        created = self.api.post('/api/testimonials/', body, format='json')

        self.assertEqual(created.status_code, 201)
        testimonial = Testimonial.objects.get(pk=created.data['id'])
        self.assertEqual(testimonial.client_id, self.client_account.pk)
        self.assertEqual(testimonial.author_fr, self.client_account.name)
        self.assertFalse(testimonial.is_active)

        public_items = self.api.get('/api/testimonials/')
        self.assertNotIn(testimonial.pk, [item['id'] for item in public_items.data])

        staff = get_user_model().objects.create_user(username='review-admin', is_staff=True)
        staff_token = Token.objects.create(user=staff)
        self.api.credentials(HTTP_AUTHORIZATION=f'Token {staff_token.key}')
        staff_items = self.api.get('/api/testimonials/')
        self.assertIn(testimonial.pk, [item['id'] for item in staff_items.data])

    def test_admin_lookup_matches_name_and_phone_without_exposing_client_data(self):
        user = get_user_model().objects.create_user(
            username='admin@example.invalid',
            email='admin@example.invalid',
            password='valid-admin-password',
            is_staff=True,
        )
        self.client_account.user = user
        self.client_account.save(update_fields=['user'])

        response = self.api.post('/api/clients/check/', {
            'name': self.client_account.name,
            'phone': self.client_account.phone,
        }, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data['is_admin'])
        self.assertEqual(response.data['name'], self.client_account.name)
        self.assertNotIn('phone', response.data)
        self.assertNotIn('birthday', response.data)

        mismatch = self.api.post('/api/clients/check/', {
            'name': 'Wrong Name',
            'phone': self.client_account.phone,
        }, format='json')
        self.assertFalse(mismatch.data['is_admin'])
        self.assertFalse(mismatch.data['client_exists'])

    def test_regular_client_lookup_is_distinguished_without_returning_private_data(self):
        response = self.api.post('/api/clients/check/', {
            'name': self.client_account.name,
            'phone': self.client_account.phone,
        }, format='json')

        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.data['is_admin'])
        self.assertTrue(response.data['client_exists'])
        self.assertNotIn('phone', response.data)
        self.assertNotIn('birthday', response.data)

    def test_admin_password_authenticates_staff_only(self):
        admin = get_user_model().objects.create_user(
            username='admin@example.invalid',
            email='admin@example.invalid',
            password='valid-admin-password',
            is_staff=True,
        )
        previous_token = Token.objects.create(user=admin)
        valid = self.api.post('/api/auth/login/', {
            'username': admin.username,
            'password': 'valid-admin-password',
        }, format='json')
        self.assertEqual(valid.status_code, 200)
        self.assertTrue(valid.data['token'])
        self.assertNotEqual(valid.data['token'], previous_token.key)
        self.assertFalse(Token.objects.filter(pk=previous_token.pk).exists())

        regular = get_user_model().objects.create_user(
            username='client-user',
            password='valid-client-password',
        )
        denied = self.api.post('/api/auth/login/', {
            'username': regular.username,
            'password': 'valid-client-password',
        }, format='json')
        self.assertEqual(denied.status_code, 401)

    def test_expired_admin_token_is_rejected_and_deleted(self):
        staff = get_user_model().objects.create_user(username='expired-user', is_staff=True)
        token = Token.objects.create(user=staff)
        Token.objects.filter(pk=token.pk).update(created=timezone.now() - timedelta(hours=13))
        self.api.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')

        response = self.api.get('/api/auth/me/')

        self.assertEqual(response.status_code, 401)
        self.assertFalse(Token.objects.filter(pk=token.pk).exists())

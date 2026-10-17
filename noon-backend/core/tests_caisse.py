from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.core.cache import cache
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from core.caisse import CASHIER_GROUP
from core.models import Booking, Sale, Service, ServiceCategory

PASSWORD = 'Caisse-Noon-2026!'


class CaisseTests(TestCase):
    def setUp(self):
        cache.clear()  # login throttles persist between tests otherwise
        User = get_user_model()
        self.admin = User.objects.create_user('admin@noon.tn', 'admin@noon.tn', PASSWORD, is_staff=True)
        self.cashier = User.objects.create_user('sarra', '', PASSWORD, first_name='Sarra')
        self.cashier.groups.add(Group.objects.get_or_create(name=CASHIER_GROUP)[0])
        cat = ServiceCategory.objects.create(name_fr='Visage', name_ar='الوجه', slug='visage')
        self.cleaning = Service.objects.create(category=cat, name_fr='Nettoyage de peau', name_ar='تنظيف البشرة',
                                               price_tnd=90)
        self.mask = Service.objects.create(category=cat, name_fr='Masque apaisant', name_ar='قناع مهدّئ',
                                           price_tnd=15)
        self.api = APIClient()

    def login_cashier(self):
        res = self.api.post('/api/caisse/login/', {'username': 'sarra', 'password': PASSWORD}, format='json')
        self.assertEqual(res.status_code, 200, res.content)
        self.api.credentials(HTTP_AUTHORIZATION=f"Token {res.data['token']}")

    def login_admin(self):
        res = self.api.post('/api/auth/login/', {'username': 'admin@noon.tn', 'password': PASSWORD}, format='json')
        self.assertEqual(res.status_code, 200, res.content)
        self.api.credentials(HTTP_AUTHORIZATION=f"Token {res.data['token']}")

    # --- access separation

    def test_cashier_cannot_sign_in_to_admin(self):
        res = self.api.post('/api/auth/login/', {'username': 'sarra', 'password': PASSWORD}, format='json')
        self.assertEqual(res.status_code, 401)

    def test_admin_cannot_sign_in_to_caisse(self):
        res = self.api.post('/api/caisse/login/', {'username': 'admin@noon.tn', 'password': PASSWORD}, format='json')
        self.assertEqual(res.status_code, 401)

    def test_cashier_token_is_refused_by_admin_endpoints(self):
        self.login_cashier()
        for path in ('/api/auth/me/', '/api/bookings/', '/api/clients/', '/api/dashboard/summary/',
                     '/api/admin/audit-logs/', '/api/caisse/cashiers/'):
            self.assertEqual(self.api.get(path).status_code, 403, path)
        self.assertEqual(self.api.patch('/api/settings/', {'site_name': 'x'}, format='json').status_code, 403)
        self.assertEqual(self.api.patch(f'/api/services/{self.mask.id}/', {'price_tnd': 1},
                                        format='json').status_code, 403)

    def test_anonymous_cannot_use_caisse(self):
        self.assertEqual(self.api.get('/api/caisse/sales/').status_code, 403)
        self.assertEqual(self.api.post('/api/caisse/sales/', {}, format='json').status_code, 403)

    # --- sales

    def test_cash_sale_uses_database_prices_and_gives_change(self):
        self.login_cashier()
        res = self.api.post('/api/caisse/sales/', {
            'lines': [{'service_id': self.cleaning.id, 'quantity': 1}, {'service_id': self.mask.id, 'quantity': 2}],
            'discount_type': 'percent', 'discount_value': '10',
            'payment_method': 'cash', 'cash_received': '120',
        }, format='json')
        self.assertEqual(res.status_code, 201, res.content)
        self.assertEqual(Decimal(res.data['subtotal']), Decimal('120.00'))
        self.assertEqual(Decimal(res.data['discount']), Decimal('12.00'))
        self.assertEqual(Decimal(res.data['total']), Decimal('108.00'))
        self.assertEqual(Decimal(res.data['change_given']), Decimal('12.00'))
        self.assertEqual(res.data['cashier_name'], 'Sarra')
        self.assertEqual(len(res.data['lines']), 2)

    def test_insufficient_cash_is_rejected(self):
        self.login_cashier()
        res = self.api.post('/api/caisse/sales/', {
            'lines': [{'service_id': self.cleaning.id}], 'payment_method': 'cash', 'cash_received': '50',
        }, format='json')
        self.assertEqual(res.status_code, 400)
        self.assertEqual(Sale.objects.count(), 0)

    def test_mixed_payment_splits_cash_and_card(self):
        self.login_cashier()
        res = self.api.post('/api/caisse/sales/', {
            'lines': [{'service_id': self.cleaning.id}], 'payment_method': 'mixed',
            'card_amount': '60', 'cash_received': '50',
        }, format='json')
        self.assertEqual(res.status_code, 201, res.content)
        self.assertEqual(Decimal(res.data['card_amount']), Decimal('60.00'))
        self.assertEqual(Decimal(res.data['cash_amount']), Decimal('30.00'))
        self.assertEqual(Decimal(res.data['change_given']), Decimal('20.00'))

    def test_paying_a_booking_marks_it_done_and_cancel_reopens_it(self):
        booking = Booking.objects.create(name='Amira', phone='21620000009', preferred_date=timezone.localdate(),
                                         service_label='Nettoyage de peau · Masque apaisant', status='confirmed')
        self.login_cashier()
        listed = self.api.get('/api/caisse/bookings/')
        self.assertEqual(listed.status_code, 200)
        self.assertEqual(listed.data[0]['service_ids'], [self.cleaning.id, self.mask.id])

        res = self.api.post('/api/caisse/sales/', {
            'lines': [{'service_id': i} for i in listed.data[0]['service_ids']],
            'payment_method': 'card', 'booking_id': booking.id,
        }, format='json')
        self.assertEqual(res.status_code, 201, res.content)
        self.assertEqual(res.data['client_name'], 'Amira')
        booking.refresh_from_db()
        self.assertEqual(booking.status, 'done')
        self.assertEqual(self.api.get('/api/caisse/bookings/').data, [])

        cancel = self.api.post(f"/api/caisse/sales/{res.data['id']}/cancel/", {'reason': 'Erreur'}, format='json')
        self.assertEqual(cancel.status_code, 200)
        booking.refresh_from_db()
        self.assertEqual(booking.status, 'confirmed')

    def test_cashier_cannot_cancel_an_older_ticket(self):
        self.login_cashier()
        res = self.api.post('/api/caisse/sales/', {
            'lines': [{'service_id': self.mask.id}], 'payment_method': 'card',
        }, format='json')
        Sale.objects.filter(pk=res.data['id']).update(created_at=timezone.now() - timedelta(days=2))
        cancel = self.api.post(f"/api/caisse/sales/{res.data['id']}/cancel/", {'reason': 'x'}, format='json')
        self.assertEqual(cancel.status_code, 403)

    def test_summary_totals_by_payment_method(self):
        self.login_cashier()
        for body in (
            {'lines': [{'service_id': self.cleaning.id}], 'payment_method': 'cash'},
            {'lines': [{'service_id': self.mask.id}], 'payment_method': 'card'},
            {'lines': [{'name': 'Shampooing', 'unit_price': '22.5'}], 'payment_method': 'card'},
        ):
            self.assertEqual(self.api.post('/api/caisse/sales/', body, format='json').status_code, 201)
        summary = self.api.get('/api/caisse/summary/').data
        self.assertEqual(summary['count'], 3)
        self.assertEqual(Decimal(summary['total']), Decimal('127.50'))
        self.assertEqual(Decimal(summary['cash_total']), Decimal('90.00'))
        self.assertEqual(Decimal(summary['card_total']), Decimal('37.50'))

    # --- cashier accounts

    def test_admin_creates_cashier_who_can_then_sign_in(self):
        self.login_admin()
        res = self.api.post('/api/caisse/cashiers/', {'username': 'Leila', 'first_name': 'Leila',
                                                      'password': PASSWORD}, format='json')
        self.assertEqual(res.status_code, 201, res.content)
        self.assertEqual(res.data['username'], 'leila')

        cashier_api = APIClient()
        login = cashier_api.post('/api/caisse/login/', {'username': 'leila', 'password': PASSWORD}, format='json')
        self.assertEqual(login.status_code, 200)

        self.api.patch(f"/api/caisse/cashiers/{res.data['id']}/", {'is_active': False}, format='json')
        cashier_api.credentials(HTTP_AUTHORIZATION=f"Token {login.data['token']}")
        self.assertIn(cashier_api.get('/api/caisse/me/').status_code, (401, 403))

    def test_weak_cashier_password_is_rejected(self):
        self.login_admin()
        res = self.api.post('/api/caisse/cashiers/', {'username': 'nour', 'password': '1234'}, format='json')
        self.assertEqual(res.status_code, 400)

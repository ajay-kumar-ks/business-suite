from app.modules.crm.db_models import Lead
from app.modules.crm.routers import _build_lead_payment_entry, _build_shared_payment_payload


def test_build_lead_payment_entry_includes_lead_context():
    lead = Lead(id='lead-123', title='Demo lead')

    entry = _build_lead_payment_entry(
        lead,
        {
            'amount': 12500,
            'currency': 'INR',
            'status': 'created',
            'description': 'Plan payment',
            'customer_name': 'Demo Customer',
            'provider': 'razorpay',
            'razorpay_order_id': 'order_123',
        },
    )

    assert entry['lead_id'] == 'lead-123'
    assert entry['lead_title'] == 'Demo lead'
    assert entry['amount'] == 12500
    assert entry['status'] == 'created'
    assert entry['provider'] == 'razorpay'
    assert entry['razorpay_order_id'] == 'order_123'


def test_build_shared_payment_payload_adds_lead_context():
    lead = Lead(id='lead-123', title='Demo lead')

    payload = _build_shared_payment_payload(
        lead,
        {
            'amount': 12500,
            'currency': 'INR',
            'status': 'paid',
            'description': 'Plan payment',
            'provider': 'manual',
        },
        order_id='manual_lead_123',
    )

    assert payload['razorpay_order_id'] == 'manual_lead_123'
    assert payload['amount'] == 12500
    assert payload['status'] == 'paid'
    assert payload['notes']['lead_id'] == 'lead-123'
    assert payload['notes']['lead_title'] == 'Demo lead'
    assert payload['notes']['provider'] == 'manual'

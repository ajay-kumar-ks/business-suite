import os
import requests
import sqlalchemy as sa
from app.core.config import settings
from app.core.database import engine

API_HOST = settings.API_HOST.rstrip('/')
CANDIDATES = [
    f"{API_HOST}/tenants",
    f"{API_HOST}/tenant",
    f"{API_HOST}/tenants/list",
    f"{API_HOST}/tenants?per_page=100",
    f"{API_HOST}/tenants?page=1&per_page=100",
]

# Look for common env vars for API keys
API_KEY = os.environ.get('NILE_API_KEY') or os.environ.get('NILE_TOKEN') or os.environ.get('API_KEY') or os.environ.get('DATABASE_API_KEY')
HEADERS = {}
if API_KEY:
    # try common auth header formats
    HEADERS['Authorization'] = f"Bearer {API_KEY}"
    HEADERS['x-api-key'] = API_KEY


def try_endpoint(url):
    try:
        print('->', url)
        resp = requests.get(url, headers=HEADERS, timeout=10)
        print(' status:', resp.status_code)
        try:
            print(' json:', resp.json())
        except Exception:
            print(' text:', resp.text[:1000])
        return resp
    except Exception as e:
        print(' ERROR:', repr(e))
        return None


def list_nile_tenants():
    print('Trying to discover Nile tenant endpoints...')
    results = []
    for url in CANDIDATES:
        r = try_endpoint(url)
        results.append((url, r))
    return results


def fetch_local_tenants():
    print('\nReading local accounts_tenants from DB:')
    with engine.connect() as conn:
        r = conn.execute(sa.text('SELECT id, name FROM accounts_tenants'))
        rows = r.fetchall()
        for row in rows:
            print(' local tenant:', row)
        return rows


if __name__ == '__main__':
    print('API_HOST:', API_HOST)
    if not API_KEY:
        print('No API key found in env. Requests may be unauthorized. Set NILE_API_KEY if available.')
    list_nile_tenants()
    local = fetch_local_tenants()
    print('\nDone.')

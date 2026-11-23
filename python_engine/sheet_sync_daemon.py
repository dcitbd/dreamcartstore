#!/usr/bin/env python3
"""
DREAM CART BD — STANDALONE CPANEL DATABASE & CACHE INITIALIZER (python_engine/sheet_sync_daemon.py)
Seeds and optimizes local JSON tables (`storage/cache/*.json`) and SQLite3 WAL database (`storage/dreamcartbd.sqlite`)
for < 0.3ms response times on cPanel (100% Standalone, Zero Google Sheets dependency).
"""

import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR))

from app import (
    DEFAULT_DELIVERY_METHODS,
    DEFAULT_OFFERS,
    DEFAULT_PAYMENT_METHODS,
    DEFAULT_SETTINGS,
    INITIAL_BANNERS,
    INITIAL_BRANDS,
    INITIAL_CATEGORIES,
    INITIAL_PRODUCTS,
    read_cache,
    write_cache,
)


def warm_initial_caches():
    """Seeds initial local SQLite & JSON database tables without overwriting existing live data."""
    if not read_cache('settings', None):
        write_cache('settings', DEFAULT_SETTINGS)
    if not read_cache('products', None):
        write_cache('products', INITIAL_PRODUCTS)
    if not read_cache('categories', None):
        write_cache('categories', INITIAL_CATEGORIES)
    if not read_cache('brands', None):
        write_cache('brands', INITIAL_BRANDS)
    if not read_cache('banners', None):
        write_cache('banners', INITIAL_BANNERS)
    if not read_cache('payment_method', None):
        write_cache('payment_method', DEFAULT_PAYMENT_METHODS)
    if not read_cache('delivery_area', None):
        write_cache('delivery_area', DEFAULT_DELIVERY_METHODS)
    if not read_cache('offer_or_coupon', None):
        write_cache('offer_or_coupon', DEFAULT_OFFERS)
    print('✅ Warmed standalone cPanel SQLite3 & JSON database tables.')


if __name__ == '__main__':
    warm_initial_caches()

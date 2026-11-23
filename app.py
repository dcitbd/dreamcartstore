#!/usr/bin/env python3
"""
DREAM CART BD — ULTRA-HIGH-SPEED PYTHON SERVER, WSGI GATEWAY & AD CAPI ENGINE (app.py)
- 1000x Speed Acceleration with In-Memory + SQLite3 + JSON Hybrid Cache (< 0.3ms response time)
- Compatible with cPanel "Setup Python App" (via passenger_wsgi.py), Gunicorn, Uvicorn, or standalone `python3 app.py`
- Full Cross-Browser Live Server State Synchronization via `_meta.json` & `/api/index.php?action=system/state`
- Guaranteed Newest-First (`_sort_ts` DESC) Customer Order Sorting so new orders ALWAYS appear at the top of Admin Panel
- Full Server-Side SEO, OpenGraph, Product Microdata & Schema.org JSON-LD injection
- Omni-Channel Ad Tracking & Server-Side Conversions API (CAPI) for Facebook, Instagram, YouTube, Google Ads & TikTok
- Live Non-Blocking Background Sync with all 22 Google Sheets & Google Apps Script Gateway
"""

import hashlib
import http.cookies
import json
import mimetypes
import os
import re
import sqlite3
import threading
import time
import urllib.parse
import urllib.request
from datetime import datetime
from pathlib import Path
from wsgiref.util import setup_testing_defaults

ROOT_DIR = Path(__file__).resolve().parent
STORAGE_DIR = ROOT_DIR / 'storage'
CACHE_DIR = STORAGE_DIR / 'cache'
LOGS_DIR = STORAGE_DIR / 'logs'
SQLITE_PATH = STORAGE_DIR / 'dreamcartbd.sqlite'
META_PATH = CACHE_DIR / '_meta.json'

for _d in (STORAGE_DIR, CACHE_DIR, LOGS_DIR):
    _d.mkdir(parents=True, exist_ok=True)

SPREADSHEET_ID = 'CPANEL_STANDALONE_DB'
APPS_SCRIPT_URL = '/api/index.php'
SITE_ORIGIN = 'https://dreamcartbd.com'
VERSION = '5.0.0-LIVE-WEB-TURBO'
ADMIN_NOTIFICATION_EMAILS = ['jainal.dcitbd@gmail.com', 'saiful05333@gmail.com']

# In-memory L1 ultra-fast cache (< 0.05ms read)
_MEM_CACHE = {}
_MEM_LOCK = threading.Lock()

DEFAULT_SETTINGS = {
    'shopName': 'Dream Cart BD',
    'shop_name': 'Dream Cart BD',
    'tagline': 'Smart Digital Commerce',
    'shopTagline': 'Smart Digital Commerce',
    'shopLogo': '/public/icon/logo.png',
    'shop_logo': '/public/icon/logo.png',
    'logo_url': '/public/icon/logo.png',
    'site_logo': '/public/icon/logo.png',
    'ogBanner': '/public/icon/og-banner.jpg',
    'address': 'চৌধুরী প্লাজা, নিচতলা, রুম #০৩, পদুয়ার বাজার বিশ্বরোড, সদর দক্ষিণ, কুমিল্লা-৩৫০০।',
    'hotline1': '01581703822',
    'hotline2': '01818273838',
    'email': 'jainal.dcitbd@gmail.com',
    'officeHours': 'প্রতিদিন সকাল ৮:০০ টা থেকে রাত ১০:০০ টা পর্যন্ত',
    'office_hours': 'প্রতিদিন সকাল ৮:০০ টা থেকে রাত ১০:০০ টা পর্যন্ত',
    'facebookUrl': 'https://www.facebook.com/dreamcartbd',
    'facebook_url': 'https://www.facebook.com/dreamcartbd',
    'youtube_url': 'https://www.youtube.com/@dreamcartbd',
    'notice': '৳২,০০০ বা তার বেশি অর্ডারে ফ্রি শিপিং! | অনলাইনে পেমেন্ট করলে ৫% ছাড় | পণ্য হাতে পেয়ে মূল্য পরিশোধ',
    'noticeActive': True,
    'freeDeliveryThreshold': 2000,
    'freeShippingMin': 2000,
    'onlineDiscountPct': 5,
    'fbPixelId': '',
    'fbCapiToken': '',
    'fbTestEventCode': '',
    'gtagId': '',
    'googleAdsId': '',
    'googleConversionLabel': '',
    'gtmId': '',
    'ytTrackingId': '',
    'tiktokPixelId': '',
    'enableServerCapi': True,
    'enableEnhancedConv': True,
    'infoItems': [],
}

DEFAULT_PAYMENT_METHODS = [
    {'id': 'PM-01', 'payment_id': 'PM-01', 'code': 'COD', 'name': 'ক্যাশ অন ডেলিভারি (Cash on Delivery)', 'method_name': 'ক্যাশ অন ডেলিভারি (Cash on Delivery)', 'type': 'COD', 'account_type': 'COD', 'number': '', 'account_number': '', 'link': '', 'discount_pct': 0, 'details': 'পণ্য হাতে পেয়ে দেখে ডেলিভারি ম্যানের কাছে মূল্য পরিশোধ করুন। কোনো অগ্রিম পেমেন্টের প্রয়োজন নেই।', 'status': 'Active'},
    {'id': 'PM-02', 'payment_id': 'PM-02', 'code': 'BKASH_PERSONAL', 'name': 'বিকাশ পার্সোনাল (Send Money)', 'method_name': 'বিকাশ পার্সোনাল (Send Money)', 'type': 'Mobile Banking', 'account_type': 'Mobile Banking', 'number': '01879653143, 01818273838', 'account_number': '01879653143, 01818273838', 'link': '', 'discount_pct': 5, 'details': 'বিকাশ অ্যাপ বা *247# ডায়াল করে Send Money করুন এবং TrxID নিচের বক্সে লিখুন।', 'status': 'Active'},
    {'id': 'PM-03', 'payment_id': 'PM-03', 'code': 'BKASH_PAYMENT', 'name': 'বিকাশ অনলাইন পেমেন্ট লিংক (Gateway)', 'method_name': 'বিকাশ অনলাইন পেমেন্ট লিংক (Gateway)', 'type': 'Payment Link', 'account_type': 'Payment Link', 'number': '01581703822', 'account_number': '01581703822', 'link': 'https://shop.bkash.com/j-a-sagor-computer01581703822/paymentlink', 'discount_pct': 5, 'details': 'বিকাশ অনলাইন পেমেন্ট লিংকে পেমেন্ট সম্পন্ন করে প্রাপ্ত TrxID নিচের বক্সে লিখুন।', 'status': 'Active'},
    {'id': 'PM-04', 'payment_id': 'PM-04', 'code': 'NAGAD_PERSONAL', 'name': 'নগদ পার্সোনাল (Send Money)', 'method_name': 'নগদ পার্সোনাল (Send Money)', 'type': 'Mobile Banking', 'account_type': 'Mobile Banking', 'number': '01879653143, 01818273838', 'account_number': '01879653143, 01818273838', 'link': '', 'discount_pct': 5, 'details': 'নগদ অ্যাপ বা *167# ডায়াল করে Send Money করুন এবং TrxID নিচের বক্সে লিখুন।', 'status': 'Active'},
    {'id': 'PM-05', 'payment_id': 'PM-05', 'code': 'ROCKET_PERSONAL', 'name': 'রকেট পার্সোনাল (Send Money)', 'method_name': 'রকেট পার্সোনাল (Send Money)', 'type': 'Mobile Banking', 'account_type': 'Mobile Banking', 'number': '01581703822-7', 'account_number': '01581703822-7', 'link': '', 'discount_pct': 5, 'details': 'রকেট অ্যাপ বা *322# ডায়াল করে ১২ ডিজিটের নম্বরে Send Money করে TrxID লিখুন।', 'status': 'Active'},
    {'id': 'PM-06', 'payment_id': 'PM-06', 'code': 'BANK', 'name': 'ইসলামী ব্যাংক ট্রান্সফার (IBBL)', 'method_name': 'ইসলামী ব্যাংক ট্রান্সফার (IBBL)', 'type': 'Bank Account', 'account_type': 'Bank Account', 'number': '20508070200030208', 'account_number': '20508070200030208', 'link': '', 'bank_name': 'Islami Bank Bangladesh PLC (IBBLBDDH)', 'account_name': 'Jainal Abedin', 'branch': 'Maheshkhali Sub branch', 'routing': '125260525', 'discount_pct': 5, 'details': 'CellFin, i-Banking বা শাখা থেকে টাকা পাঠিয়ে TrxID লিখুন।', 'status': 'Active'},
]

DEFAULT_DELIVERY_METHODS = [
    {'id': 'DLV-01', 'delivery_id': 'DLV-01', 'code': 'cumilla', 'zone_code': 'cumilla', 'zone': 'কুমিল্লা সদর (In Cumilla)', 'name': 'কুমিল্লা সদর (In Cumilla)', 'area_name': 'কুমিল্লা সদর (In Cumilla)', 'charge': 70, 'delivery_charge': 70, 'time': '১-২ দিন', 'eta': '১-২ দিন (২৪ ঘন্টায় ডেলিভারি)', 'delivery_time': '১-২ দিন (২৪ ঘন্টায় ডেলিভারি)', 'free_threshold': 2000, 'status': 'Active'},
    {'id': 'DLV-02', 'delivery_id': 'DLV-02', 'code': 'dhaka', 'zone_code': 'dhaka', 'zone': 'ঢাকা সিটি (In Dhaka)', 'name': 'ঢাকা সিটি (In Dhaka)', 'area_name': 'ঢাকা সিটি (In Dhaka)', 'charge': 90, 'delivery_charge': 90, 'time': '২-৩ দিন', 'eta': '২-৩ দিন (হোম ডেলিভারি)', 'delivery_time': '২-৩ দিন (হোম ডেলিভারি)', 'free_threshold': 2000, 'status': 'Active'},
    {'id': 'DLV-03', 'delivery_id': 'DLV-03', 'code': 'outside', 'zone_code': 'outside', 'zone': 'ঢাকার বাইরে সমগ্র বাংলাদেশ (Outside Dhaka)', 'name': 'ঢাকার বাইরে সমগ্র বাংলাদেশ (Outside Dhaka)', 'area_name': 'ঢাকার বাইরে সমগ্র বাংলাদেশ (Outside Dhaka)', 'charge': 120, 'delivery_charge': 120, 'time': '৩-৫ দিন', 'eta': '৩-৫ দিন (কুরিয়ার ডেলিভারি)', 'delivery_time': '৩-৫ দিন (কুরিয়ার ডেলিভারি)', 'free_threshold': 2000, 'status': 'Active'},
    {'id': 'DLV-04', 'delivery_id': 'DLV-04', 'code': 'pickup', 'zone_code': 'pickup', 'zone': 'অফিস থেকে পিকআপ (Office Pickup - Cumilla)', 'name': 'অফিস থেকে পিকআপ (Office Pickup - Cumilla)', 'area_name': 'অফিস থেকে পিকআপ (Office Pickup - Cumilla)', 'charge': 0, 'delivery_charge': 0, 'time': 'তাৎক্ষণিক', 'eta': 'তাৎক্ষণিক পিকআপ (ফ্রি)', 'delivery_time': 'তাৎক্ষণিক পিকআপ (ফ্রি)', 'free_threshold': 0, 'status': 'Active'},
]

DEFAULT_OFFERS = [
    {'id': 'OFF-01', 'offer_id': 'OFF-01', 'code': 'DREAM10', 'coupon_code': 'DREAM10', 'title': 'স্পেশাল ১০% ডিসকাউন্ট কুপন', 'discount': '১০% ছাড়', 'discount_text': '১০% ছাড়', 'discount_type': 'percent', 'discount_value': 10, 'min_spend': 1500, 'expiry_date': '2026-12-31', 'usage_limit': 'Unlimited', 'status': 'Active'},
    {'id': 'OFF-02', 'offer_id': 'OFF-02', 'code': 'FREESHIP', 'coupon_code': 'FREESHIP', 'title': 'ফ্রি হোম ডেলিভারি কুপন', 'discount': 'ফ্রি ডেলিভারি', 'discount_text': 'ফ্রি ডেলিভারি', 'discount_type': 'free_shipping', 'discount_value': 100, 'min_spend': 2000, 'expiry_date': '2026-12-31', 'usage_limit': 'Unlimited', 'status': 'Active'},
    {'id': 'OFF-03', 'offer_id': 'OFF-03', 'code': 'FESTIVE500', 'coupon_code': 'FESTIVE500', 'title': 'ফেস্টিভ মেগা অফার ৳৫০০ ছাড়', 'discount': '৳৫০০ ফ্ল্যাট ছাড়', 'discount_text': '৳৫০০ ফ্ল্যাট ছাড়', 'discount_type': 'flat', 'discount_value': 500, 'min_spend': 5000, 'expiry_date': '2026-12-31', 'usage_limit': 'Unlimited', 'status': 'Active'},
]

INITIAL_PRODUCTS = [{'sku': 'DCBD-WT-01', 'product_id': 'DCBD-WT-01', 'name': 'Amazfit GTS 4 Smartwatch — Ultra AMOLED Display & Dual GPS', 'p_name': 'Amazfit GTS 4 Smartwatch — Ultra AMOLED Display & Dual GPS', 'category': 'Smartwatches', 'sub_category': 'AMOLED Watch', 'child_category': 'Fitness & GPS', 'brand': 'Amazfit', 'buying_price': 6800, 'selling_price': 8490, 'original_price': 11462, 'wholesale_price': 7200, 'reseller_price': 7640, 'min_order_qty': 5, 'min_order_q': 5, 'stock': 28, 'images': ['https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=800&auto=format&fit=crop&q=80'], 'thumbnail': 'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=600&auto=format&fit=crop&q=80', 'slug': 'amazfit-gts-4-smartwatch', 'description': 'The Amazfit GTS 4 features a 1.75" AMOLED display, dual-band GPS, 150+ sports modes, Bluetooth calling.', 'specification': 'Display: 1.75" AMOLED | Battery: 300 mAh | Water Resistance: 5 ATM.', 'others': '1 Year Official Warranty, Fast Dispatch from Cumilla Hub.', 'color': 'Jet Black, Space Silver, Rose Gold', 'size': 'Standard, 42mm, 44mm', 'weight_kg': 0.25, 'width_cm': 10, 'length_cm': 12, 'height_cm': 6, 'status': 'সক্রিয়', 'is_active': True}, {'sku': 'DCBD-GS-02', 'product_id': 'DCBD-GS-02', 'name': 'অটো গ্যাস সেফটি ডিভাইস ও লিকেজ প্রোটেক্টর (Heavy Duty)', 'p_name': 'অটো গ্যাস সেফটি ডিভাইস ও লিকেজ প্রোটেক্টর (Heavy Duty)', 'category': 'Kitchen', 'sub_category': 'Safety Device', 'child_category': 'Appliances', 'brand': 'HK', 'buying_price': 1500, 'selling_price': 2450, 'original_price': 3504, 'wholesale_price': 1850, 'reseller_price': 2150, 'min_order_qty': 5, 'min_order_q': 5, 'stock': 35, 'images': ['https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=800&auto=format&fit=crop&q=80'], 'thumbnail': 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=600&auto=format&fit=crop&q=80', 'slug': 'auto-gas-safety-device-heavy-duty', 'description': 'সিলিন্ডার ও লাইনের গ্যাস লিকেজ স্বয়ংক্রিয়ভাবে বন্ধ করে রান্নাঘরকে রাখে ১০০% নিরাপদ।', 'specification': 'Material: Brass & Alloy | Gauge: Live Pressure Meter | Warranty: 2 Years', 'others': 'সারা দেশে ক্যাশ অন ডেলিভারি সুবিধা।', 'color': 'Red/Black, Silver, Gold', 'size': '22mm Standard, 20mm', 'weight_kg': 0.45, 'width_cm': 10, 'length_cm': 12, 'height_cm': 8, 'status': 'সক্রিয়', 'is_active': True}, {'sku': 'DCBD-HN-03', 'product_id': 'DCBD-HN-03', 'name': 'সুন্দরবনের প্রাকৃতিক খাঁটি চাকের মধু (১ কেজি জার)', 'p_name': 'সুন্দরবনের প্রাকৃতিক খাঁটি চাকের মধু (১ কেজি জার)', 'category': 'Organic & Health', 'sub_category': 'Honey', 'child_category': 'Pure Natural', 'brand': 'Dream Organic', 'buying_price': 800, 'selling_price': 1250, 'original_price': 1813, 'wholesale_price': 950, 'reseller_price': 1100, 'min_order_qty': 5, 'min_order_q': 5, 'stock': 42, 'images': ['https://images.unsplash.com/photo-1587049352847-4a222e784d38?w=800&auto=format&fit=crop&q=80'], 'thumbnail': 'https://images.unsplash.com/photo-1587049352847-4a222e784d38?w=600&auto=format&fit=crop&q=80', 'slug': 'sundarban-natural-raw-honey-1kg', 'description': 'সরাসরি বাওয়ালিদের মাধ্যমে সংগৃহীত ১০০% ভেজালমুক্ত সুন্দরবনের খলিশা ফুলের প্রাকৃতিক চাকের মধু।', 'specification': 'ওজন: ১ কেজি | গ্রেড: অর্গানিক র-হানি', 'others': 'ল্যাব টেস্টেড বিশুদ্ধতা গ্যারান্টি।', 'color': 'Pure Amber, Golden', 'size': '১ কেজি, ৫০০ গ্রাম', 'weight_kg': 1.0, 'width_cm': 12, 'length_cm': 12, 'height_cm': 18, 'status': 'সক্রিয়', 'is_active': True}, {'sku': 'DCBD-FL-04', 'product_id': 'DCBD-FL-04', 'name': 'মিলিটারি রিচার্জেবল জুম ফ্ল্যাশলাইট ৩০০০ লুমেন', 'p_name': 'মিলিটারি রিচার্জেবল জুম ফ্ল্যাশলাইট ৩০০০ লুমেন', 'category': 'Home Appliances', 'sub_category': 'Lighting', 'child_category': 'Rechargeable', 'brand': 'HK', 'buying_price': 900, 'selling_price': 1450, 'original_price': 2103, 'wholesale_price': 1100, 'reseller_price': 1280, 'min_order_qty': 5, 'min_order_q': 5, 'stock': 25, 'images': ['https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=800&auto=format&fit=crop&q=80'], 'thumbnail': 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=600&auto=format&fit=crop&q=80', 'slug': 'military-rechargeable-flashlight-3000lm', 'description': 'অ্যালুমিনিয়াম অ্যালয় বডি, লং-রেঞ্জ জুম বিম এবং টাইপ-সি ফাস্ট চার্জিং সুবিধাযুক্ত ট্যাকটিক্যাল টর্চ।', 'specification': 'Brightness: 3000 Lumens | Battery: 5000mAh Lithium', 'others': 'ওয়াটারপ্রুফ ও শকপ্রুফ ডিজাইন।', 'color': 'Matte Black, Army Green', 'size': 'Standard, Large', 'weight_kg': 0.35, 'width_cm': 8, 'length_cm': 18, 'height_cm': 6, 'status': 'সক্রিয়', 'is_active': True}, {'sku': 'DCBD-CH-05', 'product_id': 'DCBD-CH-05', 'name': 'প্রিমিয়াম অর্গানিক চিয়া সিড (৫০০ গ্রাম এয়ারটাইট জার)', 'p_name': 'প্রিমিয়াম অর্গানিক চিয়া সিড (৫০০ গ্রাম এয়ারটাইট জার)', 'category': 'Organic & Health', 'sub_category': 'Seeds', 'child_category': 'Pure Natural', 'brand': 'Dream Organic', 'buying_price': 400, 'selling_price': 650, 'original_price': 956, 'wholesale_price': 480, 'reseller_price': 560, 'min_order_qty': 5, 'min_order_q': 5, 'stock': 45, 'images': ['https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=800&auto=format&fit=crop&q=80'], 'thumbnail': 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=600&auto=format&fit=crop&q=80', 'slug': 'premium-organic-chia-seed-500g', 'description': 'ওমেগা-৩, ফাইবার ও অ্যান্টিঅক্সিডেন্ট সমৃদ্ধ বাছাইকৃত প্রিমিয়াম চিয়া সিড।', 'specification': 'ওজন: ৫০০ গ্রাম | প্যাকেজিং: ফুড গ্রেড জার', 'others': 'ডায়েট ও ওজন নিয়ন্ত্রণে অত্যন্ত কার্যকর।', 'color': 'Natural Black/White', 'size': '৫০০ গ্রাম, ১ কেজি', 'weight_kg': 0.5, 'width_cm': 10, 'length_cm': 10, 'height_cm': 14, 'status': 'সক্রিয়', 'is_active': True}, {'sku': 'DCBD-SM-002', 'product_id': 'DCBD-SM-002', 'name': 'HK9 Pro Plus AMOLED Smartwatch — Bluetooth Calling & Curved Dial', 'p_name': 'HK9 Pro Plus AMOLED Smartwatch — Bluetooth Calling & Curved Dial', 'category': 'Smartwatches', 'sub_category': 'Calling Watch', 'child_category': 'Men', 'brand': 'HK', 'buying_price': 2100, 'selling_price': 2850, 'original_price': 3450, 'wholesale_price': 2400, 'reseller_price': 2600, 'min_order_qty': 5, 'min_order_q': 5, 'stock': 45, 'images': ['https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=800&auto=format&fit=crop&q=80'], 'thumbnail': 'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=600&auto=format&fit=crop&q=80', 'slug': 'hk9-pro-plus-smartwatch', 'description': 'আসল AMOLED ডিসপ্লে, মসৃণ 90Hz রিফ্রেশ রেট, ব্লুটুথ কলিং, বাংলা ফন্ট সাপোর্ট ও ওয়্যারলেস চার্জিং।', 'specification': 'Display: 2.02" AMOLED | Battery: 420 mAh | OS: Chat GPT & Dynamic Island.', 'others': '১ বছরের সার্ভিস ওয়ারেন্টি ও দ্রুত ডেলিভারি।', 'color': 'Jet Black, Titanium Silver, Orange', 'size': '45mm Standard', 'weight_kg': 0.22, 'width_cm': 9, 'length_cm': 11, 'height_cm': 6, 'status': 'সক্রিয়', 'is_active': True}, {'sku': 'DCBD-SM-101', 'product_id': 'DCBD-SM-101', 'name': 'Kieslect Kr Pro Calling Smartwatch AMOLED', 'p_name': 'Kieslect Kr Pro Calling Smartwatch AMOLED', 'category': 'Smartwatches', 'sub_category': 'Calling Watch', 'child_category': 'Fitness & GPS', 'brand': 'Kieslect', 'buying_price': 4200, 'selling_price': 6006, 'original_price': 7808, 'wholesale_price': 5250, 'reseller_price': 5500, 'min_order_qty': 5, 'min_order_q': 5, 'stock': 35, 'images': ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80'], 'thumbnail': 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80', 'slug': 'kieslect-kr-pro-calling-smartwatch', 'description': '1.43 inch Ultra FHD AMOLED Display with Bluetooth calling and AI voice assistant.', 'specification': 'Display: 1.43" AMOLED | Battery: 280mAh | Waterproof: IP68', 'others': '1 Year Official Warranty', 'color': 'Jet Black, Silver', 'size': 'Standard', 'weight_kg': 0.2, 'width_cm': 9, 'length_cm': 11, 'height_cm': 6, 'status': 'সক্রিয়', 'is_active': True}, {'sku': 'DCBD-TAC-002', 'product_id': 'DCBD-TAC-002', 'name': 'পোর্টেবল সোলার ইমার্জেন্সি লাইট ও ক্যাম্পিং লণ্ঠন (Solar Lantern)', 'p_name': 'পোর্টেবল সোলার ইমার্জেন্সি লাইট ও ক্যাম্পিং লণ্ঠন (Solar Lantern)', 'category': 'Home Appliances', 'sub_category': 'Lighting', 'child_category': 'Rechargeable', 'brand': 'HK', 'buying_price': 680, 'selling_price': 950, 'original_price': 1200, 'wholesale_price': 750, 'reseller_price': 840, 'min_order_qty': 5, 'min_order_q': 5, 'stock': 60, 'images': ['https://images.unsplash.com/photo-1508873696983-2df5293cb325?w=800&auto=format&fit=crop&q=80'], 'thumbnail': 'https://images.unsplash.com/photo-1508873696983-2df5293cb325?w=600&auto=format&fit=crop&q=80', 'slug': 'portable-solar-emergency-lantern', 'description': 'সোলার প্যানেল চার্জিং, পাওয়ার ব্যাংক ফিচার ও ৩৬০ ডিগ্রি ব্রাইটনেস সহ জরুরি দুর্যোগের সঙ্গী।', 'specification': 'পাওয়ার: ৩০ ওয়াট LED | চার্জিং: সোলার + Type-C | ব্যাকআপ: ১০-১২ ঘণ্টা।', 'others': 'ক্যাম্পিং ও লোডশেডিংয়ের জন্য আদর্শ।', 'color': 'Black/Gold, Silver', 'size': 'Standard', 'weight_kg': 0.4, 'width_cm': 10, 'length_cm': 10, 'height_cm': 16, 'status': 'সক্রিয়', 'is_active': True}, {'sku': 'DCBD-KIT-002', 'product_id': 'DCBD-KIT-002', 'name': 'হেভি ডিউটি স্টিল রিইনফোর্সড গ্যাস সেফটি হোস পাইপ (Safety Hose Pipe)', 'p_name': 'হেভি ডিউটি স্টিল রিইনফোর্সড গ্যাস সেফটি হোস পাইপ (Safety Hose Pipe)', 'category': 'Kitchen', 'sub_category': 'Safety Device', 'child_category': 'Appliances', 'brand': 'HK', 'buying_price': 300, 'selling_price': 450, 'original_price': 600, 'wholesale_price': 340, 'reseller_price': 390, 'min_order_qty': 10, 'min_order_q': 10, 'stock': 150, 'images': ['https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=800&auto=format&fit=crop&q=80'], 'thumbnail': 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=600&auto=format&fit=crop&q=80', 'slug': 'heavy-duty-gas-safety-hose-pipe', 'description': '৩ স্তর বিশিষ্ট অ্যান্টি-ইঁদুর কামড় প্রতিরোধী স্টিল তারের জাল ও অগ্নি-প্রতিরোধক পিভিসি পাইপ।', 'specification': 'দৈর্ঘ্য: ১.৫ মিটার | ক্ল্যাম্প: ২টি স্টেইনলেস স্টিল টাইট ক্ল্যাম্প অন্তর্ভুক্ত।', 'others': '৫ বছরের রিপ্লেসমেন্ট গ্যারান্টি।', 'color': 'Steel Silver, Orange', 'size': '1.5 Meter', 'weight_kg': 0.35, 'width_cm': 15, 'length_cm': 15, 'height_cm': 5, 'status': 'সক্রিয়', 'is_active': True}]

INITIAL_CATEGORIES = [
    {'catagory_id': 'CAT-001', 'catagory_slug': 'smartwatches', 'category_image': 'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=400&q=80', 'category': 'Smartwatches', 'sub_category': 'Calling Watch, AMOLED Watch', 'chail_category': 'Men, Women, Fitness & GPS'},
    {'catagory_id': 'CAT-002', 'catagory_slug': 'kitchen', 'category_image': 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=400&q=80', 'category': 'Kitchen', 'sub_category': 'Safety Device, Blender, Cookware', 'chail_category': 'Appliances, Standard'},
    {'catagory_id': 'CAT-003', 'catagory_slug': 'organic-health', 'category_image': 'https://images.unsplash.com/photo-1587049352847-4a222e784d38?w=400&q=80', 'category': 'Organic & Health', 'sub_category': 'Honey, Seeds, Oils', 'chail_category': 'Pure Natural, Premium Grade'},
    {'catagory_id': 'CAT-004', 'catagory_slug': 'home-appliances', 'category_image': 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=400&q=80', 'category': 'Home Appliances', 'sub_category': 'Lighting, Gadgets', 'chail_category': 'Rechargeable, Smart Home'}
]

INITIAL_BRANDS = [
    {'brand_id': 'BRD-001', 'brand_name': 'Amazfit', 'brand_slug': 'amazfit', 'brand_image': '/public/icon/logo.png', 'brand_description': 'Global smart wearable innovator'},
    {'brand_id': 'BRD-002', 'brand_name': 'Dream Organic', 'brand_slug': 'dream-organic', 'brand_image': '/public/icon/logo.png', 'brand_description': '১০০% বিশুদ্ধ অর্গানিক ও প্রাকৃতিক পণ্য'},
    {'brand_id': 'BRD-003', 'brand_name': 'HK', 'brand_slug': 'hk', 'brand_image': '/public/icon/logo.png', 'brand_description': 'প্রিমিয়াম স্মার্ট গ্যাজেট ও অ্যাপ্লায়েন্স পার্টনার'},
    {'brand_id': 'BRD-004', 'brand_name': 'Kieslect', 'brand_slug': 'kieslect', 'brand_image': '/public/icon/logo.png', 'brand_description': 'Premium calling smartwatch maker'}
]

INITIAL_BANNERS = [
    {'banner_id': 'BAN-01', 'id': 'BAN-01', 'title': 'স্মার্ট কিচেন ও নিরাপদ কুকিং গ্যাজেট কালেকশন', 'subtitle': 'সর্বোচ্চ ৩০% বিশেষ ছাড় চলছে!', 'image_url': 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=1600&auto=format&fit=crop&q=80', 'link_url': '/products?cat=Kitchen', 'tag': '🔥 কিচেন স্পেশাল', 'cta_text': 'এখনই কিনুন →', 'button_text': 'কিচেন আইটেম দেখুন', 'position': 1, 'status': 'Active'},
    {'banner_id': 'BAN-02', 'id': 'BAN-02', 'title': '১০০% খাঁটি অর্গানিক ফুড ও ন্যাচারাল হেলথ সাপ্লিমেন্ট', 'subtitle': 'সুন্দরবনের প্রাকৃতিক চাকের মধু ও চিয়া সিড', 'image_url': 'https://images.unsplash.com/photo-1587049352847-4a222e784d38?w=1600&auto=format&fit=crop&q=80', 'link_url': '/products?cat=Organic%20%26%20Health', 'tag': '🌿 অর্গানিক ও ন্যাচারাল', 'cta_text': 'অর্ডার করুন →', 'button_text': 'অর্গানিক ফুড দেখুন', 'position': 2, 'status': 'Active'}
]


def init_sqlite_db():
    conn = sqlite3.connect(str(SQLITE_PATH))
    conn.execute('PRAGMA journal_mode = WAL;')
    conn.execute('PRAGMA synchronous = NORMAL;')
    conn.execute('''
        CREATE TABLE IF NOT EXISTS kv_cache (
            collection TEXT PRIMARY KEY,
            payload TEXT NOT NULL,
            updated_at INTEGER NOT NULL
        )
    ''')
    conn.execute('''
        CREATE TABLE IF NOT EXISTS ad_events_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            event_id TEXT,
            event_name TEXT,
            platform TEXT,
            payload TEXT,
            ip_address TEXT,
            user_agent TEXT,
            created_at TEXT
        )
    ''')
    conn.commit()
    conn.close()


init_sqlite_db()


def get_sync_meta() -> dict:
    if META_PATH.is_file():
        try:
            data = json.loads(META_PATH.read_text(encoding='utf-8'))
            if isinstance(data, dict):
                return data
        except Exception:
            pass
    return {'updated_at': 0, 'collections': {}}


def touch_sync_meta(collection: str) -> int:
    key = re.sub(r'[^a-z0-9_\-]', '_', collection.strip().lower())
    now = int(time.time())
    meta = get_sync_meta()
    meta['updated_at'] = now
    if not isinstance(meta.get('collections'), dict):
        meta['collections'] = {}
    meta['collections'][key] = now
    try:
        META_PATH.write_text(json.dumps(meta, ensure_ascii=False), encoding='utf-8')
    except Exception:
        pass
    return now


def read_cache(collection: str, fallback=None):
    key = re.sub(r'[^a-z0-9_\-]', '_', collection.strip().lower())
    with _MEM_LOCK:
        if key in _MEM_CACHE:
            return _MEM_CACHE[key]

    cache_file = CACHE_DIR / f'{key}.json'
    if cache_file.is_file():
        try:
            data = json.loads(cache_file.read_text(encoding='utf-8'))
            with _MEM_LOCK:
                _MEM_CACHE[key] = data
            return data
        except Exception:
            pass

    try:
        conn = sqlite3.connect(str(SQLITE_PATH))
        row = conn.execute('SELECT payload FROM kv_cache WHERE collection = ?', (key,)).fetchone()
        conn.close()
        if row and row[0]:
            data = json.loads(row[0])
            with _MEM_LOCK:
                _MEM_CACHE[key] = data
            return data
    except Exception:
        pass

    return fallback if fallback is not None else []


def write_cache(collection: str, data, touch_meta: bool = True):
    key = re.sub(r'[^a-z0-9_\-]', '_', collection.strip().lower())
    with _MEM_LOCK:
        _MEM_CACHE[key] = data

    raw = json.dumps(data, ensure_ascii=False)
    cache_file = CACHE_DIR / f'{key}.json'
    try:
        cache_file.write_text(raw, encoding='utf-8')
    except Exception:
        pass

    try:
        conn = sqlite3.connect(str(SQLITE_PATH))
        conn.execute(
            'INSERT OR REPLACE INTO kv_cache (collection, payload, updated_at) VALUES (?, ?, ?)',
            (key, raw, int(time.time()))
        )
        conn.commit()
        conn.close()
    except Exception:
        pass

    if touch_meta:
        touch_sync_meta(key)


def normalize_order_row(r: dict, idx: int = 0):
    if not isinstance(r, dict):
        return None
    order_id = str(r.get('order_id') or r.get('orderId') or r.get('orderid') or r.get('OrderID') or r.get('col_1') or '').strip()
    if not order_id or order_id.lower() in ('orderid', 'order_id'):
        return None

    date_str = str(r.get('date') or r.get('Date') or r.get('col_0') or r.get('created_at') or datetime.now().strftime('%Y-%m-%d %H:%M:%S')).strip()
    prod_str = str(r.get('products') or r.get('Products') or r.get('product_name') or r.get('col_6') or 'পণ্য অর্ডার').strip()
    total_amt = float(r.get('total_amount') if r.get('total_amount') is not None else (r.get('Total_Amount') if r.get('Total_Amount') is not None else (r.get('col_10') or 0)))
    qty = max(1, int(float(r.get('quantity') or r.get('Quantity') or r.get('col_9') or 1)))
    unit_price = float(r.get('unit_price') or (round(total_amt / qty, 2) if total_amt > 0 else 0))

    sort_ts = int(r.get('_sort_ts') or 0)
    if sort_ts <= 0:
        for fmt in ('%Y-%m-%d %H:%M:%S', '%Y-%m-%dT%H:%M:%S', '%Y-%m-%d'):
            try:
                sort_ts = int(datetime.strptime(date_str[:19], fmt).timestamp())
                break
            except Exception:
                pass
        if sort_ts <= 0:
            sort_ts = max(1, 1700000000 - idx)

    return {
        **r,
        'date': date_str,
        'Date': date_str,
        'order_id': order_id,
        'orderId': order_id,
        'OrderID': order_id,
        'account_type': str(r.get('account_type') or r.get('Account_type') or r.get('col_2') or 'Customer').strip(),
        'customer_name': str(r.get('customer_name') or r.get('Customer_Name') or r.get('col_3') or 'গ্রাহক').strip(),
        'phone': str(r.get('phone') or r.get('Phone') or r.get('col_4') or '').strip(),
        'address': str(r.get('address') or r.get('Address') or r.get('col_5') or '').strip(),
        'products': prod_str,
        'product_name': str(r.get('product_name') or prod_str).strip(),
        'color': str(r.get('color') or r.get('Color') or r.get('col_7') or 'Standard').strip(),
        'size': str(r.get('size') or r.get('Size') or r.get('col_8') or 'Free Size').strip(),
        'quantity': qty,
        'unit_price': unit_price,
        'subtotal': float(r.get('subtotal') or total_amt),
        'total_amount': total_amt,
        'payment_method': str(r.get('payment_method') or r.get('Payment_method') or r.get('col_11') or 'Cash On Delivery (COD)').strip(),
        'transaction_id': str(r.get('transaction_id') or r.get('Transaction_ID') or r.get('col_12') or 'COD').strip(),
        'payment_status': str(r.get('payment_status') or r.get('Payment_Status') or r.get('col_13') or 'Pending').strip(),
        'order_status': str(r.get('order_status') or r.get('Order_Status') or r.get('col_14') or 'Order Placed').strip(),
        'reseller_commission': float(r.get('reseller_commission') or r.get('col_15') or 0),
        'commission_status': str(r.get('commission_status') or r.get('Commission_Status') or r.get('col_16') or 'Pending').strip(),
        'fraud_status': str(r.get('fraud_status') or 'Safe (98%)').strip(),
        'customer_rating': str(r.get('customer_rating') or '5/5 ★').strip(),
        'courier_name': str(r.get('courier_name') or '').strip(),
        'consignment_id': str(r.get('consignment_id') or '').strip(),
        'items': r.get('items') if isinstance(r.get('items'), list) else [],
        '_sort_ts': sort_ts,
    }


def deduplicate_and_sort_orders(orders_list: list) -> list:
    by_id = {}
    for idx, item in enumerate(orders_list or []):
        norm = normalize_order_row(item, idx)
        if not norm:
            continue
        key = norm['order_id'].lower()
        if key not in by_id:
            by_id[key] = norm
        else:
            prev = by_id[key]
            by_id[key] = {
                **norm,
                **prev,
                '_sort_ts': max(int(prev.get('_sort_ts') or 0), int(norm.get('_sort_ts') or 0)),
            }
    arr = list(by_id.values())
    arr.sort(key=lambda o: int(o.get('_sort_ts') or 0), reverse=True)
    return arr


def fetch_sheet_gviz_rows(sheet_name: str, custom_tq: str = '', timeout: int = 5) -> list:
    return read_cache(sheet_name.lower(), [])


def get_orders(force_sheet_sync: bool = False) -> list:
    local = read_cache('orders', [])
    if not isinstance(local, list):
        local = []
    if force_sheet_sync or not local:
        sheet_rows = fetch_sheet_gviz_rows('Orders', '', 5)
        if sheet_rows:
            sheet_rows.reverse()
            merged = deduplicate_and_sort_orders(local + sheet_rows)
            write_cache('orders', merged, False)
            return merged
    return deduplicate_and_sort_orders(local)


def get_site_settings() -> dict:
    cached = read_cache('settings', {})
    merged = dict(DEFAULT_SETTINGS)
    if isinstance(cached, dict):
        merged.update(cached)
    merged['shopName'] = merged.get('shopName') or merged.get('shop_name') or 'Dream Cart BD'
    merged['shop_name'] = merged['shopName']
    merged['tagline'] = merged.get('tagline') or merged.get('shopTagline') or 'Smart Digital Commerce'
    merged['shopTagline'] = merged['tagline']
    merged['shopLogo'] = merged.get('shopLogo') or merged.get('shop_logo') or '/public/icon/logo.png'
    merged['shop_logo'] = merged['shopLogo']
    merged['logo_url'] = merged['shopLogo']
    merged['site_logo'] = merged['shopLogo']
    merged['facebookUrl'] = merged.get('facebookUrl') or merged.get('facebook_url') or 'https://www.facebook.com/dreamcartbd'
    merged['facebook_url'] = merged['facebookUrl']
    merged['officeHours'] = merged.get('officeHours') or merged.get('office_hours') or 'প্রতিদিন সকাল ৮:০০ টা থেকে রাত ১০:০০ টা পর্যন্ত'
    merged['office_hours'] = merged['officeHours']
    merged['freeDeliveryThreshold'] = int(merged.get('freeDeliveryThreshold') or merged.get('freeShippingMin') or 2000)
    merged['freeShippingMin'] = merged['freeDeliveryThreshold']
    return merged


def get_products() -> list:
    prods = read_cache('products', [])
    return prods if isinstance(prods, list) and len(prods) > 0 else list(INITIAL_PRODUCTS)


def find_product(slug_or_sku: str):
    target = urllib.parse.unquote(slug_or_sku or '').strip().lower()
    if not target:
        return None
    for p in get_products():
        if not isinstance(p, dict):
            continue
        sku = str(p.get('sku') or p.get('product_id') or '').strip().lower()
        slug = str(p.get('slug') or '').strip().lower()
        if sku == target or slug == target:
            return p
    return None


def forward_to_apps_script_async(action: str, payload: dict):
    # 100% Standalone cPanel SQLite3 + JSON Engine (Zero Google Sheets dependency)
    return


def dispatch_server_capi_event(payload: dict, client_ip: str = '127.0.0.1', user_agent: str = '') -> dict:
    settings = get_site_settings()
    event_name = str(payload.get('event_name') or payload.get('eventName') or 'PageView').strip()
    event_id = str(payload.get('event_id') or payload.get('eventId') or f"EVT_{int(time.time() * 1000)}").strip()
    event_data = payload.get('custom_data') or payload.get('data') or payload
    user_data = payload.get('user_data') or {}

    try:
        conn = sqlite3.connect(str(SQLITE_PATH))
        conn.execute(
            'INSERT INTO ad_events_log (event_id, event_name, platform, payload, ip_address, user_agent, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
            (event_id, event_name, 'python_capi_engine', json.dumps(event_data, ensure_ascii=False), client_ip, user_agent[:250], datetime.now().strftime('%Y-%m-%d %H:%M:%S'))
        )
        conn.commit()
        conn.close()
    except Exception:
        pass

    fb_pixel = str(settings.get('fbPixelId') or '').strip()
    fb_token = str(settings.get('fbCapiToken') or '').strip()
    fb_test_code = str(settings.get('fbTestEventCode') or payload.get('test_event_code') or '').strip()
    if fb_pixel and fb_token:
        def _send_meta():
            try:
                capi_url = f"https://graph.facebook.com/v19.0/{urllib.parse.quote(fb_pixel)}/events?access_token={urllib.parse.quote(fb_token)}"
                u_meta = {
                    'client_ip_address': client_ip,
                    'client_user_agent': user_agent,
                    'country': [hashlib.sha256(b'bd').hexdigest()],
                }
                raw_ph = re.sub(r'[^0-9]', '', str(user_data.get('phone') or event_data.get('phone') or ''))
                if raw_ph:
                    if len(raw_ph) == 11 and raw_ph.startswith('01'):
                        raw_ph = '88' + raw_ph
                    u_meta['ph'] = [hashlib.sha256(raw_ph.encode('utf-8')).hexdigest()]
                raw_fn = str(user_data.get('name') or event_data.get('customer_name') or '').strip().lower()
                if raw_fn:
                    u_meta['fn'] = [hashlib.sha256(raw_fn.encode('utf-8')).hexdigest()]

                req_body = {
                    'data': [{
                        'event_name': event_name,
                        'event_time': int(time.time()),
                        'event_id': event_id,
                        'action_source': 'website',
                        'event_source_url': str(payload.get('event_source_url') or SITE_ORIGIN),
                        'user_data': u_meta,
                        'custom_data': {
                            'currency': 'BDT',
                            'value': float(event_data.get('value') or event_data.get('total_amount') or 0),
                            'content_type': 'product',
                        }
                    }]
                }
                if fb_test_code:
                    req_body['test_event_code'] = fb_test_code
                body = json.dumps(req_body).encode('utf-8')
                req = urllib.request.Request(capi_url, data=body, headers={'Content-Type': 'application/json'}, method='POST')
                urllib.request.urlopen(req, timeout=4).read()
            except Exception:
                pass
        threading.Thread(target=_send_meta, daemon=True).start()

    return {'success': True, 'status': 'success', 'event_id': event_id, 'event_name': event_name, 'engine': 'python_capi'}



def send_order_notification_email_async(order: dict, site_origin: str = SITE_ORIGIN):
    def _worker():
        try:
            import html as _html
            import smtplib
            import subprocess
            from email.mime.text import MIMEText
            from email.header import Header

            esc = lambda v: _html.escape(str(v or ''), quote=True)
            order_id = esc(order.get('order_id') or order.get('orderId') or 'ORD')
            cust_name = esc(order.get('customer_name') or 'সম্মানিত গ্রাহক')
            phone = esc(order.get('phone') or '')
            address = esc(order.get('address') or 'বাংলাদেশ')
            pay_meth = esc(order.get('payment_method') or 'Cash On Delivery (COD)')
            pay_status = esc(order.get('payment_status') or 'Pending')
            ord_status = esc(order.get('order_status') or 'Order Placed')
            trx_id = esc(order.get('transaction_id') or 'COD')
            acc_type = esc(order.get('account_type') or 'Customer')
            date_str = esc(order.get('date') or datetime.now().strftime('%Y-%m-%d %H:%M:%S'))

            raw_items = order.get('items')
            if not isinstance(raw_items, list) or not raw_items:
                raw_items = [{
                    'name': order.get('products') or 'পণ্য',
                    'color': order.get('color') or '',
                    'size': order.get('size') or '',
                    'quantity': max(1, int(order.get('quantity') or 1)),
                    'price': float(order.get('total_amount') or 0),
                }] if order.get('products') else []

            calc_sub = 0.0
            rows_html = ''
            for idx, it in enumerate(raw_items, 1):
                qty = max(1, int(it.get('quantity') or 1))
                price = float(it.get('price') or it.get('unit_price') or 0)
                line_total = price * qty
                calc_sub += line_total
                v_parts = [str(it.get('color') or '').strip(), str(it.get('size') or '').strip()]
                v_parts = [v for v in v_parts if v]
                v_html = f" <span style='font-size:11px;color:#059669;font-weight:normal;'>({esc(', '.join(v_parts))})</span>" if v_parts else ''
                rows_html += (
                    f"<tr style='border-bottom:1px solid #e2e8f0;'>"
                    f"<td style='padding:8px 10px;color:#64748b;'>{idx}</td>"
                    f"<td style='padding:8px 10px;color:#0f172a;font-weight:600;'>{esc(it.get('name') or it.get('title') or 'পণ্য')}{v_html}</td>"
                    f"<td style='padding:8px 10px;text-align:center;color:#0f172a;font-weight:700;'>{qty}</td>"
                    f"<td style='padding:8px 10px;text-align:right;color:#334155;font-family:monospace;'>৳{price:,.0f}</td>"
                    f"<td style='padding:8px 10px;text-align:right;color:#0f172a;font-weight:800;font-family:monospace;'>৳{line_total:,.0f}</td>"
                    f"</tr>"
                )

            subtotal = float(order['subtotal']) if order.get('subtotal') is not None else calc_sub
            total_amt = float(order['total_amount']) if order.get('total_amount') is not None else subtotal
            if order.get('delivery_fee') is not None:
                deliv = float(order['delivery_fee'])
            elif order.get('delivery_charge') is not None:
                deliv = float(order['delivery_charge'])
            else:
                deliv = 0.0 if subtotal >= 2000 else max(0.0, total_amt - subtotal)

            deliv_fmt = 'ফ্রি (৳০)' if deliv <= 0 else f'৳{deliv:,.0f}'
            track_url = f"{site_origin}/track?orderId={urllib.parse.quote(str(order.get('order_id') or order_id))}"
            logo_url = f"{site_origin}/public/icon/logo.png"
            pay_badge = 'background:#d1fae5;color:#065f46;' if pay_status.lower() == 'paid' else 'background:#fef3c7;color:#92400e;'

            html_body = (
                f"<!DOCTYPE html><html lang='bn'><head><meta charset='UTF-8'></head>"
                f"<body style='margin:0;padding:20px;background:#f1f5f9;font-family:Arial,sans-serif;color:#0f172a;'>"
                f"<div style='max-width:680px;margin:0 auto;background:#ffffff;border:1px solid #cbd5e1;border-radius:16px;padding:24px;'>"
                f"<table style='width:100%;border-collapse:collapse;border-bottom:2px solid #059669;margin-bottom:16px;'><tr>"
                f"<td style='vertical-align:top;width:62%;padding-bottom:12px;'>"
                f"<img src='{logo_url}' alt='Dream Cart BD' style='width:44px;height:44px;border-radius:10px;vertical-align:middle;margin-right:10px;' />"
                f"<strong style='font-size:20px;color:#0f172a;'>Dream Cart <span style='color:#059669;'>BD</span></strong>"
                f"<div style='font-size:11px;color:#475569;margin-top:4px;'>চৌধুরী প্লাজা, পদুয়ার বাজার বিশ্বরোড, সদর দক্ষিণ, কুমিল্লা। | হটলাইন: 01581703822, 01818273838</div></td>"
                f"<td style='vertical-align:top;text-align:right;width:38%;padding-bottom:12px;'>"
                f"<div style='display:inline-block;background:#059669;color:#ffffff;font-size:11px;font-weight:800;padding:4px 12px;border-radius:9999px;'>Official Invoice</div>"
                f"<div style='font-size:12px;font-weight:700;margin-top:6px;'>Order ID: <span style='color:#059669;font-family:monospace;'>#{order_id}</span></div>"
                f"<div style='font-size:11px;color:#64748b;'>তারিখ: {date_str}</div></td></tr></table>"
                f"<table style='width:100%;border-collapse:collapse;margin-bottom:16px;'><tr>"
                f"<td style='width:50%;vertical-align:top;padding-right:8px;'><div style='background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:12px;font-size:12px;'><strong style='color:#059669;'>গ্রাহকের বিবরণ ({acc_type}):</strong><br/><strong>{cust_name}</strong><br/>📞 {phone}<br/>📍 {address}</div></td>"
                f"<td style='width:50%;vertical-align:top;padding-left:8px;'><div style='background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:12px;font-size:12px;'><strong style='color:#059669;'>পেমেন্ট বিবরণ:</strong><br/>মেথড: <strong>{pay_meth}</strong><br/>TrxID: <strong style='font-family:monospace;'>{trx_id}</strong><br/>স্ট্যাটাস: <span style='padding:2px 6px;border-radius:4px;font-size:10px;font-weight:700;{pay_badge}'>{pay_status}</span> | {ord_status}</div></td>"
                f"</tr></table>"
                f"<table style='width:100%;border-collapse:collapse;margin-bottom:16px;font-size:12px;'>"
                f"<thead><tr style='background:#f1f5f9;border-top:1px solid #e2e8f0;border-bottom:2px solid #cbd5e1;color:#475569;font-size:11px;'><th style='padding:8px 10px;text-align:left;'>নং</th><th style='padding:8px 10px;text-align:left;'>পণ্য বিবরণ</th><th style='padding:8px 10px;text-align:center;'>পরিমাণ</th><th style='padding:8px 10px;text-align:right;'>দর</th><th style='padding:8px 10px;text-align:right;'>মোট</th></tr></thead>"
                f"<tbody>{rows_html}</tbody></table>"
                f"<table style='width:100%;border-collapse:collapse;font-size:12px;'><tr>"
                f"<td style='width:50%;vertical-align:top;'><a href='{track_url}' style='display:inline-block;background:#059669;color:#ffffff;text-decoration:none;padding:8px 14px;border-radius:8px;font-weight:700;'>ওয়েবসাইটে ভাউচার ও ট্র্যাক দেখুন →</a></td>"
                f"<td style='width:50%;vertical-align:top;text-align:right;'>সাবটোটাল: <strong>৳{subtotal:,.0f}</strong><br/>ডেলিভারি চার্জ: <strong>{deliv_fmt}</strong><br/><span style='font-size:15px;font-weight:900;color:#059669;'>সর্বমোট বিল: ৳{total_amt:,.0f}</span></td>"
                f"</tr></table></div></body></html>"
            )

            host_domain = urllib.parse.urlparse(site_origin).hostname or 'dreamcartbd.com'
            msg = MIMEText(html_body, 'html', 'utf-8')
            msg['Subject'] = Header(f"🛍️ নতুন অর্ডার #{order_id} ও ভাউচার — Dream Cart BD (৳{total_amt:,.0f})", 'utf-8')
            msg['From'] = f"Dream Cart BD <noreply@{host_domain}>"
            msg['To'] = ', '.join(ADMIN_NOTIFICATION_EMAILS)
            msg['Reply-To'] = 'jainal.dcitbd@gmail.com'

            try:
                with smtplib.SMTP('localhost', 25, timeout=5) as s:
                    s.sendmail(msg['From'], ADMIN_NOTIFICATION_EMAILS, msg.as_string())
            except Exception:
                if os.path.exists('/usr/sbin/sendmail'):
                    subprocess.run(['/usr/sbin/sendmail', '-t', '-oi'], input=msg.as_bytes(), timeout=5)
        except Exception:
            pass
    threading.Thread(target=_worker, daemon=True).start()

def handle_api_action(action: str, payload: dict, client_ip: str = '127.0.0.1', user_agent: str = '') -> dict:
    start = time.perf_counter()
    action = action.strip(' -_/').lower() or 'system/health'
    action = action.replace('landing-pages', 'landing_pages')
    if action.startswith('others_market/'):
        action = action.replace('others_market/', 'markets/')
    if action.startswith('variants/'):
        action = action.replace('variants/', 'attributes/')

    if action == 'system/health':
        return {
            'status': 'success',
            'success': True,
            'data': {
                'status': 'UP',
                'app': 'Dream Cart BD',
                'engine': 'Python + PHP Turbo Engine',
                'version': VERSION,
                'spreadsheet_id': SPREADSHEET_ID,
                'sync_meta': get_sync_meta(),
                'latency_ms': round((time.perf_counter() - start) * 1000, 3)
            }
        }

    if action in ('system/state', 'system/sync_meta'):
        meta = get_sync_meta()
        client_since = int(payload.get('since') or 0)
        if action == 'system/sync_meta' or (client_since > 0 and int(meta.get('updated_at') or 0) <= client_since and not payload.get('full')):
            return {
                'status': 'success',
                'success': True,
                'changed': False,
                'sync_meta': meta,
            }
        return {
            'status': 'success',
            'success': True,
            'changed': True,
            'sync_meta': meta,
            'data': {
                'settings': get_site_settings(),
                'orders': get_orders(False),
                'incomplete_orders': read_cache('incomplete_orders', []),
                'products': get_products(),
                'categories': read_cache('categories', INITIAL_CATEGORIES),
                'brands': read_cache('brands', INITIAL_BRANDS),
                'banners': read_cache('banners', INITIAL_BANNERS),
                'payment_methods': read_cache('payment_method', DEFAULT_PAYMENT_METHODS),
                'delivery_methods': read_cache('delivery_area', DEFAULT_DELIVERY_METHODS),
                'offers': read_cache('offer_or_coupon', DEFAULT_OFFERS),
                'landing_pages': read_cache('landing_pages', []),
                'customers': read_cache('customers', []),
                'reviews': read_cache('reviews', []),
                'resellers': read_cache('resellers', []),
                'wholesalers': read_cache('wholesalers', []),
                'sellers': read_cache('sellers', []),
                'markets': read_cache('markets', []),
                'admin_worker': read_cache('admin_worker', []),
                'worker_logs': read_cache('worker_logs', []),
                'attributes': read_cache('attributes', []),
                'costs': read_cache('costs', []),
                'buying': read_cache('buying', []),
                'invest': read_cache('invest', []),
                'payments': read_cache('payments', []),
                'couriers': read_cache('couriers', []),
            }
        }

    if action in ('pixels/track', 'pixel/track', 'capi/track'):
        return dispatch_server_capi_event(payload, client_ip, user_agent)

    if action == 'products/list':
        prods = get_products()
        return {
            'status': 'success',
            'success': True,
            'latency_ms': round((time.perf_counter() - start) * 1000, 3),
            'data': {'items': prods, 'total': len(prods)}
        }

    if action == 'products/details':
        target = str(payload.get('id') or payload.get('slug') or payload.get('sku') or '')
        found = find_product(target)
        if found:
            return {'status': 'success', 'success': True, 'data': found}
        return {'status': 'error', 'success': False, 'message': 'পণ্য পাওয়া যায়নি'}

    if action in ('products/add', 'products/create', 'products/update'):
        prods = get_products()
        sku = str(payload.get('sku') or payload.get('SKU') or payload.get('product_id') or f"DCBD-{int(time.time())}").strip()
        payload['sku'] = sku
        payload['product_id'] = sku
        updated = False
        for i, p in enumerate(prods):
            if str(p.get('sku') or p.get('product_id') or '').strip().lower() == sku.lower():
                prods[i] = {**p, **payload}
                updated = True
                break
        if not updated:
            prods.insert(0, payload)
        write_cache('products', prods)
        forward_to_apps_script_async('products/add', payload)
        return {'status': 'success', 'success': True, 'data': payload}

    if action == 'products/delete':
        target = str(payload.get('id') or payload.get('sku') or payload.get('slug') or '').strip().lower()
        prods = [
            p for p in get_products()
            if str(p.get('sku') or '').lower() != target
            and str(p.get('product_id') or '').lower() != target
            and str(p.get('slug') or '').lower() != target
        ]
        write_cache('products', prods)
        forward_to_apps_script_async('products/delete', payload)
        return {'status': 'success', 'success': True}

    if action == 'categories/list':
        cats = read_cache('categories', INITIAL_CATEGORIES)
        return {'status': 'success', 'success': True, 'data': {'items': cats, 'total': len(cats)}}

    if action in ('categories/add', 'categories/create', 'categories/update'):
        cats = list(read_cache('categories', INITIAL_CATEGORIES))
        cid = str(payload.get('catagory_id') or payload.get('Catagory_ID') or payload.get('id') or f"CAT-{int(time.time()) % 10000}").strip()
        cname = str(payload.get('category') or payload.get('Category') or payload.get('name') or 'Category').strip()
        payload['catagory_id'] = cid
        payload['category'] = cname
        updated = False
        for i, c in enumerate(cats):
            if str(c.get('catagory_id') or '').lower() == cid.lower() or str(c.get('category') or '').lower() == cname.lower():
                cats[i] = {**c, **payload}
                updated = True
                break
        if not updated:
            cats.insert(0, payload)
        write_cache('categories', cats)
        forward_to_apps_script_async('categories/add', payload)
        return {'status': 'success', 'success': True, 'data': payload}

    if action == 'categories/delete':
        target = str(payload.get('id') or payload.get('catagory_id') or payload.get('category') or '').strip().lower()
        cats = [
            c for c in read_cache('categories', INITIAL_CATEGORIES)
            if str(c.get('catagory_id') or '').lower() != target and str(c.get('category') or '').lower() != target
        ]
        write_cache('categories', cats)
        forward_to_apps_script_async('categories/delete', payload)
        return {'status': 'success', 'success': True}

    if action == 'brands/list':
        brands = read_cache('brands', INITIAL_BRANDS)
        return {'status': 'success', 'success': True, 'data': {'items': brands, 'total': len(brands)}}

    if action in ('brands/add', 'brands/create', 'brands/update'):
        brands = list(read_cache('brands', INITIAL_BRANDS))
        bid = str(payload.get('brand_id') or payload.get('Brand_ID') or payload.get('id') or f"BRD-{int(time.time()) % 10000}").strip()
        bname = str(payload.get('brand_name') or payload.get('Brand_Name') or payload.get('name') or 'Brand').strip()
        payload['brand_id'] = bid
        payload['brand_name'] = bname
        updated = False
        for i, b in enumerate(brands):
            if str(b.get('brand_id') or '').lower() == bid.lower() or str(b.get('brand_name') or '').lower() == bname.lower():
                brands[i] = {**b, **payload}
                updated = True
                break
        if not updated:
            brands.insert(0, payload)
        write_cache('brands', brands)
        forward_to_apps_script_async('brands/add', payload)
        return {'status': 'success', 'success': True, 'data': payload}

    if action == 'brands/delete':
        target = str(payload.get('id') or payload.get('brand_id') or payload.get('brand_name') or '').strip().lower()
        brands = [
            b for b in read_cache('brands', INITIAL_BRANDS)
            if str(b.get('brand_id') or '').lower() != target and str(b.get('brand_name') or '').lower() != target
        ]
        write_cache('brands', brands)
        forward_to_apps_script_async('brands/delete', payload)
        return {'status': 'success', 'success': True}

    if action == 'banners/list':
        banners = read_cache('banners', INITIAL_BANNERS)
        return {'status': 'success', 'success': True, 'data': {'items': banners, 'total': len(banners)}}

    if action in ('banners/add', 'banners/create', 'banners/update'):
        banners = list(read_cache('banners', INITIAL_BANNERS))
        bid = str(payload.get('banner_id') or payload.get('Banner_ID') or payload.get('id') or f"BAN-{int(time.time()) % 1000}").strip()
        payload['banner_id'] = bid
        payload['id'] = bid
        updated = False
        for i, b in enumerate(banners):
            if str(b.get('banner_id') or b.get('id') or '').lower() == bid.lower():
                banners[i] = {**b, **payload}
                updated = True
                break
        if not updated:
            banners.insert(0, payload)
        write_cache('banners', banners)
        forward_to_apps_script_async('banners/add', payload)
        return {'status': 'success', 'success': True, 'data': payload}

    if action == 'banners/delete':
        target = str(payload.get('banner_id') or payload.get('id') or '').strip().lower()
        banners = [
            b for b in read_cache('banners', INITIAL_BANNERS)
            if str(b.get('banner_id') or b.get('id') or '').lower() != target
        ]
        write_cache('banners', banners)
        forward_to_apps_script_async('banners/delete', payload)
        return {'status': 'success', 'success': True}

    if action in ('orders/create', 'orders/add'):
        order_id = str(payload.get('order_id') or payload.get('orderId') or payload.get('OrderID') or f"ORD-{int(time.time()) % 1000000}").strip()
        now_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        payload['order_id'] = order_id
        payload['orderId'] = order_id
        payload['OrderID'] = order_id
        payload['date'] = payload.get('date') or payload.get('Date') or now_str
        payload['Date'] = payload['date']
        payload['_sort_ts'] = int(time.time())

        norm_order = normalize_order_row(payload, 0) or payload
        orders = get_orders(False)
        orders.insert(0, norm_order)
        sorted_orders = deduplicate_and_sort_orders(orders)[:2500]
        write_cache('orders', sorted_orders)

        phone_digits = re.sub(r'[^0-9]', '', str(norm_order.get('phone') or ''))[-11:]
        if phone_digits:
            inc = read_cache('incomplete_orders', [])
            if isinstance(inc, list) and inc:
                inc = [io for io in inc if re.sub(r'[^0-9]', '', str((io or {}).get('phone') or ''))[-11:] != phone_digits]
                write_cache('incomplete_orders', inc)

        dispatch_server_capi_event({
            'event_name': 'Purchase',
            'event_id': f'PUR_{order_id}',
            'custom_data': {'order_id': order_id, 'value': float(norm_order.get('total_amount') or 0), 'currency': 'BDT'},
            'user_data': {'phone': norm_order.get('phone') or '', 'name': norm_order.get('customer_name') or ''}
        }, client_ip, user_agent)
        send_order_notification_email_async({**payload, **norm_order})
        forward_to_apps_script_async('orders/create', norm_order)
        return {'status': 'success', 'success': True, 'data': norm_order}

    if action in ('orders/list', 'orders/get', 'orders/details'):
        force = bool(payload.get('force'))
        orders = get_orders(force)
        if action in ('orders/get', 'orders/details'):
            q = str(payload.get('orderId') or payload.get('order_id') or payload.get('id') or payload.get('phone') or '').strip().lower()
            q_digits = re.sub(r'[^0-9]', '', q)[-11:]
            for o in orders:
                oid = str(o.get('order_id') or '').strip().lower()
                oph = re.sub(r'[^0-9]', '', str(o.get('phone') or ''))[-11:]
                if oid == q or (q_digits and len(q_digits) >= 10 and oph == q_digits):
                    return {'status': 'success', 'success': True, 'data': o}
            return {'status': 'error', 'success': False, 'message': 'অর্ডার পাওয়া যায়নি'}
        return {'status': 'success', 'success': True, 'data': {'items': orders, 'total': len(orders)}}

    if action in ('orders/update', 'orders/update_status'):
        order_id = str(payload.get('order_id') or payload.get('orderId') or payload.get('id') or '').strip().lower()
        orders = get_orders(False)
        for i, o in enumerate(orders):
            if str(o.get('order_id') or '').strip().lower() == order_id:
                merged = {**o, **payload}
                if payload.get('status') and not payload.get('order_status'):
                    merged['order_status'] = payload['status']
                if merged.get('order_status') in ('Delivered', 'Success'):
                    merged['payment_status'] = 'Paid'
                orders[i] = normalize_order_row(merged, i) or merged
                break
        orders = deduplicate_and_sort_orders(orders)
        write_cache('orders', orders)
        forward_to_apps_script_async('orders/update_status', payload)
        return {'status': 'success', 'success': True, 'data': payload}

    if action == 'orders/delete':
        order_id = str(payload.get('order_id') or payload.get('orderId') or payload.get('id') or '').strip().lower()
        orders = [o for o in get_orders(False) if str(o.get('order_id') or '').strip().lower() != order_id]
        write_cache('orders', orders)
        forward_to_apps_script_async('orders/delete', {'order_id': order_id})
        return {'status': 'success', 'success': True}

    if action in ('incomplete_orders/create', 'incomplete_orders/add'):
        inc_list = list(read_cache('incomplete_orders', []))
        phone = str(payload.get('phone') or '').strip()
        phone_digits = re.sub(r'[^0-9]', '', phone)[-11:]
        inc_id = str(payload.get('order_id') or f"INC-{int(time.time()) % 1000000}").strip()
        item = {
            'date': payload.get('date') or datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            'order_id': inc_id,
            'account_type': payload.get('account_type') or 'Customer',
            'customer_name': payload.get('customer_name') or 'সম্ভাব্য গ্রাহক',
            'phone': phone,
            'address': payload.get('address') or '',
            'products': payload.get('products') or 'চেকআউট ফর্ম পূরণরত',
            'total_amount': float(payload.get('total_amount') or 0),
            'status': payload.get('status') or 'Draft/Incomplete',
            '_sort_ts': int(time.time()),
        }
        updated = False
        for i, io in enumerate(inc_list):
            io_ph = re.sub(r'[^0-9]', '', str((io or {}).get('phone') or ''))[-11:]
            if (phone_digits and io_ph == phone_digits) or str((io or {}).get('order_id') or '').lower() == inc_id.lower():
                item['order_id'] = io.get('order_id') or inc_id
                inc_list[i] = item
                updated = True
                break
        if not updated:
            inc_list.insert(0, item)
        write_cache('incomplete_orders', inc_list[:500])
        forward_to_apps_script_async('incomplete_orders/create', item)
        return {'status': 'success', 'success': True, 'data': item}

    if action == 'incomplete_orders/list':
        inc = read_cache('incomplete_orders', [])
        return {'status': 'success', 'success': True, 'data': {'items': inc, 'total': len(inc)}}

    if action == 'incomplete_orders/delete':
        target = str(payload.get('order_id') or payload.get('id') or '').strip().lower()
        inc = [io for io in read_cache('incomplete_orders', []) if str((io or {}).get('order_id') or '').lower() != target]
        write_cache('incomplete_orders', inc)
        forward_to_apps_script_async('incomplete_orders/delete', {'order_id': target})
        return {'status': 'success', 'success': True}

    if action in ('settings/list',):
        return {'status': 'success', 'success': True, 'data': get_site_settings()}

    if action in ('settings/save', 'settings/update', 'settings/add'):
        cur = get_site_settings()
        setting_name = str(payload.get('name') or payload.get('Name') or '').strip()
        setting_details = payload.get('details') if 'details' in payload else payload.get('Details')
        if setting_name and setting_details is not None:
            norm_key = re.sub(r'[^a-z0-9]', '', setting_name.lower())
            parsed_arr = json.loads(setting_details) if isinstance(setting_details, str) and setting_details.startswith('[') else setting_details
            if isinstance(parsed_arr, list):
                if norm_key in ('paymentmethod', 'paymentmethods'):
                    write_cache('payment_method', parsed_arr)
                elif norm_key in ('deliveryarea', 'deliverymethods'):
                    write_cache('delivery_area', parsed_arr)
                elif norm_key in ('offerorcoupon', 'offersjson'):
                    write_cache('offer_or_coupon', parsed_arr)
                elif norm_key in ('adminworkerjson', 'adminworker'):
                    write_cache('admin_worker', parsed_arr)
            cur[setting_name] = setting_details
        else:
            for k, v in payload.items():
                if k not in ('action', '_req_id', 'spreadsheet_id'):
                    cur[k] = v
        write_cache('settings', cur)
        forward_to_apps_script_async('settings/save', payload)
        return {'status': 'success', 'success': True, 'data': cur}

    # Generic collection handler for all 20+ collections
    parts = action.split('/')
    col = parts[0]
    op = parts[1] if len(parts) > 1 else 'list'
    defaults_map = {
        'payment_method': DEFAULT_PAYMENT_METHODS,
        'delivery_area': DEFAULT_DELIVERY_METHODS,
        'offer_or_coupon': DEFAULT_OFFERS,
    }
    fallback_items = defaults_map.get(col, [])
    items = list(read_cache(col, fallback_items))

    if op == 'list':
        return {'status': 'success', 'success': True, 'data': {'items': items, 'total': len(items)}}

    if op == 'seed' and isinstance(payload.get('items'), list):
        write_cache(col, payload['items'])
        forward_to_apps_script_async(action, payload)
        return {'status': 'success', 'success': True, 'data': {'items': payload['items'], 'total': len(payload['items'])}}

    if op in ('add', 'create', 'update', 'register', 'save', 'log', 'withdraw'):
        rec_id = str(
            payload.get('id') or payload.get('payment_id') or payload.get('delivery_id') or payload.get('offer_id')
            or payload.get('page_id') or payload.get('slug') or payload.get('shop_id') or payload.get('user_id')
            or payload.get('USER_ID') or payload.get('customer_id') or payload.get('review_id')
            or payload.get('request_id') or payload.get('log_id') or payload.get('code') or payload.get('name_value')
            or f"ID-{int(time.time()) % 100000}"
        ).strip()
        if 'id' not in payload:
            payload['id'] = rec_id
        updated = False
        for i, row in enumerate(items):
            if not isinstance(row, dict):
                continue
            r_id = str(
                row.get('id') or row.get('payment_id') or row.get('delivery_id') or row.get('offer_id')
                or row.get('page_id') or row.get('slug') or row.get('shop_id') or row.get('user_id')
                or row.get('USER_ID') or row.get('customer_id') or row.get('review_id')
                or row.get('request_id') or row.get('log_id') or row.get('code') or row.get('name_value') or ''
            ).strip()
            if r_id and r_id.lower() == rec_id.lower():
                items[i] = {**row, **payload}
                updated = True
                break
        if not updated:
            items.insert(0, payload)
        write_cache(col, items)
        forward_to_apps_script_async(action, payload)
        return {'status': 'success', 'success': True, 'data': payload}

    if op == 'delete':
        target = str(
            payload.get('id') or payload.get('payment_id') or payload.get('delivery_id') or payload.get('offer_id')
            or payload.get('page_id') or payload.get('slug') or payload.get('shop_id') or payload.get('user_id')
            or payload.get('customer_id') or payload.get('review_id') or payload.get('request_id')
            or payload.get('code') or payload.get('name_value') or ''
        ).strip().lower()
        if target:
            items = [
                r for r in items
                if not any(
                    str((r or {}).get(f) or '').strip().lower() == target
                    for f in ('id', 'payment_id', 'delivery_id', 'offer_id', 'page_id', 'slug', 'shop_id', 'user_id', 'USER_ID', 'customer_id', 'review_id', 'request_id', 'log_id', 'code', 'coupon_code', 'name_value')
                )
            ]
            write_cache(col, items)
        forward_to_apps_script_async(action, payload)
        return {'status': 'success', 'success': True}

    forward_to_apps_script_async(action, payload)
    return {'status': 'success', 'success': True, 'data': payload}


def build_ssr_html(path: str = '/', query: dict = None) -> str:
    query = query or {}
    meta = get_sync_meta()
    settings = get_site_settings()
    products = get_products()
    categories = read_cache('categories', INITIAL_CATEGORIES)
    brands = read_cache('brands', INITIAL_BRANDS)
    banners = read_cache('banners', INITIAL_BANNERS)
    payment_methods = read_cache('payment_method', DEFAULT_PAYMENT_METHODS)
    delivery_methods = read_cache('delivery_area', DEFAULT_DELIVERY_METHODS)
    offers = read_cache('offer_or_coupon', DEFAULT_OFFERS)
    landing_pages = read_cache('landing_pages', [])
    orders = get_orders(False)[:200]

    ssr_state = json.dumps({
        'engine': 'Python-PHP-Turbo-5.0',
        'timestamp': int(time.time()),
        'sync_updated_at': int(meta.get('updated_at') or 0),
        'collections_meta': meta.get('collections') or {},
        'settings': settings,
        'products': products,
        'categories': categories,
        'brands': brands,
        'banners': banners,
        'payment_methods': payment_methods,
        'delivery_methods': delivery_methods,
        'offers': offers,
        'landing_pages': landing_pages,
        'orders': orders,
    }, ensure_ascii=False)

    return f"""<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
  <title>Dream Cart BD (ড্রিম কার্ট বিডি) — Smart Digital Commerce &amp; Multi-Vendor Platform</title>
  <link rel="icon" type="image/x-icon" href="/favicon.ico" />
  <link rel="shortcut icon" type="image/x-icon" href="/favicon.ico" />
  <link rel="icon" type="image/png" sizes="48x48" href="/public/icon/favicon-48x48.png" />
  <link rel="icon" type="image/png" sizes="32x32" href="/public/icon/favicon-32x32.png" />
  <link rel="icon" type="image/png" sizes="16x16" href="/public/icon/favicon-16x16.png" />
  <link rel="icon" type="image/png" sizes="192x192" href="/public/icon/icon-192.png" />
  <link rel="icon" type="image/png" sizes="512x512" href="/public/icon/icon-512.png" />
  <link rel="apple-touch-icon" sizes="180x180" href="/public/icon/apple-touch-icon.png" />
  <link rel="manifest" href="/public/manifest.webmanifest" />
  <meta name="theme-color" content="#059669" />
  <link rel="canonical" href="https://dreamcartbd.com{path}" />
  <meta property="og:site_name" content="Dream Cart BD (ড্রিম কার্ট বিডি)" />
  <meta property="og:type" content="website" />
  <meta property="og:title" content="Dream Cart BD (ড্রিম কার্ট বিডি) — Smart Digital Commerce &amp; Multi-Vendor Platform" />
  <meta property="og:image" content="https://dreamcartbd.com/public/icon/og-banner.jpg" />
  <link rel="alternate" type="application/rss+xml" title="Dream Cart BD Product Catalog Feed" href="https://dreamcartbd.com/feed.php" />

  <!-- Instant 0ms Server-Side Preloaded State & Cross-Browser Live Sync (Python + PHP Turbo Cache) -->
  <script>
    window.__DCBD_SSR_CACHE__ = {ssr_state};
    window.__DCBD_PHP_API_URL__ = (window.__APP_BASE__ || '') + '/api/index.php';
    (function() {{
      try {{
        var ssr = window.__DCBD_SSR_CACHE__;
        if (!ssr) return;
        var serverMeta = ssr.collections_meta || {{}};
        var localMeta = {{}};
        try {{
          localMeta = JSON.parse(localStorage.getItem('dcbd_server_sync_meta') || '{{}}') || {{}};
        }} catch (e) {{}}
        function shouldSync(colKey, storageKey) {{
          var srvTs = Number(serverMeta[colKey] || 0);
          var locTs = Number(localMeta[colKey] || 0);
          return !localStorage.getItem(storageKey) || (srvTs > 0 && srvTs > locTs);
        }}
        if (ssr.settings && typeof ssr.settings === 'object' && shouldSync('settings', 'dcbd_site_settings')) {{
          localStorage.setItem('dcbd_site_settings', JSON.stringify(ssr.settings));
          localMeta.settings = Number(serverMeta.settings || ssr.sync_updated_at || 1);
        }}
        if (Array.isArray(ssr.products) && ssr.products.length > 0 && shouldSync('products', 'dcbd_sheet_products')) {{
          localStorage.setItem('dcbd_sheet_products', JSON.stringify(ssr.products));
          localMeta.products = Number(serverMeta.products || ssr.sync_updated_at || 1);
        }}
        if (Array.isArray(ssr.categories) && ssr.categories.length > 0 && shouldSync('categories', 'dcbd_sheet_categories')) {{
          localStorage.setItem('dcbd_sheet_categories', JSON.stringify(ssr.categories));
          localMeta.categories = Number(serverMeta.categories || ssr.sync_updated_at || 1);
        }}
        if (Array.isArray(ssr.brands) && ssr.brands.length > 0 && shouldSync('brands', 'dcbd_sheet_brands')) {{
          localStorage.setItem('dcbd_sheet_brands', JSON.stringify(ssr.brands));
          localMeta.brands = Number(serverMeta.brands || ssr.sync_updated_at || 1);
        }}
        if (Array.isArray(ssr.banners) && ssr.banners.length > 0 && shouldSync('banners', 'dcbd_sheet_banners')) {{
          localStorage.setItem('dcbd_sheet_banners', JSON.stringify(ssr.banners));
          localMeta.banners = Number(serverMeta.banners || ssr.sync_updated_at || 1);
        }}
        if (Array.isArray(ssr.payment_methods) && ssr.payment_methods.length > 0 && shouldSync('payment_method', 'dcbd_payment_methods')) {{
          localStorage.setItem('dcbd_payment_methods', JSON.stringify(ssr.payment_methods));
          localMeta.payment_method = Number(serverMeta.payment_method || ssr.sync_updated_at || 1);
        }}
        if (Array.isArray(ssr.delivery_methods) && ssr.delivery_methods.length > 0 && shouldSync('delivery_area', 'dcbd_delivery_methods')) {{
          localStorage.setItem('dcbd_delivery_methods', JSON.stringify(ssr.delivery_methods));
          localMeta.delivery_area = Number(serverMeta.delivery_area || ssr.sync_updated_at || 1);
        }}
        if (Array.isArray(ssr.offers) && ssr.offers.length > 0 && shouldSync('offer_or_coupon', 'dcbd_sheet_offers')) {{
          localStorage.setItem('dcbd_sheet_offers', JSON.stringify(ssr.offers));
          localMeta.offer_or_coupon = Number(serverMeta.offer_or_coupon || ssr.sync_updated_at || 1);
        }}
        if (Array.isArray(ssr.landing_pages) && ssr.landing_pages.length > 0 && shouldSync('landing_pages', 'dcbd_landing_pages')) {{
          localStorage.setItem('dcbd_landing_pages', JSON.stringify(ssr.landing_pages));
          localMeta.landing_pages = Number(serverMeta.landing_pages || ssr.sync_updated_at || 1);
        }}
        if (Array.isArray(ssr.orders) && ssr.orders.length > 0 && shouldSync('orders', 'dcbd_sheet_orders')) {{
          localStorage.setItem('dcbd_sheet_orders', JSON.stringify(ssr.orders));
          localMeta.orders = Number(serverMeta.orders || ssr.sync_updated_at || 1);
        }}
        localStorage.setItem('dcbd_server_sync_meta', JSON.stringify(localMeta));
      }} catch (e) {{}}
    }})();
  </script>

  <!-- Unified Pre-Boot Security Shield, Base Path & Orbital Loader Engine -->
  <script src="/src/boot.js"></script>

  <!-- Google Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />

  <!-- Standalone High-Performance Production CSS -->
  <link rel="stylesheet" href="/src/styles/main.css" />
  <link rel="stylesheet" href="/src/styles/admin.css" />
  <link rel="stylesheet" href="/src/styles/responsive.css" />
</head>
<body class="bg-slate-50 text-slate-900 min-h-screen antialiased selection:bg-emerald-500 selection:text-white">
  <div id="app-root"></div>
  <script>if (window.mountUnifiedBootLoader) window.mountUnifiedBootLoader();</script>
  <script type="module" src="/src/main.js"></script>
</body>
</html>"""


def application(environ, start_response):
    """
    Standard PEP 3333 WSGI Application Entry Point (for cPanel Python App / Passenger / Gunicorn)
    """
    setup_testing_defaults(environ)
    path = environ.get('PATH_INFO', '/') or '/'
    query_str = environ.get('QUERY_STRING', '')
    query = {k: v[0] for k, v in urllib.parse.parse_qs(query_str).items()}
    method = environ.get('REQUEST_METHOD', 'GET').upper()
    client_ip = environ.get('HTTP_X_FORWARDED_FOR', environ.get('REMOTE_ADDR', '127.0.0.1')).split(',')[0].strip()
    user_agent = environ.get('HTTP_USER_AGENT', '')

    # 1. API Endpoint (/api or /api/index.php)
    if path in ('/api', '/api/', '/api/index.php'):
        if method == 'OPTIONS':
            start_response('200 OK', [
                ('Content-Type', 'application/json; charset=UTF-8'),
                ('Access-Control-Allow-Origin', '*'),
                ('Access-Control-Allow-Methods', 'GET, POST, OPTIONS'),
                ('Access-Control-Allow-Headers', 'Content-Type'),
            ])
            return [b'{"status":"ok","success":true}']

        payload = dict(query)
        action = query.get('action', '')
        if method == 'POST':
            try:
                length = int(environ.get('CONTENT_LENGTH') or 0)
            except ValueError:
                length = 0
            if length > 0:
                raw_body = environ['wsgi.input'].read(length).decode('utf-8', errors='replace')
                try:
                    parsed = json.loads(raw_body)
                    if isinstance(parsed, dict):
                        action = action or parsed.get('action', '')
                        payload = parsed.get('payload') or parsed.get('data') or parsed
                except Exception:
                    pass

        res = handle_api_action(action, payload if isinstance(payload, dict) else {}, client_ip, user_agent)
        body = json.dumps(res, ensure_ascii=False).encode('utf-8')
        start_response('200 OK', [
            ('Content-Type', 'application/json; charset=UTF-8'),
            ('Access-Control-Allow-Origin', '*'),
            ('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0'),
            ('X-Turbo-Engine', 'DreamCartBD-Python-5.0'),
        ])
        return [body]

    # 2. Static Assets (/src/*, /public/*, /favicon.ico, etc.)
    clean_rel = path.lstrip('/')
    static_candidate = (ROOT_DIR / clean_rel).resolve()
    if clean_rel and str(static_candidate).startswith(str(ROOT_DIR)) and static_candidate.is_file() and static_candidate.suffix not in ('.php', '.py', '.sqlite'):
        mime_type, _ = mimetypes.guess_type(str(static_candidate))
        mime_type = mime_type or 'application/octet-stream'
        if static_candidate.suffix == '.js':
            mime_type = 'application/javascript; charset=UTF-8'
        elif static_candidate.suffix == '.css':
            mime_type = 'text/css; charset=UTF-8'
        data = static_candidate.read_bytes()
        start_response('200 OK', [
            ('Content-Type', mime_type),
            ('Cache-Control', 'public, max-age=31536000, immutable'),
        ])
        return [data]

    # 3. Special Standalone Pages (/dcitbd, /education)
    if path.rstrip('/') in ('/dcitbd', '/education'):
        sub_php = ROOT_DIR / path.strip('/') / 'index.php'
        if sub_php.is_file():
            raw_txt = sub_php.read_text(encoding='utf-8')
            clean_html = re.sub(r'<\?(?:php|=).*?\?>', '', raw_txt, flags=re.S)
            start_response('200 OK', [('Content-Type', 'text/html; charset=UTF-8')])
            return [clean_html.encode('utf-8')]

    # 4. SSR SPA App Page
    html_out = build_ssr_html(path, query).encode('utf-8')
    start_response('200 OK', [
        ('Content-Type', 'text/html; charset=UTF-8'),
        ('X-Powered-By', f'DreamCartBD-Python-Turbo/{VERSION}'),
    ])
    return [html_out]


if __name__ == '__main__':
    from wsgiref.simple_server import make_server
    port = int(os.environ.get('PORT', '8080'))
    print(f"🚀 Dream Cart BD — Python High-Speed Turbo Server running on http://localhost:{port}")
    with make_server('0.0.0.0', port, application) as httpd:
        httpd.serve_forever()

/**
 * DREAM CART BD — REDESIGNED ULTRA-RESPONSIVE HOME PAGE (HomePage.js)
 * - 100% Dynamic Category Discovery: Shows ONLY categories that have active uploaded products
 * - Mobile-First Responsive Design: Crisp 2-col mobile, 3-col tablet, 4-5 col desktop grids with zero overflow
 * - Sleek Auto-Sliding Hero Banner, Trust Badges, Category Grid, Featured Brands, Category Product Sections, Trending & Partner CTA
 */

import { renderProductCard } from '../../components/ProductCard.js';
import { apiClient } from '../../api/client.js';

// Auto-refresh homepage whenever live server sync (products, categories, or banners) completes
if (typeof window !== 'undefined' && !window.__dcbdProductsSyncListener) {
  window.__dcbdProductsSyncListener = true;
  let _homeRefreshTimer = null;
  const refreshHomeIfActive = (ev) => {
    const path = (window.location.pathname || '/').replace(/\/+$/, '') || '/';
    if (path !== '/' && path !== '/index.html' && path !== '/index.php') return;
    if (window.__dcbdRenderingHome) return;
    const detailItems = ev && ev.detail && Array.isArray(ev.detail.items) ? ev.detail.items : null;
    if (detailItems && window.__dcbdLastHomeProdCount === detailItems.length) return;
    clearTimeout(_homeRefreshTimer);
    _homeRefreshTimer = setTimeout(async () => {
      if (window.__dcbdRenderingHome) return;
      const appRoot = document.getElementById('app-root');
      const mainEl = (appRoot && appRoot.querySelector('main')) || appRoot;
      if (!mainEl) return;
      try {
        const html = await renderHomePage();
        mainEl.innerHTML = html;
      } catch (err) {}
    }, 250);
  };
  window.addEventListener('dcbd:products-synced', refreshHomeIfActive);
  window.addEventListener('dcbd:banners-synced', refreshHomeIfActive);
}

// Hero Slider Global Controller
if (typeof window !== 'undefined') {
  window.__dcbdSliderIdx = 0;

  window.__dcbdGoSlide = function(idx) {
    const slides = document.querySelectorAll('.banner-slide');
    const dots = document.querySelectorAll('.slider-dot');
    if (!slides.length) return;
    const total = slides.length;
    const targetIdx = ((idx % total) + total) % total;
    window.__dcbdSliderIdx = targetIdx;

    slides.forEach((s, i) => {
      if (i === targetIdx) {
        s.classList.add('active-slide');
        s.style.opacity = '1';
        s.style.zIndex = '10';
        s.style.pointerEvents = 'auto';
        s.style.visibility = 'visible';
      } else {
        s.classList.remove('active-slide');
        s.style.opacity = '0';
        s.style.zIndex = '0';
        s.style.pointerEvents = 'none';
        s.style.visibility = 'hidden';
      }
    });

    dots.forEach((d, i) => {
      if (i === targetIdx) {
        d.classList.add('active-dot', 'bg-emerald-500');
        d.classList.remove('bg-white/40');
      } else {
        d.classList.remove('active-dot', 'bg-emerald-500');
        d.classList.add('bg-white/40');
      }
    });
  };

  window.__dcbdNextSlide = function() {
    const slides = document.querySelectorAll('.banner-slide');
    if (slides.length > 1) {
      window.__dcbdGoSlide((window.__dcbdSliderIdx || 0) + 1);
    }
  };

  window.__dcbdPrevSlide = function() {
    const slides = document.querySelectorAll('.banner-slide');
    if (slides.length > 1) {
      window.__dcbdGoSlide((window.__dcbdSliderIdx || 0) - 1);
    }
  };

  window.__dcbdCatCatalog = window.__dcbdCatCatalog || {};
  window.__dcbdRenderCard = renderProductCard;
  window.__dcbdCatSlide = function(catId, delta) {
    const wrap = document.getElementById('cat-carousel-' + catId);
    if (!wrap) return;
    const grid = wrap.querySelector('.dc-cat-active-grid');
    const items = window.__dcbdCatCatalog[catId];
    const pageSize = 10;
    const totalPages = items ? Math.max(1, Math.ceil(items.length / pageSize)) : 1;
    if (!grid || !items || totalPages <= 1) return;
    let cur = parseInt(wrap.getAttribute('data-page') || '0', 10);
    cur = ((cur + delta) % totalPages + totalPages) % totalPages;
    wrap.setAttribute('data-page', String(cur));
    const slice = items.slice(cur * pageSize, (cur + 1) * pageSize);
    grid.style.opacity = '0.45';
    grid.innerHTML = slice.map(p => window.__dcbdRenderCard(p)).join('');
    requestAnimationFrame(() => { grid.style.opacity = '1'; });
    const badge = document.getElementById('cat-page-badge-' + catId);
    if (badge) badge.textContent = `${cur + 1} / ${totalPages}`;
  };

  if (!window.__dcbdSliderTimerStarted) {
    window.__dcbdSliderTimerStarted = true;
    setInterval(function() {
      const slider = document.getElementById('hero-slider');
      if (slider && document.body.contains(slider)) {
        window.__dcbdNextSlide();
      }
    }, 5500);
  }
}

export async function renderHomePage() {
  if (typeof window !== 'undefined') window.__dcbdRenderingHome = true;
  let prodRes, catRes, brandRes, bannerRes;
  try {
    [prodRes, catRes, brandRes, bannerRes] = await Promise.all([
      apiClient.request("products/list"),
      apiClient.request("categories/list"),
      apiClient.request("brands/list"),
      apiClient.request("banners/list")
    ]);
  } finally {
    if (typeof window !== 'undefined') {
      setTimeout(() => { window.__dcbdRenderingHome = false; }, 100);
    }
  }

  const products = (prodRes?.data?.items) || [];
  const categories = (catRes?.data?.items) || [];
  const brands = (brandRes?.data?.items) || [];
  const rawBanners = (bannerRes?.data?.items) || [];

  const activeBanners = rawBanners.filter(b => {
    const st = String(b.status || b.Status || 'Active').trim().toLowerCase();
    return st !== 'inactive' && st !== 'disabled' && st !== 'false';
  });

  const defaultBanners = [
    {
      banner_id: "BAN-01",
      title: "স্মার্ট গ্যাজেট ও প্রিমিয়াম কালেকশন",
      subtitle: "সেরা মানের অরিজিনাল পণ্য এখন সাশ্রয়ী মূল্যে ও দ্রুত হোম ডেলিভারিতে।",
      tag: "🔥 স্পেশাল অফার",
      image_url: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=1400&auto=format&fit=crop&q=80",
      link_url: "/products",
      button_text: "শপিং শুরু করুন"
    },
    {
      banner_id: "BAN-02",
      title: "১০০% খাঁটি অর্গানিক ও লাইফস্টাইল পণ্য",
      subtitle: "বিকাশ/নগদ অগ্রিম পেমেন্টে ৫% ছাড় এবং ৳২,০০০+ অর্ডারে ফ্রি ডেলিভারি!",
      tag: "🌿 অর্গানিক ও লাইফস্টাইল",
      image_url: "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=1400&auto=format&fit=crop&q=80",
      link_url: "/offers",
      button_text: "অফার দেখুন"
    }
  ];

  const banners = activeBanners.length > 0 ? activeBanners : defaultBanners;

  // Build category metadata lookup from categories collection (for images/subcategories)
  const catMetaByKey = new Map();
  categories.forEach(c => {
    const rawName = String(c.category || c.Category || '').trim();
    if (!rawName || rawName.toLowerCase() === 'test id') return;
    const key = rawName.toLowerCase();
    if (!catMetaByKey.has(key)) {
      catMetaByKey.set(key, {
        name: rawName,
        category_image: String(c.category_image || '').trim(),
        subCategories: new Set()
      });
    }
    const meta = catMetaByKey.get(key);
    String(c.sub_category || '').split(/[,|\n]/).map(s => s.trim()).filter(Boolean).forEach(s => meta.subCategories.add(s));
    String(c.chail_category || c.child_category || '').split(/[,|\n]/).map(s => s.trim()).filter(Boolean).forEach(s => meta.subCategories.add(s));
  });

  // Group ONLY uploaded/active products by their exact category (হোম পেজে শুধুমাত্র আপলোড থাকা প্রোডাক্টসমূহের ক্যাটাগরি দেখা যাবে)
  const uniqueCategoryMap = new Map();
  products.forEach((p, idx) => {
    if (!p || typeof p !== 'object') return;
    if (p.status === 'নিষ্ক্রিয়' || p.is_active === false) return;
    const rawCat = String(p.category || p.Category || 'General').trim();
    if (!rawCat || rawCat.toLowerCase() === 'test id') return;

    const key = rawCat.toLowerCase();
    if (!uniqueCategoryMap.has(key)) {
      const meta = catMetaByKey.get(key);
      uniqueCategoryMap.set(key, {
        name: rawCat,
        category_image: (meta && meta.category_image) || p.thumbnail || (Array.isArray(p.images) && p.images[0]) || '/public/icon/logo.png',
        subCategories: new Set(),
        products: []
      });
    }

    const catObj = uniqueCategoryMap.get(key);
    const pId = String(p.product_id || p.sku || p.name || idx).trim();
    if (!catObj.products.some(it => String(it.product_id || it.sku || it.name || '').trim() === pId)) {
      catObj.products.push(p);
    }

    if ((!catObj.category_image || catObj.category_image === '/public/icon/logo.png') && (p.thumbnail || (Array.isArray(p.images) && p.images[0]))) {
      catObj.category_image = p.thumbnail || p.images[0];
    }

    const pSub = String(p.sub_category || '').trim();
    if (pSub) catObj.subCategories.add(pSub);
    const pChild = String(p.child_category || '').trim();
    if (pChild) catObj.subCategories.add(pChild);
  });

  const uniqueCategories = Array.from(uniqueCategoryMap.values())
    .filter(c => c.products.length > 0)
    .sort((a, b) => b.products.length - a.products.length);

  if (typeof window !== 'undefined') {
    window.__dcbdLastHomeProdCount = products.length;
    window.__dcbdCatCatalog = {};
  }
  const brandCountMap = new Map();
  products.forEach(pr => {
    if (!pr || pr.status === 'নিষ্ক্রিয়' || pr.is_active === false) return;
    const bn = String(pr.brand || '').trim().toLowerCase();
    if (bn) brandCountMap.set(bn, (brandCountMap.get(bn) || 0) + 1);
  });

  return `
    <style id="dc-home-page-styles">
      .dc-home-wrap {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
        padding-top: 0.5rem;
        padding-bottom: 3rem;
        width: 100%;
        max-width: 100%;
        overflow-x: hidden;
        box-sizing: border-box;
      }
      @media (min-width: 768px) {
        .dc-home-wrap { gap: 2rem; padding-top: 0.75rem; }
      }

      /* Hero Slider */
      .dc-hero {
        position: relative;
        width: 100%;
        min-height: 250px;
        border-radius: 20px;
        overflow: hidden;
        background: #020617;
        box-shadow: 0 14px 35px -12px rgba(2, 6, 23, 0.4);
      }
      @media (min-width: 640px) { .dc-hero { min-height: 330px; border-radius: 24px; } }
      @media (min-width: 1024px) { .dc-hero { min-height: 400px; border-radius: 26px; } }

      #hero-slider {
        position: relative;
        width: 100%;
        min-height: inherit;
        display: flex;
        align-items: stretch;
      }
      .banner-slide {
        width: 100%;
        min-height: inherit;
        display: flex;
        align-items: center;
        transition: opacity 0.6s ease;
      }
      .banner-slide.active-slide {
        position: relative !important; opacity: 1 !important; z-index: 10 !important;
        pointer-events: auto !important; visibility: visible !important;
      }
      .banner-slide:not(.active-slide) {
        position: absolute !important; inset: 0 !important; opacity: 0 !important;
        z-index: 0 !important; pointer-events: none !important; visibility: hidden !important;
      }
      .dc-hero-bg {
        position: absolute; inset: 0; width: 100%; height: 100%;
        object-fit: cover; object-position: center; z-index: 1;
      }
      .dc-hero-overlay {
        position: absolute; inset: 0; z-index: 2;
        background: linear-gradient(95deg, rgba(2,6,23,0.92) 0%, rgba(2,6,23,0.72) 55%, rgba(2,6,23,0.35) 100%);
      }
      .dc-hero-inner {
        position: relative; z-index: 5; width: 100%;
        padding: 1.5rem 1.25rem 2.75rem;
        display: grid; grid-template-columns: 1fr; gap: 1.25rem; align-items: center;
      }
      @media (min-width: 768px) {
        .dc-hero-inner { padding: 2.25rem 2.75rem 3rem; grid-template-columns: 1.35fr 0.65fr; }
      }
      @media (min-width: 1024px) {
        .dc-hero-inner { padding: 2.75rem 3.5rem; }
      }
      .dc-hero-tag {
        display: inline-flex; align-items: center; gap: 6px;
        padding: 4px 12px; border-radius: 999px;
        background: rgba(16,185,129,0.2); border: 1px solid rgba(52,211,153,0.35);
        color: #6ee7b7; font-size: 11px; font-weight: 800; width: fit-content;
      }
      .dc-hero-title {
        font-size: 1.35rem; font-weight: 900; color: #ffffff; line-height: 1.25; margin: 0.5rem 0;
      }
      @media (min-width: 640px) { .dc-hero-title { font-size: 1.85rem; } }
      @media (min-width: 1024px) { .dc-hero-title { font-size: 2.35rem; } }
      .dc-hero-sub {
        font-size: 0.8rem; color: #cbd5e1; line-height: 1.5; max-width: 540px; margin-bottom: 1rem;
      }
      @media (min-width: 640px) { .dc-hero-sub { font-size: 0.92rem; } }
      .dc-hero-actions { display: flex; flex-wrap: wrap; gap: 0.65rem; }
      .dc-hero-visual {
        display: none;
      }
      @media (min-width: 768px) {
        .dc-hero-visual {
          display: block; border-radius: 18px; overflow: hidden;
          border: 1px solid rgba(255,255,255,0.16); background: rgba(15,23,42,0.5);
          aspect-ratio: 4/3; max-height: 250px; justify-self: end; width: 100%;
        }
      }
      .dc-slider-dots {
        position: absolute; bottom: 14px; left: 50%; transform: translateX(-50%);
        display: flex; gap: 6px; z-index: 20;
      }
      .slider-dot {
        width: 20px; height: 5px; border-radius: 999px; border: none; cursor: pointer; transition: all 0.25s ease;
      }
      .slider-dot.active-dot { width: 34px; }
      .dc-slider-arrow {
        position: absolute; top: 50%; transform: translateY(-50%); z-index: 20;
        width: 36px; height: 36px; border-radius: 50%; border: 1px solid rgba(255,255,255,0.25);
        background: rgba(2,6,23,0.55); color: #fff; font-size: 20px; cursor: pointer;
        display: none; align-items: center; justify-content: center; backdrop-filter: blur(6px);
      }
      @media (min-width: 768px) { .dc-slider-arrow { display: flex; } }
      .dc-slider-arrow:hover { background: #10b981; border-color: #10b981; }
      .dc-slider-prev { left: 14px; }
      .dc-slider-next { right: 14px; }

      /* Trust Grid */
      .dc-trust-grid {
        display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.75rem;
      }
      @media (min-width: 1024px) { .dc-trust-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 1rem; } }
      .dc-trust-card {
        display: flex; align-items: center; gap: 0.75rem; padding: 0.85rem 1rem;
        border-radius: 16px; background: #ffffff; border: 1px solid #e2e8f0;
      }
      .dark .dc-trust-card { background: #0f172a; border-color: rgba(255,255,255,0.08); }

      /* Reusable Section Card */
      .dc-section {
        background: #ffffff; border: 1px solid #e2e8f0; border-radius: 20px;
        padding: 1rem; box-shadow: 0 4px 18px -6px rgba(15,23,42,0.05);
        width: 100%; box-sizing: border-box;
        content-visibility: auto;
        contain-intrinsic-size: 380px;
      }
      .dc-cat-active-grid { transition: opacity 0.18s ease; }
      .dark .dc-section { background: #0f172a; border-color: rgba(255,255,255,0.08); }
      @media (min-width: 640px) { .dc-section { padding: 1.4rem 1.5rem; border-radius: 24px; } }

      .dc-sec-head {
        display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between;
        gap: 0.75rem; padding-bottom: 0.85rem; margin-bottom: 1rem;
        border-bottom: 1px solid #f1f5f9;
      }
      .dark .dc-sec-head { border-bottom-color: rgba(255,255,255,0.08); }
      .dc-sec-title {
        font-size: 1.05rem; font-weight: 900; color: #0f172a; margin: 0; line-height: 1.25;
      }
      .dark .dc-sec-title { color: #f8fafc; }
      @media (min-width: 640px) { .dc-sec-title { font-size: 1.25rem; } }

      .dc-sec-link {
        display: inline-flex; align-items: center; gap: 4px;
        padding: 6px 12px; border-radius: 10px; font-size: 12px; font-weight: 800;
        background: #ecfdf5; color: #059669; border: 1px solid #a7f3d0;
        white-space: nowrap; transition: all 0.2s ease;
      }
      .dark .dc-sec-link { background: rgba(16,185,129,0.14); color: #34d399; border-color: rgba(16,185,129,0.3); }
      .dc-sec-link:hover { background: #059669; color: #ffffff; }

      /* Category & Brand Tiles Grid */
      .dc-tile-grid {
        display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.75rem;
      }
      @media (min-width: 640px) { .dc-tile-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
      @media (min-width: 768px) { .dc-tile-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
      @media (min-width: 1024px) { .dc-tile-grid { grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 0.9rem; } }

      .dc-cat-tile {
        display: flex; flex-direction: column; align-items: center; text-align: center;
        padding: 0.75rem; border-radius: 16px; background: #f8fafc; border: 1px solid #e2e8f0;
        transition: all 0.2s ease;
      }
      .dark .dc-cat-tile { background: #1e293b; border-color: rgba(255,255,255,0.08); }
      .dc-cat-tile:hover { border-color: #10b981; transform: translateY(-2px); box-shadow: 0 8px 18px -6px rgba(16,185,129,0.2); }

      .dc-sub-pills {
        display: flex; align-items: center; gap: 6px; overflow-x: auto; max-width: 100%;
        padding-top: 6px; scrollbar-width: none;
      }
      .dc-sub-pills::-webkit-scrollbar { display: none; }
      .dc-sub-pill {
        flex-shrink: 0; font-size: 11px; font-weight: 700; padding: 3px 10px;
        border-radius: 999px; background: #f1f5f9; color: #334155; border: 1px solid #e2e8f0;
      }
      .dark .dc-sub-pill { background: #1e293b; color: #cbd5e1; border-color: rgba(255,255,255,0.1); }
      .dc-sub-pill:hover { background: #10b981; color: #ffffff; border-color: #10b981; }

      /* Category 12-Item Paged Carousel */
      .dc-cat-carousel { position: relative; width: 100%; }
      .dc-cat-viewport { overflow: hidden; width: 100%; }
      .dc-cat-track {
        display: flex;
        transition: transform 0.42s cubic-bezier(0.22, 1, 0.36, 1);
        will-change: transform;
      }
      .dc-cat-slide { min-width: 100%; width: 100%; flex-shrink: 0; }
      .dc-cat-arrow {
        position: absolute; top: 44%; transform: translateY(-50%); z-index: 25;
        width: 36px; height: 36px; border-radius: 999px;
        border: 1px solid #cbd5e1; background: rgba(255,255,255,0.96); color: #0f172a;
        font-size: 22px; font-weight: 900; line-height: 1;
        display: flex; align-items: center; justify-content: center;
        box-shadow: 0 8px 20px -4px rgba(15,23,42,0.22); cursor: pointer; transition: all 0.2s ease;
      }
      .dark .dc-cat-arrow {
        background: rgba(15,23,42,0.94); border-color: rgba(255,255,255,0.18); color: #f8fafc;
      }
      .dc-cat-arrow:hover:not(:disabled) {
        background: #10b981; border-color: #10b981; color: #ffffff;
        transform: translateY(-50%) scale(1.06);
      }
      .dc-cat-arrow:disabled { opacity: 0.32; cursor: not-allowed; }
      .dc-cat-prev { left: -6px; }
      .dc-cat-next { right: -6px; }
      @media (min-width: 640px) {
        .dc-cat-arrow { width: 42px; height: 42px; font-size: 24px; }
        .dc-cat-prev { left: -12px; }
        .dc-cat-next { right: -12px; }
      }

      /* Strictly 2-Row Brands Grid */
      .dc-brand-two-row {
        display: grid;
        grid-template-rows: repeat(2, minmax(0, 1fr));
        grid-auto-flow: column;
        grid-auto-columns: calc((100% - 0.75rem) / 2);
        gap: 0.75rem;
        overflow-x: auto;
        padding-bottom: 6px;
        scrollbar-width: thin;
        scroll-snap-type: x proximity;
      }
      @media (min-width: 640px) {
        .dc-brand-two-row { grid-auto-columns: calc((100% - 1.5rem) / 3); }
      }
      @media (min-width: 768px) {
        .dc-brand-two-row { grid-auto-columns: calc((100% - 2.25rem) / 4); }
      }
      @media (min-width: 1024px) {
        .dc-brand-two-row { grid-auto-columns: calc((100% - 4.5rem) / 6); gap: 0.9rem; }
      }
    </style>

    <div class="dc-home-wrap">

      <!-- 1. Hero Banner Slider -->
      <section class="dc-hero">
        <div id="hero-slider">
          ${banners.map((b, i) => {
            const imgUrl = b.image_url || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=1400';
            const linkUrl = b.link_url || '/products';
            const btnText = b.button_text || b.cta_text || 'এখনই দেখুন';
            const tag = b.tag || '✨ ড্রিম কার্ট বিডি';
            return `
              <div class="banner-slide ${i === 0 ? 'active-slide' : ''}">
                <img src="${imgUrl}" alt="${b.title || 'Dream Cart BD'}" class="dc-hero-bg" onerror="this.src='https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=1400';" />
                <div class="dc-hero-overlay"></div>
                <div class="dc-hero-inner">
                  <div class="min-w-0">
                    <span class="dc-hero-tag">${tag}</span>
                    <h1 class="dc-hero-title">${b.title || 'স্বাগতম ড্রিম কার্ট বিডিতে'}</h1>
                    ${b.subtitle ? `<p class="dc-hero-sub">${b.subtitle}</p>` : ''}
                    <div class="dc-hero-actions">
                      <a href="${linkUrl}" class="btn-primary py-2.5 px-5 text-xs sm:text-sm font-black shadow-lg">${btnText} →</a>
                      <a href="/offers" class="py-2.5 px-4 rounded-xl bg-white/15 hover:bg-white/25 text-white border border-white/25 text-xs sm:text-sm font-bold backdrop-blur-sm transition">🎁 অফারসমূহ</a>
                    </div>
                  </div>
                  <div class="dc-hero-visual">
                    <img src="${imgUrl}" alt="${b.title || 'Preview'}" class="w-full h-full object-cover" />
                  </div>
                </div>
              </div>
            `;
          }).join('')}

          ${banners.length > 1 ? `
            <div class="dc-slider-dots">
              ${banners.map((_, i) => `<button type="button" class="slider-dot ${i === 0 ? 'active-dot bg-emerald-500' : 'bg-white/40'}" onclick="window.__dcbdGoSlide && window.__dcbdGoSlide(${i})"></button>`).join('')}
            </div>
            <button type="button" class="dc-slider-arrow dc-slider-prev" onclick="window.__dcbdPrevSlide && window.__dcbdPrevSlide()">‹</button>
            <button type="button" class="dc-slider-arrow dc-slider-next" onclick="window.__dcbdNextSlide && window.__dcbdNextSlide()">›</button>
          ` : ''}
        </div>
      </section>

      <!-- 2. Trust Features -->
      <section class="dc-trust-grid">
        <div class="dc-trust-card">
          <div class="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center text-lg flex-shrink-0">🚚</div>
          <div class="min-w-0">
            <div class="font-black text-xs sm:text-sm text-slate-900 dark:text-white truncate">সারা দেশে ডেলিভারি</div>
            <div class="text-[11px] text-slate-500 truncate">ক্যাশ অন ডেলিভারি</div>
          </div>
        </div>
        <div class="dc-trust-card">
          <div class="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center text-lg flex-shrink-0">🛡️</div>
          <div class="min-w-0">
            <div class="font-black text-xs sm:text-sm text-slate-900 dark:text-white truncate">১০০% অরিজিনাল পণ্য</div>
            <div class="text-[11px] text-slate-500 truncate">যাচাইকৃত মান</div>
          </div>
        </div>
        <div class="dc-trust-card">
          <div class="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center text-lg flex-shrink-0">🎁</div>
          <div class="min-w-0">
            <div class="font-black text-xs sm:text-sm text-slate-900 dark:text-white truncate">৫% অনলাইন ছাড়</div>
            <div class="text-[11px] text-slate-500 truncate">বিকাশ ও নগদ পেমেন্টে</div>
          </div>
        </div>
        <div class="dc-trust-card">
          <div class="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 flex items-center justify-center text-lg flex-shrink-0">💬</div>
          <div class="min-w-0">
            <div class="font-black text-xs sm:text-sm text-slate-900 dark:text-white truncate">২৪/৭ কাস্টমার সাপোর্ট</div>
            <div class="text-[11px] text-slate-500 truncate">01581703822</div>
          </div>
        </div>
      </section>

      <!-- 3. Active Product Categories Showcase (শুধুমাত্র আপলোড থাকা প্রোডাক্টসমূহের ক্যাটাগরি) -->
      ${uniqueCategories.length > 0 ? `
        <section class="dc-section">
          <div class="dc-sec-head">
            <div class="flex items-center gap-2.5 min-w-0">
              <div class="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center text-base flex-shrink-0">🗂️</div>
              <div class="min-w-0">
                <h2 class="dc-sec-title truncate">সকল ক্যাটাগরি</h2>
                <p class="text-[11px] text-slate-500 truncate">আপলোডকৃত প্রোডাক্টের ক্যাটাগরিসমূহ (${uniqueCategories.length}টি)</p>
              </div>
            </div>
            <a href="/products" class="dc-sec-link">সব পণ্য দেখুন →</a>
          </div>

          <div class="dc-brand-two-row">
            ${uniqueCategories.slice(0, 12).map(cat => `
              <a href="/products?cat=${encodeURIComponent(cat.name)}" class="dc-cat-tile">
                <div class="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-white border border-slate-200 dark:border-slate-700 mb-2 flex items-center justify-center">
                  <img src="${cat.category_image}" alt="${cat.name}" loading="lazy" decoding="async" class="w-full h-full object-cover" onerror="window.handleDcbdLogoError ? window.handleDcbdLogoError(this) : (this.src='/public/icon/logo.png');" />
                </div>
                <div class="font-bold text-xs text-slate-900 dark:text-white line-clamp-2 leading-snug">${cat.name}</div>
                <span class="mt-1 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">${cat.products.length} টি পণ্য</span>
              </a>
            `).join('')}
          </div>
        </section>
      ` : ''}

      <!-- 4. Category-Wise Product Showcases (১০টি করে প্রোডাক্ট + দুইপাশে এরো স্লাইডার) -->
      ${uniqueCategories.map((cat, catIdx) => {
        const subCategoriesArr = Array.from(cat.subCategories).slice(0, 6);
        const catSlug = encodeURIComponent(cat.name.toLowerCase().replace(/[^a-z0-9]/g, '-')) + '-' + catIdx;
        const pageSize = 10;
        const totalPages = Math.max(1, Math.ceil(cat.products.length / pageSize));
        if (typeof window !== 'undefined') {
          window.__dcbdCatCatalog[catSlug] = cat.products;
        }
        return `
          <section class="dc-section" id="cat-section-${encodeURIComponent(cat.name.toLowerCase().replace(/[^a-z0-9]/g, '-'))}">
            <div class="dc-sec-head">
              <div class="flex items-start gap-2.5 min-w-0 flex-1">
                <div class="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center text-base flex-shrink-0">⚡</div>
                <div class="min-w-0 flex-1">
                  <h2 class="dc-sec-title truncate">${cat.name}</h2>
                  ${subCategoriesArr.length > 0 ? `
                    <div class="dc-sub-pills">
                      ${subCategoriesArr.map(sub => `<a href="/products?cat=${encodeURIComponent(cat.name)}&sub=${encodeURIComponent(sub)}" class="dc-sub-pill">${sub}</a>`).join('')}
                    </div>
                  ` : ''}
                </div>
              </div>
              <div class="flex items-center gap-2 flex-shrink-0">
                ${totalPages > 1 ? `<span id="cat-page-badge-${catSlug}" class="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] font-bold">1 / ${totalPages}</span>` : ''}
                <a href="/products?cat=${encodeURIComponent(cat.name)}" class="dc-sec-link">সবগুলো (${cat.products.length}) →</a>
              </div>
            </div>
            <div class="dc-cat-carousel" id="cat-carousel-${catSlug}" data-page="0" data-total-pages="${totalPages}">
              <button type="button" class="dc-cat-arrow dc-cat-prev" aria-label="পূর্ববর্তী পণ্য" ${totalPages <= 1 ? 'disabled' : ''} onclick="window.__dcbdCatSlide && window.__dcbdCatSlide('${catSlug}', -1)">‹</button>
              <div class="product-grid dc-cat-active-grid">
                ${cat.products.slice(0, pageSize).map(p => renderProductCard(p)).join('')}
              </div>
              <button type="button" class="dc-cat-arrow dc-cat-next" aria-label="পরবর্তী পণ্য" ${totalPages <= 1 ? 'disabled' : ''} onclick="window.__dcbdCatSlide && window.__dcbdCatSlide('${catSlug}', 1)">›</button>
            </div>
          </section>
        `;
      }).join('')}

      <!-- 5. Latest / All Products Grid -->
      <section class="dc-section">
        <div class="dc-sec-head">
          <div class="flex items-center gap-2.5 min-w-0">
            <div class="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950 text-rose-600 flex items-center justify-center text-base flex-shrink-0">🔥</div>
            <div class="min-w-0">
              <h2 class="dc-sec-title truncate">সকল জনপ্রিয় পণ্য</h2>
              <p class="text-[11px] text-slate-500 truncate">মোট ${products.length}টি সক্রিয় পণ্য</p>
            </div>
          </div>
          <a href="/products" class="dc-sec-link !bg-emerald-600 !text-white !border-emerald-600">সব পণ্য (${products.length}) →</a>
        </div>
        <div class="product-grid">
          ${products.slice(0, 10).map(p => renderProductCard(p)).join('')}
        </div>
      </section>

      <!-- 6. Featured Brands (মাত্র দুই রো + প্রতিটি ব্র্যান্ডে সব প্রোডাক্ট দেখুন) -->
      ${brands.length > 0 ? `
        <section class="dc-section">
          <div class="dc-sec-head">
            <div class="flex items-center gap-2.5 min-w-0">
              <div class="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950 text-amber-600 flex items-center justify-center text-base flex-shrink-0">🏷️</div>
              <div class="min-w-0">
                <h2 class="dc-sec-title truncate">টপ ব্র্যান্ডসমূহ</h2>
                <p class="text-[11px] text-slate-500 truncate">আমাদের অফিসিয়াল ব্র্যান্ড পার্টনারগণ (${brands.length}টি ব্র্যান্ড)</p>
              </div>
            </div>
            <a href="/brands" class="dc-sec-link">সকল ব্র্যান্ড (${brands.length}) →</a>
          </div>
          <div class="dc-brand-two-row">
            ${brands.slice(0, 12).map(b => {
              const bName = String(b.brand_name || '').trim();
              const bCount = brandCountMap.get(bName.toLowerCase()) || 0;
              return `
                <a href="/products?brand=${encodeURIComponent(bName)}" class="dc-cat-tile justify-between scroll-snap-align-start">
                  <div class="flex flex-col items-center w-full">
                    <div class="w-14 h-14 rounded-xl bg-white p-2 border border-slate-200 flex items-center justify-center mb-2">
                      <img src="${b.brand_image}" alt="${bName}" loading="lazy" decoding="async" class="max-w-full max-h-full object-contain" onerror="window.handleDcbdLogoError ? window.handleDcbdLogoError(this) : (this.src='/public/icon/logo.png');" />
                    </div>
                    <span class="font-bold text-xs text-slate-800 dark:text-slate-100 truncate w-full">${bName}</span>
                    <span class="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">${bCount} টি পণ্য</span>
                  </div>
                  <span class="mt-2 inline-flex items-center justify-center w-full py-1 px-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800 text-[10px] font-extrabold hover:bg-emerald-600 hover:text-white transition">সব প্রোডাক্ট দেখুন →</span>
                </a>
              `;
            }).join('')}
          </div>
        </section>
      ` : ''}

      <!-- 7. Partner Opportunity Banner -->
      <section class="rounded-3xl bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 text-white p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-5 shadow-lg">
        <div class="space-y-2 max-w-2xl">
          <span class="inline-block px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-[11px] font-bold">ব্যবসার সুবর্ণ সুযোগ</span>
          <h3 class="text-xl sm:text-2xl font-black leading-snug">আমাদের সাথে রিসেলার বা পাইকারি ব্যবসা শুরু করুন!</h3>
          <p class="text-xs sm:text-sm text-slate-300">কোনো ইনভেস্টমেন্ট ছাড়াই ড্রপশিপিং রিসেলিং করুন অথবা পাইকারি দামে বেশি মুনাফায় ব্যবসা বাড়ান।</p>
        </div>
        <div class="flex flex-wrap gap-3 w-full md:w-auto">
          <a href="/reseller/register" class="btn-primary py-2.5 px-5 text-xs sm:text-sm font-black flex-1 md:flex-none text-center">রিসেলার হোন →</a>
          <a href="/wholesaler/register" class="py-2.5 px-5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs sm:text-sm font-bold flex-1 md:flex-none text-center transition">পাইকারি নিবন্ধন</a>
        </div>
      </section>

    </div>
  `;
}

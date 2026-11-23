<?php
/**
 * DREAM CART BD — MASTER CPANEL PHP BOOTSTRAP & 0ms LIVE MULTI-BROWSER SSR ENGINE (includes/bootstrap.php)
 * Powers all 108+ PHP routes on cPanel with:
 * - Gzip / Brotli High-Speed Output Compression
 * - HTTP/2 Asset Preload & Security Headers
 * - Instant Server-Side Preloaded Database State (`window.__DCBD_SSR_CACHE__`) with live cross-browser sync
 * - Dynamic Server-Side SEO, OpenGraph, Product Catalog Meta & Omni-Channel Ad Pixels
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/cache_engine.php';
require_once __DIR__ . '/pixel_tracker.php';
require_once __DIR__ . '/seo_renderer.php';

/**
 * Reusable HTTP response & Gzip initializer
 */
function dcbd_init_html_headers(): array {
    if (!headers_sent()) {
        if (extension_loaded('zlib') && !ini_get('zlib.output_compression')) {
            @ob_start('ob_gzhandler');
        } else {
            @ob_start();
        }
        header('Content-Type: text/html; charset=UTF-8');
        header('X-Powered-By: DreamCartBD-cPanel-Turbo/' . DCBD_VERSION);
        header('X-Content-Type-Options: nosniff');
        header('Referrer-Policy: strict-origin-when-cross-origin');
        header('Cache-Control: no-cache, no-store, must-revalidate');
    }
    $settings = DcbdCacheEngine::getSiteSettings();
    return [
        'settings'   => $settings,
        'pixel_head' => DcbdPixelTracker::renderHeadScripts($settings),
        'pixel_body' => DcbdPixelTracker::renderBodyNoscript($settings),
    ];
}

function dcbd_render_app_page(string $forcedRoute = '') {
    $ctx = dcbd_init_html_headers();
    if (!headers_sent()) {
        header('Link: </src/styles/main.css>; rel=preload; as=style, </src/boot.js>; rel=preload; as=script, </src/main.js>; rel=modulepreload', false);
    }

    $seoHead  = DcbdSeoRenderer::renderSeoHead($forcedRoute, $_GET ?? []);
    $noscript = $ctx['pixel_body'];
    $ssrCache = json_encode(DcbdCacheEngine::getPreloadedSsrState(), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

    echo <<<HTML
<!DOCTYPE html>
<html lang="bn">
<head>
{$seoHead}
  <!-- Instant 0ms cPanel Server Preloaded Database State + Live Cross-Browser Sync Engine -->
  <script>
    window.__DCBD_SSR_CACHE__ = {$ssrCache};
    window.__DCBD_PHP_API_URL__ = (window.__APP_BASE__ || '') + '/api/index.php';
    try {
      if (window.__DCBD_SSR_CACHE__) {
        var _c = window.__DCBD_SSR_CACHE__;
        var _srvCols = _c.collections_meta || {};
        if (Array.isArray(_c.products) && _c.products.length > 0) {
          localStorage.setItem('dcbd_sheet_products', JSON.stringify(_c.products));
        }
        if (Array.isArray(_c.categories) && _c.categories.length > 0) {
          localStorage.setItem('dcbd_sheet_categories', JSON.stringify(_c.categories));
        }
        if (Array.isArray(_c.brands) && _c.brands.length > 0) {
          localStorage.setItem('dcbd_sheet_brands', JSON.stringify(_c.brands));
        }
        if (Array.isArray(_c.banners) && _c.banners.length > 0) {
          localStorage.setItem('dcbd_sheet_banners', JSON.stringify(_c.banners));
        }
        if (_c.settings && typeof _c.settings === 'object') {
          localStorage.setItem('dcbd_site_settings', JSON.stringify(_c.settings));
        }
        if (Array.isArray(_c.payment_methods) && _c.payment_methods.length > 0) {
          localStorage.setItem('dcbd_payment_methods', JSON.stringify(_c.payment_methods));
        }
        if (Array.isArray(_c.delivery_methods) && _c.delivery_methods.length > 0) {
          localStorage.setItem('dcbd_delivery_methods', JSON.stringify(_c.delivery_methods));
        }
        if (Array.isArray(_c.offers) && _c.offers.length > 0) {
          localStorage.setItem('dcbd_sheet_offers', JSON.stringify(_c.offers));
        }
        if (Array.isArray(_c.landing_pages)) {
          localStorage.setItem('dcbd_landing_pages', JSON.stringify(_c.landing_pages));
        }
        if (Array.isArray(_c.orders)) {
          localStorage.setItem('dcbd_sheet_orders', JSON.stringify(_c.orders));
        }
        if (Array.isArray(_c.incomplete_orders)) {
          localStorage.setItem('dcbd_sheet_incomplete_orders', JSON.stringify(_c.incomplete_orders));
        }
        if (Array.isArray(_c.customers) && _c.customers.length > 0) {
          localStorage.setItem('dcbd_sheet_customers', JSON.stringify(_c.customers));
          localStorage.setItem('dcbd_customers', JSON.stringify(_c.customers));
        }
        if (Array.isArray(_c.reviews) && _c.reviews.length > 0) {
          localStorage.setItem('dcbd_sheet_reviews', JSON.stringify(_c.reviews));
        }
        if (Array.isArray(_c.resellers) && _c.resellers.length > 0) {
          localStorage.setItem('dcbd_resellers', JSON.stringify(_c.resellers));
        }
        if (Array.isArray(_c.wholesalers) && _c.wholesalers.length > 0) {
          localStorage.setItem('dcbd_wholesalers', JSON.stringify(_c.wholesalers));
        }
        if (Array.isArray(_c.sellers) && _c.sellers.length > 0) {
          localStorage.setItem('dcbd_sellers', JSON.stringify(_c.sellers));
        }
        if (Array.isArray(_c.markets) && _c.markets.length > 0) {
          localStorage.setItem('dcbd_markets', JSON.stringify(_c.markets));
        }
        if (Array.isArray(_c.couriers) && _c.couriers.length > 0) {
          localStorage.setItem('dcbd_sheet_couriers', JSON.stringify(_c.couriers));
        }
        if (Array.isArray(_c.costs) && _c.costs.length > 0) {
          localStorage.setItem('dcbd_sheet_costs', JSON.stringify(_c.costs));
        }
        if (Array.isArray(_c.buying) && _c.buying.length > 0) {
          localStorage.setItem('dcbd_sheet_buying', JSON.stringify(_c.buying));
        }
        if (Array.isArray(_c.invest) && _c.invest.length > 0) {
          localStorage.setItem('dcbd_sheet_invest', JSON.stringify(_c.invest));
        }
        if (Array.isArray(_c.payments) && _c.payments.length > 0) {
          localStorage.setItem('dcbd_sheet_payments', JSON.stringify(_c.payments));
        }
        localStorage.setItem('dcbd_server_sync_meta', JSON.stringify(_srvCols));
      }
    } catch (e) {}
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
  {$noscript}
  <!-- Main App Root Mount Point with Unified Single-Instance Orbital Particle & Center Logo Loader -->
  <div id="app-root"></div>
  <script>if (window.mountUnifiedBootLoader) window.mountUnifiedBootLoader();</script>

  <!-- Main ES Module Bootstrapper -->
  <script type="module" src="/src/main.js"></script>
</body>
</html>
HTML;
}

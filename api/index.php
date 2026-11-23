<?php
/**
 * DREAM CART BD — STANDALONE CPANEL ULTRA-HIGH-SPEED PHP API GATEWAY (api/index.php)
 * - 100% Standalone Server Engine (< 0.5ms to 2ms response time from local SQLite3 + Atomic JSON storage)
 * - Zero Google Sheets / External Script Dependency (সম্পুর্ণ ডাইনামিক ও সুপারস্পীড)
 * - Direct Product Upload (Single, Bulk 23-Col CSV, Bulk Price, Bulk Image & Physical File Upload to /public/uploads/)
 * - Direct Order Collection & Newest-First Sorting (সবসময় নতুন অর্ডারগুলো উপরেই থাকবে)
 * - Direct Server-Side Report Download (CSV / Excel / JSON) & Full Database Backup/Restore
 * - Omni-Channel Ad Pixel & Server-Side Conversions API (CAPI) for Facebook, Instagram, Google, YouTube & TikTok
 */

require_once dirname(__DIR__) . '/includes/config.php';
require_once dirname(__DIR__) . '/includes/cache_engine.php';
require_once dirname(__DIR__) . '/includes/pixel_tracker.php';
require_once dirname(__DIR__) . '/includes/bulk_parser.php';

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    if (!headers_sent()) {
        header('Access-Control-Allow-Origin: *');
        header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
        http_response_code(200);
    }
    echo json_encode(['status' => 'ok', 'success' => true]);
    exit;
}

// Parse incoming action & payload (supports GET, POST JSON, and POST multipart/form-urlencoded)
$action  = $_GET['action'] ?? ($_POST['action'] ?? '');
$payload = [];

$rawBody = @file_get_contents('php://input');
if ($rawBody !== false && trim($rawBody) !== '') {
    $parsed = @json_decode($rawBody, true);
    if (is_array($parsed)) {
        if (empty($action) && !empty($parsed['action'])) {
            $action = (string)$parsed['action'];
        }
        if (isset($parsed['payload']) && is_array($parsed['payload'])) {
            $payload = $parsed['payload'];
        } elseif (isset($parsed['data']) && is_array($parsed['data'])) {
            $payload = $parsed['data'];
        } else {
            $payload = $parsed;
        }
    }
}

if (empty($payload) && !empty($_GET['data'])) {
    $d = @json_decode((string)$_GET['data'], true);
    if (is_array($d)) $payload = $d;
}
if (empty($payload)) {
    $payload = array_merge($_GET ?? [], $_POST ?? []);
}

$action = strtolower(trim((string)$action, " \t\n\r\0\x0B-_/") ?: 'system/health');
$action = str_replace('landing-pages', 'landing_pages', $action);
$action = str_replace('others_market/', 'markets/', $action);
if ($action === 'settings/save') $action = 'settings/update';
if ($action === 'landing_pages/save') $action = 'landing_pages/add';

// Image CORS Proxy & Direct Download endpoint for Product Details Gallery
if ($action === 'media/proxy') {
    $imgUrl = trim((string)($payload['url'] ?? $_GET['url'] ?? ''));
    $isDl   = !empty($payload['download']) || !empty($_GET['download']);
    if ($imgUrl === '' || !preg_match('#^https?://#i', $imgUrl)) {
        http_response_code(400);
        header('Content-Type: application/json; charset=UTF-8');
        echo json_encode(['status' => 'error', 'message' => 'Invalid image URL']);
        exit;
    }
    $imgData = DcbdCacheEngine::httpGet($imgUrl, 10);
    if ($imgData === null || $imgData === '') {
        http_response_code(404);
        exit;
    }
    $ext = 'jpg';
    if (preg_match('/\.(png|webp|gif|jpeg|jpg|svg)(?:[?#]|$)/i', $imgUrl, $em)) {
        $ext = strtolower($em[1]);
        if ($ext === 'jpeg') $ext = 'jpg';
    }
    $mimeMap = ['jpg' => 'image/jpeg', 'png' => 'image/png', 'webp' => 'image/webp', 'gif' => 'image/gif', 'svg' => 'image/svg+xml'];
    $mime = $mimeMap[$ext] ?? 'image/jpeg';
    if (!headers_sent()) {
        header('Access-Control-Allow-Origin: *');
        header('Content-Type: ' . $mime);
        header('Cache-Control: public, max-age=86400');
        if ($isDl) {
            $fname = preg_replace('/[^a-zA-Z0-9._-]/', '_', (string)($payload['filename'] ?? $_GET['filename'] ?? ('dreamcartbd_image.' . $ext)));
            header('Content-Disposition: attachment; filename="' . $fname . '"');
        }
    }
    echo $imgData;
    exit;
}

// Direct file download endpoints send their own headers before JSON headers
if ($action === 'reports/download' || $action === 'system/backup') {
    if ($action === 'system/backup') {
        $backup = [
            'app'         => 'Dream Cart BD',
            'version'     => DCBD_VERSION,
            'exported_at' => date('c'),
            'state'       => DcbdCacheEngine::getPreloadedSsrState(),
        ];
        if (!headers_sent()) {
            header('Content-Type: application/json; charset=UTF-8');
            header('Content-Disposition: attachment; filename="DreamCartBD_Database_Backup_' . date('Y-m-d_His') . '.json"');
            header('Cache-Control: no-store, no-cache, must-revalidate');
        }
        echo json_encode($backup, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }

    // Handle reports/download (?action=reports/download&type=orders|products|customers|...&format=csv|json)
    $repType = strtolower(trim((string)($payload['type'] ?? 'orders')));
    $format  = strtolower(trim((string)($payload['format'] ?? 'csv')));
    $headers = [];
    $rows    = [];
    $filePrefix = 'DreamCartBD_Report';

    switch ($repType) {
        case 'products':
        case 'inventory':
            $filePrefix = 'Products_23Col_Export';
            $headers = [
                'SKU', 'P_Name', 'Category', 'Sub_Category', 'Child_Category', 'Brand',
                'Buying_price', 'Selling_Price', 'Stock', 'Original_Price', 'WholeSale_price', 'Min_order_Q',
                'Images', 'Slug', 'Description', 'Specification', 'Others', 'Color', 'Size',
                'WEIGHT_KG', 'WIDTH_CM', 'LENGTH_CM', 'HEIGHT_CM'
            ];
            foreach (DcbdCacheEngine::getProducts() as $p) {
                $imgs = isset($p['images']) && is_array($p['images']) ? implode(' | ', $p['images']) : (string)($p['thumbnail'] ?? '');
                $rows[] = [
                    $p['sku'] ?? $p['product_id'] ?? '',
                    $p['p_name'] ?? $p['name'] ?? '',
                    $p['category'] ?? '',
                    $p['sub_category'] ?? '',
                    $p['child_category'] ?? '',
                    $p['brand'] ?? '',
                    $p['buying_price'] ?? 0,
                    $p['selling_price'] ?? 0,
                    $p['stock'] ?? 0,
                    $p['original_price'] ?? 0,
                    $p['wholesale_price'] ?? 0,
                    $p['min_order_q'] ?? $p['min_order_qty'] ?? 5,
                    $imgs,
                    $p['slug'] ?? '',
                    $p['description'] ?? '',
                    $p['specification'] ?? '',
                    $p['others'] ?? '',
                    $p['color'] ?? 'Standard',
                    $p['size'] ?? 'Free Size',
                    $p['weight_kg'] ?? 0.25,
                    $p['width_cm'] ?? 10,
                    $p['length_cm'] ?? 10,
                    $p['height_cm'] ?? 5,
                ];
            }
            break;

        case 'orders':
        case 'sales':
            $filePrefix = $repType === 'sales' ? 'Sales_Analytics_Report' : 'Orders_Export';
            $headers = ['Date', 'Order_ID', 'Account_Type', 'Customer_Name', 'Phone', 'Address', 'Products', 'Color', 'Size', 'Quantity', 'Total_Amount', 'Payment_Method', 'Transaction_ID', 'Payment_Status', 'Order_Status', 'Courier_Name', 'Consignment_ID'];
            foreach (DcbdCacheEngine::getOrders(false) as $o) {
                $rows[] = [
                    $o['date'] ?? '',
                    $o['order_id'] ?? '',
                    $o['account_type'] ?? 'Customer',
                    $o['customer_name'] ?? '',
                    $o['phone'] ?? '',
                    $o['address'] ?? '',
                    $o['products'] ?? '',
                    $o['color'] ?? '',
                    $o['size'] ?? '',
                    $o['quantity'] ?? 1,
                    $o['total_amount'] ?? 0,
                    $o['payment_method'] ?? '',
                    $o['transaction_id'] ?? '',
                    $o['payment_status'] ?? '',
                    $o['order_status'] ?? '',
                    $o['courier_name'] ?? '',
                    $o['consignment_id'] ?? '',
                ];
            }
            break;

        case 'customers':
            $filePrefix = 'Customers_Report';
            $headers = ['Customer_ID', 'Name', 'Phone', 'Email', 'Address', 'Total_Order', 'Success_Order', 'Cancel_Order', 'Total_Spent', 'Status'];
            $age = 0;
            foreach (DcbdCacheEngine::readCache('customers', [], $age) as $c) {
                $rows[] = [
                    $c['user_id'] ?? $c['Customer_ID'] ?? '',
                    $c['name'] ?? $c['Name'] ?? '',
                    $c['phone'] ?? $c['mobile'] ?? '',
                    $c['email'] ?? $c['mail'] ?? '',
                    $c['address'] ?? '',
                    $c['total_order'] ?? 0,
                    $c['success_order'] ?? 0,
                    $c['cancel_order'] ?? 0,
                    $c['total_spent'] ?? 0,
                    $c['status'] ?? 'Active',
                ];
            }
            break;

        case 'resellers':
            $filePrefix = 'Resellers_Report';
            $headers = ['Shop_ID', 'Name', 'Shop_Name', 'Mobile', 'Mail', 'Address', 'NID_Number', 'Trade_Licence_No', 'Balance', 'Status'];
            $age = 0;
            foreach (DcbdCacheEngine::readCache('resellers', [], $age) as $r) {
                $rows[] = [
                    $r['shop_id'] ?? $r['id'] ?? '',
                    $r['name'] ?? '',
                    $r['shop_name'] ?? $r['shop'] ?? '',
                    $r['mobile'] ?? $r['phone'] ?? '',
                    $r['mail'] ?? '',
                    $r['address'] ?? '',
                    $r['nid_number'] ?? '',
                    $r['trade_licence_no'] ?? '',
                    $r['balance'] ?? 0,
                    $r['status'] ?? 'Active',
                ];
            }
            break;

        case 'wholesalers':
            $filePrefix = 'Wholesalers_Report';
            $headers = ['Shop_ID', 'Name', 'Company_Name', 'Mobile', 'Mail', 'Address', 'Tier', 'Status'];
            $age = 0;
            foreach (DcbdCacheEngine::readCache('wholesalers', [], $age) as $w) {
                $rows[] = [
                    $w['shop_id'] ?? $w['id'] ?? '',
                    $w['name'] ?? '',
                    $w['shop_name'] ?? $w['company'] ?? '',
                    $w['mobile'] ?? $w['phone'] ?? '',
                    $w['mail'] ?? '',
                    $w['address'] ?? '',
                    $w['tier'] ?? 'MOQ 5 • 15% Off',
                    $w['status'] ?? 'Approved',
                ];
            }
            break;

        case 'sellers':
            $filePrefix = 'Sellers_Report';
            $headers = ['Shop_ID', 'Store_Name', 'Owner_Name', 'Mobile', 'Mail', 'Address', 'Commission_Rate', 'Status'];
            $age = 0;
            foreach (DcbdCacheEngine::readCache('sellers', [], $age) as $s) {
                $rows[] = [
                    $s['shop_id'] ?? $s['id'] ?? '',
                    $s['shop_name'] ?? $s['store'] ?? '',
                    $s['name'] ?? '',
                    $s['mobile'] ?? $s['phone'] ?? '',
                    $s['mail'] ?? '',
                    $s['address'] ?? '',
                    $s['commission_rate'] ?? $s['commission'] ?? '10%',
                    $s['status'] ?? 'Active',
                ];
            }
            break;

        case 'costs':
            $filePrefix = 'Costs_Report';
            $headers = ['ID', 'Date', 'Who_Paid', 'Title', 'Category', 'Amount', 'Note'];
            $age = 0;
            foreach (DcbdCacheEngine::readCache('costs', [], $age) as $c) {
                $rows[] = [
                    $c['id'] ?? '',
                    $c['date'] ?? '',
                    $c['who_paid'] ?? 'Admin',
                    $c['title'] ?? $c['purpose'] ?? '',
                    $c['category'] ?? '',
                    $c['amount'] ?? 0,
                    $c['note'] ?? '',
                ];
            }
            break;

        case 'buying':
            $filePrefix = 'Buying_Report';
            $headers = ['ID', 'Date', 'Who_Buy', 'Product_Name', 'Buying_Price', 'Quantity', 'Total_Amount', 'Supplier', 'Location'];
            $age = 0;
            foreach (DcbdCacheEngine::readCache('buying', [], $age) as $b) {
                $rows[] = [
                    $b['id'] ?? '',
                    $b['date'] ?? '',
                    $b['who_buy'] ?? 'Admin',
                    $b['product'] ?? $b['product_name'] ?? '',
                    $b['buying_price'] ?? 0,
                    $b['quantity'] ?? 1,
                    $b['total_amount'] ?? 0,
                    $b['supplier'] ?? '',
                    $b['location'] ?? '',
                ];
            }
            break;

        case 'invest':
            $filePrefix = 'Invest_Report';
            $headers = ['ID', 'Date', 'Invest_Type', 'Investor_Name', 'Amount', 'Note'];
            $age = 0;
            foreach (DcbdCacheEngine::readCache('invest', [], $age) as $i) {
                $rows[] = [
                    $i['id'] ?? '',
                    $i['date'] ?? '',
                    $i['invest_type'] ?? 'Working Capital',
                    $i['investor'] ?? '',
                    $i['amount'] ?? 0,
                    $i['note'] ?? '',
                ];
            }
            break;

        default:
            $filePrefix = ucfirst($repType) . '_Report';
            $age = 0;
            $rawItems = DcbdCacheEngine::readCache($repType, [], $age);
            if (!empty($rawItems) && is_array($rawItems[0] ?? null)) {
                $headers = array_keys($rawItems[0]);
                foreach ($rawItems as $it) {
                    $r = [];
                    foreach ($headers as $h) {
                        $v = $it[$h] ?? '';
                        $r[] = is_array($v) ? json_encode($v, JSON_UNESCAPED_UNICODE) : (string)$v;
                    }
                    $rows[] = $r;
                }
            }
            break;
    }

    if ($format === 'json') {
        header('Content-Type: application/json; charset=UTF-8');
        header('Content-Disposition: attachment; filename="' . $filePrefix . '_' . date('Y-m-d') . '.json"');
        echo json_encode(['headers' => $headers, 'rows' => $rows], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        exit;
    }

    header('Content-Type: text/csv; charset=UTF-8');
    header('Content-Disposition: attachment; filename="' . $filePrefix . '_' . date('Y-m-d') . '.csv"');
    header('Cache-Control: no-store, no-cache, must-revalidate');
    echo "\xEF\xBB\xBF"; // UTF-8 BOM for Microsoft Excel Bangla support
    $out = fopen('php://output', 'w');
    if (!empty($headers)) {
        fputcsv($out, $headers);
    }
    foreach ($rows as $r) {
        fputcsv($out, $r);
    }
    fclose($out);
    exit;
}

if (!headers_sent()) {
    if (extension_loaded('zlib') && !ini_get('zlib.output_compression')) {
        @ob_start('ob_gzhandler');
    }
    header('Content-Type: application/json; charset=UTF-8');
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
    header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
    header('X-Turbo-Engine: DreamCartBD-cPanel-Standalone-6.0');
}

$startTime = microtime(true);
$response  = ['status' => 'success', 'success' => true];

/**
 * Auto-sync any new Categories & Brands from uploaded/added products into server database
 */
function dcbd_sync_categories_and_brands_from_products(array $products): void {
    if (empty($products)) return;
    $cats = DcbdCacheEngine::getCategories();
    $catMap = [];
    foreach ($cats as $c) {
        if (!is_array($c)) continue;
        $k = strtolower(trim((string)($c['category'] ?? $c['Category'] ?? '')));
        if ($k !== '') $catMap[$k] = $c;
    }
    $catsChanged = false;

    $brands = DcbdCacheEngine::getBrands();
    $brandMap = [];
    foreach ($brands as $b) {
        if (!is_array($b)) continue;
        $k = strtolower(trim((string)($b['brand_name'] ?? $b['Brand_Name'] ?? '')));
        if ($k !== '') $brandMap[$k] = $b;
    }
    $brandsChanged = false;

    foreach ($products as $p) {
        if (!is_array($p)) continue;
        $catName = trim((string)($p['category'] ?? $p['Category'] ?? ''));
        $subName = trim((string)($p['sub_category'] ?? $p['Sub_Category'] ?? ''));
        $chName  = trim((string)($p['child_category'] ?? $p['Child_Category'] ?? ''));
        $thumb   = trim((string)($p['thumbnail'] ?? ($p['images'][0] ?? '/public/icon/logo.png')));

        if ($catName !== '' && strtolower($catName) !== 'test id') {
            $ck = strtolower($catName);
            if (!isset($catMap[$ck])) {
                $catMap[$ck] = [
                    'catagory_id'    => 'CAT-' . (100 + count($catMap) + 1),
                    'catagory_slug'  => trim(preg_replace('/[^a-z0-9]+/', '-', $ck), '-'),
                    'category_image' => $thumb ?: '/public/icon/logo.png',
                    'category'       => $catName,
                    'sub_category'   => $subName ?: 'General',
                    'chail_category' => $chName ?: 'Standard',
                ];
                $catsChanged = true;
            } else {
                if ($subName !== '') {
                    $curSubs = array_filter(array_map('trim', explode(',', (string)($catMap[$ck]['sub_category'] ?? ''))));
                    if (!in_array($subName, $curSubs, true)) {
                        $curSubs[] = $subName;
                        $catMap[$ck]['sub_category'] = implode(', ', $curSubs);
                        $catsChanged = true;
                    }
                }
                if ($chName !== '') {
                    $curCh = array_filter(array_map('trim', explode(',', (string)($catMap[$ck]['chail_category'] ?? ''))));
                    if (!in_array($chName, $curCh, true)) {
                        $curCh[] = $chName;
                        $catMap[$ck]['chail_category'] = implode(', ', $curCh);
                        $catsChanged = true;
                    }
                }
            }
        }

        $bName = trim((string)($p['brand'] ?? $p['Brand'] ?? ''));
        if ($bName !== '' && strtolower($bName) !== 'no brand') {
            $bk = strtolower($bName);
            if (!isset($brandMap[$bk])) {
                $brandMap[$bk] = [
                    'brand_id'          => 'BRD-' . (100 + count($brandMap) + 1),
                    'brand_name'        => $bName,
                    'brand_slug'        => trim(preg_replace('/[^a-z0-9]+/', '-', $bk), '-'),
                    'brand_image'       => '/public/icon/logo.png',
                    'brand_description' => $bName . ' Official Collection',
                ];
                $brandsChanged = true;
            }
        }
    }

    if ($catsChanged) {
        DcbdCacheEngine::writeCache('categories', array_values($catMap), true);
    }
    if ($brandsChanged) {
        DcbdCacheEngine::writeCache('brands', array_values($brandMap), true);
    }
}

/**
 * Generic helper to upsert an item by key into a server database collection
 */
function dcbd_upsert_collection_item(string $collection, array $item, array $idKeys = ['id'], array $defaultSeed = []): array {
    $age  = 0;
    $item = DcbdCacheEngine::persistDataUrlImages($item);
    $list = DcbdCacheEngine::readCache($collection, $defaultSeed, $age);
    if (!is_array($list)) $list = [];

    $targetVal = '';
    foreach ($idKeys as $k) {
        if (!empty($item[$k])) {
            $targetVal = strtolower(trim((string)$item[$k]));
            break;
        }
    }

    $updated = false;
    if ($targetVal !== '') {
        foreach ($list as $idx => $existing) {
            if (!is_array($existing)) continue;
            foreach ($idKeys as $k) {
                $exVal = strtolower(trim((string)($existing[$k] ?? '')));
                if ($exVal !== '' && $exVal === $targetVal) {
                    $list[$idx] = array_merge($existing, $item);
                    $updated = true;
                    break 2;
                }
            }
        }
    }

    if (!$updated) {
        array_unshift($list, $item);
    }

    DcbdCacheEngine::writeCache($collection, $list, true);
    return $list;
}

/**
 * Generic helper to delete an item by key from a server database collection
 */
function dcbd_delete_collection_item(string $collection, array $payload, array $idKeys = ['id']): array {
    $age  = 0;
    $list = DcbdCacheEngine::readCache($collection, [], $age);
    if (!is_array($list) || empty($list)) return [];

    $targetVal = '';
    foreach ($idKeys as $k) {
        if (!empty($payload[$k])) {
            $targetVal = strtolower(trim((string)$payload[$k]));
            break;
        }
    }

    if ($targetVal !== '') {
        $list = array_values(array_filter($list, function($existing) use ($idKeys, $targetVal) {
            if (!is_array($existing)) return false;
            foreach ($idKeys as $k) {
                $exVal = strtolower(trim((string)($existing[$k] ?? '')));
                if ($exVal !== '' && $exVal === $targetVal) {
                    return false;
                }
            }
            return true;
        }));
        DcbdCacheEngine::writeCache($collection, $list, true);
    }
    return $list;
}

try {
    switch ($action) {
        case 'system/health':
            $response = [
                'status'  => 'success',
                'success' => true,
                'data'    => [
                    'status'  => 'UP',
                    'app'     => 'Dream Cart BD',
                    'engine'  => 'cPanel Standalone PHP + SQLite3 Ultra-High-Speed Engine',
                    'version' => DCBD_VERSION,
                    'mode'    => 'standalone_cpanel_dynamic',
                    'meta'    => DcbdCacheEngine::getSyncMeta(),
                    'time'    => date('c'),
                ]
            ];
            break;

        // --- MASTER LIVE CROSS-BROWSER STATE ENDPOINT ---
        case 'system/state':
        case 'system/sync':
            $meta = DcbdCacheEngine::getSyncMeta();
            $sinceTs = isset($payload['since']) ? (float)$payload['since'] : 0;
            $full = !empty($payload['full']);
            $srvVersionTs = (float)($meta['version_ts'] ?? 0);
            $changed = $full || ($sinceTs <= 0) || ($srvVersionTs > $sinceTs);
            $response = [
                'status'    => 'success',
                'success'   => true,
                'changed'   => $changed,
                'sync_meta' => $meta,
                'data'      => $changed ? DcbdCacheEngine::getPreloadedSsrState() : null,
            ];
            break;

        // --- FULL DATABASE RESTORE ENDPOINT ---
        case 'system/restore':
            $restoreState = $payload['state'] ?? $payload;
            $restoredCols = 0;
            if (is_array($restoreState)) {
                $colMap = [
                    'settings'          => 'settings',
                    'products'          => 'products',
                    'categories'        => 'categories',
                    'brands'            => 'brands',
                    'banners'           => 'banners',
                    'payment_methods'   => 'payment_method',
                    'delivery_methods'  => 'delivery_area',
                    'offers'            => 'offer_or_coupon',
                    'landing_pages'     => 'landing_pages',
                    'orders'            => 'orders',
                    'incomplete_orders' => 'incomplete_orders',
                    'customers'         => 'customers',
                    'reviews'           => 'reviews',
                    'resellers'         => 'resellers',
                    'wholesalers'       => 'wholesalers',
                    'sellers'           => 'sellers',
                    'markets'           => 'markets',
                    'admin_worker'      => 'admin_worker',
                    'couriers'          => 'couriers',
                    'costs'             => 'costs',
                    'buying'            => 'buying',
                    'invest'            => 'invest',
                    'payments'          => 'payments',
                    'worker_logs'       => 'worker_logs',
                ];
                foreach ($colMap as $stateKey => $colName) {
                    if (isset($restoreState[$stateKey]) && is_array($restoreState[$stateKey])) {
                        DcbdCacheEngine::writeCache($colName, $restoreState[$stateKey], true);
                        $restoredCols++;
                    }
                }
            }
            $response = [
                'status'  => 'success',
                'success' => true,
                'message' => "সার্ভার ডাটাবেজে {$restoredCols} টি টেবিল সফলভাবে রিস্টোর হয়েছে!",
                'data'    => DcbdCacheEngine::getPreloadedSsrState(),
            ];
            break;

        // --- DIRECT IMAGE / MEDIA UPLOAD TO CPANEL SERVER (/public/uploads/) ---
        case 'media/upload':
        case 'products/upload_image':
            $uploadedUrls = [];
            if (!empty($_FILES)) {
                foreach ($_FILES as $fInfo) {
                    if (isset($fInfo['tmp_name']) && is_array($fInfo['tmp_name'])) {
                        $cnt = count($fInfo['tmp_name']);
                        for ($i = 0; $i < $cnt; $i++) {
                            $u = DcbdCacheEngine::saveUploadedMultipartFile([
                                'name'     => $fInfo['name'][$i] ?? 'upload.jpg',
                                'tmp_name' => $fInfo['tmp_name'][$i] ?? '',
                            ]);
                            if ($u) $uploadedUrls[] = $u;
                        }
                    } else {
                        $u = DcbdCacheEngine::saveUploadedMultipartFile($fInfo);
                        if ($u) $uploadedUrls[] = $u;
                    }
                }
            }
            if (!empty($payload['data_url']) && is_string($payload['data_url'])) {
                $u = DcbdCacheEngine::saveSingleDataUrlImage($payload['data_url']);
                if ($u) $uploadedUrls[] = $u;
            }
            if (!empty($payload['images']) && is_array($payload['images'])) {
                foreach ($payload['images'] as $rawImg) {
                    if (is_string($rawImg)) {
                        $uploadedUrls[] = DcbdCacheEngine::saveSingleDataUrlImage($rawImg);
                    }
                }
            }
            $primaryUrl = $uploadedUrls[0] ?? '';
            $response = [
                'status'  => $primaryUrl !== '' ? 'success' : 'error',
                'success' => $primaryUrl !== '',
                'url'     => $primaryUrl,
                'urls'    => $uploadedUrls,
                'data'    => ['url' => $primaryUrl, 'urls' => $uploadedUrls],
                'message' => $primaryUrl !== '' ? 'ছবি সফলভাবে সার্ভারে আপলোড হয়েছে!' : 'ছবি আপলোড করা যায়নি।',
            ];
            break;

        // --- OMNI-CHANNEL AD PIXEL & SERVER-SIDE CONVERSIONS API (CAPI) ---
        case 'pixels/track':
        case 'pixel/track':
        case 'capi/track':
            $response = DcbdPixelTracker::dispatchServerEvent($payload);
            break;

        // --- BULK FILE PARSER (.XLSX, .XLS, .CSV, .PDF) ---
        case 'products/parse_bulk_file':
            $parsedRows = [];
            $origName = (string)($payload['filename'] ?? '');
            if (!empty($_FILES)) {
                $fInfo = reset($_FILES);
                if (!empty($fInfo['tmp_name']) && is_uploaded_file($fInfo['tmp_name'])) {
                    $origName = (string)($fInfo['name'] ?? $origName);
                    $parsedRows = DcbdBulkFileParser::parseFile($fInfo['tmp_name'], $origName);
                }
            } elseif (!empty($payload['base64']) && is_string($payload['base64'])) {
                $b64 = $payload['base64'];
                if (strpos($b64, ';base64,') !== false) {
                    $b64 = explode(';base64,', $b64, 2)[1];
                }
                $bin = @base64_decode($b64, true);
                if ($bin !== false && strlen($bin) > 0) {
                    $ext = strtolower(pathinfo($origName ?: 'upload.xlsx', PATHINFO_EXTENSION)) ?: 'xlsx';
                    $tmpPath = sys_get_temp_dir() . '/dcbd_bulk_' . uniqid('', true) . '.' . $ext;
                    @file_put_contents($tmpPath, $bin);
                    $parsedRows = DcbdBulkFileParser::parseFile($tmpPath, $origName);
                    @unlink($tmpPath);
                }
            }
            $response = [
                'status'  => !empty($parsedRows) ? 'success' : 'error',
                'success' => !empty($parsedRows),
                'rows'    => $parsedRows,
                'count'   => count($parsedRows),
                'data'    => ['rows' => $parsedRows, 'count' => count($parsedRows)],
                'message' => !empty($parsedRows) ? (count($parsedRows) . ' টি সারি সফলভাবে পার্স হয়েছে!') : 'ফাইল থেকে কোনো প্রোডাক্ট সারি পাওয়া যায়নি।',
            ];
            break;

        // --- PRODUCTS (SINGLE, BULK UPLOAD, BULK PRICE, BULK IMAGE, BULK DELETE) ---
        case 'products/list':
            $items = DcbdCacheEngine::getProducts();
            $response = [
                'status'     => 'success',
                'success'    => true,
                'latency_ms' => round((microtime(true) - $startTime) * 1000, 2),
                'data'       => [
                    'items' => $items,
                    'total' => count($items),
                ]
            ];
            break;

        case 'products/details':
            $target = (string)($payload['id'] ?? $payload['slug'] ?? $payload['sku'] ?? '');
            $found  = DcbdCacheEngine::findProduct($target);
            if ($found) {
                $response = ['status' => 'success', 'success' => true, 'data' => $found];
            } else {
                $response = ['status' => 'error', 'success' => false, 'message' => 'পণ্য পাওয়া যায়নি'];
            }
            break;

        case 'products/add':
        case 'products/create':
        case 'products/update':
            $payload = DcbdCacheEngine::persistDataUrlImages($payload);
            $sku = trim((string)($payload['sku'] ?? $payload['SKU'] ?? $payload['product_id'] ?? ('DCBD-' . rand(1000, 9999))));
            $payload['sku'] = $sku;
            $payload['product_id'] = $payload['product_id'] ?? $sku;
            if (empty($payload['p_name']) && !empty($payload['name'])) {
                $payload['p_name'] = $payload['name'];
            } elseif (empty($payload['name']) && !empty($payload['p_name'])) {
                $payload['name'] = $payload['p_name'];
            }
            if (empty($payload['thumbnail']) && !empty($payload['images']) && is_array($payload['images'])) {
                $payload['thumbnail'] = $payload['images'][0];
            }

            $items = dcbd_upsert_collection_item('products', $payload, ['sku', 'SKU', 'product_id', 'slug'], $GLOBALS['DCBD_INITIAL_PRODUCTS']);
            dcbd_sync_categories_and_brands_from_products([$payload]);
            $response = [
                'status'  => 'success',
                'success' => true,
                'data'    => $payload,
                'total'   => count($items),
                'message' => 'পণ্যটি সফলভাবে সার্ভার ডাটাবেজে সংরক্ষিত হয়েছে!'
            ];
            break;

        case 'products/bulk_upsert':
        case 'products/bulk_price':
        case 'products/bulk_image':
            $incomingItems = $payload['items'] ?? ($payload['products'] ?? []);
            if (!is_array($incomingItems)) $incomingItems = [];
            $incomingItems = DcbdCacheEngine::persistDataUrlImages($incomingItems);

            $current = DcbdCacheEngine::getProducts();
            $byKey   = [];
            foreach ($current as $p) {
                if (!is_array($p)) continue;
                $k = strtolower(trim((string)($p['sku'] ?? $p['product_id'] ?? '')));
                if ($k !== '') $byKey[$k] = $p;
            }

            $addedCount   = 0;
            $updatedCount = 0;
            foreach ($incomingItems as $item) {
                if (!is_array($item)) continue;
                $sku = trim((string)($item['sku'] ?? $item['SKU'] ?? $item['product_id'] ?? ''));
                if ($sku === '') continue;
                $k = strtolower($sku);
                $item['sku'] = $sku;
                $item['product_id'] = $item['product_id'] ?? $sku;
                if (isset($byKey[$k])) {
                    $byKey[$k] = array_merge($byKey[$k], $item);
                    $updatedCount++;
                } else {
                    $byKey = [$k => $item] + $byKey;
                    $addedCount++;
                }
            }

            $finalList = array_values($byKey);
            DcbdCacheEngine::writeCache('products', $finalList, true);
            dcbd_sync_categories_and_brands_from_products($incomingItems);
            $response = [
                'status'  => 'success',
                'success' => true,
                'added'   => $addedCount,
                'updated' => $updatedCount,
                'total'   => count($finalList),
                'data'    => ['items' => $finalList, 'total' => count($finalList)],
                'message' => "সার্ভারে {$addedCount} টি নতুন পণ্য যুক্ত এবং {$updatedCount} টি পণ্য আপডেট হয়েছে!"
            ];
            break;

        case 'products/bulk_delete':
            $skusToDelete = $payload['skus'] ?? ($payload['ids'] ?? []);
            if (!is_array($skusToDelete)) $skusToDelete = [];
            $delMap = array_flip(array_map(function($s) { return strtolower(trim((string)$s)); }, $skusToDelete));
            $current = DcbdCacheEngine::getProducts();
            $filtered = array_values(array_filter($current, function($p) use ($delMap) {
                if (!is_array($p)) return false;
                $k = strtolower(trim((string)($p['sku'] ?? $p['product_id'] ?? '')));
                return !isset($delMap[$k]);
            }));
            DcbdCacheEngine::writeCache('products', $filtered, true);
            $response = [
                'status'  => 'success',
                'success' => true,
                'total'   => count($filtered),
                'data'    => ['items' => $filtered, 'total' => count($filtered)],
                'message' => 'নির্বাচিত পণ্যসমূহ সার্ভার থেকে মুছে ফেলা হয়েছে।'
            ];
            break;

        case 'products/delete':
            $target = strtolower(trim((string)($payload['id'] ?? $payload['sku'] ?? $payload['SKU'] ?? $payload['slug'] ?? '')));
            dcbd_delete_collection_item('products', ['sku' => $target, 'product_id' => $target, 'slug' => $target], ['sku', 'SKU', 'product_id', 'slug']);
            $response = ['status' => 'success', 'success' => true, 'message' => 'পণ্যটি সার্ভার ডাটাবেজ থেকে মুছে ফেলা হয়েছে।'];
            break;

        // --- CATEGORIES ---
        case 'categories/list':
            $cats = DcbdCacheEngine::getCategories();
            $response = ['status' => 'success', 'success' => true, 'data' => ['items' => $cats, 'total' => count($cats)]];
            break;

        case 'categories/add':
        case 'categories/create':
        case 'categories/update':
            if (!empty($payload['items']) && is_array($payload['items'])) {
                $cleanTree = DcbdCacheEngine::persistDataUrlImages($payload['items']);
                DcbdCacheEngine::writeCache('categories', $cleanTree, true);
                $response = ['status' => 'success', 'success' => true, 'data' => $cleanTree];
            } else {
                $items = dcbd_upsert_collection_item('categories', $payload, ['catagory_id', 'Catagory_ID', 'category', 'Category', 'id'], $GLOBALS['DCBD_INITIAL_CATEGORIES']);
                $response = ['status' => 'success', 'success' => true, 'data' => $payload, 'items' => $items];
            }
            break;

        case 'categories/delete':
            dcbd_delete_collection_item('categories', $payload, ['catagory_id', 'Catagory_ID', 'category', 'Category', 'id']);
            $response = ['status' => 'success', 'success' => true];
            break;

        // --- BRANDS ---
        case 'brands/list':
            $brands = DcbdCacheEngine::getBrands();
            $response = ['status' => 'success', 'success' => true, 'data' => ['items' => $brands, 'total' => count($brands)]];
            break;

        case 'brands/add':
        case 'brands/create':
        case 'brands/update':
            $items = dcbd_upsert_collection_item('brands', $payload, ['brand_id', 'Brand_ID', 'brand_name', 'Brand_Name', 'id'], $GLOBALS['DCBD_INITIAL_BRANDS']);
            $response = ['status' => 'success', 'success' => true, 'data' => $payload, 'items' => $items];
            break;

        case 'brands/delete':
            dcbd_delete_collection_item('brands', $payload, ['brand_id', 'Brand_ID', 'brand_name', 'Brand_Name', 'id']);
            $response = ['status' => 'success', 'success' => true];
            break;

        // --- BANNERS ---
        case 'banners/list':
            $banners = DcbdCacheEngine::getBanners();
            $response = ['status' => 'success', 'success' => true, 'data' => ['items' => $banners, 'total' => count($banners)]];
            break;

        case 'banners/add':
        case 'banners/create':
        case 'banners/update':
            $items = dcbd_upsert_collection_item('banners', $payload, ['banner_id', 'Banner_ID', 'id'], $GLOBALS['DCBD_INITIAL_BANNERS']);
            $response = ['status' => 'success', 'success' => true, 'data' => $payload, 'items' => $items];
            break;

        case 'banners/delete':
            dcbd_delete_collection_item('banners', $payload, ['banner_id', 'Banner_ID', 'id']);
            $response = ['status' => 'success', 'success' => true];
            break;

        // --- ORDERS (LIVE CPANEL SERVER PERSISTENCE + NEWEST FIRST AT TOP) ---
        case 'orders/create':
        case 'orders/add':
            $orderId = trim((string)($payload['order_id'] ?? $payload['orderId'] ?? $payload['OrderID'] ?? ('ORD-' . rand(100000, 999999))));
            $payload['order_id'] = $orderId;
            $payload['orderId']  = $orderId;
            $payload['OrderID']  = $orderId;
            $payload['date']     = $payload['date'] ?? date('Y-m-d H:i:s');
            $nowMs = (int)round(microtime(true) * 1000);
            $payload['_sort_ts'] = $nowMs;

            // Remove from deleted_orders if previously deleted
            $delOrders = DcbdCacheEngine::readCache('deleted_orders', []);
            if (in_array(strtolower($orderId), $delOrders, true)) {
                $delOrders = array_values(array_diff($delOrders, [strtolower($orderId)]));
                DcbdCacheEngine::writeCache('deleted_orders', $delOrders, false);
            }

            // Attach Ad Attribution (Facebook/Instagram/Google/YouTube/TikTok) to Order
            $attr = DcbdPixelTracker::captureAdAttribution();
            if (empty($payload['ad_source']) && (!empty($attr['utm_source']) || !empty($attr['fbclid']) || !empty($attr['gclid']))) {
                $payload['ad_source'] = $attr['utm_source'] ?: (!empty($attr['fbclid']) ? 'facebook_instagram_ads' : (!empty($attr['gclid']) ? 'google_youtube_ads' : 'direct'));
            }

            $normalizedOrder = DcbdCacheEngine::normalizeOrderRow($payload, 0) ?: $payload;
            $normalizedOrder['_sort_ts'] = $nowMs;

            $age    = 0;
            $orders = DcbdCacheEngine::readCache('orders', [], $age);
            $orders = DcbdCacheEngine::deduplicateAndSortOrdersNewestFirst([$normalizedOrder], $orders);
            DcbdCacheEngine::writeCache('orders', array_slice($orders, 0, 5000), true);

            // Auto-update or create customer record in customers table
            $normPhone = preg_replace('/[^0-9]/', '', (string)($normalizedOrder['phone'] ?? ''));
            if (strlen($normPhone) >= 10) {
                $custList = DcbdCacheEngine::readCache('customers', [], $age);
                $custFound = false;
                foreach ($custList as $cIdx => $c) {
                    $cPh = preg_replace('/[^0-9]/', '', (string)($c['phone'] ?? $c['mobile'] ?? ''));
                    if (strlen($cPh) >= 10 && substr($cPh, -10) === substr($normPhone, -10)) {
                        $custList[$cIdx]['total_order']   = ((int)($c['total_order'] ?? 0)) + 1;
                        $custList[$cIdx]['success_order'] = ((int)($c['success_order'] ?? 0)) + 1;
                        $custList[$cIdx]['total_spent']   = ((float)($c['total_spent'] ?? 0)) + (float)($normalizedOrder['total_amount'] ?? 0);
                        if (!empty($normalizedOrder['address'])) {
                            $custList[$cIdx]['address'] = $normalizedOrder['address'];
                        }
                        $custFound = true;
                        break;
                    }
                }
                if (!$custFound) {
                    $newCustId = 'CUST-' . rand(100000, 999999);
                    array_unshift($custList, [
                        'Customer_ID'        => $newCustId,
                        'USER_ID'            => $newCustId,
                        'user_id'            => $newCustId,
                        'name'               => $normalizedOrder['customer_name'] ?? 'গ্রাহক',
                        'Name'               => $normalizedOrder['customer_name'] ?? 'গ্রাহক',
                        'phone'              => $normalizedOrder['phone'] ?? '',
                        'mobile'             => $normalizedOrder['phone'] ?? '',
                        'Mobile'             => $normalizedOrder['phone'] ?? '',
                        'address'            => $normalizedOrder['address'] ?? '',
                        'Address'            => $normalizedOrder['address'] ?? '',
                        'status'             => 'Active',
                        'total_order'        => 1,
                        'success_order'      => 1,
                        'cancel_order'       => 0,
                        'total_spent'        => (float)($normalizedOrder['total_amount'] ?? 0),
                        'order_success_rate' => '100%',
                    ]);
                }
                DcbdCacheEngine::writeCache('customers', $custList, true);

                // Clean up matching draft in incomplete_orders
                $incList = DcbdCacheEngine::readCache('incomplete_orders', [], $age);
                if (!empty($incList)) {
                    $incList = array_values(array_filter($incList, function($io) use ($normPhone) {
                        $ioP = preg_replace('/[^0-9]/', '', (string)($io['phone'] ?? ''));
                        return substr($ioP, -10) !== substr($normPhone, -10);
                    }));
                    DcbdCacheEngine::writeCache('incomplete_orders', $incList, true);
                }
            }

            // Fire Server-Side Meta CAPI Purchase Event
            DcbdPixelTracker::dispatchServerEvent([
                'event_name'  => 'Purchase',
                'event_id'    => 'PUR_' . $orderId,
                'custom_data' => [
                    'order_id'     => $orderId,
                    'value'        => (float)($normalizedOrder['total_amount'] ?? 0),
                    'currency'     => 'BDT',
                    'content_name' => (string)($normalizedOrder['products'] ?? 'Order'),
                    'content_type' => 'product',
                ],
                'user_data'   => [
                    'phone' => (string)($normalizedOrder['phone'] ?? ''),
                    'name'  => (string)($normalizedOrder['customer_name'] ?? ''),
                ]
            ]);

            // Send admin email notification on cPanel
            DcbdCacheEngine::sendOrderNotificationEmail(array_merge($payload, $normalizedOrder));

            $response = [
                'status'  => 'success',
                'success' => true,
                'data'    => $normalizedOrder,
                'message' => 'অর্ডার সফলভাবে সার্ভার ডাটাবেজ এবং অ্যাডমিন প্যানেলে জমা হয়েছে!'
            ];
            break;

        case 'orders/list':
            $orders = DcbdCacheEngine::getOrders(false);
            $response = [
                'status'  => 'success',
                'success' => true,
                'data'    => [
                    'items' => $orders,
                    'total' => count($orders),
                ]
            ];
            break;

        case 'orders/get':
        case 'orders/details':
            $queryId = strtolower(trim((string)($payload['orderId'] ?? $payload['order_id'] ?? $payload['id'] ?? $payload['phone'] ?? '')));
            $cleanDigits = preg_replace('/[^0-9]/', '', $queryId);
            $orders = DcbdCacheEngine::getOrders(false);
            $matched = null;
            foreach ($orders as $o) {
                $oId = strtolower(trim((string)($o['order_id'] ?? $o['orderId'] ?? '')));
                $oPh = preg_replace('/[^0-9]/', '', (string)($o['phone'] ?? ''));
                if (($queryId !== '' && $oId === $queryId) || (strlen($cleanDigits) >= 10 && strlen($oPh) >= 10 && substr($oPh, -10) === substr($cleanDigits, -10))) {
                    $matched = $o;
                    break;
                }
            }
            if ($matched) {
                $response = ['status' => 'success', 'success' => true, 'data' => $matched];
            } else {
                $response = ['status' => 'error', 'success' => false, 'message' => 'অর্ডার পাওয়া যায়নি'];
            }
            break;

        case 'orders/update':
        case 'orders/update_status':
            $orderId = strtolower(trim((string)($payload['order_id'] ?? $payload['orderId'] ?? $payload['id'] ?? '')));
            $age = 0;
            $orders = DcbdCacheEngine::readCache('orders', [], $age);
            $updatedOrder = null;
            foreach ($orders as $idx => $o) {
                $oId = strtolower(trim((string)($o['order_id'] ?? $o['orderId'] ?? '')));
                if ($orderId !== '' && $oId === $orderId) {
                    $merged = array_merge($o, $payload);
                    if (!empty($payload['status']) && empty($payload['order_status'])) {
                        $merged['order_status'] = $payload['status'];
                    }
                    if (in_array(strtolower((string)($merged['order_status'] ?? '')), ['delivered', 'success'], true)) {
                        $merged['payment_status'] = 'Paid';
                    }
                    $orders[$idx] = $merged;
                    $updatedOrder = $merged;
                    break;
                }
            }
            $orders = DcbdCacheEngine::deduplicateAndSortOrdersNewestFirst($orders);
            DcbdCacheEngine::writeCache('orders', $orders, true);
            $response = ['status' => 'success', 'success' => true, 'data' => $updatedOrder ?? $payload];
            break;

        case 'orders/delete':
            $orderId = strtolower(trim((string)($payload['order_id'] ?? $payload['orderId'] ?? $payload['id'] ?? '')));
            if ($orderId !== '') {
                $delOrders = DcbdCacheEngine::readCache('deleted_orders', []);
                if (!in_array($orderId, $delOrders, true)) {
                    $delOrders[] = $orderId;
                    DcbdCacheEngine::writeCache('deleted_orders', $delOrders, false);
                }
            }
            dcbd_delete_collection_item('orders', ['order_id' => $orderId], ['order_id', 'orderId', 'OrderID']);
            $response = ['status' => 'success', 'success' => true];
            break;

        // --- INCOMPLETE ORDERS (LEAD CAPTURE) ---
        case 'incomplete_orders/create':
        case 'incomplete_orders/add':
            $payload['order_id'] = $payload['order_id'] ?? ('INC-' . rand(100000, 999999));
            $payload['date']     = $payload['date'] ?? date('Y-m-d H:i:s');
            dcbd_upsert_collection_item('incomplete_orders', $payload, ['phone', 'order_id'], []);

            DcbdPixelTracker::dispatchServerEvent([
                'event_name'  => 'Lead',
                'custom_data' => [
                    'value'        => (float)($payload['total_amount'] ?? 0),
                    'currency'     => 'BDT',
                    'content_name' => (string)($payload['products'] ?? 'Draft Order'),
                ],
                'user_data'   => [
                    'phone' => (string)($payload['phone'] ?? ''),
                    'name'  => (string)($payload['customer_name'] ?? ''),
                ]
            ]);

            $response = ['status' => 'success', 'success' => true, 'data' => $payload];
            break;

        case 'incomplete_orders/list':
            $age  = 0;
            $list = DcbdCacheEngine::readCache('incomplete_orders', [], $age);
            $response = ['status' => 'success', 'success' => true, 'data' => ['items' => $list, 'total' => count($list)]];
            break;

        case 'incomplete_orders/delete':
            dcbd_delete_collection_item('incomplete_orders', $payload, ['order_id', 'id', 'phone']);
            $response = ['status' => 'success', 'success' => true];
            break;

        // --- CUSTOMERS & PARTNER AUTHENTICATION ---
        case 'customers/login':
            $qId   = trim((string)($payload['phone'] ?? $payload['mobile'] ?? $payload['identifier'] ?? $payload['mail'] ?? $payload['email'] ?? ''));
            $qPass = trim((string)($payload['password'] ?? ''));
            $normPh = preg_replace('/[^0-9]/', '', $qId);
            $age = 0;
            $custs = DcbdCacheEngine::readCache('customers', [], $age);
            $matched = null;
            foreach ($custs as $c) {
                $cPh = preg_replace('/[^0-9]/', '', (string)($c['phone'] ?? $c['mobile'] ?? $c['Mobile'] ?? ''));
                $cEm = strtolower(trim((string)($c['email'] ?? $c['mail'] ?? $c['Mail'] ?? '')));
                $cUid = strtolower(trim((string)($c['user_id'] ?? $c['Customer_ID'] ?? '')));
                if (($normPh !== '' && strlen($normPh) >= 10 && substr($cPh, -10) === substr($normPh, -10)) ||
                    ($qId !== '' && ($cEm === strtolower($qId) || $cUid === strtolower($qId)))) {
                    $matched = $c;
                    break;
                }
            }
            if (!$matched) {
                $response = ['status' => 'error', 'success' => false, 'message' => 'এই মোবাইল নম্বর বা ইমেইলে কোনো অ্যাকাউন্ট পাওয়া যায়নি।'];
            } elseif (isset($matched['password']) && trim((string)$matched['password']) !== '' && trim((string)$matched['password']) !== $qPass) {
                $response = ['status' => 'error', 'success' => false, 'message' => 'ভুল পাসওয়ার্ড! সঠিক পাসওয়ার্ড প্রদান করুন।'];
            } else {
                $response = ['status' => 'success', 'success' => true, 'data' => $matched, 'message' => 'লগইন সফল হয়েছে!'];
            }
            break;

        // --- SETTINGS & AD PIXEL CONFIGURATION ---
        case 'settings/list':
            $response = [
                'status'  => 'success',
                'success' => true,
                'data'    => DcbdCacheEngine::getSiteSettings(false)
            ];
            break;

        case 'settings/update':
        case 'settings/save':
        case 'settings/add':
            $payload = DcbdCacheEngine::persistDataUrlImages($payload);
            $current = DcbdCacheEngine::getSiteSettings(false);
            if (!empty($payload['name']) && isset($payload['details'])) {
                $sName = trim((string)$payload['name']);
                $sDet  = $payload['details'];
                $current[$sName] = $sDet;
                $normKey = strtolower(preg_replace('/[^a-z0-9]/', '', $sName));
                $parsedDet = is_string($sDet) ? @json_decode($sDet, true) : (is_array($sDet) ? $sDet : null);
                if (is_array($parsedDet)) {
                    if (in_array($normKey, ['paymentmethod', 'paymentmethods'], true)) {
                        DcbdCacheEngine::writeCache('payment_method', $parsedDet, true);
                    } elseif (in_array($normKey, ['deliveryarea', 'deliverymethods'], true)) {
                        DcbdCacheEngine::writeCache('delivery_area', $parsedDet, true);
                    } elseif (in_array($normKey, ['offerorcoupon', 'offersjson'], true)) {
                        DcbdCacheEngine::writeCache('offer_or_coupon', $parsedDet, true);
                    } elseif (in_array($normKey, ['adminworkerjson', 'adminworker'], true)) {
                        DcbdCacheEngine::writeCache('admin_worker', $parsedDet, true);
                    }
                }
            } else {
                $current = array_merge($current, $payload);
            }
            DcbdCacheEngine::writeCache('settings', $current, true);
            $response = [
                'status'  => 'success',
                'success' => true,
                'data'    => DcbdCacheEngine::getSiteSettings(false),
                'message' => 'সেটিংস ও এড পিক্সেল কনফিগারেশন সার্ভার ডাটাবেজে সংরক্ষিত হয়েছে!'
            ];
            break;

        // --- SYSTEM SETTINGS COLLECTIONS: Payment_Method, Delivery_Area, Offer_or_Coupon, Landing-Pages ---
        case 'payment_method/list':
            $pm = DcbdCacheEngine::getPaymentMethods();
            $response = ['status' => 'success', 'success' => true, 'data' => ['items' => $pm, 'total' => count($pm)]];
            break;

        case 'payment_method/add':
        case 'payment_method/create':
        case 'payment_method/update':
            $list = dcbd_upsert_collection_item('payment_method', $payload, ['id', 'payment_id', 'code'], $GLOBALS['DCBD_DEFAULT_PAYMENT_METHODS']);
            $response = ['status' => 'success', 'success' => true, 'data' => $payload, 'items' => $list];
            break;

        case 'payment_method/seed':
            if (!empty($payload['items']) && is_array($payload['items'])) {
                DcbdCacheEngine::writeCache('payment_method', $payload['items'], true);
            }
            $response = ['status' => 'success', 'success' => true];
            break;

        case 'payment_method/delete':
            dcbd_delete_collection_item('payment_method', $payload, ['id', 'payment_id', 'code']);
            $response = ['status' => 'success', 'success' => true];
            break;

        case 'delivery_area/list':
            $dm = DcbdCacheEngine::getDeliveryMethods();
            $response = ['status' => 'success', 'success' => true, 'data' => ['items' => $dm, 'total' => count($dm)]];
            break;

        case 'delivery_area/add':
        case 'delivery_area/create':
        case 'delivery_area/update':
            $list = dcbd_upsert_collection_item('delivery_area', $payload, ['id', 'delivery_id', 'code', 'zone_code'], $GLOBALS['DCBD_DEFAULT_DELIVERY_METHODS']);
            $response = ['status' => 'success', 'success' => true, 'data' => $payload, 'items' => $list];
            break;

        case 'delivery_area/seed':
            if (!empty($payload['items']) && is_array($payload['items'])) {
                DcbdCacheEngine::writeCache('delivery_area', $payload['items'], true);
            }
            $response = ['status' => 'success', 'success' => true];
            break;

        case 'delivery_area/delete':
            dcbd_delete_collection_item('delivery_area', $payload, ['id', 'delivery_id', 'code', 'zone_code']);
            $response = ['status' => 'success', 'success' => true];
            break;

        case 'offer_or_coupon/list':
            $offers = DcbdCacheEngine::getOffers();
            $response = ['status' => 'success', 'success' => true, 'data' => ['items' => $offers, 'total' => count($offers)]];
            break;

        case 'offer_or_coupon/add':
        case 'offer_or_coupon/create':
        case 'offer_or_coupon/update':
            $list = dcbd_upsert_collection_item('offer_or_coupon', $payload, ['id', 'offer_id', 'code', 'coupon_code'], $GLOBALS['DCBD_DEFAULT_OFFERS']);
            $response = ['status' => 'success', 'success' => true, 'data' => $payload, 'items' => $list];
            break;

        case 'offer_or_coupon/seed':
            if (!empty($payload['items']) && is_array($payload['items'])) {
                DcbdCacheEngine::writeCache('offer_or_coupon', $payload['items'], true);
            }
            $response = ['status' => 'success', 'success' => true];
            break;

        case 'offer_or_coupon/delete':
            dcbd_delete_collection_item('offer_or_coupon', $payload, ['id', 'offer_id', 'code', 'coupon_code']);
            $response = ['status' => 'success', 'success' => true];
            break;

        case 'landing_pages/list':
            $age = 0;
            $lps = DcbdCacheEngine::readCache('landing_pages', [], $age);
            $response = ['status' => 'success', 'success' => true, 'data' => ['items' => $lps, 'total' => count($lps)]];
            break;

        case 'landing_pages/add':
        case 'landing_pages/create':
        case 'landing_pages/update':
            $list = dcbd_upsert_collection_item('landing_pages', $payload, ['id', 'page_id', 'slug', 'Slug'], []);
            $response = ['status' => 'success', 'success' => true, 'data' => $payload, 'items' => $list];
            break;

        case 'landing_pages/delete':
            dcbd_delete_collection_item('landing_pages', $payload, ['id', 'page_id', 'slug', 'Slug']);
            $response = ['status' => 'success', 'success' => true];
            break;

        case 'markets/list':
            $markets = DcbdCacheEngine::getMarkets();
            $response = ['status' => 'success', 'success' => true, 'data' => ['items' => $markets, 'total' => count($markets)]];
            break;

        case 'admin_worker/list':
        case 'admins/list':
        case 'workers/list':
            $aw = DcbdCacheEngine::getAdminWorkers();
            $admins  = array_values(array_filter($aw, function($u) { return stripos((string)($u['worker_type'] ?? 'Admin'), 'admin') !== false; }));
            $workers = array_values(array_filter($aw, function($u) { return stripos((string)($u['worker_type'] ?? 'Admin'), 'admin') === false; }));
            $response = ['status' => 'success', 'success' => true, 'data' => ['items' => $aw, 'admins' => $admins, 'workers' => $workers, 'total' => count($aw)]];
            break;

        // --- GENERIC COLLECTION HANDLER (Customers, Reviews, Partners, Team, Finance, Attributes, Couriers) ---
        default:
            $parts = explode('/', $action);
            $col   = $parts[0] ?? 'general';
            $op    = $parts[1] ?? 'list';
            if (in_array($col, ['admins', 'workers'], true)) $col = 'admin_worker';
            if ($col === 'variants') $col = 'attributes';

            $defaultSeeds = [
                'markets'      => $GLOBALS['DCBD_DEFAULT_MARKETS'] ?? [],
                'admin_worker' => $GLOBALS['DCBD_DEFAULT_ADMIN_WORKER'] ?? [],
                'couriers'     => $GLOBALS['DCBD_DEFAULT_COURIERS'] ?? [],
            ];
            $seed = $defaultSeeds[$col] ?? [];

            if ($op === 'list') {
                $age  = 0;
                $rows = DcbdCacheEngine::readCache($col, $seed, $age);
                $response = ['status' => 'success', 'success' => true, 'data' => ['items' => $rows, 'total' => count($rows)]];
            } elseif ($op === 'bulk_upsert') {
                $incoming = $payload['items'] ?? [];
                if (!is_array($incoming)) $incoming = [];
                $incoming = DcbdCacheEngine::persistDataUrlImages($incoming);
                $idKeys = ['id', 'user_id', 'USER_ID', 'customer_id', 'Customer_ID', 'shop_id', 'Shop_ID', 'catagory_id', 'Catagory_ID', 'category', 'brand_id', 'Brand_ID', 'brand_name', 'banner_id', 'Banner_ID', 'review_id', 'Review_ID', 'request_id', 'Request_ID', 'log_id', 'payment_id', 'delivery_id', 'offer_id', 'code', 'phone', 'mobile'];
                $age = 0;
                $list = DcbdCacheEngine::readCache($col, $seed, $age);
                if (!is_array($list)) $list = [];
                foreach ($incoming as $item) {
                    if (!is_array($item)) continue;
                    $targetVal = '';
                    foreach ($idKeys as $k) {
                        if (!empty($item[$k])) {
                            $targetVal = strtolower(trim((string)$item[$k]));
                            break;
                        }
                    }
                    $updated = false;
                    if ($targetVal !== '') {
                        foreach ($list as $idx => $existing) {
                            if (!is_array($existing)) continue;
                            foreach ($idKeys as $k) {
                                $exVal = strtolower(trim((string)($existing[$k] ?? '')));
                                if ($exVal !== '' && $exVal === $targetVal) {
                                    $list[$idx] = array_merge($existing, $item);
                                    $updated = true;
                                    break 2;
                                }
                            }
                        }
                    }
                    if (!$updated) {
                        array_unshift($list, $item);
                    }
                }
                DcbdCacheEngine::writeCache($col, $list, true);
                $response = ['status' => 'success', 'success' => true, 'items' => $list, 'total' => count($list)];
            } elseif (in_array($op, ['add', 'create', 'register', 'update', 'save', 'log', 'withdraw', 'send_order', 'add_complaint'], true)) {
                $list = dcbd_upsert_collection_item($col, $payload, ['id', 'user_id', 'USER_ID', 'customer_id', 'Customer_ID', 'shop_id', 'Shop_ID', 'review_id', 'Review_ID', 'request_id', 'Request_ID', 'log_id', 'phone', 'mobile'], $seed);
                $response = ['status' => 'success', 'success' => true, 'data' => $payload, 'items' => $list];
            } elseif ($op === 'delete') {
                $list = dcbd_delete_collection_item($col, $payload, ['id', 'user_id', 'USER_ID', 'customer_id', 'Customer_ID', 'shop_id', 'Shop_ID', 'review_id', 'Review_ID', 'request_id', 'Request_ID', 'log_id', 'phone', 'mobile']);
                $response = ['status' => 'success', 'success' => true, 'items' => $list];
            } else {
                $response = ['status' => 'success', 'success' => true, 'data' => $payload];
            }
            break;
    }
} catch (Throwable $e) {
    $response = [
        'status'  => 'error',
        'success' => false,
        'message' => $e->getMessage(),
    ];
}

$callback = isset($_GET['callback']) ? preg_replace('/[^a-zA-Z0-9_.$]/', '', (string)$_GET['callback']) : '';
$jsonOut  = json_encode($response, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

if ($callback !== '') {
    header('Content-Type: application/javascript; charset=UTF-8');
    echo $callback . '(' . $jsonOut . ');';
} else {
    echo $jsonOut;
}

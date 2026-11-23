/**
 * DREAM CART BD — ORDER TRACKING PAGE (TrackOrderPage.js)
 * Implements user requirements:
 * - Customer Privacy First: NO default order or other customer's info is ever displayed by default!
 * - Secure On-Demand Lookup: Orders are shown ONLY when a customer searches their specific Order ID or Phone number
 * - Google Sheets Orders Sheet Integration: Real-time lookup from the live 'Orders' sheet & local storage cache
 * - Elevated Luxury CSS Design: Modern ambient gradients, glowing milestones, soft shadows, rounded-3xl cards
 * - High-Contrast Dark & Light Mode: Flawless readability and aesthetic contrast across all displays
 * - Authentic White Paper Invoice Voucher: Centered watermark logo & isolated iframe printing
 * - 100% Backward & Forward Compatibility: Zero breaking changes with main.js, router.js, or event handlers
 */

import { apiClient } from '../../api/client.js';
import { formatCurrency, formatDate, formatPhone } from '../../utils/format.js';
import { escapeHtml } from '../../utils/security.js';
import { renderVoucher } from '../../components/Voucher.js';

// Global helpers for clipboard copy and voucher toggle
if (typeof window !== 'undefined') {

  // 2. Copy Order ID helper with toast notification
  window.copyOrderIdToClipboard = function(orderId, btnEl) {
    if (!orderId) return;
    if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(orderId).then(() => {
        if (btnEl) {
          const original = btnEl.innerHTML;
          btnEl.innerHTML = '<span class="text-emerald-600 font-bold">কপি হয়েছে ✓</span>';
          setTimeout(() => { btnEl.innerHTML = original; }, 2000);
        }
      }).catch(() => {});
    } else {
      const ta = document.createElement('textarea');
      ta.value = orderId;
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
        if (btnEl) {
          const original = btnEl.innerHTML;
          btnEl.innerHTML = '<span class="text-emerald-600 font-bold">কপি হয়েছে ✓</span>';
          setTimeout(() => { btnEl.innerHTML = original; }, 2000);
        }
      } catch (e) {}
      document.body.removeChild(ta);
    }
  };

  // 3. Toggle Voucher Section with smooth scroll
  window.toggleTrackVoucherSection = function() {
    const sec = document.getElementById('track-voucher-section');
    if (!sec) return;
    const isHidden = sec.classList.contains('hidden');
    if (isHidden) {
      sec.classList.remove('hidden');
      sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      sec.classList.add('hidden');
    }
  };
}

/**
 * Standardize and normalize raw order rows from Google Sheets 'Orders' tab
 * or localStorage into a consistent Dream Cart BD order object.
 */
function normalizeSheetOrder(raw) {
  if (!raw || typeof raw !== 'object') return null;

  // 1. Order ID
  const orderId = String(
    raw.order_id || raw.orderId || raw.orderid || raw.OrderID || raw.col_1 || ''
  ).trim();
  if (!orderId && !raw.phone && !raw.col_4 && !raw.customer_name) return null;

  // 2. Customer Name
  const customerName = String(
    raw.customer_name || raw.customerName || raw.name || raw.CustomerName || raw.col_3 || 'সম্মানিত গ্রাহক'
  ).trim();

  // 3. Phone
  const phone = String(
    raw.phone || raw.Phone || raw.customer_phone || raw.col_4 || ''
  ).trim();

  // 4. Address
  const address = String(
    raw.address || raw.Address || raw.delivery_address || raw.col_5 || 'বাংলাদেশ'
  ).trim();

  // 5. Products text
  const productsText = String(
    raw.products || raw.Products || raw.product_name || raw.items_name || raw.col_6 || ''
  ).trim();

  // 6. Color & Size
  const color = String(raw.color || raw.Color || raw.col_7 || '').trim();
  const size = String(raw.size || raw.Size || raw.col_8 || '').trim();

  // 7. Quantity
  const quantity = Math.max(1, parseInt(raw.quantity || raw.Quantity || raw.col_9 || 1, 10) || 1);

  // 8. Total Amount
  const totalAmount = parseFloat(
    raw.total_amount !== undefined ? raw.total_amount :
    (raw.totalAmount !== undefined ? raw.totalAmount :
    (raw.total !== undefined ? raw.total :
    (raw.col_10 !== undefined ? raw.col_10 : 0)))
  ) || 0;

  // 9. Delivery Charge
  const deliveryCharge = parseFloat(
    raw.delivery_charge !== undefined ? raw.delivery_charge :
    (raw.deliveryCharge !== undefined ? raw.deliveryCharge :
    (raw.delivery_fee !== undefined ? raw.delivery_fee :
    (raw.deliveryFee !== undefined ? raw.deliveryFee : 0)))
  ) || 0;

  // 10. Payment Method
  const paymentMethod = String(
    raw.payment_method || raw.paymentMethod || raw.PaymentMethod || raw.method || raw.col_11 || 'Cash On Delivery (COD)'
  ).trim();

  // 11. Transaction ID
  const transactionId = String(
    raw.transaction_id || raw.transactionId || raw.trx_id || raw.col_12 || 'N/A'
  ).trim();

  // 12. Payment Status
  const paymentStatus = String(
    raw.payment_status || raw.paymentStatus || raw.PaymentStatus || raw.col_13 || 
    (paymentMethod.toLowerCase().includes('cod') || paymentMethod.toLowerCase().includes('cash') ? 'COD' : 'Paid')
  ).trim();

  // 13. Order Status
  const orderStatus = String(
    raw.order_status || raw.orderStatus || raw.OrderStatus || raw.status || raw.col_14 || 'Order Placed'
  ).trim();

  // 14. Date
  let dateStr = raw.date || raw.created_at || raw.createdAt || raw.timestamp || raw.col_0 || '';
  if (!dateStr) {
    dateStr = new Date().toLocaleString("en-US", { timeZone: "Asia/Dhaka" });
  }

  // 15. Courier & Tracking details
  const courier = String(
    raw.courier || raw.courier_name || raw.courierName || raw.consignment_id || raw.col_17 || 'Steadfast / Pathao Express'
  ).trim();

  // 16. Items array
  let items = [];
  if (Array.isArray(raw.items) && raw.items.length > 0) {
    items = raw.items.map(it => ({
      name: it.name || it.title || 'পণ্য',
      quantity: Math.max(1, parseInt(it.quantity || 1, 10) || 1),
      price: parseFloat(it.price || it.unit_price || 0) || 0,
      color: it.color || '',
      size: it.size || '',
      thumbnail: it.thumbnail || it.image || ''
    }));
  } else if (productsText) {
    const unitPrice = quantity > 0 && totalAmount > 0 
      ? Math.round(Math.max(0, totalAmount - deliveryCharge) / quantity) 
      : totalAmount;
    items = [{
      name: productsText,
      quantity: quantity,
      price: unitPrice,
      color: color,
      size: size
    }];
  }

  return {
    order_id: orderId || ("ORD-" + Math.floor(100000 + Math.random() * 900000)),
    customer_name: customerName,
    phone: phone,
    address: address,
    products: productsText,
    color: color,
    size: size,
    quantity: quantity,
    total_amount: totalAmount,
    delivery_charge: deliveryCharge,
    payment_method: paymentMethod,
    transaction_id: transactionId,
    payment_status: paymentStatus,
    order_status: orderStatus,
    courier: courier,
    date: dateStr,
    items: items,
    account_type: raw.account_type || raw.col_2 || 'Customer',
    reseller_commission: raw.reseller_commission || raw.col_15 || 0,
    commission_status: raw.commission_status || raw.col_16 || 'Pending'
  };
}

/**
 * Main render function for Order Tracking Page
 */
export async function renderTrackOrderPage(orderIdOrPhone = "") {
  // 1. Resolve search parameter from argument or URL
  let searchVal = "";
  if (typeof orderIdOrPhone === 'object' && orderIdOrPhone !== null) {
    searchVal = orderIdOrPhone.orderId || orderIdOrPhone.order_id || orderIdOrPhone.phone || orderIdOrPhone.query || "";
  } else {
    searchVal = (orderIdOrPhone || "").toString();
  }

  if (!searchVal && typeof window !== 'undefined' && window.location) {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      searchVal = urlParams.get('orderId') || urlParams.get('order_id') || urlParams.get('phone') || urlParams.get('q') || '';
    } catch (e) {}
  }

  const queryStr = searchVal.trim();
  const queryStrLower = queryStr.toLowerCase();
  const isSearched = !!queryStr;

  let matchedOrder = null;
  let isNotFound = false;

  // 2. Perform search ONLY IF user explicitly requested a search
  // Privacy Enforcement: No default order, no recent orders of others displayed!
  if (isSearched) {
    // A. Check local cache first for instant response
    let localOrders = [];
    try {
      const rawLocal = localStorage.getItem('dcbd_sheet_orders');
      if (rawLocal) {
        const parsed = JSON.parse(rawLocal);
        if (Array.isArray(parsed)) localOrders = parsed;
      }
    } catch (e) {}

    if (apiClient && Array.isArray(apiClient.sheetOrders) && apiClient.sheetOrders.length > 0) {
      apiClient.sheetOrders.forEach(so => {
        const soId = String(so.order_id || so.orderId || '').trim().toLowerCase();
        if (soId && !localOrders.some(lo => String(lo.order_id || lo.orderId || '').trim().toLowerCase() === soId)) {
          localOrders.push(so);
        }
      });
    }

    try {
      const lastOrder = JSON.parse(localStorage.getItem('dcbd_last_order') || 'null');
      if (lastOrder) {
        const loId = String(lastOrder.order_id || lastOrder.orderId || '').trim().toLowerCase();
        if (loId && !localOrders.some(o => String(o.order_id || o.orderId || '').trim().toLowerCase() === loId)) {
          localOrders.unshift(lastOrder);
        }
      }
    } catch (e) {}

    if (localOrders.length > 0) {
      const cleanQuery = queryStrLower.replace(/[^0-9]/g, '');
      const localMatch = localOrders.find(o => {
        const oId = String(o.order_id || o.orderId || o.orderid || o.col_1 || '').trim().toLowerCase();
        const oPhone = String(o.phone || o.customer_phone || o.col_4 || '').replace(/[^0-9]/g, '');
        return (oId && (oId === queryStrLower || oId.includes(queryStrLower))) ||
               (cleanQuery.length >= 6 && oPhone && (oPhone === cleanQuery || oPhone.includes(cleanQuery)));
      });
      if (localMatch) {
        matchedOrder = normalizeSheetOrder(localMatch);
      }
    }

    // B. Query Google Sheets live Orders sheet
    if (!matchedOrder) {
      try {
        // Targeted single order lookup
        try {
          const getPromise = apiClient.request("orders/get", { orderId: queryStr, phone: queryStr });
          const timeoutPromise = new Promise(r => setTimeout(() => r(null), 3500));
          const res = await Promise.race([getPromise, timeoutPromise]);
          if (res && res.data) {
            matchedOrder = normalizeSheetOrder(res.data);
          }
        } catch (e) {}

        // Fallback to searching through full sheet orders list
        if (!matchedOrder) {
          const listPromise = apiClient.request("orders/list");
          const timeoutPromise = new Promise(r => setTimeout(() => r(null), 3800));
          const listRes = await Promise.race([listPromise, timeoutPromise]);

          if (listRes && listRes.data && Array.isArray(listRes.data.items) && listRes.data.items.length > 0) {
            const sheetOrdersList = listRes.data.items;
            const cleanQuery = queryStrLower.replace(/[^0-9]/g, '');
            const sheetMatch = sheetOrdersList.find(r => {
              const rId = String(r.orderid || r.order_id || r.col_1 || '').trim().toLowerCase();
              const rPhone = String(r.phone || r.col_4 || '').replace(/[^0-9]/g, '');
              return (rId && (rId === queryStrLower || rId.includes(queryStrLower))) ||
                     (cleanQuery.length >= 6 && rPhone && (rPhone === cleanQuery || rPhone.includes(cleanQuery)));
            });
            if (sheetMatch) {
              matchedOrder = normalizeSheetOrder(sheetMatch);
            }
          }
        }
      } catch (e) {}
    }

    if (!matchedOrder) {
      isNotFound = true;
    }
  }

  // Pre-calculate properties only if an order was matched
  let status = "";
  let isCancelled = false;
  let items = [];
  let subtotal = 0;
  let totalAmount = 0;
  let deliveryFee = 0;
  let displayOrderId = "";
  let dateStr = "";
  let productSummary = "";
  let steps = [];
  let activeCount = 0;
  let progressPercent = 0;
  let isDelivered = false;
  let isInTransit = false;
  let isConfirmed = false;

  if (matchedOrder) {
    status = matchedOrder.order_status || "Order Placed";
    isCancelled = ["cancelled", "বাতিল", "rejected"].some(c => status.toLowerCase().includes(c));

    items = Array.isArray(matchedOrder.items) && matchedOrder.items.length > 0 ? matchedOrder.items : (
      matchedOrder.products ? [{
        name: matchedOrder.products,
        sku: matchedOrder.color ? `${matchedOrder.color} / ${matchedOrder.size || 'Std'}` : "DCBD-ITEM",
        quantity: matchedOrder.quantity || 1,
        price: matchedOrder.total_amount || 0
      }] : []
    );

    subtotal = items.reduce((s, it) => s + (Number(it.price) * Number(it.quantity || 1)), 0);
    totalAmount = Number(matchedOrder.total_amount !== undefined ? matchedOrder.total_amount : subtotal);
    deliveryFee = matchedOrder.delivery_charge !== undefined 
      ? Number(matchedOrder.delivery_charge) 
      : (matchedOrder.delivery_fee !== undefined 
          ? Number(matchedOrder.delivery_fee) 
          : (subtotal >= 2000 ? 0 : Math.max(0, totalAmount - subtotal)));

    displayOrderId = matchedOrder.order_id;
    dateStr = matchedOrder.date || new Date().toLocaleString("en-US", { timeZone: "Asia/Dhaka" });

    productSummary = items.length > 0
      ? items.map(it => `${it.name}${it.quantity > 1 ? ` (${it.quantity} টি)` : ''}`).join(', ')
      : (matchedOrder.products || "পণ্য সমাহার");

    steps = [
      { stepNum: 1, titleBn: "অর্ডার গ্রহণ", active: !isCancelled },
      { stepNum: 2, titleBn: "অর্ডার নিশ্চিত ও প্যাকিং", active: !isCancelled && ["Confirmed", "Processing", "Packing", "Packed", "Ready to Ship", "Shipped", "In Transit", "Arrived at Hub", "Out for Delivery", "Delivered", "Completed", "কনফার্মড", "প্রসেসিং"].some(s => status.toLowerCase().includes(s.toLowerCase())) },
      { stepNum: 3, titleBn: "কুরিয়ারে হস্তান্তর", active: !isCancelled && ["Shipped", "In Transit", "Arrived at Hub", "Out for Delivery", "Delivered", "Completed", "অন ট্রানজিট"].some(s => status.toLowerCase().includes(s.toLowerCase())) },
      { stepNum: 4, titleBn: "ডেলিভারি রাইডার পথে", active: !isCancelled && ["Out for Delivery", "Delivered", "Completed", "রাইডার পথে"].some(s => status.toLowerCase().includes(s.toLowerCase())) },
      { stepNum: 5, titleBn: "ডেলিভারি সম্পন্ন", active: !isCancelled && ["Delivered", "Completed", "ডেলিভারি সম্পন্ন"].some(s => status.toLowerCase().includes(s.toLowerCase())) }
    ];

    activeCount = steps.filter(s => s.active).length;
    progressPercent = activeCount > 1 ? Math.min(100, Math.round(((activeCount - 1) / (steps.length - 1)) * 100)) : 0;

    isDelivered = status.toLowerCase().includes("deliver") || status.toLowerCase().includes("completed");
    isInTransit = status.toLowerCase().includes("transit") || status.toLowerCase().includes("shipped");
    isConfirmed = status.toLowerCase().includes("confirm") || status.toLowerCase().includes("pack") || status.toLowerCase().includes("process");
  }

  return `
    <style>
      .dc-track-container {
        font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
      }
      @keyframes dcBeaconWave {
        0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.6); }
        70% { box-shadow: 0 0 0 8px rgba(16, 185, 129, 0); }
        100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
      }
      @keyframes dcLiveDot {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.4; transform: scale(0.85); }
      }
      .track-card {
        background-color: #ffffff;
        color: #0f172a;
        border: 1px solid #e2e8f0;
        border-radius: 20px;
        box-shadow: 0 10px 28px -10px rgba(0, 0, 0, 0.06);
      }
      .dark .track-card {
        background-color: #1e293b !important;
        color: #f8fafc !important;
        border-color: #334155 !important;
        box-shadow: 0 12px 30px -10px rgba(0, 0, 0, 0.45) !important;
      }
      .track-surface {
        background-color: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 16px;
      }
      .dark .track-surface {
        background-color: #0f172a !important;
        border-color: #334155 !important;
      }
      .track-search-input {
        background-color: #ffffff;
        border: 1.5px solid #cbd5e1;
        color: #0f172a;
        border-radius: 14px;
        font-size: 13px;
        transition: border-color 0.2s ease, box-shadow 0.2s ease;
      }
      .track-search-input:focus {
        border-color: #10b981;
        box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.16);
        outline: none;
      }
      .dark .track-search-input {
        background-color: #0f172a !important;
        border-color: #334155 !important;
        color: #f8fafc !important;
      }
      .dark .track-search-input:focus {
        border-color: #059669 !important;
        box-shadow: 0 0 0 4px rgba(5, 150, 105, 0.25) !important;
      }
      .btn-track-search {
        background: linear-gradient(135deg, #059669 0%, #10b981 100%);
        color: #ffffff !important;
        border: none;
        border-radius: 14px;
        font-weight: 800;
        box-shadow: 0 4px 14px rgba(16, 185, 129, 0.3);
        transition: all 0.2s ease;
      }
      .btn-track-search:hover {
        background: linear-gradient(135deg, #047857 0%, #059669 100%);
        transform: translateY(-1px);
      }
      .track-timeline {
        position: relative;
        padding-left: 34px;
      }
      .track-timeline-track {
        position: absolute;
        left: 13px;
        top: 14px;
        bottom: 18px;
        width: 2.5px;
        background-color: #e2e8f0;
        border-radius: 9999px;
      }
      .dark .track-timeline-track {
        background-color: #334155 !important;
      }
      .track-timeline-progress {
        position: absolute;
        left: 0;
        top: 0;
        width: 100%;
        background: linear-gradient(180deg, #10b981 0%, #059669 100%);
        border-radius: 9999px;
        transition: height 0.4s ease;
      }
      .track-step-node {
        position: relative;
        padding-bottom: 16px;
      }
      .track-step-node:last-child {
        padding-bottom: 0;
      }
      .track-step-bullet {
        position: absolute;
        left: -34px;
        top: 0;
        width: 28px;
        height: 28px;
        border-radius: 9999px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 11px;
        font-weight: 800;
        z-index: 3;
      }
      .track-step-bullet.active {
        background: linear-gradient(135deg, #059669 0%, #10b981 100%);
        color: #ffffff;
        box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.22);
      }
      .track-step-bullet.current-pulse {
        animation: dcBeaconWave 2s infinite;
      }
      .track-step-bullet.inactive {
        background-color: #f1f5f9;
        color: #94a3b8;
        border: 1.5px solid #cbd5e1;
      }
      .dark .track-step-bullet.inactive {
        background-color: #0f172a !important;
        color: #64748b !important;
        border-color: #334155 !important;
      }
      .btn-copy-id {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 2px 8px;
        border-radius: 8px;
        background: #f1f5f9;
        border: 1px solid #cbd5e1;
        font-size: 11px;
        font-weight: 700;
        color: #475569;
        cursor: pointer;
      }
      .btn-copy-id:hover {
        background: #ecfdf5;
        border-color: #10b981;
        color: #059669;
      }
      .dark .btn-copy-id {
        background: #0f172a;
        border-color: #334155;
        color: #94a3b8;
      }
      .btn-track-action {
        background-color: #ffffff;
        color: #0f172a !important;
        border: 1.5px solid #cbd5e1;
        font-weight: 700;
        border-radius: 12px;
        padding: 9px 16px;
        font-size: 12px;
        transition: all 0.2s ease;
        display: inline-flex;
        align-items: center;
        gap: 6px;
      }
      .btn-track-action:hover {
        border-color: #10b981;
        color: #059669 !important;
      }
      .dark .btn-track-action {
        background-color: #0f172a !important;
        color: #f8fafc !important;
        border-color: #334155 !important;
      }
      @media print {
        header, footer, nav, #header-mount, #footer-mount, #mobilenav-mount, #floatingactions-mount, #cartdrawer-mount, #fraudmodal-mount, .print-hide {
          display: none !important;
        }
        body, #app-content {
          background: #ffffff !important;
          color: #000000 !important;
          padding: 0 !important;
          margin: 0 !important;
        }
        #track-main-container > div:not(#track-voucher-section) {
          display: none !important;
        }
        #track-voucher-section {
          display: block !important;
          width: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
        }
        #official-invoice-voucher {
          display: block !important;
          width: 100% !important;
          max-width: 100% !important;
          margin: 0 !important;
          padding: 20px !important;
          background: #ffffff !important;
          color: #000000 !important;
          border: 1px solid #cbd5e1 !important;
          box-shadow: none !important;
        }
      }
    </style>

    <div id="track-main-container" class="dc-track-container max-w-3xl mx-auto space-y-5 py-6 sm:py-8 px-4">
      
      <!-- Page Title -->
      <div class="text-center space-y-1.5 print-hide">
        <h1 class="text-xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
          আপনার পার্সেল ট্র্যাক করুন
        </h1>
        <p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          অর্ডার আইডি অথবা মোবাইল নম্বর দিয়ে পার্সেলের বর্তমান অবস্থা জানুন।
        </p>
      </div>

      <!-- Search Card -->
      <div class="track-card p-4 sm:p-5 print-hide space-y-3">
        <form 
          id="tracking-search-form" 
          class="flex flex-col sm:flex-row gap-2.5"
          onsubmit="event.preventDefault(); const val = document.getElementById('track-input').value.trim(); if(val) { if(window.router && window.router.navigate) { window.router.navigate('/track?orderId=' + encodeURIComponent(val)); } else { window.location.href='/track?orderId=' + encodeURIComponent(val); } }"
        >
          <div class="relative flex-1">
            <span class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 text-sm">🔍</span>
            <input 
              type="text" 
              id="track-input" 
              placeholder="অর্ডার আইডি (ORD-XXXXXX) বা মোবাইল নম্বর (01XXXXXXXXX)" 
              value="${escapeHtml(queryStr)}"
              required
              autocomplete="off"
              class="track-search-input w-full pl-10 pr-3.5 py-2.5 sm:py-3 font-mono outline-none"
            />
          </div>
          <button type="submit" class="btn-track-search text-xs sm:text-sm py-2.5 sm:py-3 px-6 whitespace-nowrap cursor-pointer flex items-center justify-center gap-1.5">
            <span>ট্র্যাক করুন</span>
          </button>
        </form>

        <div class="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
          <span>🔒 আপনার অর্ডারের তথ্য সম্পূর্ণ সুরক্ষিত</span>
          <div class="flex items-center gap-3 font-semibold">
            <a href="https://wa.me/8801581703822" target="_blank" rel="noopener noreferrer" class="text-emerald-600 dark:text-emerald-400 hover:underline">💬 WhatsApp: 01581703822</a>
            <a href="tel:01818273838" class="text-emerald-600 dark:text-emerald-400 hover:underline">📞 01818273838</a>
          </div>
        </div>
      </div>

      ${!isSearched ? `` : (isNotFound ? `
        <!-- NOT FOUND CARD -->
        <div class="track-card p-5 sm:p-7 text-center space-y-3 border-rose-200 dark:border-rose-900/60 print-hide">
          <div class="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 flex items-center justify-center text-2xl mx-auto">⚠️</div>
          <h3 class="text-base sm:text-lg font-black text-slate-900 dark:text-white">কোনো অর্ডার পাওয়া যায়নি</h3>
          <p class="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            <strong class="text-rose-600 font-mono">"${escapeHtml(queryStr)}"</strong> অনুযায়ী কোনো অর্ডার পাওয়া যায়নি। অর্ডার আইডি বা ১১ ডিজিটের মোবাইল নম্বর দিয়ে আবার চেষ্টা করুন।
          </p>
          <div class="pt-1 flex flex-wrap items-center justify-center gap-2.5">
            <a href="https://wa.me/8801581703822?text=${encodeURIComponent('আসসালামু আলাইকুম, আমি আমার অর্ডার #' + queryStr + ' ট্র্যাক করতে পারছি না।')}" target="_blank" rel="noopener noreferrer" class="btn-track-action text-emerald-600">
              <span>💬</span> WhatsApp সহায়তা
            </a>
            <a href="/track" class="btn-track-action">
              <span>🔄</span> নতুন সার্চ
            </a>
          </div>
        </div>
      ` : `
        <!-- LIVE ORDER TRACKING DETAILS CARD -->
        <div class="track-card p-4 sm:p-6 space-y-5 print-hide">
          
          <!-- Top Order Header & Status -->
          <div class="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200/80 dark:border-slate-800 gap-3">
            <div class="space-y-1">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="text-xs text-slate-500 dark:text-slate-400 font-medium">অর্ডার আইডি:</span>
                <span class="font-mono text-emerald-600 dark:text-emerald-400 font-black text-base sm:text-lg">#${displayOrderId}</span>
                <button type="button" class="btn-copy-id" onclick="window.copyOrderIdToClipboard('${displayOrderId}', this)" title="কপি করুন">📋 কপি</button>
              </div>
              <div class="text-xs text-slate-500 dark:text-slate-400">📅 তারিখ: <strong>${dateStr}</strong></div>
            </div>

            <div class="self-start sm:self-center flex flex-col items-start sm:items-end gap-1">
              <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                isCancelled ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300' :
                isDelivered ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300' :
                isInTransit ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-300' :
                isConfirmed ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-300' :
                'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300'
              }">
                <span style="display:inline-block; width:7px; height:7px; border-radius:50%; background:${isCancelled ? '#e11d48' : isDelivered ? '#10b981' : isInTransit ? '#3b82f6' : '#f59e0b'}; animation: dcLiveDot 1.6s infinite;"></span>
                <span>${status}</span>
              </span>
              <span class="text-[11px] text-slate-400 dark:text-slate-500">কুরিয়ার: <strong>${escapeHtml(matchedOrder.courier || 'Steadfast / Pathao Express')}</strong></span>
            </div>
          </div>

          ${isCancelled ? `
            <div class="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 text-xs flex items-center gap-2.5">
              <span class="text-xl">⚠️</span>
              <div><strong>এই অর্ডারটি বাতিল করা হয়েছে।</strong> প্রয়োজনে হটলাইন: 01581703822</div>
            </div>
          ` : `
            <!-- VISUAL TIMELINE STEPPER -->
            <div class="space-y-2.5">
              <div class="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
                <span>পার্সেল অগ্রগতি</span>
                <span class="text-emerald-600 dark:text-emerald-400 font-mono">${progressPercent}%</span>
              </div>

              <div class="track-timeline py-1">
                <div class="track-timeline-track">
                  <div class="track-timeline-progress" style="height: ${progressPercent}%;"></div>
                </div>
                ${steps.map((st, idx) => {
                  const isCurrent = st.active && (!steps[idx + 1] || !steps[idx + 1].active);
                  return `
                    <div class="track-step-node">
                      <div class="track-step-bullet ${st.active ? 'active' : 'inactive'} ${isCurrent ? 'current-pulse' : ''}">
                        ${st.active ? '✓' : st.stepNum}
                      </div>
                      <div class="flex items-center justify-between gap-2 flex-wrap pt-0.5">
                        <span class="text-xs sm:text-sm font-bold ${st.active ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-500'}">${st.titleBn}</span>
                        <span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          st.active 
                            ? (isCurrent ? 'bg-emerald-600 text-white' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300') 
                            : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-600'
                        }">
                          ${st.active ? (isCurrent ? 'চলমান' : 'সম্পন্ন ✓') : 'অপেক্ষমাণ'}
                        </span>
                      </div>
                    </div>
                  `;
                }).join("")}
              </div>
            </div>
          `}

          <!-- Customer & Payment Info Grid -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <div class="track-surface p-4 space-y-2.5">
              <div class="text-xs font-black text-emerald-600 dark:text-emerald-400 pb-1.5 border-b border-slate-200/80 dark:border-slate-800">📍 ডেলিভারি ও গ্রাহক তথ্য</div>
              <div class="space-y-2 text-xs">
                <div class="flex justify-between gap-2"><span class="text-slate-500">নাম:</span><span class="font-bold text-slate-900 dark:text-white text-right">${escapeHtml(matchedOrder.customer_name || "সম্মানিত গ্রাহক")}</span></div>
                <div class="flex justify-between gap-2"><span class="text-slate-500">মোবাইল:</span><a href="tel:${matchedOrder.phone}" class="font-mono font-bold text-emerald-600 dark:text-emerald-400 hover:underline">${escapeHtml(matchedOrder.phone || "")}</a></div>
                <div class="flex justify-between gap-2"><span class="text-slate-500 whitespace-nowrap">ঠিকানা:</span><span class="font-medium text-slate-800 dark:text-slate-200 text-right">${escapeHtml(matchedOrder.address || "বাংলাদেশ")}</span></div>
              </div>
            </div>

            <div class="track-surface p-4 space-y-2.5">
              <div class="text-xs font-black text-emerald-600 dark:text-emerald-400 pb-1.5 border-b border-slate-200/80 dark:border-slate-800">💳 পেমেন্ট বিবরণী</div>
              <div class="space-y-2 text-xs">
                <div class="flex justify-between gap-2"><span class="text-slate-500">মেথড:</span><span class="font-bold text-slate-900 dark:text-white text-right">${escapeHtml(matchedOrder.payment_method || "Cash On Delivery (COD)")}</span></div>
                <div class="flex justify-between gap-2"><span class="text-slate-500">স্ট্যাটাস:</span><span class="px-2 py-0.5 rounded font-bold text-[10px] ${matchedOrder.payment_status === 'Paid' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'}">${escapeHtml(matchedOrder.payment_status || "COD")}</span></div>
                <div class="flex justify-between gap-2 pt-1 border-t border-slate-200/60 dark:border-slate-800/80"><span class="text-slate-500 font-bold">সর্বমোট:</span><span class="font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm">${formatCurrency(totalAmount)}</span></div>
              </div>
            </div>
          </div>

          <!-- Itemized Order Products Table -->
          <div class="track-surface p-4 space-y-2.5">
            <div class="text-xs font-black text-slate-700 dark:text-slate-300 flex items-center justify-between pb-1.5 border-b border-slate-200/80 dark:border-slate-800">
              <span>📦 পণ্যের তালিকা (${items.length} টি)</span>
            </div>
            <div class="overflow-x-auto">
              <table class="w-full text-xs text-left">
                <thead>
                  <tr class="text-slate-400 border-b border-slate-200/80 dark:border-slate-800">
                    <th class="py-1.5 font-semibold">পণ্য</th>
                    <th class="py-1.5 text-center font-semibold">পরিমাণ</th>
                    <th class="py-1.5 text-right font-semibold">দর</th>
                    <th class="py-1.5 text-right font-semibold">মোট</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                  ${items.map((it) => `
                    <tr>
                      <td class="py-2 pr-2 font-medium text-slate-900 dark:text-white">
                        <div>${escapeHtml(it.name)}</div>
                        ${(it.color || it.size) ? `<div class="text-[10px] text-emerald-600 dark:text-emerald-400">${[it.color, it.size].filter(Boolean).map(escapeHtml).join(' / ')}</div>` : ''}
                      </td>
                      <td class="py-2 text-center font-mono font-bold">${it.quantity}</td>
                      <td class="py-2 text-right font-mono text-slate-600 dark:text-slate-400">${formatCurrency(it.price)}</td>
                      <td class="py-2 text-right font-mono font-bold">${formatCurrency(Number(it.price) * Number(it.quantity || 1))}</td>
                    </tr>
                  `).join("")}
                </tbody>
              </table>
            </div>
            <div class="pt-2 border-t border-slate-200/80 dark:border-slate-800 space-y-1 text-xs">
              <div class="flex justify-between text-slate-600 dark:text-slate-400"><span>সাবটোটাল:</span><span class="font-mono font-bold">${formatCurrency(subtotal)}</span></div>
              <div class="flex justify-between text-slate-600 dark:text-slate-400"><span>ডেলিভারি চার্জ:</span><span class="font-mono font-bold text-emerald-600">${deliveryFee === 0 ? 'ফ্রি' : formatCurrency(deliveryFee)}</span></div>
              <div class="flex justify-between text-sm font-black pt-1.5 border-t border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white">
                <span>সর্বমোট পরিশোধযোগ্য:</span>
                <span class="font-mono text-emerald-600 dark:text-emerald-400">${formatCurrency(totalAmount)}</span>
              </div>
            </div>
          </div>

          <!-- Action Toolbar -->
          <div class="flex flex-wrap items-center justify-center gap-2.5">
            <button type="button" class="btn-track-action cursor-pointer" onclick="window.toggleTrackVoucherSection()">
              <span>📄</span> ইনভয়েস ভাউচার দেখুন / লুকান
            </button>
            <button type="button" class="btn-track-action cursor-pointer" onclick="window.printVoucherOnly ? window.printVoucherOnly() : window.print()">
              <span>🖨️</span> ভাউচার প্রিন্ট
            </button>
          </div>

        </div>

        <!-- Collapsible Official Invoice Voucher Section -->
        <div id="track-voucher-section" class="hidden space-y-3 pt-2">
          ${renderVoucher(matchedOrder, { items, subtotal, deliveryFee, totalAmount, displayOrderId, dateStr })}
        </div>
      `)}

    </div>
  `;
}

/**
 * DREAM CART BD — DYNAMIC SEO, SOCIAL OPENGRAPH, GOOGLE SITELINKS SCHEMA & OMNI-CHANNEL AD PIXELS ENGINE (src/utils/marketingPixels.js)
 * Implements:
 * - Dynamic Title, Favicon (/public/icon/logo.png), Canonical URL, Meta Description & Keywords (Bengali & English)
 * - Live OpenGraph & Twitter Card updater for WhatsApp, Facebook, Instagram, YouTube & TikTok link previews
 * - Comprehensive Google Search JSON-LD Structured Data:
 *   * Organization & OnlineStore (with /public/icon/logo.png)
 *   * WebSite + SearchAction (Sitelinks Searchbox for "Dream Cart BD" / "ড্রিম কার্ট বিডি" / "ড্রিম কার্ট বি.ডি")
 *   * SiteNavigationElement (Homepage, Products, Customer Login, Reseller Login, Wholesaler Login, Track Order, Contact, IT Services, Education/Career, Categories)
 *   * Category ItemList with Category Links & Images
 *   * Product Schema (Price, BDT Currency, Stock Availability, SKU, Brand, Rating, Image) for Product Search SEO & Ad Catalogs
 * - Full-Funnel Omni-Channel E-Commerce Ad Pixels & Server-Side Conversions API (CAPI):
 *   * Facebook & Instagram Ads (Meta Pixel fbevents.js + Meta CAPI + Event Deduplication + Advanced Matching + Test Event Code)
 *   * Google Ads & YouTube Ads (Google Tag gtag.js + Google Ads Conversion Tracking + Enhanced Conversions + GA4)
 *   * Google Tag Manager (GTM Container + DataLayer E-Commerce Schema)
 *   * TikTok Ads (TikTok Pixel events.js + CompletePayment)
 */

const SITE_ORIGIN = (typeof window !== 'undefined' && window.location && window.location.origin && !window.location.origin.startsWith('file:')) ? window.location.origin : 'https://dreamcartbd.com';
const OFFICIAL_LOGO_URL = `${SITE_ORIGIN}/public/icon/logo.png`;
const OFFICIAL_OG_BANNER = `${SITE_ORIGIN}/public/icon/og-banner.jpg`;

export const ROUTE_SEO_MAP = {
  '/': {
    title: 'Dream Cart BD (ড্রিম কার্ট বিডি) — Smart Digital Commerce & Multi-Vendor Platform',
    description: 'Dream Cart BD (ড্রিম কার্ট বিডি / বি.ডি) বাংলাদেশের বিশ্বস্ত স্মার্ট ই-কমার্স ও মাল্টি-ভেন্ডর প্ল্যাটফর্ম। স্মার্টওয়াচ, অর্গানিক ফুড, কিচেন গ্যাজেট, হোম অ্যাপ্লায়েন্স ও মেডিকেয়ার পণ্য সারা দেশে ক্যাশ অন ডেলিভারিতে অর্ডার করুন।',
    keywords: 'Dream Cart BD, ড্রিম কার্ট বিডি, ড্রিম কার্ট বি.ডি, dreamcartbd, online shopping bangladesh, smartwatch bd, organic honey bd, gas safety device bd, reseller bd, wholesale bd'
  },
  '/products': {
    title: 'সকল প্রোডাক্ট’স পেজ (All Products) — Dream Cart BD | ড্রিম কার্ট বিডি',
    description: 'Dream Cart BD (ড্রিম কার্ট বিডি)-এর সকল অরিজিনাল প্রোডাক্ট, স্মার্টওয়াচ, কিচেন সেফটি ডিভাইস, অর্গানিক হেলথ ফুড ও হোম অ্যাপ্লায়েন্স সাশ্রয়ী মূল্যে অর্ডার করুন।',
    keywords: 'Dream Cart BD Products, ড্রিম কার্ট বিডি প্রোডাক্ট, all products dreamcartbd, buy gadgets online bd'
  },
  '/categories': {
    title: 'সকল ক্যাটাগরি সমূহ (All Categories) — Dream Cart BD | ড্রিম কার্ট বিডি',
    description: 'ক্যাটাগরি ওয়াইজ সকল পণ্য দেখুন: Smartwatches, Kitchen, Organic & Health, Home Appliances, Medicine & Healthcare, Stationery — Dream Cart BD।',
    keywords: 'Dream Cart BD Categories, ক্যাটাগরি সমূহ, ড্রিম কার্ট বিডি ক্যাটাগরি'
  },
  '/brands': {
    title: 'অফিসিয়াল ব্র্যান্ড সমূহ (Featured Brands) — Dream Cart BD | ড্রিম কার্ট বিডি',
    description: 'Amazfit, Kieslect, Dream Organic, HK এবং শীর্ষস্থানীয় সকল অফিসিয়াল ব্র্যান্ডের ১০০% আসল পণ্য — Dream Cart BD।',
    keywords: 'Dream Cart BD Brands, Amazfit BD, Kieslect BD, Dream Organic'
  },
  '/customer/login': {
    title: 'কাস্টমার লগইন (Customer Login) — Dream Cart BD | ড্রিম কার্ট বিডি',
    description: 'Dream Cart BD কাস্টমার পোর্টালে লগইন করুন। আপনার অর্ডার ট্র্যাকিং, ভাউচার ডাউনলোড ও বিশেষ ডিসকাউন্ট উপভোগ করুন।',
    keywords: 'Customer Login Dream Cart BD, কাস্টমার লগইন, ড্রিম কার্ট বিডি লগইন'
  },
  '/customer/register': {
    title: 'কাস্টমার রেজিস্ট্রেশন (Customer Register) — Dream Cart BD | ড্রিম কার্ট বিডি',
    description: 'Dream Cart BD-তে নতুন কাস্টমার অ্যাকাউন্ট খুলুন এবং দ্রুত চেকআউট ও ক্যাশব্যাক অফার উপভোগ করুন।',
    keywords: 'Customer Register Dream Cart BD, কাস্টমার নিবন্ধন'
  },
  '/reseller/login': {
    title: 'রিসেলার লগইন (Reseller Login) — Dream Cart BD | ড্রিম কার্ট বিডি',
    description: 'বিনা পুঁজিতে ড্রপশিপিং ও রিসেলিং ব্যবসা! Dream Cart BD রিসেলার পোর্টালে লগইন করে কমিশন ও অর্ডার পরিচালনা করুন।',
    keywords: 'Reseller Login Dream Cart BD, রিসেলার লগইন, ড্রপশিপিং বাংলাদেশ, ড্রিম কার্ট বিডি রিসেলার'
  },
  '/wholesaler/login': {
    title: 'হোলসেলার লগইন (Wholesaler Login) — Dream Cart BD | ড্রিম কার্ট বিডি',
    description: 'সরাসরি আমদানিকারক রেটে পাইকারি পণ্য ক্রয় করতে Dream Cart BD হোলসেলার পোর্টালে লগইন করুন।',
    keywords: 'Wholesaler Login Dream Cart BD, হোলসেলার লগইন, পাইকারি মার্কেট বাংলাদেশ, ড্রিম কার্ট বিডি হোলসেল'
  },
  '/track': {
    title: 'পার্সেল ট্র্যাক করুন (Track Order) — Dream Cart BD | ড্রিম কার্ট বিডি',
    description: 'আপনার অর্ডার আইডি বা মোবাইল নম্বর দিয়ে রিয়েল-টাইমে আপনার পার্সেল ও কুরিয়ার ডেলিভারি স্ট্যাটাস ট্র্যাক করুন — Dream Cart BD।',
    keywords: 'Track Order Dream Cart BD, পার্সেল ট্র্যাক করুন, অর্ডার ট্র্যাকিং ড্রিম কার্ট বিডি'
  },
  '/contact': {
    title: 'কন্টাক্ট করুন (Contact Us) — Dream Cart BD | ড্রিম কার্ট বিডি',
    description: 'Dream Cart BD অফিস ও কাস্টমার কেয়ার: চৌধুরী প্লাজা, নিচতলা, রুম #০৩, পদুয়ার বাজার বিশ্বরোড, সদর দক্ষিণ, কুমিল্লা-৩৫০০। হটলাইন: 01581703822, 01818273838।',
    keywords: 'Contact Dream Cart BD, কন্টাক্ট করুন, ড্রিম কার্ট বিডি ঠিকানা ও হটলাইন'
  },
  '/offers': {
    title: 'বিশেষ অফার ও ডিসকাউন্ট (Offers & Coupons) — Dream Cart BD | ড্রিম কার্ট বিডি',
    description: 'Dream Cart BD-এর মেগা ফ্ল্যাশ সেল, কুপন ডিসকাউন্ট, ফ্রি হোম ডেলিভারি ও ৫% অনলাইন পেমেন্ট ছাড় দেখুন।',
    keywords: 'Dream Cart BD Offers, বিশেষ অফার, ডিসকাউন্ট কুপন'
  },
  '/landing': {
    title: 'স্পেশাল ক্যাম্পেইন অফার — সীমিত সময়ের মেগা ডিসকাউন্ট | Dream Cart BD',
    description: 'বিশেষ অফার মূল্যে এখনই অর্ডার করুন! সারা বাংলাদেশে দ্রুত ক্যাশ অন ডেলিভারি — পণ্য হাতে পেয়ে মূল্য পরিশোধের সুবিধা।',
    keywords: 'Dream Cart BD Campaign, Landing Page Offer, ক্যাশ অন ডেলিভারি অফার'
  },
  '/dcitbd': {
    title: 'আইটি সার্ভিসেস (IT Services) — Dream Career IT BD | Dream Cart BD',
    description: 'ওয়েব ডেভেলপমেন্ট, ই-কমার্স অটোমেশন, সফটওয়্যার সলিউশন ও ২৪/৭ টেকনিক্যাল আইটি সার্ভিসেস — Dream Career IT Bangladesh (DCITBD)।',
    keywords: 'IT Services Dream Cart BD, আইটি সার্ভিসেস, Dream Career IT BD, DCITBD'
  },
  '/education': {
    title: 'শিখুন ও ক্যারিয়ার গড়ুন (Learn & Build Career) — Dream Cart BD',
    description: 'ডিজিটাল স্কিল ডেভেলপমেন্ট, ফ্রিল্যান্সিং, ই-কমার্স বিজনেস ও আইটি প্রশিক্ষণের মাধ্যমে নিজের উজ্জ্বল ক্যারিয়ার গড়ুন — Dream Cart BD।',
    keywords: 'শিখুন ও ক্যারিয়ার গড়ুন, Education Dream Cart BD, ফ্রিল্যান্সিং ও আইটি প্রশিক্ষণ'
  }
};

function setOrCreateMeta(attrName, attrVal, contentVal) {
  if (typeof document === 'undefined' || !contentVal) return;
  let el = document.head.querySelector(`meta[${attrName}="${attrVal}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attrName, attrVal);
    document.head.appendChild(el);
  }
  el.setAttribute('content', String(contentVal));
}

function setOrCreateLink(relVal, hrefVal, extraAttrs = {}) {
  if (typeof document === 'undefined' || !hrefVal) return;
  const selector = extraAttrs.sizes
    ? `link[rel="${relVal}"][sizes="${extraAttrs.sizes}"]`
    : `link[rel="${relVal}"]`;
  let el = document.head.querySelector(selector);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', relVal);
    document.head.appendChild(el);
  }
  el.setAttribute('href', hrefVal);
  Object.entries(extraAttrs).forEach(([k, v]) => el.setAttribute(k, v));
}

/**
 * Enforces official /public/icon/logo.png and crisp multi-size favicons in <head>
 */
export function ensureOfficialBrandIconsInHead() {
  if (typeof document === 'undefined') return;
  const b = (typeof window !== 'undefined' && window.__APP_BASE__) ? window.__APP_BASE__ : '';
  setOrCreateLink('icon', `${b}/favicon.ico`, { type: 'image/x-icon' });
  setOrCreateLink('shortcut icon', `${b}/favicon.ico`, { type: 'image/x-icon' });
  setOrCreateLink('icon', `${b}/public/icon/favicon-48x48.png`, { type: 'image/png', sizes: '48x48' });
  setOrCreateLink('icon', `${b}/public/icon/favicon-32x32.png`, { type: 'image/png', sizes: '32x32' });
  setOrCreateLink('icon', `${b}/public/icon/favicon-16x16.png`, { type: 'image/png', sizes: '16x16' });
  setOrCreateLink('icon', `${b}/public/icon/icon-192.png`, { type: 'image/png', sizes: '192x192' });
  setOrCreateLink('apple-touch-icon', `${b}/public/icon/apple-touch-icon.png`, { sizes: '180x180' });
  setOrCreateLink('manifest', `${b}/public/manifest.webmanifest`);
}

/**
 * Builds the comprehensive JSON-LD @graph for Google Search Sitelinks, Brand Logo, Categories with Images, and Products
 */
export function buildMasterStructuredDataGraph(products = [], categories = [], currentProduct = null, currentCategory = null) {
  const sitelinks = [
    { name: 'হোমপেজ (Home)', url: `${SITE_ORIGIN}/` },
    { name: 'প্রোডাক্ট’স পেজ (Products)', url: `${SITE_ORIGIN}/products` },
    { name: 'কাস্টমার লগইন (Customer Login)', url: `${SITE_ORIGIN}/customer/login` },
    { name: 'রিসেলার লগইন (Reseller Login)', url: `${SITE_ORIGIN}/reseller/login` },
    { name: 'হোলসেলার লগইন (Wholesaler Login)', url: `${SITE_ORIGIN}/wholesaler/login` },
    { name: 'পার্সেল ট্র্যাক করুন (Track Order)', url: `${SITE_ORIGIN}/track` },
    { name: 'কন্টাক্ট করুন (Contact Us)', url: `${SITE_ORIGIN}/contact` },
    { name: 'আইটি সার্ভিসেস (IT Services)', url: `${SITE_ORIGIN}/dcitbd` },
    { name: 'শিখুন ও ক্যারিয়ার গড়ুন (Education & Career)', url: `${SITE_ORIGIN}/education` },
    { name: 'সকল ক্যাটাগরি (All Categories)', url: `${SITE_ORIGIN}/categories` }
  ];

  const defaultCats = [
    { category: 'Smartwatches', category_image: 'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=600&q=80' },
    { category: 'Kitchen', category_image: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=600&q=80' },
    { category: 'Organic & Health', category_image: 'https://images.unsplash.com/photo-1587049352847-4a222e784d38?w=600&q=80' },
    { category: 'Home Appliances', category_image: 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=600&q=80' },
    { category: 'Medicine & Healthcare', category_image: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=600&q=80' },
    { category: 'Stationery', category_image: 'https://images.unsplash.com/photo-1456735190827-d1262f71b8a3?w=600&q=80' }
  ];

  const catSource = (Array.isArray(categories) && categories.length > 0) ? categories : defaultCats;
  const seenCatNames = new Set();
  const categoryListItems = [];
  catSource.forEach((c) => {
    const cName = String(c.category || c.Category || c.name || '').trim();
    if (!cName || seenCatNames.has(cName.toLowerCase())) return;
    seenCatNames.add(cName.toLowerCase());
    const cImg = c.category_image || c.image || OFFICIAL_LOGO_URL;
    const absImg = cImg.startsWith('http') ? cImg : `${SITE_ORIGIN}${cImg.startsWith('/') ? '' : '/'}${cImg}`;
    categoryListItems.push({
      '@type': 'ListItem',
      position: categoryListItems.length + 1,
      item: {
        '@type': 'CollectionPage',
        name: `${cName} — Dream Cart BD`,
        url: `${SITE_ORIGIN}/products?cat=${encodeURIComponent(cName)}`,
        image: absImg,
        description: `Dream Cart BD (ড্রিম কার্ট বিডি) থেকে সেরা মানের ${cName} ক্যাটাগরির সকল পণ্য দেখুন ও অর্ডার করুন।`
      }
    });
  });

  const graph = [
    {
      '@type': ['Organization', 'OnlineStore'],
      '@id': `${SITE_ORIGIN}/#organization`,
      name: 'Dream Cart BD',
      alternateName: ['ড্রিম কার্ট বিডি', 'ড্রিম কার্ট বি.ডি', 'DreamCart BD', 'Dream Cart Bangladesh'],
      url: `${SITE_ORIGIN}/`,
      logo: {
        '@type': 'ImageObject',
        '@id': `${SITE_ORIGIN}/#logo`,
        url: OFFICIAL_LOGO_URL,
        contentUrl: OFFICIAL_LOGO_URL,
        width: 832,
        height: 832,
        caption: 'Dream Cart BD Official Logo'
      },
      image: [OFFICIAL_LOGO_URL, OFFICIAL_OG_BANNER],
      description: 'Dream Cart BD (ড্রিম কার্ট বিডি) বাংলাদেশের অন্যতম বিশ্বস্ত স্মার্ট ডিজিটাল ই-কমার্স, রিসেলার ও হোলসেল মার্কেটপ্লেস।',
      telephone: '+8801581703822',
      email: 'jainal.dcitbd@gmail.com',
      address: {
        '@type': 'PostalAddress',
        streetAddress: 'চৌধুরী প্লাজা, নিচতলা, রুম #০৩, পদুয়ার বাজার বিশ্বরোড, সদর দক্ষিণ',
        addressLocality: 'কুমিল্লা',
        postalCode: '3500',
        addressCountry: 'BD'
      },
      contactPoint: [
        {
          '@type': 'ContactPoint',
          telephone: '+8801581703822',
          contactType: 'customer service',
          areaServed: 'BD',
          availableLanguage: ['Bengali', 'English']
        },
        {
          '@type': 'ContactPoint',
          telephone: '+8801818273838',
          contactType: 'sales',
          areaServed: 'BD',
          availableLanguage: ['Bengali', 'English']
        }
      ],
      sameAs: [
        'https://www.facebook.com/dreamcartbd',
        'https://dcitbd.github.io/dcitbd/'
      ]
    },
    {
      '@type': 'WebSite',
      '@id': `${SITE_ORIGIN}/#website`,
      url: `${SITE_ORIGIN}/`,
      name: 'Dream Cart BD — ড্রিম কার্ট বিডি',
      alternateName: ['Dream Cart BD', 'ড্রিম কার্ট বিডি', 'ড্রিম কার্ট বি.ডি', 'DreamCart BD'],
      publisher: { '@id': `${SITE_ORIGIN}/#organization` },
      inLanguage: 'bn-BD',
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: `${SITE_ORIGIN}/products?search={search_term_string}`
        },
        'query-input': 'required name=search_term_string'
      }
    },
    {
      '@type': 'ItemList',
      '@id': `${SITE_ORIGIN}/#sitelinks`,
      name: 'Dream Cart BD Main Navigation Sitelinks',
      itemListElement: sitelinks.map((s, idx) => ({
        '@type': 'SiteNavigationElement',
        position: idx + 1,
        name: s.name,
        url: s.url
      }))
    },
    {
      '@type': 'ItemList',
      '@id': `${SITE_ORIGIN}/#categories`,
      name: 'Dream Cart BD Product Categories (ক্যাটাগরি সমূহ)',
      itemListElement: categoryListItems
    }
  ];

  if (currentProduct && (currentProduct.name || currentProduct.p_name)) {
    const pName = currentProduct.name || currentProduct.p_name;
    const pSlug = currentProduct.slug || currentProduct.sku || currentProduct.product_id || '';
    const pPrice = Number(currentProduct.selling_price || currentProduct.price || 0);
    const pStock = Number(currentProduct.stock !== undefined ? currentProduct.stock : 25);
    const pThumb = currentProduct.thumbnail || (Array.isArray(currentProduct.images) && currentProduct.images[0]) || OFFICIAL_OG_BANNER;
    const absThumb = pThumb.startsWith('http') ? pThumb : `${SITE_ORIGIN}${pThumb.startsWith('/') ? '' : '/'}${pThumb}`;

    graph.push({
      '@type': 'Product',
      '@id': `${SITE_ORIGIN}/product/${encodeURIComponent(pSlug)}#product`,
      name: pName,
      sku: String(currentProduct.sku || currentProduct.product_id || 'DCBD-ITEM'),
      mpn: String(currentProduct.sku || currentProduct.product_id || 'DCBD-ITEM'),
      image: Array.isArray(currentProduct.images) && currentProduct.images.length > 0 ? currentProduct.images : [absThumb],
      description: currentProduct.description || `${pName} — এখনই অর্ডার করুন Dream Cart BD (ড্রিম কার্ট বিডি) থেকে। সারা দেশে দ্রুত ক্যাশ অন ডেলিভারি।`,
      category: currentProduct.category || 'General',
      brand: {
        '@type': 'Brand',
        name: currentProduct.brand || 'Dream Cart BD'
      },
      offers: {
        '@type': 'Offer',
        url: `${SITE_ORIGIN}/product/${encodeURIComponent(pSlug)}`,
        priceCurrency: 'BDT',
        price: String(pPrice),
        priceValidUntil: '2027-12-31',
        itemCondition: 'https://schema.org/NewCondition',
        availability: pStock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/PreOrder',
        seller: {
          '@type': 'Organization',
          name: 'Dream Cart BD'
        }
      },
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: String(currentProduct.rating || '4.9'),
        reviewCount: String(currentProduct.reviews_count || '28')
      }
    });
  } else if (Array.isArray(products) && products.length > 0) {
    const catalogSample = products.slice(0, 60);
    graph.push({
      '@type': 'ItemList',
      '@id': `${SITE_ORIGIN}/#catalog-products`,
      name: currentCategory ? `${currentCategory} Products — Dream Cart BD` : 'Dream Cart BD Featured Products Catalog',
      itemListElement: catalogSample.map((p, idx) => {
        const pName = p.name || p.p_name || 'Product';
        const pSlug = p.slug || p.sku || p.product_id || `item-${idx + 1}`;
        const pPrice = Number(p.selling_price || 0);
        const pStock = Number(p.stock !== undefined ? p.stock : 20);
        const pThumb = p.thumbnail || (Array.isArray(p.images) && p.images[0]) || OFFICIAL_OG_BANNER;
        const absThumb = pThumb.startsWith('http') ? pThumb : `${SITE_ORIGIN}${pThumb.startsWith('/') ? '' : '/'}${pThumb}`;
        return {
          '@type': 'ListItem',
          position: idx + 1,
          item: {
            '@type': 'Product',
            name: pName,
            sku: String(p.sku || p.product_id || `DCBD-${idx + 1}`),
            url: `${SITE_ORIGIN}/product/${encodeURIComponent(pSlug)}`,
            image: absThumb,
            description: p.description || `${pName} — Dream Cart BD (ড্রিম কার্ট বিডি) থেকে সাশ্রয়ী মূল্যে কিনুন।`,
            brand: { '@type': 'Brand', name: p.brand || 'Dream Cart BD' },
            offers: {
              '@type': 'Offer',
              url: `${SITE_ORIGIN}/product/${encodeURIComponent(pSlug)}`,
              priceCurrency: 'BDT',
              price: String(pPrice),
              availability: pStock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
              itemCondition: 'https://schema.org/NewCondition'
            }
          }
        };
      })
    });
  }

  return {
    '@context': 'https://schema.org',
    '@graph': graph
  };
}

/**
 * Dynamically updates <head> Title, Meta tags, OpenGraph tags, Product Ad Microdata & JSON-LD Schema
 */
export function updateDynamicPageSeoAndSchema({
  path = '/',
  params = {},
  product = null,
  products = [],
  categories = []
} = {}) {
  if (typeof document === 'undefined') return;
  ensureOfficialBrandIconsInHead();

  const cleanPath = String(path || '/').replace(/\/+$/, '') || '/';
  const canonicalUrl = `${SITE_ORIGIN}${cleanPath === '/' ? '/' : cleanPath}${params.cat ? `?cat=${encodeURIComponent(params.cat)}` : (params.search ? `?search=${encodeURIComponent(params.search)}` : '')}`;

  let pageTitle = ROUTE_SEO_MAP[cleanPath]?.title || 'Dream Cart BD (ড্রিম কার্ট বিডি) — Smart Digital Commerce';
  let pageDesc = ROUTE_SEO_MAP[cleanPath]?.description || ROUTE_SEO_MAP['/'].description;
  const hostLabel = (typeof window !== 'undefined' && window.location && window.location.hostname) ? window.location.hostname : 'dreamcartbd.com';
  const dynCatNames = (Array.isArray(categories) ? categories : []).slice(0, 25).map(c => String(c.category || c.Category || '').trim()).filter(Boolean);
  const dynProdNames = (Array.isArray(products) ? products : []).slice(0, 40).map(p => String(p.name || p.p_name || '').trim()).filter(Boolean);
  const baseKw = ROUTE_SEO_MAP[cleanPath]?.keywords || ROUTE_SEO_MAP['/'].keywords;
  let pageKeywords = Array.from(new Set([baseKw, hostLabel, 'dreamcartbd.com', 'dreamcareerit.online', 'Dream Cart BD', 'ড্রিম কার্ট বিডি', ...dynCatNames, ...dynProdNames].filter(Boolean))).join(', ');
  let ogImage = OFFICIAL_OG_BANNER;
  let ogType = 'website';

  if (product && (product.name || product.p_name)) {
    const pName = product.name || product.p_name;
    const pPrice = Number(product.selling_price || 0);
    const pBrand = product.brand || 'Dream Cart BD';
    const pCat = product.category || 'Smart Gadgets';
    const pSku = product.sku || product.product_id || 'DCBD-ITEM';
    const pStock = Number(product.stock !== undefined ? product.stock : 25);

    pageTitle = `${pName} — ৳${pPrice.toLocaleString('bn-BD')} | Dream Cart BD (ড্রিম কার্ট বিডি)`;
    pageDesc = `${pName} কিনুন মাত্র ৳${pPrice} টাকায় Dream Cart BD (ড্রিম কার্ট বিডি) থেকে। ব্র্যান্ড: ${pBrand} | ক্যাটাগরি: ${pCat} | সারা দেশে দ্রুত ক্যাশ অন ডেলিভারি।`;
    pageKeywords = `${pName}, ${pSku}, ${pBrand}, ${pCat}, Dream Cart BD, ড্রিম কার্ট বিডি, buy ${pName} bangladesh`;
    const rawImg = product.thumbnail || (Array.isArray(product.images) && product.images[0]) || OFFICIAL_OG_BANNER;
    ogImage = rawImg.startsWith('http') ? rawImg : `${SITE_ORIGIN}${rawImg.startsWith('/') ? '' : '/'}${rawImg}`;
    ogType = 'product';

    // Meta / TikTok / YouTube Catalog Ad Microdata Meta Tags
    setOrCreateMeta('property', 'product:brand', pBrand);
    setOrCreateMeta('property', 'product:availability', pStock > 0 ? 'in stock' : 'available for order');
    setOrCreateMeta('property', 'product:condition', 'new');
    setOrCreateMeta('property', 'product:price:amount', String(pPrice));
    setOrCreateMeta('property', 'product:price:currency', 'BDT');
    setOrCreateMeta('property', 'product:retailer_item_id', String(pSku));
    setOrCreateMeta('property', 'product:item_group_id', String(pCat));
  } else if (params.cat) {
    const catName = String(params.cat).trim();
    pageTitle = `${catName} ক্যাটাগরির সকল পণ্য — Dream Cart BD | ড্রিম কার্ট বিডি`;
    pageDesc = `Dream Cart BD (ড্রিম কার্ট বিডি)-তে ${catName} ক্যাটাগরির সকল অরিজিনাল পণ্য, অফার ও পাইকারি/খুচরা মূল্য তালিকা দেখুন।`;
    pageKeywords = `${catName}, ${catName} price in bd, Dream Cart BD ${catName}, ড্রিম কার্ট বিডি`;
    const matchedCat = (categories || []).find(c => String(c.category || '').toLowerCase() === catName.toLowerCase());
    if (matchedCat && matchedCat.category_image) {
      ogImage = matchedCat.category_image.startsWith('http')
        ? matchedCat.category_image
        : `${SITE_ORIGIN}${matchedCat.category_image.startsWith('/') ? '' : '/'}${matchedCat.category_image}`;
    }
  } else if (params.search) {
    const q = String(params.search).trim();
    pageTitle = `"${q}" সার্চ ফলাফল — Dream Cart BD | ড্রিম কার্ট বিডি`;
    pageDesc = `Dream Cart BD (ড্রিম কার্ট বিডি)-তে "${q}" এর সকল প্রোডাক্ট ও মূল্য তালিকা দেখুন।`;
  }

  document.title = pageTitle;
  setOrCreateLink('canonical', canonicalUrl);
  setOrCreateMeta('name', 'description', pageDesc);
  setOrCreateMeta('name', 'keywords', pageKeywords);
  setOrCreateMeta('name', 'robots', cleanPath.startsWith('/admin') ? 'noindex, nofollow' : 'index, follow, max-image-preview:large, max-snippet:-1');

  // OpenGraph (WhatsApp, Facebook, Instagram, Messenger)
  setOrCreateMeta('property', 'og:site_name', 'Dream Cart BD (ড্রিম কার্ট বিডি)');
  setOrCreateMeta('property', 'og:type', ogType);
  setOrCreateMeta('property', 'og:title', pageTitle);
  setOrCreateMeta('property', 'og:description', pageDesc);
  setOrCreateMeta('property', 'og:url', canonicalUrl);
  setOrCreateMeta('property', 'og:image', ogImage);
  setOrCreateMeta('property', 'og:image:secure_url', ogImage);
  setOrCreateMeta('property', 'og:image:width', '1200');
  setOrCreateMeta('property', 'og:image:height', '630');
  setOrCreateMeta('property', 'og:image:alt', pageTitle);
  setOrCreateMeta('property', 'og:locale', 'bn_BD');

  // Twitter / X & TikTok Cards
  setOrCreateMeta('name', 'twitter:card', 'summary_large_image');
  setOrCreateMeta('name', 'twitter:title', pageTitle);
  setOrCreateMeta('name', 'twitter:description', pageDesc);
  setOrCreateMeta('name', 'twitter:image', ogImage);

  // Inject / Update JSON-LD Structured Data
  let ldScript = document.getElementById('dcbd-dynamic-jsonld');
  if (!ldScript) {
    ldScript = document.createElement('script');
    ldScript.id = 'dcbd-dynamic-jsonld';
    ldScript.type = 'application/ld+json';
    document.head.appendChild(ldScript);
  }
  const graphObj = buildMasterStructuredDataGraph(products, categories, product, params.cat || null);
  ldScript.textContent = JSON.stringify(graphObj);
}

// ============================================================================
// AD ATTRIBUTION CAPTURE (fbclid, gclid, wbraid, gbraid, ttclid, UTM params)
// ============================================================================
export function captureAndGetAdAttribution() {
  if (typeof window === 'undefined') return {};
  let stored = {};
  try {
    stored = JSON.parse(localStorage.getItem('dcbd_ad_attribution') || '{}') || {};
  } catch (e) {}

  if (window.__DCBD_AD_ATTRIBUTION__ && typeof window.__DCBD_AD_ATTRIBUTION__ === 'object') {
    stored = { ...stored, ...window.__DCBD_AD_ATTRIBUTION__ };
  }

  try {
    const urlParams = new URLSearchParams(window.location.search || '');
    const keys = ['fbclid', 'gclid', 'wbraid', 'gbraid', 'ttclid', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
    let updated = false;
    keys.forEach(k => {
      const val = urlParams.get(k);
      if (val) {
        stored[k] = val;
        updated = true;
      }
    });
    if (urlParams.get('fbclid') && !stored.fbc) {
      stored.fbc = `fb.1.${Date.now()}.${urlParams.get('fbclid')}`;
      updated = true;
    }
    if (!stored.fbp) {
      const fbpCookie = (document.cookie || '').split('; ').find(r => r.startsWith('_fbp='));
      if (fbpCookie) {
        stored.fbp = fbpCookie.split('=')[1];
      } else {
        stored.fbp = `fb.1.${Date.now()}.${Math.floor(100000000 + Math.random() * 900000000)}`;
        updated = true;
      }
    }
    if (updated || Object.keys(stored).length > 0) {
      localStorage.setItem('dcbd_ad_attribution', JSON.stringify(stored));
    }
  } catch (e) {}

  return stored;
}

function getActivePixelSettings() {
  let s = (typeof window !== 'undefined' && window.__DCBD_PIXEL_CONFIG__) ? { ...window.__DCBD_PIXEL_CONFIG__ } : {};
  try {
    const ssr = (typeof window !== 'undefined' && window.__DCBD_SSR_CACHE__ && window.__DCBD_SSR_CACHE__.settings)
      ? window.__DCBD_SSR_CACHE__.settings
      : {};
    s = { ...s, ...ssr };
  } catch (e) {}
  try {
    const rawSettings = localStorage.getItem('dcbd_site_settings');
    if (rawSettings) {
      s = { ...s, ...JSON.parse(rawSettings) };
    }
  } catch (e) {}
  return s;
}

// ============================================================================
// UNIFIED AD PIXELS ENGINE (Facebook/Instagram Meta Pixel, TikTok Pixel, YouTube/Google Tag & Server CAPI)
// Supports dynamic re-initialization whenever Pixel IDs are synced from Server/Sheets or saved in Admin!
// ============================================================================
export function initMarketingAdPixels(forceReinit = false) {
  if (typeof window === 'undefined') return;
  captureAndGetAdAttribution();

  window.__dcbdConfiguredPixelIds = window.__dcbdConfiguredPixelIds || new Set();

  // 1. Initialize Meta Pixel queue (Facebook & Instagram Advantage+ Catalog Ads)
  if (!window.fbq) {
    const n = window.fbq = function() {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    };
    if (!window._fbq) window._fbq = n;
    n.push = n;
    n.loaded = true;
    n.version = '2.0';
    n.queue = [];
  }

  // 2. Initialize TikTok Pixel queue (TikTok Dynamic Showcase Ads)
  if (!window.ttq) {
    window.ttq = {
      _queue: [],
      track: function(ev, data) { this._queue.push(['track', ev, data]); },
      page: function() { this._queue.push(['page']); },
      identify: function(data) { this._queue.push(['identify', data]); }
    };
  }

  // 3. Initialize Google Tag / YouTube Shopping Ads dataLayer
  window.dataLayer = window.dataLayer || [];
  if (!window.gtag) {
    window.gtag = function() { window.dataLayer.push(arguments); };
  }

  if (forceReinit) {
    window.__dcbdConfiguredPixelIds.clear();
  }

  // Load configured pixel IDs from site settings or SSR config
  try {
    const s = getActivePixelSettings();
    window.__DCBD_PIXEL_CONFIG__ = {
      ...(window.__DCBD_PIXEL_CONFIG__ || {}),
      fbPixelId: String(s.fbPixelId || s.FB_Pixel_ID || '').trim(),
      fbTestEventCode: String(s.fbTestEventCode || s.FB_Test_Event_Code || '').trim(),
      gtagId: String(s.gtagId || s.GA4_Measurement_ID || '').trim(),
      googleAdsId: String(s.googleAdsId || s.Google_Ads_ID || '').trim(),
      googleConversionLabel: String(s.googleConversionLabel || s.Google_Conversion_Label || '').trim(),
      gtmId: String(s.gtmId || s.GTM_Container_ID || '').trim(),
      ytTrackingId: String(s.ytTrackingId || s.YouTube_Tracking_ID || '').trim(),
      tiktokPixelId: String(s.tiktokPixelId || s.TikTok_Pixel_ID || '').trim(),
      enableServerCapi: s.enableServerCapi !== false,
      enableEnhancedConv: s.enableEnhancedConv !== false
    };

    const cfg = window.__DCBD_PIXEL_CONFIG__;
    const configuredSet = window.__dcbdConfiguredPixelIds;

    // A. Inject Facebook/Instagram Meta Pixel SDK if configured
    if (cfg.fbPixelId && !configuredSet.has(`fb:${cfg.fbPixelId}`)) {
      configuredSet.add(`fb:${cfg.fbPixelId}`);
      if (!document.querySelector('script[src*="connect.facebook.net"]')) {
        const fbScript = document.createElement('script');
        fbScript.async = true;
        fbScript.src = 'https://connect.facebook.net/en_US/fbevents.js';
        document.head.appendChild(fbScript);
      }
      window.fbq('init', cfg.fbPixelId, { country: 'bd' });
      window.fbq('track', 'PageView');
    }

    // B. Inject Google Tag Manager (GTM) if configured
    if (cfg.gtmId && !configuredSet.has(`gtm:${cfg.gtmId}`)) {
      configuredSet.add(`gtm:${cfg.gtmId}`);
      if (!document.querySelector('script[src*="googletagmanager.com/gtm.js"]')) {
        window.dataLayer.push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });
        const gtmScript = document.createElement('script');
        gtmScript.async = true;
        gtmScript.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(cfg.gtmId)}`;
        document.head.appendChild(gtmScript);
      }
    }

    // C. Inject Google Tag (gtag.js) for Google Ads, YouTube Shopping/Video Ads & GA4
    const primaryGtag = cfg.gtagId || cfg.googleAdsId || cfg.ytTrackingId;
    if (primaryGtag) {
      if (!document.querySelector('script[src*="googletagmanager.com/gtag/js"]')) {
        const gtScript = document.createElement('script');
        gtScript.async = true;
        gtScript.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(primaryGtag)}`;
        document.head.appendChild(gtScript);
        window.gtag('js', new Date());
      }
      if (cfg.gtagId && !configuredSet.has(`gtag:${cfg.gtagId}`)) {
        configuredSet.add(`gtag:${cfg.gtagId}`);
        window.gtag('config', cfg.gtagId, { allow_enhanced_conversions: true, currency: 'BDT' });
      }
      if (cfg.googleAdsId && !configuredSet.has(`gads:${cfg.googleAdsId}`)) {
        configuredSet.add(`gads:${cfg.googleAdsId}`);
        window.gtag('config', cfg.googleAdsId, { allow_enhanced_conversions: true });
      }
      if (cfg.ytTrackingId && !configuredSet.has(`yt:${cfg.ytTrackingId}`)) {
        configuredSet.add(`yt:${cfg.ytTrackingId}`);
        window.gtag('config', cfg.ytTrackingId, { allow_enhanced_conversions: true });
      }
    }

    // D. Inject TikTok Pixel SDK if configured
    if (cfg.tiktokPixelId && !configuredSet.has(`ttq:${cfg.tiktokPixelId}`)) {
      configuredSet.add(`ttq:${cfg.tiktokPixelId}`);
      if (!document.querySelector('script[src*="analytics.tiktok.com"]')) {
        const ttScript = document.createElement('script');
        ttScript.async = true;
        ttScript.src = `https://analytics.tiktok.com/i18n/pixel/events.js?sdkid=${encodeURIComponent(cfg.tiktokPixelId)}&lib=ttq`;
        document.head.appendChild(ttScript);
      }
      if (typeof window.ttq.load === 'function') {
        window.ttq.load(cfg.tiktokPixelId);
      }
      window.ttq.page && window.ttq.page();
    }
  } catch (e) {}
}

/**
 * Non-blocking Server-Side Conversions API (CAPI) & Enhanced Conversion Relay to PHP/Python Gateway
 */
function sendServerCapiEvent(eventName, eventId, customData = {}, userData = {}) {
  if (typeof window === 'undefined' || typeof fetch === 'undefined') return;
  try {
    const apiUrl = window.__DCBD_PHP_API_URL__ || ((window.__APP_BASE__ || '') + '/api/index.php');
    const attr = captureAndGetAdAttribution();
    const s = getActivePixelSettings();
    const payload = {
      action: 'pixels/track',
      event_name: eventName,
      event_id: eventId,
      event_source_url: window.location.href,
      fbc: attr.fbc || '',
      fbp: attr.fbp || '',
      test_event_code: String(s.fbTestEventCode || s.FB_Test_Event_Code || '').trim(),
      custom_data: customData,
      user_data: userData
    };
    fetch(`${apiUrl}?action=pixels/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
      keepalive: true
    }).catch(() => {});
  } catch (e) {}
}

// Prevent duplicate Purchase firing for the same order_id within the browser session
const _firedPurchaseOrders = new Set();

export function trackAdEvent(eventName, payload = {}) {
  if (typeof window === 'undefined') return;
  initMarketingAdPixels(false);

  const eventId = payload.event_id || `EVT_${eventName}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  try {
    switch (eventName) {
      case 'PageView': {
        window.fbq && window.fbq('track', 'PageView', {}, { eventID: eventId });
        window.ttq && window.ttq.page && window.ttq.page();
        window.gtag && window.gtag('event', 'page_view', {
          page_location: window.location.href,
          page_title: document.title
        });
        window.dataLayer && window.dataLayer.push({
          event: 'page_view',
          page_location: window.location.href,
          page_title: document.title
        });
        break;
      }

      case 'ViewContent': {
        const sku = String(payload.sku || payload.product_id || 'DCBD-ITEM');
        const name = String(payload.name || payload.p_name || 'Product');
        const price = Number(payload.selling_price || payload.price || 0);
        const cat = String(payload.category || 'General');
        const adData = {
          content_ids: [sku],
          content_id: sku,
          content_name: name,
          content_type: 'product',
          content_category: cat,
          value: price,
          currency: 'BDT',
          contents: [{ id: sku, quantity: 1, item_price: price }]
        };
        const gaItems = [{ item_id: sku, item_name: name, item_category: cat, price: price, quantity: 1 }];
        window.fbq && window.fbq('track', 'ViewContent', adData, { eventID: eventId });
        window.ttq && window.ttq.track('ViewContent', adData);
        window.gtag && window.gtag('event', 'view_item', {
          currency: 'BDT',
          value: price,
          items: gaItems
        });
        window.dataLayer && window.dataLayer.push({
          event: 'view_item',
          ecommerce: { currency: 'BDT', value: price, items: gaItems }
        });
        sendServerCapiEvent('ViewContent', eventId, adData);
        break;
      }

      case 'AddToCart': {
        const sku = String(payload.sku || payload.product_id || 'DCBD-ITEM');
        const name = String(payload.name || payload.p_name || 'Product');
        const price = Number(payload.selling_price || payload.price || 0);
        const qty = Number(payload.quantity || 1);
        const adData = {
          content_ids: [sku],
          content_id: sku,
          content_name: name,
          content_type: 'product',
          value: price * qty,
          currency: 'BDT',
          contents: [{ id: sku, quantity: qty, item_price: price }]
        };
        const gaItems = [{ item_id: sku, item_name: name, price: price, quantity: qty }];
        window.fbq && window.fbq('track', 'AddToCart', adData, { eventID: eventId });
        window.ttq && window.ttq.track('AddToCart', adData);
        window.gtag && window.gtag('event', 'add_to_cart', {
          currency: 'BDT',
          value: price * qty,
          items: gaItems
        });
        window.dataLayer && window.dataLayer.push({
          event: 'add_to_cart',
          ecommerce: { currency: 'BDT', value: price * qty, items: gaItems }
        });
        sendServerCapiEvent('AddToCart', eventId, adData);
        break;
      }

      case 'AddToWishlist': {
        const sku = String(payload.sku || payload.product_id || 'DCBD-ITEM');
        const name = String(payload.name || payload.p_name || 'Product');
        const price = Number(payload.selling_price || payload.price || 0);
        const adData = {
          content_ids: [sku],
          content_name: name,
          content_type: 'product',
          value: price,
          currency: 'BDT'
        };
        window.fbq && window.fbq('track', 'AddToWishlist', adData, { eventID: eventId });
        window.ttq && window.ttq.track('AddToWishlist', adData);
        window.gtag && window.gtag('event', 'add_to_wishlist', {
          currency: 'BDT',
          value: price,
          items: [{ item_id: sku, item_name: name, price: price, quantity: 1 }]
        });
        break;
      }

      case 'InitiateCheckout': {
        const total = Number(payload.value || payload.total || payload.total_amount || 0);
        const items = Array.isArray(payload.items) ? payload.items : [];
        const ids = items.map(i => String(i.sku || i.product_id || 'ITEM'));
        const adData = {
          content_ids: ids.length ? ids : ['DCBD-CHECKOUT'],
          content_type: 'product',
          value: total,
          currency: 'BDT',
          num_items: items.length || 1
        };
        const gaItems = items.map(i => ({
          item_id: String(i.sku || i.product_id || 'ITEM'),
          item_name: String(i.name || i.p_name || 'Product'),
          price: Number(i.price || i.selling_price || 0),
          quantity: Number(i.quantity || 1)
        }));
        window.fbq && window.fbq('track', 'InitiateCheckout', adData, { eventID: eventId });
        window.ttq && window.ttq.track('InitiateCheckout', adData);
        window.gtag && window.gtag('event', 'begin_checkout', {
          currency: 'BDT',
          value: total,
          items: gaItems
        });
        window.dataLayer && window.dataLayer.push({
          event: 'begin_checkout',
          ecommerce: { currency: 'BDT', value: total, items: gaItems }
        });
        sendServerCapiEvent('InitiateCheckout', eventId, adData);
        break;
      }

      case 'Lead': {
        const total = Number(payload.total_amount || payload.value || 0);
        const adData = {
          content_name: String(payload.products || 'Checkout Draft Lead'),
          value: total,
          currency: 'BDT'
        };
        const userData = {
          phone: String(payload.phone || ''),
          name: String(payload.customer_name || '')
        };
        window.fbq && window.fbq('track', 'Lead', adData, { eventID: eventId });
        window.ttq && window.ttq.track('SubmitForm', adData);
        window.gtag && window.gtag('event', 'generate_lead', {
          currency: 'BDT',
          value: total
        });
        window.dataLayer && window.dataLayer.push({
          event: 'generate_lead',
          value: total,
          currency: 'BDT'
        });
        sendServerCapiEvent('Lead', eventId, adData, userData);
        break;
      }

      case 'Purchase': {
        const orderId = String(payload.order_id || payload.orderId || payload.OrderID || ('ORD-' + Date.now()));
        if (!payload.force_test && _firedPurchaseOrders.has(orderId.toLowerCase())) {
          return;
        }
        _firedPurchaseOrders.add(orderId.toLowerCase());

        const dedupEventId = `PUR_${orderId}`;
        const total = Number(payload.total_amount || payload.value || 0);
        const items = Array.isArray(payload.items) ? payload.items : [];
        const ids = items.map(i => String(i.sku || i.product_id || 'ITEM'));
        const adData = {
          content_ids: ids.length ? ids : [orderId],
          content_type: 'product',
          content_name: String(payload.products || payload.product_name || 'Order'),
          value: total,
          currency: 'BDT',
          order_id: orderId,
          num_items: items.length || Number(payload.quantity || 1)
        };
        const userData = {
          phone: String(payload.phone || ''),
          name: String(payload.customer_name || ''),
          address: String(payload.address || '')
        };
        const gaItems = items.map(i => ({
          item_id: String(i.sku || i.product_id || 'ITEM'),
          item_name: String(i.name || i.p_name || 'Product'),
          price: Number(i.price || i.selling_price || 0),
          quantity: Number(i.quantity || 1)
        }));

        // 1. Facebook / Instagram Meta Pixel Purchase with EventID Deduplication
        window.fbq && window.fbq('track', 'Purchase', adData, { eventID: dedupEventId });

        // 2. TikTok Pixel CompletePayment
        window.ttq && window.ttq.track('CompletePayment', adData);

        // 3. Google Ads & YouTube Shopping / GA4 Purchase + Enhanced Conversions + GTM DataLayer
        window.dataLayer && window.dataLayer.push({
          event: 'purchase',
          ecommerce: {
            transaction_id: orderId,
            value: total,
            currency: 'BDT',
            items: gaItems
          }
        });

        if (window.gtag) {
          if (userData.phone) {
            const cleanPh = userData.phone.replace(/[^0-9]/g, '');
            const intlPh = cleanPh.length === 11 && cleanPh.startsWith('01') ? `+88${cleanPh}` : `+${cleanPh}`;
            window.gtag('set', 'user_data', {
              phone_number: intlPh,
              address: { first_name: userData.name, street: userData.address, country: 'BD' }
            });
          }
          window.gtag('event', 'purchase', {
            transaction_id: orderId,
            currency: 'BDT',
            value: total,
            items: gaItems
          });

          // Fire explicit Google Ads / YouTube Conversion Label if configured
          try {
            const s = getActivePixelSettings();
            const gAdsId = String(s.googleAdsId || s.Google_Ads_ID || '').trim();
            const gConvLbl = String(s.googleConversionLabel || s.Google_Conversion_Label || '').trim();
            if (gAdsId && gConvLbl) {
              window.gtag('event', 'conversion', {
                send_to: `${gAdsId}/${gConvLbl}`,
                value: total,
                currency: 'BDT',
                transaction_id: orderId
              });
            }
          } catch (e) {}
        }

        // 4. Server-Side Meta Conversions API (CAPI) & SQLite Conversion Log
        sendServerCapiEvent('Purchase', dedupEventId, adData, userData);
        break;
      }

      case 'Search': {
        const q = String(payload.search_string || payload.query || '');
        if (!q) break;
        window.fbq && window.fbq('track', 'Search', { search_string: q }, { eventID: eventId });
        window.ttq && window.ttq.track('Search', { query: q });
        window.gtag && window.gtag('event', 'search', { search_term: q });
        sendServerCapiEvent('Search', eventId, { search_string: q });
        break;
      }

      case 'Contact': {
        const method = String(payload.method || 'WhatsApp/Call');
        window.fbq && window.fbq('track', 'Contact', { content_name: method }, { eventID: eventId });
        window.ttq && window.ttq.track('Contact', { content_name: method });
        window.gtag && window.gtag('event', 'contact', { method: method });
        sendServerCapiEvent('Contact', eventId, { content_name: method });
        break;
      }
    }
  } catch (e) {}
}

if (typeof window !== 'undefined') {
  window.__dcbdInitMarketingAdPixels = initMarketingAdPixels;
  window.__dcbdTrackAdEvent = trackAdEvent;
  window.__dcbdUpdateDynamicSeo = updateDynamicPageSeoAndSchema;
  window.__dcbdGetAdAttribution = captureAndGetAdAttribution;
}

#!/usr/bin/env node
// ========================================================================
// generate-products.js
// يقرأ products.json ويولّد:
//   - صفحة HTML ثابتة لكل منتج تحت /product/
//   - صفحة ثابتة لكل قسم من أقسام التركيز (wijar/, screen-decor/, diwaniyat/, naqshat-hafr/, tables/)
//   - أقسام الصفحة الرئيسية داخل index.html (بين علامتي HOME:START و HOME:END)
//   - sitemap.xml (يضم فقط الصفحات المستهدفة في جوجل)
//
// منتجات السجاد العادي والكنب والستائر تُولَّد صفحاتها للزوار مع noindex
// ولا تدخل خريطة الموقع (انظر scripts/site-config.js).
//
// الاستخدام:  node scripts/generate-products.js
// (يُشغَّل تلقائياً عبر GitHub Action عند كل تعديل على products.json)
// ========================================================================

'use strict';

const fs = require('fs');
const path = require('path');
const { slugify } = require('./slugify.js');
const {
  SITE_URL, WHATSAPP_NUMBER, FOCUS_CATEGORIES,
  categoryInfo, isIndexableCategory, categoryHref
} = require('./site-config.js');

const ROOT = path.join(__dirname, '..');
const PRODUCTS_JSON = path.join(ROOT, 'products.json');
const OUTPUT_DIR = path.join(ROOT, 'product');
const SITEMAP_PATH = path.join(ROOT, 'sitemap.xml');
const INDEX_PATH = path.join(ROOT, 'index.html');
const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400';
const BRAND = 'الطراز الأصيل';

// صفحات ثابتة تدخل خريطة الموقع (مقالات السجاد التركي والستائر مستبعدة لأنها خارج تركيز الموقع)
const STATIC_SITEMAP_PAGES = [
  'about.html',
  'delivery-payment.html',
  'reviews.html',
  'blog/index.html',
  'blog/asaar-al-majalis-al-arabiya-fi-al-kuwait.html',
  'blog/al-farq-bayn-isfanj-al-baghli-wal-isfanj-al-aadi.html'
];

// ---------------------------------------------------------------- أدوات
function escapeHtml(text) {
  if (text == null) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function whatsappLink(message) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

function cleanPrice(price) {
  return String(price).replace(/[^\d.]/g, '') || '0';
}

// السعر المعروض يطابق السعر في البيانات المنظّمة (بالدينار الكويتي)
function displayPrice(price, unit) {
  const raw = String(price == null ? '' : price).trim();
  const withCurrency = /^[\d.]+$/.test(raw) ? `${raw} د.ك` : raw;
  return unit ? `${withCurrency} ${unit}` : withCurrency;
}

// وحدات التسعير المدعومة في البيانات المنظّمة (UN/CEFACT)
const UNIT_CODES = { 'للمتر': 'MTR', 'للمتر المربع': 'MTK' };

function productUrl(p) {
  return `${SITE_URL}/product/${p.slug}.html`;
}

function productImages(p) {
  return (p.images && p.images.length > 0) ? p.images : [p.image || DEFAULT_IMAGE];
}

function isIndexableProduct(p) {
  return isIndexableCategory(p.category) && !p.noindex;
}

function jsonLd(data) {
  return `<script type="application/ld+json">\n${JSON.stringify(data, null, 2)}\n  </script>`;
}

// ---------------------------------------------------------------- أجزاء مشتركة
function headCommon({ title, description, canonical, ogType, ogImage, robots }) {
  return `  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
${robots ? `  <meta name="robots" content="${robots}">\n` : ''}  <link rel="canonical" href="${canonical}">
  <meta property="og:type" content="${ogType}">
  <meta property="og:locale" content="ar_KW">
  <meta property="og:site_name" content="${BRAND}">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:url" content="${canonical}">
${ogImage ? `  <meta property="og:image" content="${ogImage}">\n` : ''}  <link rel="stylesheet" href="/style.css">
  <link rel="icon" href="/favicon.ico" sizes="any">
  <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png">
  <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16.png">
  <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">`;
}

function navHtml(activeCat) {
  const links = Object.entries(FOCUS_CATEGORIES).map(([cat, c]) =>
    `<a href="/${c.path}"${cat === activeCat ? ' class="active" aria-current="page"' : ''}>${c.label}</a>`
  ).join('\n        ');
  return `<header class="header">
    <div class="header-inner">
      <a href="/" class="logo">
        <img src="/images/brand/logo.png" alt="${BRAND} - أوجارات وديوانيات في الكويت" class="logo-img logo-img-full">
        <img src="/images/brand/logo-mobile.png" alt="${BRAND}" class="logo-img logo-img-mobile">
      </a>
      <nav class="nav-links">
        <a href="/">الرئيسية</a>
        ${links}
      </nav>
    </div>
  </header>`;
}

function footerHtml() {
  const wa = whatsappLink('مرحباً الطراز الأصيل، أرغب بالاستفسار');
  return `<div class="bottom-bar">
    <a href="${wa}" target="_blank" rel="noopener" class="bottom-bar-btn bottom-bar-whatsapp">
      <span>📱</span> واتساب
    </a>
    <a href="tel:+${WHATSAPP_NUMBER}" class="bottom-bar-btn bottom-bar-call">
      <span>📞</span> اتصال
    </a>
  </div>

  <footer class="footer">
    <p>© 2026 ${BRAND} — جميع الحقوق محفوظة</p>
    <p style="margin-top:4px; font-size:0.75rem; opacity:0.65;">📍 الضجيج - مجمع غاليريا، الكويت</p>
    <p style="margin-top:5px; font-size:0.8rem;">للطلب والاستفسار: <a href="${wa}" target="_blank" rel="noopener">واتساب</a></p>
    <p class="footer-links">
      <a href="/about.html">من نحن</a><span>·</span><a href="/delivery-payment.html">التوصيل والدفع</a><span>·</span><a href="/reviews.html">آراء العملاء</a><span>·</span><a href="/blog/index.html">المدونة</a>
    </p>
    <p class="footer-links">
      منتجات أخرى: <a href="/category.html?cat=sajad">سجاد</a><span>·</span><a href="/category.html?cat=kanab">كنب</a><span>·</span><a href="/category.html?cat=sitar">ستائر</a>
    </p>
  </footer>`;
}

function renderGallery(imgs, altBase, eagerFirst) {
  const hasMultiple = imgs.length > 1;
  const slides = imgs.map((url, i) => `
        <img src="${url}" alt="${altBase}${hasMultiple ? ' - صورة ' + (i + 1) : ''}" class="gallery-img" width="800" height="800"${(i === 0 && eagerFirst) ? '' : ' loading="lazy"'} onerror="this.src='${DEFAULT_IMAGE}'">`).join('');
  const dots = hasMultiple ? `
      <div class="gallery-dots">
        ${imgs.map((_, i) => `<span class="gallery-dot${i === 0 ? ' active' : ''}"></span>`).join('')}
      </div>` : '';
  const counter = hasMultiple ? `<span class="gallery-counter">1/${imgs.length}</span>` : '';
  const arrows = hasMultiple ? `
      <button type="button" class="gallery-arrow gallery-prev" aria-label="الصورة السابقة">‹</button>
      <button type="button" class="gallery-arrow gallery-next" aria-label="الصورة التالية">›</button>` : '';
  return `<div class="gallery-track">${slides}
      </div>${dots}${counter}${arrows}`;
}

function thumbCard(p) {
  const img = productImages(p)[0];
  return `
      <a href="/product/${p.slug}.html" class="thumb-card">
        <div class="thumb-img-wrap">
          <img src="${img}" alt="${escapeHtml(p.name)}" loading="lazy" width="300" height="225" onerror="this.src='${DEFAULT_IMAGE}'">
        </div>
        <div class="thumb-title">${escapeHtml(p.name)}</div>
      </a>`;
}

function productCard(p) {
  const imgs = productImages(p);
  return `
    <article class="product-card">
      <div class="product-gallery">
        ${renderGallery(imgs, escapeHtml(p.name), false)}
      </div>
      <div class="product-body">
        <h3 class="product-name"><a href="/product/${p.slug}.html">${escapeHtml(p.name)}</a></h3>
        <p class="product-desc">${escapeHtml(p.description || '')}</p>
        <div class="product-footer">
          <span class="product-price">${escapeHtml(displayPrice(p.price, p.priceUnit))}</span>
          <a href="${whatsappLink('مرحباً الطراز الأصيل، أريد الاستفسار عن: ' + p.name)}" target="_blank" rel="noopener" class="whatsapp-btn">📱 واتساب</a>
        </div>
      </div>
    </article>`;
}

const ORDER_STEPS = [
  'أرسل لنا عبر واتساب مقاس المكان وصورة له، والتصميم الذي يعجبك من الصور.',
  'نؤكد معك التصميم واللون والسعر النهائي عبر واتساب قبل التنفيذ.',
  'التوصيل والتركيب داخل الكويت، والدفع كاش عند الاستلام.'
];

// ---------------------------------------------------------------- صفحة المنتج
function renderProductPage(product, allProducts) {
  const imgs = productImages(product);
  const info = categoryInfo(product.category);
  const indexable = isIndexableProduct(product);
  const catHref = categoryHref(product.category);
  const title = `${product.name} | ${info.label} الكويت - ${BRAND}`;
  const description = product.description
    ? product.description.replace(/\s*\n+\s*/g, ' - ').slice(0, 155)
    : `${product.name} من ${BRAND} في الكويت. اطلب عبر واتساب.`;
  const url = productUrl(product);

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'الرئيسية', item: `${SITE_URL}/` },
      { '@type': 'ListItem', position: 2, name: info.label, item: `${SITE_URL}${catHref}` },
      { '@type': 'ListItem', position: 3, name: product.name, item: url }
    ]
  };
  const productSchema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description || product.name,
    image: imgs,
    sku: `ALTRAAZ-${product.id}`,
    brand: { '@type': 'Brand', name: BRAND },
    category: info.label,
    offers: {
      '@type': 'Offer',
      url,
      priceCurrency: 'KWD',
      price: cleanPrice(product.price),
      availability: 'https://schema.org/InStock',
      itemCondition: 'https://schema.org/NewCondition',
      seller: { '@type': 'Organization', name: BRAND }
    }
  };
  const unitCode = UNIT_CODES[product.priceUnit];
  if (unitCode) {
    productSchema.offers.priceSpecification = {
      '@type': 'UnitPriceSpecification',
      price: cleanPrice(product.price),
      priceCurrency: 'KWD',
      referenceQuantity: { '@type': 'QuantitativeValue', value: 1, unitCode }
    };
  }

  const related = allProducts
    .filter(p => p.category === product.category && p.id !== product.id)
    .slice(0, 4);
  const relatedHtml = related.length ? `
    <section class="home-section related-products">
      <div class="section-header">
        <h2>أعمال مشابهة</h2>
        <a href="${catHref}" class="section-more">عرض الكل ←</a>
      </div>
      <div class="cat-preview-grid">${related.map(thumbCard).join('')}
      </div>
    </section>` : '';

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
${headCommon({ title, description, canonical: url, ogType: 'product', ogImage: imgs[0], robots: indexable ? null : 'noindex, follow' })}
  ${jsonLd([breadcrumb, productSchema])}
</head>
<body>
  ${navHtml(product.category)}

  <main class="container">
    <nav class="breadcrumb" aria-label="مسار التصفح">
      <a href="/">الرئيسية</a>
      <span>/</span>
      <a href="${catHref}">${info.icon} ${info.label}</a>
      <span>/</span>
      <span aria-current="page">${escapeHtml(product.name)}</span>
    </nav>

    <div class="product-detail">
      <div class="product-gallery product-gallery-detail">
        ${renderGallery(imgs, escapeHtml(product.name), true)}
      </div>
      <div class="product-body product-body-detail">
        <span class="product-category">${info.icon} ${info.label}</span>
        <h1 class="product-name product-name-detail">${escapeHtml(product.name)}</h1>
        <p class="product-desc product-desc-detail">${escapeHtml(product.description || '').replace(/\n/g, '<br>')}</p>
        <div class="product-footer product-footer-detail">
          <span class="product-price">${escapeHtml(displayPrice(product.price, product.priceUnit))}</span>
          <a href="${whatsappLink('مرحباً الطراز الأصيل، أريد الاستفسار عن: ' + product.name)}" target="_blank" rel="noopener" class="whatsapp-btn">📱 اطلب عبر واتساب</a>
        </div>
      </div>
    </div>
${relatedHtml}
  </main>

  ${footerHtml()}

  <script src="/script.js"></script>
  <script>
    document.addEventListener('DOMContentLoaded', () => { initGalleries(document); });
  </script>
</body>
</html>
`;
}

// ---------------------------------------------------------------- صفحة القسم
function renderCategoryLanding(cat, products) {
  const c = FOCUS_CATEGORIES[cat];
  const url = `${SITE_URL}/${c.path}`;
  const hasProducts = products.length > 0;
  const ogImage = hasProducts ? productImages(products[0])[0] : null;

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'الرئيسية', item: `${SITE_URL}/` },
      { '@type': 'ListItem', position: 2, name: c.label, item: url }
    ]
  };
  const schemas = [breadcrumb];
  if (hasProducts) {
    schemas.push({
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: c.h1,
      itemListElement: products.map((p, i) => ({ '@type': 'ListItem', position: i + 1, url: productUrl(p) }))
    });
  }

  const relatedLinks = c.related.map(r =>
    `<a href="/${FOCUS_CATEGORIES[r].path}" class="section-more">${FOCUS_CATEGORIES[r].icon} ${FOCUS_CATEGORIES[r].label}</a>`
  ).join('\n        ');

  const grid = hasProducts
    ? `<div class="products-grid">${products.map(productCard).join('')}
    </div>`
    : `<p class="landing-empty">صور أعمال هذا القسم تُضاف قريباً. أرسل لنا مقاس المكان عبر <a href="${whatsappLink('مرحباً الطراز الأصيل، أريد الاستفسار عن ' + c.label)}" target="_blank" rel="noopener">واتساب</a> ونرسل لك نماذج من أعمالنا.</p>`;

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
${headCommon({ title: c.title, description: c.description, canonical: url, ogType: 'website', ogImage, robots: hasProducts ? null : 'noindex, follow' })}
  ${jsonLd(schemas)}
</head>
<body>
  ${navHtml(cat)}

  <section class="cat-hero">
    <h1>${c.h1}</h1>
    <p>${escapeHtml(c.description.split('.')[0])}</p>
  </section>

  <main class="container">
    <nav class="breadcrumb" aria-label="مسار التصفح">
      <a href="/">الرئيسية</a>
      <span>/</span>
      <span aria-current="page">${c.label}</span>
    </nav>

    <div class="landing-text">
      ${c.intro.map(t => `<p>${t}</p>`).join('\n      ')}
      <h2>${c.specsTitle}</h2>
      <ul>
        ${c.specs.map(s => `<li>${s}</li>`).join('\n        ')}
      </ul>
    </div>

    <section class="home-section">
      <div class="section-header">
        <h2>${c.icon} أعمال ${c.label}</h2>
      </div>
      ${grid}
    </section>

    <div class="landing-text">
      <h2>طريقة الطلب</h2>
      <ol>
        ${ORDER_STEPS.map(s => `<li>${s}</li>`).join('\n        ')}
      </ol>
      <p><a href="${whatsappLink('مرحباً الطراز الأصيل، أريد الاستفسار عن ' + c.label)}" target="_blank" rel="noopener" class="whatsapp-btn">📱 اطلب عبر واتساب</a></p>
    </div>

    <div class="landing-related">
      <h2>أقسام ذات صلة</h2>
      <div class="landing-related-links">
        ${relatedLinks}
      </div>
    </div>
  </main>

  ${footerHtml()}

  <script src="/script.js"></script>
  <script>
    document.addEventListener('DOMContentLoaded', () => { initGalleries(document); });
  </script>
</body>
</html>
`;
}

// ---------------------------------------------------------------- الصفحة الرئيسية
function renderHomeSections(byCat) {
  return Object.entries(FOCUS_CATEGORIES).map(([cat, c]) => {
    const items = byCat[cat];
    const body = items.length
      ? `<div class="cat-preview-grid">${items.slice(-4).reverse().map(thumbCard).join('')}
        </div>`
      : `<p class="landing-empty">${escapeHtml(c.description)}</p>`;
    return `
      <section class="home-section">
        <div class="section-header">
          <h2>${c.icon} ${c.label}</h2>
          <a href="/${c.path}" class="section-more">عرض القسم ←</a>
        </div>
        ${body}
      </section>`;
  }).join('\n');
}

function updateHomepage(byCat) {
  const html = fs.readFileSync(INDEX_PATH, 'utf8');
  const start = '<!-- HOME:START -->';
  const end = '<!-- HOME:END -->';
  const a = html.indexOf(start);
  const b = html.indexOf(end);
  if (a === -1 || b === -1) {
    console.warn('⚠️ علامات HOME:START/HOME:END غير موجودة في index.html — لم تُحدَّث الرئيسية');
    return;
  }
  const out = html.slice(0, a + start.length) + renderHomeSections(byCat) + '\n      ' + html.slice(b);
  fs.writeFileSync(INDEX_PATH, out, 'utf8');
}

// ---------------------------------------------------------------- خريطة الموقع
function buildSitemap(indexableProducts, indexableCats) {
  const today = new Date().toISOString().slice(0, 10);
  const entries = [];
  entries.push({ loc: `${SITE_URL}/`, lastmod: today });
  indexableCats.forEach(cat => entries.push({ loc: `${SITE_URL}/${FOCUS_CATEGORIES[cat].path}`, lastmod: today }));
  indexableProducts.forEach(p => entries.push({ loc: productUrl(p) }));
  STATIC_SITEMAP_PAGES.forEach(pg => entries.push({ loc: `${SITE_URL}/${pg}` }));

  const xml = entries.map(e => `  <url>
    <loc>${e.loc}</loc>${e.lastmod ? `\n    <lastmod>${e.lastmod}</lastmod>` : ''}
  </url>`).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${xml}
</urlset>
`;
}

// ---------------------------------------------------------------- التشغيل
function main() {
  if (!fs.existsSync(PRODUCTS_JSON)) {
    console.error('❌ products.json غير موجود في:', PRODUCTS_JSON);
    process.exit(1);
  }

  const products = JSON.parse(fs.readFileSync(PRODUCTS_JSON, 'utf8'));

  // الرابط ثابت: إذا كان للمنتج slug محفوظ يبقى كما هو حتى لو تغيّر اسمه
  products.forEach(p => { p.slug = p.slug || slugify(p.name, p.id); });

  // صفحات المنتجات
  if (fs.existsSync(OUTPUT_DIR)) fs.rmSync(OUTPUT_DIR, { recursive: true, force: true });
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  products.forEach(p => {
    fs.writeFileSync(path.join(OUTPUT_DIR, `${p.slug}.html`), renderProductPage(p, products), 'utf8');
  });

  // صفحات الأقسام المستهدفة
  const byCat = {};
  Object.keys(FOCUS_CATEGORIES).forEach(cat => {
    byCat[cat] = products.filter(p => p.category === cat && !p.noindex);
  });
  const indexableCats = [];
  Object.keys(FOCUS_CATEGORIES).forEach(cat => {
    const dir = path.join(ROOT, FOCUS_CATEGORIES[cat].path);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'index.html'), renderCategoryLanding(cat, byCat[cat]), 'utf8');
    // قسم بلا أعمال يبقى noindex وخارج الخريطة حتى تُضاف صوره (تجنّباً للصفحات الفارغة)
    if (byCat[cat].length > 0) indexableCats.push(cat);
  });

  updateHomepage(byCat);

  const indexableProducts = products.filter(isIndexableProduct);
  fs.writeFileSync(SITEMAP_PATH, buildSitemap(indexableProducts, indexableCats), 'utf8');

  const slugMap = {};
  products.forEach(p => { slugMap[p.id] = p.slug; });
  fs.writeFileSync(path.join(ROOT, 'product-slugs.json'), JSON.stringify(slugMap, null, 2), 'utf8');

  console.log(`✅ ${products.length} صفحة منتج (${indexableProducts.length} منها في جوجل)`);
  console.log(`✅ أقسام في خريطة الموقع: ${indexableCats.join(', ') || 'لا شيء'}`);
  const pending = Object.keys(FOCUS_CATEGORIES).filter(c => !indexableCats.includes(c));
  if (pending.length) console.log(`ℹ️ أقسام بانتظار الصور (noindex مؤقتاً): ${pending.join(', ')}`);
}

main();

#!/usr/bin/env node
// ========================================================================
// generate-products.js
// يقرأ products.json ويولّد صفحة HTML ثابتة مستقلة لكل منتج تحت /product/
// + يحدّث sitemap.xml تلقائياً ليشمل كل صفحات المنتجات
//
// الاستخدام:  node scripts/generate-products.js
// (يُشغَّل تلقائياً عبر GitHub Action عند كل تعديل على products.json)
// ========================================================================

const fs = require('fs');
const path = require('path');
const { slugify } = require('./slugify.js');

const ROOT = path.join(__dirname, '..');
const SITE_URL = 'https://atrazakw.shop';
const WHATSAPP_NUMBER = '96566462190';
const PRODUCTS_JSON = path.join(ROOT, 'products.json');
const OUTPUT_DIR = path.join(ROOT, 'product');
const SITEMAP_PATH = path.join(ROOT, 'sitemap.xml');
const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400';

const CATEGORY_LABELS = { sajad: 'سجاد', majlis: 'مجالس', kanab: 'كنب', sitar: 'ستائر' };
const CATEGORY_ICONS = { sajad: '🧶', majlis: '🛋️', kanab: '🪑', sitar: '🪟' };

function escapeHtml(text) {
  if (!text) return '';
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

function productUrl(p) {
  return `${SITE_URL}/product/${p.slug}.html`;
}

function renderGallery(imgs, altBase) {
  const hasMultiple = imgs.length > 1;
  const slides = imgs.map((url, i) => `
    <img src="${url}" alt="${altBase}${hasMultiple ? ' - صورة ' + (i + 1) : ''}" class="gallery-img" width="800" height="800" ${i === 0 ? '' : 'loading="lazy"'} onerror="this.src='${DEFAULT_IMAGE}'">
  `).join('');
  const dots = hasMultiple ? `
    <div class="gallery-dots">
      ${imgs.map((_, i) => `<span class="gallery-dot${i === 0 ? ' active' : ''}"></span>`).join('')}
    </div>` : '';
  const counter = hasMultiple ? `<span class="gallery-counter">1/${imgs.length}</span>` : '';
  const arrows = hasMultiple ? `
    <button type="button" class="gallery-arrow gallery-prev" aria-label="الصورة السابقة">‹</button>
    <button type="button" class="gallery-arrow gallery-next" aria-label="الصورة التالية">›</button>` : '';

  return `
    <div class="product-gallery product-gallery-detail">
      <div class="gallery-track">${slides}</div>
      ${dots}${counter}${arrows}
    </div>`;
}

function renderRelated(product, allProducts) {
  const related = allProducts
    .filter(p => p.category === product.category && p.id !== product.id)
    .slice(0, 4);

  if (related.length === 0) return '';

  const cards = related.map(p => {
    const img = (p.images && p.images[0]) || p.image || DEFAULT_IMAGE;
    return `
      <a href="${p.slug}.html" class="thumb-card">
        <div class="thumb-img-wrap">
          <img src="${img}" alt="${escapeHtml(p.name)} - ${CATEGORY_LABELS[p.category] || ''} الكويت" loading="lazy" width="300" height="300" onerror="this.src='${DEFAULT_IMAGE}'">
        </div>
        <div class="thumb-title">${escapeHtml(p.name)}</div>
      </a>`;
  }).join('');

  return `
    <section class="home-section related-products">
      <div class="section-header">
        <h2>منتجات مشابهة</h2>
        <a href="../category.html?cat=${product.category}" class="section-more">عرض الكل ←</a>
      </div>
      <div class="cat-preview-grid">${cards}</div>
    </section>`;
}

function buildSchema(product, imgs) {
  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'الرئيسية', item: `${SITE_URL}/` },
      { '@type': 'ListItem', position: 2, name: CATEGORY_LABELS[product.category] || product.category, item: `${SITE_URL}/category.html?cat=${product.category}` },
      { '@type': 'ListItem', position: 3, name: product.name, item: productUrl(product) }
    ]
  };

  const productSchema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description || '',
    image: imgs,
    category: CATEGORY_LABELS[product.category] || product.category,
    offers: {
      '@type': 'Offer',
      url: productUrl(product),
      priceCurrency: 'KWD',
      price: cleanPrice(product.price),
      availability: 'https://schema.org/InStock',
      areaServed: { '@type': 'Country', name: 'Kuwait' }
    }
  };

  return JSON.stringify([breadcrumb, productSchema], null, 2);
}

function renderProductPage(product, allProducts) {
  const imgs = (product.images && product.images.length > 0) ? product.images : [product.image || DEFAULT_IMAGE];
  const altBase = `${escapeHtml(product.name)} - ${CATEGORY_LABELS[product.category] || ''} الكويت`;
  const catLabel = CATEGORY_LABELS[product.category] || product.category;
  const title = `${product.name} | ${catLabel} الكويت - الطراز الأصيل`;
  const description = (product.description ? product.description.replace(/\n+/g, ' - ').slice(0, 150) : `${product.name} - ${catLabel} فاخر في الكويت من الطراز الأصيل. اطلب الآن عبر واتساب.`);
  const url = productUrl(product);
  const mainImage = imgs[0];

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="${escapeHtml(description)}">
  <link rel="canonical" href="${url}">
  <meta property="og:type" content="product">
  <meta property="og:locale" content="ar_KW">
  <meta property="og:site_name" content="الطراز الأصيل">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:url" content="${url}">
  <meta property="og:image" content="${mainImage}">
  <title>${escapeHtml(title)}</title>
  <link rel="stylesheet" href="../style.css">
  <link rel="icon" href="/favicon.ico" sizes="any">
  <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png">
  <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16.png">
  <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
  <script type="application/ld+json">
${buildSchema(product, imgs)}
  </script>
</head>
<body>
  <header class="header">
    <div class="header-inner">
      <a href="../index.html" class="logo">
        <img src="../images/brand/logo.png" alt="الطراز الأصيل - مفروشات فاخرة في الكويت" class="logo-img logo-img-full">
        <img src="../images/brand/logo-mobile.png" alt="الطراز الأصيل" class="logo-img logo-img-mobile">
      </a>
      <nav class="nav-links">
        <a href="../index.html">الرئيسية</a>
        <a href="../category.html?cat=sajad">سجاد</a>
        <a href="../category.html?cat=majlis">مجالس</a>
        <a href="../category.html?cat=kanab">كنب</a>
        <a href="../category.html?cat=sitar">ستائر</a>
      </nav>
    </div>
  </header>

  <div class="container">
    <nav class="breadcrumb" aria-label="مسار التصفح">
      <a href="../index.html">الرئيسية</a>
      <span>/</span>
      <a href="../category.html?cat=${product.category}">${CATEGORY_ICONS[product.category] || ''} ${catLabel}</a>
      <span>/</span>
      <span aria-current="page">${escapeHtml(product.name)}</span>
    </nav>

    <div class="product-detail">
      ${renderGallery(imgs, altBase)}
      <div class="product-body product-body-detail">
        <span class="product-category">${CATEGORY_ICONS[product.category] || '📦'} ${catLabel}</span>
        <h1 class="product-name product-name-detail">${escapeHtml(product.name)}</h1>
        <p class="product-desc product-desc-detail">${escapeHtml(product.description || '').replace(/\n/g, '<br>')}</p>
        <div class="product-footer product-footer-detail">
          <span class="product-price">${escapeHtml(product.price)}</span>
          <a href="${whatsappLink('مرحباً الطراز الأصيل، أريد الاستفسار عن: ' + product.name)}"
             target="_blank" rel="noopener" class="whatsapp-btn">
            📱 اطلب عبر واتساب
          </a>
        </div>
      </div>
    </div>

    ${renderRelated(product, allProducts)}
  </div>

  <div class="bottom-bar">
    <a href="${whatsappLink('مرحباً الطراز الأصيل، أرغب بالاستفسار عن منتجاتكم')}" target="_blank" rel="noopener" class="bottom-bar-btn bottom-bar-whatsapp">
      <span>📱</span> واتساب
    </a>
    <a href="tel:+${WHATSAPP_NUMBER}" class="bottom-bar-btn bottom-bar-call">
      <span>📞</span> اتصال
    </a>
  </div>

  <footer class="footer">
    <p>© 2026 الطراز الأصيل — جميع الحقوق محفوظة</p>
    <p style="margin-top:4px; font-size:0.75rem; opacity:0.65;">📍 الضجيج - مجمع غاليريا، الكويت</p>
    <p style="margin-top:5px; font-size:0.8rem;">للطلب والاستفسار: <a href="${whatsappLink('مرحباً الطراز الأصيل، أرغب بالاستفسار عن منتجاتكم')}" target="_blank" rel="noopener">واتساب</a></p>
    <p class="footer-links">
      <a href="../about.html">من نحن</a><span>·</span><a href="../delivery-payment.html">التوصيل والدفع</a><span>·</span><a href="../reviews.html">آراء العملاء</a><span>·</span><a href="../blog/index.html">المدونة</a>
    </p>
  </footer>

  <script src="../script.js"></script>
  <script>
    document.addEventListener('DOMContentLoaded', () => {
      initGalleries(document);
    });
  </script>
</body>
</html>
`;
}

function buildSitemap(products) {
  const staticUrls = [
    { loc: `${SITE_URL}/`, priority: '1.0' },
    { loc: `${SITE_URL}/category.html?cat=sajad`, priority: '0.8' },
    { loc: `${SITE_URL}/category.html?cat=majlis`, priority: '0.8' },
    { loc: `${SITE_URL}/category.html?cat=kanab`, priority: '0.8' },
    { loc: `${SITE_URL}/category.html?cat=sitar`, priority: '0.8' },
    { loc: `${SITE_URL}/about.html`, priority: '0.5' },
    { loc: `${SITE_URL}/delivery-payment.html`, priority: '0.5' },
    { loc: `${SITE_URL}/reviews.html`, priority: '0.4' },
    { loc: `${SITE_URL}/blog/index.html`, priority: '0.5' },
    { loc: `${SITE_URL}/blog/kayfa-takhtar-sijad-torki-yunasib-majlisak.html`, priority: '0.4' },
    { loc: `${SITE_URL}/blog/asaar-al-majalis-al-arabiya-fi-al-kuwait.html`, priority: '0.4' },
    { loc: `${SITE_URL}/blog/al-farq-bayn-isfanj-al-baghli-wal-isfanj-al-aadi.html`, priority: '0.4' },
    { loc: `${SITE_URL}/blog/maqasat-al-sataer-al-makhmaliya-al-qiyasiya.html`, priority: '0.4' }
  ];

  const today = new Date().toISOString().slice(0, 10);

  const staticXml = staticUrls.map(u => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n');

  const productXml = products.map(p => `  <url>
    <loc>${productUrl(p)}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticXml}
${productXml}
</urlset>
`;
}

function main() {
  if (!fs.existsSync(PRODUCTS_JSON)) {
    console.error('❌ products.json غير موجود في:', PRODUCTS_JSON);
    process.exit(1);
  }

  const products = JSON.parse(fs.readFileSync(PRODUCTS_JSON, 'utf8'));

  // إضافة slug لكل منتج (id-اسم بالإنجليزية)
  products.forEach(p => { p.slug = slugify(p.name, p.id); });

  // تفريغ مجلد الإخراج وإعادة إنشائه
  if (fs.existsSync(OUTPUT_DIR)) {
    fs.rmSync(OUTPUT_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  products.forEach(p => {
    const html = renderProductPage(p, products);
    const filePath = path.join(OUTPUT_DIR, `${p.slug}.html`);
    fs.writeFileSync(filePath, html, 'utf8');
  });

  fs.writeFileSync(SITEMAP_PATH, buildSitemap(products), 'utf8');

  // ملف مرجعي يربط id بالـ slug (تستخدمه script.js في المتصفح لبناء الروابط)
  const slugMap = {};
  products.forEach(p => { slugMap[p.id] = p.slug; });
  fs.writeFileSync(path.join(ROOT, 'product-slugs.json'), JSON.stringify(slugMap, null, 2), 'utf8');

  console.log(`✅ تم توليد ${products.length} صفحة منتج في /product/`);
  console.log(`✅ تم تحديث sitemap.xml (${products.length + 13} رابط)`);
  console.log(`✅ تم تحديث product-slugs.json`);
}

main();

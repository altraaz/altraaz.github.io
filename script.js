// ========== Configuration ==========
const WHATSAPP_NUMBER = '96566462190';
const CALL_NUMBER = '+96566462190';
const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400';
const STORAGE_KEY = 'ta_products';
const API_BASE = 'https://altraaz-api.altraaz.workers.dev';

const CATEGORY_LABELS = {
  sajad: 'سجاد',
  majlis: 'مجالس',
  kanab: 'كنب',
  sitar: 'ستائر'
};

const CATEGORY_ICONS = {
  sajad: '🧶',
  majlis: '🛋️',
  kanab: '🪑',
  sitar: '🪟'
};

// عناوين ووصف مخصص لكل قسم — يمنع تطابق محتوى صفحات الأقسام في نتائج البحث
const CATEGORY_META = {
  sajad: {
    title: 'سجاد تركي فاخر في الكويت | تفصيل وتركيب - الطراز الأصيل',
    description: 'سجاد تركي سميك وسجاد مفروش بجودة عالية في الكويت، مع خدمة تركيب وتوصيل لجميع المناطق. اطلب الآن عبر واتساب.',
    subtitle: 'سجاد تركي فاخر بمقاسات وأشكال متعددة، مع خدمة تفصيل وتركيب في جميع مناطق الكويت'
  },
  majlis: {
    title: 'مجالس عربية وتفصيل مساند ظهر ديكور في الكويت - الطراز الأصيل',
    description: 'مجالس عربية فاخرة وتفصيل مساند ظهر بإسفنج البغلي عالي الجودة في الكويت. تواصل معنا عبر واتساب للطلب والتفصيل.',
    subtitle: 'مجالس عربية فاخرة وتفصيل مساند ظهر ديكور بجودة اسفنج البغلي، متوفرة للتوصيل داخل الكويت'
  },
  kanab: {
    title: 'كنب مودرن وقنفة تركي في الكويت - الطراز الأصيل',
    description: 'كنب مودرن وقنفة بخامات تركية وإسفنج البغلي عالي الجودة، بأسعار مناسبة وتوصيل لجميع مناطق الكويت.',
    subtitle: 'كنب مودرن وقنفة بخامة تركية أصلية، مناسب لجميع أنماط الديكور المنزلي في الكويت'
  },
  sitar: {
    title: 'ستائر مخمل فاخرة في الكويت | تفصيل حسب المقاس - الطراز الأصيل',
    description: 'ستائر مخمل ثقيلة وعازلة للضوء بجودة عالية، تفصيل حسب المقاس وتوصيل سريع لجميع مناطق الكويت.',
    subtitle: 'ستائر مخمل فاخرة تُفصّل حسب المقاس، بتوصيل سريع لجميع مناطق الكويت'
  }
};

const CATEGORY_BG = {
  sajad: 'linear-gradient(135deg, #8B4513 0%, #D2691E 100%)',
  majlis: 'linear-gradient(135deg, #2F4F4F 0%, #556B2F 100%)',
  kanab: 'linear-gradient(135deg, #4A3728 0%, #8B7355 100%)',
  sitar: 'linear-gradient(135deg, #483D8B 0%, #6A5ACD 100%)'
};

const FALLBACK_PRODUCTS = [
  {
    id: 1,
    name: 'سجاد تركي فاخر - أحمر',
    description: 'سجاد تركي 100% صوف، نسيج يدوي، مقاس 3x4 متر',
    price: '205 د.ك',
    category: 'sajad',
    image: 'https://images.unsplash.com/photo-1600166898405-da9535204843?w=400'
  },
  {
    id: 2,
    name: 'مجلس عربي كلاسيكي',
    description: 'مجلس عربي فاخر بألوان بيج وذهبي، يتسع لـ 12 شخص',
    price: '393 د.ك',
    category: 'majlis',
    image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400'
  },
  {
    id: 3,
    name: 'كنبة جلد إيطالي',
    description: 'كنبة 3 مقاعد جلد طبيعي، تصميم إيطالي عصري',
    price: '262 د.ك',
    category: 'kanab',
    image: 'https://images.unsplash.com/photo-1550226891-ef816aed4a98?w=400'
  },
  {
    id: 4,
    name: 'ستائر مخمل فاخرة',
    description: 'ستائر مخمل ثقيلة مع بطانة عازلة للضوء',
    price: '98 د.ك',
    category: 'sitar',
    image: 'https://images.unsplash.com/photo-1507089947368-19c1da9775ae?w=400'
  }
];

let currentImages = [];
let editingId = null;
let isPublishing = false;

// ========== API Helpers ==========
async function apiRequest(endpoint, body) {
  const password = sessionStorage.getItem('adminPass') || '';
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Password': password
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Network error' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// ========== Data Management ==========
async function loadProducts() {
  try {
    const res = await fetch('products.json?v=' + Date.now());
    if (!res.ok) throw new Error('products.json not reachable');
    const data = await res.json();
    const migrated = data.map(p => {
      if (typeof p.image === 'string' && (!p.images || !Array.isArray(p.images))) {
        return { ...p, images: [p.image] };
      }
      return p;
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
  } catch (err) {
    console.warn('Failed to fetch products.json:', err);
    if (!localStorage.getItem(STORAGE_KEY)) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(FALLBACK_PRODUCTS));
    }
  }
}

function getProducts() {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? JSON.parse(stored) : [];
}

function saveProductsLocal(products) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
}

// ========== Homepage ==========
function renderHomepage() {
  const container = document.getElementById('homeSections');
  if (!container) return;

  const products = getProducts();
  const cats = ['sajad', 'majlis', 'kanab', 'sitar'];

  container.innerHTML = cats.map(cat => {
    const catProducts = products.filter(p => p.category === cat).slice(-2).reverse();
    if (catProducts.length === 0) return '';

    const cards = catProducts.map(p => productCard(p)).join('');

    return `
      <section class="home-section">
        <div class="section-header">
          <h2>${CATEGORY_ICONS[cat]} ${CATEGORY_LABELS[cat]}</h2>
          <a href="category.html?cat=${cat}" class="section-more">عرض الكل ←</a>
        </div>
        <div class="products-grid products-grid--compact">${cards}</div>
      </section>
    `;
  }).join('');

  initGalleries(container);
}

// ========== Category Page ==========
function renderCategoryPage() {
  const params = new URLSearchParams(window.location.search);
  const cat = params.get('cat');
  if (!cat) return;

  const titleEl = document.getElementById('catTitle');
  const subEl = document.getElementById('catSubtitle');
  const hero = document.getElementById('catHero');
  const grid = document.getElementById('productsGrid');
  const empty = document.getElementById('emptyState');
  const meta = CATEGORY_META[cat];
  const pageUrl = `https://altraaz.github.io/category.html?cat=${cat}`;

  if (titleEl) titleEl.textContent = CATEGORY_LABELS[cat] || cat;
  if (subEl) subEl.textContent = meta ? meta.subtitle : 'اختر ما يناسب ذوقك من تشكيلة ' + (CATEGORY_LABELS[cat] || cat);
  if (hero) hero.style.background = CATEGORY_BG[cat] || CATEGORY_BG.sajad;

  // تحديث عنوان الصفحة والوصف والرابط الأساسي بما يخص هذا القسم تحديداً
  if (meta) {
    document.title = meta.title;
    const metaDesc = document.getElementById('metaDescription');
    if (metaDesc) metaDesc.setAttribute('content', meta.description);
    const ogTitle = document.getElementById('ogTitle');
    if (ogTitle) ogTitle.setAttribute('content', meta.title);
    const ogDesc = document.getElementById('ogDescription');
    if (ogDesc) ogDesc.setAttribute('content', meta.description);
  }
  const ogUrl = document.getElementById('ogUrl');
  if (ogUrl) ogUrl.setAttribute('content', pageUrl);
  const canonical = document.getElementById('canonicalLink');
  if (canonical) canonical.setAttribute('href', pageUrl);

  const products = getProducts().filter(p => p.category === cat);

  if (products.length === 0) {
    if (grid) grid.style.display = 'none';
    if (empty) empty.style.display = 'block';
    return;
  }

  if (grid) {
    grid.style.display = 'grid';
    grid.innerHTML = products.map(p => productCard(p)).join('');
    initGalleries(grid);
  }
  if (empty) empty.style.display = 'none';

  injectCategorySchema(cat, products, pageUrl);
}

// بيانات منظّمة (Schema): مسار تصفح + قائمة منتجات القسم بأسعارها
function injectCategorySchema(cat, products, pageUrl) {
  const old = document.getElementById('categorySchema');
  if (old) old.remove();

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'الرئيسية', item: 'https://altraaz.github.io/' },
      { '@type': 'ListItem', position: 2, name: CATEGORY_LABELS[cat] || cat, item: pageUrl }
    ]
  };

  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: CATEGORY_LABELS[cat] || cat,
    itemListElement: products.map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'Product',
        name: p.name,
        description: p.description || '',
        image: (p.images && p.images[0]) || p.image || DEFAULT_IMAGE,
        offers: {
          '@type': 'Offer',
          priceCurrency: 'KWD',
          price: String(p.price).replace(/[^\d.]/g, '') || '0',
          availability: 'https://schema.org/InStock'
        }
      }
    }))
  };

  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.id = 'categorySchema';
  script.textContent = JSON.stringify([breadcrumb, itemList]);
  document.head.appendChild(script);
}

// ========== Product Card ==========
function productCard(p) {
  const imgs = (p.images && p.images.length > 0) ? p.images : [p.image || DEFAULT_IMAGE];
  const hasMultiple = imgs.length > 1;
  const altBase = `${escapeHtml(p.name)} - ${CATEGORY_LABELS[p.category] || ''} الكويت`;

  const slides = imgs.map((url, i) => `
    <img src="${url}" alt="${altBase}${hasMultiple ? ' - صورة ' + (i + 1) : ''}" class="gallery-img" loading="lazy" onerror="this.src='${DEFAULT_IMAGE}'">
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
    <div class="product-card">
      <div class="product-gallery">
        <div class="gallery-track">${slides}</div>
        ${dots}${counter}${arrows}
      </div>
      <div class="product-body">
        <span class="product-category">${CATEGORY_ICONS[p.category] || '📦'} ${CATEGORY_LABELS[p.category] || p.category}</span>
        <h3 class="product-name">${escapeHtml(p.name)}</h3>
        <p class="product-desc">${escapeHtml(p.description || '')}</p>
        <div class="product-footer">
          <span class="product-price">${escapeHtml(p.price)}</span>
          <a href="${whatsappLink('مرحباً الطراز الأصيل، أريد الاستفسار عن: ' + p.name)}"
             target="_blank" rel="noopener" class="whatsapp-btn">
            📱 واتساب
          </a>
        </div>
      </div>
    </div>
  `;
}

// تفعيل التمرير بين الصور: سحب سلس + نقاط + أسهم + عداد، لكل بطاقة فيها أكثر من صورة
function initGalleries(container) {
  if (!container) return;
  container.querySelectorAll('.product-gallery').forEach(gallery => {
    const track = gallery.querySelector('.gallery-track');
    const dots = gallery.querySelectorAll('.gallery-dot');
    const counter = gallery.querySelector('.gallery-counter');
    const count = dots.length;
    if (!track || count === 0) return;

    let current = 0;

    const goTo = (i) => {
      i = Math.max(0, Math.min(count - 1, i));
      track.scrollTo({ left: i * track.clientWidth, behavior: 'smooth' });
    };

    const syncActive = () => {
      const i = Math.round(track.scrollLeft / track.clientWidth);
      if (i === current || i < 0 || i >= count) return;
      current = i;
      dots.forEach((d, idx) => d.classList.toggle('active', idx === current));
      if (counter) counter.textContent = `${current + 1}/${count}`;
    };

    let ticking = false;
    track.addEventListener('scroll', () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => { syncActive(); ticking = false; });
    }, { passive: true });

    dots.forEach((dot, idx) => dot.addEventListener('click', () => goTo(idx)));

    const prevBtn = gallery.querySelector('.gallery-prev');
    const nextBtn = gallery.querySelector('.gallery-next');
    if (prevBtn) prevBtn.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); goTo(current - 1); });
    if (nextBtn) nextBtn.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); goTo(current + 1); });
  });
}

function whatsappLink(message) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

function wireWhatsappLinks() {
  document.querySelectorAll('[data-whatsapp-link]').forEach(el => {
    el.href = whatsappLink('مرحباً الطراز الأصيل، أرغب بالاستفسار عن منتجاتكم');
  });
  document.querySelectorAll('[data-call-link]').forEach(el => {
    el.href = `tel:${CALL_NUMBER}`;
  });
}

// ========== Admin Functions ==========
async function addProduct(e) {
  e.preventDefault();
  if (isPublishing) return false;

  const name = document.getElementById('pName').value.trim();
  const price = document.getElementById('pPrice').value.trim();
  const category = document.getElementById('pCategory').value;
  const description = document.getElementById('pDesc').value.trim();

  if (!name || !price || !category) {
    showToast('❌ يرجى ملء جميع الحقول المطلوبة');
    return false;
  }

  isPublishing = true;
  const submitBtn = document.getElementById('submitBtn');
  if (submitBtn) submitBtn.disabled = true;

  showToast('⏳ جاري النشر...');

  try {
    let imageUrls = [];
    const newImages = currentImages.filter(img => img.startsWith('data:image'));
    const existingImages = currentImages.filter(img => !img.startsWith('data:image'));

    for (let i = 0; i < newImages.length; i++) {
      showToast(`📤 جاري رفع الصورة ${i + 1} من ${newImages.length}...`);
      const uploadRes = await apiRequest('/api/upload-image', {
        image: newImages[i],
        filename: `product_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 5)}.jpg`
      });
      imageUrls.push(uploadRes.url);
    }

    imageUrls = [...existingImages, ...imageUrls];
    if (imageUrls.length === 0) imageUrls = [DEFAULT_IMAGE];

    let products = getProducts();

    if (editingId !== null) {
      const idx = products.findIndex(p => p.id === editingId);
      if (idx !== -1) {
        products[idx] = { ...products[idx], name, price, category, description, image: imageUrls[0], images: imageUrls };
      }
    } else {
      const newId = products.length > 0 ? Math.max(...products.map(p => p.id)) + 1 : 1;
      products.push({ id: newId, name, price, category, description, image: imageUrls[0], images: imageUrls });
    }

    showToast('📝 جاري حفظ التغييرات على GitHub...');
    await apiRequest('/api/publish-products', { products });

    saveProductsLocal(products);
    showToast('✅ تم النشر بنجاح!');

    document.getElementById('addForm').reset();
    removeAllImages();
    if (editingId !== null) cancelEdit();
    renderAdminTable();

  } catch (err) {
    showToast('❌ فشل النشر: ' + err.message);
    console.error(err);
  } finally {
    isPublishing = false;
    if (submitBtn) submitBtn.disabled = false;
  }

  return false;
}

function startEdit(id) {
  const products = getProducts();
  const p = products.find(item => item.id === id);
  if (!p) return;

  editingId = id;
  document.getElementById('pName').value = p.name;
  document.getElementById('pPrice').value = p.price;
  document.getElementById('pCategory').value = p.category;
  document.getElementById('pDesc').value = p.description || '';
  currentImages = p.images || [p.image];
  renderImagePreviews();

  document.getElementById('formTitle').textContent = '✏️ تعديل المنتج';
  document.getElementById('submitBtn').textContent = '💾 تحديث المنتج';
  document.getElementById('cancelEditBtn').style.display = 'inline-flex';
  document.getElementById('addForm').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function cancelEdit() {
  editingId = null;
  document.getElementById('addForm').reset();
  removeAllImages();
  document.getElementById('formTitle').textContent = '➕ إضافة منتج جديد';
  document.getElementById('submitBtn').textContent = '💾 حفظ المنتج';
  document.getElementById('cancelEditBtn').style.display = 'none';
}

async function deleteProduct(id) {
  if (!confirm('هل أنت متأكد من حذف هذا المنتج؟')) return;

  isPublishing = true;
  showToast('⏳ جاري الحذف...');

  try {
    let products = getProducts();
    products = products.filter(p => p.id !== id);

    showToast('📝 جاري حفظ التغييرات على GitHub...');
    await apiRequest('/api/publish-products', { products });

    saveProductsLocal(products);
    if (editingId === id) cancelEdit();
    renderAdminTable();
    showToast('🗑️ تم حذف المنتج ونشر التغييرات');
  } catch (err) {
    showToast('❌ فشل الحذف: ' + err.message);
  } finally {
    isPublishing = false;
  }
}

function renderAdminTable(searchTerm) {
  const tbody = document.getElementById('adminTableBody');
  const empty = document.getElementById('adminEmpty');
  if (!tbody) return;

  let products = getProducts();
  const term = (searchTerm || '').trim().toLowerCase();
  if (term) {
    products = products.filter(p => p.name.toLowerCase().includes(term));
  }

  const totalCount = document.getElementById('adminCount');
  if (totalCount) totalCount.textContent = `${getProducts().length} منتج`;

  if (products.length === 0) {
    tbody.innerHTML = '';
    empty.style.display = 'block';
    return;
  }

  empty.style.display = 'none';
  tbody.innerHTML = products.map(p => {
    const imgs = p.images || [p.image];
    const thumbs = imgs.slice(0, 3).map(url => `<img src="${url}" alt="" onerror="this.src='${DEFAULT_IMAGE}'">`).join('');
    const more = imgs.length > 3 ? `<span style="color:var(--admin-accent); font-size:0.75rem;">+${imgs.length - 3}</span>` : '';
    return `
    <tr>
      <td>${p.id}</td>
      <td><div class="admin-thumb-grid">${thumbs}${more}</div></td>
      <td><strong>${escapeHtml(p.name)}</strong></td>
      <td>${CATEGORY_LABELS[p.category] || p.category}</td>
      <td>${escapeHtml(p.price)}</td>
      <td>
        <button class="btn-edit" onclick="startEdit(${p.id})">✏️ تعديل</button>
        <button class="btn-danger" onclick="deleteProduct(${p.id})">🗑️ حذف</button>
      </td>
    </tr>
  `}).join('');
}

function handleImageFile(event) {
  const files = Array.from(event.target.files || []);
  if (files.length === 0) return;

  let processed = 0;
  files.forEach(file => {
    if (!file.type.startsWith('image/')) {
      showToast('❌ ملف غير صالح: ' + file.name);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const MAX_DIM = 900;
        let { width, height } = img;
        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) {
            height = Math.round(height * (MAX_DIM / width));
            width = MAX_DIM;
          } else {
            width = Math.round(width * (MAX_DIM / height));
            height = MAX_DIM;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        currentImages.push(canvas.toDataURL('image/jpeg', 0.75));
        processed++;
        if (processed === files.length) {
          renderImagePreviews();
        }
      };
      img.onerror = () => showToast('❌ تعذّرت قراءة: ' + file.name);
      img.src = e.target.result;
    };
    reader.onerror = () => showToast('❌ تعذّرت قراءة: ' + file.name);
    reader.readAsDataURL(file);
  });
}

function renderImagePreviews() {
  const container = document.getElementById('imagePreviews');
  const removeBtn = document.getElementById('removeImagesBtn');
  if (!container) return;

  if (currentImages.length === 0) {
    container.innerHTML = '';
    if (removeBtn) removeBtn.style.display = 'none';
    return;
  }

  container.innerHTML = currentImages.map((src, i) => `
    <div class="preview-item">
      <img src="${src}" alt="صورة ${i + 1}">
      <button type="button" class="preview-remove" onclick="removeImageAt(${i})">×</button>
      ${i === 0 ? '<span class="preview-badge">رئيسية</span>' : ''}
    </div>
  `).join('');

  if (removeBtn) removeBtn.style.display = 'inline-flex';
}

function removeImageAt(index) {
  currentImages.splice(index, 1);
  renderImagePreviews();
}

function removeAllImages() {
  currentImages = [];
  const fileInput = document.getElementById('pImageFile');
  if (fileInput) fileInput.value = '';
  renderImagePreviews();
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function showToast(message) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 4000);
}

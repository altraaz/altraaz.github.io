// ========== Configuration ==========
const WHATSAPP_NUMBER = '96566462190';
const CALL_NUMBER = '+96566462190';
const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400';
const STORAGE_KEY = 'ta_products';

// ✅ رابط الـ Worker — تم ضبطه
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

let currentCategory = 'all';
let currentSearch = '';
let editingId = null;
let currentImageData = '';
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
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
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

// ========== Visitor Page: Display ==========
function filterProducts(category) {
  currentCategory = category;
  document.querySelectorAll('.cat-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.cat === category);
  });
  renderStorefront();
}

function searchProducts(term) {
  currentSearch = term.trim().toLowerCase();
  renderStorefront();
}

function renderStorefront() {
  const products = getProducts();
  const grid = document.getElementById('productsGrid');
  const empty = document.getElementById('emptyState');
  const title = document.getElementById('sectionTitle');
  const count = document.getElementById('sectionCount');

  if (!grid) return;

  title.textContent = currentCategory === 'all' ? 'جميع المنتجات' : (CATEGORY_LABELS[currentCategory] || currentCategory);

  let filtered = currentCategory === 'all' ? products : products.filter(p => p.category === currentCategory);
  if (currentSearch) {
    filtered = filtered.filter(p =>
      p.name.toLowerCase().includes(currentSearch) ||
      (p.description || '').toLowerCase().includes(currentSearch)
    );
  }

  if (count) count.textContent = `${filtered.length} منتج`;

  if (filtered.length === 0) {
    grid.style.display = 'none';
    empty.style.display = 'block';
    return;
  }

  grid.style.display = 'grid';
  empty.style.display = 'none';

  grid.innerHTML = filtered.map(p => `
    <div class="product-card">
      <img src="${p.image || DEFAULT_IMAGE}" alt="${escapeHtml(p.name)}" class="product-img" loading="lazy" onerror="this.src='${DEFAULT_IMAGE}'">
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
  `).join('');
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

// ========== Admin: Add / Update / Delete Product ==========
function _addProductLocal(name, price, category, description) {
  const products = getProducts();
  const image = currentImageData || DEFAULT_IMAGE;

  if (editingId !== null) {
    const idx = products.findIndex(p => p.id === editingId);
    if (idx !== -1) {
      products[idx] = { ...products[idx], name, price, category, description, image };
    }
    try {
      saveProductsLocal(products);
    } catch (err) {
      showToast('❌ الصورة كبيرة جداً على مساحة التخزين، جرّب صورة أصغر');
      return false;
    }
    showToast('✅ تم تحديث المنتج بنجاح (محلي فقط)');
    cancelEdit();
  } else {
    const newId = products.length > 0 ? Math.max(...products.map(p => p.id)) + 1 : 1;
    products.push({ id: newId, name, price, category, description, image });
    try {
      saveProductsLocal(products);
    } catch (err) {
      products.pop();
      showToast('❌ الصورة كبيرة جداً على مساحة التخزين، جرّب صورة أصغر');
      return false;
    }
    document.getElementById('addForm').reset();
    removeImageFile();
    showToast('✅ تم إضافة المنتج بنجاح (محلي فقط)');
  }
  renderAdminTable();
  return false;
}

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

  if (!API_BASE) {
    return _addProductLocal(name, price, category, description);
  }

  isPublishing = true;
  const submitBtn = document.getElementById('submitBtn');
  if (submitBtn) submitBtn.disabled = true;

  showToast('⏳ جاري النشر...');

  try {
    let imageUrl = currentImageData;

    if (currentImageData && currentImageData.startsWith('data:image')) {
      showToast('📤 جاري رفع الصورة...');
      const uploadRes = await apiRequest('/api/upload-image', {
        image: currentImageData,
        filename: `product_${Date.now()}_${Math.random().toString(36).substr(2, 5)}.jpg`
      });
      imageUrl = uploadRes.url;
    } else if (!currentImageData) {
      imageUrl = DEFAULT_IMAGE;
    }

    let products = getProducts();

    if (editingId !== null) {
      const idx = products.findIndex(p => p.id === editingId);
      if (idx !== -1) {
        products[idx] = { ...products[idx], name, price, category, description, image: imageUrl };
      }
    } else {
      const newId = products.length > 0 ? Math.max(...products.map(p => p.id)) + 1 : 1;
      products.push({ id: newId, name, price, category, description, image: imageUrl });
    }

    showToast('📝 جاري حفظ التغييرات على GitHub...');
    await apiRequest('/api/publish-products', { products });

    saveProductsLocal(products);

    showToast('✅ تم النشر بنجاح! قد يستغرق 30–90 ثانية ليظهر للزوار.');

    document.getElementById('addForm').reset();
    removeImageFile();
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
  currentImageData = p.image || '';
  const preview = document.getElementById('imagePreview');
  const removeBtn = document.getElementById('removeImageBtn');
  if (currentImageData && preview) {
    preview.src = currentImageData;
    preview.style.display = 'block';
    if (removeBtn) removeBtn.style.display = 'inline-flex';
  } else {
    hideImagePreview();
  }

  document.getElementById('formTitle').textContent = '✏️ تعديل المنتج';
  document.getElementById('submitBtn').textContent = '💾 تحديث المنتج';
  document.getElementById('cancelEditBtn').style.display = 'inline-flex';
  document.getElementById('addForm').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function cancelEdit() {
  editingId = null;
  document.getElementById('addForm').reset();
  removeImageFile();
  document.getElementById('formTitle').textContent = '➕ إضافة منتج جديد';
  document.getElementById('submitBtn').textContent = '💾 حفظ المنتج';
  document.getElementById('cancelEditBtn').style.display = 'none';
}

async function deleteProduct(id) {
  if (!confirm('هل أنت متأكد من حذف هذا المنتج؟')) return;

  if (!API_BASE) {
    let products = getProducts();
    products = products.filter(p => p.id !== id);
    saveProductsLocal(products);
    if (editingId === id) cancelEdit();
    renderAdminTable();
    showToast('🗑️ تم حذف المنتج');
    return;
  }

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

// ========== Admin: Render Table ==========
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
  tbody.innerHTML = products.map(p => `
    <tr>
      <td>${p.id}</td>
      <td><img src="${p.image || DEFAULT_IMAGE}" alt="" onerror="this.src='${DEFAULT_IMAGE}'"></td>
      <td><strong>${escapeHtml(p.name)}</strong></td>
      <td>${CATEGORY_LABELS[p.category] || p.category}</td>
      <td>${escapeHtml(p.price)}</td>
      <td>
        <button class="btn-edit" onclick="startEdit(${p.id})">✏️ تعديل</button>
        <button class="btn-danger" onclick="deleteProduct(${p.id})">🗑️ حذف</button>
      </td>
    </tr>
  `).join('');
}

// ========== Admin: Image Upload ==========
function handleImageFile(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    showToast('❌ الملف المختار ليس صورة');
    event.target.value = '';
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
      currentImageData = canvas.toDataURL('image/jpeg', 0.75);

      const preview = document.getElementById('imagePreview');
      const removeBtn = document.getElementById('removeImageBtn');
      if (preview) {
        preview.src = currentImageData;
        preview.style.display = 'block';
      }
      if (removeBtn) removeBtn.style.display = 'inline-flex';
    };
    img.onerror = () => showToast('❌ تعذّرت قراءة الصورة، جرّب صورة أخرى');
    img.src = e.target.result;
  };
  reader.onerror = () => showToast('❌ تعذّرت قراءة الصورة، جرّب صورة أخرى');
  reader.readAsDataURL(file);
}

function removeImageFile() {
  currentImageData = '';
  const fileInput = document.getElementById('pImageFile');
  if (fileInput) fileInput.value = '';
  hideImagePreview();
}

function hideImagePreview() {
  const preview = document.getElementById('imagePreview');
  const removeBtn = document.getElementById('removeImageBtn');
  if (preview) { preview.style.display = 'none'; preview.src = ''; }
  if (removeBtn) removeBtn.style.display = 'none';
}

// ========== Utilities ==========
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


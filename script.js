// ========== Configuration ==========
// Single source of truth for the WhatsApp number — used on the storefront
// and in the footer. Change it here only.
const WHATSAPP_NUMBER = '966501234567'; // ← رقم واتساب المتجر (بالصيغة الدولية بدون +)

const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400';
const STORAGE_KEY = 'ta_products';

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

// Fallback data used only if products.json can't be fetched (e.g. the site
// is opened directly as a local file instead of through a web server).
const FALLBACK_PRODUCTS = [
  {
    id: 1,
    name: 'سجاد تركي فاخر - أحمر',
    description: 'سجاد تركي 100% صوف، نسيج يدوي، مقاس 3x4 متر',
    price: '2,500 ر.س',
    category: 'sajad',
    image: 'https://images.unsplash.com/photo-1600166898405-da9535204843?w=400'
  },
  {
    id: 2,
    name: 'مجلس عربي كلاسيكي',
    description: 'مجلس عربي فاخر بألوان بيج وذهبي، يتسع لـ 12 شخص',
    price: '4,800 ر.س',
    category: 'majlis',
    image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400'
  },
  {
    id: 3,
    name: 'كنبة جلد إيطالي',
    description: 'كنبة 3 مقاعد جلد طبيعي، تصميم إيطالي عصري',
    price: '3,200 ر.س',
    category: 'kanab',
    image: 'https://images.unsplash.com/photo-1550226891-ef816aed4a98?w=400'
  },
  {
    id: 4,
    name: 'ستائر مخمل فاخرة',
    description: 'ستائر مخمل ثقيلة مع بطانة عازلة للضوء',
    price: '1,200 ر.س',
    category: 'sitar',
    image: 'https://images.unsplash.com/photo-1507089947368-19c1da9775ae?w=400'
  }
];

let currentCategory = 'all';
let currentSearch = '';
let editingId = null; // null = adding a new product, otherwise the id being edited

// ========== Data Management ==========
function getProducts() {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? JSON.parse(stored) : [];
}

function saveProducts(products) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
}

// Seeds localStorage from products.json on first visit, so the JSON file is
// the real source of starting data instead of a duplicate hardcoded list.
// If products already exist (visitor returned, or admin has added/edited
// items), the stored data is left untouched.
async function loadProducts() {
  if (localStorage.getItem(STORAGE_KEY)) return;

  try {
    const res = await fetch('products.json');
    if (!res.ok) throw new Error('products.json not reachable');
    const data = await res.json();
    saveProducts(data);
  } catch (err) {
    // Fetching a local JSON file fails when the page is opened directly
    // from disk (file://) instead of via a web server — fall back safely.
    saveProducts(FALLBACK_PRODUCTS);
  }
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

// Fills in every element with data-whatsapp-link (footer, floating button)
// so the number only has to be maintained in one place.
function wireWhatsappLinks() {
  document.querySelectorAll('[data-whatsapp-link]').forEach(el => {
    el.href = whatsappLink('مرحباً الطراز الأصيل، أرغب بالاستفسار عن منتجاتكم');
  });
}

// ========== Admin: Add / Update Product ==========
function addProduct(e) {
  e.preventDefault();

  const name = document.getElementById('pName').value.trim();
  const price = document.getElementById('pPrice').value.trim();
  const category = document.getElementById('pCategory').value;
  const description = document.getElementById('pDesc').value.trim();
  const image = document.getElementById('pImage').value.trim();

  if (!name || !price || !category) {
    showToast('❌ يرجى ملء جميع الحقول المطلوبة');
    return false;
  }

  const products = getProducts();

  if (editingId !== null) {
    const idx = products.findIndex(p => p.id === editingId);
    if (idx !== -1) {
      products[idx] = { ...products[idx], name, price, category, description, image: image || DEFAULT_IMAGE };
    }
    saveProducts(products);
    showToast('✅ تم تحديث المنتج بنجاح');
    cancelEdit();
  } else {
    const newId = products.length > 0 ? Math.max(...products.map(p => p.id)) + 1 : 1;
    products.push({ id: newId, name, price, category, description, image: image || DEFAULT_IMAGE });
    saveProducts(products);
    document.getElementById('addForm').reset();
    hideImagePreview();
    showToast('✅ تم إضافة المنتج بنجاح');
  }

  renderAdminTable();
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
  document.getElementById('pImage').value = p.image || '';
  updateImagePreview();

  document.getElementById('formTitle').textContent = '✏️ تعديل المنتج';
  document.getElementById('submitBtn').textContent = '💾 تحديث المنتج';
  document.getElementById('cancelEditBtn').style.display = 'inline-flex';
  document.getElementById('addForm').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function cancelEdit() {
  editingId = null;
  document.getElementById('addForm').reset();
  hideImagePreview();
  document.getElementById('formTitle').textContent = '➕ إضافة منتج جديد';
  document.getElementById('submitBtn').textContent = '💾 حفظ المنتج';
  document.getElementById('cancelEditBtn').style.display = 'none';
}

// ========== Admin: Delete Product ==========
function deleteProduct(id) {
  if (!confirm('هل أنت متأكد من حذف هذا المنتج؟')) return;

  let products = getProducts();
  products = products.filter(p => p.id !== id);
  saveProducts(products);
  if (editingId === id) cancelEdit();
  renderAdminTable();
  showToast('🗑️ تم حذف المنتج');
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

// ========== Admin: Image Preview ==========
function updateImagePreview() {
  const url = document.getElementById('pImage').value.trim();
  const preview = document.getElementById('imagePreview');
  if (!preview) return;
  if (url) {
    preview.src = url;
    preview.style.display = 'block';
    preview.onerror = () => hideImagePreview();
  } else {
    hideImagePreview();
  }
}

function hideImagePreview() {
  const preview = document.getElementById('imagePreview');
  if (preview) preview.style.display = 'none';
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
  setTimeout(() => toast.classList.remove('show'), 3000);
}

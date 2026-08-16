/**
 * slugify.js
 * ----------
 * تحويل اسم المنتج العربي إلى slug آمن للروابط، بصيغة: {id}-{اسم منقول حرفياً}
 *
 * القاعدة: نقل حرف بحرف (transliteration) بلا إضافة حركات.
 *   "سجاد تركي سميك" + 5  →  "5-sjad-trky-smyk"
 *   "مجالس الكويت"   + 9  →  "9-mjals-alkwyt"
 *   "تفصيل مساند ظهر ديكور" + 7 → "7-tfsyl-msand-zhr-dykwr"
 *
 * بادئة المعرّف (id) تضمن تفرّد الرابط حتى لو تكرر اسم المنتج.
 */

'use strict';

// خريطة النقل الحرفي — مستنتجة من الروابط المعتمدة أصلاً في الموقع
const AR_MAP = {
  // ألف بأشكالها
  'ا': 'a', 'أ': 'a', 'إ': 'a', 'آ': 'a', 'ٱ': 'a', 'ى': 'a',
  // الهمزات المنفردة والمحمولة — تُسقط الهمزة ويبقى الصوت
  'ء': '',  'ؤ': 'w', 'ئ': 'y',
  // بقية الحروف
  'ب': 'b', 'ت': 't', 'ث': 'th',
  'ج': 'j', 'ح': 'h', 'خ': 'kh',
  'د': 'd', 'ذ': 'th',
  'ر': 'r', 'ز': 'z',
  'س': 's', 'ش': 'sh',
  'ص': 's', 'ض': 'd',
  'ط': 't', 'ظ': 'z',
  'ع': 'a', 'غ': 'gh',
  'ف': 'f', 'ق': 'q',
  'ك': 'k', 'ل': 'l',
  'م': 'm', 'ن': 'n',
  'ه': 'h', 'ة': 'h',
  'و': 'w', 'ي': 'y',
  // حروف غير عربية شائعة الورود
  'پ': 'p', 'چ': 'ch', 'ژ': 'zh', 'گ': 'g', 'ڤ': 'v',
  // أرقام عربية-هندية
  '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
  '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9'
};

// التشكيل والعلامات التي تُحذف تماماً قبل النقل
const DIACRITICS = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g;

/**
 * @param {string} name اسم المنتج (عربي غالباً)
 * @param {number|string} id معرّف المنتج
 * @returns {string} الـ slug الكامل مع بادئة المعرّف، مثل "10-sjad-trky"
 */
function slugify(name, id) {
  const raw = String(name == null ? '' : name);

  const body = raw
    // حذف التشكيل والتطويل
    .replace(DIACRITICS, '')
    // النقل الحرفي
    .split('')
    .map(ch => {
      if (Object.prototype.hasOwnProperty.call(AR_MAP, ch)) return AR_MAP[ch];
      if (/[a-zA-Z0-9]/.test(ch)) return ch.toLowerCase();
      // أي شيء آخر (مسافة، رمز، ترقيم) يصبح فاصلاً
      return '-';
    })
    .join('')
    // توحيد الشرطات
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  const prefix = String(id == null ? '' : id);

  if (!body) return prefix || 'product';
  return prefix ? `${prefix}-${body}` : body;
}

module.exports = { slugify };

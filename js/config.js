/**
 * js/config.js
 * Domain configuration: Statuses, Tiers, Zones, and Utility Helpers
 * Rich Manus Style with Full Emojis and Clear Column Tags
 */

const STORAGE_KEY = 'internlist_companies_data_v3';
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyvp_nHZScu6als1bsRqJvlZiuQ9J481X71fUX5oJXbyyao9gksHx3Rzmk-fh9bGdZJ/exec';

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeAttr(str) {
  return String(str || '')
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/"/g, '&quot;');
}

function formatPhoneNumber(raw) {
  const digits = String(raw || '').replace(/\D/g, '');
  if (digits.length === 10 && digits.startsWith('0')) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 9 && digits.startsWith('02')) {
    return `${digits.slice(0, 2)}-${digits.slice(2, 5)}-${digits.slice(5)}`;
  }
  return raw;
}

function extractPhones(text) {
  if (!text) return [];
  const matches = text.match(/0\d{1,2}[-\s]?\d{3,4}[-\s]?\d{3,4}/g) || [];
  const cleaned = matches
    .map(m => m.replace(/[^\d]/g, ''))
    .filter(d => d.length >= 9 && d.length <= 10);
  return [...new Set(cleaned)];
}

function extractEmails(text) {
  if (!text) return [];
  const matches = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
  return [...new Set(matches)];
}

function extractUrls(text) {
  if (!text) return [];
  const matches = text.match(/https?:\/\/[^\s|,;)"'>]+/g) || [];
  return [...new Set(matches)];
}

function getAvatarGradient(no) {
  const palettes = [
    'from-sky-500 to-blue-600 shadow-sky-500/20',
    'from-blue-600 to-indigo-600 shadow-blue-500/20',
    'from-teal-500 to-emerald-600 shadow-emerald-500/20',
    'from-indigo-500 to-purple-600 shadow-indigo-500/20',
    'from-cyan-500 to-sky-600 shadow-cyan-500/20'
  ];
  return palettes[(Number(no) || 0) % palettes.length];
}

function getZoneGroup(c) {
  const z = `${c.zone || ''} ${c.location || ''} ${c.loc_desc || ''}`.toLowerCase();
  if (z.includes('บางรัก') || z.includes('สาทร') || z.includes('สีลม') || z.includes('ยานนาวา') || z.includes('พระราม 3') || z.includes('คลองสาน') || z.includes('ธนบุรี') || z.includes('เจริญกรุง')) {
    return {
      id: 'zone1',
      order: 1,
      shortName: 'โซน 1: สาทร / สีลม / บางรัก',
      name: '🟢 โซน 1: ใกล้บ้านมาก (สาทร / สีลม / บางรัก / พระราม 3)',
      desc: 'เดินทางง่ายที่สุดจากบ้าน 15–30 นาที ประหยัดค่ารถและเวลาชีวิตมากที่สุด',
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200'
    };
  }
  if (z.includes('ปทุมวัน') || z.includes('ราชเทวี') || z.includes('สยาม') || z.includes('สามย่าน') || z.includes('พญาไท') || z.includes('mbk') || z.includes('เพลินจิต') || z.includes('ชิดลม')) {
    return {
      id: 'zone2',
      order: 2,
      shortName: 'โซน 2: ปทุมวัน / สยาม / พญาไท',
      name: '🟡 โซน 2: ใจกลางเมือง (ปทุมวัน / MBK / สยาม / พญาไท)',
      desc: 'ต่อ BTS สะดวก 30–45 นาที ออฟฟิศทันสมัย ติดรถไฟฟ้า',
      badgeClass: 'bg-sky-50 text-sky-700 border-sky-200'
    };
  }
  if (z.includes('คลองเตย') || z.includes('วัฒนา') || z.includes('อโศก') || z.includes('สุขุมวิท') || z.includes('พร้อมพงษ์') || z.includes('ทองหล่อ') || z.includes('เอกมัย') || z.includes('พระโขนง')) {
    return {
      id: 'zone3',
      order: 3,
      shortName: 'โซน 3: สุขุมวิท / อโศก / คลองเตย',
      name: '🟠 โซน 3: สุขุมวิท / อโศก / คลองเตย / วัฒนา',
      desc: 'ย่านบริษัท Tech ชั้นนำ เดินทางด้วย MRT/BTS ประมาณ 40–55 นาที',
      badgeClass: 'bg-amber-50 text-amber-700 border-amber-200'
    };
  }
  return {
    id: 'zone4',
    order: 4,
    shortName: 'โซน 4: รัชดา / พระราม 9 / รอบนอก',
    name: '🔴 โซน 4: รอบนอก (รัชดา / พระราม 9 / จตุจักร / บางนา / นนทบุรี)',
    desc: 'ระยะทางไกลกว่าโซนอื่น ควรเช็กวันเข้าออฟฟิศ (Hybrid/WFH) หรือเบี้ยเลี้ยงประกอบ',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200'
  };
}

function getTierConfig(tierStr) {
  const t = (tierStr || '').replace(/\s/g, '');
  if (t === '✅') {
    return {
      rank: 1,
      label: 'เอา — ✅ ผ่าน QC',
      shortLabel: 'Tier 1 ผ่าน QC',
      pillClass: 'bg-emerald-50 text-emerald-700 border-emerald-300',
      dotColor: 'bg-emerald-500'
    };
  }
  if (t.includes('✅') && t.includes('🔄')) {
    if (t.startsWith('✅')) {
      return {
        rank: 2,
        label: 'เอา — ✅🔄 เช็กเพิ่ม',
        shortLabel: 'Tier 2 เช็กเพิ่ม',
        pillClass: 'bg-sky-50 text-sky-700 border-sky-300',
        dotColor: 'bg-sky-500'
      };
    } else {
      return {
        rank: 3,
        label: 'สำรองเด่น — 🔄✅',
        shortLabel: 'Tier 3 สำรองเด่น',
        pillClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
        dotColor: 'bg-indigo-500'
      };
    }
  }
  if (t === '🔄') {
    return {
      rank: 4,
      label: 'สำรอง — 🔄',
      shortLabel: 'Tier 4 สำรอง',
      pillClass: 'bg-amber-50 text-amber-700 border-amber-200',
      dotColor: 'bg-amber-500'
    };
  }
  return {
    rank: 5,
    label: 'ไม่เอา — ❌ ปัดตก',
    shortLabel: 'ไม่เอา',
    pillClass: 'bg-rose-50 text-rose-600 border-rose-200',
    dotColor: 'bg-rose-500'
  };
}

function calculateCompanyStatus(c) {
  const colJ = (c.col_j || c.tier || '').trim();
  const colN = (c.col_n || c.status_open || '').trim();
  const colP = (c.col_p || '').trim();
  const colQ = (c.col_q || '').trim();
  const colR = (c.col_r || '').trim();
  const colS = (c.col_s || '').trim();

  // Group 3 Priority: ปัดตก / ปิดรับสมัคร
  // "ถ้าติ๊ก ปักตก ❌ Col J ปิดรับสมัคร ❌ Col N พร้้อมกัน มันจะขึ้นสถานะเเคค่ ปักตก"
  if (colJ === '❌') {
    return {
      column: 'dropped',
      group: 'negative',
      label: '❌ ปัดตก [Col J]',
      pillClass: 'bg-rose-50 text-rose-700 border-rose-300',
      dotClass: 'bg-rose-500',
      cardBorder: 'border-rose-200/90 hover:border-rose-300 opacity-85 hover:opacity-100',
      topStripe: 'from-rose-400 to-rose-600'
    };
  }
  if (colN === '❌') {
    return {
      column: 'closed',
      group: 'negative',
      label: '❌ ปิดรับสมัคร [Col N]',
      pillClass: 'bg-slate-100 text-slate-700 border-slate-300',
      dotClass: 'bg-slate-500',
      cardBorder: 'border-slate-200/90 hover:border-slate-300 opacity-85 hover:opacity-100',
      topStripe: 'from-slate-400 to-slate-500'
    };
  }

  // Group 2 Priority: ขั้นตอนยื่นสมัคร (ได้ที่แล้ว -> สัมภาษณ์ -> โทรตามผล -> ส่งใบสมัครแล้ว)
  if (colS === '✅') {
    return {
      column: 'accepted',
      group: 'pipeline',
      label: '🏆 ได้ที่แล้ว [Col S]',
      pillClass: 'bg-emerald-50 text-emerald-800 border-emerald-400 ring-2 ring-emerald-400/30',
      dotClass: 'bg-emerald-500 animate-bounce',
      cardBorder: 'border-emerald-400 hover:border-emerald-500 shadow-md shadow-emerald-500/10',
      topStripe: 'from-emerald-500 via-teal-500 to-green-500'
    };
  }
  if (colR === '✅') {
    return {
      column: 'interview',
      group: 'pipeline',
      label: '💼 สัมภาษณ์ [Col R]',
      pillClass: 'bg-blue-50 text-blue-800 border-blue-300',
      dotClass: 'bg-blue-500 animate-pulse',
      cardBorder: 'border-blue-300 hover:border-blue-500',
      topStripe: 'from-blue-500 via-indigo-500 to-sky-500'
    };
  }
  if (colQ === '✅') {
    return {
      column: 'following_up',
      group: 'pipeline',
      label: '📞 โทรตามผลแล้ว [Col Q]',
      pillClass: 'bg-purple-50 text-purple-800 border-purple-300',
      dotClass: 'bg-purple-500 animate-pulse',
      cardBorder: 'border-purple-300 hover:border-purple-400',
      topStripe: 'from-purple-500 via-fuchsia-500 to-indigo-500'
    };
  }
  if (colP === '✅') {
    return {
      column: 'applied',
      group: 'pipeline',
      label: '✈️ ส่งใบสมัครแล้ว [Col P]',
      pillClass: 'bg-amber-50 text-amber-800 border-amber-300',
      dotClass: 'bg-amber-500',
      cardBorder: 'border-amber-200/90 hover:border-amber-400',
      topStripe: 'from-amber-400 via-orange-400 to-yellow-500'
    };
  }

  // Group 1: เล็งไว้แต่ยังไม่ยื่น
  // "❌ เล็งไว้เเต่ยังไม่ยื่น (Col P) ก็จะขึ้นเเค่อันนี้"
  if (colP === '❌') {
    return {
      column: 'target',
      group: 'target',
      label: '🎯 เล็งไว้ (ยังไม่ยื่น) [Col P]',
      pillClass: 'bg-blue-50 text-blue-700 border-blue-200',
      dotClass: 'bg-blue-500',
      cardBorder: 'border-sky-200/90 hover:border-sky-400',
      topStripe: 'from-sky-400 via-blue-500 to-indigo-500'
    };
  }

  // Default fallback
  return {
    column: 'target',
    group: 'none',
    label: '🎯 เล็งไว้ (ยังไม่ยื่น)',
    pillClass: 'bg-slate-100 text-slate-600 border-slate-300',
    dotClass: 'bg-slate-400',
    cardBorder: 'border-slate-200/90 hover:border-sky-300',
    topStripe: 'from-slate-300 to-slate-400'
  };
}

function getStatusConfig(col) {
  switch (col) {
    case 'target':
      return {
        order: 4,
        label: '🎯 เล็งไว้ (ยังไม่ยื่น) [Col P]',
        pillClass: 'bg-blue-50 text-blue-700 border-blue-200',
        dotClass: 'bg-blue-500',
        cardBorder: 'border-sky-200/90 hover:border-sky-400',
        topStripe: 'from-sky-400 via-blue-500 to-indigo-500'
      };
    case 'applied':
      return {
        order: 3,
        label: '✈️ ส่งใบสมัครแล้ว [Col P]',
        pillClass: 'bg-amber-50 text-amber-800 border-amber-300',
        dotClass: 'bg-amber-500',
        cardBorder: 'border-amber-200/90 hover:border-amber-400',
        topStripe: 'from-amber-400 via-orange-400 to-yellow-500'
      };
    case 'following_up':
      return {
        order: 2,
        label: '📞 โทรตามผลแล้ว [Col Q]',
        pillClass: 'bg-purple-50 text-purple-800 border-purple-300',
        dotClass: 'bg-purple-500 animate-pulse',
        cardBorder: 'border-purple-300 hover:border-purple-400',
        topStripe: 'from-purple-500 via-fuchsia-500 to-indigo-500'
      };
    case 'interview':
      return {
        order: 1,
        label: '💼 สัมภาษณ์ [Col R]',
        pillClass: 'bg-blue-50 text-blue-800 border-blue-300',
        dotClass: 'bg-blue-500 animate-pulse',
        cardBorder: 'border-blue-300 hover:border-blue-500',
        topStripe: 'from-blue-500 via-indigo-500 to-sky-500'
      };
    case 'accepted':
      return {
        order: 0,
        label: '🏆 ได้ที่แล้ว [Col S]',
        pillClass: 'bg-emerald-50 text-emerald-800 border-emerald-400 ring-2 ring-emerald-400/30',
        dotClass: 'bg-emerald-500 animate-bounce',
        cardBorder: 'border-emerald-400 hover:border-emerald-500 shadow-md shadow-emerald-500/10',
        topStripe: 'from-emerald-500 via-teal-500 to-green-500'
      };
    case 'closed':
      return {
        order: 6,
        label: '❌ ปิดรับสมัคร [Col N]',
        pillClass: 'bg-slate-100 text-slate-700 border-slate-300',
        dotClass: 'bg-slate-500',
        cardBorder: 'border-slate-200/90 hover:border-slate-300 opacity-85 hover:opacity-100',
        topStripe: 'from-slate-400 to-slate-500'
      };
    default:
      return {
        order: 5,
        label: '❌ ปัดตก [Col J]',
        pillClass: 'bg-rose-50 text-rose-700 border-rose-300',
        dotClass: 'bg-rose-500',
        cardBorder: 'border-rose-200/90 hover:border-rose-300 opacity-85 hover:opacity-100',
        topStripe: 'from-rose-400 to-rose-600'
      };
  }
}

function normalizeCompany(c) {
  const copy = { ...c };
  const contactText = `${copy.contact || ''} ${copy.apply_url || ''} ${copy.status_recruit || ''}`;
  if (!Array.isArray(copy.phones) || copy.phones.length === 0) {
    copy.phones = extractPhones(contactText);
  }
  if (!Array.isArray(copy.emails) || copy.emails.length === 0) {
    copy.emails = extractEmails(contactText);
  }
  if (!Array.isArray(copy.urls) || copy.urls.length === 0) {
    copy.urls = extractUrls(contactText);
  }
  if (!copy.apply_url && copy.urls.length > 0) {
    copy.apply_url = copy.urls[0];
  }
  if (!copy.map_url) {
    const locClean = (copy.location || '').replace('— แมพ', '').replace('- แมพ', '').trim();
    const query = encodeURIComponent(`${copy.name || ''} ${locClean} ${copy.zone || ''}`.trim());
    copy.map_url = `https://www.google.com/maps/search/?api=1&query=${query}`;
  }

  // Ensure checklist columns exist
  copy.col_j = (copy.col_j !== undefined ? copy.col_j : (copy.tier || '')).trim();
  copy.col_n = (copy.col_n !== undefined ? copy.col_n : (copy.status_open || '')).trim();
  copy.col_p = (copy.col_p || '').trim();
  copy.col_q = (copy.col_q || '').trim();
  copy.col_r = (copy.col_r || '').trim();
  copy.col_s = (copy.col_s || '').trim();
  copy.orig_tier = copy.orig_tier || (copy.col_j !== '❌' ? copy.col_j : '✅');
  copy.orig_status_open = copy.orig_status_open || (copy.col_n !== '❌' ? copy.col_n : '✅');

  // Compute effective status column
  const eff = calculateCompanyStatus(copy);
  copy.column = eff.column;

  return copy;
}

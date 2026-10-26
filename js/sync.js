/**
 * js/sync.js
 * Two-way real-time synchronization between Localhost & Google Sheet
 */

function showToast(msg) {
  const toast = document.getElementById('toast');
  const msgEl = document.getElementById('toast-msg');
  if (!toast || !msgEl) return;
  msgEl.textContent = msg;
  toast.classList.remove('opacity-0', 'translate-y-24', 'pointer-events-none');
  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-24', 'pointer-events-none');
  }, 2600);
}

function syncCheckboxesToGoogleSheet(company) {
  if (!company) return;
  const payload = {
    action: 'update_status_checkboxes',
    no: String(company.no || company.id),
    col_p: company.col_p || '',
    col_q: company.col_q || '',
    col_r: company.col_r || '',
    col_s: company.col_s || '',
    col_j: company.col_j || (company.orig_tier || '✅'),
    col_n: company.col_n || (company.orig_status_open || '✅')
  };

  // 1. ส่งผ่าน server.py ให้ Python อัปเดต data.json ทันที และส่งต่อไป Google Sheet
  fetch('/api/update-sheet', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }).catch(() => {});

  // 2. ส่งตรงไป Apps Script สำรอง
  fetch(APPS_SCRIPT_URL, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify(payload)
  }).catch(() => {});
}

function syncStatusOnlyToGoogleSheet(company) {
  if (!company) return;
  syncCheckboxesToGoogleSheet(company);
}

function syncCompanyToGoogleSheet(company) {
  if (!company) return;
  const existingFollowup = (company.custom_notes && company.custom_notes !== company.status_followup)
    ? company.custom_notes
    : (company.status_followup || '');

  const payload = {
    action: 'update_company',
    no: String(company.no || company.id),
    name: company.name || '',
    about: company.about || '',
    biz_type: company.biz_type || '',
    location: company.location || '',
    loc_desc: company.loc_desc || '',
    zone: company.zone || '',
    role: company.role || '',
    welfare: company.welfare || '',
    tier: company.col_j || company.tier || '',
    reason: company.reason || '',
    contact: company.contact || '',
    status_recruit: company.status_recruit || '',
    status_open: company.col_n || company.status_open || '',
    column_status: company.column || 'target',
    col_p: company.col_p || '',
    col_q: company.col_q || '',
    col_r: company.col_r || '',
    col_s: company.col_s || '',
    col_j: company.col_j || '',
    col_n: company.col_n || '',
    status_interview: company.column === 'interview' ? 'นัดสัมภาษณ์แล้ว' : '',
    status_accepted: company.column === 'accepted' ? 'ได้ที่ฝึกงานแล้ว' : '',
    followup: existingFollowup
  };

  // 1. ส่งผ่าน server.py ให้ Python ยิงไปหา Google Sheet
  fetch('/api/update-sheet', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }).catch(() => {});

  // 2. ส่งตรงไป Google Apps Script แบบ background สำรอง
  fetch(APPS_SCRIPT_URL, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify(payload)
  }).catch(() => {});
}

async function syncFromGoogleSheet(overwrite = false, silent = false) {
  const syncIcon = document.getElementById('syncIcon');
  const syncDot = document.getElementById('syncDot');
  const lastSyncBadge = document.getElementById('lastSyncBadge');

  if (overwrite && !confirm('ต้องการดึงข้อมูลสดจาก Google Sheet มาทับข้อมูลที่แก้ไขไว้ทั้งหมดใช่ไหม?')) {
    return;
  }

  try {
    if (syncIcon) syncIcon.classList.add('animate-spin');
    if (!silent) showToast('🔄 กำลังซิงก์ข้อมูลสดจาก Google Sheet...');

    const url = overwrite ? '/api/sync-sheet?mode=overwrite' : '/api/sync-sheet';
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    if (data && data.ok && Array.isArray(data.companies)) {
      companies = data.companies.map(normalizeCompany);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(companies));
      populateDistrictFilter();
      renderAll();

      const now = new Date();
      const timeStr = now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
      if (lastSyncBadge) {
        lastSyncBadge.textContent = `ซิงก์ล่าสุด ${timeStr} น. (${companies.length} บริษัท)`;
      }
      if (syncDot) {
        syncDot.className = 'w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse';
      }
      if (!silent) {
        showToast(`✅ ซิงก์ข้อมูลจาก Google Sheet สำเร็จ (${companies.length} บริษัท)`);
      }
    }
  } catch (err) {
    console.warn('Google Sheet live sync fallback to local data:', err);
    if (syncDot) {
      syncDot.className = 'w-2.5 h-2.5 rounded-full bg-amber-500';
    }
    if (!silent) {
      showToast('⚠️ ซิงก์ผ่านโหมดออฟไลน์ (ใช้ข้อมูลล่าสุดในเครื่อง)');
    }
  } finally {
    if (syncIcon) syncIcon.classList.remove('animate-spin');
  }
}

async function saveData(companyToSync = null) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(companies));
  populateDistrictFilter();
  renderAll();

  // บันทึกลงไฟล์ผ่าน Local Server เพื่อให้ข้อมูลคงอยู่ถาวร
  try {
    await fetch('/api/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ companies })
    });
  } catch (e) {}

  // ถ้ามีการแก้ไขข้อมูลบริษัท ให้ยิงอัปเดตไปที่ Google Sheet ทันทีแบบเรียลไทม์
  if (companyToSync) {
    syncCompanyToGoogleSheet(companyToSync);
  }
}

function resetData() {
  syncFromGoogleSheet(true, false);
}

function exportData() {
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(companies, null, 2));
  const a = document.createElement('a');
  a.setAttribute('href', dataStr);
  a.setAttribute('download', `internlist_backup_${new Date().toISOString().slice(0, 10)}.json`);
  document.body.appendChild(a);
  a.click();
  a.remove();
  showToast('📦 ดาวน์โหลดไฟล์สำรอง JSON เรียบร้อย!');
}

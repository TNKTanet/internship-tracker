/**
 * js/modals.js - จัดการ Modal แก้ไขข้อมูลบริษัท (ครบทุกคอลัมน์ A - O) และ Smart Call Modal
 */

let currentEditingId = null;
let isAddingNewCompany = false;
let currentCallCompanyId = null;
let currentCallPhone = '';

// ==========================================
// 1. SMART CALL & HR SCRIPT MODAL
// ==========================================
function openSmartCallModal(companyId, phone) {
  const comp = companies.find(c => c.id === companyId);
  if (!comp) return;

  currentCallCompanyId = companyId;
  currentCallPhone = phone;

  const formatted = formatPhoneNumber(phone);
  document.getElementById('callModalCompany').textContent = `#${comp.no} ${comp.name}`;
  document.getElementById('callModalRole').textContent = comp.role || 'Software Engineer Intern (สหกิจศึกษา)';
  document.getElementById('callModalPhoneDisplay').textContent = formatted;
  document.getElementById('callModalTelHref').setAttribute('href', `tel:${phone}`);
  document.getElementById('callModalRawContact').textContent = comp.contact || `เบอร์โทร: ${formatted}`;

  const roleShort = (comp.role || 'Software Engineer Intern').split('—')[0].trim();
  const scriptHtml = `"สวัสดีครับ ขอสายพี่ HR แผนกสรรหาบุคลากรของ <strong>${escapeHtml(comp.name)}</strong> ครับ พอดีผมชื่อ <strong>ธเนศวร์ กุลสะท้าน</strong> นักศึกษาชั้นปีที่ 4 วิศวกรรมคอมพิวเตอร์ มหาวิทยาลัยศรีปทุมครับ พอดีผมสนใจสมัครฝึกงานสหกิจศึกษาตำแหน่ง <strong>${escapeHtml(roleShort)}</strong> เลยอยากโทรมาสอบถามว่าตอนนี้ทางบริษัทยังเปิดรับพิจารณาอยู่ไหมครับ และได้รับเรซูเม่ของผมหรือยังครับ"`;
  document.getElementById('callModalScript').innerHTML = scriptHtml;

  const existingNote = (comp.custom_notes && comp.custom_notes !== comp.status_followup)
    ? comp.custom_notes
    : (comp.status_followup || '');
  document.getElementById('callModalNoteInput').value = existingNote;

  document.getElementById('smartCallModal').classList.remove('hidden');
  if (window.lucide) lucide.createIcons();
}

function closeSmartCallModal() {
  document.getElementById('smartCallModal').classList.add('hidden');
  currentCallCompanyId = null;
}

function copyCurrentCallPhone() {
  if (!currentCallPhone) return;
  const formatted = formatPhoneNumber(currentCallPhone);
  navigator.clipboard.writeText(currentCallPhone).then(() => {
    showToast(`คัดลอกเบอร์โทร ${formatted} เรียบร้อย`);
  });
}

function saveCallNoteAndMarkFollowingUp() {
  const comp = companies.find(c => c.id === currentCallCompanyId);
  if (!comp) return;

  const noteVal = document.getElementById('callModalNoteInput').value.trim();
  if (noteVal) {
    comp.status_followup = noteVal;
    comp.custom_notes = noteVal;
  }
  comp.column = 'following_up';

  saveData(comp);
  closeSmartCallModal();
  showToast(`บันทึกผลการโทรของ "${comp.name}" เรียบร้อย`);
}

// ==========================================
// 2. FULL EDIT & ADD COMPANY MODAL (Columns A - O)
// ==========================================
function openEditModal(id) {
  const comp = companies.find(c => c.id === id);
  if (!comp) return;

  isAddingNewCompany = false;
  currentEditingId = id;

  document.getElementById('editModalEyebrow').textContent = `ข้อมูลบริษัท • ลำดับที่ #${comp.no || comp.id}`;
  document.getElementById('editModalTitle').textContent = comp.name;

  const formNoEl = document.getElementById('formNo');
  if (formNoEl) formNoEl.value = comp.no || comp.id;

  document.getElementById('formName').value = comp.name || '';
  document.getElementById('formRole').value = comp.role || '';
  document.getElementById('formZone').value = comp.zone || '';
  document.getElementById('formLocation').value = comp.location || '';
  document.getElementById('formTier').value = ['✅', '✅🔄', '🔄✅', '🔄', '❌'].includes((comp.tier || '').trim()) ? comp.tier.trim() : '✅';
  document.getElementById('formColumn').value = comp.column || 'target';
  document.getElementById('formApplyUrl').value = comp.apply_url || (comp.urls && comp.urls[0]) || '';
  document.getElementById('formContact').value = comp.contact || '';
  document.getElementById('formFollowup').value = (comp.custom_notes && comp.custom_notes !== comp.status_followup) ? comp.custom_notes : (comp.status_followup || '');
  document.getElementById('formReason').value = comp.reason || '';
  document.getElementById('formAbout').value = comp.about || '';
  document.getElementById('formBizType').value = comp.biz_type || '';
  document.getElementById('formLocDesc').value = comp.loc_desc || '';
  document.getElementById('formWelfare').value = comp.welfare || '';
  document.getElementById('formStatusOpen').value = ['✅', '🔄', '❌'].includes((comp.status_open || '').trim()) ? comp.status_open.trim() : '✅';
  document.getElementById('formStatusRecruit').value = comp.status_recruit || '';

  document.getElementById('editCompanyModal').classList.remove('hidden');
  if (window.lucide) lucide.createIcons();
}

function openAddCompanyModal() {
  isAddingNewCompany = true;
  currentEditingId = null;

  const nextNo = companies.reduce((max, c) => Math.max(max, Number(c.no) || 0), 0) + 1;
  document.getElementById('editModalEyebrow').textContent = `เพิ่มรายการใหม่ • ลำดับที่ #${nextNo}`;
  document.getElementById('editModalTitle').textContent = 'เพิ่มบริษัทฝึกงานใหม่';

  const formNoEl = document.getElementById('formNo');
  if (formNoEl) formNoEl.value = nextNo;

  document.getElementById('formName').value = '';
  document.getElementById('formRole').value = '';
  document.getElementById('formZone').value = '';
  document.getElementById('formLocation').value = '';
  document.getElementById('formTier').value = '✅';
  document.getElementById('formColumn').value = 'target';
  document.getElementById('formApplyUrl').value = '';
  document.getElementById('formContact').value = '';
  document.getElementById('formFollowup').value = '';
  document.getElementById('formReason').value = '';
  document.getElementById('formAbout').value = '';
  document.getElementById('formBizType').value = '';
  document.getElementById('formLocDesc').value = '';
  document.getElementById('formWelfare').value = '';
  document.getElementById('formStatusOpen').value = '✅';
  document.getElementById('formStatusRecruit').value = '✅ เปิดรับสมัคร';

  document.getElementById('editCompanyModal').classList.remove('hidden');
  if (window.lucide) lucide.createIcons();
}

function closeEditModal() {
  document.getElementById('editCompanyModal').classList.add('hidden');
  currentEditingId = null;
  isAddingNewCompany = false;
}

function saveEditModal() {
  const name = document.getElementById('formName').value.trim();
  if (!name) {
    alert('กรุณาระบุชื่อบริษัท');
    return;
  }

  const noInput = document.getElementById('formNo') ? document.getElementById('formNo').value.trim() : '';
  const role = document.getElementById('formRole').value.trim();
  const zone = document.getElementById('formZone').value.trim();
  const location = document.getElementById('formLocation').value.trim();
  const tier = document.getElementById('formTier').value;
  const column = document.getElementById('formColumn').value;
  const applyUrl = document.getElementById('formApplyUrl').value.trim();
  const contact = document.getElementById('formContact').value.trim();
  const followup = document.getElementById('formFollowup').value.trim();
  const reason = document.getElementById('formReason').value.trim();
  const about = document.getElementById('formAbout').value.trim();
  const bizType = document.getElementById('formBizType').value.trim();
  const locDesc = document.getElementById('formLocDesc').value.trim();
  const welfare = document.getElementById('formWelfare').value.trim();
  const statusOpen = document.getElementById('formStatusOpen').value;
  const statusRecruit = document.getElementById('formStatusRecruit').value.trim();

  const combinedContact = `${contact} ${applyUrl} ${statusRecruit}`;
  const phones = extractPhones(combinedContact);
  const emails = extractEmails(combinedContact);
  const urls = extractUrls(`${applyUrl} ${contact} ${statusRecruit}`);

  if (isAddingNewCompany) {
    const nextNo = companies.reduce((max, c) => Math.max(max, Number(c.no) || 0), 0) + 1;
    const finalNo = noInput || String(nextNo);
    const newComp = normalizeCompany({
      id: Number(finalNo) || nextNo,
      no: String(finalNo),
      name,
      role,
      zone: zone || 'ไม่ระบุ',
      location: location || 'ไม่ระบุตึก',
      tier,
      column,
      apply_url: applyUrl || (urls[0] || ''),
      contact,
      status_followup: followup,
      custom_notes: followup,
      reason,
      about,
      biz_type: bizType,
      loc_desc: locDesc,
      welfare,
      status_open: statusOpen,
      status_recruit: statusRecruit,
      phones,
      emails,
      urls
    });
    companies.unshift(newComp);
    saveData(newComp);
    closeEditModal();
    showToast(`✨ เพิ่มบริษัท #${finalNo} "${name}" (ซิงก์ Google Sheet แล้ว!)`);
  } else {
    const comp = companies.find(c => c.id === currentEditingId);
    if (!comp) return;

    if (noInput) comp.no = String(noInput);
    comp.name = name;
    comp.role = role;
    comp.zone = zone;
    comp.location = location;
    comp.tier = tier;
    comp.column = column;
    if (column === 'target') {
      comp.col_p = '❌';
      comp.col_q = '';
      comp.col_r = '';
      comp.col_s = '';
      if (comp.col_j === '❌') comp.col_j = (comp.orig_tier || '✅');
      if (comp.col_n === '❌') comp.col_n = (comp.orig_status_open || '✅');
    } else if (column === 'applied') {
      comp.col_p = '✅';
      comp.col_q = '';
      comp.col_r = '';
      comp.col_s = '';
      if (comp.col_j === '❌') comp.col_j = (comp.orig_tier || '✅');
      if (comp.col_n === '❌') comp.col_n = (comp.orig_status_open || '✅');
    } else if (column === 'following_up') {
      comp.col_p = '✅';
      comp.col_q = '✅';
      comp.col_r = '';
      comp.col_s = '';
      if (comp.col_j === '❌') comp.col_j = (comp.orig_tier || '✅');
      if (comp.col_n === '❌') comp.col_n = (comp.orig_status_open || '✅');
    } else if (column === 'interview') {
      comp.col_p = '✅';
      comp.col_q = '✅';
      comp.col_r = '✅';
      comp.col_s = '';
      if (comp.col_j === '❌') comp.col_j = (comp.orig_tier || '✅');
      if (comp.col_n === '❌') comp.col_n = (comp.orig_status_open || '✅');
    } else if (column === 'accepted') {
      comp.col_p = '✅';
      comp.col_q = '✅';
      comp.col_r = '✅';
      comp.col_s = '✅';
      if (comp.col_j === '❌') comp.col_j = (comp.orig_tier || '✅');
      if (comp.col_n === '❌') comp.col_n = (comp.orig_status_open || '✅');
    } else if (column === 'dropped') {
      comp.col_p = '';
      comp.col_q = '';
      comp.col_r = '';
      comp.col_s = '';
      comp.col_j = '❌';
    }

    comp.apply_url = applyUrl || (urls[0] || '');
    comp.contact = contact;
    comp.status_followup = followup;
    comp.custom_notes = followup;
    comp.reason = reason;
    comp.about = about;
    comp.biz_type = bizType;
    comp.loc_desc = locDesc;
    comp.welfare = welfare;
    comp.status_open = statusOpen;
    comp.status_recruit = statusRecruit;
    comp.phones = phones;
    comp.emails = emails;
    comp.urls = urls;

    const locClean = (comp.location || '').replace('— แมพ', '').replace('- แมพ', '').trim();
    comp.map_url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${comp.name} ${locClean} ${comp.zone}`.trim())}`;

    saveData(comp);
    closeEditModal();
    showToast(`✅ บันทึกการแก้ไข #${comp.no} "${name}" (ซิงก์ Google Sheet แล้ว!)`);
  }
}

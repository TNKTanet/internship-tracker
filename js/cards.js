/**
 * js/cards.js
 * Manus 2-column rich company card renderer, contact buttons, and interactive actions
 * Restored 1:1 with reference design (All emojis, badges, edit buttons, and Col A-O tags)
 */

let expandedCards = new Set();
let openStatusDropdownId = null;

// ปิด dropdown เมื่อคลิกที่อื่นบนหน้าเว็บ
document.addEventListener('click', (e) => {
  if (openStatusDropdownId !== null) {
    if (!e.target.closest('.status-checklist-menu') && !e.target.closest('.status-dropdown-btn')) {
      openStatusDropdownId = null;
      renderAll();
    }
  }
});

function renderJobFeed(list) {
  const container = document.getElementById('feedCardsGrid');
  if (!container) return;

  if (list.length === 0) {
    container.innerHTML = `
      <div class="col-span-full bg-white rounded-3xl border border-sky-200 p-12 text-center shadow-card space-y-4">
        <div class="w-16 h-16 rounded-3xl bg-sky-50 border border-sky-200 text-sky-500 flex items-center justify-center mx-auto">
          <i data-lucide="search-x" class="w-8 h-8"></i>
        </div>
        <div>
          <h3 class="text-lg font-extrabold text-slate-900">ไม่พบบริษัทที่ตรงกับตัวกรองนี้</h3>
          <p class="text-sm text-slate-500 mt-1">ลองเปลี่ยนตัวกรองโซน เขต เทียร์ลิสต์ หรือกดล้างตัวกรองทั้งหมดเพื่อดูบริษัททั้งหมด</p>
        </div>
        <button onclick="resetAllFilters()" class="btn-interactive px-5 py-2.5 rounded-2xl bg-sky-600 hover:bg-sky-500 text-white text-sm font-bold shadow-md cursor-pointer">
          ล้างตัวกรองทั้งหมด
        </button>
      </div>
    `;
    return;
  }

  container.innerHTML = list.map(c => buildManusCardHtml(c)).join('');
}

function buildManusCardHtml(c) {
  const zoneInfo = getZoneGroup(c);
  const tierCfg = getTierConfig(c.tier);
  const statusCfg = getStatusConfig(c.column);
  const avatarGrad = getAvatarGradient(c.no);
  const initial = (c.name || 'C').trim().charAt(0).toUpperCase();
  const isExpanded = expandedCards.has(c.id);

  const followupNote = (c.custom_notes && c.custom_notes !== c.status_followup)
    ? c.custom_notes
    : (c.status_followup || '');

  const openRecruitText = (c.status_recruit || '').trim();
  const isOpenYes = (c.status_open || '').includes('✅');
  const isOpenWait = (c.status_open || '').includes('🔄');

  const openBadgeHtml = isOpenYes
    ? `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold"><span class="w-2 h-2 rounded-full bg-emerald-500"></span> เปิดสมัคร</span>`
    : isOpenWait
      ? `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold"><span class="w-2 h-2 rounded-full bg-amber-500"></span> รอเช็กประกาศ</span>`
      : `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 text-rose-600 border border-rose-200 text-xs font-bold"><span class="w-2 h-2 rounded-full bg-rose-500"></span> ปิดรับ/ไม่มีประกาศ</span>`;

  // ปุ่มโทรศัพท์
  const phoneButtonsHtml = (c.phones || []).map(p => {
    const formatted = formatPhoneNumber(p);
    return `
      <button onclick="openSmartCallModal(${c.id}, '${escapeAttr(p)}')" 
              class="btn-interactive group relative inline-flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-xs sm:text-sm font-bold shadow-md shadow-emerald-600/20 cursor-pointer">
        <span class="w-7 h-7 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
          <i data-lucide="phone-call" class="w-4 h-4"></i>
        </span>
        <div class="text-left leading-tight">
          <div class="text-[10px] font-semibold text-emerald-100 uppercase tracking-wider">กดโทร / ดูโพย HR</div>
          <div class="font-mono font-extrabold tracking-wide">${escapeHtml(formatted)}</div>
        </div>
      </button>
    `;
  }).join('');

  // ปุ่มอีเมล + Gmail shortcut
  const emailButtonsHtml = (c.emails || []).map(email => {
    const gmailComposeUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}&su=${encodeURIComponent(`สมัครฝึกงานสหกิจศึกษา ตำแหน่ง Software Engineer Intern — ธเนศวร์ กุลสะท้าน (ม.ศรีปทุม)`)}`;
    return `
      <div class="inline-flex items-center rounded-2xl bg-sky-50/90 border border-sky-200/90 p-1 shadow-2xs">
        <button onclick="copyEmailWithEffect(this, '${escapeAttr(email)}', '${escapeAttr(c.name)}')" 
                class="btn-interactive inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white hover:bg-sky-600 text-sky-800 hover:text-white border border-sky-200/80 text-xs sm:text-sm font-bold transition cursor-pointer"
                title="คลิกเพื่อคัดลอกอีเมล">
          <i data-lucide="mail" class="w-4 h-4 text-sky-600 group-hover:text-white shrink-0"></i>
          <span class="font-mono truncate max-w-[190px] sm:max-w-[230px]">${escapeHtml(email)}</span>
          <span class="copy-label px-2 py-0.5 rounded-lg bg-sky-100 text-sky-700 text-[11px] font-extrabold">คัดลอกเมล</span>
        </button>
        <a href="${gmailComposeUrl}" target="_blank" 
           class="btn-interactive px-2.5 py-1.5 rounded-xl text-xs font-bold text-sky-700 hover:bg-sky-100 flex items-center gap-1" 
           title="เปิดหน้าเขียน Gmail ส่งหาบริษัทนี้ทันที">
          <i data-lucide="send" class="w-3.5 h-3.5"></i>
          <span class="hidden sm:inline">Gmail</span>
        </a>
      </div>
    `;
  }).join('');

  // ลิงก์สมัคร
  const applyLinksHtml = (c.urls || []).slice(0, 2).map((u, idx) => {
    let domainLabel = 'เปิดลิงก์สมัคร';
    if (u.includes('jobthai.com')) domainLabel = 'สมัครผ่าน JobThai';
    else if (u.includes('internth.com')) domainLabel = 'ดูประกาศ InternTH';
    else if (u.includes('jobsdb.com')) domainLabel = 'ดูประกาศ JobsDB';
    else if (u.includes('facebook.com')) domainLabel = 'เพจ Facebook';
    else if (idx > 0) domainLabel = 'ลิงก์เพิ่มเติม';

    return `
      <a href="${escapeAttr(u)}" target="_blank" 
         class="btn-interactive inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 hover:border-indigo-300 text-xs sm:text-sm font-bold shadow-2xs">
        <i data-lucide="external-link" class="w-4 h-4 text-indigo-500"></i>
        <span>${domainLabel}</span>
      </a>
    `;
  }).join('');

  const locationDisplay = (c.location || 'ไม่ระบุตึก').replace('— แมพ', '').replace('- แมพ', '').trim();
  const mapDirectUrl = c.map_url || (`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${c.name} ${locationDisplay} ${c.zone || ''}`.trim())}`);

  const colJ = (c.col_j !== undefined ? c.col_j : (c.tier || '')).trim();
  const colN = (c.col_n !== undefined ? c.col_n : (c.status_open || '')).trim();
  const colP = (c.col_p || '').trim();
  const colQ = (c.col_q || '').trim();
  const colR = (c.col_r || '').trim();
  const colS = (c.col_s || '').trim();

  const isTargetChecked = (colP === '❌');
  const isAppliedChecked = (colP === '✅');
  const isFollowupChecked = (colQ === '✅');
  const isInterviewChecked = (colR === '✅');
  const isAcceptedChecked = (colS === '✅');
  const isDroppedChecked = (colJ === '❌');
  const isClosedChecked = (colN === '❌');

  const isGroup1Active = isTargetChecked;
  const isGroup2Active = (isAppliedChecked || isFollowupChecked || isInterviewChecked || isAcceptedChecked);
  const isGroup3Active = (isDroppedChecked || isClosedChecked);
  const hasAnyChecked = (isGroup1Active || isGroup2Active || isGroup3Active);

  const isG1Disabled = (isGroup2Active || isGroup3Active);
  const isG2Disabled = (isGroup1Active || isGroup3Active);
  const isG3Disabled = (isGroup1Active || isGroup2Active);
  const isMenuOpen = (openStatusDropdownId === c.id);

  return `
    <article class="bg-white rounded-3xl border ${statusCfg.cardBorder} shadow-card hover:shadow-card-hover transition-all duration-200 overflow-visible relative ${isMenuOpen ? 'z-30' : 'z-1'} flex flex-col">
      <!-- Top Color Accent Bar -->
      <div class="h-1.5 w-full bg-gradient-to-r ${statusCfg.topStripe} rounded-t-3xl"></div>

      <div class="p-5 sm:p-6 space-y-4 flex-1 flex flex-col">
        
        <!-- Row 1: #No + Zone Badge (Left) | Tier Pill + Status Pill (Right) -->
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div class="flex flex-wrap items-center gap-2">
            <span class="px-2.5 py-1 rounded-xl bg-sky-50 text-sky-800 font-extrabold text-xs border border-sky-200 shadow-2xs inline-flex items-center gap-1.5">
              <span>#${c.no}</span>
              <span class="text-[10px] bg-sky-100 text-sky-600 px-1.5 py-0.2 rounded font-mono font-semibold">Col A</span>
            </span>
            <span class="px-2.5 py-1 rounded-xl text-xs font-bold border ${zoneInfo.badgeClass}">
              ${escapeHtml(zoneInfo.shortName)} <span class="text-[10px] text-slate-500 font-mono font-normal ml-0.5">[Col G]</span>
            </span>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${tierCfg.pillClass}">
              <span>${escapeHtml(tierCfg.label)}</span>
              <span class="text-[10px] opacity-70 font-mono font-normal ml-0.5">[Col J]</span>
            </span>
            <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${statusCfg.pillClass}">
              <span class="w-2 h-2 rounded-full ${statusCfg.dotClass}"></span>
              <span>${escapeHtml(statusCfg.label)}</span>
            </span>
          </div>
        </div>

        <!-- Row 2: Avatar + Company Name + Role Subtitle + Edit Pencil (Right) -->
        <div class="flex items-start justify-between gap-3 pt-1">
          <div class="flex items-start gap-3.5 min-w-0">
            <div class="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br ${avatarGrad} text-white font-extrabold text-xl flex items-center justify-center shrink-0 shadow-md">
              ${escapeHtml(initial)}
            </div>
            <div class="min-w-0">
              <div class="flex items-baseline gap-1.5 flex-wrap">
                <h3 class="text-lg sm:text-xl font-extrabold text-slate-900 leading-snug break-words">
                  ${escapeHtml(c.name)}
                </h3>
                <span class="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">Col B</span>
              </div>
              <p class="text-xs sm:text-sm font-semibold text-sky-700 line-clamp-1 mt-0.5 flex items-center gap-1.5">
                <span>${escapeHtml(c.role || 'Software Engineer Intern (สหกิจศึกษา)')}</span>
                <span class="text-[10px] text-slate-400 font-mono font-normal">[Col H]</span>
              </p>
            </div>
          </div>

          <button onclick="openEditModal(${c.id})" 
                  class="btn-interactive w-9 h-9 sm:w-10 sm:h-10 rounded-2xl border border-slate-200 hover:border-sky-300 bg-slate-50 hover:bg-sky-50 text-slate-600 hover:text-sky-600 flex items-center justify-center shrink-0 shadow-2xs transition cursor-pointer" 
                  title="แก้ไขข้อมูลและบันทึกความคืบหน้า">
            <i data-lucide="pencil" class="w-4 h-4"></i>
          </button>
        </div>

        <!-- Row 3: Reason to Choose Highlight Box [Col K] -->
        <div class="p-3.5 rounded-2xl bg-sky-50/70 border border-sky-100 space-y-1">
          <div class="font-bold text-sky-950 text-xs sm:text-sm flex items-center gap-1.5">
            <i data-lucide="heart" class="w-4 h-4 text-rose-500 fill-rose-500"></i>
            <span>เหตุผลที่เล็งบริษัทนี้:</span>
            <span class="text-sky-800 font-mono text-[11px] font-semibold bg-sky-100 px-1.5 py-0.2 rounded">[Col K]</span>
          </div>
          <div class="text-xs sm:text-sm text-sky-900 leading-relaxed font-medium line-clamp-3">
            ${escapeHtml(c.reason || 'เป็นตัวเลือกที่ตรงสายและน่าสนใจในการยื่นฝึกงาน')}
          </div>
        </div>

        <!-- Row 4: Company Business & Income Source [Col C] -->
        <div class="space-y-1">
          <div class="font-bold text-slate-700 text-xs sm:text-sm flex items-center gap-1.5">
            <i data-lucide="building" class="w-4 h-4 text-slate-500"></i>
            <span>เกี่ยวกับธุรกิจ / แหล่งรายได้:</span>
            <span class="text-[11px] text-slate-400 font-mono font-normal">[Col C]</span>
          </div>
          <p class="text-xs sm:text-sm text-slate-600 leading-relaxed line-clamp-2">
            ${escapeHtml(c.about || 'บริษัทพัฒนาเทคโนโลยีและดิจิทัลโซลูชัน')}
          </p>
        </div>

        <!-- Row 5: Location + Direct Google Maps Link [Col E] -->
        <div class="space-y-1">
          <div class="flex items-center justify-between">
            <div class="font-bold text-slate-700 text-xs sm:text-sm flex items-center gap-1.5">
              <i data-lucide="map-pin" class="w-4 h-4 text-rose-500"></i>
              <span>สถานที่ตั้ง:</span>
              <span class="text-[11px] text-slate-400 font-mono font-normal">[Col E]</span>
            </div>
            <a href="${escapeAttr(mapDirectUrl)}" target="_blank" 
               class="inline-flex items-center gap-1 text-xs text-sky-600 hover:text-sky-800 font-bold hover:underline">
              <span>เปิด Google Maps</span>
              <i data-lucide="external-link" class="w-3.5 h-3.5"></i>
            </a>
          </div>
          <p class="text-xs sm:text-sm text-slate-600 line-clamp-2">
            ${escapeHtml(c.location || 'กรุงเทพมหานคร')}
          </p>
        </div>

        <!-- Row 6: Welfare & Allowance [Col I] -->
        <div class="space-y-1">
          <div class="font-bold text-slate-700 text-xs sm:text-sm flex items-center gap-1.5">
            <i data-lucide="gift" class="w-4 h-4 text-emerald-600"></i>
            <span>สวัสดิการ / เบี้ยเลี้ยง:</span>
            <span class="text-[11px] text-slate-400 font-mono font-normal">[Col I]</span>
          </div>
          <div class="text-xs sm:text-sm text-emerald-800 font-semibold bg-emerald-50/70 border border-emerald-200/80 rounded-xl px-3 py-2 line-clamp-2">
            ${escapeHtml(c.welfare || 'มีเบี้ยเลี้ยงและสวัสดิการตามโครงสร้างบริษัท')}
          </div>
        </div>

        <!-- Row 7: Recruit Status Tag [Col M, N] -->
        <div class="pt-1 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100">
          <div class="flex items-center gap-2">
            ${openBadgeHtml}
            <span class="text-[11px] text-slate-400 font-mono font-normal">[Col N]</span>
          </div>
          <div class="text-xs text-slate-500 font-medium truncate max-w-[240px]">
            <span>${escapeHtml(openRecruitText || 'ตรวจสอบประกาศรับสมัคร')}</span>
            <span class="text-[11px] text-slate-400 font-mono font-normal">[Col M]</span>
          </div>

          <!-- Row 8: Highlight Box Col O (พร้อมปุ่ม อัปเดต ด้านขวา) -->
          <div class="w-full p-4 rounded-2xl bg-amber-50/80 border border-amber-200/90 space-y-1.5">
            <div class="flex items-center justify-between gap-2">
              <span class="font-bold text-amber-900 text-xs sm:text-sm flex items-center gap-1.5">
                <i data-lucide="bell" class="w-4 h-4 text-amber-600"></i>
                <span>ความคืบหน้าล่าสุด:</span> 
                <span class="text-amber-800 font-mono text-[11px] font-bold bg-amber-100 px-1.5 py-0.5 rounded border border-amber-300">Col O</span>
              </span>
              <button onclick="openEditModal(${c.id})" 
                      class="btn-interactive px-2.5 py-1 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-2xs cursor-pointer">
                อัปเดต
              </button>
            </div>
            <div class="text-xs sm:text-sm text-amber-950 leading-relaxed font-medium whitespace-pre-line min-h-[4rem] line-clamp-4 overflow-y-auto">
              ${escapeHtml(followupNote || 'ยังไม่มีบันทึกความคืบหน้า (คลิกอัปเดตเพื่อใส่บันทึก)')}
            </div>
          </div>
        </div>

        <!-- Row 9: Contact Channels & Action Buttons -->
        <div class="pt-1 space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <span>ช่องทางติดต่อ &amp; ลิงก์สมัคร ดึงจาก COL L</span>
            </span>
            <button onclick="openEditModal(${c.id})" class="text-xs text-sky-600 hover:text-sky-800 font-bold flex items-center gap-1 cursor-pointer">
              <i data-lucide="pencil" class="w-3.5 h-3.5"></i>
              <span>✏️ แก้ไขเบอร์/เมล [Col L]</span>
            </button>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            ${phoneButtonsHtml}
            ${emailButtonsHtml}
            ${applyLinksHtml}
          </div>
        </div>

        <!-- Row 10: Expandable Details Accordion -->
        <div class="pt-1 mt-auto">
          <button onclick="toggleCardAccordion(${c.id})" 
                  class="w-full px-4 py-2.5 rounded-2xl bg-slate-50 hover:bg-sky-50/60 border border-slate-200/80 text-xs sm:text-sm font-bold text-slate-700 flex items-center justify-between transition cursor-pointer">
            <span>ดูรายละเอียดบริษัทและบันทึกเพิ่มเติม [Col D, F, L]</span>
            <i data-lucide="${isExpanded ? 'chevron-up' : 'chevron-down'}" class="w-4 h-4 text-slate-500"></i>
          </button>

          <div id="card-details-${c.id}" class="${isExpanded ? 'block' : 'hidden'} mt-3 p-4 rounded-2xl bg-slate-50/90 border border-slate-200/90 space-y-3 text-xs sm:text-sm">
            <div>
              <div class="font-bold text-slate-700 mb-0.5 flex items-center gap-1.5">
                <span>ตัวอย่างสินค้า / บริการของบริษัท:</span>
                <span class="text-[11px] text-slate-400 font-mono font-normal">[Col D]</span>
              </div>
              <p class="text-slate-600 whitespace-pre-line leading-relaxed">${escapeHtml(c.biz_type || '-')}</p>
            </div>
            <div class="border-t border-slate-200/80 pt-2.5">
              <div class="font-bold text-slate-700 mb-0.5 flex items-center gap-1.5">
                <span>รายละเอียดสถานที่ทำงานและการเดินทาง:</span>
                <span class="text-[11px] text-slate-400 font-mono font-normal">[Col F]</span>
              </div>
              <p class="text-slate-600 leading-relaxed">${escapeHtml(c.loc_desc || '-')}</p>
            </div>
            <div class="border-t border-slate-200/80 pt-2.5">
              <div class="font-bold text-slate-700 mb-0.5 flex items-center gap-1.5">
                <span>ข้อมูลช่องทางติดต่อต้นฉบับ:</span>
                <span class="text-[11px] text-slate-400 font-mono font-normal">[Col L]</span>
              </div>
              <p class="text-slate-600 font-mono text-xs whitespace-pre-line break-all">${escapeHtml(c.contact || '-')}</p>
            </div>
          </div>
        </div>

      </div>

      <!-- Card Footer: Edit Button (Left) + Dropdown Button with Checklist (Right) (เหมือนรูป 2) -->
      <div class="px-5 sm:px-6 py-3.5 bg-slate-50/90 border-t border-slate-200/80 rounded-b-3xl flex flex-wrap items-center justify-between gap-3 relative">
        <button onclick="openEditModal(${c.id})" 
                class="btn-interactive px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer">
          <i data-lucide="pencil" class="w-3.5 h-3.5 text-sky-600"></i>
          <span>แก้ไข / บันทึกผล</span>
        </button>

        <div class="relative flex items-center gap-2">
          <span class="text-xs font-semibold text-slate-500 hidden sm:inline">สถานะ:</span>
          
          <!-- Dropdown Trigger Button (หน้าตาเหมือนดรอปดาวน์ในรูป 2 เป๊ะ) -->
          <button type="button" 
                  onclick="toggleStatusDropdown(event, ${c.id})" 
                  class="status-dropdown-btn inline-flex items-center justify-between gap-2 px-3.5 py-2 rounded-2xl bg-white border border-slate-300 hover:border-sky-400 text-xs sm:text-sm font-bold text-slate-800 focus:outline-none focus:border-sky-500 shadow-2xs cursor-pointer transition min-w-[210px]">
            <span class="flex items-center gap-1.5 truncate">
              <span>${statusCfg.label}</span>
            </span>
            <i data-lucide="${isMenuOpen ? 'chevron-up' : 'chevron-down'}" class="w-4 h-4 text-slate-500 shrink-0"></i>
          </button>

          <!-- Dropdown Checklist Popover Menu (เปิดเมื่อคลิก และมีเช็คลิสต์ข้างใน) -->
          <div id="status-menu-${c.id}" 
               class="status-checklist-menu ${isMenuOpen ? 'block' : 'hidden'} absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl border border-slate-200 shadow-2xl z-50 p-2.5 space-y-1 text-xs">
            
            <div class="px-2.5 py-1.5 text-[11px] font-bold text-slate-400 border-b border-slate-100 flex items-center justify-between">
              <span>เลือกสถานะ (เช็คลิสต์)</span>
              ${hasAnyChecked ? `<button type="button" onclick="clearCompanyChecklist(${c.id})" class="text-slate-400 hover:text-rose-600 text-[10px] underline cursor-pointer">ล้างสถานะ</button>` : ''}
            </div>

            <!-- Item 1: 🎯 [ ] เล็งไว้เเต่ยังไม่ยื่น [Col P] -->
            <label class="flex items-center justify-between px-3 py-2 rounded-xl transition select-none ${isG1Disabled ? 'opacity-35 bg-slate-50 text-slate-400 cursor-not-allowed' : (isTargetChecked ? 'bg-sky-50 text-sky-900 font-extrabold cursor-pointer' : 'hover:bg-slate-50 text-slate-700 font-bold cursor-pointer')}">
              <span class="flex items-center gap-2">
                <span>🎯</span>
                <span>เล็งไว้เเต่ยังไม่ยื่น <span class="text-[10px] font-mono text-sky-600 font-semibold">[Col P]</span></span>
              </span>
              <input type="checkbox" ${isTargetChecked ? 'checked' : ''} ${isG1Disabled ? 'disabled' : ''}
                     onchange="handleChecklistToggle(${c.id}, 'target')"
                     class="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 border-slate-300 ${isG1Disabled ? 'cursor-not-allowed' : 'cursor-pointer'}">
            </label>

            <!-- Item 2: ✈️ [ ] ส่งใบสมัครเเล้ว [Col P] -->
            <label class="flex items-center justify-between px-3 py-2 rounded-xl transition select-none ${isG2Disabled ? 'opacity-35 bg-slate-50 text-slate-400 cursor-not-allowed' : (isAppliedChecked ? 'bg-amber-50 text-amber-900 font-extrabold cursor-pointer' : 'hover:bg-slate-50 text-slate-700 font-bold cursor-pointer')}">
              <span class="flex items-center gap-2">
                <span>✈️</span>
                <span>ส่งใบสมัครเเล้ว <span class="text-[10px] font-mono text-amber-700 font-semibold">[Col P]</span></span>
              </span>
              <input type="checkbox" ${isAppliedChecked ? 'checked' : ''} ${isG2Disabled ? 'disabled' : ''}
                     onchange="handleChecklistToggle(${c.id}, 'applied')"
                     class="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-slate-300 ${isG2Disabled ? 'cursor-not-allowed' : 'cursor-pointer'}">
            </label>

            <!-- Item 2.5: 📞 [ ] โทรตามผลแล้ว [Col Q] -->
            <label class="flex items-center justify-between px-3 py-2 rounded-xl transition select-none ${isG2Disabled ? 'opacity-35 bg-slate-50 text-slate-400 cursor-not-allowed' : (isFollowupChecked ? 'bg-purple-50 text-purple-900 font-extrabold cursor-pointer' : 'hover:bg-slate-50 text-slate-700 font-bold cursor-pointer')}">
              <span class="flex items-center gap-2">
                <span>📞</span>
                <span>โทรตามผลแล้ว <span class="text-[10px] font-mono text-purple-700 font-semibold">[Col Q]</span></span>
              </span>
              <input type="checkbox" ${isFollowupChecked ? 'checked' : ''} ${isG2Disabled ? 'disabled' : ''}
                     onchange="handleChecklistToggle(${c.id}, 'followup')"
                     class="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 border-slate-300 ${isG2Disabled ? 'cursor-not-allowed' : 'cursor-pointer'}">
            </label>

            <!-- Item 3: 💼 [ ] สัมภาษณ์ [Col R] -->
            <label class="flex items-center justify-between px-3 py-2 rounded-xl transition select-none ${isG2Disabled ? 'opacity-35 bg-slate-50 text-slate-400 cursor-not-allowed' : (isInterviewChecked ? 'bg-blue-50 text-blue-900 font-extrabold cursor-pointer' : 'hover:bg-slate-50 text-slate-700 font-bold cursor-pointer')}">
              <span class="flex items-center gap-2">
                <span>💼</span>
                <span>สัมภาษณ์ <span class="text-[10px] font-mono text-blue-700 font-semibold">[Col R]</span></span>
              </span>
              <input type="checkbox" ${isInterviewChecked ? 'checked' : ''} ${isG2Disabled ? 'disabled' : ''}
                     onchange="handleChecklistToggle(${c.id}, 'interview')"
                     class="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 ${isG2Disabled ? 'cursor-not-allowed' : 'cursor-pointer'}">
            </label>

            <!-- Item 4: 🏆 [ ] ได้ที่เเล้ว [Col S] -->
            <label class="flex items-center justify-between px-3 py-2 rounded-xl transition select-none ${isG2Disabled ? 'opacity-35 bg-slate-50 text-slate-400 cursor-not-allowed' : (isAcceptedChecked ? 'bg-emerald-50 text-emerald-900 font-extrabold cursor-pointer' : 'hover:bg-slate-50 text-slate-700 font-bold cursor-pointer')}">
              <span class="flex items-center gap-2">
                <span>🏆</span>
                <span>ได้ที่เเล้ว <span class="text-[10px] font-mono text-emerald-700 font-semibold">[Col S]</span></span>
              </span>
              <input type="checkbox" ${isAcceptedChecked ? 'checked' : ''} ${isG2Disabled ? 'disabled' : ''}
                     onchange="handleChecklistToggle(${c.id}, 'accepted')"
                     class="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 ${isG2Disabled ? 'cursor-not-allowed' : 'cursor-pointer'}">
            </label>

            <div class="border-t border-slate-100 my-1"></div>

            <!-- Item 5: ⚪ [ ] ปัดตก [Col J] -->
            <label class="flex items-center justify-between px-3 py-2 rounded-xl transition select-none ${isG3Disabled ? 'opacity-35 bg-slate-50 text-slate-400 cursor-not-allowed' : (isDroppedChecked ? 'bg-rose-50 text-rose-900 font-extrabold cursor-pointer' : 'hover:bg-slate-50 text-slate-700 font-bold cursor-pointer')}">
              <span class="flex items-center gap-2">
                <span>⚪</span>
                <span>ปัดตก <span class="text-[10px] font-mono text-rose-700 font-semibold">[Col J]</span></span>
              </span>
              <input type="checkbox" ${isDroppedChecked ? 'checked' : ''} ${isG3Disabled ? 'disabled' : ''}
                     onchange="handleChecklistToggle(${c.id}, 'dropped')"
                     class="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-slate-300 ${isG3Disabled ? 'cursor-not-allowed' : 'cursor-pointer'}">
            </label>

            <!-- Item 6: 🚫 [ ] ปิดรับสมัคร [Col N] -->
            <label class="flex items-center justify-between px-3 py-2 rounded-xl transition select-none ${isG3Disabled ? 'opacity-35 bg-slate-50 text-slate-400 cursor-not-allowed' : (isClosedChecked ? 'bg-slate-100 text-slate-900 font-extrabold cursor-pointer' : 'hover:bg-slate-50 text-slate-700 font-bold cursor-pointer')}">
              <span class="flex items-center gap-2">
                <span>🚫</span>
                <span>ปิดรับสมัคร <span class="text-[10px] font-mono text-slate-700 font-semibold">[Col N]</span></span>
              </span>
              <input type="checkbox" ${isClosedChecked ? 'checked' : ''} ${isG3Disabled ? 'disabled' : ''}
                     onchange="handleChecklistToggle(${c.id}, 'closed')"
                     class="w-4 h-4 rounded text-slate-600 focus:ring-slate-500 border-slate-300 ${isG3Disabled ? 'cursor-not-allowed' : 'cursor-pointer'}">
            </label>

          </div>
        </div>
      </div>

    </article>
  `;
}

function handleChecklistToggle(companyId, optionKey) {
  const comp = companies.find(c => c.id === companyId);
  if (!comp) return;

  if (!comp.col_p) comp.col_p = '';
  if (!comp.col_q) comp.col_q = '';
  if (!comp.col_r) comp.col_r = '';
  if (!comp.col_s) comp.col_s = '';
  if (!comp.col_j) comp.col_j = (comp.tier || '✅');
  if (!comp.col_n) comp.col_n = (comp.status_open || '✅');

  // Group 1: เล็งไว้แต่ยังไม่ยื่น
  if (optionKey === 'target') {
    if (comp.col_p === '❌') {
      comp.col_p = ''; // uncheck
    } else {
      comp.col_p = '❌'; // check
      // ล้าง Group 2
      comp.col_q = '';
      comp.col_r = '';
      comp.col_s = '';
      // ล้าง Group 3
      if (comp.col_j === '❌') comp.col_j = (comp.orig_tier || '✅');
      if (comp.col_n === '❌') comp.col_n = (comp.orig_status_open || '✅');
      comp.tier = comp.col_j;
      comp.status_open = comp.col_n;
    }
  }

  // Group 2: ขั้นตอนการสมัคร
  else if (optionKey === 'applied' || optionKey === 'followup' || optionKey === 'interview' || optionKey === 'accepted') {
    // ล้าง Group 1
    if (comp.col_p === '❌') comp.col_p = '';
    // ล้าง Group 3
    if (comp.col_j === '❌') comp.col_j = (comp.orig_tier || '✅');
    if (comp.col_n === '❌') comp.col_n = (comp.orig_status_open || '✅');
    comp.tier = comp.col_j;
    comp.status_open = comp.col_n;

    if (optionKey === 'applied') {
      comp.col_p = (comp.col_p === '✅' ? '' : '✅');
    } else if (optionKey === 'followup') {
      comp.col_q = (comp.col_q === '✅' ? '' : '✅');
      if (comp.col_q === '✅' && comp.col_p !== '✅') comp.col_p = '✅';
    } else if (optionKey === 'interview') {
      comp.col_r = (comp.col_r === '✅' ? '' : '✅');
      if (comp.col_r === '✅' && comp.col_p !== '✅') comp.col_p = '✅';
    } else if (optionKey === 'accepted') {
      comp.col_s = (comp.col_s === '✅' ? '' : '✅');
      if (comp.col_s === '✅' && comp.col_p !== '✅') comp.col_p = '✅';
    }
  }

  // Group 3: ปัดตก / ปิดรับสมัคร
  else if (optionKey === 'dropped' || optionKey === 'closed') {
    // ล้าง Group 1
    if (comp.col_p === '❌') comp.col_p = '';
    // ล้าง Group 2
    if (comp.col_p === '✅') comp.col_p = '';
    comp.col_q = '';
    comp.col_r = '';
    comp.col_s = '';

    if (optionKey === 'dropped') {
      comp.col_j = (comp.col_j === '❌' ? (comp.orig_tier || '✅') : '❌');
      comp.tier = comp.col_j;
    } else if (optionKey === 'closed') {
      comp.col_n = (comp.col_n === '❌' ? (comp.orig_status_open || '✅') : '❌');
      comp.status_open = comp.col_n;
    }
  }

  // คำนวณสถานะล่าสุดเพื่อแสดงผลบนการ์ดและ Kanban
  const eff = calculateCompanyStatus(comp);
  comp.column = eff.column;

  saveData();
  syncCheckboxesToGoogleSheet(comp);
  renderAll();

  showToast(`อัปเดต "${comp.name}" -> ${eff.label}`);
}

function clearCompanyChecklist(companyId) {
  const comp = companies.find(c => c.id === companyId);
  if (!comp) return;

  comp.col_p = '';
  comp.col_q = '';
  comp.col_r = '';
  comp.col_s = '';
  if (comp.col_j === '❌') comp.col_j = (comp.orig_tier || '✅');
  if (comp.col_n === '❌') comp.col_n = (comp.orig_status_open || '✅');
  comp.tier = comp.col_j;
  comp.status_open = comp.col_n;

  const eff = calculateCompanyStatus(comp);
  comp.column = eff.column;

  saveData();
  syncCheckboxesToGoogleSheet(comp);
  renderAll();

  showToast(`ล้างเช็คลิสต์ของ "${comp.name}" เรียบร้อย`);
}

function toggleStatusDropdown(e, id) {
  if (e) e.stopPropagation();
  openStatusDropdownId = (openStatusDropdownId === id ? null : id);
  renderAll();
}

function toggleCardAccordion(id) {
  const el = document.getElementById(`card-details-${id}`);
  if (!el) return;
  const isHidden = el.classList.contains('hidden');
  if (isHidden) {
    el.classList.remove('hidden');
    expandedCards.add(id);
  } else {
    el.classList.add('hidden');
    expandedCards.delete(id);
  }
  if (window.lucide) lucide.createIcons();
}

function quickChangeStatus(id, newStatus) {
  const comp = companies.find(c => c.id === id);
  if (!comp) return;

  if (newStatus === 'target') {
    comp.col_p = '❌';
    comp.col_q = '';
    comp.col_r = '';
    comp.col_s = '';
    if (comp.col_j === '❌') comp.col_j = (comp.orig_tier || '✅');
    if (comp.col_n === '❌') comp.col_n = (comp.orig_status_open || '✅');
  } else if (newStatus === 'applied') {
    comp.col_p = '✅';
    comp.col_q = '';
    comp.col_r = '';
    comp.col_s = '';
    if (comp.col_j === '❌') comp.col_j = (comp.orig_tier || '✅');
    if (comp.col_n === '❌') comp.col_n = (comp.orig_status_open || '✅');
  } else if (newStatus === 'following_up') {
    comp.col_p = '✅';
    comp.col_q = '✅';
    comp.col_r = '';
    comp.col_s = '';
    if (comp.col_j === '❌') comp.col_j = (comp.orig_tier || '✅');
    if (comp.col_n === '❌') comp.col_n = (comp.orig_status_open || '✅');
  } else if (newStatus === 'interview') {
    comp.col_p = '✅';
    comp.col_q = '✅';
    comp.col_r = '✅';
    comp.col_s = '';
    if (comp.col_j === '❌') comp.col_j = (comp.orig_tier || '✅');
    if (comp.col_n === '❌') comp.col_n = (comp.orig_status_open || '✅');
  } else if (newStatus === 'accepted') {
    comp.col_p = '✅';
    comp.col_q = '✅';
    comp.col_r = '✅';
    comp.col_s = '✅';
    if (comp.col_j === '❌') comp.col_j = (comp.orig_tier || '✅');
    if (comp.col_n === '❌') comp.col_n = (comp.orig_status_open || '✅');
  } else if (newStatus === 'dropped') {
    comp.col_p = '';
    comp.col_q = '';
    comp.col_r = '';
    comp.col_s = '';
    comp.col_j = '❌';
    comp.tier = '❌';
  }

  comp.tier = comp.col_j;
  comp.status_open = comp.col_n;
  const eff = calculateCompanyStatus(comp);
  comp.column = eff.column;

  saveData();
  syncCheckboxesToGoogleSheet(comp);
  renderAll();

  showToast(`อัปเดต "${comp.name}" -> ${eff.label}`);
}

function copyEmailWithEffect(btnEl, email, companyName) {
  navigator.clipboard.writeText(email).then(() => {
    if (btnEl) {
      btnEl.classList.add('copied-flash');
      const labelEl = btnEl.querySelector('.copy-label');
      const oldText = labelEl ? labelEl.textContent : '';
      if (labelEl) {
        labelEl.textContent = 'คัดลอกแล้ว!';
        labelEl.className = 'copy-label px-2 py-0.5 rounded-lg bg-white text-emerald-700 text-[11px] font-extrabold';
      }
      setTimeout(() => {
        btnEl.classList.remove('copied-flash');
        if (labelEl) {
          labelEl.textContent = oldText || 'คัดลอกเมล';
          labelEl.className = 'copy-label px-2 py-0.5 rounded-lg bg-sky-100 text-sky-700 text-[11px] font-extrabold';
        }
      }, 1800);
    }
    showToast(`คัดลอกอีเมล ${email} (${companyName}) เรียบร้อย`);
  });
}

/**
 * js/views.js - จัดการมุมมองพิเศษ: 4 โซนการเดินทาง (Zones View) และประวัติการโทร (Call Logs View)
 * Clean Minimalist UI without AI emojis
 */

function renderZonesView(list) {
  if (!list) list = getFilteredList();
  const container = document.getElementById('zonesGridContainer');
  if (!container) return;

  const zoneDefs = [
    { id: 'zone1', title: 'โซน 1: ใกล้บ้านมาก (สาทร / สีลม / บางรัก / พระราม 3)', desc: 'เดินทางไป-กลับง่ายที่สุด 15–30 นาที ประหยัดทั้งเวลาและค่าเดินทาง' },
    { id: 'zone2', title: 'โซน 2: ปทุมวัน / สยาม / สามย่าน / พญาไท', desc: 'นั่ง BTS ต่อเดียวสะดวกมาก 30–45 นาที' },
    { id: 'zone3', title: 'โซน 3: สุขุมวิท / อโศก / คลองเตย / วัฒนา', desc: 'แหล่งรวมบริษัท Tech ชั้นนำ เดินทางด้วย BTS/MRT 40–55 นาที' },
    { id: 'zone4', title: 'โซน 4: รัชดา / พระราม 9 / จตุจักร / รอบนอก', desc: 'ระยะทางไกลขึ้น แนะนำดูบริษัทที่มีเบี้ยเลี้ยงหรือเข้าออฟฟิศแบบ Hybrid' }
  ];

  container.innerHTML = zoneDefs.map(z => {
    const items = list.filter(c => getZoneGroup(c).id === z.id);
    return `
      <div class="bg-white rounded-3xl border border-sky-100 p-5 sm:p-6 shadow-card space-y-4">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div>
            <h4 class="text-lg font-extrabold text-slate-900">${z.title}</h4>
            <p class="text-xs sm:text-sm text-slate-500">${z.desc}</p>
          </div>
          <span class="px-3.5 py-1 rounded-full bg-sky-100 text-sky-800 font-extrabold text-xs self-start">${items.length} บริษัท</span>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          ${items.map(c => {
            const tierCfg = getTierConfig(c.tier);
            const statusCfg = getStatusConfig(c.column);
            return `
              <div class="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 hover:border-sky-300 flex flex-col justify-between gap-3">
                <div class="space-y-1.5">
                  <div class="flex items-center justify-between gap-2">
                    <span class="text-xs font-extrabold text-slate-500">#${c.no} • เขต${escapeHtml(c.zone)}</span>
                    <span class="text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${tierCfg.pillClass}">${escapeHtml(tierCfg.shortLabel)}</span>
                  </div>
                  <h5 class="font-extrabold text-slate-900 text-base">${escapeHtml(c.name)}</h5>
                  <p class="text-xs text-sky-700 font-semibold line-clamp-2">${escapeHtml(c.role)}</p>
                  <p class="text-xs text-slate-500 flex items-center gap-1">
                    <i data-lucide="building-2" class="w-3.5 h-3.5 text-slate-400"></i>
                    <span>${escapeHtml(c.location)}</span>
                  </p>
                </div>
                <div class="flex items-center justify-between pt-2 border-t border-slate-200/60">
                  <span class="text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${statusCfg.pillClass}">${escapeHtml(statusCfg.label)}</span>
                  <button onclick="openSmartCallModal(${c.id})" class="text-xs font-bold text-sky-600 hover:underline cursor-pointer">ดูข้อมูล →</button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }).join('');
}

function renderCallLogs() {
  const container = document.getElementById('logsCardsContainer');
  if (!container) return;

  const logged = companies.filter(c => {
    const note = `${c.status_followup || ''} ${c.custom_notes || ''}`.trim();
    return (note && note !== '-') || c.column === 'applied' || c.column === 'following_up' || c.column === 'interview' || c.column === 'accepted';
  });

  if (logged.length === 0) {
    container.innerHTML = `<div class="bg-white rounded-3xl p-8 text-center text-slate-500 border border-sky-100">ยังไม่มีประวัติการโทรหรือส่งเมลติดตามผล</div>`;
    return;
  }

  container.innerHTML = logged.map(c => {
    const statusCfg = getStatusConfig(c.column);
    const note = (c.custom_notes && c.custom_notes !== c.status_followup) ? c.custom_notes : (c.status_followup || '-');
    return `
      <div class="bg-white rounded-3xl p-5 border border-sky-100 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div class="space-y-1.5">
          <div class="flex items-center gap-2">
            <span class="px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-700 font-extrabold text-xs">#${c.no}</span>
            <h4 class="font-extrabold text-slate-900 text-base">${escapeHtml(c.name)}</h4>
            <span class="text-xs font-bold px-2.5 py-0.5 rounded-full border ${statusCfg.pillClass}">${escapeHtml(statusCfg.label)}</span>
          </div>
          <p class="text-xs sm:text-sm text-amber-950 bg-amber-50/80 px-3.5 py-2 rounded-xl border border-amber-200/80 font-medium">
            ${escapeHtml(note)}
          </p>
        </div>
        <button onclick="openSmartCallModal(${c.id})" class="btn-interactive self-start sm:self-center px-4 py-2 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 font-bold text-xs border border-sky-200 shrink-0 cursor-pointer">
          ดูข้อมูล / โทรหา HR
        </button>
      </div>
    `;
  }).join('');
}

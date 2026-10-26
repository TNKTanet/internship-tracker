/**
 * js/kanban.js - ระบบกระดาน Kanban Board แบบลากวาง (Drag & Drop) 6 คอลัมน์
 */

let draggedCompanyId = null;

function renderKanban(list) {
  if (!list) list = getFilteredList();
  const cols = ['target', 'applied', 'following_up', 'interview', 'accepted', 'dropped'];

  cols.forEach(col => {
    const colEl = document.getElementById(`col-${col}`);
    const countEl = document.getElementById(`kcount-${col}`);
    if (!colEl) return;

    const items = list.filter(c => c.column === col);
    if (countEl) countEl.textContent = items.length;

    colEl.innerHTML = items.map(c => {
      const tierCfg = getTierConfig(c.tier);
      return `
        <div draggable="true" ondragstart="handleDragStart(event, ${c.id})" ondragend="handleDragEnd(event)"
             class="bg-white rounded-2xl p-3.5 border border-slate-200/90 hover:border-sky-400 shadow-2xs cursor-grab active:cursor-grabbing space-y-2 transition">
          <div class="flex items-center justify-between gap-1">
            <span class="text-[11px] font-extrabold px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700">#${c.no}</span>
            <span class="text-[11px] font-bold px-2 py-0.5 rounded-full border ${tierCfg.pillClass}">${escapeHtml(tierCfg.shortLabel)}</span>
          </div>
          <h4 class="font-extrabold text-sm text-slate-900 leading-snug">${escapeHtml(c.name)}</h4>
          <p class="text-xs text-sky-700 font-medium line-clamp-1">${escapeHtml(c.role || '-')}</p>
          <div class="text-[11px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-100">
            <span>เขต${escapeHtml(c.zone || '-')}</span>
            <button onclick="openSmartCallModal(${c.id})" class="text-sky-600 font-bold hover:underline cursor-pointer">ดูข้อมูล</button>
          </div>
        </div>
      `;
    }).join('');
  });
}

function handleDragStart(e, id) {
  draggedCompanyId = id;
  e.currentTarget.classList.add('card-dragging');
}

function handleDragEnd(e) {
  e.currentTarget.classList.remove('card-dragging');
}

function allowDrop(e) {
  e.preventDefault();
  e.currentTarget.classList.add('drag-over');
}

function dropLeave(e) {
  e.currentTarget.classList.remove('drag-over');
}

function handleDrop(e, targetCol) {
  e.preventDefault();
  e.currentTarget.classList.remove('drag-over');
  if (draggedCompanyId !== null) {
    quickChangeStatus(draggedCompanyId, targetCol);
    draggedCompanyId = null;
  }
}

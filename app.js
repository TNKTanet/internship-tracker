/**
 * app.js - Main Application Orchestrator & View Router
 * เชื่อมโยงโมดูล config, sync, filters, cards, kanban, modals, views เข้าด้วยกัน
 */

let companies = [];
let currentPage = 'feed';

// ==========================================
// 1. INITIAL DATA LOADER
// ==========================================
function loadInitialData() {
  if (Array.isArray(window.DEFAULT_COMPANIES) && window.DEFAULT_COMPANIES.length > 0) {
    companies = window.DEFAULT_COMPANIES.map(normalizeCompany);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(companies));
    return;
  }
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        companies = parsed.map(normalizeCompany);
        return;
      }
    } catch (e) {
      console.error('Failed to parse local storage:', e);
    }
  }
  companies = [];
}

// ==========================================
// 2. VIEW ROUTER & NAVIGATION
// ==========================================
function switchPage(pageId) {
  currentPage = pageId;
  document.querySelectorAll('.view-page').forEach(el => el.classList.remove('active'));
  const target = document.getElementById(`page-${pageId}`);
  if (target) target.classList.add('active');

  ['feed', 'kanban', 'zones', 'logs', 'cheatsheet'].forEach(id => {
    const btn = document.getElementById(`top-nav-${id}`);
    if (!btn) return;
    if (id === pageId) {
      btn.className = 'btn-interactive whitespace-nowrap px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold bg-white text-sky-700 shadow-xs border border-sky-200 transition flex items-center gap-1.5';
    } else {
      btn.className = 'btn-interactive whitespace-nowrap px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium text-slate-600 hover:text-sky-700 transition flex items-center gap-1.5';
    }
  });

  const sidebar = document.getElementById('drawerSidebar');
  if (sidebar && !sidebar.classList.contains('-translate-x-full')) {
    toggleSidebar();
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
  renderAll();
}

function toggleSidebar() {
  const sidebar = document.getElementById('drawerSidebar');
  const backdrop = document.getElementById('sidebarBackdrop');
  if (!sidebar || !backdrop) return;

  const isClosed = sidebar.classList.contains('-translate-x-full');
  if (isClosed) {
    sidebar.classList.remove('-translate-x-full');
    backdrop.classList.remove('hidden');
  } else {
    sidebar.classList.add('-translate-x-full');
    backdrop.classList.add('hidden');
  }
}

// ==========================================
// 3. MASTER RENDER DISPATCHER
// ==========================================
function renderAll() {
  updateTopStats();
  const list = getFilteredList();

  const matchBadge = document.getElementById('feedMatchCount');
  if (matchBadge) matchBadge.textContent = list.length;

  const summaryText = document.getElementById('filterSummaryText');
  if (summaryText) {
    summaryText.innerHTML = `กำลังแสดง <strong class="text-sky-600 font-extrabold">${list.length}</strong> จากทั้งหมด <strong>${companies.length}</strong> บริษัท`;
  }

  if (currentPage === 'feed') renderJobFeed(list);
  if (currentPage === 'kanban') renderKanban(list);
  if (currentPage === 'zones') renderZonesView(list);
  if (currentPage === 'logs') renderCallLogs();

  if (window.lucide) lucide.createIcons();
}

// ==========================================
// 4. APP ENTRY POINT
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
  loadInitialData();
  populateDistrictFilter();
  renderAll();
  if (window.lucide) lucide.createIcons();

  // ซิงก์ข้อมูลสดจาก Google Sheet อัตโนมัติทันทีที่เปิดหน้าเว็บ
  await syncFromGoogleSheet(false, true);

  // ตั้งเวลาซิงก์สดจาก Google Sheet อัตโนมัติทุกๆ 15 วินาที เพื่อ Real-time จริง
  setInterval(() => {
    syncFromGoogleSheet(false, true);
  }, 15000);
});

/**
 * js/filters.js
 * Multi-dimensional filtering, search, sorting, and KPI counters
 */

let currentFilters = {
  search: '',
  no: 'all',
  zone: 'all',
  district: 'all',
  tier: 'all',
  status: 'all',
  open: 'all',
  sort: 'no_asc'
};

function populateDistrictFilter() {
  populateNoFilter();
  const select = document.getElementById('districtFilterSelect');
  if (!select) return;

  const currentVal = select.value || 'all';
  const counts = {};
  companies.forEach(c => {
    const d = (c.zone || '').trim();
    if (d) counts[d] = (counts[d] || 0) + 1;
  });

  const districts = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
  select.innerHTML = `<option value="all">ทุกเขตพื้นที่ (${districts.length} เขต)</option>` +
    districts.map(d => `<option value="${escapeHtml(d)}">เขต${escapeHtml(d)} (${counts[d]} บริษัท)</option>`).join('');

  if (districts.includes(currentVal) || currentVal === 'all') {
    select.value = currentVal;
  }
}

function populateNoFilter() {
  const container = document.getElementById('noFilterCompanyList');
  if (!container) return;

  const sortedByNo = [...companies].sort((a, b) => (Number(a.no) || 999) - (Number(b.no) || 999));
  container.innerHTML = sortedByNo.map(c => {
    return `<option value="single_${c.no}">#${c.no} ${escapeHtml(c.name)}</option>`;
  }).join('');
}

function handleTopKpiClick(statusKey) {
  const statusSelect = document.getElementById('statusFilterSelect');
  if (currentFilters.status === statusKey && statusKey !== 'all') {
    currentFilters.status = 'all';
  } else {
    currentFilters.status = statusKey;
  }

  if (statusSelect) {
    statusSelect.value = currentFilters.status;
  }

  if (currentPage !== 'feed') {
    switchPage('feed');
  } else {
    applyFilters();
  }
}

function highlightActiveKpiCard() {
  const statuses = [
    { key: 'all', id: 'kpi-card-all', activeClass: 'border-2 border-sky-500 ring-4 ring-sky-500/15 bg-sky-50/30' },
    { key: 'target', id: 'kpi-card-target', activeClass: 'border-2 border-blue-500 ring-4 ring-blue-500/15 bg-blue-50/30' },
    { key: 'applied', id: 'kpi-card-applied', activeClass: 'border-2 border-amber-500 ring-4 ring-amber-500/15 bg-amber-50/30' },
    { key: 'following_up', id: 'kpi-card-following_up', activeClass: 'border-2 border-purple-500 ring-4 ring-purple-500/15 bg-purple-50/30' },
    { key: 'interview', id: 'kpi-card-interview', activeClass: 'border-2 border-blue-600 ring-4 ring-blue-600/15 bg-blue-50/30' },
    { key: 'accepted', id: 'kpi-card-accepted', activeClass: 'border-2 border-emerald-500 ring-4 ring-emerald-500/15 bg-emerald-50/30' }
  ];

  statuses.forEach(item => {
    const el = document.getElementById(item.id);
    if (!el) return;
    if (currentFilters.status === item.key) {
      el.className = `kpi-card btn-interactive text-left relative overflow-hidden rounded-3xl p-4 sm:p-5 shadow-card-hover cursor-pointer transition-all ${item.activeClass}`;
    } else {
      el.className = `kpi-card btn-interactive text-left relative overflow-hidden bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/90 hover:border-sky-300 shadow-card cursor-pointer transition-all`;
    }
  });
}

function handleSearch(val) {
  currentFilters.search = (val || '').trim().toLowerCase();
  const clearBtn = document.getElementById('btnClearSearch');
  if (clearBtn) {
    clearBtn.classList.toggle('hidden', !currentFilters.search);
  }
  applyFilters();
}

function clearSearchInput() {
  const input = document.getElementById('globalSearchInput');
  if (input) input.value = '';
  handleSearch('');
}

function resetAllFilters() {
  currentFilters = {
    search: '',
    no: 'all',
    zone: 'all',
    district: 'all',
    tier: 'all',
    status: 'all',
    open: 'all',
    sort: 'no_asc'
  };

  const searchEl = document.getElementById('globalSearchInput');
  const noEl = document.getElementById('noFilterSelect');
  const zoneEl = document.getElementById('zoneFilterSelect');
  const distEl = document.getElementById('districtFilterSelect');
  const tierEl = document.getElementById('tierFilterSelect');
  const statusEl = document.getElementById('statusFilterSelect');
  const openEl = document.getElementById('openFilterSelect');
  const sortEl = document.getElementById('sortOrderSelect');
  const clearBtn = document.getElementById('btnClearSearch');

  if (searchEl) searchEl.value = '';
  if (noEl) noEl.value = 'all';
  if (zoneEl) zoneEl.value = 'all';
  if (distEl) distEl.value = 'all';
  if (tierEl) tierEl.value = 'all';
  if (statusEl) statusEl.value = 'all';
  if (openEl) openEl.value = 'all';
  if (sortEl) sortEl.value = 'no_asc';
  if (clearBtn) clearBtn.classList.add('hidden');

  applyFilters();
  showToast('ล้างตัวกรองทั้งหมดเรียบร้อย');
}

function applyFilters() {
  const noEl = document.getElementById('noFilterSelect');
  const zoneEl = document.getElementById('zoneFilterSelect');
  const distEl = document.getElementById('districtFilterSelect');
  const tierEl = document.getElementById('tierFilterSelect');
  const statusEl = document.getElementById('statusFilterSelect');
  const openEl = document.getElementById('openFilterSelect');
  const sortEl = document.getElementById('sortOrderSelect');

  if (noEl) currentFilters.no = noEl.value;
  if (zoneEl) currentFilters.zone = zoneEl.value;
  if (distEl) currentFilters.district = distEl.value;
  if (tierEl) currentFilters.tier = tierEl.value;
  if (statusEl) currentFilters.status = statusEl.value;
  if (openEl) currentFilters.open = openEl.value;
  if (sortEl) currentFilters.sort = sortEl.value;

  const hasActiveFilter =
    currentFilters.search !== '' ||
    currentFilters.no !== 'all' ||
    currentFilters.zone !== 'all' ||
    currentFilters.district !== 'all' ||
    currentFilters.tier !== 'all' ||
    currentFilters.status !== 'all' ||
    currentFilters.open !== 'all';

  const resetBtn = document.getElementById('btnResetFilters');
  if (resetBtn) {
    resetBtn.classList.toggle('hidden', !hasActiveFilter);
  }

  highlightActiveKpiCard();
  renderAll();
}

function getFilteredList() {
  const filtered = companies.filter(c => {
    // 0. Col A: ลำดับที่
    if (currentFilters.no && currentFilters.no !== 'all') {
      const num = Number(c.no) || 0;
      if (currentFilters.no.startsWith('single_')) {
        const targetNo = currentFilters.no.replace('single_', '').trim();
        if (String(c.no).trim() !== targetNo) return false;
      } else if (currentFilters.no === 'range_1_10' && (num < 1 || num > 10)) return false;
      else if (currentFilters.no === 'range_11_20' && (num < 11 || num > 20)) return false;
      else if (currentFilters.no === 'range_21_30' && (num < 21 || num > 30)) return false;
      else if (currentFilters.no === 'range_31_40' && (num < 31 || num > 40)) return false;
      else if (currentFilters.no === 'range_41_50' && (num < 41 || num > 50)) return false;
      else if (currentFilters.no === 'range_51_59' && (num < 51 || num > 59)) return false;
    }

    // 1. Search filter
    if (currentFilters.search) {
      const hay = `${c.no} ${c.name} ${c.role} ${c.zone} ${c.location} ${c.loc_desc} ${c.about} ${c.biz_type} ${c.reason} ${c.welfare} ${c.contact} ${c.status_followup} ${c.custom_notes}`.toLowerCase();
      if (!hay.includes(currentFilters.search)) return false;
    }

    // 2. Travel Zone filter (4 Zones)
    if (currentFilters.zone !== 'all') {
      if (getZoneGroup(c).id !== currentFilters.zone) return false;
    }

    // 3. Exact District filter
    if (currentFilters.district !== 'all') {
      if ((c.zone || '').trim() !== currentFilters.district) return false;
    }

    // 4. Tier List filter
    if (currentFilters.tier !== 'all') {
      const t = (c.tier || '').trim();
      if (currentFilters.tier === 'active') {
        if (t === '❌') return false;
      } else if (t !== currentFilters.tier) {
        return false;
      }
    }

    // 5. Application Status filter
    if (currentFilters.status !== 'all') {
      if (c.column !== currentFilters.status) return false;
    }

    // 6. Open Recruitment filter
    if (currentFilters.open !== 'all') {
      const openVal = (c.status_open || '').trim();
      if (openVal !== currentFilters.open) return false;
    }

    return true;
  });

  // Sorting
  filtered.sort((a, b) => {
    if (currentFilters.sort === 'no_asc') {
      return (Number(a.no) || 999) - (Number(b.no) || 999);
    }
    if (currentFilters.sort === 'tier_best') {
      const rankA = getTierConfig(a.tier).rank;
      const rankB = getTierConfig(b.tier).rank;
      if (rankA !== rankB) return rankA - rankB;
      return (Number(a.no) || 999) - (Number(b.no) || 999);
    }
    if (currentFilters.sort === 'zone_near') {
      const zoneA = getZoneGroup(a).order;
      const zoneB = getZoneGroup(b).order;
      if (zoneA !== zoneB) return zoneA - zoneB;
      return (Number(a.no) || 999) - (Number(b.no) || 999);
    }
    if (currentFilters.sort === 'status_active') {
      const statA = getStatusConfig(a.column).order;
      const statB = getStatusConfig(b.column).order;
      if (statA !== statB) return statA - statB;
      return (Number(a.no) || 999) - (Number(b.no) || 999);
    }
    return 0;
  });

  return filtered;
}

function updateTopStats() {
  const counts = { all: companies.length, target: 0, applied: 0, following_up: 0, interview: 0, accepted: 0, dropped: 0 };
  let logsCount = 0;

  companies.forEach(c => {
    if (counts[c.column] !== undefined) counts[c.column]++;
    const note = `${c.status_followup || ''} ${c.custom_notes || ''}`.trim();
    if (note && note !== '-' && !note.startsWith('ไม่เอาเพราะ')) logsCount++;
  });

  const setTxt = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };

  setTxt('count-all', counts.all);
  setTxt('count-target', counts.target);
  setTxt('count-applied', counts.applied);
  setTxt('count-following', counts.following_up);
  setTxt('count-interview', counts.interview);
  setTxt('count-accepted', counts.accepted);
  setTxt('topLogCount', logsCount);
}

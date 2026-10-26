/**
 * Interactive controller for the Utsav Event Plan page.
 * Handles plan loading, WAI-ARIA tabs, budget display, timeline, checklists, ideas, and Q&A.
 */

let currentPlan = null;
let currentInputs = null;

/**
 * Initializes the plan view on DOMContentLoaded.
 */
function initPlan() {
  currentInputs = loadSession('utsav.inputs');
  if (!currentInputs) {
    window.location.replace('/create');
    return;
  }
  setupTabs();
  setupPrintButton();
  loadPlanData();
}

/**
 * Loads deterministic event plan from the server.
 */
async function loadPlanData() {
  const result = await api('/api/plan', currentInputs);
  const loading = document.getElementById('plan-loading');
  if (loading) loading.classList.add('hidden');
  if (!result.ok || !result.data.plan) {
    renderPlanError(describeError(result));
    return;
  }
  currentPlan = result.data.plan;
  renderPlanHeader(currentPlan);
  setupBudgetControls();
  renderBudgetPanel(currentPlan);
  renderTimelinePanel(currentPlan);
  renderVendorsPanel(currentPlan);
  setupIdeasPanel();
  setupAskPanel();
  const container = document.getElementById('plan-container');
  if (container) container.classList.remove('hidden');
}

/**
 * Displays error container when plan generation fails.
 * @param {string} msg
 */
function renderPlanError(msg) {
  const errBox = document.getElementById('plan-error');
  const errMsg = document.getElementById('plan-error-message');
  if (errMsg) errMsg.textContent = msg;
  if (errBox) errBox.classList.remove('hidden');
}

/**
 * Configures WAI-ARIA tablist with roving tabindex and keyboard navigation.
 */
function setupTabs() {
  const tabs = Array.from(document.querySelectorAll('[role="tab"]'));
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => switchTab(tab, tabs));
    tab.addEventListener('keydown', (e) => handleTabKeydown(e, tab, tabs));
  });
}

/**
 * Switches the active tab and displays corresponding tabpanel.
 * @param {HTMLElement} activeTab
 * @param {HTMLElement[]} tabs
 */
function switchTab(activeTab, tabs) {
  tabs.forEach((t) => {
    t.setAttribute('aria-selected', 'false');
    t.tabIndex = -1;
    t.classList.remove('border-primary', 'text-primary', 'border-b-2');
    t.classList.add('text-muted');
    const panel = document.getElementById(t.getAttribute('aria-controls'));
    if (panel) panel.hidden = true;
  });
  activeTab.setAttribute('aria-selected', 'true');
  activeTab.tabIndex = 0;
  activeTab.classList.add('border-primary', 'text-primary', 'border-b-2');
  activeTab.classList.remove('text-muted');
  const activePanel = document.getElementById(activeTab.getAttribute('aria-controls'));
  if (activePanel) activePanel.hidden = false;
  activeTab.focus();
}

/**
 * Keyboard navigation for WAI-ARIA tabs (ArrowLeft, ArrowRight, Home, End).
 * @param {KeyboardEvent} e
 * @param {HTMLElement} currentTab
 * @param {HTMLElement[]} tabs
 */
function handleTabKeydown(e, currentTab, tabs) {
  const idx = tabs.indexOf(currentTab);
  let nextIdx = idx;
  if (e.key === 'ArrowRight') nextIdx = (idx + 1) % tabs.length;
  else if (e.key === 'ArrowLeft') nextIdx = (idx - 1 + tabs.length) % tabs.length;
  else if (e.key === 'Home') nextIdx = 0;
  else if (e.key === 'End') nextIdx = tabs.length - 1;
  else return;
  e.preventDefault();
  switchTab(tabs[nextIdx], tabs);
}

/**
 * Binds browser window print dialog to the print button.
 */
function setupPrintButton() {
  const btn = document.getElementById('btn-print');
  if (btn) btn.addEventListener('click', () => window.print());
}

const CATEGORY_META = {
  venue: {
    icon: '🏰',
    title: 'Venue & Spaces',
    subtitle: 'Hall rental, lawn, guest rooms & basic facilities',
    color: '#D97706',
    gradient: 'from-amber-600 to-yellow-500',
    lightBg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-800'
  },
  catering: {
    icon: '🍽️',
    title: 'Catering & Feasts',
    subtitle: 'Buffets, appetizers, live counters & beverage service',
    color: '#8B1E3F',
    gradient: 'from-[#8B1E3F] to-[#B91C1C]',
    lightBg: 'bg-[#FCF4F6]',
    border: 'border-[#F0D5DD]',
    text: 'text-[#8B1E3F]'
  },
  decor: {
    icon: '🌸',
    title: 'Decor & Florals',
    subtitle: 'Stage styling, mandap, floral arrangements & lights',
    color: '#2563EB',
    gradient: 'from-blue-600 to-indigo-500',
    lightBg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-800'
  },
  decor_setup: {
    icon: '🌸',
    title: 'Decor & Setup',
    subtitle: 'Stage styling, seating layout, banners & lighting',
    color: '#2563EB',
    gradient: 'from-blue-600 to-indigo-500',
    lightBg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-800'
  },
  photography: {
    icon: '📸',
    title: 'Photography & Films',
    subtitle: 'Candid photo captures, cinematic drone video & photobooks',
    color: '#9333EA',
    gradient: 'from-purple-600 to-pink-500',
    lightBg: 'bg-purple-50',
    border: 'border-purple-200',
    text: 'text-purple-800'
  },
  attire: {
    icon: '👗',
    title: 'Attire & Styling',
    subtitle: 'Celebration outfits, makeup & jewellery styling',
    color: '#0D9488',
    gradient: 'from-teal-600 to-emerald-500',
    lightBg: 'bg-teal-50',
    border: 'border-teal-200',
    text: 'text-teal-800'
  },
  attire_beauty: {
    icon: '👗',
    title: 'Attire & Styling',
    subtitle: 'Celebration outfits, bridal makeup, mehendi & jewellery',
    color: '#0D9488',
    gradient: 'from-teal-600 to-emerald-500',
    lightBg: 'bg-teal-50',
    border: 'border-teal-200',
    text: 'text-teal-800'
  },
  entertainment: {
    icon: '🎵',
    title: 'Music & Entertainment',
    subtitle: 'DJ console, live singers, dhol troupe & emcee host',
    color: '#E11D48',
    gradient: 'from-pink-600 to-rose-400',
    lightBg: 'bg-rose-50',
    border: 'border-rose-200',
    text: 'text-rose-800'
  },
  invitations: {
    icon: '💌',
    title: 'Invitations & Cards',
    subtitle: 'Printed wedding cards, custom stationery & digital invites',
    color: '#4F46E5',
    gradient: 'from-indigo-500 to-sky-400',
    lightBg: 'bg-indigo-50',
    border: 'border-indigo-200',
    text: 'text-indigo-800'
  },
  invitations_favours: {
    icon: '🎁',
    title: 'Invitations & Favours',
    subtitle: 'Themed invites, return gift hampers & attendee sweets',
    color: '#4F46E5',
    gradient: 'from-indigo-500 to-sky-400',
    lightBg: 'bg-indigo-50',
    border: 'border-indigo-200',
    text: 'text-indigo-800'
  },
  transport: {
    icon: '🚗',
    title: 'Transport & Fleet',
    subtitle: 'Guest shuttle buses, pickup cabs & decorated car',
    color: '#0891B2',
    gradient: 'from-cyan-600 to-teal-400',
    lightBg: 'bg-cyan-50',
    border: 'border-cyan-200',
    text: 'text-cyan-800'
  },
  cake: {
    icon: '🎂',
    title: 'Celebration Cake',
    subtitle: 'Designer multi-tier celebration cake & confections',
    color: '#EA580C',
    gradient: 'from-orange-500 to-amber-500',
    lightBg: 'bg-orange-50',
    border: 'border-orange-200',
    text: 'text-orange-800'
  },
  sound_av: {
    icon: '🔊',
    title: 'Sound & Audio-Visual',
    subtitle: 'PA speakers, cordless microphones & LED screens',
    color: '#0284C7',
    gradient: 'from-sky-500 to-blue-600',
    lightBg: 'bg-sky-50',
    border: 'border-sky-200',
    text: 'text-sky-800'
  },
  permits_insurance: {
    icon: '📜',
    title: 'Permits & Insurance',
    subtitle: 'Municipal NOC, police permissions & event insurance',
    color: '#65A30D',
    gradient: 'from-lime-600 to-emerald-600',
    lightBg: 'bg-lime-50',
    border: 'border-lime-200',
    text: 'text-lime-800'
  },
  publicity_printing: {
    icon: '📢',
    title: 'Publicity & Signage',
    subtitle: 'Banners, delegate badges, flyers & stage backdrops',
    color: '#C026D3',
    gradient: 'from-fuchsia-500 to-pink-500',
    lightBg: 'bg-fuchsia-50',
    border: 'border-fuchsia-200',
    text: 'text-fuchsia-800'
  },
  volunteers_logistics: {
    icon: '🤝',
    title: 'Volunteer Operations',
    subtitle: 'Crew uniforms, catering packs, walkie-talkies & kit',
    color: '#059669',
    gradient: 'from-emerald-500 to-teal-600',
    lightBg: 'bg-emerald-50',
    border: 'border-emerald-200',
    text: 'text-emerald-800'
  },
  contingency: {
    icon: '🛡️',
    title: 'Contingency Reserve',
    subtitle: 'Untouchable cushion for last-minute headcount or weather',
    color: '#64748B',
    gradient: 'from-slate-500 to-gray-400',
    lightBg: 'bg-slate-50',
    border: 'border-slate-200',
    text: 'text-slate-800'
  }
};

/**
 * Returns metadata definition for a given category key.
 * @param {string} cat
 * @returns {object}
 */
function getCategoryMeta(cat) {
  return CATEGORY_META[cat] || {
    icon: '✨',
    title: formatTitle(cat),
    subtitle: 'Allocated celebration expense',
    color: '#8B1E3F',
    gradient: 'from-[#8B1E3F] to-[#B91C1C]',
    lightBg: 'bg-[#FCF4F6]',
    border: 'border-[#F0D5DD]',
    text: 'text-[#8B1E3F]'
  };
}

const BAR_COLORS = {
  catering: 'bg-gradient-to-r from-[#8B1E3F] to-[#B91C1C]',
  venue: 'bg-gradient-to-r from-amber-600 to-yellow-500',
  decor: 'bg-gradient-to-r from-blue-600 to-indigo-500',
  decor_setup: 'bg-gradient-to-r from-blue-600 to-indigo-500',
  attire: 'bg-gradient-to-r from-teal-600 to-emerald-500',
  attire_beauty: 'bg-gradient-to-r from-teal-600 to-emerald-500',
  photography: 'bg-gradient-to-r from-purple-600 to-pink-500',
  entertainment: 'bg-gradient-to-r from-pink-600 to-rose-400',
  invitations: 'bg-gradient-to-r from-indigo-500 to-sky-400',
  invitations_favours: 'bg-gradient-to-r from-indigo-500 to-sky-400',
  transport: 'bg-gradient-to-r from-cyan-600 to-teal-400',
  cake: 'bg-gradient-to-r from-orange-500 to-amber-500',
  sound_av: 'bg-gradient-to-r from-sky-500 to-blue-600',
  permits_insurance: 'bg-gradient-to-r from-lime-600 to-emerald-600',
  publicity_printing: 'bg-gradient-to-r from-fuchsia-500 to-pink-500',
  volunteers_logistics: 'bg-gradient-to-r from-emerald-500 to-teal-600',
  contingency: 'bg-gradient-to-r from-slate-500 to-gray-400',
};

// Budget Presentation State
let activeBudgetUnit = 'total'; // 'total' | 'guest'
let activeBudgetView = 'split'; // 'split' | 'cards'
let activeBudgetSort = 'amount-desc'; // 'amount-desc' | 'amount-asc' | 'name'
let budgetControlsInitialized = false;

/**
 * Initializes toolbar controls for the budget presentation section.
 */
function setupBudgetControls() {
  if (budgetControlsInitialized) return;
  budgetControlsInitialized = true;

  const btnViewSplit = document.getElementById('btn-view-split');
  const btnViewCards = document.getElementById('btn-view-cards');
  const splitView = document.getElementById('budget-split-view');
  const cardsView = document.getElementById('budget-cards-view');

  if (btnViewSplit && btnViewCards) {
    btnViewSplit.addEventListener('click', () => {
      activeBudgetView = 'split';
      btnViewSplit.classList.add('bg-primary', 'text-white', 'shadow-xs');
      btnViewSplit.classList.remove('text-muted');
      btnViewSplit.setAttribute('aria-pressed', 'true');
      btnViewCards.classList.remove('bg-primary', 'text-white', 'shadow-xs');
      btnViewCards.classList.add('text-muted');
      btnViewCards.setAttribute('aria-pressed', 'false');
      if (splitView) splitView.classList.remove('hidden');
      if (cardsView) cardsView.classList.add('hidden');
    });

    btnViewCards.addEventListener('click', () => {
      activeBudgetView = 'cards';
      btnViewCards.classList.add('bg-primary', 'text-white', 'shadow-xs');
      btnViewCards.classList.remove('text-muted');
      btnViewCards.setAttribute('aria-pressed', 'true');
      btnViewSplit.classList.remove('bg-primary', 'text-white', 'shadow-xs');
      btnViewSplit.classList.add('text-muted');
      btnViewSplit.setAttribute('aria-pressed', 'false');
      if (cardsView) cardsView.classList.remove('hidden');
      if (splitView) splitView.classList.add('hidden');
    });
  }

  const btnUnitTotal = document.getElementById('btn-unit-total');
  const btnUnitGuest = document.getElementById('btn-unit-guest');

  if (btnUnitTotal && btnUnitGuest) {
    btnUnitTotal.addEventListener('click', () => {
      if (activeBudgetUnit === 'total') return;
      activeBudgetUnit = 'total';
      btnUnitTotal.classList.add('bg-[#8B1E3F]', 'text-white', 'shadow-xs');
      btnUnitTotal.classList.remove('text-muted');
      btnUnitTotal.setAttribute('aria-pressed', 'true');
      btnUnitGuest.classList.remove('bg-[#8B1E3F]', 'text-white', 'shadow-xs');
      btnUnitGuest.classList.add('text-muted');
      btnUnitGuest.setAttribute('aria-pressed', 'false');
      const thAmt = document.getElementById('th-budget-amount');
      if (thAmt) thAmt.textContent = 'Amount (₹)';
      if (currentPlan) renderBudgetPanel(currentPlan);
    });

    btnUnitGuest.addEventListener('click', () => {
      if (activeBudgetUnit === 'guest') return;
      activeBudgetUnit = 'guest';
      btnUnitGuest.classList.add('bg-[#8B1E3F]', 'text-white', 'shadow-xs');
      btnUnitGuest.classList.remove('text-muted');
      btnUnitGuest.setAttribute('aria-pressed', 'true');
      btnUnitTotal.classList.remove('bg-[#8B1E3F]', 'text-white', 'shadow-xs');
      btnUnitTotal.classList.add('text-muted');
      btnUnitTotal.setAttribute('aria-pressed', 'false');
      const thAmt = document.getElementById('th-budget-amount');
      if (thAmt) thAmt.textContent = 'Per Guest (₹)';
      if (currentPlan) renderBudgetPanel(currentPlan);
    });
  }

  const sortSelect = document.getElementById('select-budget-sort');
  if (sortSelect) {
    sortSelect.addEventListener('change', () => {
      activeBudgetSort = sortSelect.value;
      if (currentPlan) renderBudgetPanel(currentPlan);
    });
  }

  const copyBtn = document.getElementById('btn-copy-budget');
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      if (currentPlan) copyBudgetBreakdown(currentPlan);
    });
  }
}

/**
 * Displays floating notification toast with message.
 * @param {string} msg
 */
function showBudgetToast(msg) {
  const toast = document.getElementById('budget-toast');
  const toastMsg = document.getElementById('budget-toast-msg');
  if (!toast) return;
  if (toastMsg) toastMsg.textContent = msg;
  toast.classList.add('toast-visible');
  setTimeout(() => {
    toast.classList.remove('toast-visible');
  }, 2800);
}

/**
 * Copies formatted itemized expense summary to user clipboard.
 * @param {object} plan
 */
function copyBudgetBreakdown(plan) {
  if (!plan || !plan.budget) return;
  const lines = [];
  const eventName = plan.event_type.charAt(0).toUpperCase() + plan.event_type.slice(1);
  lines.push(`✨ Utsav Event Plan: ${eventName} Budget Breakdown`);
  lines.push(`💰 Total Budget: ${plan.total_display} | 👥 Guests: ${plan.guests}`);
  lines.push(`📅 Date: ${formatDate(plan.event_date)}`);
  lines.push('');
  lines.push('--- Itemized Expenses ---');
  Object.keys(plan.budget).forEach((cat) => {
    const meta = getCategoryMeta(cat);
    const amt = plan.budget_display[cat];
    const pct = (plan.budget_percentages[cat] || 0).toFixed(1);
    const perGuest = Math.round(plan.budget[cat] / (plan.guests || 1));
    lines.push(`${meta.icon} ${meta.title}: ${amt} (${pct}%) • ₹${perGuest.toLocaleString('en-IN')}/guest`);
  });
  lines.push('');
  lines.push('Created with Utsav Celebration Planner');

  const text = lines.join('\n');
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      showBudgetToast('✨ Expense summary copied to clipboard!');
    }).catch(() => {
      fallbackCopyText(text);
    });
  } else {
    fallbackCopyText(text);
  }
}

/**
 * Fallback clipboard copy using temporary textarea.
 * @param {string} text
 */
function fallbackCopyText(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand('copy');
    showBudgetToast('✨ Expense summary copied to clipboard!');
  } catch (e) {
    showBudgetToast('Unable to copy to clipboard.');
  }
  document.body.removeChild(ta);
}

/**
 * Switches tab to vendors and expands matching accordion block.
 * @param {string} cat
 */
function jumpToVendorCategory(cat) {
  const vendorTab = document.getElementById('tab-vendors');
  const tabs = Array.from(document.querySelectorAll('[role="tab"]'));
  if (vendorTab && tabs.length) {
    switchTab(vendorTab, tabs);
    setTimeout(() => {
      const details = document.querySelector(`details[data-vendor-category="${cat}"]`);
      if (details) {
        details.open = true;
        details.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 150);
  }
}

/**
 * Updates dynamic centerpiece text inside the SVG donut chart on category hover.
 * @param {string} cat
 * @param {object} plan
 */
function updateDonutCenter(cat, plan) {
  const meta = getCategoryMeta(cat);
  const icon = document.getElementById('donut-center-icon');
  const label = document.getElementById('donut-center-label');
  const val = document.getElementById('donut-center-value');
  const sub = document.getElementById('donut-center-sub');
  const pct = plan.budget_percentages[cat] || 0;
  const guests = plan.guests || 1;
  const amt = plan.budget[cat] || 0;
  const perGuest = Math.round(amt / guests);

  if (icon) icon.textContent = meta.icon;
  if (label) label.textContent = meta.title;
  if (val) {
    val.textContent = activeBudgetUnit === 'guest'
      ? `₹${perGuest.toLocaleString('en-IN')}`
      : (plan.budget_display[cat] || `₹${Math.round(amt).toLocaleString('en-IN')}`);
  }
  if (sub) {
    sub.textContent = `${pct.toFixed(1)}% of budget`;
  }
}

/**
 * Resets dynamic centerpiece text inside the SVG donut chart to total event budget.
 * @param {object} plan
 */
function resetDonutCenter(plan) {
  const icon = document.getElementById('donut-center-icon');
  const label = document.getElementById('donut-center-label');
  const val = document.getElementById('donut-center-value');
  const sub = document.getElementById('donut-center-sub');
  if (icon) icon.textContent = '✨';
  if (label) label.textContent = 'Total Budget';
  if (val) {
    if (activeBudgetUnit === 'guest') {
      const perGuestTotal = Math.round(plan.total_budget / (plan.guests || 1));
      val.textContent = `₹${perGuestTotal.toLocaleString('en-IN')}`;
    } else {
      val.textContent = plan.total_display;
    }
  }
  if (sub) {
    sub.textContent = activeBudgetUnit === 'guest' ? 'Average per guest' : '100% allocated';
  }
}

/**
 * Animates a numerical counter smoothly from start to end with cubic easing.
 * @param {HTMLElement} element - Target element to update.
 * @param {number} start - Starting numerical value.
 * @param {number} end - Target end value.
 * @param {number} duration - Animation duration in milliseconds.
 * @param {function(number): string} formatter - Formatting function for values.
 */
function animateNumber(element, start, end, duration = 1000, formatter = (v) => v.toString()) {
  if (!element) return;
  element.classList.add('number-pop');
  const startTime = performance.now();

  function step(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    // Cubic ease out: fast start, slow settle
    const ease = 1 - Math.pow(1 - progress, 3);
    const current = start + (end - start) * ease;
    element.textContent = formatter(Math.round(current));

    if (progress < 1) {
      requestAnimationFrame(step);
    } else {
      element.textContent = formatter(end);
    }
  }

  requestAnimationFrame(step);
}

/**
 * Synchronizes hover highlight state between budget table rows, donut slices, cards, and bars.
 * @param {string} cat - Category snake_case key.
 * @param {boolean} active - True if hovered, False if unhovered.
 */
function highlightCategory(cat, active) {
  const rows = document.querySelectorAll(`tr[data-category="${cat}"]`);
  const bars = document.querySelectorAll(`div[data-category="${cat}"]`);
  const cards = document.querySelectorAll(`.expense-category-card[data-category="${cat}"]`);
  const slices = document.querySelectorAll(`.donut-slice[data-category="${cat}"]`);
  const legends = document.querySelectorAll(`.legend-item[data-category="${cat}"]`);

  rows.forEach((r) => {
    if (active) r.classList.add('budget-row-highlight');
    else r.classList.remove('budget-row-highlight');
  });

  bars.forEach((b) => {
    const fill = b.querySelector('.animated-budget-bar');
    if (fill) {
      if (active) fill.classList.add('bar-highlight');
      else fill.classList.remove('bar-highlight');
    }
  });

  cards.forEach((c) => {
    if (active) c.classList.add('card-highlight');
    else c.classList.remove('card-highlight');
  });

  slices.forEach((s) => {
    if (active) s.classList.add('slice-active');
    else s.classList.remove('slice-active');
  });

  legends.forEach((l) => {
    if (active) l.classList.add('legend-active');
    else l.classList.remove('legend-active');
  });

  if (active && currentPlan) {
    updateDonutCenter(cat, currentPlan);
  } else if (!active && currentPlan) {
    resetDonutCenter(currentPlan);
  }
}

/**
 * Renders plan header summary information and tight urgency notice.
 * @param {object} plan
 */
function renderPlanHeader(plan) {
  const title = document.getElementById('plan-title');
  if (title) title.textContent = `Your ${plan.event_type} plan`;
  const line = document.getElementById('plan-summary-line');
  const dateStr = formatDate(plan.event_date);
  if (line) {
    line.textContent = `${dateStr} • ${plan.days_until_event} days to go • ${plan.guests} guests • ${plan.total_display}`;
  }
  if (plan.urgency === 'tight') {
    const notice = document.getElementById('tight-notice');
    if (notice) notice.classList.remove('hidden');
  }

  // Tile 1: Days to go (Animated roll-up)
  const tileDays = document.getElementById('tile-days-left');
  if (tileDays) {
    animateNumber(tileDays, 0, plan.days_until_event, 900, (v) => `${v} days`);
  }
  const tileUrg = document.getElementById('tile-urgency');
  if (tileUrg) {
    const urgText = plan.urgency.charAt(0).toUpperCase() + plan.urgency.slice(1);
    tileUrg.textContent = `${urgText} schedule`;
  }

  // Tile 2: Total budget (Animated currency counter)
  const tileBudget = document.getElementById('tile-total-budget');
  if (tileBudget) {
    animateNumber(tileBudget, 0, plan.total_budget, 1200, (v) => `₹${v.toLocaleString('en-IN')}`);
  }

  // Tile 3: Per guest (Animated per-guest metric)
  renderPerGuestBox(plan.per_guest);

  // Tile 4: Checklist progress initial count & bar fill
  const storageKey = `utsav.checks.${hashString(JSON.stringify(currentInputs))}`;
  const savedChecks = loadJSON(storageKey) || {};
  const totalTasks = plan.vendor_checklist
    ? plan.vendor_checklist.reduce((acc, v) => acc + (v.tasks ? v.tasks.length : 0), 0)
    : 0;
  const doneTasks = Object.keys(savedChecks).filter((k) => savedChecks[k]).length;
  const tileProgress = document.getElementById('tile-checklist-progress');
  if (tileProgress) tileProgress.textContent = `${doneTasks} of ${totalTasks} tasks done`;
  const bar = document.getElementById('tile-checklist-bar');
  if (bar && totalTasks > 0) {
    const pct = Math.round((doneTasks / totalTasks) * 100);
    setTimeout(() => { bar.style.width = `${pct}%`; }, 300);
  }
}

/**
 * Formats a snake_case key into readable Title Case with ampersands and capitalized AV.
 * @param {string} str
 * @returns {string}
 */
function formatTitle(str) {
  if (!str) return '';
  const text = str.replace(/_/g, ' & ');
  const capitalized = text.charAt(0).toUpperCase() + text.slice(1);
  return capitalized.replace(/\bAv\b/g, 'AV').replace(/\bav\b/g, 'AV');
}

/**
 * Renders interactive SVG donut chart and its color legend.
 * @param {object} plan
 * @param {string[]} sortedCats
 */
function renderDonutChart(plan, sortedCats) {
  const group = document.getElementById('donut-slices-group');
  const legend = document.getElementById('donut-legend');
  if (!group) return;
  group.textContent = '';
  if (legend) legend.textContent = '';

  const C = 2 * Math.PI * 85;
  let accumulatedPct = 0;

  sortedCats.forEach((cat) => {
    const pct = plan.budget_percentages[cat] || 0;
    const meta = getCategoryMeta(cat);
    const sliceLen = (pct / 100) * C;
    const offset = -((accumulatedPct / 100) * C);
    accumulatedPct += pct;

    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', '120');
    circle.setAttribute('cy', '120');
    circle.setAttribute('r', '85');
    circle.setAttribute('fill', 'transparent');
    circle.setAttribute('stroke', meta.color);
    circle.setAttribute('stroke-width', '26');
    circle.setAttribute('stroke-dasharray', `${sliceLen} ${C}`);
    circle.setAttribute('stroke-dashoffset', `${offset}`);
    circle.setAttribute('class', 'donut-slice');
    circle.setAttribute('data-category', cat);
    circle.setAttribute('tabindex', '0');
    circle.setAttribute('role', 'button');
    circle.setAttribute('aria-label', `${meta.title}: ${pct.toFixed(1)}%`);

    circle.addEventListener('mouseenter', () => highlightCategory(cat, true));
    circle.addEventListener('mouseleave', () => highlightCategory(cat, false));
    circle.addEventListener('focus', () => highlightCategory(cat, true));
    circle.addEventListener('blur', () => highlightCategory(cat, false));
    if (cat !== 'contingency') {
      circle.addEventListener('click', () => jumpToVendorCategory(cat));
    }

    group.appendChild(circle);

    if (legend) {
      const leg = el('button', null, 'legend-item flex items-center justify-between p-1.5 rounded-lg border border-transparent hover:border-[#E4DDE0] text-left w-full transition-colors cursor-pointer');
      leg.type = 'button';
      leg.setAttribute('data-category', cat);

      const left = el('div', null, 'flex items-center gap-1.5 truncate');
      const dot = el('span', null, 'w-2.5 h-2.5 rounded-full flex-shrink-0');
      dot.style.backgroundColor = meta.color;
      left.appendChild(dot);
      const name = el('span', meta.title, 'truncate text-[11px] font-semibold text-ink');
      left.appendChild(name);

      const right = el('span', `${pct.toFixed(1)}%`, 'text-[11px] font-bold text-muted flex-shrink-0 ml-1');
      leg.appendChild(left);
      leg.appendChild(right);

      leg.addEventListener('mouseenter', () => highlightCategory(cat, true));
      leg.addEventListener('mouseleave', () => highlightCategory(cat, false));
      if (cat !== 'contingency') {
        leg.addEventListener('click', () => jumpToVendorCategory(cat));
      }

      legend.appendChild(leg);
    }
  });

  resetDonutCenter(plan);
}

/**
 * Renders the category cards grid for the cards view.
 * @param {object} plan
 * @param {string[]} sortedCats
 */
function renderCategoryCards(plan, sortedCats) {
  const container = document.getElementById('budget-cards-grid');
  if (!container) return;
  container.textContent = '';

  const guests = plan.guests || 1;
  const isPriorityList = currentInputs && currentInputs.priorities ? currentInputs.priorities : [];

  sortedCats.forEach((cat) => {
    const meta = getCategoryMeta(cat);
    const amt = plan.budget[cat] || 0;
    const pct = plan.budget_percentages[cat] || 0;
    const perGuest = Math.round(amt / guests);
    const isPriority = isPriorityList.includes(cat);

    const card = el('div', null, 'expense-category-card utsav-card p-4 rounded-xl bg-white border border-[#E4DDE0] flex flex-col justify-between space-y-3 shadow-xs relative overflow-hidden');
    card.setAttribute('data-category', cat);

    // Top Row: Icon + Title + Share Badge
    const top = el('div', null, 'flex items-start justify-between gap-2');
    const titleWrap = el('div', null, 'flex items-center gap-2.5 min-w-0');
    const iconBox = el('div', meta.icon, `w-9 h-9 rounded-lg ${meta.lightBg} flex items-center justify-center text-lg flex-shrink-0 shadow-2xs`);
    titleWrap.appendChild(iconBox);

    const titleCol = el('div', null, 'min-w-0');
    const nameLine = el('div', null, 'flex items-center gap-1.5 flex-wrap');
    const catName = el('h4', meta.title, 'font-bold text-ink text-sm truncate');
    nameLine.appendChild(catName);
    if (isPriority) {
      const pBadge = el('span', '★ Priority', 'text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-accent/20 text-[#B45309]');
      nameLine.appendChild(pBadge);
    }
    titleCol.appendChild(nameLine);
    titleWrap.appendChild(titleCol);
    top.appendChild(titleWrap);

    const pctBadge = el('span', `${pct.toFixed(1)}%`, 'px-2 py-0.5 rounded-full text-xs font-bold bg-[#F7F4F5] border border-[#E4DDE0] text-ink flex-shrink-0');
    top.appendChild(pctBadge);
    card.appendChild(top);

    // Middle: Large Amount + Per-guest / Total subtext
    const mid = el('div', null, 'space-y-1');
    const displayedAmt = activeBudgetUnit === 'guest'
      ? `₹${perGuest.toLocaleString('en-IN')} / guest`
      : (plan.budget_display[cat] || `₹${Math.round(amt).toLocaleString('en-IN')}`);
    const amtEl = el('p', displayedAmt, 'text-xl font-serif font-bold text-ink tracking-tight');
    mid.appendChild(amtEl);

    const subText = activeBudgetUnit === 'guest'
      ? `Total: ${plan.budget_display[cat] || '₹' + Math.round(amt).toLocaleString('en-IN')}`
      : `₹${perGuest.toLocaleString('en-IN')} per guest`;
    const subEl = el('p', subText, 'text-xs text-muted');
    mid.appendChild(subEl);
    card.appendChild(mid);

    // Progress Bar
    const track = el('div', null, 'w-full h-2 bg-[#F7F4F5] rounded-full overflow-hidden');
    const fill = el('div', null, `h-full rounded-full animated-budget-bar bg-gradient-to-r ${meta.gradient}`);
    fill.style.width = '0%';
    track.appendChild(fill);
    card.appendChild(track);
    setTimeout(() => { fill.style.width = `${Math.min(100, pct)}%`; }, 150);

    // Subtitle note
    const desc = el('p', meta.subtitle, 'text-xs text-muted leading-relaxed line-clamp-2');
    card.appendChild(desc);

    // Bottom Action Button
    if (cat !== 'contingency') {
      const btn = el('button', null, 'w-full py-1.5 px-3 rounded-lg border border-[#E4DDE0] hover:border-primary text-xs font-semibold text-primary hover:bg-[#FCF4F6] transition-colors flex items-center justify-center gap-1.5 mt-1 cursor-pointer');
      btn.type = 'button';
      const btnSpan = el('span', 'View Vendor Tasks & Questions');
      const arrowSpan = el('span', '➔', 'text-[11px]');
      btn.appendChild(btnSpan);
      btn.appendChild(arrowSpan);
      btn.addEventListener('click', () => jumpToVendorCategory(cat));
      card.appendChild(btn);
    } else {
      const note = el('div', '🛡️ Recommended reserve for surprises', 'text-[11px] font-medium text-muted bg-[#F7F4F5] py-1.5 px-3 rounded-lg text-center');
      card.appendChild(note);
    }

    card.addEventListener('mouseenter', () => highlightCategory(cat, true));
    card.addEventListener('mouseleave', () => highlightCategory(cat, false));

    container.appendChild(card);
  });
}

/**
 * Renders complete executive budget panel: highlights, table, donut chart, bars, and cards.
 * @param {object} plan
 */
function renderBudgetPanel(plan) {
  renderPerGuestBox(plan.per_guest);
  const tbody = document.getElementById('budget-table-body');
  const bars = document.getElementById('budget-bars');
  if (!tbody || !bars) return;
  tbody.textContent = '';
  bars.textContent = '';

  const guests = plan.guests || 1;
  const priorities = currentInputs && currentInputs.priorities ? currentInputs.priorities : [];

  // 1. Identify Top Allocation and Contingency
  let topCat = null;
  let maxAmt = -1;
  Object.keys(plan.budget).forEach((cat) => {
    if (cat !== 'contingency' && plan.budget[cat] > maxAmt) {
      maxAmt = plan.budget[cat];
      topCat = cat;
    }
  });

  const topIcon = document.getElementById('top-cat-icon');
  const topName = document.getElementById('top-cat-name');
  const topAmt = document.getElementById('top-cat-amount');
  const topPct = document.getElementById('top-cat-pct-badge');
  if (topCat && topIcon && topName && topAmt && topPct) {
    const meta = getCategoryMeta(topCat);
    topIcon.textContent = meta.icon;
    topName.textContent = meta.title;
    topPct.textContent = `${(plan.budget_percentages[topCat] || 0).toFixed(1)}%`;
    const topPerGuest = Math.round(maxAmt / guests);
    topAmt.textContent = activeBudgetUnit === 'guest'
      ? `₹${topPerGuest.toLocaleString('en-IN')} / guest`
      : (plan.budget_display[topCat] || `₹${Math.round(maxAmt).toLocaleString('en-IN')}`);
  }

  // 2. Average per guest card
  const pgSpendVal = document.getElementById('per-guest-spend-val');
  const pgSpendSub = document.getElementById('per-guest-spend-sub');
  const spendTier = document.getElementById('spend-tier-badge');
  if (pgSpendVal && plan.per_guest) {
    const wholeRupees = Math.round(plan.per_guest.per_guest);
    pgSpendVal.textContent = `₹${wholeRupees.toLocaleString('en-IN')} / attendee`;
    if (spendTier) {
      spendTier.textContent = plan.per_guest.level.charAt(0).toUpperCase() + plan.per_guest.level.slice(1);
    }
    if (pgSpendSub) {
      pgSpendSub.textContent = `Across ${guests} guests`;
    }
  }

  // 3. Contingency reserve card
  const contAmt = document.getElementById('contingency-amount');
  if (contAmt && plan.budget.contingency !== undefined) {
    const cVal = plan.budget.contingency;
    const cPerGuest = Math.round(cVal / guests);
    contAmt.textContent = activeBudgetUnit === 'guest'
      ? `₹${cPerGuest.toLocaleString('en-IN')} / guest`
      : (plan.budget_display.contingency || `₹${Math.round(cVal).toLocaleString('en-IN')}`);
  }

  // 4. Sort categories list
  const cats = Object.keys(plan.budget);
  const countBadge = document.getElementById('budget-items-count');
  if (countBadge) countBadge.textContent = `${cats.length} Categories`;

  let sortedCats = [...cats];
  if (activeBudgetSort === 'amount-desc') {
    sortedCats.sort((a, b) => plan.budget[b] - plan.budget[a]);
  } else if (activeBudgetSort === 'amount-asc') {
    sortedCats.sort((a, b) => plan.budget[a] - plan.budget[b]);
  } else if (activeBudgetSort === 'name') {
    sortedCats.sort((a, b) => getCategoryMeta(a).title.localeCompare(getCategoryMeta(b).title));
  }

  // 5. Populate Table
  sortedCats.forEach((cat) => {
    const amtStr = plan.budget_display[cat];
    const pct = plan.budget_percentages[cat];
    const isPriority = priorities.includes(cat);
    tbody.appendChild(createBudgetRow(cat, pct, amtStr, plan, isPriority));
  });

  // Table Grand Total in footer
  const tableTotal = document.getElementById('budget-table-total');
  if (tableTotal) {
    if (activeBudgetUnit === 'guest') {
      const perGuestSum = Math.round(plan.total_budget / guests);
      tableTotal.textContent = `₹${perGuestSum.toLocaleString('en-IN')}`;
    } else {
      tableTotal.textContent = plan.total_display;
    }
  }

  // 6. Populate SVG Donut Chart
  renderDonutChart(plan, sortedCats);

  // 7. Populate Relative Weight Progress Bars
  sortedCats.forEach((cat, index) => {
    const pct = plan.budget_percentages[cat];
    bars.appendChild(createBarRow(cat, pct, index, plan));
  });

  // 8. Populate Category Cards Grid
  renderCategoryCards(plan, sortedCats);
}

/**
 * Creates table row for a budget category with icon, subtitle, and hover sync.
 * @param {string} cat
 * @param {number} pct
 * @param {string} amtStr
 * @param {object} plan
 * @param {boolean} isPriority
 * @returns {HTMLTableRowElement}
 */
function createBudgetRow(cat, pct, amtStr, plan, isPriority) {
  const tr = el('tr', null, 'budget-table-row hover:bg-panel transition-colors cursor-pointer border-b border-[#E4DDE0] last:border-0');
  tr.setAttribute('data-category', cat);

  const meta = getCategoryMeta(cat);
  const guests = (plan && plan.guests) ? plan.guests : 1;
  const rawAmt = (plan && plan.budget && plan.budget[cat]) ? plan.budget[cat] : 0;
  const perGuest = Math.round(rawAmt / guests);

  // Category column: Icon + Title + Subtitle + Priority badge
  const tdCat = el('td', null, 'py-3.5 px-4 font-semibold text-ink');
  const catWrap = el('div', null, 'flex items-center gap-3');
  const iconSpan = el('div', meta.icon, `w-8 h-8 rounded-lg ${meta.lightBg} flex items-center justify-center text-base flex-shrink-0 shadow-2xs`);
  catWrap.appendChild(iconSpan);

  const textCol = el('div', null, 'min-w-0');
  const titleRow = el('div', null, 'flex items-center gap-1.5 flex-wrap');
  const nameEl = el('span', meta.title, 'text-sm font-bold text-ink');
  titleRow.appendChild(nameEl);
  if (isPriority) {
    const pTag = el('span', 'Priority', 'text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-accent/20 text-[#B45309]');
    titleRow.appendChild(pTag);
  }
  textCol.appendChild(titleRow);

  const descEl = el('p', meta.subtitle, 'text-xs text-muted truncate max-w-xs');
  textCol.appendChild(descEl);
  catWrap.appendChild(textCol);
  tdCat.appendChild(catWrap);

  // Share column
  const tdPct = el('td', null, 'py-3.5 px-3 text-right');
  const pctTag = el('span', `${pct.toFixed(1)}%`, 'inline-block px-2 py-0.5 rounded-full text-xs font-bold bg-[#F7F4F5] border border-[#E4DDE0] text-muted');
  tdPct.appendChild(pctTag);

  // Amount column
  const displayedVal = activeBudgetUnit === 'guest'
    ? `₹${perGuest.toLocaleString('en-IN')}`
    : (amtStr || `₹${Math.round(rawAmt).toLocaleString('en-IN')}`);
  const tdAmt = el('td', displayedVal, 'py-3.5 px-4 text-right font-bold text-ink font-serif text-sm');

  // Scale column (mini progress bar + action link)
  const tdScale = el('td', null, 'py-3.5 px-4 text-center no-print');
  const miniTrack = el('div', null, 'w-full bg-[#F0EBEF] h-1.5 rounded-full overflow-hidden');
  const miniFill = el('div', null, `h-full rounded-full bg-gradient-to-r ${meta.gradient}`);
  miniFill.style.width = `${Math.min(100, pct)}%`;
  miniTrack.appendChild(miniFill);
  tdScale.appendChild(miniTrack);

  tr.appendChild(tdCat);
  tr.appendChild(tdPct);
  tr.appendChild(tdAmt);
  tr.appendChild(tdScale);

  tr.addEventListener('mouseenter', () => highlightCategory(cat, true));
  tr.addEventListener('mouseleave', () => highlightCategory(cat, false));
  if (cat !== 'contingency') {
    tr.addEventListener('click', () => jumpToVendorCategory(cat));
  }

  return tr;
}

/**
 * Creates horizontal progress bar representation with animated expansion and count-up.
 * @param {string} cat
 * @param {number} pct
 * @param {number} [index=0]
 * @param {object} [plan]
 * @returns {HTMLElement}
 */
function createBarRow(cat, pct, index = 0, plan) {
  const meta = getCategoryMeta(cat);
  const guests = (plan && plan.guests) ? plan.guests : 1;
  const rawAmt = (plan && plan.budget && plan.budget[cat]) ? plan.budget[cat] : 0;
  const perGuest = Math.round(rawAmt / guests);

  const wrap = el('div', null, 'space-y-1.5 transition-all cursor-pointer p-1 rounded-lg hover:bg-[#F7F4F5]');
  wrap.setAttribute('data-category', cat);

  const header = el('div', null, 'flex justify-between items-center text-xs');
  const nameWrap = el('div', null, 'flex items-center gap-1.5 truncate');
  const icon = el('span', meta.icon, 'text-sm');
  nameWrap.appendChild(icon);
  nameWrap.appendChild(el('span', meta.title, 'font-semibold text-ink truncate'));
  header.appendChild(nameWrap);

  const rightWrap = el('div', null, 'flex items-center gap-2 flex-shrink-0');
  const amtDisplay = activeBudgetUnit === 'guest'
    ? `₹${perGuest.toLocaleString('en-IN')}/guest`
    : (plan && plan.budget_display && plan.budget_display[cat] ? plan.budget_display[cat] : `₹${Math.round(rawAmt).toLocaleString('en-IN')}`);
  rightWrap.appendChild(el('span', amtDisplay, 'font-semibold text-ink text-[11px]'));

  const pctSpan = el('span', '0%', 'font-bold text-muted w-9 text-right');
  rightWrap.appendChild(pctSpan);
  header.appendChild(rightWrap);

  const track = el('div', null, 'w-full h-2.5 bg-panel rounded-full overflow-hidden');
  const colorClass = BAR_COLORS[cat] || `bg-gradient-to-r ${meta.gradient}`;
  const fill = el('div', null, `h-full rounded-full animated-budget-bar ${colorClass}`);
  fill.style.width = '0%';
  track.appendChild(fill);
  wrap.appendChild(header);
  wrap.appendChild(track);

  // Animated fill expansion & number count-up
  setTimeout(() => {
    fill.style.width = `${Math.min(100, pct)}%`;
    animateNumber(pctSpan, 0, Math.round(pct), 800, (v) => `${v}%`);
  }, 100 + index * 50);

  wrap.addEventListener('mouseenter', () => highlightCategory(cat, true));
  wrap.addEventListener('mouseleave', () => highlightCategory(cat, false));
  if (cat !== 'contingency') {
    wrap.addEventListener('click', () => jumpToVendorCategory(cat));
  }

  return wrap;
}

/**
 * Populates per-guest assessment details card with animated count-up.
 * @param {object} pg
 */
function renderPerGuestBox(pg) {
  if (!pg) return;
  const tier = document.getElementById('per-guest-tier');
  if (tier) tier.textContent = pg.level.charAt(0).toUpperCase() + pg.level.slice(1);
  const amt = document.getElementById('per-guest-amount');
  if (amt) {
    const wholeRupees = Math.round(pg.per_guest);
    animateNumber(amt, 0, wholeRupees, 1100, (v) => `₹${v.toLocaleString('en-IN')}`);
  }
  const adv = document.getElementById('per-guest-advice');
  if (adv) adv.textContent = pg.advice;
}

/**
 * Populates countdown timeline panel and highlights 'Do next' tasks.
 * @param {object} plan
 */
function renderTimelinePanel(plan) {
  const list = document.getElementById('timeline-list');
  const doNext = document.getElementById('do-next-list');
  if (!list || !doNext) return;
  list.textContent = '';
  doNext.textContent = '';
  let count = 0;
  plan.timeline.forEach((item) => {
    list.appendChild(createTimelineItem(item));
    if (count < 3 && item.status !== 'compressed') {
      doNext.appendChild(createDoNextItem(item));
      count += 1;
    }
  });
}

/**
 * Creates single milestone list entry with status badges.
 * @param {object} item
 * @returns {HTMLLIElement}
 */
function createTimelineItem(item) {
  const li = el('li', null, 'p-4 bg-white border border-panel-border rounded-lg space-y-1.5');
  const top = el('div', null, 'flex items-center justify-between flex-wrap gap-2');
  const dSpan = el('span', formatDate(item.due_date), 'text-xs font-semibold text-muted');
  const badge = createStatusBadge(item.status);
  top.appendChild(dSpan);
  top.appendChild(badge);
  const task = el('p', item.task, 'text-sm font-semibold text-ink');
  li.appendChild(top);
  li.appendChild(task);
  if (item.status === 'compressed' && item.original_due_date) {
    const orig = el('p', `Originally due ${formatDate(item.original_due_date)}`, 'text-xs text-status-compressed-text font-medium');
    li.appendChild(orig);
  }
  return li;
}

/**
 * Returns accessible badge element with WCAG compliant colors.
 * @param {string} status
 * @returns {HTMLElement}
 */
function createStatusBadge(status) {
  if (status === 'urgent') {
    return el('span', 'Urgent', 'text-xs font-semibold px-2 py-0.5 rounded bg-status-urgent-bg text-status-urgent-text');
  }
  if (status === 'compressed') {
    return el('span', 'Rescheduled', 'text-xs font-semibold px-2 py-0.5 rounded bg-status-compressed-bg text-status-compressed-text');
  }
  return el('span', 'Upcoming', 'text-xs font-semibold px-2 py-0.5 rounded bg-status-upcoming-bg text-status-upcoming-text');
}

/**
 * Creates lightweight item for the 'Do next' quick-action section.
 * @param {object} item
 * @returns {HTMLLIElement}
 */
function createDoNextItem(item) {
  const li = el('li', null, 'flex items-center justify-between text-sm py-1 border-b border-panel-border last:border-0');
  const tSpan = el('span', item.task, 'font-medium text-ink');
  const dSpan = el('span', formatDate(item.due_date), 'text-xs text-muted');
  li.appendChild(tSpan);
  li.appendChild(dSpan);
  return li;
}

/**
 * Renders interactive vendor category accordions with checklists and questions.
 * @param {object} plan
 */
function renderVendorsPanel(plan) {
  const accordion = document.getElementById('vendor-accordion');
  if (!accordion) return;
  accordion.textContent = '';
  const storageKey = `utsav.checks.${hashString(JSON.stringify(currentInputs))}`;
  const savedChecks = loadJSON(storageKey) || {};
  plan.vendor_checklist.forEach((v) => {
    accordion.appendChild(createVendorCategory(v, savedChecks, storageKey));
  });
  updateVendorProgress();
}

/**
 * Creates collapsible details block for a vendor category.
 * @param {object} v
 * @param {object} savedChecks
 * @param {string} storageKey
 * @returns {HTMLDetailsElement}
 */
function createVendorCategory(v, savedChecks, storageKey) {
  const details = el('details', null, 'border border-panel-border rounded-lg bg-white overflow-hidden');
  details.setAttribute('data-vendor-category', v.category);
  details.id = `vendor-cat-${v.category}`;
  const summary = el('summary', null, 'p-4 bg-panel cursor-pointer flex items-center justify-between text-sm font-semibold text-ink');
  summary.appendChild(el('span', formatTitle(v.category)));
  summary.appendChild(el('span', format_inr_client(v.amount), 'text-primary font-bold'));
  details.appendChild(summary);
  const content = el('div', null, 'p-4 space-y-4 border-t border-panel-border');
  content.appendChild(createTaskList(v.category, v.tasks, savedChecks, storageKey));
  content.appendChild(createQuestionList(v.questions));
  details.appendChild(content);
  return details;
}

/**
 * Formats rupee amount for display.
 * @param {number} amt
 * @returns {string}
 */
function format_inr_client(amt) {
  return `₹${Math.round(amt).toLocaleString('en-IN')}`;
}

/**
 * Creates interactive task checkbox list with persistence.
 * @param {string} category
 * @param {string[]} tasks
 * @param {object} savedChecks
 * @param {string} storageKey
 * @returns {HTMLElement}
 */
function createTaskList(category, tasks, savedChecks, storageKey) {
  const div = el('div', null, 'space-y-2');
  div.appendChild(el('h4', 'Key Tasks', 'text-xs uppercase font-semibold text-muted tracking-wider'));
  const ul = el('ul', null, 'space-y-2');
  tasks.forEach((task, idx) => {
    const taskId = `${category}_task_${idx}`;
    const li = el('li', null, 'flex items-start gap-2.5 text-sm');
    const cb = el('input', null, 'task-checkbox mt-1 h-4 w-4 rounded text-primary focus:ring-primary');
    cb.type = 'checkbox';
    cb.id = taskId;
    if (savedChecks[taskId]) cb.checked = true;
    cb.addEventListener('change', () => {
      savedChecks[taskId] = cb.checked;
      saveJSON(storageKey, savedChecks);
      updateVendorProgress();
    });
    const label = el('label', task, 'text-ink cursor-pointer');
    label.htmlFor = taskId;
    li.appendChild(cb);
    li.appendChild(label);
    ul.appendChild(li);
  });
  div.appendChild(ul);
  return div;
}

/**
 * Creates list of interview questions for vendor inquiry.
 * @param {string[]} questions
 * @returns {HTMLElement}
 */
function createQuestionList(questions) {
  const div = el('div', null, 'space-y-2 pt-2 border-t border-panel-border');
  div.appendChild(el('h4', 'Questions to ask the vendor', 'text-xs uppercase font-semibold text-muted tracking-wider'));
  const ul = el('ul', null, 'list-disc list-inside space-y-1 text-sm text-ink');
  questions.forEach((q) => {
    ul.appendChild(el('li', q));
  });
  div.appendChild(ul);
  return div;
}

/**
 * Updates completed tasks counter in the vendor panel header.
 */
function updateVendorProgress() {
  const cbs = Array.from(document.querySelectorAll('.task-checkbox'));
  const done = cbs.filter((cb) => cb.checked).length;
  const progress = document.getElementById('vendor-progress');
  if (progress) {
    progress.textContent = `${done} of ${cbs.length} tasks done`;
  }
  const tileProgress = document.getElementById('tile-checklist-progress');
  if (tileProgress) {
    tileProgress.textContent = `${done} of ${cbs.length} tasks done`;
  }
  const bar = document.getElementById('tile-checklist-bar');
  if (bar && cbs.length > 0) {
    const pct = Math.round((done / cbs.length) * 100);
    bar.style.width = `${pct}%`;
  }
}

/**
 * Configures Gemini Ideas generation trigger.
 */
function setupIdeasPanel() {
  const btn = document.getElementById('btn-get-ideas');
  if (btn) btn.addEventListener('click', handleGetIdeas);
}

/**
 * Requests and renders AI-generated celebration ideas.
 */
async function handleGetIdeas() {
  const btn = document.getElementById('btn-get-ideas');
  const loading = document.getElementById('ideas-loading');
  const results = document.getElementById('ideas-results');
  btn.disabled = true;
  loading.classList.remove('hidden');
  announce('Getting ideas for your celebration.');
  const res = await api('/api/ideas', currentInputs);
  loading.classList.add('hidden');
  if (!res.ok || !res.data.ideas) {
    btn.disabled = false;
    alert(describeError(res));
    return;
  }
  renderIdeas(res.data.ideas, res.data.disclaimer);
  results.classList.remove('hidden');
  btn.classList.add('hidden');
}

/**
 * Renders structured ideas into the Ideas panel.
 * @param {object} ideas
 * @param {string} disclaimer
 */
function renderIdeas(ideas, disclaimer) {
  const content = document.getElementById('ideas-content');
  const discEl = document.getElementById('ideas-disclaimer');
  const fbNote = document.getElementById('fallback-ideas-note');
  if (!content) return;
  content.textContent = '';
  if (ideas.source === 'fallback' && fbNote) fbNote.classList.remove('hidden');
  renderThemes(content, ideas.themes);
  renderIdeaSection(content, 'Menu ideas', ideas.menu_ideas);
  renderIdeaSection(content, 'Activities', ideas.activities);
  renderIdeaSection(content, 'Decor', ideas.decor_ideas);
  renderIdeaSection(content, 'Budget tips', ideas.budget_tips);
  renderIdeaSection(content, 'Things to watch out for', ideas.watch_outs);
  renderIdeaSection(content, 'Questions to ask family or the committee', ideas.questions_for_family_or_committee);
  if (discEl) discEl.textContent = disclaimer || '';
}

/**
 * Renders event themes list.
 * @param {HTMLElement} parent
 * @param {Array<{name: string, description: string}>} themes
 */
function renderThemes(parent, themes) {
  if (!themes || themes.length === 0) return;
  const sec = el('div', null, 'space-y-3');
  sec.appendChild(el('h3', 'Themes', 'text-base font-serif font-bold text-ink border-b border-panel-border pb-1'));
  const grid = el('div', null, 'grid grid-cols-1 sm:grid-cols-3 gap-3');
  themes.forEach((t) => {
    const card = el('div', null, 'p-4 bg-panel border border-panel-border rounded-lg space-y-1');
    card.appendChild(el('h4', t.name, 'text-sm font-semibold text-primary'));
    card.appendChild(el('p', t.description, 'text-xs text-muted leading-relaxed'));
    grid.appendChild(card);
  });
  sec.appendChild(grid);
  parent.appendChild(sec);
}

/**
 * Renders a generic bulleted idea section.
 * @param {HTMLElement} parent
 * @param {string} title
 * @param {string[]} items
 */
function renderIdeaSection(parent, title, items) {
  if (!items || items.length === 0) return;
  const sec = el('div', null, 'space-y-2');
  sec.appendChild(el('h3', title, 'text-base font-serif font-bold text-ink border-b border-panel-border pb-1'));
  const ul = el('ul', null, 'list-disc list-inside space-y-1 text-sm text-ink');
  items.forEach((item) => {
    ul.appendChild(el('li', item));
  });
  sec.appendChild(ul);
  parent.appendChild(sec);
}

/**
 * Configures the interactive Q&A Ask panel.
 */
function setupAskPanel() {
  const form = document.getElementById('ask-form');
  if (form) form.addEventListener('submit', handleAskSubmit);
  const btnGuests = document.getElementById('btn-ask-guests');
  if (btnGuests && currentInputs) {
    btnGuests.textContent = `Is my budget enough for ${currentInputs.guests} guests?`;
  }
  const exButtons = document.querySelectorAll('.btn-ask-ex');
  exButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const input = document.getElementById('ask-input');
      if (input) {
        input.value = btn.textContent;
        form.dispatchEvent(new Event('submit'));
      }
    });
  });
}

/**
 * Handles Q&A question submission.
 * @param {Event} e
 */
async function handleAskSubmit(e) {
  e.preventDefault();
  const input = document.getElementById('ask-input');
  const btn = document.getElementById('btn-ask-submit');
  const qText = input ? input.value.trim() : '';
  if (!qText) return;
  btn.disabled = true;
  btn.textContent = 'Thinking...';
  const payload = Object.assign({}, currentInputs, { question: qText });
  const res = await api('/api/ask', payload);
  btn.disabled = false;
  btn.textContent = 'Ask';
  if (input) input.value = '';
  if (!res.ok) {
    alert(describeError(res));
    return;
  }
  appendAnswer(qText, res.data.answer, res.data.disclaimer);
}

/**
 * Appends new Q&A interaction at the top of the conversation list.
 * @param {string} question
 * @param {string} answer
 * @param {string} disclaimer
 */
function appendAnswer(question, answer, disclaimer) {
  const list = document.getElementById('ask-answers-list');
  if (!list) return;
  const item = el('div', null, 'p-4 bg-white border border-panel-border rounded-lg space-y-2');
  const qEl = el('p', `Q: ${question}`, 'text-sm font-semibold text-ink');
  const aEl = el('p', answer, 'text-sm text-muted leading-relaxed');
  const disc = el('p', disclaimer, 'text-xs text-muted border-t border-panel-border pt-2');
  item.appendChild(qEl);
  item.appendChild(aEl);
  if (disclaimer) item.appendChild(disc);
  list.insertBefore(item, list.firstChild);
  announce('New answer received.');
}

document.addEventListener('DOMContentLoaded', initPlan);

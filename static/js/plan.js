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

const BAR_COLORS = {
  catering: 'bg-[#8B1E3F]',
  venue: 'bg-amber-600',
  decor: 'bg-blue-600',
  attire: 'bg-teal-600',
  photography: 'bg-purple-600',
  entertainment: 'bg-pink-600',
  invitations: 'bg-indigo-500',
  transport: 'bg-cyan-600',
  contingency: 'bg-slate-500',
};

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

  // Populate 4 Plain Summary Tiles
  // Tile 1: Days to go & urgency
  const tileDays = document.getElementById('tile-days-left');
  if (tileDays) tileDays.textContent = `${plan.days_until_event} days`;
  const tileUrg = document.getElementById('tile-urgency');
  if (tileUrg) {
    const urgText = plan.urgency.charAt(0).toUpperCase() + plan.urgency.slice(1);
    tileUrg.textContent = urgText;
  }

  // Tile 2: Total budget
  const tileBudget = document.getElementById('tile-total-budget');
  if (tileBudget) tileBudget.textContent = plan.total_display;

  // Tile 3: Per guest
  renderPerGuestBox(plan.per_guest);

  // Tile 4: Checklist progress initial count
  const storageKey = `utsav.checks.${hashString(JSON.stringify(currentInputs))}`;
  const savedChecks = loadJSON(storageKey) || {};
  const totalTasks = plan.vendor_checklist
    ? plan.vendor_checklist.reduce((acc, v) => acc + (v.tasks ? v.tasks.length : 0), 0)
    : 0;
  const doneTasks = Object.keys(savedChecks).filter((k) => savedChecks[k]).length;
  const tileProgress = document.getElementById('tile-checklist-progress');
  if (tileProgress) tileProgress.textContent = `${doneTasks} of ${totalTasks} tasks done`;
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
 * Renders budget table, visual bars, and per-guest box.
 * @param {object} plan
 */
function renderBudgetPanel(plan) {
  renderPerGuestBox(plan.per_guest);
  const tbody = document.getElementById('budget-table-body');
  const bars = document.getElementById('budget-bars');
  if (!tbody || !bars) return;
  tbody.textContent = '';
  bars.textContent = '';
  Object.keys(plan.budget).forEach((cat) => {
    const amtStr = plan.budget_display[cat];
    const pct = plan.budget_percentages[cat];
    tbody.appendChild(createBudgetRow(cat, pct, amtStr));
    bars.appendChild(createBarRow(cat, pct));
  });
}

/**
 * Creates table row for a budget category.
 * @param {string} cat
 * @param {number} pct
 * @param {string} amtStr
 * @returns {HTMLTableRowElement}
 */
function createBudgetRow(cat, pct, amtStr) {
  const tr = el('tr', null, 'hover:bg-panel transition-colors');
  const label = cat === 'contingency' ? 'Contingency (keep for surprises)' : formatTitle(cat);
  const tdCat = el('td', label, 'py-3 px-4 font-medium text-ink');
  const tdPct = el('td', `${pct.toFixed(2)}%`, 'py-3 px-4 text-right text-muted');
  const tdAmt = el('td', amtStr, 'py-3 px-4 text-right font-medium text-ink');
  tr.appendChild(tdCat);
  tr.appendChild(tdPct);
  tr.appendChild(tdAmt);
  return tr;
}

/**
 * Creates horizontal progress bar representation of category share.
 * @param {string} cat
 * @param {number} pct
 * @returns {HTMLElement}
 */
function createBarRow(cat, pct) {
  const wrap = el('div', null, 'space-y-1.5');
  const header = el('div', null, 'flex justify-between text-xs');
  header.appendChild(el('span', formatTitle(cat), 'font-medium text-ink'));
  header.appendChild(el('span', `${pct}%`, 'font-semibold text-muted'));
  const track = el('div', null, 'w-full h-2.5 bg-panel rounded-full overflow-hidden');
  const colorClass = BAR_COLORS[cat] || 'bg-primary';
  const fill = el('div', null, `h-full rounded-full ${colorClass}`);
  fill.style.width = `${Math.min(100, pct)}%`;
  track.appendChild(fill);
  wrap.appendChild(header);
  wrap.appendChild(track);
  return wrap;
}

/**
 * Populates per-guest assessment details card.
 * @param {object} pg
 */
function renderPerGuestBox(pg) {
  if (!pg) return;
  const tier = document.getElementById('per-guest-tier');
  if (tier) tier.textContent = pg.level.charAt(0).toUpperCase() + pg.level.slice(1);
  const amt = document.getElementById('per-guest-amount');
  if (amt) {
    const wholeRupees = Math.round(pg.per_guest).toLocaleString('en-IN');
    amt.textContent = `₹${wholeRupees}`;
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

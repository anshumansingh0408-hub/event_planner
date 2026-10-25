/**
 * Form logic for the Utsav Event Planner index page.
 * Manages dynamic category checkboxes, client validation, and prefilling.
 */

let apiOptions = null;

/**
 * Initializes form controls, event listeners, and default constraints.
 */
/**
 * Initializes form controls, event listeners, and default constraints.
 */
function initForm() {
  const dateInput = document.getElementById('event_date');
  if (dateInput) {
    const tmr = new Date();
    tmr.setDate(tmr.getDate() + 1);
    const yyyy = tmr.getFullYear();
    const mm = String(tmr.getMonth() + 1).padStart(2, '0');
    const dd = String(tmr.getDate()).padStart(2, '0');
    dateInput.min = `${yyyy}-${mm}-${dd}`;
  }
  setupCharacterCounter();
  loadApiOptions();
  setupEventListeners();
  setupFormEnhancements();
  prefillFromStorage();
  updateLivePreview();
}

/**
 * Sets up live character counting for the preferences textarea.
 */
function setupCharacterCounter() {
  const notes = document.getElementById('notes');
  const counter = document.getElementById('notes-counter');
  if (notes && counter) {
    notes.addEventListener('input', () => {
      counter.textContent = `${notes.value.length} / 500`;
    });
  }
}

/**
 * Connects quick presets, live calculator, date countdown, and suggestion tags.
 */
function setupFormEnhancements() {
  // 1. Budget preset chips
  document.querySelectorAll('.budget-preset-chip').forEach((btn) => {
    btn.addEventListener('click', () => {
      const bInput = document.getElementById('total_budget');
      if (bInput) {
        bInput.value = btn.getAttribute('data-amount');
        bInput.dispatchEvent(new Event('input', { bubbles: true }));
        updateLivePreview();
      }
    });
  });

  // 2. Guest preset chips
  document.querySelectorAll('.guest-preset-chip').forEach((btn) => {
    btn.addEventListener('click', () => {
      const gInput = document.getElementById('guests');
      if (gInput) {
        gInput.value = btn.getAttribute('data-count');
        gInput.dispatchEvent(new Event('input', { bubbles: true }));
        updateLivePreview();
      }
    });
  });

  // 3. Live calculation preview on budget & guests input
  const bInput = document.getElementById('total_budget');
  const gInput = document.getElementById('guests');
  if (bInput) bInput.addEventListener('input', updateLivePreview);
  if (gInput) gInput.addEventListener('input', updateLivePreview);

  // 4. Date countdown badge
  const dInput = document.getElementById('event_date');
  if (dInput) {
    dInput.addEventListener('change', updateDateCountdown);
    dInput.addEventListener('input', updateDateCountdown);
  }

  // 5. Suggestion tags for notes
  document.querySelectorAll('#suggestion-tags .suggestion-tag').forEach((btn) => {
    btn.addEventListener('click', () => {
      const tagText = btn.getAttribute('data-tag');
      const notes = document.getElementById('notes');
      const counter = document.getElementById('notes-counter');
      if (notes && tagText) {
        const current = notes.value.trim();
        if (!current.includes(tagText)) {
          notes.value = current ? `${current}, ${tagText}` : tagText;
          if (counter) counter.textContent = `${notes.value.length} / 500`;
          notes.focus();
        }
      }
    });
  });
}

/**
 * Calculates and updates dynamic per-guest benchmark preview live.
 */
function updateLivePreview() {
  const bVal = parseFloat(document.getElementById('total_budget')?.value || '0');
  const gVal = parseInt(document.getElementById('guests')?.value || '0', 10);
  const calcEl = document.getElementById('live-per-guest-calc');
  const badgeEl = document.getElementById('live-per-guest-badge');
  if (!calcEl || !badgeEl) return;

  if (bVal >= 5000 && gVal >= 1) {
    const perGuest = Math.round(bVal / gVal);
    calcEl.textContent = `₹${perGuest.toLocaleString('en-IN')}`;

    let tier = 'Modest Tier';
    let badgeClass = 'bg-amber-100 text-amber-800 border border-amber-300';
    if (perGuest >= 10000) {
      tier = 'Luxury Tier';
      badgeClass = 'bg-purple-100 text-purple-800 border border-purple-300';
    } else if (perGuest >= 5000) {
      tier = 'Generous Tier';
      badgeClass = 'bg-primary/15 text-primary border border-primary/30';
    } else if (perGuest >= 2500) {
      tier = 'Balanced Tier';
      badgeClass = 'bg-emerald-100 text-emerald-800 border border-emerald-300';
    }
    badgeEl.textContent = tier;
    badgeEl.className = `px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${badgeClass}`;
  } else {
    calcEl.textContent = '—';
    badgeEl.textContent = 'Enter budget & guests';
    badgeEl.className = 'px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-muted';
  }
}

/**
 * Computes calendar countdown days from selected date.
 */
function updateDateCountdown() {
  const dInput = document.getElementById('event_date');
  const badge = document.getElementById('date-countdown-badge');
  if (!dInput || !badge) return;
  if (!dInput.value) {
    badge.classList.add('hidden');
    return;
  }
  const chosen = new Date(dInput.value);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffTime = chosen - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  if (diffDays > 0) {
    badge.textContent = `🗓️ ${diffDays} days away`;
    badge.classList.remove('hidden');
  } else if (diffDays === 0) {
    badge.textContent = `🗓️ Today`;
    badge.classList.remove('hidden');
  } else {
    badge.classList.add('hidden');
  }
}

/**
 * Fetches event options and categories from the server.
 */
async function loadApiOptions() {
  try {
    const res = await fetch('/api/options');
    if (res.ok) {
      apiOptions = await res.json();
      const currentType = getSelectedEventType();
      renderPriorities(currentType);
    }
  } catch {
    apiOptions = null;
  }
}

/**
 * Retrieves the currently checked event type radio value.
 * @returns {string}
 */
function getSelectedEventType() {
  const checked = document.querySelector('input[name="event_type"]:checked');
  return checked ? checked.value : 'wedding';
}

/**
 * Renders category checkboxes for the selected event type with chip styling.
 * @param {string} eventType
 * @param {string[]} [preselected=[]]
 */
function renderPriorities(eventType, preselected = []) {
  const container = document.getElementById('priority-options');
  if (!container || !apiOptions || !apiOptions.categories) return;
  container.textContent = '';
  const cats = apiOptions.categories[eventType] || [];
  cats.forEach((cat) => {
    const label = el('label', null, 'priority-chip flex items-center justify-between p-3 bg-white border border-[#E4DDE0] rounded-xl text-sm text-ink cursor-pointer hover:border-primary transition-all has-[:checked]:border-primary has-[:checked]:bg-primary/[0.04] has-[:checked]:font-semibold shadow-xs');
    const span = el('span', formatCategoryLabel(cat));
    const cb = el('input', null, 'priority-checkbox rounded text-primary focus:ring-primary h-4 w-4 accent-primary');
    cb.type = 'checkbox';
    cb.name = 'priorities';
    cb.value = cat;
    if (preselected.includes(cat)) cb.checked = true;
    cb.addEventListener('change', updatePriorityStates);
    label.appendChild(span);
    label.appendChild(cb);
    container.appendChild(label);
  });
  updatePriorityStates();
}

/**
 * Formats snake_case category into Title Case label.
 * @param {string} cat
 * @returns {string}
 */
function formatCategoryLabel(cat) {
  return cat.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

/**
 * Enforces the maximum 2 priorities limit and announces to screen readers.
 */
function updatePriorityStates() {
  const cbs = Array.from(document.querySelectorAll('.priority-checkbox'));
  const checked = cbs.filter((cb) => cb.checked);
  const badge = document.getElementById('priorities-counter-badge');
  if (badge) {
    badge.textContent = `${checked.length} / 2 chosen`;
    if (checked.length === 2) {
      badge.className = 'text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary text-white transition-all';
    } else {
      badge.className = 'text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary transition-all';
    }
  }

  if (checked.length >= 2) {
    cbs.filter((cb) => !cb.checked).forEach((cb) => {
      cb.disabled = true;
      cb.closest('label')?.classList.add('opacity-45', 'cursor-not-allowed');
    });
    announce('Maximum of 2 selected.');
  } else {
    cbs.forEach((cb) => {
      cb.disabled = false;
      cb.closest('label')?.classList.remove('opacity-45', 'cursor-not-allowed');
    });
  }
}

/**
 * Attaches event listeners for radios, example button, and form submission.
 */
function setupEventListeners() {
  const radios = document.querySelectorAll('input[name="event_type"]');
  radios.forEach((r) => {
    r.addEventListener('change', () => {
      renderPriorities(r.value);
    });
  });

  const exBtn = document.getElementById('btn-example');
  if (exBtn) exBtn.addEventListener('click', fillExampleData);

  const form = document.getElementById('plan-form');
  if (form) form.addEventListener('submit', handleFormSubmit);
}

/**
 * Populates form with realistic example event parameters.
 */
function fillExampleData() {
  const wRadio = document.querySelector('input[name="event_type"][value="wedding"]');
  if (wRadio) {
    wRadio.checked = true;
    renderPriorities('wedding', ['venue', 'catering']);
  }
  document.getElementById('total_budget').value = '1500000';
  document.getElementById('guests').value = '200';
  const target = new Date();
  target.setDate(target.getDate() + 120);
  document.getElementById('event_date').value = target.toISOString().split('T')[0];
  document.getElementById('city').value = 'Jaipur';
  const notes = document.getElementById('notes');
  notes.value = 'Mostly vegetarian guests, outdoor evening ceremony';
  document.getElementById('notes-counter').textContent = `${notes.value.length} / 500`;
  updateLivePreview();
  updateDateCountdown();
  clearErrors();
  announce('Example data loaded.');
}

/**
 * Validates inputs locally and displays accessible error summary.
 * @param {object} data
 * @returns {Array<{fieldId: string, message: string}>}
 */
function validateClient(data) {
  const errors = [];
  if (!data.event_type) errors.push({ fieldId: 'event-type-radios', message: 'Choose an event type.' });
  if (!data.total_budget || isNaN(data.total_budget) || data.total_budget < 5000) {
    errors.push({ fieldId: 'total_budget', message: 'Total budget must be at least ₹5,000.' });
  }
  if (!data.guests || isNaN(data.guests) || data.guests < 1 || data.guests > 5000) {
    errors.push({ fieldId: 'guests', message: 'Guests must be between 1 and 5,000.' });
  }
  if (!data.event_date) {
    errors.push({ fieldId: 'event_date', message: 'Choose an event date.' });
  } else if (new Date(data.event_date) <= new Date()) {
    errors.push({ fieldId: 'event_date', message: 'Event date must be in the future.' });
  }
  if (data.priorities && data.priorities.length > 2) {
    errors.push({ fieldId: 'priority-options', message: 'Select at most 2 priority categories.' });
  }
  return errors;
}

/**
 * Displays errors in the summary box and marks fields invalid.
 * @param {Array<{fieldId?: string, message: string}>} errors
 */
function showErrors(errors) {
  clearErrors();
  const summary = document.getElementById('error-summary');
  const list = document.getElementById('error-list');
  if (!summary || !list) return;
  errors.forEach((err) => {
    const li = el('li');
    if (err.fieldId) {
      const a = el('a', err.message, 'underline hover:text-ink');
      a.href = `#${err.fieldId}`;
      a.addEventListener('click', (e) => {
        e.preventDefault();
        const target = document.getElementById(err.fieldId);
        if (target) target.focus();
      });
      li.appendChild(a);
      const input = document.getElementById(err.fieldId);
      if (input && input.tagName !== 'DIV') {
        input.setAttribute('aria-invalid', 'true');
      }
    } else {
      li.textContent = err.message;
    }
    list.appendChild(li);
  });
  summary.classList.remove('hidden');
  summary.focus();
  announce(`Submission failed with ${errors.length} errors.`);
}

/**
 * Clears error summary and aria-invalid flags.
 */
function clearErrors() {
  const summary = document.getElementById('error-summary');
  const list = document.getElementById('error-list');
  if (summary) summary.classList.add('hidden');
  if (list) list.textContent = '';
  document.querySelectorAll('[aria-invalid="true"]').forEach((elNode) => {
    elNode.removeAttribute('aria-invalid');
  });
}

/**
 * Handles form submission, validation, storage persistence, and navigation.
 * @param {Event} e
 */
async function handleFormSubmit(e) {
  e.preventDefault();
  clearErrors();
  const formData = collectFormData();
  const clientErrors = validateClient(formData);
  if (clientErrors.length > 0) {
    showErrors(clientErrors);
    return;
  }
  const submitBtn = document.getElementById('btn-submit');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Building your plan...';
  saveSession('utsav.inputs', formData);
  saveJSON('utsav.last', formData);
  window.location.href = '/plan';
}

/**
 * Gathers form inputs into structured object.
 * @returns {object}
 */
function collectFormData() {
  const type = getSelectedEventType();
  const budget = parseFloat(document.getElementById('total_budget').value) || 0;
  const guests = parseInt(document.getElementById('guests').value, 10) || 0;
  const dateVal = document.getElementById('event_date').value;
  const city = document.getElementById('city').value.trim();
  const notes = document.getElementById('notes').value.trim();
  const prio = Array.from(document.querySelectorAll('.priority-checkbox:checked')).map((cb) => cb.value);
  return {
    event_type: type,
    total_budget: budget,
    guests: guests,
    event_date: dateVal,
    city: city,
    notes: notes,
    priorities: prio
  };
}

/**
 * Pre-fills form with previously stored inputs if available.
 */
function prefillFromStorage() {
  const last = loadJSON('utsav.last');
  if (!last) return;
  const radio = document.querySelector(`input[name="event_type"][value="${last.event_type}"]`);
  if (radio) radio.checked = true;
  if (last.total_budget) document.getElementById('total_budget').value = String(last.total_budget);
  if (last.guests) document.getElementById('guests').value = String(last.guests);
  if (last.event_date && new Date(last.event_date) > new Date()) {
    document.getElementById('event_date').value = last.event_date;
  }
  if (last.city) document.getElementById('city').value = last.city;
  if (last.notes) {
    document.getElementById('notes').value = last.notes;
    document.getElementById('notes-counter').textContent = `${last.notes.length} / 500`;
  }
  if (last.event_type) {
    renderPriorities(last.event_type, last.priorities || []);
  }
}

document.addEventListener('DOMContentLoaded', initForm);

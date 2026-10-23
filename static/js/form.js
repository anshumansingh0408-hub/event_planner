/**
 * Form logic for the Utsav Event Planner index page.
 * Manages dynamic category checkboxes, client validation, and prefilling.
 */

let apiOptions = null;

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
  prefillFromStorage();
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
 * Renders category checkboxes for the selected event type.
 * @param {string} eventType
 * @param {string[]} [preselected=[]]
 */
function renderPriorities(eventType, preselected = []) {
  const container = document.getElementById('priority-options');
  if (!container || !apiOptions || !apiOptions.categories) return;
  container.textContent = '';
  const cats = apiOptions.categories[eventType] || [];
  cats.forEach((cat) => {
    const label = el('label', null, 'flex items-center gap-2.5 p-2.5 bg-white border border-panel-border rounded-md text-sm text-ink cursor-pointer hover:border-primary transition-colors');
    const cb = el('input', null, 'priority-checkbox rounded text-primary focus:ring-primary h-4 w-4');
    cb.type = 'checkbox';
    cb.name = 'priorities';
    cb.value = cat;
    if (preselected.includes(cat)) cb.checked = true;
    cb.addEventListener('change', updatePriorityStates);
    const span = el('span', formatCategoryLabel(cat));
    label.appendChild(cb);
    label.appendChild(span);
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
  if (checked.length >= 2) {
    cbs.filter((cb) => !cb.checked).forEach((cb) => {
      cb.disabled = true;
    });
    announce('Maximum of 2 selected.');
  } else {
    cbs.forEach((cb) => {
      cb.disabled = false;
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

/**
 * Controller for the Utsav landing page sample plan card.
 * Loads sample wedding plan from /api/plan or sessionStorage cache,
 * rendering the top 4 budget rows, per-guest metric, and next 2 milestones.
 */

document.addEventListener('DOMContentLoaded', () => {
  initLandingExample();
});

async function initLandingExample() {
  const card = document.getElementById('sample-plan-card');
  if (!card) return;

  const CACHE_KEY = 'utsav.landing_example_v1';
  let plan = null;

  try {
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (cached) {
      plan = JSON.parse(cached);
    }
  } catch (e) {
    // SessionStorage unavailable or parse error; ignore and fetch fresh
  }

  if (!plan) {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 120);
    const dateStr = targetDate.toISOString().split('T')[0];

    const payload = {
      event_type: 'wedding',
      total_budget: 1500000,
      guests: 200,
      event_date: dateStr,
      city: 'Delhi',
      priorities: []
    };

    try {
      const resp = await fetch('/api/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!resp.ok) {
        card.style.display = 'none';
        return;
      }
      const data = await resp.json();
      if (!data || !data.plan) {
        card.style.display = 'none';
        return;
      }
      plan = data.plan;
      try {
        sessionStorage.setItem(CACHE_KEY, JSON.stringify(plan));
      } catch (e) {
        // Quota exceeded or private browsing
      }
    } catch (err) {
      card.style.display = 'none';
      return;
    }
  }

  renderLandingSample(plan);
}

function renderLandingSample(plan) {
  // 1. Per-guest figure with its level in words
  const pgEl = document.getElementById('sample-per-guest');
  if (pgEl && plan.per_guest) {
    const wholeRupees = Math.round(plan.per_guest.per_guest).toLocaleString('en-IN');
    const levelStr = plan.per_guest.level.charAt(0).toUpperCase() + plan.per_guest.level.slice(1);
    pgEl.textContent = `₹${wholeRupees} (${levelStr})`;
  }

  // 2. First 4 budget rows
  const budgetRowsContainer = document.getElementById('sample-budget-rows');
  if (budgetRowsContainer && plan.budget) {
    budgetRowsContainer.textContent = '';
    const categories = Object.keys(plan.budget).slice(0, 4);
    categories.forEach((cat) => {
      const row = document.createElement('div');
      row.className = 'flex items-center justify-between py-1 border-b border-[#E4DDE0] last:border-0';

      const nameSpan = document.createElement('span');
      nameSpan.className = 'text-muted font-medium';
      nameSpan.textContent = formatCategoryTitle(cat);

      const valSpan = document.createElement('span');
      valSpan.className = 'font-semibold text-ink';
      const pct = plan.budget_percentages ? plan.budget_percentages[cat] : null;
      const amtStr = plan.budget_display ? plan.budget_display[cat] : `₹${Math.round(plan.budget[cat]).toLocaleString('en-IN')}`;
      valSpan.textContent = pct ? `${amtStr} (${pct}%)` : amtStr;

      row.appendChild(nameSpan);
      row.appendChild(valSpan);
      budgetRowsContainer.appendChild(row);
    });
  }

  // 3. Next 2 timeline tasks
  const timelineTasksContainer = document.getElementById('sample-timeline-tasks');
  if (timelineTasksContainer && plan.timeline) {
    timelineTasksContainer.textContent = '';
    const tasks = plan.timeline.slice(0, 2);
    tasks.forEach((item) => {
      const li = document.createElement('li');
      li.className = 'flex items-center justify-between text-muted py-0.5';

      const taskSpan = document.createElement('span');
      taskSpan.className = 'font-medium text-ink truncate pr-2';
      taskSpan.textContent = item.task;

      const dateSpan = document.createElement('span');
      dateSpan.className = 'text-[11px] shrink-0 text-muted';
      dateSpan.textContent = item.due_date;

      li.appendChild(taskSpan);
      li.appendChild(dateSpan);
      timelineTasksContainer.appendChild(li);
    });
  }
}

function formatCategoryTitle(str) {
  if (!str) return '';
  const text = str.replace(/_/g, ' & ');
  const capitalized = text.charAt(0).toUpperCase() + text.slice(1);
  return capitalized.replace(/\bAv\b/g, 'AV').replace(/\bav\b/g, 'AV');
}

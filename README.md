# Utsav - Celebration & Event Planner

Utsav is an intelligent event planning web application that plans weddings, birthdays, and community events across India. It generates a deterministic budget allocation across practical vendor categories, a countdown timeline with milestones scheduled relative to the event date, an actionable vendor negotiation checklist, creative AI-generated ideas tailored to guest count and regional preferences, and a plan-aware Q&A assistant grounded in the user's specific plan numbers.

Live demo: <ADD RAILWAY URL>

## Features

- **Budgets**: Category-level budget splits calibrated for weddings, birthdays, and community gatherings, supporting user priorities while safeguarding a contingency reserve.
- **Timelines**: Reverse-scheduled countdown milestones sorted chronologically, dynamically compressed for events occurring in under 90 days.
- **Vendor Checklists**: Actionable tasks and negotiation questions for each funded vendor category, sorted by financial allocation.
- **Personalised Ideas**: Creative themes, curated regional menu suggestions, decor inspiration, budget optimization tips, watch-outs, and family/committee questions.

## How It Works

- **Deterministic Core**: `planner.py` executes pure, deterministic calculations for budget allocations, milestone scheduling, and vendor checklists. All numerical business logic is thoroughly unit-tested and operates independently of external AI services.
- **Bounded AI Delegation**: Google Gemini 2.0 Flash receives a compact summary of the already computed plan. The AI only writes creative ideas and answers clarifying questions; it never modifies budgets, dates, or vendor figures.
- **Graceful Resilience**: If Gemini is unreachable, times out, or lacks an API key, Utsav returns structured, rule-based fallback ideas and polite guidance instead of failing or displaying an error.

## Architecture

```text
utsav/
├── app.py                  - Flask application, route handlers, middleware, rate limiting, and security headers.
├── planner.py              - Deterministic budget allocation, countdown timeline generation, and vendor checklists.
├── ai_client.py            - Google Gemini 2.0 Flash integration, prompt formatting, TTL response cache, and fallbacks.
├── utils.py                - Input validation, text sanitization, sliding window rate limiter, and currency formatting.
├── test_app.py             - Unit and integration tests for Flask routes, security headers, validation, and rate limits.
├── test_planner.py         - Unit tests for budget splits, timeline sorting, priority reallocation, and thresholds.
├── test_ai_client.py       - Unit tests for prompt construction, mocked Gemini API requests, caching, and fallbacks.
├── test_quality.py         - Quality gate AST tests enforcing docstrings, type annotations, return types, line limits.
├── requirements.txt        - Python production dependencies (Flask, Requests, Flask-Compress, Gunicorn).
├── pyproject.toml          - Tooling configuration for pytest and flake8.
├── Procfile                - Deployment command for web process running Gunicorn with 1 worker and 4 threads.
├── Dockerfile              - Container specification based on Python 3.10 slim for cloud deployments.
├── .dockerignore           - Build exclusions for Docker container images.
├── .gitignore              - Git ignored files and directories (.env, venv, caches).
├── README.md               - System architecture, setup instructions, security, and deployment documentation.
├── templates/
│   ├── base.html           - Base HTML5 shell with accessibility landmarks, skip link, and Tailwind configuration.
│   ├── index.html          - Event intake form with live validation, date constraints, and priority selection.
│   ├── plan.html           - Interactive plan viewer with budget cards, tabbed views, vendor lists, and AI Q&A.
│   └── about.html          - Background documentation detailing assumptions, planning heuristics, and constraints.
├── static/
│   ├── css/
│   │   └── app.css         - Custom styling, focus rings, accessibility utilities, and print stylesheets.
│   └── js/
│       ├── common.js       - Shared utility helpers, currency formatting, and notification toasts.
│       ├── form.js         - Client-side validation, error summary management, and event form submission.
│       └── plan.js         - Tab switching, checklist status toggling, print trigger, and AI ask integration.
└── scripts/
    └── smoke_test.py       - Standalone CLI smoke test verifying health, plan calculation, validation, and headers.
```

## Assumptions and Limits

- **Planning Assumptions**: Budget percentages and per-guest adequacy tiers are planning benchmarks designed to assist initial estimations; they are not certified financial quotes.
- **Market Variances**: Actual event costs vary widely by city, venue tier, vendor reputation, and peak wedding season dates.
- **Currency**: All financial figures and calculations are denominated in Indian Rupees (INR, ₹).
- **Language**: English-only interface and prompts.
- **Not a Replacement**: Utsav is a self-serve organizational aid and is not a substitute for a professional on-site wedding planner or event coordinator.

## Security

- **Server-Side API Key**: The Google Gemini API key resides solely on the server environment. It is never exposed in browser bundles, responses, or client payloads.
- **Header Authentication**: The API key is transmitted to Google via the `x-goog-api-key` HTTP header rather than query parameters, preventing URL leakage in proxy and server logs.
- **Comprehensive Input Validation**: Input parameters are validated server-side, reporting all errors simultaneously so users can fix issues at once.
- **Per-IP Sliding Window Rate Limiting**: Enforces 30 requests per minute for general endpoints and 10 requests per minute for AI endpoints per client IP.
- **Hardened Security Headers**: Responses enforce strict headers including `Content-Security-Policy`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, and `Permissions-Policy`.
- **Delimited Prompt Injection Guard**: Freeform user notes and questions are encapsulated in `<user_notes>` and `<user_question>` XML delimiters with explicit instructions to treat content strictly as untrusted data.
- **Safe DOM Rendering**: All dynamic data and AI responses are injected into the DOM exclusively using `textContent` and programmatic node construction, preventing cross-site scripting (XSS).
- **Request Size Limiting**: The server enforces a 64 KB maximum request payload limit to safeguard against resource exhaustion attacks.

## Efficiency

- **Cached Calculations**: Common budget allocation computations are cached using `functools.lru_cache`.
- **TTL Cache for AI Responses**: In-memory response caching with a 15-minute TTL and 200-entry ceiling prevents redundant external API calls.
- **Gzip Compression**: `Flask-Compress` compresses all responses larger than 500 bytes.
- **Static Asset Caching**: Static assets served under `/static/` include `Cache-Control: public, max-age=3600`.
- **Single AI Call**: AI generation triggers strictly on deliberate button clicks rather than on form keystrokes or background polling.
- **Compact Prompt Context**: Gemini receives an abbreviated plan summary (< 1,000 characters) containing only high-level parameters and immediate upcoming tasks rather than the complete timeline.

## Accessibility

- **Skip Link**: Top-of-page skip link enables screen reader and keyboard users to bypass navigation and jump straight to main content.
- **Labelled Form Controls**: All form inputs, selects, and textareas feature explicit `<label>` tags with matching `for` and `id` bindings.
- **Accessible Error Summary**: Validation errors populate an accessible error summary box with `role="alert"` and `tabindex="-1"` that automatically receives keyboard focus on submission failure.
- **WAI-ARIA Tablist Pattern**: The plan view implements the WAI-ARIA tabs design pattern with proper `role="tablist"`, `role="tab"`, `role="tabpanel"`, `aria-selected`, and arrow-key keyboard navigation.
- **Text and Colour Indicators**: Status badges and milestone urgency convey status through explicit textual labels alongside distinct colour accents.
- **Live Regions**: AI generation and asynchronous responses utilize `aria-live="polite"` to notify screen reader users when content arrives.
- **Print Stylesheet**: Clean `@media print` CSS rules hide navigation bars, tabs, and action buttons, formatting the plan neatly across standard paper.
- **Target Sizes**: Interactive buttons and form inputs meet minimum 44px by 44px touch targets.

## Testing

Run the test suite using pytest:

```bash
python -m pytest -v
```

The test suite covers:
- `test_app.py`: Route status codes, JSON validation, rate limiters, security headers, XSS prevention, static asset availability, error handlers, and absence of stack traces.
- `test_planner.py`: Budget percentage allocation sums, priority category weighting, contingency preservation, timeline chronological ordering, compressed milestone scheduling, and per-guest thresholds.
- `test_ai_client.py`: Mocked Gemini API invocations, API key header transmission, prompt delimiting, JSON parsing, fallback triggers, and thread-safe TTL cache invalidation.
- `test_quality.py`: AST-based quality gate verifying that every function and method across source files contains a docstring, typed parameters, a return type annotation, and does not exceed 30 lines, as well as confirming module docstrings and no hard-coded API credentials.

## Setup

1. Create and activate a Python virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate       # On Linux/macOS
   # or: venv\Scripts\activate   # On Windows
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Set the Gemini API key (optional; if omitted, Utsav runs using rule-based fallbacks):
   ```bash
   export GEMINI_API_KEY=your_key_here          # On Linux/macOS
   # or: set GEMINI_API_KEY=your_key_here       # On Windows CMD
   # or: $env:GEMINI_API_KEY="your_key_here"    # On Windows PowerShell
   ```

4. Run the development server:
   ```bash
   python app.py
   ```

5. Open [http://localhost:8080](http://localhost:8080) in your web browser.

## Deploy

### Procfile Worker Rationale
The application is configured to run with a single Gunicorn worker (`--workers 1 --threads 4`) because the sliding-window rate limiters and the AI response cache are maintained in-memory per-process. A single worker ensures consistent rate tracking and cache utilization without requiring an external Redis instance.

### Railway Deployment Steps

1. Push your repository to GitHub:
   ```bash
   git push origin main
   ```
2. In Railway, click **New Project** and select **Deploy from GitHub repo**.
3. Select the `utsav` repository.
4. Navigate to **Variables** and add:
   - `GEMINI_API_KEY`: Your Google Gemini API key.
5. In **Settings**, under **Networking**, click **Generate Domain** to assign a public URL.
6. Verify deployment by checking the public health check endpoint at `/healthz`.

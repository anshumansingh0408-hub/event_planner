"""Flask application for Utsav, a GenAI celebration and event planner.

Architecture:
- planner.py: Deterministic budget allocations, milestone timelines, and vendor checklists.
- ai_client.py: Gemini AI integration for creative ideas and grounded event Q&A.
- utils.py: Input validation, sanitization, sliding-window rate limiting, and INR formatting.

All API endpoints are stateless: every API call carries the plan inputs and the server
recomputes the plan on the fly.
"""

from datetime import date, datetime, timedelta, timezone
import os
import threading
import time
from typing import Any, Dict, List, Optional, Tuple

from flask import Flask, Response, g, jsonify, render_template, request
from flask_compress import Compress
from werkzeug.middleware.proxy_fix import ProxyFix

from ai_client import (
    AI_DISCLAIMER,
    CONFIG as AI_CONFIG,
    answer_question,
    generate_ideas,
)
from planner import (
    BUDGET_SPLITS,
    EVENT_TYPES,
    TIMELINE_TEMPLATES,
    generate_plan,
)
from utils import (
    check_rate_limit,
    format_inr,
    sanitize_text_input,
    validate_plan_inputs,
)

app = Flask(__name__)
app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1)
Compress(app)
app.config["MAX_CONTENT_LENGTH"] = 32 * 1024


def pretty_category(val: str) -> str:
    """Format snake_case category into title display format with ampersands.

    Args:
        val: Raw snake_case category identifier.

    Returns:
        Formatted human-readable category name.
    """
    if not val:
        return ""
    text = val.replace("_", " & ").capitalize()
    return text.replace("Av", "AV").replace("av", "AV")


app.jinja_env.filters["pretty_category"] = pretty_category

APP_CONFIG = {
    "RATE_LIMIT_GENERAL": 30,
    "RATE_LIMIT_AI": 10,
    "RATE_LIMIT_WINDOW": 60,
}
GENERAL_TRACKER: Dict[str, List[float]] = {}
AI_TRACKER: Dict[str, List[float]] = {}
_TRACKER_LOCK = threading.Lock()
IST = timezone(timedelta(hours=5, minutes=30))


def get_api_key() -> str:
    """Retrieve Gemini API key from server environment variables.

    Returns:
        Configured secret key string or empty string.
    """
    return os.environ.get("GEMINI_API_KEY", "")


def today_ist() -> date:
    """Get current calendar date in Indian Standard Time (IST).

    Returns:
        Current date object in IST timezone.
    """
    return datetime.now(IST).date()


def client_ip() -> str:
    """Extract client IP address from proxy headers or remote address.

    Returns:
        Client IP string or 'unknown'.
    """
    return request.remote_addr or "unknown"


def error_response(
    message: str, code: str, status: int, details: Optional[List[str]] = None
) -> Tuple[Response, int]:
    """Generate standardized JSON error response.

    Args:
        message: Human-readable error description.
        code: Machine-readable application error code.
        status: HTTP status code.
        details: Optional list of validation or context messages.

    Returns:
        Tuple of (Flask JSON response, status code).
    """
    payload = {"error": message, "code": code, "details": details or []}
    return jsonify(payload), status


def parse_body() -> Tuple[Optional[Dict[str, Any]], Optional[Tuple[Response, int]]]:
    """Parse and validate JSON request body.

    Returns:
        Tuple of (parsed_dict, None) on success or (None, error_tuple) on failure.
    """
    if not request.is_json:
        return None, error_response(
            "Request body must be a valid JSON object.", "BAD_REQUEST", 400
        )
    data = request.get_json(silent=True)
    if data is None or not isinstance(data, dict):
        return None, error_response(
            "Request body must be a valid JSON object.", "BAD_REQUEST", 400
        )
    return data, None


def rate_limited(tracker: Dict[str, List[float]], limit: int) -> bool:
    """Check if current client has exceeded route rate limits.

    Args:
        tracker: In-memory request timestamp store.
        limit: Max requests allowed in sliding window.

    Returns:
        True if request should be rejected, False otherwise.
    """
    with _TRACKER_LOCK:
        return not check_rate_limit(
            client_ip(), tracker, limit, APP_CONFIG["RATE_LIMIT_WINDOW"]
        )


def build_plan_or_error(
    data: Dict[str, Any],
) -> Tuple[
    Optional[Dict[str, Any]],
    Optional[Dict[str, Any]],
    Optional[Tuple[Response, int]],
]:
    """Validate user inputs and compute deterministic celebration plan.

    Args:
        data: Unsanitized input payload dictionary.

    Returns:
        Tuple of (plan, cleaned_inputs, None) or (None, None, error_tuple).
    """
    cleaned, errors = validate_plan_inputs(data, today_ist())
    if errors:
        return (
            None,
            None,
            error_response(
                "Please fix the highlighted fields.",
                "VALIDATION_ERROR",
                400,
                errors,
            ),
        )
    plan = generate_plan(cleaned, today_ist())
    return plan, cleaned, None


def serialize_plan(plan: Dict[str, Any], cleaned: Dict[str, Any]) -> Dict[str, Any]:
    """Prepare computed celebration plan for JSON transmission.

    Args:
        plan: Raw plan dictionary from planner.
        cleaned: Validated input parameters.

    Returns:
        Enhanced plan dictionary with formatted currency strings and ISO dates.
    """
    res = dict(plan)
    res["event_date"] = cleaned["event_date"].isoformat()
    res["total_display"] = format_inr(plan["total_budget"])
    res["budget_display"] = {
        cat: format_inr(amt) for cat, amt in plan["budget"].items()
    }
    return res


def about_context() -> Dict[str, Any]:
    """Build dynamic context dictionary for About page from planner constants.

    Returns:
        Dictionary containing budget splits, lead times, and categories.
    """
    lead_times = {
        etype: max(item[0] for item in TIMELINE_TEMPLATES[etype])
        for etype in EVENT_TYPES
    }
    all_cats: List[str] = []
    for etype in EVENT_TYPES:
        for cat in BUDGET_SPLITS[etype]:
            if cat not in all_cats:
                all_cats.append(cat)
    return {
        "splits": BUDGET_SPLITS,
        "lead_times": lead_times,
        "categories": all_cats,
    }


@app.route("/", methods=["GET"])
def index() -> str:
    """Render primary celebration landing page with lead times context."""
    ctx = about_context()
    return render_template("landing.html", lead_times=ctx["lead_times"])


@app.route("/create", methods=["GET"])
def create() -> str:
    """Render event intake questionnaire and configuration form."""
    return render_template("create.html")


@app.route("/plan", methods=["GET"])
def plan_page() -> str:
    """Render interactive celebration planner interface."""
    return render_template("plan.html")


@app.route("/about", methods=["GET"])
def about() -> str:
    """Render information and architecture overview page."""
    ctx = about_context()
    return render_template("about.html", **ctx)


@app.route("/healthz", methods=["GET"])
def healthz() -> Tuple[Response, int]:
    """Provide service liveness health check."""
    return jsonify({"status": "ok"}), 200


@app.route("/api/options", methods=["GET"])
def options() -> Tuple[Response, int]:
    """Expose event types, allowed categories, and input constraint bounds."""
    cats = {
        etype: [c for c in BUDGET_SPLITS[etype] if c != "contingency"]
        for etype in EVENT_TYPES
    }
    return (
        jsonify({
            "event_types": list(EVENT_TYPES),
            "categories": cats,
            "limits": {
                "min_budget": 5000,
                "max_guests": 5000,
                "max_notes_chars": 500,
                "max_question_chars": 300,
            },
        }),
        200,
    )


@app.route("/api/plan", methods=["POST"])
def create_plan() -> Tuple[Response, int]:
    """Generate deterministic budget, timeline, and vendor checklist.

    Request JSON keys:
        event_type (str): wedding, birthday, or community.
        total_budget (float): 5000 to 100000000.
        guests (int): 1 to 5000.
        event_date (str): YYYY-MM-DD.
        priorities (list[str]): up to 2 valid categories.
        city (str): optional location.
        notes (str): optional preferences.
    """
    if rate_limited(GENERAL_TRACKER, APP_CONFIG["RATE_LIMIT_GENERAL"]):
        return error_response(
            "Too many requests. Please wait a minute and try again.",
            "RATE_LIMITED",
            429,
        )
    data, err = parse_body()
    if err:
        return err
    plan, cleaned, err = build_plan_or_error(data)
    if err:
        return err
    return jsonify({"plan": serialize_plan(plan, cleaned)}), 200


@app.route("/api/ideas", methods=["POST"])
def generate_plan_ideas() -> Tuple[Response, int]:
    """Generate creative themes, catering ideas, and decor concepts via Gemini."""
    if rate_limited(AI_TRACKER, APP_CONFIG["RATE_LIMIT_AI"]):
        return error_response(
            "Too many requests. Please wait a minute and try again.",
            "RATE_LIMITED",
            429,
        )
    data, err = parse_body()
    if err:
        return err
    plan, cleaned, err = build_plan_or_error(data)
    if err:
        return err
    ideas = generate_ideas(plan, cleaned["city"], cleaned["notes"], get_api_key())
    return jsonify({"ideas": ideas, "disclaimer": AI_DISCLAIMER}), 200


@app.route("/api/ask", methods=["POST"])
def ask_question() -> Tuple[Response, int]:
    """Answer user questions grounded strictly in computed plan details."""
    if rate_limited(AI_TRACKER, APP_CONFIG["RATE_LIMIT_AI"]):
        return error_response(
            "Too many requests. Please wait a minute and try again.",
            "RATE_LIMITED",
            429,
        )
    data, err = parse_body()
    if err:
        return err
    raw_q = data.get("question", "")
    question = sanitize_text_input(str(raw_q), AI_CONFIG["MAX_QUESTION_CHARS"])
    if not question:
        return error_response("Question cannot be empty.", "EMPTY_QUESTION", 400)
    plan, cleaned, err = build_plan_or_error(data)
    if err:
        return err
    ans_res = answer_question(plan, question, get_api_key())
    return (
        jsonify({
            "answer": ans_res["answer"],
            "source": ans_res["source"],
            "disclaimer": AI_DISCLAIMER,
        }),
        200,
    )


@app.before_request
def before_request_hook() -> None:
    """Record request arrival timestamp for performance profiling."""
    g.start = time.time()


@app.after_request
def after_request_hook(response: Response) -> Response:
    """Apply performance metrics, cache restrictions, and security headers."""
    duration = time.time() - getattr(g, "start", time.time())
    response.headers["X-Response-Time"] = f"{duration:.3f}s"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "no-referrer"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com; "
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
        "font-src https://fonts.gstatic.com; "
        "img-src 'self' data:; "
        "connect-src 'self'; "
        "frame-ancestors 'none'; "
        "base-uri 'self'; "
        "form-action 'self'"
    )
    if request.path.startswith("/api/"):
        response.headers["Cache-Control"] = "no-store"
    elif request.path.startswith("/static/"):
        response.headers["Cache-Control"] = "public, max-age=3600"
    return response


@app.errorhandler(404)
def handle_404(err: Any) -> Tuple[Response, int]:
    """Handle resource not found."""
    return error_response("The requested resource was not found.", "NOT_FOUND", 404)


@app.errorhandler(405)
def handle_405(err: Any) -> Tuple[Response, int]:
    """Handle HTTP method not allowed."""
    return error_response(
        "The method is not allowed for this endpoint.", "METHOD_NOT_ALLOWED", 405
    )


@app.errorhandler(413)
def handle_413(err: Any) -> Tuple[Response, int]:
    """Handle payload exceeding maximum request size."""
    return error_response(
        "Request payload exceeds size limit.", "PAYLOAD_TOO_LARGE", 413
    )


@app.errorhandler(500)
def handle_500(err: Any) -> Tuple[Response, int]:
    """Handle unexpected internal server error."""
    return error_response(
        "An unexpected internal error occurred.", "SERVER_ERROR", 500
    )


if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=int(os.environ.get("PORT", 8080)),
        debug=False,
    )

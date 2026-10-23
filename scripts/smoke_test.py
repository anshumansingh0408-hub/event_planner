"""Smoke test script for verifying live deployment or local instance of Utsav.

Usage:
    python scripts/smoke_test.py https://your-url
"""

from datetime import date, timedelta
import sys
from typing import Any, Dict

import requests


def run_checks(base_url: str) -> bool:
    """Execute all smoke checks against target URL.

    Args:
        base_url: Base HTTP(S) URL of target application.

    Returns:
        True if all checks passed, False otherwise.
    """
    session = requests.Session()
    session.headers.update({"User-Agent": "Utsav-SmokeTest/1.0"})
    all_passed = True

    def record_result(check_name: str, passed: bool, extra: str = "") -> None:
        nonlocal all_passed
        status = "PASS" if passed else "FAIL"
        msg = f"[{status}] {check_name}"
        if extra:
            msg += f" - {extra}"
        print(msg)
        if not passed:
            all_passed = False

    # Check 1: GET /healthz is 200
    try:
        r = session.get(f"{base_url}/healthz", timeout=10)
        record_result("GET /healthz is 200", r.status_code == 200, f"Status: {r.status_code}")
    except Exception as exc:
        record_result("GET /healthz is 200", False, f"Error: {exc}")

    # Check 2: GET /api/options lists three event types
    try:
        r = session.get(f"{base_url}/api/options", timeout=10)
        data = r.json() if r.status_code == 200 else {}
        etypes = data.get("event_types", [])
        passed = r.status_code == 200 and len(etypes) == 3
        record_result(
            "GET /api/options lists three event types",
            passed,
            f"Types found: {etypes}",
        )
    except Exception as exc:
        record_result("GET /api/options lists three event types", False, f"Error: {exc}")

    # Check 3: POST /api/plan with valid wedding payload returns budget summing to total
    future_date = (date.today() + timedelta(days=120)).isoformat()
    wedding_payload: Dict[str, Any] = {
        "event_type": "wedding",
        "total_budget": 500000,
        "guests": 150,
        "event_date": future_date,
        "city": "Jaipur",
        "priorities": ["venue"],
    }
    try:
        r = session.post(f"{base_url}/api/plan", json=wedding_payload, timeout=10)
        data = r.json() if r.status_code == 200 else {}
        plan = data.get("plan", {})
        budget = plan.get("budget", {})
        budget_sum = sum(budget.values()) if budget else 0.0
        passed = (
            r.status_code == 200
            and abs(budget_sum - 500000.0) < 0.01
            and len(budget) > 0
        )
        record_result(
            "POST /api/plan with valid payload returns budget summing to total",
            passed,
            f"Budget sum: {budget_sum}",
        )
    except Exception as exc:
        record_result("POST /api/plan valid payload", False, f"Error: {exc}")

    # Check 4: POST /api/plan with a past date returns 400 with details
    past_payload: Dict[str, Any] = {
        "event_type": "wedding",
        "total_budget": 500000,
        "guests": 150,
        "event_date": "2020-01-01",
        "city": "Jaipur",
    }
    try:
        r = session.post(f"{base_url}/api/plan", json=past_payload, timeout=10)
        data = r.json() if r.status_code == 400 else {}
        details = data.get("details", [])
        passed = (
            r.status_code == 400
            and isinstance(details, list)
            and len(details) > 0
        )
        record_result(
            "POST /api/plan with past date returns 400 with details",
            passed,
            f"Status: {r.status_code}, details: {details}",
        )
    except Exception as exc:
        record_result("POST /api/plan past date", False, f"Error: {exc}")

    # Check 5: POST /api/ideas returns an 'ideas' object with 7 keys
    try:
        r = session.post(f"{base_url}/api/ideas", json=wedding_payload, timeout=30)
        data = r.json() if r.status_code == 200 else {}
        ideas = data.get("ideas", {})
        req_keys = {
            "themes",
            "menu_ideas",
            "activities",
            "decor_ideas",
            "budget_tips",
            "watch_outs",
            "questions_for_family_or_committee",
        }
        passed = r.status_code == 200 and req_keys.issubset(set(ideas.keys()))
        record_result(
            "POST /api/ideas returns ideas object with 7 keys",
            passed,
            f"Keys found: {len(ideas)}",
        )
    except Exception as exc:
        record_result("POST /api/ideas returns 7 keys", False, f"Error: {exc}")

    # Check 6: response headers include X-Response-Time and Content-Security-Policy
    try:
        r = session.get(f"{base_url}/healthz", timeout=10)
        has_time = "X-Response-Time" in r.headers
        has_csp = "Content-Security-Policy" in r.headers
        passed = has_time and has_csp
        record_result(
            "Response headers include X-Response-Time and Content-Security-Policy",
            passed,
            f"Time header: {has_time}, CSP header: {has_csp}",
        )
    except Exception as exc:
        record_result("Response headers check", False, f"Error: {exc}")

    return all_passed


def main() -> None:
    """CLI entrypoint for running smoke test."""
    url = sys.argv[1].rstrip("/") if len(sys.argv) > 1 else "http://localhost:8080"
    print(f"Running smoke test against: {url}\n")
    success = run_checks(url)
    if success:
        print("\nAll smoke tests PASSED successfully.")
        sys.exit(0)
    else:
        print("\nSmoke tests FAILED.")
        sys.exit(1)


if __name__ == "__main__":
    main()

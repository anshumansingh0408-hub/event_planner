"""Comprehensive test suite for the Utsav Flask web application.

Testing routes, security headers, rate limiting, and input validation with test_client.
"""

from datetime import timedelta
import os
import unittest
from unittest.mock import MagicMock, patch

from app import (
    AI_TRACKER,
    GENERAL_TRACKER,
    app,
    today_ist,
)


class TestApp(unittest.TestCase):
    """Test suite covering HTTP endpoints, security headers, validation, and rate limiting."""

    def setUp(self) -> None:
        """Configure test client and clear in-memory rate-limit trackers."""
        app.testing = True
        self.client = app.test_client()
        GENERAL_TRACKER.clear()
        AI_TRACKER.clear()

        # Dynamic valid event parameters based on IST today
        self.future_date = (today_ist() + timedelta(days=90)).isoformat()
        self.valid_wedding = {
            "event_type": "wedding",
            "total_budget": 500000.0,
            "guests": 150,
            "event_date": self.future_date,
            "priorities": ["venue", "catering"],
            "city": "Jaipur",
            "notes": "Royal palace theme",
        }

    def test_get_html_routes_and_healthz(self) -> None:
        """Verify GET /, /plan, /about, and /healthz all return HTTP 200."""
        for path in ("/", "/plan", "/about", "/healthz"):
            resp = self.client.get(path)
            self.assertEqual(resp.status_code, 200, f"Path {path} did not return 200")
        healthz_json = self.client.get("/healthz").get_json()
        self.assertEqual(healthz_json, {"status": "ok"})

    def test_get_api_options(self) -> None:
        """Verify GET /api/options returns 3 event types and categories without contingency."""
        resp = self.client.get("/api/options")
        self.assertEqual(resp.status_code, 200)
        data = resp.get_json()
        self.assertEqual(set(data["event_types"]), {"wedding", "birthday", "community"})
        for etype, cats in data["categories"].items():
            self.assertNotIn("contingency", cats, f"Contingency found in {etype}")
            self.assertGreater(len(cats), 0)
        limits = data["limits"]
        self.assertEqual(limits["min_budget"], 5000)
        self.assertEqual(limits["max_guests"], 5000)

    def test_post_api_plan_valid_wedding(self) -> None:
        """Verify valid POST /api/plan returns 200 with matching budget sum and timeline."""
        resp = self.client.post("/api/plan", json=self.valid_wedding)
        self.assertEqual(resp.status_code, 200)
        data = resp.get_json()["plan"]
        self.assertEqual(data["event_type"], "wedding")
        self.assertAlmostEqual(sum(data["budget"].values()), 500000.0, places=2)
        self.assertTrue(len(data["timeline"]) > 0)
        self.assertEqual(data["event_date"], self.future_date)
        self.assertIn("₹5,00,000", data["total_display"])

    def test_post_api_plan_invalid_json(self) -> None:
        """Verify malformed JSON body returns 400 BAD_REQUEST."""
        resp = self.client.post(
            "/api/plan", data="invalid json string", content_type="application/json"
        )
        self.assertEqual(resp.status_code, 400)
        self.assertEqual(resp.get_json()["code"], "BAD_REQUEST")

    def test_post_api_plan_json_array_body(self) -> None:
        """Verify JSON array body returns 400 BAD_REQUEST."""
        resp = self.client.post("/api/plan", json=[1, 2, 3])
        self.assertEqual(resp.status_code, 400)
        self.assertEqual(resp.get_json()["code"], "BAD_REQUEST")

    def test_post_api_plan_missing_fields(self) -> None:
        """Verify empty JSON body returns 400 VALIDATION_ERROR with multiple details."""
        resp = self.client.post("/api/plan", json={})
        self.assertEqual(resp.status_code, 400)
        err = resp.get_json()
        self.assertEqual(err["code"], "VALIDATION_ERROR")
        self.assertTrue(len(err["details"]) >= 3)

    def test_post_api_plan_past_date(self) -> None:
        """Verify past event date returns 400 VALIDATION_ERROR."""
        payload = dict(self.valid_wedding, event_date=(today_ist() - timedelta(days=2)).isoformat())
        resp = self.client.post("/api/plan", json=payload)
        self.assertEqual(resp.status_code, 400)
        self.assertTrue(any("after today" in d for d in resp.get_json()["details"]))

    def test_post_api_plan_zero_guests(self) -> None:
        """Verify 0 guests returns 400 VALIDATION_ERROR."""
        payload = dict(self.valid_wedding, guests=0)
        resp = self.client.post("/api/plan", json=payload)
        self.assertEqual(resp.status_code, 400)
        self.assertTrue(any("guests" in d.lower() for d in resp.get_json()["details"]))

    def test_post_api_plan_three_priorities(self) -> None:
        """Verify selecting 3 priorities returns 400 VALIDATION_ERROR."""
        payload = dict(self.valid_wedding, priorities=["venue", "catering", "decor"])
        resp = self.client.post("/api/plan", json=payload)
        self.assertEqual(resp.status_code, 400)
        self.assertTrue(any("at most 2" in d for d in resp.get_json()["details"]))

    def test_post_api_plan_negative_budget(self) -> None:
        """Verify negative budget returns 400 VALIDATION_ERROR."""
        payload = dict(self.valid_wedding, total_budget=-5000)
        resp = self.client.post("/api/plan", json=payload)
        self.assertEqual(resp.status_code, 400)
        self.assertTrue(any("budget" in d.lower() for d in resp.get_json()["details"]))

    def test_post_api_plan_oversized_body(self) -> None:
        """Verify payload exceeding MAX_CONTENT_LENGTH returns 413 PAYLOAD_TOO_LARGE."""
        oversized_str = "x" * (35 * 1024)
        resp = self.client.post("/api/plan", data=oversized_str, content_type="application/json")
        self.assertEqual(resp.status_code, 413)
        self.assertEqual(resp.get_json()["code"], "PAYLOAD_TOO_LARGE")

    def test_post_api_plan_priorities_affect_allocation(self) -> None:
        """Verify priorities adjust budget allocation relative to base split."""
        base_payload = dict(self.valid_wedding, priorities=[])
        prio_payload = dict(self.valid_wedding, priorities=["venue"])
        res_base = self.client.post("/api/plan", json=base_payload).get_json()["plan"]
        res_prio = self.client.post("/api/plan", json=prio_payload).get_json()["plan"]
        self.assertGreater(res_prio["budget"]["venue"], res_base["budget"]["venue"])

    @patch("app.generate_ideas")
    def test_post_api_ideas_success(self, mock_ideas: MagicMock) -> None:
        """Verify POST /api/ideas invokes generate_ideas with sanitized fields."""
        mock_ideas.return_value = {
            "themes": [{"name": "Royal", "description": "Desc"}],
            "menu_ideas": ["Chaat"],
            "activities": ["Dhol"],
            "decor_ideas": ["Lamps"],
            "budget_tips": ["Save on cake"],
            "watch_outs": ["Summer heat"],
            "questions_for_family_or_committee": ["RSVP?"],
            "source": "ai",
        }
        dirty_payload = dict(self.valid_wedding, city="  Jaipur  \x00", notes="\x08Palace\t")
        resp = self.client.post("/api/ideas", json=dirty_payload)
        self.assertEqual(resp.status_code, 200)
        data = resp.get_json()
        self.assertIn("ideas", data)
        self.assertIn("disclaimer", data)
        mock_ideas.assert_called_once()
        _, args, _ = mock_ideas.mock_calls[0]
        # Verify city and notes were sanitized
        self.assertEqual(args[1], "Jaipur")
        self.assertEqual(args[2], "Palace")

    @patch("app.generate_ideas")
    def test_post_api_ideas_works_without_gemini_key(self, mock_ideas: MagicMock) -> None:
        """Verify POST /api/ideas functions cleanly when GEMINI_API_KEY is absent."""
        mock_ideas.return_value = {"source": "fallback"}
        with patch.dict(os.environ, {}, clear=True):
            resp = self.client.post("/api/ideas", json=self.valid_wedding)
            self.assertEqual(resp.status_code, 200)
            mock_ideas.assert_called_once()
            # Verify passed api_key parameter is empty string
            self.assertEqual(mock_ideas.call_args[0][3], "")

    @patch("app.generate_ideas")
    def test_post_api_ideas_ignores_client_api_key(self, mock_ideas: MagicMock) -> None:
        """Verify client-supplied api_key in payload is ignored and never passed."""
        mock_ideas.return_value = {"source": "fallback"}
        payload = dict(self.valid_wedding, api_key="hacker_provided_secret_key")
        with patch.dict(os.environ, {"GEMINI_API_KEY": "valid_server_key"}):
            self.client.post("/api/ideas", json=payload)
            passed_key = mock_ideas.call_args[0][3]
            self.assertEqual(passed_key, "valid_server_key")
            self.assertNotEqual(passed_key, "hacker_provided_secret_key")

    def test_post_api_ask_empty_question(self) -> None:
        """Verify POST /api/ask rejects missing or empty question with 400 EMPTY_QUESTION."""
        payload = dict(self.valid_wedding, question="   \t\n  ")
        resp = self.client.post("/api/ask", json=payload)
        self.assertEqual(resp.status_code, 400)
        self.assertEqual(resp.get_json()["code"], "EMPTY_QUESTION")

    @patch("app.answer_question")
    def test_post_api_ask_valid_question(self, mock_answer: MagicMock) -> None:
        """Verify POST /api/ask returns answer, source, and disclaimer on valid query."""
        mock_answer.return_value = {"answer": "Your venue allocation is ₹1,25,000.", "source": "ai"}
        payload = dict(self.valid_wedding, question="How much for the venue?")
        resp = self.client.post("/api/ask", json=payload)
        self.assertEqual(resp.status_code, 200)
        data = resp.get_json()
        self.assertEqual(data["answer"], "Your venue allocation is ₹1,25,000.")
        self.assertEqual(data["source"], "ai")
        self.assertIn("disclaimer", data)

    @patch("app.answer_question")
    def test_post_api_ask_overlong_question_truncated(self, mock_answer: MagicMock) -> None:
        """Verify question exceeding 300 characters is cleanly truncated."""
        mock_answer.return_value = {"answer": "OK", "source": "ai"}
        long_q = "Can we invite more guests? " * 30
        payload = dict(self.valid_wedding, question=long_q)
        self.client.post("/api/ask", json=payload)
        passed_q = mock_answer.call_args[0][1]
        self.assertLessEqual(len(passed_q), 300)

    def test_security_headers_present(self) -> None:
        """Verify required security headers and CSP containing cdn.tailwindcss.com."""
        resp = self.client.get("/")
        headers = resp.headers
        self.assertEqual(headers.get("X-Frame-Options"), "DENY")
        self.assertEqual(headers.get("X-Content-Type-Options"), "nosniff")
        self.assertEqual(headers.get("Referrer-Policy"), "no-referrer")
        csp = headers.get("Content-Security-Policy", "")
        self.assertIn("https://cdn.tailwindcss.com", csp)
        self.assertIn("default-src 'self'", csp)

    def test_response_time_and_cache_control_headers(self) -> None:
        """Verify X-Response-Time is present and /api endpoints return Cache-Control: no-store."""
        resp_home = self.client.get("/")
        self.assertIn("X-Response-Time", resp_home.headers)

        resp_api = self.client.get("/api/options")
        self.assertIn("X-Response-Time", resp_api.headers)
        self.assertEqual(resp_api.headers.get("Cache-Control"), "no-store")

    @patch("app.generate_ideas")
    def test_rate_limits_ai_and_general(self, mock_ideas: MagicMock) -> None:
        """Verify the 11th AI request and 31st general request return 429 RATE_LIMITED."""
        mock_ideas.return_value = {"source": "fallback"}

        # AI Limit: 10 allowed, 11th blocked
        for i in range(10):
            r = self.client.post("/api/ideas", json=self.valid_wedding)
            self.assertEqual(r.status_code, 200, f"AI call {i+1} failed unexpectedly")
        r_ai_11 = self.client.post("/api/ideas", json=self.valid_wedding)
        self.assertEqual(r_ai_11.status_code, 429)
        self.assertEqual(r_ai_11.get_json()["code"], "RATE_LIMITED")

        # General Limit: 30 allowed, 31st blocked
        for i in range(30):
            r = self.client.post("/api/plan", json=self.valid_wedding)
            self.assertEqual(r.status_code, 200, f"Plan call {i+1} failed unexpectedly")
        r_gen_31 = self.client.post("/api/plan", json=self.valid_wedding)
        self.assertEqual(r_gen_31.status_code, 429)
        self.assertEqual(r_gen_31.get_json()["code"], "RATE_LIMITED")

    def test_unknown_route_404_and_method_not_allowed_405(self) -> None:
        """Verify unknown route returns JSON 404 and wrong HTTP method returns JSON 405."""
        r404 = self.client.get("/api/does_not_exist")
        self.assertEqual(r404.status_code, 404)
        self.assertEqual(r404.get_json()["code"], "NOT_FOUND")

        r405 = self.client.get("/api/plan")
        self.assertEqual(r405.status_code, 405)
        self.assertEqual(r405.get_json()["code"], "METHOD_NOT_ALLOWED")

    def test_error_responses_safe_no_traceback_or_secrets(self) -> None:
        """Verify error response bodies never leak Tracebacks or GEMINI_API_KEY tokens."""
        for path, method, payload in [
            ("/api/plan", "post", {"event_type": "bad"}),
            ("/api/unknown", "get", None),
            ("/api/plan", "get", None),
        ]:
            resp = self.client.open(path, method=method, json=payload)
            body = resp.get_data(as_text=True)
            self.assertNotIn("Traceback", body)

    def test_static_assets_return_200(self) -> None:
        """Verify all CSS and JavaScript static assets return HTTP 200."""
        for path in (
            "/static/css/app.css",
            "/static/js/common.js",
            "/static/js/form.js",
            "/static/js/plan.js",
        ):
            resp = self.client.get(path)
            self.assertEqual(resp.status_code, 200, f"Asset {path} did not return 200")

    def test_index_page_elements(self) -> None:
        """Verify GET / contains skip link, main landmark, event type fieldset, and Build button."""
        resp = self.client.get("/")
        self.assertEqual(resp.status_code, 200)
        html = resp.get_data(as_text=True)
        self.assertIn("Skip to main content", html)
        self.assertIn('id="main-content"', html)
        self.assertIn("Type of event", html)
        self.assertIn("Build my plan", html)

    def test_plan_page_tablist_and_tab_names(self) -> None:
        """Verify GET /plan contains role='tablist' and all five tab names."""
        resp = self.client.get("/plan")
        self.assertEqual(resp.status_code, 200)
        html = resp.get_data(as_text=True)
        self.assertIn('role="tablist"', html)
        for tab_name in ("Budget", "Timeline", "Vendors", "Ideas", "Ask"):
            self.assertIn(tab_name, html)

    def test_no_inner_html_in_templates_or_static_js(self) -> None:
        """Verify no template or static JavaScript file contains .innerHTML."""
        base_dir = os.path.dirname(os.path.abspath(__file__))
        checked_files = []
        tmpl_dir = os.path.join(base_dir, "templates")
        for fname in os.listdir(tmpl_dir):
            if fname.endswith(".html"):
                checked_files.append(os.path.join(tmpl_dir, fname))
        js_dir = os.path.join(base_dir, "static", "js")
        for fname in os.listdir(js_dir):
            if fname.endswith(".js"):
                checked_files.append(os.path.join(js_dir, fname))

        self.assertGreater(len(checked_files), 0)
        for fpath in checked_files:
            with open(fpath, "r", encoding="utf-8") as f:
                content = f.read()
                self.assertNotIn(
                    ".innerHTML",
                    content,
                    f"Forbidden .innerHTML found in {os.path.basename(fpath)}",
                )


if __name__ == "__main__":
    unittest.main()

"""Comprehensive unit tests for pure planning logic and utility functions.

Testing utsav planner without network or database dependencies.
"""

from datetime import date, timedelta
import unittest

from planner import (
    BUDGET_SPLITS,
    EVENT_TYPES,
    PER_GUEST_THRESHOLDS,
    allocate_budget,
    assess_per_guest_budget,
    build_timeline,
    build_vendor_checklist,
    compute_budget_split,
    generate_plan,
)
from utils import (
    check_rate_limit,
    format_inr,
    generate_cache_key,
    sanitize_text_input,
    validate_plan_inputs,
)


class TestPlanner(unittest.TestCase):
    """Test suite covering event planning algorithms and business rules."""

    def setUp(self) -> None:
        """Set up standard reference test dates."""
        self.today = date(2026, 10, 23)

    def test_budget_splits_sum_to_100(self) -> None:
        """Verify that every BUDGET_SPLITS baseline entry sums exactly to 100.0%."""
        for etype in EVENT_TYPES:
            split = BUDGET_SPLITS[etype]
            total = sum(split.values())
            self.assertAlmostEqual(
                total, 100.0, places=2,
                msg=f"Base budget split for {etype} does not sum to 100%."
            )

    def test_allocate_budget_awkward_totals(self) -> None:
        """Verify allocate_budget sums exactly to awkward totals across all event types."""
        awkward_totals = [100001.0, 99999.5, 75432.25, 5000.0]
        for etype in EVENT_TYPES:
            for total in awkward_totals:
                allocation = allocate_budget(total, etype)
                allocated_sum = sum(allocation.values())
                self.assertAlmostEqual(
                    allocated_sum, total, places=2,
                    msg=f"Allocation sum {allocated_sum} != {total} for {etype}."
                )

    def test_priorities_increase_share_and_preserve_contingency(self) -> None:
        """Verify priority category share increases and contingency remains untouched."""
        for etype in EVENT_TYPES:
            base_split = BUDGET_SPLITS[etype]
            base_contingency = base_split["contingency"]
            # Choose first non-contingency category as priority
            priority_cat = [c for c in base_split if c != "contingency"][0]
            base_pct = base_split[priority_cat]

            adjusted = compute_budget_split(etype, (priority_cat,))
            self.assertGreater(
                adjusted[priority_cat], base_pct,
                f"Priority {priority_cat} did not increase in {etype}."
            )
            self.assertAlmostEqual(
                adjusted["contingency"], base_contingency, places=2,
                msg=f"Contingency was modified for {etype}."
            )
            self.assertAlmostEqual(
                sum(adjusted.values()), 100.0, places=2,
                msg=f"Adjusted split for {etype} does not sum to 100."
            )

    def test_unknown_event_type_raises_value_error(self) -> None:
        """Verify unknown event type raises ValueError across planner functions."""
        with self.assertRaises(ValueError):
            compute_budget_split("gala")
        with self.assertRaises(ValueError):
            assess_per_guest_budget(50000.0, 50, "concert")
        with self.assertRaises(ValueError):
            build_timeline("festival", self.today + timedelta(days=30), self.today)

    def test_unknown_priority_raises_value_error(self) -> None:
        """Verify unknown priority category raises ValueError."""
        with self.assertRaises(ValueError):
            compute_budget_split("wedding", ("space_travel",))
        with self.assertRaises(ValueError):
            compute_budget_split("birthday", ("volunteers_logistics",))

    def test_per_guest_threshold_boundaries(self) -> None:
        """Verify per-guest financial level transitions at exact boundary thresholds."""
        for etype in EVENT_TYPES:
            low, high = PER_GUEST_THRESHOLDS[etype]

            # Below first threshold is tight
            tight_res = assess_per_guest_budget(low - 1.0, 1, etype)
            self.assertEqual(tight_res["level"], "tight")

            # At and above first threshold, below second is comfortable
            comf_res_low = assess_per_guest_budget(low, 1, etype)
            self.assertEqual(comf_res_low["level"], "comfortable")

            comf_res_high = assess_per_guest_budget(high - 0.01, 1, etype)
            self.assertEqual(comf_res_high["level"], "comfortable")

            # At and above second threshold is generous
            gen_res = assess_per_guest_budget(high, 1, etype)
            self.assertEqual(gen_res["level"], "generous")

    def test_timeline_400_days_all_upcoming(self) -> None:
        """Verify event 400 days away produces all upcoming milestones."""
        target_date = self.today + timedelta(days=400)
        for etype in EVENT_TYPES:
            timeline = build_timeline(etype, target_date, self.today)
            self.assertTrue(len(timeline) > 0)
            for item in timeline:
                self.assertEqual(
                    item["status"], "upcoming",
                    f"Milestone {item['task']} in {etype} was not upcoming: {item['status']}"
                )

    def test_timeline_20_days_compressed(self) -> None:
        """Verify event 20 days away produces compressed items with preserved order."""
        target_date = self.today + timedelta(days=20)
        timeline = build_timeline("wedding", target_date, self.today)
        compressed = [item for item in timeline if item["status"] == "compressed"]
        self.assertTrue(len(compressed) > 0, "No compressed items produced for 20-day timeline.")

        # Check none due before today and original_due_date recorded
        for item in compressed:
            item_date = date.fromisoformat(item["due_date"])
            self.assertGreaterEqual(item_date, self.today, f"{item['task']} due before today.")
            self.assertIn("original_due_date", item)
            orig_date = date.fromisoformat(item["original_due_date"])
            self.assertLess(orig_date, self.today)

        # Check relative order of compressed items is preserved
        orig_due_dates = [item["original_due_date"] for item in compressed]
        self.assertEqual(orig_due_dates, sorted(orig_due_dates))

    def test_timeline_past_or_today_raises_value_error(self) -> None:
        """Verify event date today or in the past raises ValueError."""
        with self.assertRaises(ValueError):
            build_timeline("wedding", self.today, self.today)
        with self.assertRaises(ValueError):
            build_timeline("birthday", self.today - timedelta(days=1), self.today)

    def test_timeline_sorted_by_due_date(self) -> None:
        """Verify milestones in timeline are strictly sorted by due date."""
        target_date = self.today + timedelta(days=45)
        for etype in EVENT_TYPES:
            timeline = build_timeline(etype, target_date, self.today)
            due_dates = [item["due_date"] for item in timeline]
            self.assertEqual(due_dates, sorted(due_dates))

    def test_vendor_checklist_excludes_contingency_and_sorts(self) -> None:
        """Verify vendor checklist excludes contingency and sorts by amount descending."""
        alloc = allocate_budget(100000.0, "wedding")
        checklist = build_vendor_checklist(alloc)
        categories = [item["category"] for item in checklist]
        self.assertNotIn("contingency", categories)
        amounts = [item["amount"] for item in checklist]
        self.assertEqual(amounts, sorted(amounts, reverse=True))

    def test_generate_plan_urgency_levels(self) -> None:
        """Verify generate_plan sets correct urgency labels at 120, 60, and 10 days."""
        base_inputs = {
            "event_type": "birthday",
            "total_budget": 50000.0,
            "guests": 30,
            "priorities": ["cake"],
            "city": "Mumbai",
            "notes": "Indoor party",
        }

        # 120 days: relaxed (> 90)
        base_inputs["event_date"] = self.today + timedelta(days=120)
        plan_120 = generate_plan(base_inputs, self.today)
        self.assertEqual(plan_120["urgency"], "relaxed")

        # 60 days: moderate (30-90)
        base_inputs["event_date"] = self.today + timedelta(days=60)
        plan_60 = generate_plan(base_inputs, self.today)
        self.assertEqual(plan_60["urgency"], "moderate")

        # 10 days: tight (< 30)
        base_inputs["event_date"] = self.today + timedelta(days=10)
        plan_10 = generate_plan(base_inputs, self.today)
        self.assertEqual(plan_10["urgency"], "tight")

    def test_compute_budget_split_caching(self) -> None:
        """Verify lru_cache returns identical results on repeat calls."""
        res1 = compute_budget_split("wedding", ("catering", "venue"))
        res2 = compute_budget_split("wedding", ("catering", "venue"))
        self.assertEqual(res1, res2)
        info = compute_budget_split.cache_info()
        self.assertGreater(info.hits, 0)

    def test_validation_collects_multiple_errors(self) -> None:
        """Verify validate_plan_inputs collects multiple errors simultaneously."""
        flawed_data = {
            "event_type": "invalid_type",
            "total_budget": -500,
            "guests": 0,
            "event_date": "2020-01-01",
            "priorities": ["a", "b", "c"],
        }
        _, errors = validate_plan_inputs(flawed_data, self.today)
        self.assertGreaterEqual(len(errors), 4)

    def test_validation_rejects_past_dates(self) -> None:
        """Verify validation rejects past or current dates."""
        data = {
            "event_type": "wedding",
            "total_budget": 100000,
            "guests": 100,
            "event_date": (self.today - timedelta(days=5)).isoformat(),
        }
        _, errors = validate_plan_inputs(data, self.today)
        self.assertTrue(any("after today" in e for e in errors))

    def test_validation_rejects_negative_budget(self) -> None:
        """Verify validation rejects negative or below-minimum budgets."""
        data = {
            "event_type": "birthday",
            "total_budget": -1000,
            "guests": 20,
            "event_date": (self.today + timedelta(days=30)).isoformat(),
        }
        _, errors = validate_plan_inputs(data, self.today)
        self.assertTrue(any("budget" in e.lower() for e in errors))

    def test_validation_rejects_zero_guests(self) -> None:
        """Verify validation rejects 0 or negative guest count."""
        data = {
            "event_type": "community",
            "total_budget": 50000,
            "guests": 0,
            "event_date": (self.today + timedelta(days=45)).isoformat(),
        }
        _, errors = validate_plan_inputs(data, self.today)
        self.assertTrue(any("guests" in e.lower() for e in errors))

    def test_validation_rejects_three_priorities(self) -> None:
        """Verify validation rejects more than 2 priority categories."""
        data = {
            "event_type": "wedding",
            "total_budget": 200000,
            "guests": 50,
            "event_date": (self.today + timedelta(days=60)).isoformat(),
            "priorities": ["venue", "catering", "decor"],
        }
        _, errors = validate_plan_inputs(data, self.today)
        self.assertTrue(any("at most 2" in e for e in errors))

    def test_format_inr(self) -> None:
        """Verify Indian currency formatting with rupee symbol."""
        self.assertEqual(format_inr(1250000), "₹12,50,000")
        self.assertEqual(format_inr(999), "₹999")
        self.assertEqual(format_inr(1000), "₹1,000")
        self.assertEqual(format_inr(0), "₹0")
        self.assertEqual(format_inr(10000000), "₹1,00,00,000")

    def test_check_rate_limit(self) -> None:
        """Verify sliding window rate limit blocks the 16th call when limit is 15."""
        tracker: dict[str, list[float]] = {}
        ip = "192.168.1.10"
        current_time = 1000.0

        for i in range(15):
            allowed = check_rate_limit(
                ip, tracker, max_requests=15, window_seconds=60, current_time=current_time
            )
            self.assertTrue(allowed, f"Call {i + 1} was unexpectedly blocked.")

        # 16th call within same window should be blocked
        blocked = check_rate_limit(
            ip, tracker, max_requests=15, window_seconds=60, current_time=current_time + 10
        )
        self.assertFalse(blocked, "16th call was not blocked.")

        # After window expires, should be allowed again
        allowed_after_window = check_rate_limit(
            ip, tracker, max_requests=15, window_seconds=60, current_time=current_time + 65
        )
        self.assertTrue(allowed_after_window, "Call after window elapsed was blocked.")

    def test_sanitize_text_input(self) -> None:
        """Verify sanitize_text_input strips control characters, trims, and truncates."""
        raw = "\x00\x08  Grand  Reception \x1f\t\n"
        sanitized = sanitize_text_input(raw, max_length=15)
        self.assertNotIn("\x00", sanitized)
        self.assertNotIn("\x08", sanitized)
        self.assertNotIn("\x1f", sanitized)
        self.assertTrue(len(sanitized) <= 15)

    def test_generate_cache_key(self) -> None:
        """Verify generate_cache_key returns consistent MD5 hex digest."""
        key1 = generate_cache_key("wedding", "500000", "delhi")
        key2 = generate_cache_key("wedding", "500000", "delhi")
        key3 = generate_cache_key("wedding", "600000", "delhi")
        self.assertEqual(key1, key2)
        self.assertNotEqual(key1, key3)
        self.assertEqual(len(key1), 32)


if __name__ == "__main__":
    unittest.main()

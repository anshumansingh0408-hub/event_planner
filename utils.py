"""Utility functions for input validation, sanitization, rate limiting, and formatting.

Provides helpers for the Utsav Event Planner web platform.
"""

from datetime import date
import hashlib
import time
from typing import Any, Dict, List, Optional, Tuple
import unicodedata

from planner import BUDGET_SPLITS, EVENT_TYPES


def sanitize_text_input(text: str, max_length: int) -> str:
    """Sanitize user text input by removing control characters, trimming, and truncating.

    Args:
        text: Raw input string to clean.
        max_length: Maximum allowed character length.

    Returns:
        Sanitized and truncated string.
    """
    if not text:
        return ""
    filtered = "".join(
        ch for ch in str(text)
        if ch != "\x00" and (unicodedata.category(ch)[0] != "C" or ch in ("\n", "\t"))
    )
    trimmed = filtered.strip()
    return trimmed[:max_length] if max_length > 0 else trimmed


def generate_cache_key(*parts: str) -> str:
    """Generate an MD5 hex digest from combined string parts.

    Args:
        *parts: Variable string components to include in cache key.

    Returns:
        32-character hexadecimal MD5 hash string.
    """
    joined = ":".join(str(p) for p in parts)
    return hashlib.md5(joined.encode("utf-8")).hexdigest()


def check_rate_limit(
    ip: str,
    tracker: Dict[str, List[float]],
    max_requests: int,
    window_seconds: int,
    current_time: Optional[float] = None,
) -> bool:
    """Sliding window rate limit checker mutating the tracker.

    Args:
        ip: Client IP address string.
        tracker: Dictionary mapping IP to list of request timestamps.
        max_requests: Maximum requests permitted within window.
        window_seconds: Sliding window interval in seconds.
        current_time: Optional explicit timestamp for testability.

    Returns:
        True if the request is permitted, False if rate limited.
    """
    now = time.time() if current_time is None else current_time
    cutoff = now - window_seconds
    timestamps = [t for t in tracker.get(ip, []) if t > cutoff]
    if len(timestamps) >= max_requests:
        tracker[ip] = timestamps
        return False
    timestamps.append(now)
    tracker[ip] = timestamps
    return True


def format_inr(amount: float) -> str:
    """Format numeric amount into Indian numbering system with Rupee symbol.

    Args:
        amount: Monetary figure in INR.

    Returns:
        Formatted string (e.g., '₹12,50,000' or '₹999').
    """
    prefix = "-₹" if amount < 0 else "₹"
    abs_amt = abs(amount)
    int_val = int(abs_amt)
    dec = f"{abs_amt - int_val:.2f}"[1:] if abs_amt != int_val else ""
    s = str(int_val)
    if len(s) <= 3:
        return f"{prefix}{s}{dec}"
    last3 = s[-3:]
    rest = s[:-3]
    chunks = []
    while len(rest) > 2:
        chunks.append(rest[-2:])
        rest = rest[:-2]
    if rest:
        chunks.append(rest)
    chunks.reverse()
    return f"{prefix}{','.join(chunks)},{last3}{dec}"


def _validate_budget(raw_budget: Any, errors: List[str]) -> Optional[float]:
    """Validate total budget number between 5,000 and 100,000,000 INR."""
    try:
        val = float(raw_budget)
        if not (5000.0 <= val <= 100_000_000.0):
            errors.append("Total budget must be between ₹5,000 and ₹10,00,00,000.")
            return None
        return val
    except (TypeError, ValueError):
        errors.append("Total budget must be a valid number.")
        return None


def _validate_guests(raw_guests: Any, errors: List[str]) -> Optional[int]:
    """Validate guest count as an integer from 1 to 5000."""
    try:
        if isinstance(raw_guests, float) and not raw_guests.is_integer():
            errors.append("Guests must be a whole integer between 1 and 5000.")
            return None
        val = int(raw_guests)
        if not (1 <= val <= 5000):
            errors.append("Guests must be an integer between 1 and 5000.")
            return None
        return val
    except (TypeError, ValueError):
        errors.append("Guests must be an integer between 1 and 5000.")
        return None


def _validate_date(raw_date: Any, today: date, errors: List[str]) -> Optional[date]:
    """Validate ISO event date strictly after today and within 5 years."""
    try:
        ed = raw_date if isinstance(raw_date, date) else date.fromisoformat(str(raw_date))
        max_d = date(today.year + 5, today.month, min(today.day, 28))
        if ed <= today:
            errors.append("Event date must be strictly after today.")
            return None
        if ed > max_d:
            errors.append("Event date must be within 5 years from today.")
            return None
        return ed
    except (TypeError, ValueError):
        errors.append("Event date must be a valid ISO format date (YYYY-MM-DD).")
        return None


def _validate_priorities(
    raw_p: Any, etype: Optional[str], errors: List[str]
) -> List[str]:
    """Validate priorities as a list of up to 2 valid categories."""
    if not isinstance(raw_p, (list, tuple)):
        errors.append("Priorities must be provided as a list.")
        return []
    if len(raw_p) > 2:
        errors.append("You may select at most 2 priority categories.")
    valid_cats = BUDGET_SPLITS.get(etype, {}) if etype in EVENT_TYPES else {}
    invalid = [p for p in raw_p if p not in valid_cats]
    if invalid:
        errors.append(f"Invalid priority categories: {', '.join(invalid)}.")
    return [p for p in raw_p if p in valid_cats]


def validate_plan_inputs(data: Dict[str, Any], today: date) -> Tuple[Dict[str, Any], List[str]]:
    """Validate and clean user input data for event planning.

    Args:
        data: Raw user inputs dictionary.
        today: Reference current date.

    Returns:
        Tuple of (cleaned_data_dict, list_of_error_strings).
    """
    errors: List[str] = []
    cleaned: Dict[str, Any] = {}
    etype = data.get("event_type")
    if not etype or etype not in EVENT_TYPES:
        errors.append("Invalid event type. Must be wedding, birthday, or community.")
    else:
        cleaned["event_type"] = etype
    cleaned["total_budget"] = _validate_budget(data.get("total_budget"), errors)
    cleaned["guests"] = _validate_guests(data.get("guests"), errors)
    cleaned["event_date"] = _validate_date(data.get("event_date"), today, errors)
    cleaned["priorities"] = _validate_priorities(data.get("priorities", []), etype, errors)
    cleaned["city"] = sanitize_text_input(str(data.get("city", "")), 60)
    cleaned["notes"] = sanitize_text_input(str(data.get("notes", "")), 500)
    return cleaned, errors

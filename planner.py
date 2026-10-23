"""Pure, stateless planning logic for weddings, birthdays and community events.

No Flask or network dependencies, so every function is unit-testable.
Amounts are expressed in Indian Rupees (INR).
"""

from datetime import date, timedelta
from functools import lru_cache
from typing import Any, Dict, List, Tuple

# Assumption: Standard event classifications based on typical Indian celebration models.
EVENT_TYPES: Tuple[str, ...] = ("wedding", "birthday", "community")

# Assumption: Empirical budget allocations reflecting average event spending in India.
BUDGET_SPLITS: Dict[str, Dict[str, float]] = {
    "wedding": {
        "venue": 25.0,
        "catering": 30.0,
        "decor": 10.0,
        "photography": 10.0,
        "attire_beauty": 8.0,
        "entertainment": 7.0,
        "invitations": 2.0,
        "transport": 3.0,
        "contingency": 5.0,
    },
    "birthday": {
        "venue": 20.0,
        "catering": 35.0,
        "decor": 12.0,
        "entertainment": 15.0,
        "cake": 6.0,
        "photography": 4.0,
        "invitations_favours": 3.0,
        "contingency": 5.0,
    },
    "community": {
        "venue": 20.0,
        "catering": 25.0,
        "decor_setup": 10.0,
        "sound_av": 15.0,
        "permits_insurance": 5.0,
        "publicity_printing": 8.0,
        "volunteers_logistics": 7.0,
        "entertainment": 5.0,
        "contingency": 5.0,
    },
}

# Assumption: Per-guest spend tiers in INR representing tight, comfortable, and generous standards.
PER_GUEST_THRESHOLDS: Dict[str, Tuple[float, float]] = {
    "wedding": (2000.0, 6000.0),
    "birthday": (500.0, 1500.0),
    "community": (200.0, 600.0),
}

# Assumption: Milestone countdowns derived from common Indian event coordination timelines.
TIMELINE_TEMPLATES: Dict[str, List[Tuple[int, str, str]]] = {
    "wedding": [
        (365, "Set budget and draft guest list", "planning"),
        (300, "Book venue", "venue"),
        (270, "Book photographer and caterer", "catering"),
        (180, "Shop for attire", "attire_beauty"),
        (120, "Finalise invitation design", "invitations"),
        (90, "Send invitations", "invitations"),
        (60, "Finalise menu and decor", "decor"),
        (30, "Confirm all vendors", "coordination"),
        (14, "Finalise headcount", "catering"),
        (7, "Make final payments", "finance"),
        (1, "Rehearsal and logistics check", "logistics"),
        (0, "Event day", "general"),
    ],
    "birthday": [
        (60, "Set budget and guest list", "planning"),
        (45, "Book venue", "venue"),
        (30, "Order cake and plan menu", "cake"),
        (21, "Send invitations", "invitations_favours"),
        (14, "Book entertainment", "entertainment"),
        (7, "Confirm vendors and headcount", "catering"),
        (3, "Buy decor and favours", "decor"),
        (1, "Final setup check", "logistics"),
        (0, "Event day", "general"),
    ],
    "community": [
        (90, "Define goals and apply for permits", "permits_insurance"),
        (60, "Book venue and sound/AV", "sound_av"),
        (45, "Recruit volunteers", "volunteers_logistics"),
        (30, "Start publicity", "publicity_printing"),
        (21, "Confirm vendors and insurance", "permits_insurance"),
        (14, "Volunteer briefing", "volunteers_logistics"),
        (7, "Final headcount and logistics", "volunteers_logistics"),
        (1, "Setup and safety check", "decor_setup"),
        (0, "Event day", "general"),
    ],
}

# Assumption: Standard vendor operational checklists and inquiry questions for Indian celebrations.
VENDOR_CHECKLISTS: Dict[str, Dict[str, List[str]]] = {
    "venue": {
        "tasks": [
            "Check hall seating capacity and floating guest space",
            "Verify power backup generator and AC tonnage",
            "Confirm parking spaces, valet service, and curfew timings",
        ],
        "questions": [
            "What is the maximum guest capacity and event curfew time?",
            "Do you provide uninterrupted power backup with generator fuel included?",
            "What is your deposit amount and cancellation refund policy?",
        ],
    },
    "catering": {
        "tasks": [
            "Schedule food tasting session with chef",
            "Finalise count of live counters and dessert stations",
            "Confirm service staff count and uniform presentation",
        ],
        "questions": [
            "What is the per-plate pricing for veg, jain, and non-veg/halal options?",
            "Are live cooking stalls, mineral water dispensers, and cutlery included?",
            "How many trained serving and cleaning staff are assigned per 50 guests?",
        ],
    },
    "decor": {
        "tasks": [
            "Select stage backdrop design, mandap/canopy, and floral theme",
            "Review ambient lighting layout, fairy lights, and trussing",
            "Confirm completion deadline for setup on event day",
        ],
        "questions": [
            "Are fresh seasonal flowers guaranteed in writing within the contract?",
            "Do you provide stage lighting, trussing, and carpet runners?",
            "What is the post-event teardown timeline and security deposit refund terms?",
        ],
    },
    "decor_setup": {
        "tasks": [
            "Plan seating arrangements, stage construction, and banners",
            "Inspect weather-proof shamianas and crowd barricades",
            "Confirm post-event ground cleanup and waste management",
        ],
        "questions": [
            "How many hours prior to event start will the setup be ready?",
            "Are water-resistant shamianas and durable flooring mats provided?",
            "Who handles municipal cleanup and waste segregation after the event?",
        ],
    },
    "photography": {
        "tasks": [
            "Draft shot list of traditional rituals and family portraits",
            "Coordinate drone clearance and candid team presence",
            "Agree on milestone delivery dates for teaser and final album",
        ],
        "questions": [
            "How many traditional and candid photographers will cover the event?",
            "What is the expected turnaround time for edited photos and videos?",
            "Do you bring backup camera bodies, lenses, and flash batteries?",
        ],
    },
    "attire_beauty": {
        "tasks": [
            "Schedule bridal/family outfit fitting trials and alterations",
            "Book bridal makeup artist and hairstylist with trial session",
            "Coordinate jewellery, accessories, and footwear matching",
        ],
        "questions": [
            "Does the bridal makeup package include trial sessions and saree draping?",
            "Can your styling crew travel directly to the venue suite on the day?",
            "What premium cosmetics brands are included in the bridal package?",
        ],
    },
    "entertainment": {
        "tasks": [
            "Finalise DJ song list, entry tracks, and emcee schedule",
            "Confirm sound check timings and stage monitor layout",
            "Arrange green room and hospitality for performing artists",
        ],
        "questions": [
            "Do you provide your own DJ console, sound mixer, and wireless mics?",
            "Can you accommodate regional language songs and spontaneous guest requests?",
            "What is the hourly overtime surcharge if celebrations run late?",
        ],
    },
    "invitations": {
        "tasks": [
            "Proofread event dates, venue location map, and RSVP details",
            "Order printed invitation cards with inserts and boxes",
            "Prepare mobile-friendly digital cards for WhatsApp distribution",
        ],
        "questions": [
            "What is the printing turnaround time and minimum card order quantity?",
            "Do you provide personalised calligraphy, wax seals, or boxed sweets?",
            "Can you deliver animated, high-resolution digital invitations for mobile?",
        ],
    },
    "invitations_favours": {
        "tasks": [
            "Choose curated return gifts for attendees and children",
            "Order custom thank-you tags, stickers, and favour bags",
            "Prepare animated digital invitations for broadcast",
        ],
        "questions": [
            "Are age-appropriate return gift hampers available for bulk ordering?",
            "What is the lead time for custom printed favour boxes and tags?",
            "Do you offer edible favours like artisanal chocolates or dry fruits?",
        ],
    },
    "transport": {
        "tasks": [
            "Book guest shuttle buses, cabs, and decorated bridal car",
            "Map airport/station pickup routes and schedules",
            "Assign volunteer coordinators for guest transit support",
        ],
        "questions": [
            "Are drivers experienced with local city routes and punctual timing?",
            "Is commercial passenger insurance up to date for all vehicles?",
            "What is the rate card for extra hours or unplanned detour kilometres?",
        ],
    },
    "cake": {
        "tasks": [
            "Select flavour combination, filling, and aesthetic design",
            "Confirm tier weights and delivery time window",
            "Arrange cake table, topper, knife, and sparkler candles",
        ],
        "questions": [
            "Can you guarantee 100% eggless preparation across all tiers?",
            "Is refrigerated transport to the venue guaranteed to prevent melting?",
            "What exact time on event day will the cake arrive and be assembled?",
        ],
    },
    "sound_av": {
        "tasks": [
            "Test wireless microphones, podium audio, and stage speakers",
            "Calibrate LED display screens and presentation laptops",
            "Ensure backup battery and dedicated power feed for audio mixer",
        ],
        "questions": [
            "Do you provide a certified sound technician on-site during the event?",
            "Are sound output levels compliant with local municipal acoustic limits?",
            "What backup hardware is in place if an amplifier or mixer fails?",
        ],
    },
    "permits_insurance": {
        "tasks": [
            "Apply for police permission, fire NOC, and loudspeaker license",
            "Procure public performance licenses (PPL/IPRS) if applicable",
            "Secure event cancellation and public liability insurance",
        ],
        "questions": [
            "What documents are required from organisers for permit approvals?",
            "Does the liability policy cover accidental damage or attendee injury?",
            "What are the specific guidelines regarding emergency exits and fire safety?",
        ],
    },
    "publicity_printing": {
        "tasks": [
            "Design event banners, welcome standees, and schedule flyers",
            "Print delegate badges, meal passes, and informational pamphlets",
            "Distribute announcements to local community circles and groups",
        ],
        "questions": [
            "What is the cut-off date for final artwork submission?",
            "Do you offer eco-friendly cloth or recyclable banner printing?",
            "Can you provide spare badge printing equipment at the registration desk?",
        ],
    },
    "volunteers_logistics": {
        "tasks": [
            "Conduct briefing on roles, schedules, and emergency protocols",
            "Distribute identification badges, walkie-talkies, and meal passes",
            "Set up registration counter, information desk, and first-aid station",
        ],
        "questions": [
            "How many functional walkie-talkie sets and channels will be assigned?",
            "What is the standard escalation protocol for medical or security issues?",
            "Are first-aid supplies and doctor-on-call contacts clearly identified?",
        ],
    },
    "contingency": {
        "tasks": [
            "Maintain emergency fund in liquid cash and UPI ready for immediate use",
            "List backup vendors for catering, sound, transport, and power",
            "Establish single-point authorization for emergency payments",
        ],
        "questions": [
            "Can unspent emergency funds be transferred back without deductions?",
            "Are urgent payments supported via immediate digital payment channels?",
            "Who is designated as the sole authorising coordinator for reserve funds?",
        ],
    },
}


def _adjust_priorities(base: Dict[str, float], p_set: set) -> Dict[str, float]:
    """Helper to distribute priority boosts and renormalise percentages."""
    non_p = [c for c in base if c not in p_set and c != "contingency"]
    non_p_sum = sum(base[c] for c in non_p)
    boost = 5.0 * len(p_set)
    result = {}
    for c, val in base.items():
        if c in p_set:
            result[c] = val + 5.0
        elif c in non_p:
            result[c] = val - boost * (val / non_p_sum)
        else:
            result[c] = val
    result = {c: round(v, 2) for c, v in result.items()}
    drift = round(100.0 - sum(result.values()), 2)
    largest = max(result, key=lambda k: result[k])
    result[largest] = round(result[largest] + drift, 2)
    return result


@lru_cache(maxsize=128)
def compute_budget_split(
    event_type: str, priorities: Tuple[str, ...] = ()
) -> Dict[str, float]:
    """Calculate budget split percentages adjusted for priority categories.

    Args:
        event_type: Type of event ('wedding', 'birthday', 'community').
        priorities: Tuple of category names to boost by 5% each.

    Returns:
        Dict mapping each category to its adjusted percentage.

    Raises:
        ValueError: If event_type or any priority category is unknown.
    """
    if event_type not in EVENT_TYPES:
        raise ValueError(f"Unknown event type: {event_type}")
    base = BUDGET_SPLITS[event_type]
    p_set = set(priorities)
    for p in p_set:
        if p not in base:
            raise ValueError(f"Unknown priority: {p}")
    return _adjust_priorities(base, p_set) if p_set else dict(base)


def allocate_budget(
    total_budget: float, event_type: str, priorities: Tuple[str, ...] = ()
) -> Dict[str, float]:
    """Convert budget percentages into rounded rupee amounts.

    Args:
        total_budget: Total spending amount in INR.
        event_type: Type of event ('wedding', 'birthday', 'community').
        priorities: Tuple of priority categories to boost.

    Returns:
        Dict mapping each category to whole-rupee INR amounts summing to total_budget.
    """
    pcts = compute_budget_split(event_type, priorities)
    allocated = {c: float(round(p * total_budget / 100.0)) for c, p in pcts.items()}
    drift = total_budget - sum(allocated.values())
    largest = max(pcts, key=lambda k: pcts[k])
    allocated[largest] = round(allocated[largest] + drift, 2)
    return allocated


def _get_tier_advice(per_guest: float, low: float, high: float) -> Tuple[str, str]:
    """Determine tier level and tailored advice based on per-guest amount."""
    if per_guest < low:
        return (
            "tight",
            "Consider reducing guest count or simplifying catering to stay within budget.",
        )
    if per_guest < high:
        return (
            "comfortable",
            "Your budget allows balanced spending across venue, catering, and decor.",
        )
    return (
        "generous",
        "Ample budget to accommodate premium venues, luxury decor, and lavish hospitality.",
    )


def assess_per_guest_budget(
    total_budget: float, guests: int, event_type: str
) -> Dict[str, Any]:
    """Assess budget adequacy per guest against event tier thresholds.

    Args:
        total_budget: Total planned budget in INR.
        guests: Expected number of attendees.
        event_type: Type of celebration ('wedding', 'birthday', 'community').

    Returns:
        Dict containing per_guest amount, level category, and tailored advice.

    Raises:
        ValueError: If guests <= 0 or event_type is invalid.
    """
    if guests <= 0:
        raise ValueError("Guests count must be greater than zero.")
    if event_type not in EVENT_TYPES:
        raise ValueError(f"Unknown event type: {event_type}")
    per_guest = round(total_budget / guests, 2)
    low, high = PER_GUEST_THRESHOLDS[event_type]
    level, advice = _get_tier_advice(per_guest, low, high)
    return {"per_guest": per_guest, "level": level, "advice": advice}


def _reschedule_compressed(
    compressed: List[Tuple[int, str, str, date]],
    today: date,
    rem_days: int,
    event_date: date,
) -> List[Dict[str, Any]]:
    """Helper to reschedule overdue milestones across the first 40% of remaining days."""
    if not compressed:
        return []
    span = max(1, int(rem_days * 0.40))
    step = max(1, span // len(compressed))
    results = []
    for i, (_, task, cat, raw_due) in enumerate(compressed):
        new_due = today + timedelta(days=i * step)
        results.append({
            "task": task,
            "category": cat,
            "due_date": new_due.isoformat(),
            "days_before": (event_date - new_due).days,
            "status": "compressed",
            "original_due_date": raw_due.isoformat(),
        })
    return results


def _classify_milestones(
    event_type: str, event_date: date, today: date
) -> Tuple[List[Dict[str, Any]], List[Tuple[int, str, str, date]]]:
    """Helper to classify template milestones into active and overdue collections."""
    active: List[Dict[str, Any]] = []
    compressed: List[Tuple[int, str, str, date]] = []
    for days_before, task, cat in TIMELINE_TEMPLATES[event_type]:
        raw_due = event_date - timedelta(days=days_before)
        if raw_due < today:
            compressed.append((days_before, task, cat, raw_due))
        else:
            status = "upcoming" if raw_due >= today + timedelta(days=14) else "urgent"
            active.append({
                "task": task, "category": cat, "due_date": raw_due.isoformat(),
                "days_before": days_before, "status": status,
            })
    return active, compressed


def build_timeline(event_type: str, event_date: date, today: date) -> List[Dict[str, Any]]:
    """Generate a milestone countdown timeline with compressed rescheduling if needed.

    Args:
        event_type: Type of event ('wedding', 'birthday', 'community').
        event_date: Target celebration date.
        today: Reference current date.

    Returns:
        List of milestone dictionaries sorted chronologically by due date.

    Raises:
        ValueError: If event_date is today or in the past, or if event_type is invalid.
    """
    if event_date <= today:
        raise ValueError("Event date must be strictly in the future.")
    if event_type not in EVENT_TYPES:
        raise ValueError(f"Unknown event type: {event_type}")
    active, compressed = _classify_milestones(event_type, event_date, today)
    rem_days = (event_date - today).days
    active.extend(_reschedule_compressed(compressed, today, rem_days, event_date))
    active.sort(key=lambda m: m["due_date"])
    return active


def build_vendor_checklist(budget: Dict[str, float]) -> List[Dict[str, Any]]:
    """Generate categorized vendor checklists and interview questions sorted by budget.

    Args:
        budget: Dictionary mapping category names to allocated INR amounts.

    Returns:
        List of vendor checklist dictionaries sorted descending by allocated amount.
    """
    checklist = []
    for cat, amount in budget.items():
        if cat == "contingency":
            continue
        data = VENDOR_CHECKLISTS.get(cat, {"tasks": [], "questions": []})
        checklist.append({
            "category": cat,
            "amount": amount,
            "tasks": list(data.get("tasks", [])),
            "questions": list(data.get("questions", [])),
        })
    checklist.sort(key=lambda x: x["amount"], reverse=True)
    return checklist


def _parse_event_date(val: Any) -> date:
    """Parse date instance or ISO string into date object."""
    return val if isinstance(val, date) else date.fromisoformat(str(val))


def generate_plan(inputs: Dict[str, Any], today: date) -> Dict[str, Any]:
    """Generate comprehensive celebration plan from validated event inputs.

    Args:
        inputs: Validated event parameters dictionary.
        today: Current reference date.

    Returns:
        Complete plan containing budget splits, timeline, guest assessment, and checklists.
    """
    etype = inputs["event_type"]
    b_total, guests = float(inputs["total_budget"]), int(inputs["guests"])
    edate = _parse_event_date(inputs["event_date"])
    priorities = tuple(inputs.get("priorities", ()))
    days_left = (edate - today).days
    urgency = "relaxed" if days_left > 90 else ("moderate" if days_left >= 30 else "tight")
    alloc = allocate_budget(b_total, etype, priorities)
    return {
        "event_type": etype,
        "total_budget": b_total,
        "guests": guests,
        "days_until_event": days_left,
        "budget": alloc,
        "budget_percentages": compute_budget_split(etype, priorities),
        "per_guest": assess_per_guest_budget(b_total, guests, etype),
        "timeline": build_timeline(etype, edate, today),
        "vendor_checklist": build_vendor_checklist(alloc),
        "urgency": urgency,
    }

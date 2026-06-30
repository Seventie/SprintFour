"""
Heuristic PII detection layer — regex safety net.

Runs AFTER Presidio to catch hard patterns the NLP model misses.
Focuses on structured PII: Indian IDs, phones, emails, IPs, dates.
Merges with model detections without duplicating overlapping ranges.
"""

import re
import uuid
from typing import List, Dict, Tuple

# --- Pattern definitions ---
# Each pattern: (compiled_regex, pii_type, base_confidence, reason_template)
PATTERNS: List[Tuple[re.Pattern, str, float, str]] = [
    # Indian PAN (permanent account number): ABCDE1234F
    (
        re.compile(r'\b[A-Z]{5}[0-9]{4}[A-Z]\b'),
        'IN_PAN',
        0.95,
        'Matches Indian PAN card format (XXXXX0000X) — high structural confidence.'
    ),
    # Indian Aadhaar: 1234 5678 9012 or 123456789012
    (
        re.compile(r'\b\d{4}[\s-]?\d{4}[\s-]?\d{4}\b'),
        'IN_AADHAAR',
        0.88,
        'Matches 12-digit Aadhaar number pattern — verify with checksum.'
    ),
    # Indian mobile: +91 9876543210 or 9876543210
    (
        re.compile(r'(?:\+91[\s-]?)?(?<!\d)[6-9]\d{9}(?!\d)'),
        'PHONE_NUMBER',
        0.85,
        'Matches 10-digit Indian mobile number (starts 6-9).'
    ),
    # Email address
    (
        re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'),
        'EMAIL_ADDRESS',
        0.97,
        'Matches standard email format (user@domain.tld).'
    ),
    # IPv4 address
    (
        re.compile(r'\b(?:\d{1,3}\.){3}\d{1,3}\b'),
        'IP_ADDRESS',
        0.82,
        'Matches IPv4 address pattern (x.x.x.x).'
    ),
    # Date formats: DD/MM/YYYY, DD-MM-YYYY, MM/DD/YYYY, YYYY-MM-DD
    (
        re.compile(r'\b(?:\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4}|\d{4}[/\-]\d{1,2}[/\-]\d{1,2})\b'),
        'DATE_TIME',
        0.72,
        'Matches common date format — may be a non-sensitive date. Flagged for review.'
    ),
    # URLs
    (
        re.compile(r'https?://[^\s<>"{}|\\^`\[\]]+'),
        'URL',
        0.80,
        'Detected URL/web address — may contain identifying parameters.'
    ),
    # Credit card (basic Luhn-eligible 13-19 digit sequences)
    (
        re.compile(r'\b(?:\d[ -]*?){13,19}\b'),
        'CREDIT_CARD',
        0.70,
        'Matches potential credit/debit card number pattern — verify with Luhn check.'
    ),
]


def _ranges_overlap(start1: int, end1: int, start2: int, end2: int) -> bool:
    """Check if two character ranges overlap."""
    return start1 < end2 and start2 < end1


def run_heuristic_detection(text: str) -> List[Dict]:
    """
    Run regex-based PII detection on the given text.
    Returns a list of detection dicts (same shape as Presidio detections).
    """
    detections = []

    for pattern, pii_type, base_conf, reason in PATTERNS:
        for match in pattern.finditer(text):
            matched_text = match.group()

            # Skip very short matches (likely false positives)
            if len(matched_text.strip()) < 3:
                continue

            # Assign status based on confidence
            if base_conf >= 0.85:
                status = "redacted"
            elif base_conf >= 0.50:
                status = "missed"
            else:
                status = "false_positive"

            detections.append({
                "id": f"det_h_{uuid.uuid4().hex[:8]}",
                "text": matched_text,
                "char_start": match.start(),
                "char_end": match.end(),
                "type": pii_type,
                "confidence": base_conf,
                "status": status,
                "reason": f"[Heuristic] {reason}",
                "source": "heuristic",
            })

    return detections


def merge_detections(
    model_detections: List[Dict],
    heuristic_detections: List[Dict],
) -> List[Dict]:
    """
    Merge model (Presidio) and heuristic detections.
    
    Rules:
    - If a heuristic detection overlaps with a model detection, keep the one
      with higher confidence and tag it as 'dual' source.
    - If a heuristic detection has no overlap, add it as new.
    - All model detections are always kept.
    """
    merged = []
    used_heuristic_indices = set()

    # Tag model detections with source
    for det in model_detections:
        det.setdefault("source", "model")
        merged.append(det)

    # Check each heuristic detection for overlap
    for h_idx, h_det in enumerate(heuristic_detections):
        overlapping = False
        for m_det in merged:
            if _ranges_overlap(
                h_det["char_start"], h_det["char_end"],
                m_det["char_start"], m_det["char_end"]
            ):
                overlapping = True
                # If heuristic has higher confidence, upgrade the model detection
                if h_det["confidence"] > m_det["confidence"]:
                    m_det["confidence"] = h_det["confidence"]
                    m_det["reason"] = f"{m_det['reason']} | Also matched by heuristic pattern."
                    m_det["source"] = "dual"
                    # Upgrade status if heuristic says redact
                    if h_det["status"] == "redacted" and m_det["status"] != "redacted":
                        m_det["status"] = "redacted"
                else:
                    m_det["source"] = "dual"
                break

        if not overlapping:
            merged.append(h_det)

    return sorted(merged, key=lambda x: x["char_start"])

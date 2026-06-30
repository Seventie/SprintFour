"""
Heuristic PII detection layer — regex safety net.

Runs AFTER Presidio to catch hard patterns the NLP model misses.
Focuses on structured PII: Indian IDs, phones, emails, IPs, dates.
Merges with model detections without duplicating overlapping ranges.
"""

import re
import uuid
from typing import List, Dict, Tuple
import spacy

try:
    _nlp = spacy.load("en_core_web_trf")
except Exception:
    try:
        _nlp = spacy.load("en_core_web_lg")
    except Exception:
        _nlp = spacy.blank("en")

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
    # Hyphenated / Formatted Phone Numbers (e.g., 123-456-7890, +1-800-555-0199, (415) 555-0123)
    (
        re.compile(r'\b(?:\+\d{1,3}[\s-]?)?(?:\(\d{2,4}\)|\d{2,4})[\s-]\d{3,4}[\s-]\d{4}\b'),
        'PHONE_NUMBER',
        0.92,
        'Matches hyphenated or structured phone number format.'
    ),
    # Salary / Currency / Financial amounts (e.g., $120,000, $85,500.00, 150,000 USD, INR 1,200,000)
    (
        re.compile(r'(?:[$€£¥₹]\s*\d{1,3}(?:,\d{3})*(?:\.\d{2})?|\b\d{1,3}(?:,\d{3})*(?:\.\d{2})?\s*(?:USD|INR|EUR|GBP|AUD|CAD)\b)'),
        'SALARY_FINANCIAL',
        0.88,
        'Matches sensitive salary or currency financial amount.'
    ),
    # Grades, Pay Levels, and Classifications (e.g., Grade A, Grade 12, Pay Grade GS-14, Level 5, Score: 98)
    (
        re.compile(r'\b(?:Pay\s+)?(?:Grade|Level|Band|Rank|Class|Tier|Score)\s*[:#-]?\s*(?:[A-Z0-9]+(?:-[A-Z0-9]+)?)\b', re.IGNORECASE),
        'GRADE_LEVEL',
        0.85,
        'Matches organizational pay grade, level, or evaluation score classification.'
    ),
    # Employee / ID numbers (e.g., Employee ID: E-8912, Staff No: 481923)
    (
        re.compile(r'\b(?:Employee|Staff|Personnel|Badge|Member|Account)\s*(?:ID|No|Number|#)\s*[:#-]?\s*([A-Z0-9-]+)\b', re.IGNORECASE),
        'IDENTIFIER_NUMBER',
        0.86,
        'Matches organizational employee or staff identifier number.'
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


def align_detection_boundaries(text: str, detections: List[Dict]) -> List[Dict]:
    """
    Ensure detections do not cut words, email IDs, or tokens in half using spaCy tokenization.
    Expands start and end indexes to exact token boundaries.
    """
    if not detections or not text:
        return detections

    doc = _nlp(text)
    token_spans = [(t.idx, t.idx + len(t), t.text) for t in doc]

    aligned = []
    for det in detections:
        start_key = "char_start" if "char_start" in det else ("start" if "start" in det else None)
        end_key = "char_end" if "char_end" in det else ("end" if "end" in det else None)
        if not start_key or not end_key:
            aligned.append(det)
            continue

        start = det[start_key]
        end = det[end_key]

        matching_tokens = [
            span for span in token_spans
            if span[0] < end and span[1] > start
        ]

        if matching_tokens:
            # Strip trailing punctuation token if it was caught at the end of sentence
            if len(matching_tokens) > 1 and matching_tokens[-1][2] in ['.', ',', ';', ':', ')', ']', '}']:
                matching_tokens = matching_tokens[:-1]

            new_start = matching_tokens[0][0]
            new_end = matching_tokens[-1][1]
            det[start_key] = new_start
            det[end_key] = new_end
            if "text" in det:
                det["text"] = text[new_start:new_end]

        aligned.append(det)

    # Remove duplicates or overlaps after alignment
    def get_start(x):
        return x.get("char_start", x.get("start", 0))

    def get_end(x):
        return x.get("char_end", x.get("end", 0))

    aligned.sort(key=get_start)
    deduped = []
    for det in aligned:
        if not deduped:
            deduped.append(det)
        else:
            prev = deduped[-1]
            prev_start = get_start(prev)
            prev_end = get_end(prev)
            curr_start = get_start(det)
            curr_end = get_end(det)

            if curr_start < prev_end:
                # Overlap: union spans
                new_end = max(prev_end, curr_end)
                if "char_end" in prev:
                    prev["char_end"] = new_end
                if "end" in prev:
                    prev["end"] = new_end
                if "text" in prev:
                    prev["text"] = text[prev_start:new_end]

                if det.get("confidence", 0) > prev.get("confidence", 0):
                    prev["confidence"] = det.get("confidence")
                    if "type" in det:
                        prev["type"] = det["type"]
            else:
                deduped.append(det)

    return deduped


def merge_detections(
    model_detections: List[Dict],
    heuristic_detections: List[Dict],
) -> List[Dict]:
    """
    Merge model (Presidio) and heuristic detections.
    
    Rules:
    - If a heuristic detection overlaps with a model detection, keep the union
      of their boundaries and take the higher confidence.
    - If a heuristic detection has no overlap, add it as new.
    - All model detections are always kept.
    """
    merged = []

    for det in model_detections:
        det.setdefault("source", "model")
        merged.append(det)

    for h_det in heuristic_detections:
        overlapping = False
        for m_det in merged:
            if _ranges_overlap(
                h_det["char_start"], h_det["char_end"],
                m_det["char_start"], m_det["char_end"]
            ):
                overlapping = True
                m_det["char_start"] = min(m_det["char_start"], h_det["char_start"])
                m_det["char_end"] = max(m_det["char_end"], h_det["char_end"])
                if h_det["confidence"] > m_det["confidence"]:
                    m_det["confidence"] = h_det["confidence"]
                    m_det["reason"] = f"{m_det['reason']} | Also matched by heuristic pattern."
                    m_det["source"] = "dual"
                    if h_det["status"] == "redacted" and m_det["status"] != "redacted":
                        m_det["status"] = "redacted"
                else:
                    m_det["source"] = "dual"
                break

        if not overlapping:
            merged.append(h_det)

    return sorted(merged, key=lambda x: x["char_start"])

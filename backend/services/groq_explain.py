"""
Explanation service — answers "why this, and why not that?"

Uses Groq LLM (llama-3.3-70b-versatile) when API key is available.
Falls back to smart rule-based reasoning when no key is present.
"""

import os
import json
import httpx
from typing import Optional, Dict

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL = "llama-3.3-70b-versatile"
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"


# --- PII type knowledge base for fallback reasoning ---
PII_DESCRIPTIONS = {
    "PERSON":         "a personal name that can identify a specific individual",
    "EMAIL_ADDRESS":  "an email address — a direct digital identifier",
    "PHONE_NUMBER":   "a phone number — can be used to contact or identify someone",
    "CREDIT_CARD":    "a credit/debit card number — highly sensitive financial data",
    "DATE_TIME":      "a date or time — may reveal personal events (DOB, appointments)",
    "IP_ADDRESS":     "an IP address — can trace to a physical location or device",
    "LOCATION":       "a geographic location — may narrow down an individual's identity",
    "NRP":            "a nationality/religion/political group — sensitive demographic data",
    "URL":            "a URL — may contain identifying parameters or session tokens",
    "US_SSN":         "a US Social Security Number — critical government identifier",
    "IN_PAN":         "an Indian PAN card number — tax identification, highly sensitive",
    "IN_AADHAAR":     "an Indian Aadhaar number — biometric-linked government ID",
    "CUSTOM":         "text manually marked as sensitive by the reviewer",
}

NON_PII_CATEGORIES = [
    ("legal boilerplate", "This appears to be standard legal language (e.g. 'hereinafter', 'whereas', 'party of the first part'). Legal boilerplate is structural, not personal."),
    ("common word", "This is a common English word with no personally identifying meaning in this context."),
    ("generic title", "This is a generic title, role, or designation (e.g. 'Manager', 'Director') — not specific enough to identify an individual."),
    ("document metadata", "This appears to be document structure (section numbers, headings, formatting markers) — not personal data."),
    ("monetary amount", "While numbers, monetary amounts in contracts are typically not PII — they describe terms, not people."),
    ("organization name", "Organization names are generally not PII unless they can be used to identify an individual in context."),
]


async def explain_with_groq(
    selected_text: str,
    context: str,
    is_redacted: bool,
    detection_type: Optional[str] = None,
    confidence: Optional[float] = None,
) -> Optional[Dict]:
    """Call Groq LLM to explain why text is/isn't PII."""
    if not GROQ_API_KEY:
        return None

    status_desc = "was automatically flagged and REDACTED" if is_redacted else "was NOT flagged as PII"
    type_desc = f" as {detection_type} (confidence: {confidence:.0%})" if detection_type else ""

    prompt = f"""You are a PII (Personally Identifiable Information) expert auditing a document redaction tool. A skeptical user has clicked on a piece of text and wants to understand the tool's decision.

DOCUMENT CONTEXT (surrounding text):
---
{context[:1500]}
---

SELECTED TEXT: "{selected_text}"
TOOL DECISION: This text {status_desc}{type_desc}.

Provide a clear, honest, 2-3 sentence explanation that:
1. States what the text is (name, number, legal term, common word, etc.)
2. Explains WHY it {("is" if is_redacted else "is NOT")} personally identifiable information
3. Acknowledges any uncertainty or edge cases

Be direct. The user is skeptical — don't be defensive, be transparent.

Respond ONLY as JSON: {{"explanation": "your explanation", "risk_level": "high|medium|low|none"}}"""

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                GROQ_URL,
                headers={
                    "Authorization": f"Bearer {GROQ_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": GROQ_MODEL,
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.3,
                    "max_tokens": 300,
                    "response_format": {"type": "json_object"},
                },
            )
            resp.raise_for_status()
            data = resp.json()
            content = data["choices"][0]["message"]["content"]
            return json.loads(content)
    except Exception as e:
        print(f"[Groq] Error: {e}")
        return None


def explain_with_rules(
    selected_text: str,
    context: str,
    is_redacted: bool,
    detection_type: Optional[str] = None,
    confidence: Optional[float] = None,
    reason: Optional[str] = None,
) -> Dict:
    """Rule-based fallback explanation — always works, no API needed."""

    if is_redacted and detection_type:
        pii_desc = PII_DESCRIPTIONS.get(detection_type, f"data classified as {detection_type}")
        conf_pct = f"{confidence * 100:.0f}%" if confidence else "unknown"

        if confidence and confidence >= 0.85:
            conf_note = f"The detection confidence is {conf_pct} (high), so this was auto-redacted for safety."
        elif confidence and confidence >= 0.50:
            conf_note = f"The detection confidence is {conf_pct} (medium) — flagged for your review because the system isn't fully sure."
        else:
            conf_note = f"The detection confidence is {conf_pct} (low) — this might be a false positive. Your judgment is needed."

        explanation = f'"{selected_text}" was identified as {pii_desc}. {conf_note}'
        if reason:
            explanation += f" Detection basis: {reason}"

        risk = "high" if (confidence or 0) >= 0.85 else "medium" if (confidence or 0) >= 0.5 else "low"
        return {"explanation": explanation, "risk_level": risk}

    else:
        # Not redacted — explain why it's safe
        text_lower = selected_text.lower().strip()

        # Check if it's a very short/common word
        if len(text_lower) <= 2:
            return {
                "explanation": f'"{selected_text}" is a very short word/token. Short tokens like articles, prepositions, and single characters carry no identifying information on their own.',
                "risk_level": "none"
            }

        # Check for legal boilerplate indicators
        legal_terms = ["hereinafter", "whereas", "pursuant", "notwithstanding", "hereby",
                       "thereof", "therein", "witnesseth", "aforesaid", "stipulated",
                       "clause", "section", "agreement", "contract", "party", "parties",
                       "jurisdiction", "governing", "arbitration", "indemnify", "liability"]
        if text_lower in legal_terms or any(t in text_lower for t in legal_terms):
            return {
                "explanation": f'"{selected_text}" is standard legal terminology. These are structural terms used in contracts and carry no personally identifiable information. They describe legal concepts, not people.',
                "risk_level": "none"
            }

        # Check for common structural words
        structural = ["the", "and", "for", "with", "from", "this", "that", "will",
                      "shall", "may", "can", "has", "had", "was", "were", "are", "been",
                      "being", "have", "does", "did", "not", "but", "also", "between",
                      "under", "over", "into", "upon", "about", "through", "during",
                      "before", "after", "above", "below", "each", "every", "both",
                      "any", "all", "such", "other", "than", "then", "when", "where",
                      "here", "there", "which", "what", "who", "whom", "how", "its"]
        if text_lower in structural:
            return {
                "explanation": f'"{selected_text}" is a common English function word (preposition, conjunction, or determiner). It has no identifying value — it appears in virtually every English document regardless of content.',
                "risk_level": "none"
            }

        # Check for numbers that aren't PII patterns
        if text_lower.isdigit() and len(text_lower) <= 4:
            return {
                "explanation": f'"{selected_text}" is a short numeric value. On its own, a {len(text_lower)}-digit number doesn\'t match known PII patterns (phone numbers need 10+ digits, Aadhaar needs 12, PAN is alphanumeric). In context, this likely represents a section number, quantity, or reference.',
                "risk_level": "low"
            }

        # Default: explain why the system didn't flag it
        return {
            "explanation": f'"{selected_text}" was not flagged because it didn\'t match any known PII patterns (names, phone numbers, emails, ID numbers, addresses) and the NLP model did not classify it as a named entity. If you believe this IS sensitive, you can select it and manually mark it as PII.',
            "risk_level": "none"
        }


async def get_explanation(
    selected_text: str,
    context: str,
    is_redacted: bool,
    detection_type: Optional[str] = None,
    confidence: Optional[float] = None,
    reason: Optional[str] = None,
) -> Dict:
    """
    Main entry point — tries Groq first, falls back to rules.
    Always returns an explanation dict.
    """
    # Try Groq if key is available
    groq_result = await explain_with_groq(
        selected_text, context, is_redacted, detection_type, confidence
    )
    if groq_result:
        groq_result["source"] = "ai"
        return groq_result

    # Fallback to rule-based
    result = explain_with_rules(
        selected_text, context, is_redacted, detection_type, confidence, reason
    )
    result["source"] = "rules"
    return result

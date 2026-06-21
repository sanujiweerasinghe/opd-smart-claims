"""
PDF Policy Extractor
Sends an uploaded OPD policy PDF to Gemini and extracts structured
policy rules that are then saved to the PolicyRuleDocument database table.
"""
import json
import os
import re

import google.generativeai as genai
from django.conf import settings


def _clean_json_response(text: str):
    """Strip markdown fences and extract the first complete JSON object from text."""
    text = re.sub(r'```json|```', '', text, flags=re.IGNORECASE).strip()
    start = text.find('{')
    if start == -1:
        return None
    # Use raw_decode to parse only the first valid JSON object, ignoring any
    # trailing text that Gemini may append after the closing brace.
    try:
        result, _ = json.JSONDecoder().raw_decode(text, start)
        return result
    except json.JSONDecodeError:
        pass
    # Fallback: greedy regex (may still fail on multi-object responses)
    match = re.search(r'\{.*\}', text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(0))
        except json.JSONDecodeError:
            pass
    return None


def extract_policy_rules_from_pdf(pdf_file_path: str) -> dict:
    """
    Upload a PDF (by its filesystem path) to the Gemini Files API and extract
    structured policy rules suitable for the RAG knowledge base.

    Args:
        pdf_file_path: Absolute path to the saved PDF on disk.

    Returns:
        dict: Extracted rules dict.

    Raises:
        RuntimeError: If Gemini upload or JSON parsing fails.
    """
    genai.configure(api_key=settings.GOOGLE_API_KEY)

    # Upload to Gemini Files API ─ handles large PDFs cleanly
    gemini_file = genai.upload_file(pdf_file_path, mime_type='application/pdf')

    prompt = """You are an insurance policy analyst at OPD Insurance PLC (Sri Lanka).
Carefully read this entire policy schedule document and extract ALL policy rules,
benefit limits, waiting periods, exclusions, and conditions.

Return ONLY valid JSON in exactly this format — no markdown, no extra text, no explanation:

{
  "policy_number": "JSV2025-XXXX or empty string if not found",
  "holder_name": "Full company or person name exactly as written on the document",
  "policy_type": "Must be exactly one of: Corporate, Individual Health, Family Floater, Senior Citizen",
  "description": "One sentence describing this policy",
  "cover_start": "YYYY-MM-DD or null",
  "cover_end": "YYYY-MM-DD or null",
  "premium": 0,
  "eligible_members": [
    "Self (primary member)",
    "Spouse (if applicable — describe conditions)",
    "Dependent children up to age X (if applicable)"
  ],
  "claim_types_covered": {
    "opd": {
      "covered": true,
      "annual_limit": 30000,
      "sub_limits": {},
      "note": "Full conditions for outpatient coverage"
    },
    "dental": {
      "covered": true,
      "annual_limit": 25000,
      "note": "Full conditions for dental coverage"
    },
    "spectacle": {
      "covered": true,
      "annual_limit": 15000,
      "note": "Eye specialist prescription required, once every 2 years, no sunglasses/contact lenses"
    },
    "indoor": {
      "covered": true,
      "annual_limit": 300000,
      "note": "Full hospitalization conditions and sub-limits"
    }
  },
  "waiting_periods": {
    "sickness": "30 days from commencement or as stated",
    "childbirth": "10 months from commencement or as stated",
    "pre_existing": "As stated in document or null"
  },
  "exclusions": [
    "List EVERY excluded item or condition exactly as written in the document"
  ],
  "benefit_schedules": {
    "note": "If benefits vary by employee grade/scheme, describe EACH scheme here with exact LKR amounts"
  },
  "additional_conditions": "Any other important policy conditions, claim requirements, cashless facilities, or special notes"
}

Rules:
- Extract ALL numbers, dates, and conditions accurately.
- If a field is not present in the document use null.
- For benefit_schedules: if there are multiple schemes (DGM, Manager, Staff etc) list them all with amounts.
- For exclusions: include every single item mentioned.
- Do NOT invent numbers — only use what is explicitly stated."""

    try:
        model = genai.GenerativeModel('gemini-2.5-flash')
        response = model.generate_content([gemini_file, prompt])
    finally:
        # Always remove from Gemini Files API to avoid storage quota build-up
        try:
            genai.delete_file(gemini_file.name)
        except Exception:
            pass

    result = _clean_json_response(response.text)
    if result is None:
        raise RuntimeError(
            "Gemini returned a response that could not be parsed as JSON. "
            f"Raw response (first 500 chars): {response.text[:500]}"
        )
    return result

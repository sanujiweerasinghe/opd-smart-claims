"""
RAG (Retrieval-Augmented Generation) Engine
Compares insurance claims against OPD policy knowledge base.
"""
import json
import os
import re

import google.generativeai as genai
from django.conf import settings

# Path to the policy knowledge base JSON
KB_PATH = os.path.join(os.path.dirname(__file__), 'policy_knowledge_base.json')


def _load_knowledge_base_from_db():
    """
    Load active policy rules from PolicyRuleDocument DB records.
    Returns a partial KB dict (policies + policy_types) if records exist,
    or None if no active+successful records are found.
    """
    try:
        from users.models import PolicyRuleDocument
        docs = PolicyRuleDocument.objects.filter(is_active=True, extraction_status='success')
        if not docs.exists():
            return None

        db_policy_types = {}
        db_policies = []

        for doc in docs:
            rules = doc.extracted_rules or {}
            ptype = doc.policy_type

            # Latest uploaded document for a policy_type wins
            if ptype not in db_policy_types:
                db_policy_types[ptype] = {
                    "description": rules.get(
                        "description",
                        f"{ptype} policy — extracted from uploaded PDF",
                    ),
                    "eligible_members": rules.get("eligible_members", []),
                    "claim_types_covered": rules.get("claim_types_covered", {}),
                    "waiting_periods": rules.get("waiting_periods", {}),
                    "exclusions": rules.get("exclusions", []),
                    "benefit_schedules": rules.get("benefit_schedules", {}),
                    "additional_conditions": rules.get("additional_conditions", ""),
                }

            db_policies.append({
                "policy_number": doc.policy_number,
                "holder_name": doc.holder_name,
                "policy_type": ptype,
                "cover_start": str(doc.cover_start) if doc.cover_start else None,
                "cover_end": str(doc.cover_end) if doc.cover_end else None,
                **rules,
            })

        return {"policies": db_policies, "policy_types": db_policy_types}
    except Exception as e:
        print(f"RAG: Failed to load KB from DB: {e}")
        return None


def load_knowledge_base():
    """
    Load policy knowledge base.
    Priority:
      1. DB records (PolicyRuleDocument with is_active=True, extraction_status='success')
         override the matching policy_type entries from the static JSON.
      2. Static policy_knowledge_base.json provides general_conditions (universal rules)
         and acts as a full fallback when no DB records exist.
    """
    db_kb = _load_knowledge_base_from_db()

    json_kb = None
    try:
        with open(KB_PATH, 'r', encoding='utf-8') as f:
            json_kb = json.load(f)
    except Exception as e:
        print(f"RAG: Failed to load static KB: {e}")

    if db_kb and json_kb:
        # Merge: DB overrides same policy_type from JSON; general_conditions always from JSON
        merged_types = dict(json_kb.get('policy_types', {}))
        merged_types.update(db_kb['policy_types'])   # DB wins on overlap
        return {
            "policies": db_kb['policies'],
            "policy_types": merged_types,
            "general_conditions": json_kb.get('general_conditions', {}),
        }
    elif db_kb:
        return {**db_kb, "general_conditions": {}}
    elif json_kb:
        return json_kb   # pure static fallback
    return None


def _find_policy_in_kb(policy_number, kb):
    """Find a specific policy in the knowledge base by policy number."""
    if not kb or not policy_number:
        return None
    for policy in kb.get('policies', []):
        if policy.get('policy_number', '').upper() == policy_number.strip().upper():
            return policy
    return None


def _is_self_claim(patient_name, holder_name):
    """Return True if the patient appears to be the main policy holder."""
    if not patient_name or not holder_name:
        return True  # assume self when unknown
    p = patient_name.lower().strip()
    h = holder_name.lower().strip()
    if p == h:
        return True
    # Two or more words in common → likely the same person
    p_parts = set(p.split())
    h_parts = set(h.split())
    if len(p_parts & h_parts) >= 2:
        return True
    return False


def _clean_json_response(text):
    """Strip markdown fences and extract JSON object from Gemini response."""
    text = re.sub(r'```json|```', '', text, flags=re.IGNORECASE).strip()
    match = re.search(r'\{.*\}', text, re.DOTALL)
    if match:
        return json.loads(match.group(0))
    return None


def check_claim_against_rag(claim_data):
    """
    Semantic coverage analysis against OPD policy knowledge base.
    Policy number is NEVER used for matching — analysis is purely semantic
    based on claim type, diagnosis, member type, and amount vs limit.
    """
    try:
        genai.configure(api_key=settings.GOOGLE_API_KEY)
        kb = load_knowledge_base()

        if not kb:
            return {
                "coverage_status": "REQUIRES_REVIEW",
                "confidence": 0,
                "policy_match_score": 0,
                "key_findings": ["Knowledge base unavailable — manual review required."],
                "recommendation": "Manual review required.",
                "error": "Knowledge base unavailable",
            }

        # --- Extract claim context (policy number intentionally NOT used for matching) ---
        policy_type = claim_data.get('policy_type', 'Unknown')
        policy_opd_limit = float(claim_data.get('policy_opd_limit', 0) or 0)
        policy_holder_name = claim_data.get('policy_holder_name', 'Unknown')
        claim_type = claim_data.get('claim_type', 'opd')
        claim_amount = float(claim_data.get('claim_amount', 0))
        patient_name = claim_data.get('patient_name', 'Not provided')
        doctor_name = claim_data.get('doctor_name', 'Not provided')
        diagnosis = claim_data.get('diagnosis', 'Not provided')
        treatment_date = claim_data.get('treatment_date', 'Not provided')

        is_self = _is_self_claim(patient_name, policy_holder_name)
        member_type_label = "Main Member (Self)" if is_self else "Dependent (Spouse/Child)"

        # --- Build KB context: ONLY policy_type rules + general_conditions ---
        # Do NOT include JSV-specific company policies (they cause number-matching hallucinations)
        general_conditions = kb.get('general_conditions', {})
        policy_types_kb = kb.get('policy_types', {})

        type_rules = policy_types_kb.get(policy_type, {})
        if not type_rules:
            # Fall back to all types so Gemini can pick closest match
            type_rules = policy_types_kb

        evidence_text = (
            f"POLICY TYPE RULES — '{policy_type}':\n{json.dumps(type_rules, indent=2)}\n\n"
            f"GENERAL OPD CONDITIONS:\n{json.dumps(general_conditions, indent=2)}"
        )

        prompt = f"""
        Act as an Expert Claims Assessor evaluating a medical claim against a policy knowledge base.

        # CLAIM DATA:
        - Claim Type: {claim_type.upper()}
        - Claim Amount: {claim_amount}
        - Patient / Claimant: {patient_name}  ({member_type_label})
        - Doctor Name: {doctor_name}
        - Diagnosis / Treatment: {diagnosis}
        - Policy OPD Limit: {policy_opd_limit}

        IMPORTANT: If the claimant is a "Dependent (Spouse/Child)", DO NOT reject the claim for name mismatch. Dependents are fully covered under the policy holder's limit.
        CRITICAL INSTRUCTION: You are performing SEMANTIC COVERAGE ANALYSIS only.
        - Do NOT look for a policy number anywhere.
        - Do NOT say "policy not found" or "policy number not recognized".
        - The policy number is IRRELEVANT to this analysis. IGNORE it completely.
        - Analyze the claim purely based on: claim type, diagnosis, member type, amount, and the policy rules below.

=== OPD POLICY RULES ===
{evidence_text}

=== CLAIM TO ASSESS ===
- Policy Type: {policy_type}
- Registered Cover Limit (from system): LKR {policy_opd_limit:,.2f}
- Claim Type: {claim_type.upper()}
- Claim Amount: LKR {claim_amount:,.2f}
- Policy Holder: {policy_holder_name}
- Patient / Claimant: {patient_name}
- Member Type: {member_type_label}
- Treating Doctor: {doctor_name}
- Diagnosis / Procedure: {diagnosis}
- Treatment Date: {treatment_date}

=== ANALYSIS STEPS ===

1. CLAIM CATEGORY — What is the treatment category? (OPD / hospitalization / dental / spectacles / other)
   Is this category covered under a "{policy_type}" policy per the rules above?

2. MEMBER ELIGIBILITY — The patient is a {member_type_label}.
   Under "{policy_type}", is a {member_type_label.lower()} eligible to claim?

3. BENEFIT LIMIT — Compare LKR {claim_amount:,.2f} against the registered limit of LKR {policy_opd_limit:,.2f}.
   Is the claim amount within the limit?

4. WAITING PERIOD — Standard sickness waiting: 30 days (Senior Citizen: 60 days).
   Does "{diagnosis}" suggest a pre-existing condition with a longer waiting period?
   Assume the waiting period has passed unless the diagnosis is clearly a known chronic/pre-existing condition.

5. EXCLUSIONS — Check if "{diagnosis}" involves any excluded item:
   drug/alcohol addiction, cosmetics, sunglasses, contact lenses, non-medical consumables,
   COVID vaccines, mobile clinic charges, self-inflicted injury.
   Only flag true matches — do NOT flag general medical conditions.

6. RETRIEVE CLAUSES — Identify 2–4 specific policy rules from the knowledge base above
   that directly support OR contradict coverage for this claim.
   Quote them as: {{"ref": "Rule name", "text": "Plain English explanation."}}

7. SCORES
   - confidence: 0–100 (how certain is the decision given available evidence)
   - policy_match_score: 0–100 (how well the KB rules align with this specific claim)

8. DECISION
   - LIKELY_COVERED: member eligible, claim type covered, amount within limit, no exclusions, waiting period passed
   - REQUIRES_REVIEW: some ambiguity (e.g. dependent type unclear, borderline diagnosis, partial limit)
   - NOT_COVERED: clear violation (exclusion triggered, ineligible member, amount over limit with no exception)

Return ONLY valid JSON (no markdown, no extra text):
{{
  "coverage_status": "LIKELY_COVERED",
  "confidence": 85,
  "policy_match_score": 82,
  "claim_type": "OPD Consultation",
  "member_eligible": true,
  "member_type": "{member_type_label}",
  "benefit_limit": "LKR {policy_opd_limit:,.0f}",
  "benefit_limit_value": {policy_opd_limit},
  "amount_within_limit": true,
  "waiting_period_passed": true,
  "waiting_period_note": "Standard 30-day sickness waiting period — assumed passed for general illness.",
  "exclusions": [],
  "matched_clauses": [
    {{"ref": "OPD Coverage — {policy_type}", "text": "Outpatient doctor consultations are covered under {policy_type} policies."}},
    {{"ref": "Benefit Limit", "text": "Registered OPD limit is LKR {policy_opd_limit:,.0f}. Claim of LKR {claim_amount:,.0f} is within this limit."}}
  ],
  "contradicting_clauses": [],
  "reasoning": "3–4 sentences explaining the decision with reference to the diagnosis, member type, amount vs limit, and applicable policy rules. Do NOT mention policy number.",
  "recommendation": "Specific recommended action with real LKR figures.",
  "is_self_coverage": {str(is_self).lower()},
  "dependent_relationship_note": "",
  "key_findings": [
    "Finding 1 with specific LKR amounts and policy type rules.",
    "Finding 2.",
    "Finding 3."
  ]
}}"""

        model = genai.GenerativeModel(
            'gemini-2.5-flash',
            generation_config=genai.types.GenerationConfig(temperature=0),
        )
        response = model.generate_content(prompt)
        result = _clean_json_response(response.text)

        if result:
            result.setdefault('is_self_coverage', is_self)
            result.setdefault('benefit_limit_value', policy_opd_limit)
            result.setdefault('matched_clauses', [])
            result.setdefault('contradicting_clauses', [])
            result.setdefault('reasoning', '')
            # Ensure key_findings always populated (used by generate_ai_summary)
            if not result.get('key_findings') and result.get('reasoning'):
                result['key_findings'] = [result['reasoning']]
            return result

        return {
            "coverage_status": "REQUIRES_REVIEW",
            "confidence": 0,
            "policy_match_score": 0,
            "is_self_coverage": is_self,
            "benefit_limit_value": policy_opd_limit,
            "matched_clauses": [],
            "contradicting_clauses": [],
            "key_findings": ["RAG response could not be parsed — manual review required."],
            "recommendation": "Manual review required.",
        }

    except Exception as e:
        print(f"RAG check_claim_against_rag error: {e}")
        return {
            "coverage_status": "REQUIRES_REVIEW",
            "confidence": 0,
            "policy_match_score": 0,
            "is_self_coverage": True,
            "benefit_limit_value": 0,
            "matched_clauses": [],
            "contradicting_clauses": [],
            "key_findings": [f"RAG analysis failed: {str(e)}"],
            "recommendation": "Manual review required due to RAG error.",
            "error": str(e),
        }


def generate_ai_summary(claim_data, policy_info, score, issues, rag_result):
    """
    Generate a relevant, claim-specific AI summary using Gemini.

    Args:
        claim_data (dict): patient_name, doctor_name, diagnosis, claim_type, claim_amount, policy_number
        policy_info (dict): holder_name, opd_limit, policy_type
        score (float): Validation score 0-100
        issues (list): List of issue strings from validation
        rag_result (dict): Output from check_claim_against_rag()

    Returns:
        str: AI-generated summary paragraph
    """
    try:
        genai.configure(api_key=settings.GOOGLE_API_KEY)

        if score >= 90:
            decision_text = "AUTO-APPROVAL RECOMMENDED"
        elif score < 50:
            decision_text = "REJECTION RECOMMENDED"
        else:
            decision_text = "MANUAL REVIEW REQUIRED"

        rag_findings = []
        coverage_status = "UNKNOWN"
        applicable_limit = 0
        rag_confidence = 0
        rag_reasoning = ""
        if rag_result and not rag_result.get('error'):
            rag_findings = rag_result.get('key_findings', [])
            coverage_status = rag_result.get('coverage_status', 'UNKNOWN')
            applicable_limit = rag_result.get('benefit_limit_value') or rag_result.get('applicable_limit', 0)
            rag_confidence = rag_result.get('confidence', 0)
            rag_reasoning = rag_result.get('reasoning', '')

        # Map status labels for readability
        status_labels = {
            'LIKELY_COVERED': 'Likely Covered',
            'REQUIRES_REVIEW': 'Requires Review',
            'NOT_COVERED': 'Not Covered',
            'COVERED': 'Covered',
            'PARTIALLY_COVERED': 'Partially Covered',
        }
        coverage_label = status_labels.get(coverage_status, coverage_status)

        prompt = f"""You are a senior claims assessor at OPD Insurance PLC (Sri Lanka).

Write a concise, professional AI assessment summary for this claim. Be factual and specific.

CLAIM DETAILS:
- Patient: {claim_data.get('patient_name', 'Unknown')}
- Doctor: {claim_data.get('doctor_name', 'Unknown')}
- Diagnosis: {claim_data.get('diagnosis', 'Unknown')}
- Claim Type: {str(claim_data.get('claim_type', 'OPD')).upper()}
- Claim Amount: LKR {float(claim_data.get('claim_amount', 0)):,.2f}
- Policy Number: {claim_data.get('policy_number', 'N/A')}

POLICY INFORMATION:
- Policy Holder: {policy_info.get('holder_name', 'Unknown')}
- Policy Type: {policy_info.get('policy_type', 'Unknown')}
- OPD/Cover Limit: LKR {float(policy_info.get('opd_limit', 0) or 0):,.2f}

VALIDATION RESULT:
- Score: {score}/100
- Decision: {decision_text}
- Issues Found: {'; '.join(issues) if issues else 'No issues detected'}

RAG COVERAGE ANALYSIS:
- Coverage Decision: {coverage_label}
- Confidence: {rag_confidence}%
- Applicable Limit: LKR {applicable_limit:,.2f}
- Key Findings: {'; '.join(rag_findings) if rag_findings else 'Not available'}
{f'- Coverage Reasoning: {rag_reasoning}' if rag_reasoning else ''}

Write a 3-4 sentence professional summary that:
1. Names the patient, their diagnosis and the claim type in the first sentence.
2. States the validation score and any key issues if present.
3. References the RAG policy check result and applicable coverage limit.
4. Ends with a clear, specific recommendation (approve/reject/manual review).

Use real names and figures from the data. Do NOT use placeholders like [patient name] or [amount]."""

        model = genai.GenerativeModel(
            'gemini-2.5-flash',
            generation_config=genai.types.GenerationConfig(temperature=0),
        )
        response = model.generate_content(prompt)
        return response.text.strip()

    except Exception as e:
        print(f"RAG generate_ai_summary error: {e}")
        return None

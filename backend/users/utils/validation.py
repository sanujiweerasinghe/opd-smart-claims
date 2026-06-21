import re
from datetime import datetime, timedelta
from fuzzywuzzy import fuzz
from .normalizer import normalize_drug_name

def parse_date(date_str):
    """
    Helper to parse dates from various formats found by OCR.
    """
    if not date_str: return None
    # Common formats in Sri Lanka: YYYY-MM-DD, DD/MM/YYYY, DD.MM.YYYY
    formats = [
        '%Y-%m-%d', '%d/%m/%Y', '%m/%d/%Y', '%d-%m-%Y', 
        '%Y.%m.%d', '%d.%m.%Y', '%d %b %Y', '%d %B %Y'
    ]
    
    clean_date_str = str(date_str).strip().replace(',', '').replace('.', '/')
    
    for fmt in formats:
        try:
            return datetime.strptime(clean_date_str, fmt).date()
        except ValueError:
            continue
    return None

def smart_name_match(bill_name, policy_full_name):
    """ Advanced Name Matching (Includes WASD check) """
    if not bill_name or not policy_full_name: return 0
    
    clean_bill = re.sub(r'[^\w\s]', ' ', str(bill_name)).lower()
    clean_policy = re.sub(r'[^\w\s]', ' ', str(policy_full_name)).lower()
    
    titles = ['mr', 'mrs', 'ms', 'dr', 'miss', 'master', 'rev', 'hon', 'baby']
    b_parts = [w for w in clean_bill.split() if w not in titles]
    p_parts = [w for w in clean_policy.split() if w not in titles]

    if not b_parts or not p_parts: return 0

    matches = 0
    for b_word in b_parts:
        word_matched = False
        for p_word in p_parts:
            if b_word == p_word: word_matched = True
            elif len(b_word) == 1 and p_word.startswith(b_word): word_matched = True
            elif len(b_word) > 3 and fuzz.ratio(b_word, p_word) > 80: word_matched = True
            if word_matched: break
        
        # Clumped Initials Check
        if not word_matched and 1 < len(b_word) <= 6:
            initial_hits = 0
            p_parts_temp = p_parts.copy()
            for char in b_word:
                found_char = False
                for i, p in enumerate(p_parts_temp):
                    if len(p) == 1 and p.startswith(char):
                        initial_hits += 1
                        p_parts_temp.pop(i)
                        found_char = True
                        break
                if not found_char: break
            if initial_hits >= len(b_word) - 1:
                matches += 1
                word_matched = True

        if word_matched: matches += 1

    match_percentage = (matches / len(b_parts)) * 100
    fuzzy_score = fuzz.token_set_ratio(bill_name, policy_full_name)
    return max(match_percentage, fuzzy_score)

def generate_explanation(score, issues, policy_limit, bill_amount):
    explanation = ""
    
    if score >= 90:
        explanation += "✅ **Auto-Approval Recommended.** "
    elif score < 50:
        explanation += "❌ **Rejection Recommended.** Critical issues detected. "
    else:
        explanation += "⚠️ **Manual Review Required.** Minor discrepancies found. "

    if issues:
        explanation += "\n\n**Detailed Findings:**\n"
        for issue in issues:
            explanation += f"- {issue}.\n"
    else:
        explanation += "All checks passed successfully."
    
    if bill_amount > policy_limit:
        explanation += f"\n**Financial Risk:** Claim amount (LKR {bill_amount:,.2f}) exceeds limit (LKR {policy_limit:,.2f})."
    
    return explanation

def calculate_risk_score(prescriptions, bills, policy, member_names=None):
    scores = {
        "doc_match": 0.0,       # 20% (Items valid?)
        "treatment_match": 1.0, # 20% (Name match?)
        "policy_check": 0.0,    # 30% (Limit check?)
        "date_validity": 0.0,   # 15% (Is bill date valid/not expired?)
        "date_gap": 1.0         # 15% (Is gap <= 30 days?)
    }
    
    issues = []
    
    # 1. FLATTEN DATA
    all_bill_items = []
    total_bill_amount = 0.0
    bill_metadata = {}
    
    pres_date = None
    if prescriptions:
        # Try to find a date in the first prescription
        pres_date = parse_date(prescriptions[0].get('metadata', {}).get('date'))

    for b in bills:
        all_bill_items.extend(b.get('line_items', []))
        total_bill_amount += float(b.get('financials', {}).get('total_amount', 0))
        if not bill_metadata:
            bill_metadata = b.get('metadata', {})

    bill_date = parse_date(bill_metadata.get('date'))

    # =========================================================
    # CHECK 1: DATE VALIDITY (Is the bill too old or future?)
    # =========================================================
    if bill_date:
        today = datetime.now().date()
        age_in_days = (today - bill_date).days

        if age_in_days < 0:
            # Future date is impossible on a real bill — OCR misread the date
            scores['date_validity'] = 0.7
            issues.append(f"Date unreadable: OCR extracted a future date ({bill_date}) — manual date verification recommended")
        elif age_in_days > 900:
            scores['date_validity'] = 0.0
            issues.append(f"Stale Claim: Bill is {age_in_days} days old (Limit: 900 days)")
        else:
            scores['date_validity'] = 1.0
    else:
        scores['date_validity'] = 0.7  # Benefit of doubt if OCR missed the date
        issues.append("Bill date not clearly visible — manual verification recommended")

    # =========================================================
    # CHECK 2: DATE GAP (Bill Date vs Prescription Date)
    # =========================================================
    if pres_date and bill_date:
        gap = (bill_date - pres_date).days

        if gap < 0:
            scores['date_gap'] = 0.0
            issues.append(f"Logic Error: Bill ({bill_date}) is BEFORE Prescription ({pres_date})")
        elif gap > 30 and gap < 365:
            # Soft penalty — valid for chronic medications or delayed purchases
            scores['date_gap'] = 0.5
            issues.append(f"Gap Note: Bill purchased {gap} days after prescription (>30 days)")
        elif gap >= 365:
            scores['date_gap'] = 1.0
        else:
            scores['date_gap'] = 1.0
    elif not pres_date:
        scores['date_gap'] = 1.0 

    # =========================================================
    # CHECK 3: MEMBER MATCH
    # =========================================================
    # Priority: prescription name first (most reliable), then bill name
    patient_name = ""
    for p in prescriptions:
        pres_name = p.get('metadata', {}).get('patient_name', '')
        if pres_name:
            patient_name = pres_name
            break
    if not patient_name:
        patient_name = bill_metadata.get('patient_name', "")

    if patient_name:
        # Build list of all names to check: holder + spouse + children
        all_covered_names = [policy.holder_name or '']
        if member_names:
            all_covered_names.extend(member_names)

        titles = ['mr', 'mrs', 'ms', 'dr', 'miss', 'master', 'baby']
        doc_parts = [w for w in re.sub(r'[^\w\s]', ' ', patient_name).lower().split()
                     if w not in titles]

        best_score = 0
        best_matched = 0
        for covered_name in all_covered_names:
            if not covered_name:
                continue
            score_candidate = smart_name_match(patient_name, covered_name)
            policy_parts = [w for w in re.sub(r'[^\w\s]', ' ', covered_name).lower().split()
                            if w not in titles]
            matched = sum(
                1 for b in doc_parts
                if any(b == p or (len(b) == 1 and p.startswith(b)) or
                       (len(b) > 3 and len(p) > 3 and fuzz.ratio(b, p) > 80)
                       for p in policy_parts)
            )
            if score_candidate > best_score:
                best_score = score_candidate
            if matched > best_matched:
                best_matched = matched

        if best_score >= 60 or best_matched >= 2:
            scores['treatment_match'] = 1.0
        else:
            issues.append(f"Name Mismatch: Document('{patient_name}') vs Policy members")
            scores['treatment_match'] = 0.0
    else:
        scores['treatment_match'] = 1.0  # No name on bill — give benefit of doubt

    # =========================================================
    # CHECK 4: ITEM VALIDATION
    # =========================================================
    valid_items_count = 0
    billable_items = 0  # Non-Medical items excluded from denominator

    valid_keywords = ['cpg', 'fbs', 'ufr', 'tsh', 'lipid', 'scan', 'x-ray', 'blood', 'urine', 'ecg', 'spectacle', 'consultation', 'doctor']

    for item in all_bill_items:
        name = str(item.get('item', '')).lower()
        cat = str(item.get('category', ''))

        if cat == 'Non-Medical':
            issues.append(f"Excluded item: {item.get('item')}")
            continue  # Don't count against billable total

        billable_items += 1

        if cat in ['Lab', 'Investigation', 'Spectacle'] or any(k in name for k in valid_keywords):
            valid_items_count += 1
            continue

        db_drug = normalize_drug_name(item.get('item'))
        if db_drug:
            if db_drug['is_payable']: valid_items_count += 1
            else: issues.append(f"Non-Payable: {item.get('item')}")
        else:
            valid_items_count += 0.8  # Unknown medicine — benefit of doubt

    total_items = billable_items if billable_items > 0 else 1
    scores['doc_match'] = valid_items_count / total_items

    # =========================================================
    # CHECK 5: POLICY LIMIT
    # =========================================================
    opd_limit = float(policy.opd_limit) if policy.opd_limit else 0
    if total_bill_amount <= opd_limit:
        scores['policy_check'] = 1.0
    else:
        issues.append(f"Exceeds Limit: Claim (LKR {total_bill_amount}) > (LKR {opd_limit})")
        scores['policy_check'] = 0.0

    # =========================================================
    # FINAL WEIGHTED SCORE
    # =========================================================
    final_score = (
        (0.20 * scores['doc_match']) +
        (0.20 * scores['treatment_match']) +
        (0.30 * scores['policy_check']) +
        (0.15 * scores['date_validity']) + # Bill is current
        (0.15 * scores['date_gap'])        # Bill matches prescription timing
    ) * 100 
    
    # Remove duplicate issues
    unique_issues = list(dict.fromkeys(issues))

    explanation = generate_explanation(final_score, unique_issues, opd_limit, total_bill_amount)

    return round(final_score, 2), explanation
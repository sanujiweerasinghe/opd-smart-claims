import re
from django.db.models import Q
from users.models import MedicineMaster 
from fuzzywuzzy import process

def normalize_drug_name(ocr_name):
    """
    Checks if a drug exists in the MedicineMaster Database.
    Returns: Dictionary with drug details or None.
    """
    if not ocr_name:
        return None

    clean_name = str(ocr_name).strip().title()

    # 1. Direct DB Search (Fastest)
    # Check Brand OR Generic name
    exact_match = MedicineMaster.objects.filter(
        Q(brand_name__iexact=clean_name) | 
        Q(generic_name__iexact=clean_name)
    ).first()

    if exact_match:
        return {
            "name": exact_match.brand_name,
            "generic": exact_match.generic_name,
            "category": exact_match.category,
            "is_payable": exact_match.is_payable
        }

    # 2. Fuzzy Logic Search (If typo in OCR)
    # We fetch all brand names to compare
    all_brands = list(MedicineMaster.objects.values_list('brand_name', flat=True))
    
    if not all_brands:
        return None
    
    # Find best match (Cutoff 85% similarity)
    # extractOne returns (match, score) or None
    result = process.extractOne(clean_name, all_brands)
    
    if result:
        match, score = result
        if score >= 85:
            db_record = MedicineMaster.objects.filter(brand_name=match).first()
            if db_record:
                return {
                    "name": db_record.brand_name,
                    "generic": db_record.generic_name,
                    "category": db_record.category,
                    "is_payable": db_record.is_payable
                }

    # 3. Not Found -> Likely Non-Medical or New Drug
    return None
from django.shortcuts import render, get_object_or_404
from rest_framework import generics
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework_simplejwt.views import TokenObtainPairView
from django.contrib.auth import get_user_model
from django.db.models import Q, Avg, Count

# Import Models
from .models import Claim, Policy, PolicyMember, ClaimDocument, GroupInsurance, GroupRider, PolicyRuleDocument

# Import Serializers
from .serializers import (
    UserRegistrationSerializer, 
    CustomTokenObtainPairSerializer, 
    ClaimSerializer,
    PolicySerializer, 
    PolicyMemberSerializer, 
    ClaimDocumentSerializer,
    GroupInsuranceSerializer,
    GroupRiderSerializer
)

# Import AI Utils
from .utils.ocr_engine import extract_data
from .utils.validation import calculate_risk_score, parse_date

User = get_user_model()


def get_gi_record_for_claim(policy_number, user=None, patient_name=None):
    """
    Find the correct GroupInsurance row for a given policy number.
    Many employees share the same document_no (policy number), so we try
    to narrow down to the specific person using NIC or name.

    Priority:
      1. document_no + employee_nic matches user NIC
      2. document_no + holder_name roughly matches patient name / user full name
      3. First row with that document_no (fallback)
    """
    if not policy_number:
        return None

    qs = GroupInsurance.objects.filter(document_no=policy_number)
    if not qs.exists():
        return None

    # 1. Match by NIC
    if user and getattr(user, 'nic', None):
        match = qs.filter(employee_nic__iexact=user.nic).first()
        if match:
            return match

    # 2. Match by name (holder_name or item_name contains the name word)
    for name_candidate in filter(None, [patient_name,
                                        getattr(user, 'full_name', None) if user else None,
                                        getattr(user, 'username', None) if user else None]):
        parts = name_candidate.strip().split()
        if parts:
            # Check if any word of the candidate name appears in holder_name
            q_name = Q()
            for part in parts:
                if len(part) > 2:
                    q_name |= Q(holder_name__icontains=part)
            match = qs.filter(q_name).first()
            if match:
                return match

    # 3. Fallback — first record under that policy
    return qs.first()


# ==========================================
# 1. AUTHENTICATION VIEWS
# ==========================================

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (AllowAny,)
    serializer_class = UserRegistrationSerializer

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

# ==========================================
# 2. CLAIM MANAGEMENT (CUSTOMER/BRANCH)
# ==========================================

class ClaimListCreateView(generics.ListCreateAPIView):
    serializer_class = ClaimSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        
        # If user is a Customer, show claims linked to their NIC (via Policy) OR created by them
        if user.role == 'customer' and user.nic:
            customer_policies = Policy.objects.filter(holder_nic=user.nic).values_list('policy_number', flat=True)
            return Claim.objects.filter(
                Q(user=user) | 
                Q(policy_number__in=customer_policies)
            ).distinct().order_by('-created_at')

        # If Branch/Admin/Staff, show claims they created
        return Claim.objects.filter(user=user).order_by('-created_at')

    def perform_create(self, serializer):
        # Save policy number if provided to link branch submissions to customers
        policy_num = self.request.data.get('policy_number')
        serializer.save(
            user=self.request.user,
            policy_number=policy_num
        )

# ==========================================
# 3. BRANCH PORTAL HELPERS
# ==========================================

class PolicySearchView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        query = request.query_params.get('query', '').strip()
        query_upper = query.upper()

        results = []

        # ---- Step 1: Search the Policy model ----
        base_query = Policy.objects.filter(is_active=True)

        # If user is a customer, restrict to their NIC
        if user.role == 'customer':
            if user.nic:
                base_query = base_query.filter(holder_nic__iexact=user.nic)
            else:
                return Response([])

        if not query:
            policies = base_query[:20]
        else:
            policies = base_query.filter(
                Q(policy_number__iexact=query_upper) | Q(holder_nic__iexact=query_upper)
            )

        for p in policies:
            results.append({
                'id': p.id,
                'policy_number': p.policy_number,
                'policy_type': p.policy_type,
                'holder_name': p.holder_name,
                'holder_nic': p.holder_nic,
                'opd_limit': float(p.opd_limit) if p.opd_limit else 0,
                'is_active': p.is_active,
                'source': 'policy',
            })

        # ---- Step 2: If no Policy found, search GroupInsurance (branch/admin only) ----
        if not results and query and user.role in ('branch', 'admin'):
            gi_records = GroupInsurance.objects.filter(
                Q(document_no__iexact=query) |
                Q(employee_nic__iexact=query) |
                Q(employee_number__iexact=query) |
                Q(document_no__icontains=query_upper) |
                Q(holder_name__icontains=query)
            )[:20]

            for gi in gi_records:
                results.append({
                    'id': gi.id,
                    'policy_number': gi.document_no,
                    'policy_type': f'Group - {gi.main_class or "Insurance"}',
                    'holder_name': gi.holder_name or gi.employee_number or gi.item_name or 'Unknown',
                    'holder_nic': gi.employee_nic,
                    'opd_limit': float(gi.sum_insured),
                    'is_active': True,
                    'source': 'group',
                    # Extra fields used by the frontend for group coverage display
                    'link_id': gi.link_id,
                    'employee_number': gi.employee_number,
                    'fund_type': gi.fund_type,
                    'commence_date': str(gi.commence_date) if gi.commence_date else None,
                    'premium_amount': float(gi.premium_amount),
                })

        return Response(results)

class PolicyMembersView(generics.ListAPIView):
    serializer_class = PolicyMemberSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        policy_id = self.kwargs['policy_id']
        return PolicyMember.objects.filter(policy_id=policy_id)

class DocumentUploadView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser) 

    def post(self, request, *args, **kwargs):
        serializer = ClaimDocumentSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)

# ==========================================
# 4. AI PIPELINE (THE BRAIN)
# ==========================================

class ProcessClaimPipelineView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        claim_id = request.data.get('claimId')
        manual_date_str = request.data.get('manualDate') # Date entered by the user
        
        try:
            claim = Claim.objects.get(id=claim_id)
        except Claim.DoesNotExist:
             return Response({'error': 'Claim not found'}, status=404)

        documents = claim.documents.all()
        if not documents.exists():
            return Response({'error': 'No documents found for this claim'}, status=400)

        # Save manual date early in case AI fails
        if manual_date_str:
            parsed_manual = parse_date(manual_date_str)
            if parsed_manual:
                claim.treatment_date = parsed_manual
                claim.save()

        # A. Run OCR (Gemini) on ALL documents
        print(f"--- Processing Claim {claim_id} with AI (Multiple Documents) ---")
        
        prescriptions = []
        bills = []
        
        for document in documents:
            extracted_data = extract_data(document.file)
            if extracted_data:
                doc_class = extracted_data.get('document_class', 'Bill')
                if doc_class == 'Prescription':
                    prescriptions.append(extracted_data)
                else:
                    bills.append(extracted_data)

        if not prescriptions and not bills:
            # Fallback if AI fails completely (e.g. rate limit)
            claim.ai_summary = "AI Analysis unavailable or rate limit exceeded. Pending manual review."
            claim.risk_level = "Medium"
            claim.status = "pending"
            claim.save()
            return Response({'error': 'AI could not process any of the document images'}, status=400)

        # Extract basic info for frontend display
        doctor_name = ""
        diagnosis = ""
        extracted_date_str = None

        for p in prescriptions:
            if p.get('metadata', {}).get('doctor_name'):
                doctor_name = p['metadata']['doctor_name']
            if p.get('metadata', {}).get('diagnosis'):
                diagnosis = p['metadata']['diagnosis']
            if p.get('metadata', {}).get('date'):
                extracted_date_str = p['metadata']['date']

        # Fallback to bill metadata if not in prescription
        if not doctor_name:
            for b in bills:
                if b.get('metadata', {}).get('doctor_name'):
                    doctor_name = b['metadata']['doctor_name']

        if not diagnosis:
            for b in bills:
                if b.get('metadata', {}).get('diagnosis'):
                    diagnosis = b['metadata']['diagnosis']

        if not extracted_date_str:
            for b in bills:
                if b.get('metadata', {}).get('date'):
                    extracted_date_str = b['metadata']['date']
                    break

        # Save doctor/diagnosis to dedicated columns (not just description blob)
        if doctor_name:
            claim.doctor_name = doctor_name
        if diagnosis:
            claim.diagnosis = diagnosis
        claim.description = f"Doctor: {doctor_name or 'N/A'}, Diagnosis: {diagnosis or 'N/A'}"
        
        # Priority: Manual Date from UI > AI Extracted Date
        date_to_use = manual_date_str if manual_date_str else extracted_date_str
        
        if date_to_use:
             parsed_date = parse_date(date_to_use)
             if parsed_date:
                 claim.treatment_date = parsed_date

        # B. Find Policy — correct lookup without wrong fallback
        policy = None
        gi_record = None
        if claim.policy_number:
            policy = Policy.objects.filter(policy_number=claim.policy_number).first()

        if not policy and claim.policy_number:
            # Try GroupInsurance as a fallback — match specific person by NIC first
            gi_record = get_gi_record_for_claim(claim.policy_number, claim.user, claim.patient_name)

        if not policy and not gi_record:
            # No policy found at all — still process with defaults for scoring
            from types import SimpleNamespace
            policy = SimpleNamespace(
                policy_number=claim.policy_number or 'UNKNOWN',
                holder_name=claim.patient_name or claim.user.full_name or claim.user.username,
                opd_limit=30000,
                policy_type='Unknown'
            )
        elif not policy and gi_record:
            # Build a SimpleNamespace from GroupInsurance data
            from types import SimpleNamespace
            policy = SimpleNamespace(
                policy_number=gi_record.document_no,
                holder_name=gi_record.holder_name or gi_record.employee_number or gi_record.item_name or claim.user.full_name or claim.user.username,
                opd_limit=float(gi_record.sum_insured) if gi_record.sum_insured else 30000,
                policy_type=f"Group - {gi_record.main_class or 'Insurance'}"
            )

        # C. Run Validation Logic
        # Fetch all covered member names (holder + spouse + children) for name matching
        member_names = []
        if policy and hasattr(policy, 'policy_number'):
            db_policy = Policy.objects.filter(policy_number=policy.policy_number).first()
            if db_policy:
                member_names = list(db_policy.members.values_list('member_name', flat=True))
        score, explanation = calculate_risk_score(prescriptions, bills, policy, member_names=member_names)

        # D. Determine Decision
        fraud_score = 1.0 - (score / 100.0)

        decision = "manual_review"
        risk_level = "Medium"

        if score >= 90:
            decision = "auto_approve"
            risk_level = "Low"
        elif score < 50:
            decision = "reject"
            risk_level = "High"
        # 50–90 → manual_review (default)

        # E. Run RAG Policy Knowledge Base Analysis
        from .utils.rag_engine import check_claim_against_rag, generate_ai_summary as rag_generate_summary
        import json as _json

        rag_claim_data = {
            'policy_number': claim.policy_number or '',
            'policy_type': getattr(policy, 'policy_type', 'Unknown'),
            'policy_opd_limit': float(policy.opd_limit) if getattr(policy, 'opd_limit', None) else 0,
            'policy_holder_name': getattr(policy, 'holder_name', claim.user.full_name or claim.user.username),
            'claim_type': claim.claim_type,
            'claim_amount': float(claim.claim_amount),
            'patient_name': claim.patient_name or claim.user.full_name or claim.user.username,
            'doctor_name': claim.doctor_name or doctor_name,
            'diagnosis': claim.diagnosis or diagnosis,
            'treatment_date': str(claim.treatment_date) if claim.treatment_date else '',
        }
        rag_result = check_claim_against_rag(rag_claim_data)
        claim.rag_output = _json.dumps(rag_result, ensure_ascii=False)

        # F. Generate Better AI Summary via Gemini (uses real claim + policy + RAG data)
        policy_info = {
            'holder_name': policy.holder_name,
            'opd_limit': float(policy.opd_limit) if policy.opd_limit else 0,
            'policy_type': getattr(policy, 'policy_type', 'Unknown'),
        }
        issues_list = [line.strip('- ').strip() for line in explanation.split('\n') if line.strip().startswith('-')]
        gemini_summary = rag_generate_summary(rag_claim_data, policy_info, score, issues_list, rag_result)
        claim.ai_summary = gemini_summary if gemini_summary else explanation

        # G. Save Results
        claim.validation_score = int(score)
        claim.fraud_score = round(fraud_score, 2)
        claim.risk_level = risk_level
        
        if decision == 'auto_approve':
            claim.status = 'approved'
        elif decision == 'reject':
            claim.status = 'rejected'
        else:
            claim.status = 'pending'
        
        claim.save()

        return Response({
            'success': True,
            'pipeline_results': {
                'decision': decision,
                'validation_score': claim.validation_score,
                'fraud_score': claim.fraud_score,
                'insurer_payment': claim.claim_amount if decision == "auto_approve" else 0,
                'ai_summary': claim.ai_summary,
                'submission_count': claim.submission_count,
                'attempts_remaining': max(0, 3 - claim.submission_count),
            }
        })

# ==========================================
# 5. CLAIM RESUBMISSION (CUSTOMER / BRANCH)
# ==========================================

class ResubmitClaimView(APIView):
    """Allow customer/branch to re-upload documents and retry pipeline. Max 3 attempts."""
    permission_classes = [IsAuthenticated]

    def post(self, request, claim_id):
        try:
            claim = Claim.objects.get(id=claim_id, user=request.user)
        except Claim.DoesNotExist:
            return Response({'error': 'Claim not found'}, status=404)

        if claim.status == 'approved':
            return Response({'error': 'Claim already approved — no resubmission needed.'}, status=400)

        if claim.submission_count >= 3:
            return Response({
                'error': 'Maximum resubmissions reached. This claim cannot be retried further.',
                'submission_count': claim.submission_count
            }, status=400)

        # Delete old documents so user can upload fresh ones
        claim.documents.all().delete()

        # Increment attempt and reset for fresh pipeline run
        claim.submission_count += 1
        claim.status = 'pending'
        claim.ai_summary = None
        claim.rag_output = None
        claim.validation_score = 0
        claim.fraud_score = 0.0
        claim.risk_level = 'Unknown'
        claim.save()

        return Response({
            'claim_id': claim.id,
            'submission_count': claim.submission_count,
            'attempts_remaining': 3 - claim.submission_count,
        })


# ==========================================
# 6. ADMIN DASHBOARD VIEWS
# ==========================================

class RerunRagView(APIView):
    """Lightweight endpoint: re-runs only the RAG analysis on an existing claim."""
    permission_classes = [IsAuthenticated]

    def post(self, request, claim_id):
        try:
            claim = Claim.objects.get(id=claim_id)
        except Claim.DoesNotExist:
            return Response({'error': 'Claim not found'}, status=404)

        from .utils.rag_engine import check_claim_against_rag
        import json as _json
        from types import SimpleNamespace

        # Look up policy (same logic as ProcessClaimPipelineView)
        policy = None
        gi_record = None
        if claim.policy_number:
            policy = Policy.objects.filter(policy_number=claim.policy_number).first()
        if not policy and claim.policy_number:
            # Match specific person by NIC first
            gi_record = get_gi_record_for_claim(claim.policy_number, claim.user, claim.patient_name)
        if not policy and not gi_record:
            policy = SimpleNamespace(
                policy_number=claim.policy_number or 'UNKNOWN',
                holder_name=claim.patient_name or claim.user.full_name or claim.user.username,
                opd_limit=30000,
                policy_type='Unknown'
            )
        elif not policy and gi_record:
            policy = SimpleNamespace(
                policy_number=gi_record.document_no,
                holder_name=gi_record.holder_name or gi_record.employee_number or gi_record.item_name or claim.user.full_name or claim.user.username,
                opd_limit=float(gi_record.sum_insured) if gi_record.sum_insured else 30000,
                policy_type=f"Group - {gi_record.main_class or 'Insurance'}"
            )

        rag_claim_data = {
            'policy_type': getattr(policy, 'policy_type', 'Unknown'),
            'policy_opd_limit': float(policy.opd_limit) if getattr(policy, 'opd_limit', None) else 0,
            'policy_holder_name': getattr(policy, 'holder_name', claim.user.full_name or claim.user.username),
            'claim_type': claim.claim_type,
            'claim_amount': float(claim.claim_amount),
            'patient_name': claim.patient_name or claim.user.full_name or claim.user.username,
            'doctor_name': claim.doctor_name or 'Unknown',
            'diagnosis': claim.diagnosis or 'Not specified',
            'treatment_date': str(claim.treatment_date) if claim.treatment_date else '',
        }

        rag_result = check_claim_against_rag(rag_claim_data)
        claim.rag_output = _json.dumps(rag_result, ensure_ascii=False)
        claim.save(update_fields=['rag_output'])

        return Response({'success': True, 'rag_output': rag_result})


class AdminDashboardStatsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != 'admin' and not request.user.is_staff:
            return Response({'error': 'Unauthorized'}, status=403)

        total_claims = Claim.objects.count()
        
        # --- 1. Top Row Stats (UPDATED LOGIC) ---
        # Count 'High' OR 'Medium' as risks if you want to see more numbers
        # Using __iexact ignores case (e.g., 'High' vs 'high')
        high_risk = Claim.objects.filter(Q(risk_level__iexact='High') | Q(risk_level__iexact='Medium')).count()
        
        # Fraud Alerts: Any claim with fraud score > 50% OR status flagged/suspicious
        fraud_alerts = Claim.objects.filter(fraud_score__gt=0.5).count()
        
        # Calculate Average Risk Score
        avg_val_score = Claim.objects.aggregate(Avg('validation_score'))['validation_score__avg'] or 0
        avg_risk_score = 100 - avg_val_score

        # --- 2. OCR Accuracy ---
        ocr_high = Claim.objects.filter(validation_score__gte=90).count()
        ocr_medium = Claim.objects.filter(validation_score__gte=50, validation_score__lt=90).count()
        ocr_low = Claim.objects.filter(validation_score__lt=50).count()
        avg_ocr = int(avg_val_score) 

        # --- 3. Fraud Detection ---
        fraud_flagged = Claim.objects.filter(fraud_score__gte=0.7).count()
        fraud_suspicious = Claim.objects.filter(fraud_score__gte=0.4, fraud_score__lt=0.7).count()
        fraud_clean = Claim.objects.filter(fraud_score__lt=0.4).count()

        # --- 4. Processing ---
        auto_approved = Claim.objects.filter(status='approved', risk_level__iexact='Low').count()
        rejected = Claim.objects.filter(status='rejected').count()
        pending = Claim.objects.filter(status='pending').count()
        manual_review = pending 
        
        automation_rate = 0
        if total_claims > 0:
            automation_rate = int((auto_approved / total_claims) * 100)

        return Response({
            'total_claims': total_claims,
            'high_risk': high_risk, 
            'fraud_alerts': fraud_alerts,
            'avg_risk_score': int(avg_risk_score),
            
            'avg_ocr': avg_ocr,
            'ocr_high': ocr_high,
            'ocr_medium': ocr_medium,
            'ocr_low': ocr_low,

            'fraud_flagged': fraud_flagged,
            'fraud_suspicious': fraud_suspicious,
            'fraud_clean': fraud_clean,

            'automation_rate': automation_rate,
            'auto_approved': auto_approved,
            'manual_review': manual_review,
            'pending': pending,
            'rejected': rejected
        })

class AdminClaimListView(generics.ListAPIView):
    serializer_class = ClaimSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        if self.request.user.role != 'admin' and not self.request.user.is_staff:
            return Claim.objects.none()
        
        return Claim.objects.all().order_by('-created_at')

class AdminClaimDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, claim_id):
        if request.user.role != 'admin' and not request.user.is_staff:
            return Response({'error': 'Unauthorized'}, status=403)

        claim = get_object_or_404(Claim, id=claim_id)
        
        # Look up the Policy linked to this claim
        policy = None
        policy_number_display = claim.policy_number or "N/A"
        policy_type_display = "N/A"
        policy_holder_display = "N/A"
        opd_limit_display = 0

        if claim.policy_number:
            policy = Policy.objects.filter(policy_number=claim.policy_number).first()

        if policy:
            policy_number_display = policy.policy_number
            policy_type_display = policy.policy_type
            policy_holder_display = policy.holder_name
            opd_limit_display = policy.opd_limit or 0
        elif claim.policy_number:
            # Try GroupInsurance as fallback — match specific person by NIC first
            gi = get_gi_record_for_claim(claim.policy_number, claim.user, claim.patient_name)
            if gi:
                policy_type_display = f"Group - {gi.main_class or 'Insurance'}"
                policy_holder_display = gi.holder_name or gi.employee_number or gi.item_name or "N/A"
                opd_limit_display = gi.sum_insured or 0
        
        documents = ClaimDocument.objects.filter(claim=claim)
        doc_data = [
            {'id': d.id, 'name': d.file.name.split('/')[-1], 'url': request.build_absolute_uri(d.file.url)} 
            for d in documents
        ]

        data = {
            'claim': {
                'id': claim.id,
                'reference_number': claim.reference_number,
                'status': claim.status,
                # Use stored patient_name field; fall back to user's full_name / username
                'patient_name': claim.patient_name or claim.user.full_name or claim.user.username,
                'doctor_name': claim.doctor_name or '',
                'diagnosis': claim.diagnosis or claim.description or '',
                'claim_amount': claim.claim_amount,
                'claim_type': claim.claim_type,
                'created_at': claim.created_at,
                'treatment_date': claim.treatment_date,
                'risk_level': claim.risk_level,
                'fraud_score': claim.fraud_score,
                'validation_score': claim.validation_score,
                'ai_summary': claim.ai_summary,
                'rag_output': claim.rag_output or '',
                'description': claim.description,
            },
            'policy': {
                'policy_number': policy_number_display,
                'type': policy_type_display,
                'holder': policy_holder_display,
                'opd_limit': opd_limit_display,
            },
            'documents': doc_data
        }
        return Response(data)

class AdminClaimStatusView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, claim_id):
        if request.user.role != 'admin' and not request.user.is_staff:
            return Response({'error': 'Unauthorized'}, status=403)

        claim = get_object_or_404(Claim, id=claim_id)
        action = request.data.get('action') 
        notes = request.data.get('notes', '')

        if action not in ['approved', 'rejected']:
            return Response({'error': 'Invalid action'}, status=400)

        claim.status = action
        if notes:
            # Append note to description or update ai_summary
            claim.description = (claim.description or "") + f" | Admin Note: {notes}"
        
        claim.save()
        return Response({'status': 'success', 'new_status': claim.status})

# ==========================================
# 6. CUSTOMER CLAIM DETAILS (New)
# ==========================================

class CustomerClaimDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, claim_id):
        # Allow user to see ONLY their own claims
        claim = get_object_or_404(Claim, id=claim_id)
        
        # Security Check: Is this MY claim? (Or am I an admin?)
        if claim.user != request.user and request.user.role != 'admin':
             return Response({'error': 'Unauthorized'}, status=403)

        # Find associated policy
        policy = None
        if claim.policy_number:
            policy = Policy.objects.filter(policy_number=claim.policy_number).first()

        # Get documents
        documents = ClaimDocument.objects.filter(claim=claim)
        doc_data = [{'name': d.file.name.split('/')[-1], 'url': request.build_absolute_uri(d.file.url)} for d in documents]

        data = {
            'id': claim.id,
            'reference_number': claim.reference_number,
            'status': claim.status,
            'claim_amount': claim.claim_amount,
            'claim_type': claim.claim_type,
            'created_at': claim.created_at,
            'treatment_date': claim.treatment_date,
            'description': claim.description,
            'policy_number': claim.policy_number,
            'patient_name': policy.holder_name if policy else claim.user.username,
            'ai_summary': claim.ai_summary, # Contains the AI explanation
            'risk_level': claim.risk_level, # Optional: if you want to show risk badge
            'validation_score': claim.validation_score,
            'fraud_score': claim.fraud_score,
            'documents': doc_data
        }
        return Response(data)


# ==========================================
# 6. GROUP INSURANCE & RIDERS LOOKUP
# ==========================================

class GroupInsuranceSearchView(APIView):
    """Search group insurance records by document number or link ID."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        query = request.query_params.get('query', '').strip()
        if not query:
            return Response([])
        records = GroupInsurance.objects.filter(
            Q(document_no__icontains=query) | Q(link_id__icontains=query) | Q(employee_number__icontains=query)
        )[:50]
        serializer = GroupInsuranceSerializer(records, many=True)
        return Response(serializer.data)


class GroupRidersForPolicyView(APIView):
    """Get all riders/coverage types for a given document number."""
    permission_classes = [IsAuthenticated]

    def get(self, request, document_no):
        riders = GroupRider.objects.filter(document_no=document_no)
        serializer = GroupRiderSerializer(riders, many=True)
        return Response(serializer.data)


# ---------------------------------------------------------------------------
# Dynamic RAG — Policy Rule Document management
# ---------------------------------------------------------------------------

class PolicyDocumentUploadView(APIView):
    """
    Admin uploads a OPD policy PDF.
    The PDF is saved to media/policy_pdfs/, then Gemini extracts rules.
    Extracted rules are stored in PolicyRuleDocument and used by the RAG engine.
    """
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        if request.user.role != 'admin':
            return Response({'error': 'Admin access required.'}, status=403)

        pdf_file = request.FILES.get('pdf_file')
        if not pdf_file:
            return Response({'error': 'No PDF file provided.'}, status=400)
        if not pdf_file.name.lower().endswith('.pdf'):
            return Response({'error': 'Only PDF files are supported.'}, status=400)

        # Persist the file first so we can get a real filesystem path for Gemini
        doc = PolicyRuleDocument.objects.create(
            original_pdf=pdf_file,
            extraction_status='processing',
            uploaded_by=request.user,
        )

        try:
            from .utils.pdf_policy_extractor import extract_policy_rules_from_pdf
            extracted = extract_policy_rules_from_pdf(doc.original_pdf.path)

            if not extracted:
                doc.extraction_status = 'failed'
                doc.extraction_error = 'Gemini returned no parseable JSON.'
                doc.save()
                return Response({'error': 'Could not parse policy rules from PDF.'}, status=422)

            # Populate metadata fields from extraction
            doc.policy_number = extracted.get('policy_number', '')
            doc.holder_name   = extracted.get('holder_name', '')
            doc.policy_type   = extracted.get('policy_type', 'Corporate')

            try:
                from datetime import date
                cs = extracted.get('cover_start')
                ce = extracted.get('cover_end')
                if cs:
                    doc.cover_start = date.fromisoformat(cs)
                if ce:
                    doc.cover_end = date.fromisoformat(ce)
            except Exception:
                pass   # dates are optional

            doc.extracted_rules   = extracted
            doc.extraction_status = 'success'
            doc.is_active         = True
            doc.save()

            return Response({
                'id':               doc.id,
                'policy_number':    doc.policy_number,
                'holder_name':      doc.holder_name,
                'policy_type':      doc.policy_type,
                'extraction_status': 'success',
                'message':          'Policy rules extracted and saved. New claims will use these rules.',
            }, status=201)

        except Exception as e:
            doc.extraction_status = 'failed'
            doc.extraction_error  = str(e)
            doc.save()
            return Response({'error': f'Extraction error: {str(e)}'}, status=500)


class PolicyDocumentListView(APIView):
    """List all uploaded policy rule documents (admin only)."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != 'admin':
            return Response({'error': 'Admin access required.'}, status=403)

        docs = PolicyRuleDocument.objects.all().order_by('-uploaded_at')
        data = [
            {
                'id':               d.id,
                'policy_number':    d.policy_number,
                'holder_name':      d.holder_name,
                'policy_type':      d.policy_type,
                'cover_start':      str(d.cover_start) if d.cover_start else None,
                'cover_end':        str(d.cover_end)   if d.cover_end   else None,
                'extraction_status': d.extraction_status,
                'extraction_error': d.extraction_error,
                'is_active':        d.is_active,
                'uploaded_at':      d.uploaded_at.strftime('%Y-%m-%d %H:%M'),
                'uploaded_by':      d.uploaded_by.username if d.uploaded_by else 'System',
            }
            for d in docs
        ]
        return Response(data)


class PolicyDocumentToggleView(APIView):
    """Toggle is_active on a PolicyRuleDocument (admin only)."""
    permission_classes = [IsAuthenticated]

    def patch(self, request, doc_id):
        if request.user.role != 'admin':
            return Response({'error': 'Admin access required.'}, status=403)
        try:
            doc = PolicyRuleDocument.objects.get(id=doc_id)
        except PolicyRuleDocument.DoesNotExist:
            return Response({'error': 'Not found.'}, status=404)
        doc.is_active = not doc.is_active
        doc.save()
        return Response({'id': doc.id, 'is_active': doc.is_active})


class PolicyDocumentDeleteView(APIView):
    """Delete a PolicyRuleDocument and its PDF file (admin only)."""
    permission_classes = [IsAuthenticated]

    def delete(self, request, doc_id):
        if request.user.role != 'admin':
            return Response({'error': 'Admin access required.'}, status=403)
        try:
            doc = PolicyRuleDocument.objects.get(id=doc_id)
        except PolicyRuleDocument.DoesNotExist:
            return Response({'error': 'Not found.'}, status=404)
        doc.original_pdf.delete(save=False)   # remove file from disk
        doc.delete()
        return Response(status=204)


class PolicyRuleOverlapView(APIView):
    """
    Analyse all successful PolicyRuleDocuments and return a report of
    conflicting / overlapping rules so admins can decide which to keep active.

    Detects:
      - Multiple active docs for the same policy_type (rule override conflict)
      - Duplicate policy numbers uploaded more than once
      - Cover-period overlaps for the same policy_type
      - Limit mismatches for the same policy_type (OPD, dental, spectacle, indoor)
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != 'admin':
            return Response({'error': 'Admin access required.'}, status=403)

        docs = list(PolicyRuleDocument.objects.filter(extraction_status='success').order_by('policy_type', 'uploaded_at'))

        overlaps = []

        # ── 1. Multiple active docs per policy_type ─────────────────────────
        from collections import defaultdict
        by_type_active = defaultdict(list)
        for d in docs:
            if d.is_active:
                by_type_active[d.policy_type].append(d)

        for ptype, group in by_type_active.items():
            if len(group) > 1:
                overlaps.append({
                    'type': 'multiple_active',
                    'severity': 'warning',
                    'policy_type': ptype,
                    'message': (
                        f"{len(group)} active documents share policy_type '{ptype}'. "
                        f"The most recently uploaded one wins in the RAG engine — deactivate older ones to avoid confusion."
                    ),
                    'document_ids': [d.id for d in group],
                    'documents': [
                        {'id': d.id, 'policy_number': d.policy_number, 'holder_name': d.holder_name, 'uploaded_at': d.uploaded_at.strftime('%Y-%m-%d %H:%M')}
                        for d in group
                    ],
                })

        # ── 2. Duplicate policy numbers ──────────────────────────────────────
        by_pnum = defaultdict(list)
        for d in docs:
            if d.policy_number:
                by_pnum[d.policy_number].append(d)

        for pnum, group in by_pnum.items():
            if len(group) > 1:
                overlaps.append({
                    'type': 'duplicate_policy_number',
                    'severity': 'error',
                    'policy_type': group[0].policy_type,
                    'message': (
                        f"Policy number '{pnum}' appears in {len(group)} uploaded documents. "
                        f"This is likely the same PDF uploaded multiple times."
                    ),
                    'document_ids': [d.id for d in group],
                    'documents': [
                        {'id': d.id, 'is_active': d.is_active, 'uploaded_at': d.uploaded_at.strftime('%Y-%m-%d %H:%M')}
                        for d in group
                    ],
                })

        # ── 3. Cover-period overlaps for the same policy_type ───────────────
        by_type_all = defaultdict(list)
        for d in docs:
            if d.cover_start and d.cover_end:
                by_type_all[d.policy_type].append(d)

        for ptype, group in by_type_all.items():
            for i in range(len(group)):
                for j in range(i + 1, len(group)):
                    a, b = group[i], group[j]
                    # Overlap: a.start <= b.end AND b.start <= a.end
                    if a.cover_start <= b.cover_end and b.cover_start <= a.cover_end:
                        overlaps.append({
                            'type': 'cover_period_overlap',
                            'severity': 'warning',
                            'policy_type': ptype,
                            'message': (
                                f"Cover periods overlap for policy_type '{ptype}': "
                                f"Doc #{a.id} ({a.cover_start}→{a.cover_end}) vs "
                                f"Doc #{b.id} ({b.cover_start}→{b.cover_end})."
                            ),
                            'document_ids': [a.id, b.id],
                            'documents': [
                                {'id': a.id, 'cover_start': str(a.cover_start), 'cover_end': str(a.cover_end)},
                                {'id': b.id, 'cover_start': str(b.cover_start), 'cover_end': str(b.cover_end)},
                            ],
                        })

        # ── 4. Limit mismatches for the same policy_type ────────────────────
        CLAIM_KEYS = ['opd', 'dental', 'spectacle', 'indoor']
        limit_by_type = defaultdict(dict)   # {policy_type: {claim_key: [(doc_id, limit)]}}

        for d in docs:
            ctc = (d.extracted_rules or {}).get('claim_types_covered', {})
            for key in CLAIM_KEYS:
                info = ctc.get(key, {})
                limit = info.get('annual_limit') if isinstance(info, dict) else None
                if limit is not None:
                    limit_by_type[d.policy_type].setdefault(key, []).append((d.id, limit))

        for ptype, keys in limit_by_type.items():
            for claim_key, entries in keys.items():
                unique_limits = set(v for _, v in entries)
                if len(unique_limits) > 1:
                    overlaps.append({
                        'type': 'limit_mismatch',
                        'severity': 'warning',
                        'policy_type': ptype,
                        'message': (
                            f"Conflicting '{claim_key}' annual_limit values for policy_type '{ptype}': "
                            + ', '.join(f"Doc #{did}=LKR {lim:,}" for did, lim in entries)
                            + ". Check which document has the correct schedule."
                        ),
                        'document_ids': [did for did, _ in entries],
                        'claim_key': claim_key,
                        'limits': {str(did): lim for did, lim in entries},
                    })

        # ── Summary ─────────────────────────────────────────────────────────
        return Response({
            'total_documents_analysed': len(docs),
            'overlap_count': len(overlaps),
            'has_errors':   any(o['severity'] == 'error'   for o in overlaps),
            'has_warnings': any(o['severity'] == 'warning' for o in overlaps),
            'overlaps': overlaps,
        })

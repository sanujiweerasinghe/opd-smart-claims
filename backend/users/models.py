from django.db import models
from django.contrib.auth.models import AbstractUser
from django.conf import settings

class User(AbstractUser):
    # User Roles 
    ADMIN = 'admin'
    BRANCH = 'branch'
    CUSTOMER = 'customer'

    ROLE_CHOICES = [
        (ADMIN, 'Admin'),
        (BRANCH, 'Branch Manager'),
        (CUSTOMER, 'Customer'),
    ]

    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default=CUSTOMER)
    
    # Contact Info (Updated lengths as per your request)
    phone_number = models.CharField(max_length=10, blank=True, null=True)
    nic = models.CharField(max_length=12, null=True, blank=True)
    
    # Required for registration to work
    full_name = models.CharField(max_length=255, blank=True, null=True)

    def __str__(self):
        return f"{self.username} ({self.role})"


class Claim(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]

    # RESTRICTED TO OPD, DENTAL, SPECTACLE ONLY
    TYPE_CHOICES = [
        ('opd', 'OPD (Out Patient)'),
        ('dental', 'Dental'),
        ('spectacle', 'Spectacles'),
    ]
    
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    reference_number = models.CharField(max_length=50, unique=True)
    
    # Links Branch submissions to Customers via Policy
    policy_number = models.CharField(max_length=50, blank=True, null=True)
    
    # Explicit claim fields submitted by branch staff
    patient_name = models.CharField(max_length=255, blank=True, null=True)
    doctor_name = models.CharField(max_length=255, blank=True, null=True)
    diagnosis = models.TextField(blank=True, null=True)
    
    claim_type = models.CharField(max_length=50, choices=TYPE_CHOICES, default='opd')
    claim_amount = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    
    # Description handles Doctor Name, Diagnosis etc.
    description = models.TextField(blank=True, null=True)
    
    # AI Pipeline Fields
    ai_summary = models.TextField(blank=True, null=True)
    rag_output = models.TextField(blank=True, null=True)  # JSON string from RAG analysis
    validation_score = models.IntegerField(default=0)
    fraud_score = models.FloatField(default=0.0)
    risk_level = models.CharField(max_length=20, default='Unknown')
    
    treatment_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    submission_count = models.IntegerField(default=1)

    def __str__(self):
        return self.reference_number


class Policy(models.Model):
    TYPE_CHOICES = [
        ('Individual Health', 'Individual Health'),
        ('Family Floater', 'Family Floater'),
        ('Corporate', 'Corporate'),
        ('Senior Citizen', 'Senior Citizen'),
    ]

    policy_number = models.CharField(max_length=50, unique=True)
    policy_type = models.CharField(max_length=50, choices=TYPE_CHOICES, default='Individual Health')
    holder_name = models.CharField(max_length=255)
    holder_nic = models.CharField(max_length=12, blank=True, null=True)
    
    # ONLY OPD Limit remains
    opd_limit = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)
    
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.policy_number


class PolicyMember(models.Model):
    RELATIONSHIP_CHOICES = [
        ('Self', 'Self'),
        ('Spouse', 'Spouse'),
        ('Child', 'Child'),
        ('Parent', 'Parent'),
    ]

    BANK_CHOICES = [
        ('BOC', 'Bank of Ceylon'),
        ('Peoples', "People's Bank"),
        ('Commercial', 'Commercial Bank'),
        ('HNB', 'Hatton National Bank'),
        ('Sampath', 'Sampath Bank'),
        ('Seylan', 'Seylan Bank'),
        ('NDB', 'National Development Bank'),
        ('NTB', 'Nations Trust Bank'),
        ('DFCC', 'DFCC Bank'),
        ('Pan Asia', 'Pan Asia Bank'),
        ('Union', 'Union Bank'),
        ('NSB', 'National Savings Bank'),
    ]

    policy = models.ForeignKey(Policy, related_name='members', on_delete=models.CASCADE)
    member_name = models.CharField(max_length=255)
    relationship = models.CharField(max_length=50, choices=RELATIONSHIP_CHOICES, default='Self')
    date_of_birth = models.DateField(null=True, blank=True)
    mobile_number = models.CharField(max_length=10, blank=True, null=True)
    
    # Bank Details
    bank_name = models.CharField(max_length=100, choices=BANK_CHOICES, default='BOC')
    account_number = models.CharField(max_length=15) 

    def __str__(self):
        return f"{self.member_name} ({self.relationship})"


class ClaimDocument(models.Model):
    claim = models.ForeignKey(Claim, related_name='documents', on_delete=models.CASCADE)
    file = models.FileField(upload_to='claim_documents/')
    uploaded_at = models.DateTimeField(auto_now_add=True)


class MedicineMaster(models.Model):
    brand_name = models.CharField(max_length=255, db_index=True)
    generic_name = models.TextField(blank=True, null=True)
    category = models.CharField(max_length=100)
    is_payable = models.BooleanField(default=True)

    def __str__(self):
        return self.brand_name


class PolicyRuleDocument(models.Model):
    """
    Stores a OPD policy PDF uploaded by an admin and the rules
    Gemini extracted from it. The RAG engine reads active records from
    this table instead of (or in addition to) the static JSON file.
    """
    EXTRACTION_STATUS_CHOICES = [
        ('pending',    'Pending'),
        ('processing', 'Processing'),
        ('success',    'Success'),
        ('failed',     'Failed'),
    ]

    POLICY_TYPE_CHOICES = [
        ('Individual Health', 'Individual Health'),
        ('Family Floater',    'Family Floater'),
        ('Corporate',         'Corporate'),
        ('Senior Citizen',    'Senior Citizen'),
        ('Unknown',           'Unknown'),
    ]

    # Metadata populated from Gemini extraction
    policy_number = models.CharField(max_length=100, blank=True)
    holder_name   = models.CharField(max_length=255, blank=True)
    policy_type   = models.CharField(max_length=50, choices=POLICY_TYPE_CHOICES, default='Corporate')
    cover_start   = models.DateField(null=True, blank=True)
    cover_end     = models.DateField(null=True, blank=True)

    # The original uploaded PDF
    original_pdf  = models.FileField(upload_to='policy_pdfs/')

    # Full extracted rules as a JSON object
    extracted_rules    = models.JSONField(null=True, blank=True)
    extraction_status  = models.CharField(max_length=20, choices=EXTRACTION_STATUS_CHOICES, default='pending')
    extraction_error   = models.TextField(blank=True)

    # Controls whether this document feeds the RAG engine
    is_active    = models.BooleanField(default=True)
    uploaded_at  = models.DateTimeField(auto_now_add=True)
    uploaded_by  = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
    )

    class Meta:
        ordering = ['-uploaded_at']

    def __str__(self):
        return f"{self.policy_number or 'Unknown'} — {self.holder_name or 'Unknown'}"


# --- UPDATED MODELS FOR EXCEL IMPORT ---

class GroupInsurance(models.Model):
    document_no = models.CharField(max_length=100, null=True, blank=True)
    main_class = models.CharField(max_length=100, null=True, blank=True)
    commence_date = models.DateField(null=True, blank=True)
    sum_insured = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    fund_type = models.CharField(max_length=100, null=True, blank=True)
    item_name = models.CharField(max_length=255, null=True, blank=True)
    holder_name = models.CharField(max_length=255, null=True, blank=True)  # Generated full name
    employee_number = models.CharField(max_length=100, null=True, blank=True)
    employee_nic = models.CharField(max_length=20, null=True, blank=True)
    premium_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    sex = models.CharField(max_length=10, null=True, blank=True)
    link_id = models.CharField(max_length=100, null=True, blank=True)

    def __str__(self):
        return f"{self.document_no} - {self.holder_name or self.item_name}"

class GroupRider(models.Model):
    document_no = models.CharField(max_length=100, null=True, blank=True)
    type = models.CharField(max_length=100, null=True, blank=True)
    sum_insured = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    foreign_sum_insured = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    premium_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    foreign_premium_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    annual_premium_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    foreign_annual_premium_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    category = models.CharField(max_length=100, null=True, blank=True)
    commence_date = models.DateField(null=True, blank=True)
    link_id = models.CharField(max_length=100, null=True, blank=True)

    def __str__(self):
        return f"{self.type} - {self.document_no}"
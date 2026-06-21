from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, Claim, Policy, PolicyMember, ClaimDocument, MedicineMaster, GroupInsurance, GroupRider, PolicyRuleDocument

# 1. Custom User Admin Configuration
# This ensures you can see/edit the 'Role' and 'Phone Number' in the Admin Panel
class CustomUserAdmin(UserAdmin):
    model = User
    list_display = ['username', 'email', 'role', 'is_staff']
    
    fieldsets = UserAdmin.fieldsets + (
        ('Custom Fields', {'fields': ('role', 'phone_number')}),
    )
    
    add_fieldsets = UserAdmin.add_fieldsets + (
        ('Custom Fields', {'fields': ('role', 'phone_number')}),
    )

# 2. Claim Admin Configuration
@admin.register(Claim)
class ClaimAdmin(admin.ModelAdmin):
    list_display = ('reference_number', 'user', 'claim_type', 'claim_amount', 'status', 'created_at')
    list_filter = ('status', 'claim_type')
    search_fields = ('reference_number', 'user__username')

# 3. Policy Configuration
# This allows you to add Members directly inside the Policy page
class PolicyMemberInline(admin.TabularInline):
    model = PolicyMember
    extra = 1

@admin.register(Policy)
class PolicyAdmin(admin.ModelAdmin):
    list_display = ('policy_number', 'holder_name', 'holder_nic', 'policy_type', 'is_active')
    search_fields = ('policy_number', 'holder_nic')
    inlines = [PolicyMemberInline] 

# 4. Document Configuration
@admin.register(ClaimDocument)
class ClaimDocumentAdmin(admin.ModelAdmin):
    list_display = ('claim', 'file', 'uploaded_at')

# 5. Medicine Master Configuration (NEW)
@admin.register(MedicineMaster)
class MedicineMasterAdmin(admin.ModelAdmin):
    list_display = ('brand_name', 'generic_name', 'category', 'is_payable')
    list_filter = ('category', 'is_payable')
    search_fields = ('brand_name', 'generic_name')

# Registering the User model
admin.site.register(User, CustomUserAdmin)

# 6. Group Insurance
@admin.register(GroupInsurance)
class GroupInsuranceAdmin(admin.ModelAdmin):
    list_display = ('document_no', 'holder_name', 'employee_nic', 'item_name', 'main_class', 'fund_type', 'sum_insured', 'premium_amount', 'sex', 'commence_date')
    search_fields = ('document_no', 'holder_name', 'employee_nic', 'item_name', 'employee_number', 'link_id')
    list_filter = ('main_class', 'fund_type', 'sex')

# 7. Group Riders
@admin.register(GroupRider)
class GroupRiderAdmin(admin.ModelAdmin):
    list_display = ('document_no', 'type', 'category', 'sum_insured', 'premium_amount', 'annual_premium_amount', 'commence_date')
    search_fields = ('document_no', 'link_id')
    list_filter = ('type', 'category')


# 8. Policy Rule Documents (Dynamic RAG)
@admin.register(PolicyRuleDocument)
class PolicyRuleDocumentAdmin(admin.ModelAdmin):
    list_display  = ('policy_number', 'holder_name', 'policy_type', 'extraction_status', 'is_active', 'uploaded_at', 'uploaded_by')
    list_filter   = ('policy_type', 'extraction_status', 'is_active')
    search_fields = ('policy_number', 'holder_name')
    readonly_fields = ('extracted_rules', 'extraction_error', 'uploaded_at', 'uploaded_by')
    list_editable  = ('is_active',)

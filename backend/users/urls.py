from django.urls import path
from .views import (
    RegisterView,
    CustomTokenObtainPairView,
    ClaimListCreateView,
    PolicySearchView,
    PolicyMembersView,
    DocumentUploadView,
    ProcessClaimPipelineView,
    RerunRagView,
    ResubmitClaimView,
    AdminDashboardStatsView, 
    AdminClaimListView, 
    AdminClaimDetailView,
    AdminClaimStatusView,
    CustomerClaimDetailView,
    GroupInsuranceSearchView,
    GroupRidersForPolicyView,
    PolicyDocumentUploadView,
    PolicyDocumentListView,
    PolicyDocumentToggleView,
    PolicyDocumentDeleteView,
    PolicyRuleOverlapView,
)
from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [
    # Auth
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # Customer/Branch Claims
    path('claims/', ClaimListCreateView.as_view(), name='claims'),
    
    # AI Pipeline
    path('claims/process/', ProcessClaimPipelineView.as_view(), name='process-claim'),
    path('claims/<int:claim_id>/rerun-rag/', RerunRagView.as_view(), name='rerun-rag'),
    path('claims/<int:claim_id>/resubmit/', ResubmitClaimView.as_view(), name='resubmit-claim'),

    # Branch Portal Helper Endpoints
    path('policies/search/', PolicySearchView.as_view(), name='policy-search'),
    path('policies/<int:policy_id>/members/', PolicyMembersView.as_view(), name='policy-members'),
    path('documents/upload/', DocumentUploadView.as_view(), name='document-upload'),

    # Admin Dashboard Endpoints
    path('admin/stats/', AdminDashboardStatsView.as_view(), name='admin-stats'),
    path('admin/claims/', AdminClaimListView.as_view(), name='admin-claims'),
    
    # The Details View
    path('admin/claims/<int:claim_id>/', AdminClaimDetailView.as_view(), name='admin-claim-detail'),
    path('admin/claims/<int:claim_id>/status/', AdminClaimStatusView.as_view(), name='admin-claim-status'),
    
    
    path('claims/<int:claim_id>/', CustomerClaimDetailView.as_view(), name='customer-claim-detail'),

    # Group Insurance Endpoints
    path('group/search/', GroupInsuranceSearchView.as_view(), name='group-search'),
    path('group/<str:document_no>/riders/', GroupRidersForPolicyView.as_view(), name='group-riders'),

    # Dynamic RAG — Policy Rule Documents
    path('admin/policy-rules/', PolicyDocumentListView.as_view(), name='policy-rules-list'),
    path('admin/policy-rules/upload/', PolicyDocumentUploadView.as_view(), name='policy-rules-upload'),
    path('admin/policy-rules/overlaps/', PolicyRuleOverlapView.as_view(), name='policy-rules-overlaps'),
    path('admin/policy-rules/<int:doc_id>/toggle/', PolicyDocumentToggleView.as_view(), name='policy-rules-toggle'),
    path('admin/policy-rules/<int:doc_id>/', PolicyDocumentDeleteView.as_view(), name='policy-rules-delete'),
]
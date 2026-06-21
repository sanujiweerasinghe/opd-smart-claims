from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import get_user_model
from .models import Claim, Policy, PolicyMember, ClaimDocument, GroupInsurance, GroupRider

User = get_user_model()

# 1. User Registration (Signup)
class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'role', 'nic', 'full_name', 'phone_number']

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email'),
            password=validated_data['password'],
            role=validated_data.get('role', 'customer'),
            nic=validated_data.get('nic', ''),
            full_name=validated_data.get('full_name', ''),
            phone_number=validated_data.get('phone_number', '')
        )
        return user

# 2. Custom Login Response (JWT + User Info)
class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        # Add extra responses to the token payload
        data['id'] = self.user.id
        data['role'] = self.user.role
        data['username'] = self.user.username
        data['email'] = self.user.email
        data['full_name'] = self.user.full_name
        return data

# 3. Claim Serializer
class ClaimSerializer(serializers.ModelSerializer):
    class Meta:
        model = Claim
        fields = '__all__'
        read_only_fields = ['user', 'created_at', 'status', 'validation_score', 'fraud_score', 'ai_summary', 'risk_level']
# 4. Branch Portal Helpers
class PolicyMemberSerializer(serializers.ModelSerializer):
    class Meta:
        model = PolicyMember
        fields = '__all__'

class PolicySerializer(serializers.ModelSerializer):
    members = PolicyMemberSerializer(many=True, read_only=True)
    class Meta:
        model = Policy
        fields = '__all__'

class ClaimDocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClaimDocument
        fields = ['id', 'claim', 'file', 'uploaded_at']

class GroupInsuranceSerializer(serializers.ModelSerializer):
    class Meta:
        model = GroupInsurance
        fields = ['id', 'document_no', 'item_name', 'main_class', 'fund_type', 'sum_insured', 'premium_amount', 'sex', 'employee_number', 'commence_date', 'link_id']

class GroupRiderSerializer(serializers.ModelSerializer):
    class Meta:
        model = GroupRider
        fields = ['id', 'document_no', 'type', 'category', 'sum_insured', 'annual_premium_amount', 'commence_date', 'link_id']
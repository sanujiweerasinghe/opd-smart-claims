export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      claim_documents: {
        Row: {
          claim_id: string
          created_at: string
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id: string
          ocr_confidence: number | null
          ocr_extracted_text: string | null
        }
        Insert: {
          claim_id: string
          created_at?: string
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id?: string
          ocr_confidence?: number | null
          ocr_extracted_text?: string | null
        }
        Update: {
          claim_id?: string
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number
          file_type?: string
          id?: string
          ocr_confidence?: number | null
          ocr_extracted_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "claim_documents_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "claims"
            referencedColumns: ["id"]
          },
        ]
      }
      claim_exclusion_keywords: {
        Row: {
          category: string
          created_at: string | null
          exception_condition: string | null
          id: string
          is_active: boolean | null
          keyword: string
        }
        Insert: {
          category: string
          created_at?: string | null
          exception_condition?: string | null
          id?: string
          is_active?: boolean | null
          keyword: string
        }
        Update: {
          category?: string
          created_at?: string | null
          exception_condition?: string | null
          id?: string
          is_active?: boolean | null
          keyword?: string
        }
        Relationships: []
      }
      claim_history: {
        Row: {
          action: string
          claim_id: string
          created_at: string
          id: string
          new_status: Database["public"]["Enums"]["claim_status"] | null
          notes: string | null
          performed_by: string | null
          previous_status: Database["public"]["Enums"]["claim_status"] | null
        }
        Insert: {
          action: string
          claim_id: string
          created_at?: string
          id?: string
          new_status?: Database["public"]["Enums"]["claim_status"] | null
          notes?: string | null
          performed_by?: string | null
          previous_status?: Database["public"]["Enums"]["claim_status"] | null
        }
        Update: {
          action?: string
          claim_id?: string
          created_at?: string
          id?: string
          new_status?: Database["public"]["Enums"]["claim_status"] | null
          notes?: string | null
          performed_by?: string | null
          previous_status?: Database["public"]["Enums"]["claim_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "claim_history_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "claims"
            referencedColumns: ["id"]
          },
        ]
      }
      claim_ocr_results: {
        Row: {
          ai_keywords_found: string[] | null
          claim_id: string
          created_at: string
          document_id: string | null
          document_type: Database["public"]["Enums"]["ai_document_type"] | null
          extracted_entities: Json | null
          id: string
          is_handwritten: boolean | null
          language_detected: string | null
          manual_verification_required: boolean | null
          ocr_confidence: number | null
          raw_text: string | null
          reupload_attempts: number | null
          status: string | null
        }
        Insert: {
          ai_keywords_found?: string[] | null
          claim_id: string
          created_at?: string
          document_id?: string | null
          document_type?: Database["public"]["Enums"]["ai_document_type"] | null
          extracted_entities?: Json | null
          id?: string
          is_handwritten?: boolean | null
          language_detected?: string | null
          manual_verification_required?: boolean | null
          ocr_confidence?: number | null
          raw_text?: string | null
          reupload_attempts?: number | null
          status?: string | null
        }
        Update: {
          ai_keywords_found?: string[] | null
          claim_id?: string
          created_at?: string
          document_id?: string | null
          document_type?: Database["public"]["Enums"]["ai_document_type"] | null
          extracted_entities?: Json | null
          id?: string
          is_handwritten?: boolean | null
          language_detected?: string | null
          manual_verification_required?: boolean | null
          ocr_confidence?: number | null
          raw_text?: string | null
          reupload_attempts?: number | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "claim_ocr_results_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "claims"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claim_ocr_results_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "claim_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      claim_validations: {
        Row: {
          billing_policy_score: number | null
          claim_id: string
          co_payment_amount: number | null
          coverage_details: Json | null
          created_at: string
          detected_claim_type: Database["public"]["Enums"]["claim_type"] | null
          diagnosis_treatment_score: number | null
          exclusions_found: string[] | null
          id: string
          mandatory_documents_status: Json | null
          max_payable_amount: number | null
          member_verified: boolean | null
          missing_documents: string[] | null
          overall_validation_score: number | null
          policy_verified: boolean | null
          prescription_bill_score: number | null
          prescription_diagnosis_score: number | null
          previous_claims_total: number | null
          remaining_coverage: number | null
          updated_at: string
          validation_issues: string[] | null
          workflow_action: string | null
        }
        Insert: {
          billing_policy_score?: number | null
          claim_id: string
          co_payment_amount?: number | null
          coverage_details?: Json | null
          created_at?: string
          detected_claim_type?: Database["public"]["Enums"]["claim_type"] | null
          diagnosis_treatment_score?: number | null
          exclusions_found?: string[] | null
          id?: string
          mandatory_documents_status?: Json | null
          max_payable_amount?: number | null
          member_verified?: boolean | null
          missing_documents?: string[] | null
          overall_validation_score?: number | null
          policy_verified?: boolean | null
          prescription_bill_score?: number | null
          prescription_diagnosis_score?: number | null
          previous_claims_total?: number | null
          remaining_coverage?: number | null
          updated_at?: string
          validation_issues?: string[] | null
          workflow_action?: string | null
        }
        Update: {
          billing_policy_score?: number | null
          claim_id?: string
          co_payment_amount?: number | null
          coverage_details?: Json | null
          created_at?: string
          detected_claim_type?: Database["public"]["Enums"]["claim_type"] | null
          diagnosis_treatment_score?: number | null
          exclusions_found?: string[] | null
          id?: string
          mandatory_documents_status?: Json | null
          max_payable_amount?: number | null
          member_verified?: boolean | null
          missing_documents?: string[] | null
          overall_validation_score?: number | null
          policy_verified?: boolean | null
          prescription_bill_score?: number | null
          prescription_diagnosis_score?: number | null
          previous_claims_total?: number | null
          remaining_coverage?: number | null
          updated_at?: string
          validation_issues?: string[] | null
          workflow_action?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "claim_validations_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "claims"
            referencedColumns: ["id"]
          },
        ]
      }
      claims: {
        Row: {
          account_number: string | null
          admin_notes: string | null
          admission_date: string | null
          ai_summary: string | null
          approved_amount: number | null
          bank_name: string | null
          bill_amount: number | null
          claim_amount: number
          claim_type: Database["public"]["Enums"]["claim_type"]
          created_at: string
          date_of_treatment: string | null
          diagnosis: string | null
          discharge_date: string | null
          doctor_name: string | null
          doctor_slmc_no: string | null
          documents_pending_deadline: string | null
          fraud_flags: number | null
          fraud_status: string | null
          hospital_name: string | null
          hospitalization_type:
            | Database["public"]["Enums"]["hospitalization_type"]
            | null
          id: string
          member_id: string | null
          mobile_number: string | null
          ocr_confidence: number | null
          ocr_level: string | null
          policy_id: string | null
          policy_number: string
          procedure_name: string | null
          processed_at: string | null
          processing_status:
            | Database["public"]["Enums"]["processing_status"]
            | null
          reference_number: string
          rejection_reason: string | null
          relationship: Database["public"]["Enums"]["relationship_type"]
          risk_level: string | null
          risk_score: number | null
          room_category: string | null
          settled_amount: number | null
          status: Database["public"]["Enums"]["claim_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          account_number?: string | null
          admin_notes?: string | null
          admission_date?: string | null
          ai_summary?: string | null
          approved_amount?: number | null
          bank_name?: string | null
          bill_amount?: number | null
          claim_amount: number
          claim_type: Database["public"]["Enums"]["claim_type"]
          created_at?: string
          date_of_treatment?: string | null
          diagnosis?: string | null
          discharge_date?: string | null
          doctor_name?: string | null
          doctor_slmc_no?: string | null
          documents_pending_deadline?: string | null
          fraud_flags?: number | null
          fraud_status?: string | null
          hospital_name?: string | null
          hospitalization_type?:
            | Database["public"]["Enums"]["hospitalization_type"]
            | null
          id?: string
          member_id?: string | null
          mobile_number?: string | null
          ocr_confidence?: number | null
          ocr_level?: string | null
          policy_id?: string | null
          policy_number: string
          procedure_name?: string | null
          processed_at?: string | null
          processing_status?:
            | Database["public"]["Enums"]["processing_status"]
            | null
          reference_number: string
          rejection_reason?: string | null
          relationship: Database["public"]["Enums"]["relationship_type"]
          risk_level?: string | null
          risk_score?: number | null
          room_category?: string | null
          settled_amount?: number | null
          status?: Database["public"]["Enums"]["claim_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          account_number?: string | null
          admin_notes?: string | null
          admission_date?: string | null
          ai_summary?: string | null
          approved_amount?: number | null
          bank_name?: string | null
          bill_amount?: number | null
          claim_amount?: number
          claim_type?: Database["public"]["Enums"]["claim_type"]
          created_at?: string
          date_of_treatment?: string | null
          diagnosis?: string | null
          discharge_date?: string | null
          doctor_name?: string | null
          doctor_slmc_no?: string | null
          documents_pending_deadline?: string | null
          fraud_flags?: number | null
          fraud_status?: string | null
          hospital_name?: string | null
          hospitalization_type?:
            | Database["public"]["Enums"]["hospitalization_type"]
            | null
          id?: string
          member_id?: string | null
          mobile_number?: string | null
          ocr_confidence?: number | null
          ocr_level?: string | null
          policy_id?: string | null
          policy_number?: string
          procedure_name?: string | null
          processed_at?: string | null
          processing_status?:
            | Database["public"]["Enums"]["processing_status"]
            | null
          reference_number?: string
          rejection_reason?: string | null
          relationship?: Database["public"]["Enums"]["relationship_type"]
          risk_level?: string | null
          risk_score?: number | null
          room_category?: string | null
          settled_amount?: number | null
          status?: Database["public"]["Enums"]["claim_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "claims_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "policy_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claims_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "policies"
            referencedColumns: ["id"]
          },
        ]
      }
      corporate_policies: {
        Row: {
          claim_submission_deadline_days: number | null
          company_name: string
          created_at: string | null
          id: string
          is_active: boolean | null
          policy_end_date: string
          policy_number: string
          policy_start_date: string
          spectacle_claim_interval_years: number | null
          updated_at: string | null
        }
        Insert: {
          claim_submission_deadline_days?: number | null
          company_name: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          policy_end_date: string
          policy_number: string
          policy_start_date: string
          spectacle_claim_interval_years?: number | null
          updated_at?: string | null
        }
        Update: {
          claim_submission_deadline_days?: number | null
          company_name?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          policy_end_date?: string
          policy_number?: string
          policy_start_date?: string
          spectacle_claim_interval_years?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      corporate_policy_members: {
        Row: {
          corporate_policy_id: string
          created_at: string | null
          date_of_birth: string | null
          dental_used: number | null
          employee_id_number: string | null
          employee_name: string
          employee_nic: string | null
          hospitalization_used: number | null
          id: string
          is_active: boolean | null
          last_spectacle_claim_date: string | null
          opd_used: number | null
          relationship: string | null
          scheme_id: string
          spectacles_used: number | null
          updated_at: string | null
        }
        Insert: {
          corporate_policy_id: string
          created_at?: string | null
          date_of_birth?: string | null
          dental_used?: number | null
          employee_id_number?: string | null
          employee_name: string
          employee_nic?: string | null
          hospitalization_used?: number | null
          id?: string
          is_active?: boolean | null
          last_spectacle_claim_date?: string | null
          opd_used?: number | null
          relationship?: string | null
          scheme_id: string
          spectacles_used?: number | null
          updated_at?: string | null
        }
        Update: {
          corporate_policy_id?: string
          created_at?: string | null
          date_of_birth?: string | null
          dental_used?: number | null
          employee_id_number?: string | null
          employee_name?: string
          employee_nic?: string | null
          hospitalization_used?: number | null
          id?: string
          is_active?: boolean | null
          last_spectacle_claim_date?: string | null
          opd_used?: number | null
          relationship?: string | null
          scheme_id?: string
          spectacles_used?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "corporate_policy_members_corporate_policy_id_fkey"
            columns: ["corporate_policy_id"]
            isOneToOne: false
            referencedRelation: "corporate_policies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "corporate_policy_members_scheme_id_fkey"
            columns: ["scheme_id"]
            isOneToOne: false
            referencedRelation: "corporate_policy_schemes"
            referencedColumns: ["id"]
          },
        ]
      }
      corporate_policy_schemes: {
        Row: {
          annual_limit: number | null
          corporate_policy_id: string
          created_at: string | null
          dental_limit: number | null
          hospitalization_limit: number | null
          id: string
          opd_limit: number | null
          scheme_name: string
          spectacles_limit: number | null
        }
        Insert: {
          annual_limit?: number | null
          corporate_policy_id: string
          created_at?: string | null
          dental_limit?: number | null
          hospitalization_limit?: number | null
          id?: string
          opd_limit?: number | null
          scheme_name: string
          spectacles_limit?: number | null
        }
        Update: {
          annual_limit?: number | null
          corporate_policy_id?: string
          created_at?: string | null
          dental_limit?: number | null
          hospitalization_limit?: number | null
          id?: string
          opd_limit?: number | null
          scheme_name?: string
          spectacles_limit?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "corporate_policy_schemes_corporate_policy_id_fkey"
            columns: ["corporate_policy_id"]
            isOneToOne: false
            referencedRelation: "corporate_policies"
            referencedColumns: ["id"]
          },
        ]
      }
      disease_medicine_mapping: {
        Row: {
          created_at: string
          disease_keywords: string[] | null
          disease_name: string
          excluded_medicines: string[] | null
          id: string
          recommended_medicines: string[] | null
        }
        Insert: {
          created_at?: string
          disease_keywords?: string[] | null
          disease_name: string
          excluded_medicines?: string[] | null
          id?: string
          recommended_medicines?: string[] | null
        }
        Update: {
          created_at?: string
          disease_keywords?: string[] | null
          disease_name?: string
          excluded_medicines?: string[] | null
          id?: string
          recommended_medicines?: string[] | null
        }
        Relationships: []
      }
      fraud_detection_results: {
        Row: {
          alerts: string[] | null
          amount_deviation_percentage: number | null
          anomaly_score: number | null
          claim_id: string
          created_at: string
          duplicate_claim_ids: string[] | null
          duplicate_content_match: boolean | null
          duplicate_hash_match: boolean | null
          duplicate_similarity_score: number | null
          fraud_score: number | null
          historical_baseline: Json | null
          id: string
          llm_analysis: string | null
          provider_claim_frequency: number | null
          stay_deviation_days: number | null
          workflow_action: string | null
        }
        Insert: {
          alerts?: string[] | null
          amount_deviation_percentage?: number | null
          anomaly_score?: number | null
          claim_id: string
          created_at?: string
          duplicate_claim_ids?: string[] | null
          duplicate_content_match?: boolean | null
          duplicate_hash_match?: boolean | null
          duplicate_similarity_score?: number | null
          fraud_score?: number | null
          historical_baseline?: Json | null
          id?: string
          llm_analysis?: string | null
          provider_claim_frequency?: number | null
          stay_deviation_days?: number | null
          workflow_action?: string | null
        }
        Update: {
          alerts?: string[] | null
          amount_deviation_percentage?: number | null
          anomaly_score?: number | null
          claim_id?: string
          created_at?: string
          duplicate_claim_ids?: string[] | null
          duplicate_content_match?: boolean | null
          duplicate_hash_match?: boolean | null
          duplicate_similarity_score?: number | null
          fraud_score?: number | null
          historical_baseline?: Json | null
          id?: string
          llm_analysis?: string | null
          provider_claim_frequency?: number | null
          stay_deviation_days?: number | null
          workflow_action?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fraud_detection_results_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "claims"
            referencedColumns: ["id"]
          },
        ]
      }
      medicine_database: {
        Row: {
          brand_name: string
          category: string | null
          created_at: string
          generic_name: string
          id: string
          is_cosmetic: boolean | null
          is_covered: boolean | null
          is_vitamin: boolean | null
          source: string | null
        }
        Insert: {
          brand_name: string
          category?: string | null
          created_at?: string
          generic_name: string
          id?: string
          is_cosmetic?: boolean | null
          is_covered?: boolean | null
          is_vitamin?: boolean | null
          source?: string | null
        }
        Update: {
          brand_name?: string
          category?: string | null
          created_at?: string
          generic_name?: string
          id?: string
          is_cosmetic?: boolean | null
          is_covered?: boolean | null
          is_vitamin?: boolean | null
          source?: string | null
        }
        Relationships: []
      }
      policies: {
        Row: {
          annual_top_up: number | null
          co_payment_percentage: number | null
          created_at: string
          deductible_amount: number | null
          exclusions: Json | null
          floater_limit: number | null
          holder_name: string
          holder_nic: string
          hospitalization_limit: number | null
          id: string
          is_active: boolean | null
          no_claim_bonus: number | null
          opd_limit: number | null
          policy_end_date: string
          policy_number: string
          policy_start_date: string
          policy_type: Database["public"]["Enums"]["policy_type"]
          room_category: string | null
          special_covers: Json | null
          updated_at: string
          warranty_period_days: number | null
        }
        Insert: {
          annual_top_up?: number | null
          co_payment_percentage?: number | null
          created_at?: string
          deductible_amount?: number | null
          exclusions?: Json | null
          floater_limit?: number | null
          holder_name: string
          holder_nic: string
          hospitalization_limit?: number | null
          id?: string
          is_active?: boolean | null
          no_claim_bonus?: number | null
          opd_limit?: number | null
          policy_end_date: string
          policy_number: string
          policy_start_date: string
          policy_type: Database["public"]["Enums"]["policy_type"]
          room_category?: string | null
          special_covers?: Json | null
          updated_at?: string
          warranty_period_days?: number | null
        }
        Update: {
          annual_top_up?: number | null
          co_payment_percentage?: number | null
          created_at?: string
          deductible_amount?: number | null
          exclusions?: Json | null
          floater_limit?: number | null
          holder_name?: string
          holder_nic?: string
          hospitalization_limit?: number | null
          id?: string
          is_active?: boolean | null
          no_claim_bonus?: number | null
          opd_limit?: number | null
          policy_end_date?: string
          policy_number?: string
          policy_start_date?: string
          policy_type?: Database["public"]["Enums"]["policy_type"]
          room_category?: string | null
          special_covers?: Json | null
          updated_at?: string
          warranty_period_days?: number | null
        }
        Relationships: []
      }
      policy_members: {
        Row: {
          account_number: string | null
          bank_name: string | null
          created_at: string
          date_of_birth: string | null
          gender: string | null
          id: string
          is_primary: boolean | null
          member_name: string
          member_nic: string | null
          mobile_number: string | null
          policy_id: string
          relationship: Database["public"]["Enums"]["relationship_type"]
        }
        Insert: {
          account_number?: string | null
          bank_name?: string | null
          created_at?: string
          date_of_birth?: string | null
          gender?: string | null
          id?: string
          is_primary?: boolean | null
          member_name: string
          member_nic?: string | null
          mobile_number?: string | null
          policy_id: string
          relationship: Database["public"]["Enums"]["relationship_type"]
        }
        Update: {
          account_number?: string | null
          bank_name?: string | null
          created_at?: string
          date_of_birth?: string | null
          gender?: string | null
          id?: string
          is_primary?: boolean | null
          member_name?: string
          member_nic?: string | null
          mobile_number?: string | null
          policy_id?: string
          relationship?: Database["public"]["Enums"]["relationship_type"]
        }
        Relationships: [
          {
            foreignKeyName: "policy_members_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "policies"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          nic: string | null
          portal: Database["public"]["Enums"]["user_portal"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          nic?: string | null
          portal?: Database["public"]["Enums"]["user_portal"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          nic?: string | null
          portal?: Database["public"]["Enums"]["user_portal"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      settlement_calculations: {
        Row: {
          approval_letter_generated: boolean | null
          claim_id: string
          co_payment_amount: number | null
          co_payment_percentage: number | null
          covered_items: Json | null
          created_at: string
          decision: string | null
          decision_reason: string | null
          deductible_amount: number | null
          id: string
          insurer_payment: number | null
          max_payable_amount: number | null
          non_covered_items: Json | null
          policy_limit: number | null
          previous_claims_total: number | null
          remaining_coverage: number | null
          settlement_date: string | null
          updated_at: string
          validated_billed_total: number | null
        }
        Insert: {
          approval_letter_generated?: boolean | null
          claim_id: string
          co_payment_amount?: number | null
          co_payment_percentage?: number | null
          covered_items?: Json | null
          created_at?: string
          decision?: string | null
          decision_reason?: string | null
          deductible_amount?: number | null
          id?: string
          insurer_payment?: number | null
          max_payable_amount?: number | null
          non_covered_items?: Json | null
          policy_limit?: number | null
          previous_claims_total?: number | null
          remaining_coverage?: number | null
          settlement_date?: string | null
          updated_at?: string
          validated_billed_total?: number | null
        }
        Update: {
          approval_letter_generated?: boolean | null
          claim_id?: string
          co_payment_amount?: number | null
          co_payment_percentage?: number | null
          covered_items?: Json | null
          created_at?: string
          decision?: string | null
          decision_reason?: string | null
          deductible_amount?: number | null
          id?: string
          insurer_payment?: number | null
          max_payable_amount?: number | null
          non_covered_items?: Json | null
          policy_limit?: number | null
          previous_claims_total?: number | null
          remaining_coverage?: number | null
          settlement_date?: string | null
          updated_at?: string
          validated_billed_total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "settlement_calculations_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "claims"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["user_portal"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["user_portal"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["user_portal"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_portal: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["user_portal"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["user_portal"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      ai_document_type:
        | "claim_form"
        | "medical_bill"
        | "prescription"
        | "diagnosis_card"
        | "admission_card"
        | "payment_receipt"
        | "discharge_summary"
        | "lab_report"
        | "other"
      claim_status:
        | "pending"
        | "processing"
        | "approved"
        | "rejected"
        | "manual-review"
      claim_type: "opd" | "spectacles" | "dental" | "hospitalization"
      hospitalization_type: "cashless" | "reimbursement" | "per_day_benefit"
      policy_type: "retail" | "corporate"
      processing_status:
        | "uploaded"
        | "ocr_processing"
        | "ocr_complete"
        | "ocr_failed"
        | "reupload_required"
        | "classification_complete"
        | "validation_in_progress"
        | "validation_complete"
        | "fraud_check_in_progress"
        | "fraud_check_complete"
        | "pending_documents"
        | "manual_review"
        | "auto_approved"
        | "auto_rejected"
        | "settlement_pending"
        | "settled"
        | "closed"
      relationship_type: "self" | "spouse" | "child" | "parent"
      user_portal: "admin" | "branch" | "customer"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      ai_document_type: [
        "claim_form",
        "medical_bill",
        "prescription",
        "diagnosis_card",
        "admission_card",
        "payment_receipt",
        "discharge_summary",
        "lab_report",
        "other",
      ],
      claim_status: [
        "pending",
        "processing",
        "approved",
        "rejected",
        "manual-review",
      ],
      claim_type: ["opd", "spectacles", "dental", "hospitalization"],
      hospitalization_type: ["cashless", "reimbursement", "per_day_benefit"],
      policy_type: ["retail", "corporate"],
      processing_status: [
        "uploaded",
        "ocr_processing",
        "ocr_complete",
        "ocr_failed",
        "reupload_required",
        "classification_complete",
        "validation_in_progress",
        "validation_complete",
        "fraud_check_in_progress",
        "fraud_check_complete",
        "pending_documents",
        "manual_review",
        "auto_approved",
        "auto_rejected",
        "settlement_pending",
        "settled",
        "closed",
      ],
      relationship_type: ["self", "spouse", "child", "parent"],
      user_portal: ["admin", "branch", "customer"],
    },
  },
} as const

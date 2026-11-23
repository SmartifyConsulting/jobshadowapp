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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      activity_log: {
        Row: {
          action: string
          actor_user_id: string | null
          created_at: string
          id: string
          record_id: string
          resource_type: string
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          created_at?: string
          id?: string
          record_id: string
          resource_type: string
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          created_at?: string
          id?: string
          record_id?: string
          resource_type?: string
        }
        Relationships: []
      }
      ai_token_ledger: {
        Row: {
          actor_user_id: string | null
          cached_input_tokens: number | null
          cached_rate_per_million: number | null
          cost_source: string
          cost_usd: number | null
          created_at: string
          error_code: string | null
          feature: string
          id: string
          input_rate_per_million: number | null
          input_tokens: number | null
          model: string
          output_rate_per_million: number | null
          output_tokens: number | null
          provider: string
          request_id: string | null
          succeeded: boolean
          total_tokens: number | null
        }
        Insert: {
          actor_user_id?: string | null
          cached_input_tokens?: number | null
          cached_rate_per_million?: number | null
          cost_source?: string
          cost_usd?: number | null
          created_at?: string
          error_code?: string | null
          feature: string
          id?: string
          input_rate_per_million?: number | null
          input_tokens?: number | null
          model: string
          output_rate_per_million?: number | null
          output_tokens?: number | null
          provider: string
          request_id?: string | null
          succeeded: boolean
          total_tokens?: number | null
        }
        Update: {
          actor_user_id?: string | null
          cached_input_tokens?: number | null
          cached_rate_per_million?: number | null
          cost_source?: string
          cost_usd?: number | null
          created_at?: string
          error_code?: string | null
          feature?: string
          id?: string
          input_rate_per_million?: number | null
          input_tokens?: number | null
          model?: string
          output_rate_per_million?: number | null
          output_tokens?: number | null
          provider?: string
          request_id?: string | null
          succeeded?: boolean
          total_tokens?: number | null
        }
        Relationships: []
      }
      booking_settings: {
        Row: {
          blackout_dates: string[]
          cancellation_cutoff_days: number
          documentation_deadline_days: number
          id: number
          max_advance_days: number
          max_pending_requests: number
          mentor_reminder_days: number[]
          min_lead_days: number
          no_availability_message: string
          public_holidays: string[]
          request_expiry_hours: number
          reschedule_allowed: boolean
          reschedule_min_notice_days: number
          scholar_reminder_days: number[]
          season_end_month: number
          season_start_month: number
          waitlist_expiry_hours: number
        }
        Insert: {
          blackout_dates?: string[]
          cancellation_cutoff_days?: number
          documentation_deadline_days?: number
          id?: number
          max_advance_days?: number
          max_pending_requests?: number
          mentor_reminder_days?: number[]
          min_lead_days?: number
          no_availability_message?: string
          public_holidays?: string[]
          request_expiry_hours?: number
          reschedule_allowed?: boolean
          reschedule_min_notice_days?: number
          scholar_reminder_days?: number[]
          season_end_month?: number
          season_start_month?: number
          waitlist_expiry_hours?: number
        }
        Update: {
          blackout_dates?: string[]
          cancellation_cutoff_days?: number
          documentation_deadline_days?: number
          id?: number
          max_advance_days?: number
          max_pending_requests?: number
          mentor_reminder_days?: number[]
          min_lead_days?: number
          no_availability_message?: string
          public_holidays?: string[]
          request_expiry_hours?: number
          reschedule_allowed?: boolean
          reschedule_min_notice_days?: number
          scholar_reminder_days?: number[]
          season_end_month?: number
          season_start_month?: number
          waitlist_expiry_hours?: number
        }
        Relationships: []
      }
      bookings: {
        Row: {
          ad_hoc_note: string | null
          ad_hoc_requested: boolean
          amount_due: number
          base_amount: number
          career: string | null
          company: string | null
          company_id: number
          company_indemnity_path: string | null
          company_indemnity_signed_at: string | null
          created_at: string
          day_before_reminder_sent_at: string | null
          discount: number
          guardian_signature_status: string
          guardian_signed_at: string | null
          id: string
          indemnity_path: string | null
          indemnity_received: boolean
          internship_notes: string | null
          internship_preapproved: boolean
          location: string | null
          mentor_reminders_sent: number[]
          mode: string | null
          paid_at: string | null
          reminder_sent_at: string | null
          scholar_reminders_sent: number[]
          sector: string | null
          shadow_date: string
          status: string
          user_id: string
          voucher_code: string | null
        }
        Insert: {
          ad_hoc_note?: string | null
          ad_hoc_requested?: boolean
          amount_due?: number
          base_amount?: number
          career?: string | null
          company?: string | null
          company_id: number
          company_indemnity_path?: string | null
          company_indemnity_signed_at?: string | null
          created_at?: string
          day_before_reminder_sent_at?: string | null
          discount?: number
          guardian_signature_status?: string
          guardian_signed_at?: string | null
          id?: string
          indemnity_path?: string | null
          indemnity_received?: boolean
          internship_notes?: string | null
          internship_preapproved?: boolean
          location?: string | null
          mentor_reminders_sent?: number[]
          mode?: string | null
          paid_at?: string | null
          reminder_sent_at?: string | null
          scholar_reminders_sent?: number[]
          sector?: string | null
          shadow_date: string
          status?: string
          user_id?: string
          voucher_code?: string | null
        }
        Update: {
          ad_hoc_note?: string | null
          ad_hoc_requested?: boolean
          amount_due?: number
          base_amount?: number
          career?: string | null
          company?: string | null
          company_id?: number
          company_indemnity_path?: string | null
          company_indemnity_signed_at?: string | null
          created_at?: string
          day_before_reminder_sent_at?: string | null
          discount?: number
          guardian_signature_status?: string
          guardian_signed_at?: string | null
          id?: string
          indemnity_path?: string | null
          indemnity_received?: boolean
          internship_notes?: string | null
          internship_preapproved?: boolean
          location?: string | null
          mentor_reminders_sent?: number[]
          mode?: string | null
          paid_at?: string | null
          reminder_sent_at?: string | null
          scholar_reminders_sent?: number[]
          sector?: string | null
          shadow_date?: string
          status?: string
          user_id?: string
          voucher_code?: string | null
        }
        Relationships: []
      }
      career_favourites: {
        Row: {
          career_slug: string
          created_at: string
          user_id: string
        }
        Insert: {
          career_slug: string
          created_at?: string
          user_id: string
        }
        Update: {
          career_slug?: string
          created_at?: string
          user_id?: string
        }
        Relationships: []
      }
      career_merge_backup_2026: {
        Row: {
          old_career: string | null
          old_mode: string | null
          record_id: string | null
          source: string | null
        }
        Insert: {
          old_career?: string | null
          old_mode?: string | null
          record_id?: string | null
          source?: string | null
        }
        Update: {
          old_career?: string | null
          old_mode?: string | null
          record_id?: string | null
          source?: string | null
        }
        Relationships: []
      }
      careers: {
        Row: {
          archived: boolean
          description: string | null
          future_outlook: string | null
          id: number
          ideal_for: string | null
          interpersonal_skills: string[]
          name: string
          recommended_courses: string[]
          school_skills: string[] | null
          specialisations: string[] | null
          subjects: string[] | null
          workplace_skills: string[] | null
        }
        Insert: {
          archived?: boolean
          description?: string | null
          future_outlook?: string | null
          id: number
          ideal_for?: string | null
          interpersonal_skills?: string[]
          name: string
          recommended_courses?: string[]
          school_skills?: string[] | null
          specialisations?: string[] | null
          subjects?: string[] | null
          workplace_skills?: string[] | null
        }
        Update: {
          archived?: boolean
          description?: string | null
          future_outlook?: string | null
          id?: number
          ideal_for?: string | null
          interpersonal_skills?: string[]
          name?: string
          recommended_courses?: string[]
          school_skills?: string[] | null
          specialisations?: string[] | null
          subjects?: string[] | null
          workplace_skills?: string[] | null
        }
        Relationships: []
      }
      companies: {
        Row: {
          active: boolean
          address: string | null
          allow_off_season: boolean
          allow_weekends: boolean
          amount: number | null
          arrival_instruction: string | null
          arrival_time: string | null
          availability: string[] | null
          backup_mentor_email: string | null
          backup_mentor_first_name: string | null
          backup_mentor_last_name: string | null
          backup_mentor_name: string | null
          backup_mentor_phone: string | null
          career: string | null
          collection_time: string | null
          company: string | null
          company_code: string | null
          custom_indemnity_path: string | null
          custom_indemnity_text: string | null
          dates: string | null
          days_per_shadow: number | null
          description: string | null
          hr_contact_email: string | null
          hr_contact_first_name: string | null
          hr_contact_last_name: string | null
          hr_contact_name: string | null
          hr_contact_phone: string | null
          hr_email: string | null
          hr_name: string | null
          hr_phone: string | null
          id: number
          location: string | null
          logo_path: string | null
          max_applicants: number | null
          mentor_email: string | null
          mentor_first_name: string | null
          mentor_last_name: string | null
          mentor_name: string | null
          mentor_phone: string | null
          mentor_position: string | null
          mode: string | null
          period: string | null
          sector: string | null
          total_days: number | null
          website: string | null
        }
        Insert: {
          active?: boolean
          address?: string | null
          allow_off_season?: boolean
          allow_weekends?: boolean
          amount?: number | null
          arrival_instruction?: string | null
          arrival_time?: string | null
          availability?: string[] | null
          backup_mentor_email?: string | null
          backup_mentor_first_name?: string | null
          backup_mentor_last_name?: string | null
          backup_mentor_name?: string | null
          backup_mentor_phone?: string | null
          career?: string | null
          collection_time?: string | null
          company?: string | null
          company_code?: string | null
          custom_indemnity_path?: string | null
          custom_indemnity_text?: string | null
          dates?: string | null
          days_per_shadow?: number | null
          description?: string | null
          hr_contact_email?: string | null
          hr_contact_first_name?: string | null
          hr_contact_last_name?: string | null
          hr_contact_name?: string | null
          hr_contact_phone?: string | null
          hr_email?: string | null
          hr_name?: string | null
          hr_phone?: string | null
          id: number
          location?: string | null
          logo_path?: string | null
          max_applicants?: number | null
          mentor_email?: string | null
          mentor_first_name?: string | null
          mentor_last_name?: string | null
          mentor_name?: string | null
          mentor_phone?: string | null
          mentor_position?: string | null
          mode?: string | null
          period?: string | null
          sector?: string | null
          total_days?: number | null
          website?: string | null
        }
        Update: {
          active?: boolean
          address?: string | null
          allow_off_season?: boolean
          allow_weekends?: boolean
          amount?: number | null
          arrival_instruction?: string | null
          arrival_time?: string | null
          availability?: string[] | null
          backup_mentor_email?: string | null
          backup_mentor_first_name?: string | null
          backup_mentor_last_name?: string | null
          backup_mentor_name?: string | null
          backup_mentor_phone?: string | null
          career?: string | null
          collection_time?: string | null
          company?: string | null
          company_code?: string | null
          custom_indemnity_path?: string | null
          custom_indemnity_text?: string | null
          dates?: string | null
          days_per_shadow?: number | null
          description?: string | null
          hr_contact_email?: string | null
          hr_contact_first_name?: string | null
          hr_contact_last_name?: string | null
          hr_contact_name?: string | null
          hr_contact_phone?: string | null
          hr_email?: string | null
          hr_name?: string | null
          hr_phone?: string | null
          id?: number
          location?: string | null
          logo_path?: string | null
          max_applicants?: number | null
          mentor_email?: string | null
          mentor_first_name?: string | null
          mentor_last_name?: string | null
          mentor_name?: string | null
          mentor_phone?: string | null
          mentor_position?: string | null
          mode?: string | null
          period?: string | null
          sector?: string | null
          total_days?: number | null
          website?: string | null
        }
        Relationships: []
      }
      email_outbox: {
        Row: {
          body: string
          booking_id: string | null
          created_at: string
          id: string
          recipient: string | null
          status: string
          subject: string
          template: string
          user_id: string | null
        }
        Insert: {
          body: string
          booking_id?: string | null
          created_at?: string
          id?: string
          recipient?: string | null
          status?: string
          subject: string
          template: string
          user_id?: string | null
        }
        Update: {
          body?: string
          booking_id?: string | null
          created_at?: string
          id?: string
          recipient?: string | null
          status?: string
          subject?: string
          template?: string
          user_id?: string | null
        }
        Relationships: []
      }
      evaluations: {
        Row: {
          booking_id: string
          comments_text: string | null
          continue_text: string | null
          created_at: string
          extra_text: string | null
          id: string
          ratings: number[]
          role: string
          start_text: string | null
          stop_text: string | null
        }
        Insert: {
          booking_id: string
          comments_text?: string | null
          continue_text?: string | null
          created_at?: string
          extra_text?: string | null
          id?: string
          ratings: number[]
          role: string
          start_text?: string | null
          stop_text?: string | null
        }
        Update: {
          booking_id?: string
          comments_text?: string | null
          continue_text?: string | null
          created_at?: string
          extra_text?: string | null
          id?: string
          ratings?: number[]
          role?: string
          start_text?: string | null
          stop_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "evaluations_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      host_profiles: {
        Row: {
          bio: string | null
          certifications: string | null
          cv_path: string | null
          linkedin_url: string | null
          mentor_email: string
          specialties: string[]
          updated_at: string
        }
        Insert: {
          bio?: string | null
          certifications?: string | null
          cv_path?: string | null
          linkedin_url?: string | null
          mentor_email: string
          specialties?: string[]
          updated_at?: string
        }
        Update: {
          bio?: string | null
          certifications?: string | null
          cv_path?: string | null
          linkedin_url?: string | null
          mentor_email?: string
          specialties?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      host_settings: {
        Row: {
          available_slots: Json
          blackout_dates: string[]
          buffer_days: number | null
          max_consecutive_hours: number | null
          max_shadows_per_month: number | null
          max_shadows_per_week: number | null
          mentor_email: string
          paused: boolean
          updated_at: string
        }
        Insert: {
          available_slots?: Json
          blackout_dates?: string[]
          buffer_days?: number | null
          max_consecutive_hours?: number | null
          max_shadows_per_month?: number | null
          max_shadows_per_week?: number | null
          mentor_email: string
          paused?: boolean
          updated_at?: string
        }
        Update: {
          available_slots?: Json
          blackout_dates?: string[]
          buffer_days?: number | null
          max_consecutive_hours?: number | null
          max_shadows_per_month?: number | null
          max_shadows_per_week?: number | null
          mentor_email?: string
          paused?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      legacy_applications: {
        Row: {
          cancelled: boolean | null
          career: string | null
          company: string | null
          company_code: string | null
          contact: string | null
          dates: string | null
          email: string | null
          first_name: string | null
          id: number
          id_number: string | null
          imported_at: string
          indemnity: boolean | null
          last_name: string | null
          location: string | null
          name: string | null
          paid: boolean | null
          referral: string | null
          school: string | null
          sector: string | null
        }
        Insert: {
          cancelled?: boolean | null
          career?: string | null
          company?: string | null
          company_code?: string | null
          contact?: string | null
          dates?: string | null
          email?: string | null
          first_name?: string | null
          id: number
          id_number?: string | null
          imported_at?: string
          indemnity?: boolean | null
          last_name?: string | null
          location?: string | null
          name?: string | null
          paid?: boolean | null
          referral?: string | null
          school?: string | null
          sector?: string | null
        }
        Update: {
          cancelled?: boolean | null
          career?: string | null
          company?: string | null
          company_code?: string | null
          contact?: string | null
          dates?: string | null
          email?: string | null
          first_name?: string | null
          id?: number
          id_number?: string | null
          imported_at?: string
          indemnity?: boolean | null
          last_name?: string | null
          location?: string | null
          name?: string | null
          paid?: boolean | null
          referral?: string | null
          school?: string | null
          sector?: string | null
        }
        Relationships: []
      }
      legacy_users: {
        Row: {
          email: string | null
          first_name: string | null
          has_profile: boolean | null
          id: number
          is_spam: boolean
          last_name: string | null
          name: string | null
        }
        Insert: {
          email?: string | null
          first_name?: string | null
          has_profile?: boolean | null
          id: number
          is_spam?: boolean
          last_name?: string | null
          name?: string | null
        }
        Update: {
          email?: string | null
          first_name?: string | null
          has_profile?: boolean | null
          id?: number
          is_spam?: boolean
          last_name?: string | null
          name?: string | null
        }
        Relationships: []
      }
      legal_documents: {
        Row: {
          body: string
          key: string
          title: string
          updated_at: string
        }
        Insert: {
          body: string
          key: string
          title: string
          updated_at?: string
        }
        Update: {
          body?: string
          key?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      partner_applications: {
        Row: {
          applicant_type: string
          company: string
          created_at: string
          email: string
          first_name: string
          id: string
          last_name: string
          message: string
          phone: string
          reviewed_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          applicant_type: string
          company: string
          created_at?: string
          email: string
          first_name: string
          id?: string
          last_name: string
          message?: string
          phone: string
          reviewed_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          applicant_type?: string
          company?: string
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          last_name?: string
          message?: string
          phone?: string
          reviewed_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_path: string | null
          display_name: string | null
          first_name: string | null
          last_name: string | null
          self_registered: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_path?: string | null
          display_name?: string | null
          first_name?: string | null
          last_name?: string | null
          self_registered?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_path?: string | null
          display_name?: string | null
          first_name?: string | null
          last_name?: string | null
          self_registered?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      role_descriptions: {
        Row: {
          created_at: string
          field: string
          id: number
          summary: string
          title: string
          updated_at: string
          video: string | null
        }
        Insert: {
          created_at?: string
          field: string
          id?: number
          summary?: string
          title: string
          updated_at?: string
          video?: string | null
        }
        Update: {
          created_at?: string
          field?: string
          id?: number
          summary?: string
          title?: string
          updated_at?: string
          video?: string | null
        }
        Relationships: []
      }
      role_notify_subscriptions: {
        Row: {
          career: string
          created_at: string
          email: string
          id: string
          notified_at: string | null
        }
        Insert: {
          career: string
          created_at?: string
          email: string
          id?: string
          notified_at?: string | null
        }
        Update: {
          career?: string
          created_at?: string
          email?: string
          id?: string
          notified_at?: string | null
        }
        Relationships: []
      }
      scholar_profiles: {
        Row: {
          career_interests: string | null
          citizenship: string | null
          contact_no: string
          created_at: string
          dietary: string | null
          disability: string | null
          first_name: string | null
          full_name: string
          gender: string | null
          guardian_contact: string | null
          guardian_email: string | null
          guardian_first_name: string | null
          guardian_id: string | null
          guardian_last_name: string | null
          guardian_name: string | null
          id_file_path: string | null
          id_number: string
          id_verified: boolean
          id_verified_at: string | null
          info_accurate: boolean
          last_name: string | null
          photo_path: string | null
          popi_accepted: boolean
          popi_accepted_at: string | null
          population_group: string | null
          school: string
          school_type: string
          tc_accepted: boolean
          tc_accepted_at: string | null
          updated_at: string
          user_id: string
          where_heard: string | null
        }
        Insert: {
          career_interests?: string | null
          citizenship?: string | null
          contact_no: string
          created_at?: string
          dietary?: string | null
          disability?: string | null
          first_name?: string | null
          full_name: string
          gender?: string | null
          guardian_contact?: string | null
          guardian_email?: string | null
          guardian_first_name?: string | null
          guardian_id?: string | null
          guardian_last_name?: string | null
          guardian_name?: string | null
          id_file_path?: string | null
          id_number: string
          id_verified?: boolean
          id_verified_at?: string | null
          info_accurate?: boolean
          last_name?: string | null
          photo_path?: string | null
          popi_accepted?: boolean
          popi_accepted_at?: string | null
          population_group?: string | null
          school: string
          school_type: string
          tc_accepted?: boolean
          tc_accepted_at?: string | null
          updated_at?: string
          user_id: string
          where_heard?: string | null
        }
        Update: {
          career_interests?: string | null
          citizenship?: string | null
          contact_no?: string
          created_at?: string
          dietary?: string | null
          disability?: string | null
          first_name?: string | null
          full_name?: string
          gender?: string | null
          guardian_contact?: string | null
          guardian_email?: string | null
          guardian_first_name?: string | null
          guardian_id?: string | null
          guardian_last_name?: string | null
          guardian_name?: string | null
          id_file_path?: string | null
          id_number?: string
          id_verified?: boolean
          id_verified_at?: string | null
          info_accurate?: boolean
          last_name?: string | null
          photo_path?: string | null
          popi_accepted?: boolean
          popi_accepted_at?: string | null
          population_group?: string | null
          school?: string
          school_type?: string
          tc_accepted?: boolean
          tc_accepted_at?: string | null
          updated_at?: string
          user_id?: string
          where_heard?: string | null
        }
        Relationships: []
      }
      sectors: {
        Row: {
          id: number
          name: string
        }
        Insert: {
          id: number
          name: string
        }
        Update: {
          id?: number
          name?: string
        }
        Relationships: []
      }
      user_notification_state: {
        Row: {
          dismissed_at: string | null
          notification_id: string
          read_at: string | null
          user_id: string
        }
        Insert: {
          dismissed_at?: string | null
          notification_id: string
          read_at?: string | null
          user_id: string
        }
        Update: {
          dismissed_at?: string | null
          notification_id?: string
          read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_notification_state_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "email_outbox"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vouchers: {
        Row: {
          available_from: string | null
          available_until: string | null
          careers: string[] | null
          code: string | null
          discount: number | null
          id: number
          name: string | null
          usage_limit: number | null
        }
        Insert: {
          available_from?: string | null
          available_until?: string | null
          careers?: string[] | null
          code?: string | null
          discount?: number | null
          id: number
          name?: string | null
          usage_limit?: number | null
        }
        Update: {
          available_from?: string | null
          available_until?: string | null
          careers?: string[] | null
          code?: string | null
          discount?: number | null
          id?: number
          name?: string | null
          usage_limit?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_list_accounts: {
        Args: never
        Returns: {
          avatar_path: string
          booking_count: number
          contact_no: string
          created_at: string
          display_name: string
          email: string
          first_name: string
          full_name: string
          has_profile: boolean
          has_scholar_profile: boolean
          id: string
          id_file_path: string
          id_number: string
          id_verified: boolean
          is_spam: boolean
          last_name: string
          photo_path: string
          roles: string[]
          scholar_first_name: string
          scholar_last_name: string
          school: string
          self_registered: boolean
          last_accessed_at: string | null
        }[]
      }
      admin_user_applications: {
        Args: { _user_id: string }
        Returns: {
          cancelled: boolean
          career: string
          company: string
          dates: string
          id: string
          indemnity: boolean
          paid: boolean
          source: string
        }[]
      }
      can_read_own_notification: {
        Args: { _notification: string }
        Returns: boolean
      }
      check_voucher: {
        Args: { _code: string }
        Returns: {
          code: string
          discount: number
        }[]
      }
      complete_and_request_evaluations: { Args: never; Returns: undefined }
      confirm_test_payment: { Args: { _booking: string }; Returns: undefined }
      email_company_bee_report: {
        Args: { _hr_email: string }
        Returns: undefined
      }
      get_booking_company_details: {
        Args: { _booking: string }
        Returns: {
          address: string
          arrival_time: string
          collection_time: string
          company: string
          custom_indemnity_text: string
          location: string
        }[]
      }
      get_company_bee_report: {
        Args: { _hr_email: string }
        Returns: {
          career: string
          citizenship: string
          days_per_shadow: number
          disability: string
          gender: string
          mentor_name: string
          population_group: string
          scholar_name: string
          school: string
          shadow_date: string
          status: string
        }[]
      }
      get_evaluation_context: {
        Args: { _booking: string }
        Returns: {
          already_submitted: boolean
          career: string
          company: string
          shadow_date: string
          viewer_role: string
        }[]
      }
      get_host_profile_for_placement: {
        Args: { _company_id: number }
        Returns: {
          bio: string
          certifications: string
          specialties: string[]
        }[]
      }
      get_indemnity_context: {
        Args: { _booking: string }
        Returns: {
          career: string
          company: string
          company_signed: boolean
          custom_indemnity_text: string
          location: string
          needs_company_doc: boolean
          scholar_name: string
          school: string
          shadow_date: string
          standard_signed: boolean
          viewer_role: string
        }[]
      }
      get_my_host_profile: {
        Args: never
        Returns: {
          bio: string | null
          certifications: string | null
          cv_path: string | null
          linkedin_url: string | null
          mentor_email: string
          specialties: string[]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "host_profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_my_host_settings: {
        Args: never
        Returns: {
          available_slots: Json
          blackout_dates: string[]
          buffer_days: number | null
          max_consecutive_hours: number | null
          max_shadows_per_month: number | null
          max_shadows_per_week: number | null
          mentor_email: string
          paused: boolean
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "host_settings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_my_notifications: {
        Args: never
        Returns: {
          body: string
          created_at: string
          id: string
          read_at: string
          subject: string
        }[]
      }
      get_no_availability_message: { Args: never; Returns: string }
      get_parent_children: {
        Args: never
        Returns: {
          career_interests: string
          full_name: string
          pending_bookings: Json
          scholar_user_id: string
          school: string
        }[]
      }
      get_public_career_content: {
        Args: never
        Returns: {
          description: string
          name: string
        }[]
      }
      get_public_career_details: {
        Args: never
        Returns: {
          description: string
          name: string
          school_skills: string[]
          workplace_skills: string[]
        }[]
      }
      get_public_career_guidance: {
        Args: never
        Returns: {
          description: string
          ideal_for: string
          name: string
          school_skills: string[]
          specialisations: string[]
          subjects: string[]
          workplace_skills: string[]
        }[]
      }
      get_public_holidays: { Args: never; Returns: string[] }
      get_season_window: {
        Args: never
        Returns: {
          season_end_month: number
          season_start_month: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_mentor_email_match: {
        Args: { _mentor_email: string }
        Returns: boolean
      }
      list_mentor_bookings: {
        Args: never
        Returns: {
          career: string
          company: string
          id: string
          indemnity_received: boolean
          internship_notes: string
          internship_preapproved: boolean
          location: string
          scholar_contact: string
          scholar_name: string
          scholar_school: string
          shadow_date: string
          status: string
        }[]
      }
      list_mentor_placements: {
        Args: never
        Returns: {
          active: boolean
          allow_off_season: boolean
          allow_weekends: boolean
          arrival_time: string
          career: string
          collection_time: string
          company: string
          dates: string
          days_per_shadow: number
          description: string
          id: number
          location: string
          max_applicants: number
          mode: string
          sector: string
        }[]
      }
      list_my_hr_companies: {
        Args: never
        Returns: {
          company: string
          hr_email: string
        }[]
      }
      list_partner_logos: {
        Args: never
        Returns: {
          company: string
          logo_path: string
        }[]
      }
      list_public_careers: {
        Args: never
        Returns: {
          description: string | null
          future_outlook: string | null
          id: number
          interpersonal_skills: string[]
          name: string
          recommended_courses: string[]
        }[]
      }
      list_placements: {
        Args: never
        Returns: {
          amount: number
          arrival_time: string
          availability: string
          career: string
          collection_time: string
          company: string
          days_per_shadow: number
          description: string
          id: number
          location: string
          mode: string
          sector: string
        }[]
      }
      normalize_career_name: { Args: { _n: string }; Returns: string }
      release_expired_booking_holds: { Args: never; Returns: undefined }
      send_scheduled_reminders: { Args: never; Returns: undefined }
      set_company_indemnity_path: {
        Args: { _booking: string; _path: string }
        Returns: undefined
      }
      set_indemnity_path: {
        Args: { _booking: string; _path: string }
        Returns: undefined
      }
      set_internship_preapproval: {
        Args: { _booking: string; _notes: string; _preapproved: boolean }
        Returns: undefined
      }
      set_my_notification_state: {
        Args: { _action: string; _notification: string }
        Returns: undefined
      }
      submit_evaluation: {
        Args: {
          _booking: string
          _comments: string
          _continue: string
          _extra: string
          _ratings: number[]
          _role: string
          _start: string
          _stop: string
        }
        Returns: undefined
      }
      submit_guardian_signature: {
        Args: { _booking: string; _document: string; _path: string }
        Returns: undefined
      }
      submit_indemnity: { Args: { _booking: string }; Returns: undefined }
      submit_partner_application: {
        Args: {
          _applicant_type: string
          _company: string
          _first_name: string
          _last_name: string
          _message?: string
          _phone: string
        }
        Returns: string
      }
      update_mentor_placement: {
        Args: {
          _active: boolean
          _arrival_time: string
          _collection_time: string
          _dates: string
          _description: string
          _id: number
          _max_applicants: number
        }
        Returns: undefined
      }
      update_my_host_profile: {
        Args: {
          _bio: string
          _certifications: string
          _cv_path: string
          _linkedin_url: string
          _specialties: string[]
        }
        Returns: undefined
      }
      update_my_host_settings:
        | {
            Args: {
              _blackout_dates: string[]
              _buffer_days: number
              _max_shadows_per_month: number
              _max_shadows_per_week: number
              _paused: boolean
            }
            Returns: undefined
          }
        | {
            Args: {
              _available_slots: Json
              _blackout_dates: string[]
              _buffer_days: number
              _max_consecutive_hours: number
              _max_shadows_per_month: number
              _max_shadows_per_week: number
              _paused: boolean
            }
            Returns: undefined
          }
        | {
            Args: {
              _blackout_dates: string[]
              _buffer_days: number
              _max_consecutive_hours: number
              _max_shadows_per_month: number
              _max_shadows_per_week: number
              _paused: boolean
            }
            Returns: undefined
          }
    }
    Enums: {
      app_role: "admin" | "user" | "mentor" | "hr_admin" | "school" | "parent"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "user", "mentor", "hr_admin", "school", "parent"],
    },
  },
} as const

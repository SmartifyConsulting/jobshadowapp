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
      bookings: {
        Row: {
          amount_due: number
          base_amount: number
          career: string | null
          company: string | null
          company_id: number
          created_at: string
          discount: number
          id: string
          indemnity_received: boolean
          location: string | null
          paid_at: string | null
          sector: string | null
          shadow_date: string
          status: string
          user_id: string
          voucher_code: string | null
        }
        Insert: {
          amount_due?: number
          base_amount?: number
          career?: string | null
          company?: string | null
          company_id: number
          created_at?: string
          discount?: number
          id?: string
          indemnity_received?: boolean
          location?: string | null
          paid_at?: string | null
          sector?: string | null
          shadow_date: string
          status?: string
          user_id?: string
          voucher_code?: string | null
        }
        Update: {
          amount_due?: number
          base_amount?: number
          career?: string | null
          company?: string | null
          company_id?: number
          created_at?: string
          discount?: number
          id?: string
          indemnity_received?: boolean
          location?: string | null
          paid_at?: string | null
          sector?: string | null
          shadow_date?: string
          status?: string
          user_id?: string
          voucher_code?: string | null
        }
        Relationships: []
      }
      careers: {
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
      companies: {
        Row: {
          address: string | null
          amount: number | null
          arrival_time: string | null
          availability: string[] | null
          backup_mentor_email: string | null
          backup_mentor_name: string | null
          backup_mentor_phone: string | null
          career: string | null
          collection_time: string | null
          company: string | null
          company_code: string | null
          dates: string | null
          days_per_shadow: number | null
          description: string | null
          hr_email: string | null
          hr_name: string | null
          hr_phone: string | null
          id: number
          location: string | null
          max_applicants: number | null
          mentor_email: string | null
          mentor_name: string | null
          mentor_phone: string | null
          period: string | null
          sector: string | null
          total_days: number | null
          website: string | null
        }
        Insert: {
          address?: string | null
          amount?: number | null
          arrival_time?: string | null
          availability?: string[] | null
          backup_mentor_email?: string | null
          backup_mentor_name?: string | null
          backup_mentor_phone?: string | null
          career?: string | null
          collection_time?: string | null
          company?: string | null
          company_code?: string | null
          dates?: string | null
          days_per_shadow?: number | null
          description?: string | null
          hr_email?: string | null
          hr_name?: string | null
          hr_phone?: string | null
          id: number
          location?: string | null
          max_applicants?: number | null
          mentor_email?: string | null
          mentor_name?: string | null
          mentor_phone?: string | null
          period?: string | null
          sector?: string | null
          total_days?: number | null
          website?: string | null
        }
        Update: {
          address?: string | null
          amount?: number | null
          arrival_time?: string | null
          availability?: string[] | null
          backup_mentor_email?: string | null
          backup_mentor_name?: string | null
          backup_mentor_phone?: string | null
          career?: string | null
          collection_time?: string | null
          company?: string | null
          company_code?: string | null
          dates?: string | null
          days_per_shadow?: number | null
          description?: string | null
          hr_email?: string | null
          hr_name?: string | null
          hr_phone?: string | null
          id?: number
          location?: string | null
          max_applicants?: number | null
          mentor_email?: string | null
          mentor_name?: string | null
          mentor_phone?: string | null
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
      legacy_applications: {
        Row: {
          cancelled: boolean | null
          career: string | null
          company: string | null
          company_code: string | null
          contact: string | null
          dates: string | null
          email: string | null
          id: number
          id_number: string | null
          imported_at: string
          indemnity: boolean | null
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
          id: number
          id_number?: string | null
          imported_at?: string
          indemnity?: boolean | null
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
          id?: number
          id_number?: string | null
          imported_at?: string
          indemnity?: boolean | null
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
          has_profile: boolean | null
          id: number
          is_spam: boolean
          name: string | null
        }
        Insert: {
          email?: string | null
          has_profile?: boolean | null
          id: number
          is_spam?: boolean
          name?: string | null
        }
        Update: {
          email?: string | null
          has_profile?: boolean | null
          id?: number
          is_spam?: boolean
          name?: string | null
        }
        Relationships: []
      }
      scholar_profiles: {
        Row: {
          career_interests: string | null
          contact_no: string
          created_at: string
          dietary: string | null
          full_name: string
          guardian_contact: string | null
          guardian_email: string | null
          guardian_id: string | null
          guardian_name: string | null
          id_number: string
          school: string
          school_type: string
          tc_accepted: boolean
          updated_at: string
          user_id: string
          where_heard: string | null
        }
        Insert: {
          career_interests?: string | null
          contact_no: string
          created_at?: string
          dietary?: string | null
          full_name: string
          guardian_contact?: string | null
          guardian_email?: string | null
          guardian_id?: string | null
          guardian_name?: string | null
          id_number: string
          school: string
          school_type: string
          tc_accepted?: boolean
          updated_at?: string
          user_id: string
          where_heard?: string | null
        }
        Update: {
          career_interests?: string | null
          contact_no?: string
          created_at?: string
          dietary?: string | null
          full_name?: string
          guardian_contact?: string | null
          guardian_email?: string | null
          guardian_id?: string | null
          guardian_name?: string | null
          id_number?: string
          school?: string
          school_type?: string
          tc_accepted?: boolean
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
      check_voucher: {
        Args: { _code: string }
        Returns: {
          code: string
          discount: number
        }[]
      }
      confirm_test_payment: { Args: { _booking: string }; Returns: undefined }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
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
          id: number
          location: string
          sector: string
        }[]
      }
      submit_indemnity: { Args: { _booking: string }; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const

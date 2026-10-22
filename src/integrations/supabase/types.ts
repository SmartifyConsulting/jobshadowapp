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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
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

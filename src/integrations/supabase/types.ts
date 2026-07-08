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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      action_queue: {
        Row: {
          action_type: string
          conversation_id: string | null
          created_at: string
          error: string | null
          executed_at: string | null
          id: string
          lead_id: string | null
          payload: Json
          result: Json | null
          status: string
          user_id: string
        }
        Insert: {
          action_type: string
          conversation_id?: string | null
          created_at?: string
          error?: string | null
          executed_at?: string | null
          id?: string
          lead_id?: string | null
          payload?: Json
          result?: Json | null
          status?: string
          user_id: string
        }
        Update: {
          action_type?: string
          conversation_id?: string | null
          created_at?: string
          error?: string | null
          executed_at?: string | null
          id?: string
          lead_id?: string | null
          payload?: Json
          result?: Json | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "action_queue_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "action_queue_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_log: {
        Row: {
          created_at: string
          detail: string | null
          id: string
          kind: string
          lead_id: string | null
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          detail?: string | null
          id?: string
          kind: string
          lead_id?: string | null
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          detail?: string | null
          id?: string
          kind?: string
          lead_id?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_memory: {
        Row: {
          category: string
          created_at: string
          detail: string | null
          id: string
          title: string
          user_id: string
          weight: number | null
        }
        Insert: {
          category: string
          created_at?: string
          detail?: string | null
          id?: string
          title: string
          user_id: string
          weight?: number | null
        }
        Update: {
          category?: string
          created_at?: string
          detail?: string | null
          id?: string
          title?: string
          user_id?: string
          weight?: number | null
        }
        Relationships: []
      }
      campaign_events: {
        Row: {
          campaign_id: string
          event_type: string
          id: string
          lead_id: string | null
          occurred_at: string
          payload: Json
          step_id: string | null
          user_id: string
        }
        Insert: {
          campaign_id: string
          event_type: string
          id?: string
          lead_id?: string | null
          occurred_at?: string
          payload?: Json
          step_id?: string | null
          user_id: string
        }
        Update: {
          campaign_id?: string
          event_type?: string
          id?: string
          lead_id?: string | null
          occurred_at?: string
          payload?: Json
          step_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_events_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_events_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_events_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "sequence_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_leads: {
        Row: {
          campaign_id: string
          created_at: string
          current_step: number
          id: string
          last_activity_at: string | null
          lead_id: string
          next_action_at: string | null
          paused: boolean
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          current_step?: number
          id?: string
          last_activity_at?: string | null
          lead_id: string
          next_action_at?: string | null
          paused?: boolean
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          current_step?: number
          id?: string
          last_activity_at?: string | null
          lead_id?: string
          next_action_at?: string | null
          paused?: boolean
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_leads_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_leads_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          created_at: string
          daily_limit: number
          description: string | null
          favorite: boolean
          id: string
          last_activity_at: string | null
          launched_at: string | null
          name: string
          sender_account: string | null
          status: string
          tags: string[]
          timezone: string
          updated_at: string
          user_id: string
          working_days: string[]
          working_hours_end: string
          working_hours_start: string
        }
        Insert: {
          created_at?: string
          daily_limit?: number
          description?: string | null
          favorite?: boolean
          id?: string
          last_activity_at?: string | null
          launched_at?: string | null
          name: string
          sender_account?: string | null
          status?: string
          tags?: string[]
          timezone?: string
          updated_at?: string
          user_id: string
          working_days?: string[]
          working_hours_end?: string
          working_hours_start?: string
        }
        Update: {
          created_at?: string
          daily_limit?: number
          description?: string | null
          favorite?: boolean
          id?: string
          last_activity_at?: string | null
          launched_at?: string | null
          name?: string
          sender_account?: string | null
          status?: string
          tags?: string[]
          timezone?: string
          updated_at?: string
          user_id?: string
          working_days?: string[]
          working_hours_end?: string
          working_hours_start?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          ai_summary: string | null
          created_at: string
          id: string
          intent: string | null
          last_message_at: string | null
          lead_id: string
          unread: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_summary?: string | null
          created_at?: string
          id?: string
          intent?: string | null
          last_message_at?: string | null
          lead_id: string
          unread?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_summary?: string | null
          created_at?: string
          id?: string
          intent?: string | null
          last_message_at?: string | null
          lead_id?: string
          unread?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      follow_ups: {
        Row: {
          body: string | null
          conversation_id: string
          created_at: string
          id: string
          scheduled_at: string
          sent_at: string | null
          status: string
          step: number
          user_id: string
        }
        Insert: {
          body?: string | null
          conversation_id: string
          created_at?: string
          id?: string
          scheduled_at: string
          sent_at?: string | null
          status?: string
          step: number
          user_id: string
        }
        Update: {
          body?: string | null
          conversation_id?: string
          created_at?: string
          id?: string
          scheduled_at?: string
          sent_at?: string | null
          status?: string
          step?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "follow_ups_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_docs: {
        Row: {
          content: string | null
          created_at: string
          id: string
          kind: string
          title: string
          url: string | null
          user_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          kind?: string
          title: string
          url?: string | null
          user_id: string
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          kind?: string
          title?: string
          url?: string | null
          user_id?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          ai_summary: string | null
          avatar_url: string | null
          company: string | null
          company_size: string | null
          company_website: string | null
          country: string | null
          created_at: string
          email: string | null
          full_name: string
          headline: string | null
          icp_score: number | null
          id: string
          industry: string | null
          job_title: string | null
          last_activity_at: string | null
          linkedin_url: string | null
          location: string | null
          notes: string | null
          role: string | null
          source: string
          status: string
          status_reason: string | null
          tags: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_summary?: string | null
          avatar_url?: string | null
          company?: string | null
          company_size?: string | null
          company_website?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          headline?: string | null
          icp_score?: number | null
          id?: string
          industry?: string | null
          job_title?: string | null
          last_activity_at?: string | null
          linkedin_url?: string | null
          location?: string | null
          notes?: string | null
          role?: string | null
          source?: string
          status?: string
          status_reason?: string | null
          tags?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_summary?: string | null
          avatar_url?: string | null
          company?: string | null
          company_size?: string | null
          company_website?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          headline?: string | null
          icp_score?: number | null
          id?: string
          industry?: string | null
          job_title?: string | null
          last_activity_at?: string | null
          linkedin_url?: string | null
          location?: string | null
          notes?: string | null
          role?: string | null
          source?: string
          status?: string
          status_reason?: string | null
          tags?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      meetings: {
        Row: {
          created_at: string
          duration_min: number | null
          id: string
          lead_id: string
          meeting_url: string | null
          notes: string | null
          scheduled_at: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          duration_min?: number | null
          id?: string
          lead_id: string
          meeting_url?: string | null
          notes?: string | null
          scheduled_at: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          duration_min?: number | null
          id?: string
          lead_id?: string
          meeting_url?: string | null
          notes?: string | null
          scheduled_at?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meetings_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          author: string
          body: string
          conversation_id: string
          created_at: string
          direction: string
          id: string
          kind: string | null
          user_id: string
        }
        Insert: {
          author?: string
          body: string
          conversation_id: string
          created_at?: string
          direction: string
          id?: string
          kind?: string | null
          user_id: string
        }
        Update: {
          author?: string
          body?: string
          conversation_id?: string
          created_at?: string
          direction?: string
          id?: string
          kind?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          about: string | null
          created_at: string
          email: string | null
          experience_years: number | null
          full_name: string | null
          headline: string | null
          id: string
          industry: string | null
          linkedin_connected: boolean
          linkedin_url: string | null
          onboarding_complete: boolean
          services: string[] | null
          target_audience: string | null
          updated_at: string
          value_proposition: string | null
        }
        Insert: {
          about?: string | null
          created_at?: string
          email?: string | null
          experience_years?: number | null
          full_name?: string | null
          headline?: string | null
          id: string
          industry?: string | null
          linkedin_connected?: boolean
          linkedin_url?: string | null
          onboarding_complete?: boolean
          services?: string[] | null
          target_audience?: string | null
          updated_at?: string
          value_proposition?: string | null
        }
        Update: {
          about?: string | null
          created_at?: string
          email?: string | null
          experience_years?: number | null
          full_name?: string | null
          headline?: string | null
          id?: string
          industry?: string | null
          linkedin_connected?: boolean
          linkedin_url?: string | null
          onboarding_complete?: boolean
          services?: string[] | null
          target_audience?: string | null
          updated_at?: string
          value_proposition?: string | null
        }
        Relationships: []
      }
      sales_brain: {
        Row: {
          conversation_rules: string | null
          created_at: string
          custom_instructions: string | null
          donts: string[] | null
          dos: string[] | null
          faqs: Json | null
          followup_logic: string | null
          generated_at: string | null
          icp: Json | null
          messaging_strategy: string | null
          portfolio_links: string[] | null
          reply_strategy: string | null
          tone: string
          updated_at: string
          user_id: string
          website: string | null
        }
        Insert: {
          conversation_rules?: string | null
          created_at?: string
          custom_instructions?: string | null
          donts?: string[] | null
          dos?: string[] | null
          faqs?: Json | null
          followup_logic?: string | null
          generated_at?: string | null
          icp?: Json | null
          messaging_strategy?: string | null
          portfolio_links?: string[] | null
          reply_strategy?: string | null
          tone?: string
          updated_at?: string
          user_id: string
          website?: string | null
        }
        Update: {
          conversation_rules?: string | null
          created_at?: string
          custom_instructions?: string | null
          donts?: string[] | null
          dos?: string[] | null
          faqs?: Json | null
          followup_logic?: string | null
          generated_at?: string | null
          icp?: Json | null
          messaging_strategy?: string | null
          portfolio_links?: string[] | null
          reply_strategy?: string | null
          tone?: string
          updated_at?: string
          user_id?: string
          website?: string | null
        }
        Relationships: []
      }
      sequence_steps: {
        Row: {
          campaign_id: string
          config: Json
          created_at: string
          delay_hours: number
          id: string
          step_order: number
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          campaign_id: string
          config?: Json
          created_at?: string
          delay_hours?: number
          id?: string
          step_order: number
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          campaign_id?: string
          config?: Json
          created_at?: string
          delay_hours?: number
          id?: string
          step_order?: number
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sequence_steps_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          lead_id: string | null
          payload: Json
          processed: boolean
          user_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          lead_id?: string | null
          payload?: Json
          processed?: boolean
          user_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          lead_id?: string | null
          payload?: Json
          processed?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_events_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const

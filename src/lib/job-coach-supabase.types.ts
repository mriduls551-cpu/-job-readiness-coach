export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface JobCoachDatabase {
  public: {
    Tables: {
      job_coach_users: {
        Row: {
          id: string;
          email: string;
          name: string;
          role: 'user' | 'admin';
          preferred_locale: 'en' | 'hi';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          name: string;
          role?: 'user' | 'admin';
          preferred_locale?: 'en' | 'hi';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          name?: string;
          role?: 'user' | 'admin';
          preferred_locale?: 'en' | 'hi';
          created_at?: string;
          updated_at?: string;
        };
      };
      job_coach_assessments: {
        Row: {
          id: string;
          user_id: string;
          responses: Json;
          profile: Json;
          selected_role: string | null;
          role_scores: Json;
          result_snapshot: Json | null;
          scoring_version: string | null;
          catalog_version: string | null;
          status: 'completed' | 'in_progress';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          responses: Json;
          profile: Json;
          selected_role?: string | null;
          role_scores: Json;
          result_snapshot?: Json | null;
          scoring_version?: string | null;
          catalog_version?: string | null;
          status?: 'completed' | 'in_progress';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          responses?: Json;
          profile?: Json;
          selected_role?: string | null;
          role_scores?: Json;
          result_snapshot?: Json | null;
          scoring_version?: string | null;
          catalog_version?: string | null;
          status?: 'completed' | 'in_progress';
          created_at?: string;
          updated_at?: string;
        };
      };
      job_coach_assessment_feedback: {
        Row: {
          id: string;
          user_id: string;
          assessment_id: string;
          rating: 'helpful' | 'unhelpful';
          comment: string;
          locale: 'en' | 'hi';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          assessment_id: string;
          rating: 'helpful' | 'unhelpful';
          comment?: string;
          locale?: 'en' | 'hi';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          assessment_id?: string;
          rating?: 'helpful' | 'unhelpful';
          comment?: string;
          locale?: 'en' | 'hi';
          created_at?: string;
          updated_at?: string;
        };
      };
      job_coach_d1_waitlist: {
        Row: {
          id: string;
          user_id: string;
          assessment_id: string;
          selected_role_id: string;
          contact_consent: boolean;
          note: string;
          locale: 'en' | 'hi';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          assessment_id: string;
          selected_role_id: string;
          contact_consent: boolean;
          note?: string;
          locale?: 'en' | 'hi';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          assessment_id?: string;
          selected_role_id?: string;
          contact_consent?: boolean;
          note?: string;
          locale?: 'en' | 'hi';
          created_at?: string;
          updated_at?: string;
        };
      };
      job_coach_funnel_events: {
        Row: {
          id: string;
          user_id: string;
          event_name: string;
          properties: Json;
          locale: 'en' | 'hi';
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          event_name: string;
          properties?: Json;
          locale?: 'en' | 'hi';
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          event_name?: string;
          properties?: Json;
          locale?: 'en' | 'hi';
          created_at?: string;
        };
      };
      job_coach_public_shares: {
        Row: {
          id: string;
          user_id: string;
          assessment_id: string;
          public_id: string;
          first_name: string;
          locale: 'en' | 'hi';
          role_id: string;
          role_name: Json;
          role_summary: Json;
          dimension_snapshot: Json;
          confidence_band: 'low' | 'medium' | 'high';
          visit_count: number;
          created_at: string;
          updated_at: string;
          last_visited_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          assessment_id: string;
          public_id: string;
          first_name: string;
          locale?: 'en' | 'hi';
          role_id: string;
          role_name: Json;
          role_summary: Json;
          dimension_snapshot: Json;
          confidence_band: 'low' | 'medium' | 'high';
          visit_count?: number;
          created_at?: string;
          updated_at?: string;
          last_visited_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          assessment_id?: string;
          public_id?: string;
          first_name?: string;
          locale?: 'en' | 'hi';
          role_id?: string;
          role_name?: Json;
          role_summary?: Json;
          dimension_snapshot?: Json;
          confidence_band?: 'low' | 'medium' | 'high';
          visit_count?: number;
          created_at?: string;
          updated_at?: string;
          last_visited_at?: string | null;
        };
      };
      job_coach_resumes: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          summary: string;
          email: string;
          phone: string;
          location: string;
          skills: Json;
          experience: Json;
          education: Json;
          certifications: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title?: string;
          summary?: string;
          email?: string;
          phone?: string;
          location?: string;
          skills?: Json;
          experience?: Json;
          education?: Json;
          certifications?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          summary?: string;
          email?: string;
          phone?: string;
          location?: string;
          skills?: Json;
          experience?: Json;
          education?: Json;
          certifications?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      job_coach_applications: {
        Row: {
          id: string;
          user_id: string;
          company_name: string;
          role_title: string;
          status: 'applied' | 'interview' | 'offered' | 'rejected';
          application_date: string;
          notes: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          company_name: string;
          role_title: string;
          status?: 'applied' | 'interview' | 'offered' | 'rejected';
          application_date?: string;
          notes?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          company_name?: string;
          role_title?: string;
          status?: 'applied' | 'interview' | 'offered' | 'rejected';
          application_date?: string;
          notes?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      job_coach_action_plans: {
        Row: {
          id: string;
          user_id: string;
          role_id: string;
          week_number: number;
          tasks: Json;
          generated_at: string;
          status: 'active' | 'completed' | 'archived';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          role_id: string;
          week_number?: number;
          tasks?: Json;
          generated_at?: string;
          status?: 'active' | 'completed' | 'archived';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          role_id?: string;
          week_number?: number;
          tasks?: Json;
          generated_at?: string;
          status?: 'active' | 'completed' | 'archived';
          created_at?: string;
          updated_at?: string;
        };
      };
      job_coach_nudges: {
        Row: {
          id: string;
          user_id: string;
          role_id: string | null;
          locale: 'en' | 'hi';
          title: Json;
          body: Json;
          tone: 'info' | 'action' | 'celebration';
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          role_id?: string | null;
          locale?: 'en' | 'hi';
          title: Json;
          body: Json;
          tone: 'info' | 'action' | 'celebration';
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          role_id?: string | null;
          locale?: 'en' | 'hi';
          title?: Json;
          body?: Json;
          tone?: 'info' | 'action' | 'celebration';
          created_at?: string;
        };
      };
      job_coach_agent_messages: {
        Row: {
          id: string;
          user_id: string;
          agent_type: 'coach' | 'assessment' | 'resume' | 'planner';
          role: 'user' | 'assistant';
          content: string;
          locale: 'en' | 'hi';
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          agent_type: 'coach' | 'assessment' | 'resume' | 'planner';
          role: 'user' | 'assistant';
          content: string;
          locale?: 'en' | 'hi';
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          agent_type?: 'coach' | 'assessment' | 'resume' | 'planner';
          role?: 'user' | 'assistant';
          content?: string;
          locale?: 'en' | 'hi';
          created_at?: string;
        };
      };
      job_coach_agent_sessions: {
        Row: {
          id: string;
          user_id: string;
          agent_type: 'coach' | 'assessment' | 'resume' | 'planner';
          state: Json;
          last_active_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          agent_type: 'coach' | 'assessment' | 'resume' | 'planner';
          state?: Json;
          last_active_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          agent_type?: 'coach' | 'assessment' | 'resume' | 'planner';
          state?: Json;
          last_active_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

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
          feedback: 'yes' | 'somewhat' | 'no' | null;
          scoring_variant: string | null;
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
          feedback?: 'yes' | 'somewhat' | 'no' | null;
          scoring_variant?: string | null;
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
          feedback?: 'yes' | 'somewhat' | 'no' | null;
          scoring_variant?: string | null;
          role_scores?: Json;
          result_snapshot?: Json | null;
          scoring_version?: string | null;
          catalog_version?: string | null;
          status?: 'completed' | 'in_progress';
          created_at?: string;
          updated_at?: string;
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

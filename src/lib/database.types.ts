// AUTO-GENERATED dari skema di supabase/migrations/ — jangan diedit manual.
// Setelah mengubah migrasi, regenerasi dengan Supabase CLI:
//   npx supabase gen types typescript --project-id <PROJECT_ID> --schema public \
//     > src/lib/database.types.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      activities: {
        Row: {
          id: number;
          org_id: string;
          actor_id: string | null;
          entity_type: string;
          entity_id: string;
          action: string;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: number;
          org_id: string;
          actor_id?: string | null;
          entity_type: string;
          entity_id: string;
          action: string;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: number;
          org_id?: string;
          actor_id?: string | null;
          entity_type?: string;
          entity_id?: string;
          action?: string;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "activities_actor_id_fkey";
            columns: ["actor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "activities_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      application_answers: {
        Row: {
          application_id: string;
          question_id: string;
          answer: Json;
        };
        Insert: {
          application_id: string;
          question_id: string;
          answer: Json;
        };
        Update: {
          application_id?: string;
          question_id?: string;
          answer?: Json;
        };
        Relationships: [
          {
            foreignKeyName: "application_answers_application_id_fkey";
            columns: ["application_id"];
            isOneToOne: false;
            referencedRelation: "applications";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "application_answers_question_id_fkey";
            columns: ["question_id"];
            isOneToOne: false;
            referencedRelation: "job_questions";
            referencedColumns: ["id"];
          },
        ];
      };
      applications: {
        Row: {
          id: string;
          org_id: string;
          job_id: string;
          candidate_id: string;
          stage_id: string | null;
          status: Database["public"]["Enums"]["application_status"];
          ai_score: number | null;
          ai_reasoning: Json | null;
          avg_rating: number | null;
          rejection_reason: string | null;
          rejected_at: string | null;
          submitted_by_agency: string | null;
          cover_letter: string | null;
          applied_at: string;
          stage_entered_at: string;
          last_activity_at: string;
          access_token: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          job_id: string;
          candidate_id: string;
          stage_id?: string | null;
          status?: Database["public"]["Enums"]["application_status"];
          ai_score?: number | null;
          ai_reasoning?: Json | null;
          avg_rating?: number | null;
          rejection_reason?: string | null;
          rejected_at?: string | null;
          submitted_by_agency?: string | null;
          cover_letter?: string | null;
          applied_at?: string;
          stage_entered_at?: string;
          last_activity_at?: string;
          access_token?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          job_id?: string;
          candidate_id?: string;
          stage_id?: string | null;
          status?: Database["public"]["Enums"]["application_status"];
          ai_score?: number | null;
          ai_reasoning?: Json | null;
          avg_rating?: number | null;
          rejection_reason?: string | null;
          rejected_at?: string | null;
          submitted_by_agency?: string | null;
          cover_letter?: string | null;
          applied_at?: string;
          stage_entered_at?: string;
          last_activity_at?: string;
          access_token?: string;
        };
        Relationships: [
          {
            foreignKeyName: "applications_candidate_id_fkey";
            columns: ["candidate_id"];
            isOneToOne: false;
            referencedRelation: "candidates";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "applications_job_id_fkey";
            columns: ["job_id"];
            isOneToOne: false;
            referencedRelation: "jobs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "applications_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "applications_stage_id_fkey";
            columns: ["stage_id"];
            isOneToOne: false;
            referencedRelation: "job_stages";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "applications_submitted_by_agency_fkey";
            columns: ["submitted_by_agency"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      candidate_documents: {
        Row: {
          id: string;
          org_id: string;
          candidate_id: string;
          kind: string;
          storage_path: string;
          file_name: string;
          mime_type: string | null;
          size_bytes: number | null;
          parsed_text: string | null;
          parsed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          candidate_id: string;
          kind?: string;
          storage_path: string;
          file_name: string;
          mime_type?: string | null;
          size_bytes?: number | null;
          parsed_text?: string | null;
          parsed_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          candidate_id?: string;
          kind?: string;
          storage_path?: string;
          file_name?: string;
          mime_type?: string | null;
          size_bytes?: number | null;
          parsed_text?: string | null;
          parsed_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "candidate_documents_candidate_id_fkey";
            columns: ["candidate_id"];
            isOneToOne: false;
            referencedRelation: "candidates";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "candidate_documents_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      candidates: {
        Row: {
          id: string;
          org_id: string;
          full_name: string;
          email: string;
          phone: string | null;
          phone_e164: string | null;
          headline: string | null;
          location_text: string | null;
          linkedin_url: string | null;
          portfolio_url: string | null;
          years_exp: number | null;
          skills: string[];
          education: Json;
          experience: Json;
          source: string;
          source_detail: string | null;
          tags: string[];
          consent_at: string | null;
          consent_version: string | null;
          anonymized_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          full_name: string;
          email: string;
          phone?: string | null;
          phone_e164?: string | null;
          headline?: string | null;
          location_text?: string | null;
          linkedin_url?: string | null;
          portfolio_url?: string | null;
          years_exp?: number | null;
          skills?: string[];
          education?: Json;
          experience?: Json;
          source?: string;
          source_detail?: string | null;
          tags?: string[];
          consent_at?: string | null;
          consent_version?: string | null;
          anonymized_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          full_name?: string;
          email?: string;
          phone?: string | null;
          phone_e164?: string | null;
          headline?: string | null;
          location_text?: string | null;
          linkedin_url?: string | null;
          portfolio_url?: string | null;
          years_exp?: number | null;
          skills?: string[];
          education?: Json;
          experience?: Json;
          source?: string;
          source_detail?: string | null;
          tags?: string[];
          consent_at?: string | null;
          consent_version?: string | null;
          anonymized_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "candidates_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      whatsapp_templates: {
        Row: {
          id: string;
          org_id: string;
          stage_name: string;
          body: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          stage_name: string;
          body?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          stage_name?: string;
          body?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      work_modes: {
        Row: {
          id: string;
          org_id: string;
          name: string;
          is_remote: boolean;
          position: number;
        };
        Insert: {
          id?: string;
          org_id: string;
          name: string;
          is_remote?: boolean;
          position?: number;
        };
        Update: {
          id?: string;
          org_id?: string;
          name?: string;
          is_remote?: boolean;
          position?: number;
        };
        Relationships: [];
      };
      departments: {
        Row: {
          id: string;
          org_id: string;
          name: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          name: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          name?: string;
        };
        Relationships: [
          {
            foreignKeyName: "departments_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      job_members: {
        Row: {
          job_id: string;
          user_id: string;
          role: string;
        };
        Insert: {
          job_id: string;
          user_id: string;
          role?: string;
        };
        Update: {
          job_id?: string;
          user_id?: string;
          role?: string;
        };
        Relationships: [
          {
            foreignKeyName: "job_members_job_id_fkey";
            columns: ["job_id"];
            isOneToOne: false;
            referencedRelation: "jobs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "job_members_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      job_questions: {
        Row: {
          id: string;
          job_id: string;
          label: string;
          help_text: string | null;
          type: string;
          options: Json;
          required: boolean;
          is_knockout: boolean;
          knockout_rule: Json | null;
          position: number;
        };
        Insert: {
          id?: string;
          job_id: string;
          label: string;
          help_text?: string | null;
          type?: string;
          options?: Json;
          required?: boolean;
          is_knockout?: boolean;
          knockout_rule?: Json | null;
          position?: number;
        };
        Update: {
          id?: string;
          job_id?: string;
          label?: string;
          help_text?: string | null;
          type?: string;
          options?: Json;
          required?: boolean;
          is_knockout?: boolean;
          knockout_rule?: Json | null;
          position?: number;
        };
        Relationships: [
          {
            foreignKeyName: "job_questions_job_id_fkey";
            columns: ["job_id"];
            isOneToOne: false;
            referencedRelation: "jobs";
            referencedColumns: ["id"];
          },
        ];
      };
      job_stages: {
        Row: {
          id: string;
          job_id: string;
          name: string;
          position: number;
          kind: string;
          sla_days: number | null;
        };
        Insert: {
          id?: string;
          job_id: string;
          name: string;
          position: number;
          kind?: string;
          sla_days?: number | null;
        };
        Update: {
          id?: string;
          job_id?: string;
          name?: string;
          position?: number;
          kind?: string;
          sla_days?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "job_stages_job_id_fkey";
            columns: ["job_id"];
            isOneToOne: false;
            referencedRelation: "jobs";
            referencedColumns: ["id"];
          },
        ];
      };
      jobs: {
        Row: {
          id: string;
          org_id: string;
          slug: string;
          title: string;
          department_id: string | null;
          location_id: string | null;
          work_mode: string;
          employment_type: string;
          description: string;
          requirements: string;
          benefits: string;
          required_skills: string[];
          min_years_exp: number | null;
          salary_min: number | null;
          salary_max: number | null;
          salary_currency: string;
          salary_visible: boolean;
          openings: number;
          status: Database["public"]["Enums"]["job_status"];
          published_at: string | null;
          closes_at: string | null;
          owner_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          slug: string;
          title: string;
          department_id?: string | null;
          location_id?: string | null;
          work_mode?: string;
          employment_type?: string;
          description?: string;
          requirements?: string;
          benefits?: string;
          required_skills?: string[];
          min_years_exp?: number | null;
          salary_min?: number | null;
          salary_max?: number | null;
          salary_currency?: string;
          salary_visible?: boolean;
          openings?: number;
          status?: Database["public"]["Enums"]["job_status"];
          published_at?: string | null;
          closes_at?: string | null;
          owner_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          slug?: string;
          title?: string;
          department_id?: string | null;
          location_id?: string | null;
          work_mode?: string;
          employment_type?: string;
          description?: string;
          requirements?: string;
          benefits?: string;
          required_skills?: string[];
          min_years_exp?: number | null;
          salary_min?: number | null;
          salary_max?: number | null;
          salary_currency?: string;
          salary_visible?: boolean;
          openings?: number;
          status?: Database["public"]["Enums"]["job_status"];
          published_at?: string | null;
          closes_at?: string | null;
          owner_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "jobs_department_id_fkey";
            columns: ["department_id"];
            isOneToOne: false;
            referencedRelation: "departments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "jobs_location_id_fkey";
            columns: ["location_id"];
            isOneToOne: false;
            referencedRelation: "locations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "jobs_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "jobs_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      locations: {
        Row: {
          id: string;
          org_id: string;
          name: string;
          country: string;
          is_remote: boolean;
        };
        Insert: {
          id?: string;
          org_id: string;
          name: string;
          country?: string;
          is_remote?: boolean;
        };
        Update: {
          id?: string;
          org_id?: string;
          name?: string;
          country?: string;
          is_remote?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "locations_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      notes: {
        Row: {
          id: string;
          org_id: string;
          application_id: string | null;
          candidate_id: string | null;
          author_id: string;
          body: string;
          mentions: string[];
          created_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          application_id?: string | null;
          candidate_id?: string | null;
          author_id: string;
          body: string;
          mentions?: string[];
          created_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          application_id?: string | null;
          candidate_id?: string | null;
          author_id?: string;
          body?: string;
          mentions?: string[];
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notes_application_id_fkey";
            columns: ["application_id"];
            isOneToOne: false;
            referencedRelation: "applications";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notes_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notes_candidate_id_fkey";
            columns: ["candidate_id"];
            isOneToOne: false;
            referencedRelation: "candidates";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notes_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      org_members: {
        Row: {
          id: string;
          org_id: string;
          user_id: string;
          role: Database["public"]["Enums"]["org_role"];
          status: string;
          invited_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          user_id: string;
          role?: Database["public"]["Enums"]["org_role"];
          status?: string;
          invited_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          user_id?: string;
          role?: Database["public"]["Enums"]["org_role"];
          status?: string;
          invited_by?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "org_members_invited_by_fkey";
            columns: ["invited_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "org_members_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "org_members_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      organizations: {
        Row: {
          id: string;
          slug: string;
          name: string;
          logo_url: string | null;
          website: string | null;
          about: string | null;
          brand_color: string;
          custom_domain: string | null;
          plan: string;
          settings: Json;
          created_by: string | null;
          created_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          logo_url?: string | null;
          website?: string | null;
          about?: string | null;
          brand_color?: string;
          custom_domain?: string | null;
          plan?: string;
          settings?: Json;
          created_by?: string | null;
          created_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          slug?: string;
          name?: string;
          logo_url?: string | null;
          website?: string | null;
          about?: string | null;
          brand_color?: string;
          custom_domain?: string | null;
          plan?: string;
          settings?: Json;
          created_by?: string | null;
          created_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "organizations_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          id: string;
          full_name: string;
          avatar_url: string | null;
          phone: string | null;
          timezone: string;
          created_at: string;
        };
        Insert: {
          id: string;
          full_name?: string;
          avatar_url?: string | null;
          phone?: string | null;
          timezone?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          avatar_url?: string | null;
          phone?: string | null;
          timezone?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey";
            columns: ["id"];
            isOneToOne: true;
            referencedRelation: "auth.users";
            referencedColumns: ["id"];
          },
        ];
      };
      stage_history: {
        Row: {
          id: number;
          org_id: string;
          application_id: string;
          from_stage_id: string | null;
          to_stage_id: string | null;
          moved_by: string | null;
          note: string | null;
          created_at: string;
        };
        Insert: {
          id?: number;
          org_id: string;
          application_id: string;
          from_stage_id?: string | null;
          to_stage_id?: string | null;
          moved_by?: string | null;
          note?: string | null;
          created_at?: string;
        };
        Update: {
          id?: number;
          org_id?: string;
          application_id?: string;
          from_stage_id?: string | null;
          to_stage_id?: string | null;
          moved_by?: string | null;
          note?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "stage_history_application_id_fkey";
            columns: ["application_id"];
            isOneToOne: false;
            referencedRelation: "applications";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "stage_history_from_stage_id_fkey";
            columns: ["from_stage_id"];
            isOneToOne: false;
            referencedRelation: "job_stages";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "stage_history_moved_by_fkey";
            columns: ["moved_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "stage_history_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "stage_history_to_stage_id_fkey";
            columns: ["to_stage_id"];
            isOneToOne: false;
            referencedRelation: "job_stages";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      create_organization: {
        Args: { p_name: string; p_slug: string };
        Returns: Database["public"]["Tables"]["organizations"]["Row"];
      };
      job_pipeline_counts: {
        Args: { p_job_id: string };
        Returns: { stage_id: string | null; total: number }[];
      };
      /** true = permintaan harus ditolak. Lihat 0004_rate_limit.sql */
      check_rate_limit: {
        Args: { p_key: string; p_max: number; p_window_seconds: number };
        Returns: boolean;
      };
    };
    Enums: {
      application_status: 'active' | 'hired' | 'rejected' | 'withdrawn' | 'on_hold';
      job_status: 'draft' | 'pending_approval' | 'approved' | 'published' | 'on_hold' | 'closed' | 'archived';
      org_role: 'owner' | 'admin' | 'recruiter' | 'hiring_manager' | 'interviewer' | 'agency' | 'viewer';
    };
    CompositeTypes: { [_ in never]: never };
  };
};

// ---- Alias praktis ----
type PublicSchema = Database["public"];

export type Tables<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Row"];
export type TablesInsert<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Update"];
export type Enums<T extends keyof PublicSchema["Enums"]> = PublicSchema["Enums"][T];

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      allowed_users: {
        Row: {
          created_at: string;
          email: string;
          id: string;
          is_used: boolean;
          linked_user_id: string | null;
        };
        Insert: {
          created_at?: string;
          email: string;
          id?: string;
          is_used?: boolean;
          linked_user_id?: string | null;
        };
        Update: {
          created_at?: string;
          email?: string;
          id?: string;
          is_used?: boolean;
          linked_user_id?: string | null;
        };
        Relationships: [];
      };
      cbt_answers: {
        Row: {
          created_at: string;
          id: string;
          question_id: string;
          question_index: number;
          selected_option: string | null;
          session_id: string;
          subject_id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          question_id: string;
          question_index: number;
          selected_option?: string | null;
          session_id: string;
          subject_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          question_id?: string;
          question_index?: number;
          selected_option?: string | null;
          session_id?: string;
          subject_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "cbt_answers_question_id_fkey";
            columns: ["question_id"];
            isOneToOne: false;
            referencedRelation: "questions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cbt_answers_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "cbt_sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cbt_answers_subject_id_fkey";
            columns: ["subject_id"];
            isOneToOne: false;
            referencedRelation: "subjects";
            referencedColumns: ["id"];
          },
        ];
      };
      cbt_results: {
        Row: {
          correct_answers: number;
          created_at: string;
          id: string;
          session_id: string;
          subject_scores: Json;
          total_questions: number;
          total_score: number;
          user_id: string;
        };
        Insert: {
          correct_answers?: number;
          created_at?: string;
          id?: string;
          session_id: string;
          subject_scores?: Json;
          total_questions?: number;
          total_score?: number;
          user_id: string;
        };
        Update: {
          correct_answers?: number;
          created_at?: string;
          id?: string;
          session_id?: string;
          subject_scores?: Json;
          total_questions?: number;
          total_score?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "cbt_results_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: true;
            referencedRelation: "cbt_sessions";
            referencedColumns: ["id"];
          },
        ];
      };
      cbt_sessions: {
        Row: {
          created_at: string;
          duration_minutes: number;
          end_time: string | null;
          id: string;
          start_time: string;
          status: string;
          subject_ids: Json;
          total_questions: number;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          duration_minutes?: number;
          end_time?: string | null;
          id?: string;
          start_time?: string;
          status?: string;
          subject_ids: Json;
          total_questions?: number;
          user_id: string;
        };
        Update: {
          created_at?: string;
          duration_minutes?: number;
          end_time?: string | null;
          id?: string;
          start_time?: string;
          status?: string;
          subject_ids?: Json;
          total_questions?: number;
          user_id?: string;
        };
        Relationships: [];
      };
      practice_answers: {
        Row: {
          correct_option: string;
          created_at: string;
          id: string;
          is_correct: boolean;
          question_id: string;
          selected_option: string;
          session_id: string;
        };
        Insert: {
          correct_option: string;
          created_at?: string;
          id?: string;
          is_correct: boolean;
          question_id: string;
          selected_option: string;
          session_id: string;
        };
        Update: {
          correct_option?: string;
          created_at?: string;
          id?: string;
          is_correct?: boolean;
          question_id?: string;
          selected_option?: string;
          session_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "practice_answers_question_id_fkey";
            columns: ["question_id"];
            isOneToOne: false;
            referencedRelation: "questions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "practice_answers_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "practice_sessions";
            referencedColumns: ["id"];
          },
        ];
      };
      practice_sessions: {
        Row: {
          correct_answers: number;
          created_at: string;
          id: string;
          subject_id: string;
          topic_id: string;
          total_questions: number;
          user_id: string;
        };
        Insert: {
          correct_answers?: number;
          created_at?: string;
          id?: string;
          subject_id: string;
          topic_id: string;
          total_questions?: number;
          user_id: string;
        };
        Update: {
          correct_answers?: number;
          created_at?: string;
          id?: string;
          subject_id?: string;
          topic_id?: string;
          total_questions?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "practice_sessions_subject_id_fkey";
            columns: ["subject_id"];
            isOneToOne: false;
            referencedRelation: "subjects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "practice_sessions_topic_id_fkey";
            columns: ["topic_id"];
            isOneToOne: false;
            referencedRelation: "topics";
            referencedColumns: ["id"];
          },
        ];
      };
      questions: {
        Row: {
          correct_option: string;
          created_at: string;
          difficulty: string;
          explanation: string | null;
          id: string;
          option_a: string;
          option_b: string;
          option_c: string;
          option_d: string;
          question_text: string;
          source_url: string | null;
          subject_id: string;
          topic_id: string;
          type: string;
          updated_at: string;
        };
        Insert: {
          correct_option: string;
          created_at?: string;
          difficulty?: string;
          explanation?: string | null;
          id?: string;
          option_a: string;
          option_b: string;
          option_c: string;
          option_d: string;
          question_text: string;
          source_url?: string | null;
          subject_id: string;
          topic_id: string;
          type?: string;
          updated_at?: string;
        };
        Update: {
          correct_option?: string;
          created_at?: string;
          difficulty?: string;
          explanation?: string | null;
          id?: string;
          option_a?: string;
          option_b?: string;
          option_c?: string;
          option_d?: string;
          question_text?: string;
          source_url?: string | null;
          subject_id?: string;
          topic_id?: string;
          type?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "questions_subject_id_fkey";
            columns: ["subject_id"];
            isOneToOne: false;
            referencedRelation: "subjects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "questions_topic_id_fkey";
            columns: ["topic_id"];
            isOneToOne: false;
            referencedRelation: "topics";
            referencedColumns: ["id"];
          },
        ];
      };
      settings: {
        Row: {
          general_password: string;
          id: string;
          updated_at: string;
        };
        Insert: {
          general_password: string;
          id?: string;
          updated_at?: string;
        };
        Update: {
          general_password?: string;
          id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      subjects: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      topics: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          subject_id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
          subject_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          subject_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "topics_subject_id_fkey";
            columns: ["subject_id"];
            isOneToOne: false;
            referencedRelation: "subjects";
            referencedColumns: ["id"];
          },
        ];
      };
      users: {
        Row: {
          created_at: string;
          email: string;
          full_name: string;
          has_set_password: boolean;
          id: string;
          role: string;
        };
        Insert: {
          created_at?: string;
          email: string;
          full_name: string;
          has_set_password?: boolean;
          id?: string;
          role?: string;
        };
        Update: {
          created_at?: string;
          email?: string;
          full_name?: string;
          has_set_password?: boolean;
          id?: string;
          role?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      check_email_whitelist: { Args: { check_email: string }; Returns: Json };
      complete_account_setup: {
        Args: { user_email: string; user_id: string };
        Returns: boolean;
      };
      is_admin: { Args: { _user_id: string }; Returns: boolean };
      verify_general_password: {
        Args: { input_password: string };
        Returns: boolean;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;

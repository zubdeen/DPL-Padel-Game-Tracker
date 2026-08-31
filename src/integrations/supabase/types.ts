export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      eliminator_matches: {
        Row: {
          created_at: string;
          created_by: string | null;
          id: string;
          played_at: string;
          team1_games: number;
          team1_player1_id: string;
          team1_player2_id: string;
          team2_games: number;
          team2_player1_id: string;
          team2_player2_id: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          played_at?: string;
          team1_games: number;
          team1_player1_id: string;
          team1_player2_id: string;
          team2_games: number;
          team2_player1_id: string;
          team2_player2_id: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          played_at?: string;
          team1_games?: number;
          team1_player1_id?: string;
          team1_player2_id?: string;
          team2_games?: number;
          team2_player1_id?: string;
          team2_player2_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "eliminator_matches_team1_player1_id_fkey";
            columns: ["team1_player1_id"];
            isOneToOne: false;
            referencedRelation: "players";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "eliminator_matches_team1_player2_id_fkey";
            columns: ["team1_player2_id"];
            isOneToOne: false;
            referencedRelation: "players";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "eliminator_matches_team2_player1_id_fkey";
            columns: ["team2_player1_id"];
            isOneToOne: false;
            referencedRelation: "players";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "eliminator_matches_team2_player2_id_fkey";
            columns: ["team2_player2_id"];
            isOneToOne: false;
            referencedRelation: "players";
            referencedColumns: ["id"];
          },
        ];
      };
      matches: {
        Row: {
          created_at: string;
          created_by: string | null;
          id: string;
          played_at: string;
          team1_games: number;
          team1_name: string | null;
          team1_player1_id: string;
          team1_player2_id: string;
          team2_games: number;
          team2_name: string | null;
          team2_player1_id: string;
          team2_player2_id: string;
          tie_breaker: boolean;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          played_at?: string;
          team1_games: number;
          team1_name?: string | null;
          team1_player1_id: string;
          team1_player2_id: string;
          team2_games: number;
          team2_name?: string | null;
          team2_player1_id: string;
          team2_player2_id: string;
          tie_breaker?: boolean;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          played_at?: string;
          team1_games?: number;
          team1_name?: string | null;
          team1_player1_id?: string;
          team1_player2_id?: string;
          team2_games?: number;
          team2_name?: string | null;
          team2_player1_id?: string;
          team2_player2_id?: string;
          tie_breaker?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "matches_team1_player1_id_fkey";
            columns: ["team1_player1_id"];
            isOneToOne: false;
            referencedRelation: "players";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "matches_team1_player2_id_fkey";
            columns: ["team1_player2_id"];
            isOneToOne: false;
            referencedRelation: "players";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "matches_team2_player1_id_fkey";
            columns: ["team2_player1_id"];
            isOneToOne: false;
            referencedRelation: "players";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "matches_team2_player2_id_fkey";
            columns: ["team2_player2_id"];
            isOneToOne: false;
            referencedRelation: "players";
            referencedColumns: ["id"];
          },
        ];
      };
      players: {
        Row: {
          avatar_url: string | null;
          category: string | null;
          created_at: string;
          id: string;
          is_captain: boolean;
          name: string;
          ranking: number | null;
          team: string | null;
        };
        Insert: {
          avatar_url?: string | null;
          category?: string | null;
          created_at?: string;
          id?: string;
          is_captain?: boolean;
          name: string;
          ranking?: number | null;
          team?: string | null;
        };
        Update: {
          avatar_url?: string | null;
          category?: string | null;
          created_at?: string;
          id?: string;
          is_captain?: boolean;
          name?: string;
          ranking?: number | null;
          team?: string | null;
        };
        Relationships: [];
      };
      season5_lineup_nights: {
        Row: {
          id: string;
          team: string;
          night_date: string;
          status: "DRAFT" | "LOCKED" | "COMPLETED";
          exception_reason: string | null;
          created_at: string;
          created_by: string | null;
          locked_at: string | null;
          locked_by: string | null;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          team: string;
          night_date: string;
          status?: "DRAFT" | "LOCKED" | "COMPLETED";
          exception_reason?: string | null;
          created_at?: string;
          created_by?: string | null;
          locked_at?: string | null;
          locked_by?: string | null;
          completed_at?: string | null;
        };
        Update: {
          id?: string;
          team?: string;
          night_date?: string;
          status?: "DRAFT" | "LOCKED" | "COMPLETED";
          exception_reason?: string | null;
          created_at?: string;
          created_by?: string | null;
          locked_at?: string | null;
          locked_by?: string | null;
          completed_at?: string | null;
        };
        Relationships: [];
      };
      season5_lineup_players: {
        Row: {
          lineup_id: string;
          player_id: string;
          official_tier: string;
          nightly_playing_tier: string;
          lineup_status: "ACTIVE" | "SIT_OUT";
          promotion_source_tier: string | null;
          sort_order: number;
        };
        Insert: {
          lineup_id: string;
          player_id: string;
          official_tier: string;
          nightly_playing_tier: string;
          lineup_status: "ACTIVE" | "SIT_OUT";
          promotion_source_tier?: string | null;
          sort_order: number;
        };
        Update: {
          lineup_id?: string;
          player_id?: string;
          official_tier?: string;
          nightly_playing_tier?: string;
          lineup_status?: "ACTIVE" | "SIT_OUT";
          promotion_source_tier?: string | null;
          sort_order?: number;
        };
        Relationships: [];
      };
      season5_sit_out_ledger: {
        Row: {
          id: string;
          team: string;
          player_id: string;
          official_tier: string;
          total_sit_outs: number;
          previous_sit_out_night: string | null;
          current_sit_out_priority: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          team: string;
          player_id: string;
          official_tier: string;
          total_sit_outs?: number;
          previous_sit_out_night?: string | null;
          current_sit_out_priority?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          team?: string;
          player_id?: string;
          official_tier?: string;
          total_sit_outs?: number;
          previous_sit_out_night?: string | null;
          current_sit_out_priority?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      site_content: {
        Row: {
          content: Json;
          id: string;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          content?: Json;
          id?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          content?: Json;
          id?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [];
      };
      team_rankings: {
        Row: {
          position: number;
          status: string | null;
          team: string;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          position: number;
          status?: string | null;
          team: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          position?: number;
          status?: string | null;
          team?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      admin_claimed: { Args: never; Returns: boolean };
      claim_admin: { Args: never; Returns: boolean };
      complete_season5_lineup: { Args: { target_lineup_id: string }; Returns: boolean };
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
      rename_team: {
        Args: {
          old_team: string;
          new_team: string;
        };
        Returns: boolean;
      };
    };
    Enums: {
      app_role: "admin" | "user";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

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
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const;

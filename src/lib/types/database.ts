// Hand-written Database type matching supabase/migrations/20260519000000_init.sql.
// Once the project is connected, regenerate with `supabase gen types typescript`.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Role = "owner" | "staff";
export type CustomerStatus = "active" | "paused" | "inactive";
export type BundleStatus = "active" | "exhausted" | "expired";
export type SessionStatus = "scheduled" | "confirmed" | "canceled";

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          display_name: string | null;
          role: Role;
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          display_name?: string | null;
          role?: Role;
        };
        Update: {
          email?: string;
          display_name?: string | null;
          role?: Role;
        };
        Relationships: [];
      };
      customers: {
        Row: {
          id: string;
          name: string;
          notes: string | null;
          tags: string[];
          status: CustomerStatus;
          created_at: string;
        };
        Insert: {
          name: string;
          notes?: string | null;
          tags?: string[];
          status?: CustomerStatus;
        };
        Update: {
          name?: string;
          notes?: string | null;
          tags?: string[];
          status?: CustomerStatus;
        };
        Relationships: [];
      };
      pair_groups: {
        Row: {
          id: string;
          name: string;
          customer_a_id: string;
          customer_b_id: string;
          created_at: string;
        };
        Insert: {
          name: string;
          customer_a_id: string;
          customer_b_id: string;
        };
        Update: {
          name?: string;
          customer_a_id?: string;
          customer_b_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "pair_groups_customer_a_id_fkey";
            columns: ["customer_a_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pair_groups_customer_b_id_fkey";
            columns: ["customer_b_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
        ];
      };
      plans: {
        Row: {
          id: string;
          name: string;
          session_count: number;
          total_price: number;
          is_pair: boolean;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          name: string;
          session_count: number;
          total_price: number;
          is_pair?: boolean;
          is_active?: boolean;
        };
        Update: {
          name?: string;
          session_count?: number;
          total_price?: number;
          is_pair?: boolean;
          is_active?: boolean;
        };
        Relationships: [];
      };
      ticket_bundles: {
        Row: {
          id: string;
          plan_id: string;
          customer_id: string | null;
          pair_group_id: string | null;
          purchase_date: string;
          initial_count: number;
          remaining_count: number;
          override_total_price: number | null;
          status: BundleStatus;
          note: string | null;
          created_at: string;
        };
        Insert: {
          plan_id: string;
          customer_id?: string | null;
          pair_group_id?: string | null;
          purchase_date?: string;
          initial_count: number;
          remaining_count: number;
          override_total_price?: number | null;
          status?: BundleStatus;
          note?: string | null;
        };
        Update: {
          plan_id?: string;
          customer_id?: string | null;
          pair_group_id?: string | null;
          purchase_date?: string;
          initial_count?: number;
          remaining_count?: number;
          override_total_price?: number | null;
          status?: BundleStatus;
          note?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "ticket_bundles_plan_id_fkey";
            columns: ["plan_id"];
            isOneToOne: false;
            referencedRelation: "plans";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ticket_bundles_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ticket_bundles_pair_group_id_fkey";
            columns: ["pair_group_id"];
            isOneToOne: false;
            referencedRelation: "pair_groups";
            referencedColumns: ["id"];
          },
        ];
      };
      sessions: {
        Row: {
          id: string;
          start_at: string;
          end_at: string;
          notes: string | null;
          status: SessionStatus;
          confirmed_at: string | null;
          confirmed_by: string | null;
          created_at: string;
        };
        Insert: {
          start_at: string;
          end_at: string;
          notes?: string | null;
          status?: SessionStatus;
        };
        Update: {
          start_at?: string;
          end_at?: string;
          notes?: string | null;
          status?: SessionStatus;
        };
        Relationships: [];
      };
      session_participants: {
        Row: {
          id: string;
          session_id: string;
          customer_id: string;
          ticket_bundle_id: string;
          consumed: boolean;
          revenue_amount: number;
          is_pair_primary: boolean;
          created_at: string;
        };
        Insert: {
          session_id: string;
          customer_id: string;
          ticket_bundle_id: string;
          consumed?: boolean;
          revenue_amount?: number;
          is_pair_primary?: boolean;
        };
        Update: {
          session_id?: string;
          customer_id?: string;
          ticket_bundle_id?: string;
          consumed?: boolean;
          revenue_amount?: number;
          is_pair_primary?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "session_participants_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "session_participants_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "session_participants_ticket_bundle_id_fkey";
            columns: ["ticket_bundle_id"];
            isOneToOne: false;
            referencedRelation: "ticket_bundles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      monthly_revenue: {
        Row: {
          month: string;
          revenue: number;
          consumed_sessions: number;
        };
        Relationships: [];
      };
      customer_ticket_summary: {
        Row: {
          customer_id: string;
          name: string;
          status: CustomerStatus;
          remaining_tickets: number;
          last_session_at: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      confirm_session: {
        Args: { p_session_id: string };
        Returns: undefined;
      };
      cancel_session: {
        Args: { p_session_id: string };
        Returns: undefined;
      };
      revert_session: {
        Args: { p_session_id: string };
        Returns: undefined;
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

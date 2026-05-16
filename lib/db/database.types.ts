export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = "student" | "organizer" | "admin";
export type AccountStatus = "pending" | "approved" | "rejected";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          university_id: string | null;
          club_name: string | null;
          role: UserRole;
          account_status: AccountStatus;
          manual_interests: string[];
          created_at: string;
        };
        Insert: {
          id: string;
          full_name?: string;
          university_id?: string | null;
          club_name?: string | null;
          role?: UserRole;
          account_status?: AccountStatus;
          manual_interests?: string[];
          created_at?: string;
        };
        Update: {
          full_name?: string;
          university_id?: string | null;
          club_name?: string | null;
          role?: UserRole;
          account_status?: AccountStatus;
          manual_interests?: string[];
        };
        Relationships: [];
      };
      events: {
        Row: {
          id: string;
          organizer_id: string;
          title: string;
          description: string;
          proposal_file_url: string | null;
          start_at: string | null;
          end_at: string | null;
          venue: string | null;
          grid_row: number;
          grid_col: number;
          is_open_event: boolean;
          is_pinned: boolean;
          upvote_count: number;
          ticket_capacity: number;
          merch_items: Json;
          is_draft: boolean;
          social_caption_staging: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organizer_id: string;
          title?: string;
          description?: string;
          proposal_file_url?: string | null;
          start_at?: string | null;
          end_at?: string | null;
          venue?: string | null;
          grid_row?: number;
          grid_col?: number;
          is_open_event?: boolean;
          is_pinned?: boolean;
          upvote_count?: number;
          ticket_capacity?: number;
          merch_items?: Json;
          is_draft?: boolean;
          social_caption_staging?: string | null;
          created_at?: string;
        };
        Update: {
          title?: string;
          description?: string;
          proposal_file_url?: string | null;
          start_at?: string | null;
          end_at?: string | null;
          venue?: string | null;
          grid_row?: number;
          grid_col?: number;
          is_open_event?: boolean;
          is_pinned?: boolean;
          upvote_count?: number;
          ticket_capacity?: number;
          merch_items?: Json;
          is_draft?: boolean;
          social_caption_staging?: string | null;
        };
        Relationships: [];
      };
      registrations: {
        Row: {
          id: string;
          event_id: string;
          student_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          student_id: string;
          created_at?: string;
        };
        Update: {
          event_id?: string;
          student_id?: string;
        };
        Relationships: [];
      };
      merch_purchases: {
        Row: {
          id: string;
          event_id: string;
          student_id: string;
          item_id: string;
          item_name: string;
          price: string;
          quantity: number;
          purchase_date: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          student_id: string;
          item_id: string;
          item_name: string;
          price: string | number;
          quantity?: number;
          purchase_date?: string;
        };
        Update: {
          quantity?: number;
        };
        Relationships: [];
      };
      app_config: {
        Row: {
          id: number;
          grid_n: number;
          updated_at: string;
        };
        Insert: {
          id?: number;
          grid_n?: number;
          updated_at?: string;
        };
        Update: {
          grid_n?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      increment_upvote: {
        Args: { p_event_id: string };
        Returns: undefined;
      };
      register_for_event: {
        Args: { p_event_id: string };
        Returns: Json;
      };
      purchase_merch: {
        Args: {
          p_event_id: string;
          p_item_id: string;
          p_quantity?: number;
        };
        Returns: Json;
      };
    };
    Enums: {
      user_role: UserRole;
      account_status: AccountStatus;
    };
  };
}

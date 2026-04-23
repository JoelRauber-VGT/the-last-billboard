export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          display_name: string | null
          is_admin: boolean
          created_at: string
        }
        Insert: {
          id: string
          email: string
          display_name?: string | null
          is_admin?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          display_name?: string | null
          is_admin?: boolean
          created_at?: string
        }
        Relationships: []
      }
      slots: {
        Row: {
          id: string
          current_owner_id: string | null
          current_bid_eur: number
          image_url: string | null
          link_url: string
          display_name: string
          brand_color: string | null
          status: 'active' | 'frozen' | 'removed'
          layout_width: number
          layout_height: number
          pan_x: number
          pan_y: number
          zoom: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          current_owner_id?: string | null
          current_bid_eur: number
          image_url?: string | null
          link_url: string
          display_name: string
          brand_color?: string | null
          status?: 'active' | 'frozen' | 'removed'
          layout_width: number
          layout_height: number
          pan_x?: number
          pan_y?: number
          zoom?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          current_owner_id?: string | null
          current_bid_eur?: number
          image_url?: string | null
          link_url?: string
          display_name?: string
          brand_color?: string | null
          status?: 'active' | 'frozen' | 'removed'
          layout_width?: number
          layout_height?: number
          pan_x?: number
          pan_y?: number
          zoom?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "slots_current_owner_id_fkey"
            columns: ["current_owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      slot_history: {
        Row: {
          id: string
          slot_id: string
          owner_id: string | null
          display_name: string
          bid_eur: number
          image_url: string | null
          link_url: string | null
          started_at: string
          ended_at: string | null
          displaced_by_id: string | null
        }
        Insert: {
          id?: string
          slot_id: string
          owner_id?: string | null
          display_name: string
          bid_eur: number
          image_url?: string | null
          link_url?: string | null
          started_at: string
          ended_at?: string | null
          displaced_by_id?: string | null
        }
        Update: {
          id?: string
          slot_id?: string
          owner_id?: string | null
          display_name?: string
          bid_eur?: number
          image_url?: string | null
          link_url?: string | null
          started_at?: string
          ended_at?: string | null
          displaced_by_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "slot_history_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "slots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "slot_history_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "slot_history_displaced_by_id_fkey"
            columns: ["displaced_by_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      transactions: {
        Row: {
          id: string
          user_id: string | null
          slot_id: string | null
          type: 'bid' | 'refund'
          amount_eur: number
          commission_eur: number
          stripe_session_id: string | null
          stripe_payment_intent_id: string | null
          status: 'pending' | 'completed' | 'failed' | 'refunded'
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          slot_id?: string | null
          type: 'bid' | 'refund'
          amount_eur: number
          commission_eur?: number
          stripe_session_id?: string | null
          stripe_payment_intent_id?: string | null
          status: 'pending' | 'completed' | 'failed' | 'refunded'
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          slot_id?: string | null
          type?: 'bid' | 'refund'
          amount_eur?: number
          commission_eur?: number
          stripe_session_id?: string | null
          stripe_payment_intent_id?: string | null
          status?: 'pending' | 'completed' | 'failed' | 'refunded'
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "slots"
            referencedColumns: ["id"]
          }
        ]
      }
      reports: {
        Row: {
          id: string
          slot_id: string
          reporter_id: string | null
          reason: string
          details: string | null
          status: 'open' | 'resolved' | 'dismissed'
          created_at: string
          resolved_at: string | null
          resolved_by_id: string | null
        }
        Insert: {
          id?: string
          slot_id: string
          reporter_id?: string | null
          reason: string
          details?: string | null
          status?: 'open' | 'resolved' | 'dismissed'
          created_at?: string
          resolved_at?: string | null
          resolved_by_id?: string | null
        }
        Update: {
          id?: string
          slot_id?: string
          reporter_id?: string | null
          reason?: string
          details?: string | null
          status?: 'open' | 'resolved' | 'dismissed'
          created_at?: string
          resolved_at?: string | null
          resolved_by_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reports_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "slots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_resolved_by_id_fkey"
            columns: ["resolved_by_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      admin_audit_log: {
        Row: {
          id: string
          admin_id: string
          action: string
          target_type: string | null
          target_id: string | null
          details: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          admin_id: string
          action: string
          target_type?: string | null
          target_id?: string | null
          details?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          admin_id?: string
          action?: string
          target_type?: string | null
          target_id?: string | null
          details?: Json | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_audit_log_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
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

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (Database["public"]["Tables"] & Database["public"]["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (Database["public"]["Tables"] &
      Database["public"]["Views"])
  ? (Database["public"]["Tables"] &
      Database["public"]["Views"])[PublicTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
  ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
  ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof Database["public"]["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof Database["public"]["Enums"]
  ? Database["public"]["Enums"][PublicEnumNameOrOptions]
  : never

// Type aliases for convenient access
export type Slot = Tables<'slots'>
export type SlotHistory = Tables<'slot_history'>
export type Profile = Tables<'profiles'>
export type Transaction = Tables<'transactions'>
export type Report = Tables<'reports'>
export type AdminAuditLog = Tables<'admin_audit_log'>

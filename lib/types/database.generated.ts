export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          entity_type: string
          farm_id: string
          id: string
          metadata: Json | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          farm_id: string
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          farm_id?: string
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          created_at: string
          farm_id: string
          id: string
          name: string
          notes: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          farm_id: string
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          farm_id?: string
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_egg_size_production: {
        Row: {
          created_at: string
          daily_production_id: string
          egg_size_id: string
          id: string
          quantity: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          daily_production_id: string
          egg_size_id: string
          id?: string
          quantity?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          daily_production_id?: string
          egg_size_id?: string
          id?: string
          quantity?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_egg_size_production_daily_production_id_fkey"
            columns: ["daily_production_id"]
            isOneToOne: false
            referencedRelation: "daily_production"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_egg_size_production_egg_size_id_fkey"
            columns: ["egg_size_id"]
            isOneToOne: false
            referencedRelation: "egg_inventory_balances"
            referencedColumns: ["egg_size_id"]
          },
          {
            foreignKeyName: "daily_egg_size_production_egg_size_id_fkey"
            columns: ["egg_size_id"]
            isOneToOne: false
            referencedRelation: "egg_sizes"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_production: {
        Row: {
          average_egg_weight: number | null
          broken_eggs: number
          created_at: string
          dirty_eggs: number
          eggs_collected: number
          farm_id: string
          flock_id: string
          hens_present: number
          id: string
          mortality: number
          notes: string | null
          production_date: string
          updated_at: string
        }
        Insert: {
          average_egg_weight?: number | null
          broken_eggs?: number
          created_at?: string
          dirty_eggs?: number
          eggs_collected?: number
          farm_id: string
          flock_id: string
          hens_present: number
          id?: string
          mortality?: number
          notes?: string | null
          production_date: string
          updated_at?: string
        }
        Update: {
          average_egg_weight?: number | null
          broken_eggs?: number
          created_at?: string
          dirty_eggs?: number
          eggs_collected?: number
          farm_id?: string
          flock_id?: string
          hens_present?: number
          id?: string
          mortality?: number
          notes?: string | null
          production_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_production_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_production_flock_id_fkey"
            columns: ["flock_id"]
            isOneToOne: false
            referencedRelation: "flocks"
            referencedColumns: ["id"]
          },
        ]
      }
      egg_inventory_adjustments: {
        Row: {
          adjustment_date: string
          created_at: string
          created_by: string | null
          egg_size_id: string
          farm_id: string
          id: string
          quantity_eggs: number
          reason: string
          updated_at: string
        }
        Insert: {
          adjustment_date?: string
          created_at?: string
          created_by?: string | null
          egg_size_id: string
          farm_id: string
          id?: string
          quantity_eggs: number
          reason?: string
          updated_at?: string
        }
        Update: {
          adjustment_date?: string
          created_at?: string
          created_by?: string | null
          egg_size_id?: string
          farm_id?: string
          id?: string
          quantity_eggs?: number
          reason?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "egg_inventory_adjustments_egg_size_id_fkey"
            columns: ["egg_size_id"]
            isOneToOne: false
            referencedRelation: "egg_inventory_balances"
            referencedColumns: ["egg_size_id"]
          },
          {
            foreignKeyName: "egg_inventory_adjustments_egg_size_id_fkey"
            columns: ["egg_size_id"]
            isOneToOne: false
            referencedRelation: "egg_sizes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "egg_inventory_adjustments_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
      egg_prices: {
        Row: {
          created_at: string
          effective_from: string
          effective_to: string | null
          egg_size_id: string
          farm_id: string
          id: string
          price_per_egg: number
          price_per_tray: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          effective_from?: string
          effective_to?: string | null
          egg_size_id: string
          farm_id: string
          id?: string
          price_per_egg: number
          price_per_tray: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          effective_from?: string
          effective_to?: string | null
          egg_size_id?: string
          farm_id?: string
          id?: string
          price_per_egg?: number
          price_per_tray?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "egg_prices_egg_size_id_fkey"
            columns: ["egg_size_id"]
            isOneToOne: false
            referencedRelation: "egg_inventory_balances"
            referencedColumns: ["egg_size_id"]
          },
          {
            foreignKeyName: "egg_prices_egg_size_id_fkey"
            columns: ["egg_size_id"]
            isOneToOne: false
            referencedRelation: "egg_sizes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "egg_prices_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
      egg_sale_items: {
        Row: {
          created_at: string
          egg_size_id: string
          id: string
          price_per_egg: number
          price_per_tray: number
          quantity_eggs: number
          quantity_trays: number
          sale_id: string
          subtotal: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          egg_size_id: string
          id?: string
          price_per_egg?: number
          price_per_tray?: number
          quantity_eggs?: number
          quantity_trays?: number
          sale_id: string
          subtotal?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          egg_size_id?: string
          id?: string
          price_per_egg?: number
          price_per_tray?: number
          quantity_eggs?: number
          quantity_trays?: number
          sale_id?: string
          subtotal?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "egg_sale_items_egg_size_id_fkey"
            columns: ["egg_size_id"]
            isOneToOne: false
            referencedRelation: "egg_inventory_balances"
            referencedColumns: ["egg_size_id"]
          },
          {
            foreignKeyName: "egg_sale_items_egg_size_id_fkey"
            columns: ["egg_size_id"]
            isOneToOne: false
            referencedRelation: "egg_sizes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "egg_sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "egg_sales"
            referencedColumns: ["id"]
          },
        ]
      }
      egg_sales: {
        Row: {
          amount_paid: number
          created_at: string
          customer_id: string | null
          farm_id: string
          flock_id: string | null
          id: string
          notes: string | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          sale_date: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          amount_paid?: number
          created_at?: string
          customer_id?: string | null
          farm_id: string
          flock_id?: string | null
          id?: string
          notes?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          sale_date: string
          total_amount?: number
          updated_at?: string
        }
        Update: {
          amount_paid?: number
          created_at?: string
          customer_id?: string | null
          farm_id?: string
          flock_id?: string | null
          id?: string
          notes?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          sale_date?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "egg_sales_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "egg_sales_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "egg_sales_flock_id_fkey"
            columns: ["flock_id"]
            isOneToOne: false
            referencedRelation: "flocks"
            referencedColumns: ["id"]
          },
        ]
      }
      egg_sizes: {
        Row: {
          code: string
          created_at: string
          farm_id: string
          id: string
          is_active: boolean
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          farm_id: string
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          farm_id?: string
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "egg_sizes_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category: Database["public"]["Enums"]["expense_category"]
          created_at: string
          description: string
          expense_date: string
          farm_id: string
          flock_id: string | null
          id: string
          updated_at: string
        }
        Insert: {
          amount: number
          category?: Database["public"]["Enums"]["expense_category"]
          created_at?: string
          description?: string
          expense_date: string
          farm_id: string
          flock_id?: string | null
          id?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: Database["public"]["Enums"]["expense_category"]
          created_at?: string
          description?: string
          expense_date?: string
          farm_id?: string
          flock_id?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_flock_id_fkey"
            columns: ["flock_id"]
            isOneToOne: false
            referencedRelation: "flocks"
            referencedColumns: ["id"]
          },
        ]
      }
      farm_members: {
        Row: {
          created_at: string
          farm_id: string
          id: string
          role: Database["public"]["Enums"]["farm_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          farm_id: string
          id?: string
          role?: Database["public"]["Enums"]["farm_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          farm_id?: string
          id?: string
          role?: Database["public"]["Enums"]["farm_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "farm_members_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
      farms: {
        Row: {
          barangay: string | null
          country: string
          created_at: string
          currency: string
          id: string
          location: string | null
          municipality: string
          name: string
          owner_id: string
          province: string
          timezone: string
          updated_at: string
        }
        Insert: {
          barangay?: string | null
          country?: string
          created_at?: string
          currency?: string
          id?: string
          location?: string | null
          municipality?: string
          name: string
          owner_id: string
          province?: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          barangay?: string | null
          country?: string
          created_at?: string
          currency?: string
          id?: string
          location?: string | null
          municipality?: string
          name?: string
          owner_id?: string
          province?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      feed_usage: {
        Row: {
          cost_per_kg: number
          created_at: string
          daily_production_id: string | null
          farm_id: string
          feed_type: string | null
          flock_id: string
          id: string
          notes: string | null
          quantity_kg: number
          total_cost: number
          updated_at: string
          usage_date: string
        }
        Insert: {
          cost_per_kg?: number
          created_at?: string
          daily_production_id?: string | null
          farm_id: string
          feed_type?: string | null
          flock_id: string
          id?: string
          notes?: string | null
          quantity_kg: number
          total_cost?: number
          updated_at?: string
          usage_date: string
        }
        Update: {
          cost_per_kg?: number
          created_at?: string
          daily_production_id?: string | null
          farm_id?: string
          feed_type?: string | null
          flock_id?: string
          id?: string
          notes?: string | null
          quantity_kg?: number
          total_cost?: number
          updated_at?: string
          usage_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "feed_usage_daily_production_id_fkey"
            columns: ["daily_production_id"]
            isOneToOne: false
            referencedRelation: "daily_production"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feed_usage_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feed_usage_flock_id_fkey"
            columns: ["flock_id"]
            isOneToOne: false
            referencedRelation: "flocks"
            referencedColumns: ["id"]
          },
        ]
      }
      flocks: {
        Row: {
          breed: string
          created_at: string
          current_hens: number
          farm_id: string
          house_id: string
          id: string
          initial_hens: number
          name: string
          notes: string | null
          placement_date: string
          start_laying_date: string | null
          status: Database["public"]["Enums"]["flock_status"]
          updated_at: string
        }
        Insert: {
          breed?: string
          created_at?: string
          current_hens: number
          farm_id: string
          house_id: string
          id?: string
          initial_hens: number
          name: string
          notes?: string | null
          placement_date: string
          start_laying_date?: string | null
          status?: Database["public"]["Enums"]["flock_status"]
          updated_at?: string
        }
        Update: {
          breed?: string
          created_at?: string
          current_hens?: number
          farm_id?: string
          house_id?: string
          id?: string
          initial_hens?: number
          name?: string
          notes?: string | null
          placement_date?: string
          start_laying_date?: string | null
          status?: Database["public"]["Enums"]["flock_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "flocks_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flocks_house_id_fkey"
            columns: ["house_id"]
            isOneToOne: false
            referencedRelation: "houses"
            referencedColumns: ["id"]
          },
        ]
      }
      houses: {
        Row: {
          capacity: number
          created_at: string
          farm_id: string
          id: string
          name: string
          notes: string | null
          updated_at: string
        }
        Insert: {
          capacity: number
          created_at?: string
          farm_id: string
          id?: string
          name: string
          notes?: string | null
          updated_at?: string
        }
        Update: {
          capacity?: number
          created_at?: string
          farm_id?: string
          id?: string
          name?: string
          notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "houses_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
      mortality_records: {
        Row: {
          created_at: string
          daily_production_id: string | null
          farm_id: string
          flock_id: string
          id: string
          notes: string | null
          quantity: number
          reason: string | null
          record_date: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          daily_production_id?: string | null
          farm_id: string
          flock_id: string
          id?: string
          notes?: string | null
          quantity: number
          reason?: string | null
          record_date: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          daily_production_id?: string | null
          farm_id?: string
          flock_id?: string
          id?: string
          notes?: string | null
          quantity?: number
          reason?: string | null
          record_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mortality_records_daily_production_id_fkey"
            columns: ["daily_production_id"]
            isOneToOne: true
            referencedRelation: "daily_production"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mortality_records_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mortality_records_flock_id_fkey"
            columns: ["flock_id"]
            isOneToOne: false
            referencedRelation: "flocks"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          billing_provider: string | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          farm_id: string
          id: string
          plan: Database["public"]["Enums"]["subscription_plan"]
          provider_customer_id: string | null
          provider_subscription_id: string | null
          status: Database["public"]["Enums"]["subscription_status"]
          updated_at: string
        }
        Insert: {
          billing_provider?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          farm_id: string
          id?: string
          plan?: Database["public"]["Enums"]["subscription_plan"]
          provider_customer_id?: string | null
          provider_subscription_id?: string | null
          status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
        }
        Update: {
          billing_provider?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          farm_id?: string
          id?: string
          plan?: Database["public"]["Enums"]["subscription_plan"]
          provider_customer_id?: string | null
          provider_subscription_id?: string | null
          status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: true
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
      vaccinations: {
        Row: {
          created_at: string
          farm_id: string
          flock_id: string
          id: string
          notes: string | null
          updated_at: string
          vaccination_date: string
          vaccine_name: string
        }
        Insert: {
          created_at?: string
          farm_id: string
          flock_id: string
          id?: string
          notes?: string | null
          updated_at?: string
          vaccination_date: string
          vaccine_name: string
        }
        Update: {
          created_at?: string
          farm_id?: string
          flock_id?: string
          id?: string
          notes?: string | null
          updated_at?: string
          vaccination_date?: string
          vaccine_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "vaccinations_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vaccinations_flock_id_fkey"
            columns: ["flock_id"]
            isOneToOne: false
            referencedRelation: "flocks"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      egg_grading_summary: {
        Row: {
          eggs_collected: number | null
          eggs_graded: number | null
          eggs_ungraded: number | null
          farm_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_production_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
      egg_inventory_balances: {
        Row: {
          egg_size_code: string | null
          egg_size_id: string | null
          egg_size_name: string | null
          eggs_adjusted: number | null
          eggs_available: number | null
          eggs_produced: number | null
          eggs_sold: number | null
          farm_id: string | null
          sort_order: number | null
        }
        Relationships: [
          {
            foreignKeyName: "egg_sizes_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      record_daily_production: {
        Args: {
          p_average_egg_weight?: number
          p_broken_eggs?: number
          p_dirty_eggs?: number
          p_eggs_collected: number
          p_feed_cost_per_kg?: number
          p_feed_kg?: number
          p_flock_id: string
          p_hens_present: number
          p_mortality?: number
          p_notes?: string
          p_production_date: string
          p_sizes?: Json
        }
        Returns: string
      }
      record_egg_sale: {
        Args: {
          p_amount_paid?: number
          p_customer_id?: string
          p_flock_id?: string
          p_items: Json
          p_notes?: string
          p_sale_date: string
        }
        Returns: string
      }
      set_egg_price: {
        Args: {
          p_effective_from: string
          p_egg_size_id: string
          p_price_per_egg: number
          p_price_per_tray: number
        }
        Returns: string
      }
    }
    Enums: {
      expense_category:
        | "FEED"
        | "CHICKS"
        | "MEDICINE"
        | "VACCINE"
        | "LABOR"
        | "ELECTRICITY"
        | "WATER"
        | "TRANSPORT"
        | "EQUIPMENT"
        | "OTHER"
      farm_role: "OWNER" | "MANAGER" | "WORKER"
      flock_status: "GROWING" | "PRODUCING" | "SOLD" | "CLOSED"
      payment_status: "PAID" | "PARTIAL" | "UNPAID"
      subscription_plan: "FREE" | "STARTER" | "PRO"
      subscription_status:
        | "ACTIVE"
        | "TRIALING"
        | "PAST_DUE"
        | "CANCELED"
        | "EXPIRED"
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
    Enums: {
      expense_category: [
        "FEED",
        "CHICKS",
        "MEDICINE",
        "VACCINE",
        "LABOR",
        "ELECTRICITY",
        "WATER",
        "TRANSPORT",
        "EQUIPMENT",
        "OTHER",
      ],
      farm_role: ["OWNER", "MANAGER", "WORKER"],
      flock_status: ["GROWING", "PRODUCING", "SOLD", "CLOSED"],
      payment_status: ["PAID", "PARTIAL", "UNPAID"],
      subscription_plan: ["FREE", "STARTER", "PRO"],
      subscription_status: [
        "ACTIVE",
        "TRIALING",
        "PAST_DUE",
        "CANCELED",
        "EXPIRED",
      ],
    },
  },
} as const


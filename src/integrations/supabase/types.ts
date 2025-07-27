export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      clients: {
        Row: {
          address: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          outstanding_balance: number | null
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          outstanding_balance?: number | null
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          outstanding_balance?: number | null
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      deliverables: {
        Row: {
          act_activity_type: string | null
          act_activity_type_id: number | null
          act_raw_data: Json | null
          act_series_id: string | null
          act_task_id: string | null
          client_id: string
          created_at: string
          description: string | null
          due_date: string
          end_time: string | null
          fee_amount: number | null
          has_reminder: boolean | null
          id: string
          is_billable: boolean | null
          is_completed: boolean | null
          last_synced_at: string | null
          opportunity_id: string | null
          priority: string | null
          start_time: string | null
          status: string
          sync_error_message: string | null
          sync_status: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          act_activity_type?: string | null
          act_activity_type_id?: number | null
          act_raw_data?: Json | null
          act_series_id?: string | null
          act_task_id?: string | null
          client_id: string
          created_at?: string
          description?: string | null
          due_date: string
          end_time?: string | null
          fee_amount?: number | null
          has_reminder?: boolean | null
          id?: string
          is_billable?: boolean | null
          is_completed?: boolean | null
          last_synced_at?: string | null
          opportunity_id?: string | null
          priority?: string | null
          start_time?: string | null
          status?: string
          sync_error_message?: string | null
          sync_status?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          act_activity_type?: string | null
          act_activity_type_id?: number | null
          act_raw_data?: Json | null
          act_series_id?: string | null
          act_task_id?: string | null
          client_id?: string
          created_at?: string
          description?: string | null
          due_date?: string
          end_time?: string | null
          fee_amount?: number | null
          has_reminder?: boolean | null
          id?: string
          is_billable?: boolean | null
          is_completed?: boolean | null
          last_synced_at?: string | null
          opportunity_id?: string | null
          priority?: string | null
          start_time?: string | null
          status?: string
          sync_error_message?: string | null
          sync_status?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deliverables_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliverables_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_logs: {
        Row: {
          act_connection_id: string | null
          act_database_name: string | null
          api_endpoint: string | null
          completed_at: string | null
          created_at: string | null
          entity_id: string | null
          entity_type: string | null
          error_details: Json | null
          error_message: string | null
          http_method: string | null
          http_status_code: number | null
          id: string
          is_retry: boolean | null
          operation_status: string
          operation_type: string
          parent_log_id: string | null
          records_created: number | null
          records_failed: number | null
          records_processed: number | null
          records_updated: number | null
          related_record_id: string | null
          related_table: string | null
          request_params: Json | null
          response_data: Json | null
          response_time_ms: number | null
          retry_count: number | null
          started_at: string | null
          sync_batch_id: string | null
          user_id: string
        }
        Insert: {
          act_connection_id?: string | null
          act_database_name?: string | null
          api_endpoint?: string | null
          completed_at?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          error_details?: Json | null
          error_message?: string | null
          http_method?: string | null
          http_status_code?: number | null
          id?: string
          is_retry?: boolean | null
          operation_status: string
          operation_type: string
          parent_log_id?: string | null
          records_created?: number | null
          records_failed?: number | null
          records_processed?: number | null
          records_updated?: number | null
          related_record_id?: string | null
          related_table?: string | null
          request_params?: Json | null
          response_data?: Json | null
          response_time_ms?: number | null
          retry_count?: number | null
          started_at?: string | null
          sync_batch_id?: string | null
          user_id: string
        }
        Update: {
          act_connection_id?: string | null
          act_database_name?: string | null
          api_endpoint?: string | null
          completed_at?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          error_details?: Json | null
          error_message?: string | null
          http_method?: string | null
          http_status_code?: number | null
          id?: string
          is_retry?: boolean | null
          operation_status?: string
          operation_type?: string
          parent_log_id?: string | null
          records_created?: number | null
          records_failed?: number | null
          records_processed?: number | null
          records_updated?: number | null
          related_record_id?: string | null
          related_table?: string | null
          request_params?: Json | null
          response_data?: Json | null
          response_time_ms?: number | null
          retry_count?: number | null
          started_at?: string | null
          sync_batch_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_logs_act_connection_id_fkey"
            columns: ["act_connection_id"]
            isOneToOne: false
            referencedRelation: "user_act_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_logs_parent_log_id_fkey"
            columns: ["parent_log_id"]
            isOneToOne: false
            referencedRelation: "integration_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_line_items: {
        Row: {
          act_reference: string | null
          created_at: string | null
          deliverable_id: string | null
          description: string
          details: string | null
          id: string
          invoice_id: string
          item_type: string
          line_number: number
          line_total: number | null
          opportunity_id: string | null
          quantity: number | null
          service_period_end: string | null
          service_period_start: string | null
          unit_rate: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          act_reference?: string | null
          created_at?: string | null
          deliverable_id?: string | null
          description: string
          details?: string | null
          id?: string
          invoice_id: string
          item_type: string
          line_number: number
          line_total?: number | null
          opportunity_id?: string | null
          quantity?: number | null
          service_period_end?: string | null
          service_period_start?: string | null
          unit_rate?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          act_reference?: string | null
          created_at?: string | null
          deliverable_id?: string | null
          description?: string
          details?: string | null
          id?: string
          invoice_id?: string
          item_type?: string
          line_number?: number
          line_total?: number | null
          opportunity_id?: string | null
          quantity?: number | null
          service_period_end?: string | null
          service_period_start?: string | null
          unit_rate?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_line_items_deliverable_id_fkey"
            columns: ["deliverable_id"]
            isOneToOne: false
            referencedRelation: "deliverables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_line_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_line_items_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          act_file_uploaded: boolean | null
          act_task_id: string | null
          act_upload_error: string | null
          amount: number
          auto_generated: boolean | null
          billing_period_end: string | null
          billing_period_start: string | null
          billing_type: string | null
          client_id: string
          created_at: string
          deliverables_amount: number | null
          due_date: string | null
          file_generated_at: string | null
          file_size_bytes: number | null
          generation_source: string | null
          id: string
          invoice_date: string
          invoice_file_path: string | null
          invoice_file_url: string | null
          invoice_number: string
          month_year: string
          opportunity_id: string | null
          payment_date: string | null
          payment_method: string | null
          payment_notes: string | null
          payment_reference: string | null
          retainer_amount: number | null
          status: Database["public"]["Enums"]["invoice_status"] | null
          subtotal: number | null
          tax_amount: number | null
          total_amount: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          act_file_uploaded?: boolean | null
          act_task_id?: string | null
          act_upload_error?: string | null
          amount?: number
          auto_generated?: boolean | null
          billing_period_end?: string | null
          billing_period_start?: string | null
          billing_type?: string | null
          client_id: string
          created_at?: string
          deliverables_amount?: number | null
          due_date?: string | null
          file_generated_at?: string | null
          file_size_bytes?: number | null
          generation_source?: string | null
          id?: string
          invoice_date?: string
          invoice_file_path?: string | null
          invoice_file_url?: string | null
          invoice_number: string
          month_year: string
          opportunity_id?: string | null
          payment_date?: string | null
          payment_method?: string | null
          payment_notes?: string | null
          payment_reference?: string | null
          retainer_amount?: number | null
          status?: Database["public"]["Enums"]["invoice_status"] | null
          subtotal?: number | null
          tax_amount?: number | null
          total_amount?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          act_file_uploaded?: boolean | null
          act_task_id?: string | null
          act_upload_error?: string | null
          amount?: number
          auto_generated?: boolean | null
          billing_period_end?: string | null
          billing_period_start?: string | null
          billing_type?: string | null
          client_id?: string
          created_at?: string
          deliverables_amount?: number | null
          due_date?: string | null
          file_generated_at?: string | null
          file_size_bytes?: number | null
          generation_source?: string | null
          id?: string
          invoice_date?: string
          invoice_file_path?: string | null
          invoice_file_url?: string | null
          invoice_number?: string
          month_year?: string
          opportunity_id?: string | null
          payment_date?: string | null
          payment_method?: string | null
          payment_notes?: string | null
          payment_reference?: string | null
          retainer_amount?: number | null
          status?: Database["public"]["Enums"]["invoice_status"] | null
          subtotal?: number | null
          tax_amount?: number | null
          total_amount?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunities: {
        Row: {
          act_opportunity_id: string
          act_raw_data: Json | null
          actual_close_date: string | null
          company_name: string
          contact_email: string | null
          contract_end_date: string | null
          contract_start_date: string | null
          created_at: string | null
          id: string
          last_synced_at: string | null
          name: string
          primary_contact: string
          probability: number | null
          retainer_amount: number | null
          retainer_end_date: string | null
          retainer_start_date: string | null
          status: string
          sync_error_message: string | null
          sync_status: string | null
          total_contract_value: number
          updated_at: string | null
          user_id: string
          weighted_value: number | null
        }
        Insert: {
          act_opportunity_id: string
          act_raw_data?: Json | null
          actual_close_date?: string | null
          company_name: string
          contact_email?: string | null
          contract_end_date?: string | null
          contract_start_date?: string | null
          created_at?: string | null
          id?: string
          last_synced_at?: string | null
          name: string
          primary_contact: string
          probability?: number | null
          retainer_amount?: number | null
          retainer_end_date?: string | null
          retainer_start_date?: string | null
          status?: string
          sync_error_message?: string | null
          sync_status?: string | null
          total_contract_value?: number
          updated_at?: string | null
          user_id: string
          weighted_value?: number | null
        }
        Update: {
          act_opportunity_id?: string
          act_raw_data?: Json | null
          actual_close_date?: string | null
          company_name?: string
          contact_email?: string | null
          contract_end_date?: string | null
          contract_start_date?: string | null
          created_at?: string | null
          id?: string
          last_synced_at?: string | null
          name?: string
          primary_contact?: string
          probability?: number | null
          retainer_amount?: number | null
          retainer_end_date?: string | null
          retainer_start_date?: string | null
          status?: string
          sync_error_message?: string | null
          sync_status?: string | null
          total_contract_value?: number
          updated_at?: string | null
          user_id?: string
          weighted_value?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          role: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          role?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          role?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_act_connections: {
        Row: {
          act_database_name: string
          act_password_encrypted: string
          act_region: string
          act_username: string
          api_base_url: string | null
          cached_bearer_token: string | null
          connection_error: string | null
          connection_name: string | null
          connection_status: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          last_connection_test: string | null
          last_sync_at: string | null
          token_expires_at: string | null
          token_last_refreshed_at: string | null
          total_api_calls: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          act_database_name: string
          act_password_encrypted: string
          act_region?: string
          act_username: string
          api_base_url?: string | null
          cached_bearer_token?: string | null
          connection_error?: string | null
          connection_name?: string | null
          connection_status?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          last_connection_test?: string | null
          last_sync_at?: string | null
          token_expires_at?: string | null
          token_last_refreshed_at?: string | null
          total_api_calls?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          act_database_name?: string
          act_password_encrypted?: string
          act_region?: string
          act_username?: string
          api_base_url?: string | null
          cached_bearer_token?: string | null
          connection_error?: string | null
          connection_name?: string | null
          connection_status?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          last_connection_test?: string | null
          last_sync_at?: string | null
          token_expires_at?: string | null
          token_last_refreshed_at?: string | null
          total_api_calls?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      complete_integration_log: {
        Args: {
          log_id: string
          status: string
          http_code?: number
          response_data?: Json
          error_msg?: string
          error_details?: Json
          records_processed?: number
          records_created?: number
          records_updated?: number
          records_failed?: number
        }
        Returns: undefined
      }
      update_overdue_invoices: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
    }
    Enums: {
      invoice_status: "draft" | "invoiced" | "paid" | "overdue"
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
      invoice_status: ["draft", "invoiced", "paid", "overdue"],
    },
  },
} as const

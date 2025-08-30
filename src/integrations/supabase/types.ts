export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
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
      credential_access_logs: {
        Row: {
          access_timestamp: string | null
          access_type: string
          connection_id: string | null
          error_message: string | null
          id: string
          ip_address: unknown | null
          success: boolean | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          access_timestamp?: string | null
          access_type: string
          connection_id?: string | null
          error_message?: string | null
          id?: string
          ip_address?: unknown | null
          success?: boolean | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          access_timestamp?: string | null
          access_type?: string
          connection_id?: string | null
          error_message?: string | null
          id?: string
          ip_address?: unknown | null
          success?: boolean | null
          user_agent?: string | null
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
          client_id: string | null
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
          client_id?: string | null
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
          client_id?: string | null
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
          is_batch_operation: boolean | null
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
          is_batch_operation?: boolean | null
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
          is_batch_operation?: boolean | null
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
            foreignKeyName: "integration_logs_act_connection_id_fkey"
            columns: ["act_connection_id"]
            isOneToOne: false
            referencedRelation: "user_connections_public"
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
          act_deleted_at: string | null
          act_last_seen_at: string | null
          act_reference: string | null
          billed_at: string | null
          created_at: string | null
          deliverable_id: string | null
          description: string
          details: string | null
          id: string
          invoice_id: string | null
          item_type: string
          line_number: number
          line_total: number | null
          opportunity_id: string | null
          quantity: number | null
          service_period_end: string | null
          service_period_start: string | null
          source: string | null
          unit_rate: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          act_deleted_at?: string | null
          act_last_seen_at?: string | null
          act_reference?: string | null
          billed_at?: string | null
          created_at?: string | null
          deliverable_id?: string | null
          description: string
          details?: string | null
          id?: string
          invoice_id?: string | null
          item_type: string
          line_number: number
          line_total?: number | null
          opportunity_id?: string | null
          quantity?: number | null
          service_period_end?: string | null
          service_period_start?: string | null
          source?: string | null
          unit_rate?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          act_deleted_at?: string | null
          act_last_seen_at?: string | null
          act_reference?: string | null
          billed_at?: string | null
          created_at?: string | null
          deliverable_id?: string | null
          description?: string
          details?: string | null
          id?: string
          invoice_id?: string | null
          item_type?: string
          line_number?: number
          line_total?: number | null
          opportunity_id?: string | null
          quantity?: number | null
          service_period_end?: string | null
          service_period_start?: string | null
          source?: string | null
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
          act_deleted_at: string | null
          act_last_seen_at: string | null
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
          act_deleted_at?: string | null
          act_last_seen_at?: string | null
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
          act_deleted_at?: string | null
          act_last_seen_at?: string | null
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
      opportunity_billing_info: {
        Row: {
          bill_to_address: string
          bill_to_contact_email: string
          bill_to_contact_name: string
          bill_to_name: string
          created_at: string
          id: string
          opportunity_id: string
          organization_address: string
          organization_contact_email: string
          organization_contact_name: string
          organization_name: string
          payment_terms: number
          po_number: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          bill_to_address: string
          bill_to_contact_email: string
          bill_to_contact_name: string
          bill_to_name: string
          created_at?: string
          id?: string
          opportunity_id: string
          organization_address: string
          organization_contact_email: string
          organization_contact_name: string
          organization_name: string
          payment_terms?: number
          po_number?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          bill_to_address?: string
          bill_to_contact_email?: string
          bill_to_contact_name?: string
          bill_to_name?: string
          created_at?: string
          id?: string
          opportunity_id?: string
          organization_address?: string
          organization_contact_email?: string
          organization_contact_name?: string
          organization_name?: string
          payment_terms?: number
          po_number?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "opportunity_billing_info_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
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
          daily_sync_enabled: boolean | null
          daily_sync_error: string | null
          daily_sync_status: string | null
          daily_sync_time: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          last_connection_test: string | null
          last_daily_sync_at: string | null
          last_sync_at: string | null
          next_sync_at: string | null
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
          daily_sync_enabled?: boolean | null
          daily_sync_error?: string | null
          daily_sync_status?: string | null
          daily_sync_time?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          last_connection_test?: string | null
          last_daily_sync_at?: string | null
          last_sync_at?: string | null
          next_sync_at?: string | null
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
          daily_sync_enabled?: boolean | null
          daily_sync_error?: string | null
          daily_sync_status?: string | null
          daily_sync_time?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          last_connection_test?: string | null
          last_daily_sync_at?: string | null
          last_sync_at?: string | null
          next_sync_at?: string | null
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
      user_connections_public: {
        Row: {
          act_database_name: string | null
          act_region: string | null
          connection_error: string | null
          connection_name: string | null
          connection_status: string | null
          created_at: string | null
          daily_sync_enabled: boolean | null
          daily_sync_status: string | null
          daily_sync_time: string | null
          id: string | null
          is_active: boolean | null
          is_default: boolean | null
          last_connection_test: string | null
          last_daily_sync_at: string | null
          last_sync_at: string | null
          next_sync_at: string | null
          total_api_calls: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          act_database_name?: string | null
          act_region?: string | null
          connection_error?: string | null
          connection_name?: string | null
          connection_status?: string | null
          created_at?: string | null
          daily_sync_enabled?: boolean | null
          daily_sync_status?: string | null
          daily_sync_time?: string | null
          id?: string | null
          is_active?: boolean | null
          is_default?: boolean | null
          last_connection_test?: string | null
          last_daily_sync_at?: string | null
          last_sync_at?: string | null
          next_sync_at?: string | null
          total_api_calls?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          act_database_name?: string | null
          act_region?: string | null
          connection_error?: string | null
          connection_name?: string | null
          connection_status?: string | null
          created_at?: string | null
          daily_sync_enabled?: boolean | null
          daily_sync_status?: string | null
          daily_sync_time?: string | null
          id?: string | null
          is_active?: boolean | null
          is_default?: boolean | null
          last_connection_test?: string | null
          last_daily_sync_at?: string | null
          last_sync_at?: string | null
          next_sync_at?: string | null
          total_api_calls?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      complete_integration_log: {
        Args: {
          error_details?: Json
          error_msg?: string
          http_code?: number
          log_id: string
          records_created?: number
          records_failed?: number
          records_processed?: number
          records_updated?: number
          response_data?: Json
          status: string
        }
        Returns: undefined
      }
      get_connection_credentials_secure: {
        Args: { connection_id: string }
        Returns: {
          act_password_encrypted: string
          act_username: string
          api_base_url: string
          cached_bearer_token: string
          token_expires_at: string
        }[]
      }
      get_connections_ready_for_sync: {
        Args: Record<PropertyKey, never>
        Returns: {
          act_database_name: string
          act_password_encrypted: string
          act_region: string
          act_username: string
          api_base_url: string
          cached_bearer_token: string
          connection_name: string
          daily_sync_time: string
          id: string
          token_expires_at: string
          token_last_refreshed_at: string
          user_id: string
        }[]
      }
      get_user_connections_safe: {
        Args: { connection_user_id: string }
        Returns: {
          act_database_name: string
          act_region: string
          connection_error: string
          connection_name: string
          connection_status: string
          created_at: string
          daily_sync_enabled: boolean
          daily_sync_status: string
          daily_sync_time: string
          id: string
          is_active: boolean
          is_default: boolean
          last_connection_test: string
          last_daily_sync_at: string
          last_sync_at: string
          next_sync_at: string
          updated_at: string
          user_id: string
        }[]
      }
      update_daily_sync_status: {
        Args: { connection_id: string; error_message?: string; status: string }
        Returns: undefined
      }
      update_next_sync_time: {
        Args: { connection_id: string }
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

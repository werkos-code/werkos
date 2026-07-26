export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type OrganizationRole =
  | "owner"
  | "office_employee"
  | "field_employee"
  | "customer";

export type SubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "incomplete"
  | "incomplete_expired"
  | "unpaid"
  | "paused";

export type ProjectStatus =
  | "preparation"
  | "execution"
  | "operationally_completed"
  | "administratively_completed"
  | "completed"
  | "archived";

export type QuoteStatus =
  | "draft"
  | "sent"
  | "accepted"
  | "rejected"
  | "cancelled";

export type WorkItemStatus = "open" | "in_progress" | "done";
export type WorkItemPriority = "low" | "normal" | "high";
export type AppointmentStatus =
  | "planned"
  | "in_progress"
  | "done"
  | "cancelled";
export type AppointmentType = "work" | "meeting" | "delivery" | "other";
export type WorkOrderStatus =
  | "open"
  | "planned"
  | "in_progress"
  | "done"
  | "cancelled";
export type WorkOrderPriority = "low" | "normal" | "high";
export type InvoiceStatus = "draft" | "open" | "sent" | "paid";

export type ProjectActivityType =
  | "project_created"
  | "project_updated"
  | "status_changed"
  | "quote_created"
  | "quote_updated"
  | "quote_sent"
  | "quote_accepted"
  | "quote_rejected"
  | "quote_cancelled"
  | "work_item_created"
  | "work_item_updated"
  | "work_item_completed"
  | "cover_updated"
  | "note";

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          platform_role: "super_admin" | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          platform_role?: "super_admin" | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          platform_role?: "super_admin" | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      organizations: {
        Row: {
          id: string;
          name: string;
          slug: string;
          industry: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          industry?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          industry?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      organization_memberships: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string;
          role: OrganizationRole;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          user_id: string;
          role: OrganizationRole;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          user_id?: string;
          role?: OrganizationRole;
          created_at?: string;
        };
        Relationships: [];
      };
      onboarding_drafts: {
        Row: {
          user_id: string;
          step: string;
          company_name: string | null;
          industry: string | null;
          industry_other: string | null;
          office_seats: number;
          field_seats: number;
          stripe_checkout_session_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          step?: string;
          company_name?: string | null;
          industry?: string | null;
          industry_other?: string | null;
          office_seats?: number;
          field_seats?: number;
          stripe_checkout_session_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          step?: string;
          company_name?: string | null;
          industry?: string | null;
          industry_other?: string | null;
          office_seats?: number;
          field_seats?: number;
          stripe_checkout_session_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      subscriptions: {
        Row: {
          id: string;
          organization_id: string;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          status: SubscriptionStatus;
          trial_ends_at: string | null;
          office_seats: number;
          field_seats: number;
          cancel_at_period_end: boolean;
          current_period_end: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          status?: SubscriptionStatus;
          trial_ends_at?: string | null;
          office_seats?: number;
          field_seats?: number;
          cancel_at_period_end?: boolean;
          current_period_end?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          status?: SubscriptionStatus;
          trial_ends_at?: string | null;
          office_seats?: number;
          field_seats?: number;
          cancel_at_period_end?: boolean;
          current_period_end?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      customers: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          email: string | null;
          phone: string | null;
          address: string | null;
          notes: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          email?: string | null;
          phone?: string | null;
          address?: string | null;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          name?: string;
          email?: string | null;
          phone?: string | null;
          address?: string | null;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "customers_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      projects: {
        Row: {
          id: string;
          organization_id: string;
          customer_id: string;
          name: string;
          status: ProjectStatus;
          notes: string | null;
          project_number: string;
          start_date: string | null;
          end_date: string | null;
          lead_user_id: string | null;
          contact_name: string | null;
          contact_email: string | null;
          contact_phone: string | null;
          cover_path: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          customer_id: string;
          name: string;
          status?: ProjectStatus;
          notes?: string | null;
          project_number?: string;
          start_date?: string | null;
          end_date?: string | null;
          lead_user_id?: string | null;
          contact_name?: string | null;
          contact_email?: string | null;
          contact_phone?: string | null;
          cover_path?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          customer_id?: string;
          name?: string;
          status?: ProjectStatus;
          notes?: string | null;
          project_number?: string;
          start_date?: string | null;
          end_date?: string | null;
          lead_user_id?: string | null;
          contact_name?: string | null;
          contact_email?: string | null;
          contact_phone?: string | null;
          cover_path?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "projects_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "projects_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
        ];
      };
      project_labels: {
        Row: {
          id: string;
          organization_id: string;
          project_id: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          project_id: string;
          name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          project_id?: string;
          name?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      project_activities: {
        Row: {
          id: string;
          organization_id: string;
          project_id: string;
          type: ProjectActivityType;
          title: string;
          body: string | null;
          metadata: Json;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          project_id: string;
          type: ProjectActivityType;
          title: string;
          body?: string | null;
          metadata?: Json;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          project_id?: string;
          type?: ProjectActivityType;
          title?: string;
          body?: string | null;
          metadata?: Json;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      project_favorites: {
        Row: {
          organization_id: string;
          project_id: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          organization_id: string;
          project_id: string;
          user_id: string;
          created_at?: string;
        };
        Update: {
          organization_id?: string;
          project_id?: string;
          user_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      quotes: {
        Row: {
          id: string;
          organization_id: string;
          project_id: string;
          title: string;
          status: QuoteStatus;
          valid_until: string | null;
          internal_notes: string | null;
          external_notes: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          project_id: string;
          title: string;
          status?: QuoteStatus;
          valid_until?: string | null;
          internal_notes?: string | null;
          external_notes?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          project_id?: string;
          title?: string;
          status?: QuoteStatus;
          valid_until?: string | null;
          internal_notes?: string | null;
          external_notes?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "quotes_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quotes_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      quote_lines: {
        Row: {
          id: string;
          organization_id: string;
          quote_id: string;
          parent_id: string | null;
          sort_order: number;
          title: string;
          description: string | null;
          quantity: number | null;
          unit: string | null;
          unit_price_cents: number | null;
          vat_rate_bps: number;
          discount_cents: number;
          estimated_minutes: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          quote_id: string;
          parent_id?: string | null;
          sort_order?: number;
          title?: string;
          description?: string | null;
          quantity?: number | null;
          unit?: string | null;
          unit_price_cents?: number | null;
          vat_rate_bps?: number;
          discount_cents?: number;
          estimated_minutes?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          quote_id?: string;
          parent_id?: string | null;
          sort_order?: number;
          title?: string;
          description?: string | null;
          quantity?: number | null;
          unit?: string | null;
          unit_price_cents?: number | null;
          vat_rate_bps?: number;
          discount_cents?: number;
          estimated_minutes?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "quote_lines_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quote_lines_quote_id_fkey";
            columns: ["quote_id"];
            isOneToOne: false;
            referencedRelation: "quotes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quote_lines_parent_id_fkey";
            columns: ["parent_id"];
            isOneToOne: false;
            referencedRelation: "quote_lines";
            referencedColumns: ["id"];
          },
        ];
      };
      work_items: {
        Row: {
          id: string;
          organization_id: string;
          project_id: string;
          title: string;
          status: WorkItemStatus;
          quote_line_id: string | null;
          parent_id: string | null;
          description: string | null;
          category: string | null;
          assignee_user_id: string | null;
          planned_start: string | null;
          planned_end: string | null;
          estimated_minutes: number | null;
          priority: WorkItemPriority;
          labels: string[];
          is_group: boolean;
          sort_order: number;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          project_id: string;
          title: string;
          status?: WorkItemStatus;
          quote_line_id?: string | null;
          parent_id?: string | null;
          description?: string | null;
          category?: string | null;
          assignee_user_id?: string | null;
          planned_start?: string | null;
          planned_end?: string | null;
          estimated_minutes?: number | null;
          priority?: WorkItemPriority;
          labels?: string[];
          is_group?: boolean;
          sort_order?: number;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          project_id?: string;
          title?: string;
          status?: WorkItemStatus;
          quote_line_id?: string | null;
          parent_id?: string | null;
          description?: string | null;
          category?: string | null;
          assignee_user_id?: string | null;
          planned_start?: string | null;
          planned_end?: string | null;
          estimated_minutes?: number | null;
          priority?: WorkItemPriority;
          labels?: string[];
          is_group?: boolean;
          sort_order?: number;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "work_items_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "work_items_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "work_items_quote_line_id_fkey";
            columns: ["quote_line_id"];
            isOneToOne: false;
            referencedRelation: "quote_lines";
            referencedColumns: ["id"];
          },
        ];
      };
      appointments: {
        Row: {
          id: string;
          organization_id: string;
          title: string;
          starts_at: string;
          ends_at: string;
          all_day: boolean;
          status: AppointmentStatus;
          type: AppointmentType;
          project_id: string | null;
          work_item_id: string | null;
          assignee_user_id: string | null;
          location: string | null;
          notes: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
          work_order_id?: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          title: string;
          starts_at: string;
          ends_at: string;
          all_day?: boolean;
          status?: AppointmentStatus;
          type?: AppointmentType;
          project_id?: string | null;
          work_item_id?: string | null;
          assignee_user_id?: string | null;
          location?: string | null;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          work_order_id?: string | null;
        };
        Update: {
          id?: string;
          organization_id?: string;
          title?: string;
          starts_at?: string;
          ends_at?: string;
          all_day?: boolean;
          status?: AppointmentStatus;
          type?: AppointmentType;
          project_id?: string | null;
          work_item_id?: string | null;
          assignee_user_id?: string | null;
          location?: string | null;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          work_order_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "appointments_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "appointments_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "appointments_work_item_id_fkey";
            columns: ["work_item_id"];
            isOneToOne: false;
            referencedRelation: "work_items";
            referencedColumns: ["id"];
          },
        ];
      };
      work_orders: {
        Row: {
          id: string;
          organization_id: string;
          project_id: string;
          work_order_number: string;
          title: string;
          description: string | null;
          status: WorkOrderStatus;
          priority: WorkOrderPriority;
          work_type: string | null;
          assignee_user_id: string | null;
          planned_start: string | null;
          estimated_minutes: number | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          project_id: string;
          work_order_number?: string;
          title: string;
          description?: string | null;
          status?: WorkOrderStatus;
          priority?: WorkOrderPriority;
          work_type?: string | null;
          assignee_user_id?: string | null;
          planned_start?: string | null;
          estimated_minutes?: number | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          project_id?: string;
          work_order_number?: string;
          title?: string;
          description?: string | null;
          status?: WorkOrderStatus;
          priority?: WorkOrderPriority;
          work_type?: string | null;
          assignee_user_id?: string | null;
          planned_start?: string | null;
          estimated_minutes?: number | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "work_orders_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "work_orders_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      work_order_checklist_items: {
        Row: {
          id: string;
          organization_id: string;
          work_order_id: string;
          title: string;
          done: boolean;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          work_order_id: string;
          title: string;
          done?: boolean;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          work_order_id?: string;
          title?: string;
          done?: boolean;
          sort_order?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "work_order_checklist_items_work_order_id_fkey";
            columns: ["work_order_id"];
            isOneToOne: false;
            referencedRelation: "work_orders";
            referencedColumns: ["id"];
          },
        ];
      };
      work_order_work_items: {
        Row: {
          organization_id: string;
          work_order_id: string;
          work_item_id: string;
        };
        Insert: {
          organization_id: string;
          work_order_id: string;
          work_item_id: string;
        };
        Update: {
          organization_id?: string;
          work_order_id?: string;
          work_item_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "work_order_work_items_work_order_id_fkey";
            columns: ["work_order_id"];
            isOneToOne: false;
            referencedRelation: "work_orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "work_order_work_items_work_item_id_fkey";
            columns: ["work_item_id"];
            isOneToOne: false;
            referencedRelation: "work_items";
            referencedColumns: ["id"];
          },
        ];
      };
      file_folders: {
        Row: {
          id: string;
          organization_id: string;
          project_id: string;
          parent_id: string | null;
          name: string;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          project_id: string;
          parent_id?: string | null;
          name: string;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          project_id?: string;
          parent_id?: string | null;
          name?: string;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "file_folders_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "file_folders_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      project_files: {
        Row: {
          id: string;
          organization_id: string;
          project_id: string;
          folder_id: string | null;
          name: string;
          storage_path: string;
          mime_type: string | null;
          size_bytes: number;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          project_id: string;
          folder_id?: string | null;
          name: string;
          storage_path: string;
          mime_type?: string | null;
          size_bytes?: number;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          project_id?: string;
          folder_id?: string | null;
          name?: string;
          storage_path?: string;
          mime_type?: string | null;
          size_bytes?: number;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "project_files_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_files_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      time_entries: {
        Row: {
          id: string;
          organization_id: string;
          project_id: string;
          work_item_id: string;
          work_order_id: string | null;
          user_id: string;
          work_date: string;
          minutes: number;
          notes: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          project_id: string;
          work_item_id: string;
          work_order_id?: string | null;
          user_id: string;
          work_date?: string;
          minutes: number;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          project_id?: string;
          work_item_id?: string;
          work_order_id?: string | null;
          user_id?: string;
          work_date?: string;
          minutes?: number;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "time_entries_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "time_entries_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "time_entries_work_item_id_fkey";
            columns: ["work_item_id"];
            isOneToOne: false;
            referencedRelation: "work_items";
            referencedColumns: ["id"];
          },
        ];
      };
      invoices: {
        Row: {
          id: string;
          organization_id: string;
          project_id: string;
          quote_id: string | null;
          invoice_number: string;
          sequence_number: number;
          title: string;
          status: InvoiceStatus;
          issue_date: string;
          due_date: string | null;
          paid_at: string | null;
          subtotal_cents: number;
          vat_cents: number;
          total_cents: number;
          notes: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          project_id: string;
          quote_id?: string | null;
          invoice_number?: string;
          sequence_number?: number;
          title: string;
          status?: InvoiceStatus;
          issue_date?: string;
          due_date?: string | null;
          paid_at?: string | null;
          subtotal_cents?: number;
          vat_cents?: number;
          total_cents?: number;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          project_id?: string;
          quote_id?: string | null;
          invoice_number?: string;
          sequence_number?: number;
          title?: string;
          status?: InvoiceStatus;
          issue_date?: string;
          due_date?: string | null;
          paid_at?: string | null;
          subtotal_cents?: number;
          vat_cents?: number;
          total_cents?: number;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "invoices_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invoices_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invoices_quote_id_fkey";
            columns: ["quote_id"];
            isOneToOne: false;
            referencedRelation: "quotes";
            referencedColumns: ["id"];
          },
        ];
      };
      invoice_lines: {
        Row: {
          id: string;
          organization_id: string;
          invoice_id: string;
          parent_id: string | null;
          sort_order: number;
          title: string;
          description: string | null;
          quantity: number;
          unit: string | null;
          unit_price_cents: number;
          vat_rate_bps: number;
          discount_cents: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          invoice_id: string;
          parent_id?: string | null;
          sort_order?: number;
          title: string;
          description?: string | null;
          quantity?: number;
          unit?: string | null;
          unit_price_cents?: number;
          vat_rate_bps?: number;
          discount_cents?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          invoice_id?: string;
          parent_id?: string | null;
          sort_order?: number;
          title?: string;
          description?: string | null;
          quantity?: number;
          unit?: string | null;
          unit_price_cents?: number;
          vat_rate_bps?: number;
          discount_cents?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "invoice_lines_invoice_id_fkey";
            columns: ["invoice_id"];
            isOneToOne: false;
            referencedRelation: "invoices";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      is_org_member: {
        Args: { org_id: string };
        Returns: boolean;
      };
      user_has_organization: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      is_org_staff: {
        Args: { org_id: string };
        Returns: boolean;
      };
      is_super_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
    };
    Enums: {
      organization_role: OrganizationRole;
      subscription_status: SubscriptionStatus;
      platform_role: "super_admin";
      project_status: ProjectStatus;
      quote_status: QuoteStatus;
      work_item_status: WorkItemStatus;
      appointment_status: AppointmentStatus;
      appointment_type: AppointmentType;
      work_order_status: WorkOrderStatus;
      work_order_priority: WorkOrderPriority;
      invoice_status: InvoiceStatus;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

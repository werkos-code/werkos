/**
 * Placeholder for Supabase-generated Database types.
 * Replace with `supabase gen types typescript` output once the schema exists.
 */
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
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      user_role: "super_admin" | "owner" | "employee" | "customer";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

// Database types in the format `supabase gen types typescript --local` produces.
// Hand-written to match supabase/migrations; regenerate with
// `npx supabase gen types typescript --local > src/lib/supabase/database.types.ts`
// once a local database is running.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Category =
  | "Groceries"
  | "Dining"
  | "Transport"
  | "Shopping"
  | "Bills"
  | "Entertainment"
  | "Health"
  | "Other";

type ImportRow = {
  id: string;
  user_id: string;
  filename: string;
  row_count: number;
  imported_count: number;
  skipped_count: number;
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; currency: string; timezone: string; csv_mapping: Json | null; created_at: string };
        Insert: { id: string; currency?: string; timezone: string; csv_mapping?: Json | null; created_at?: string };
        Update: { id?: string; currency?: string; timezone?: string; csv_mapping?: Json | null; created_at?: string };
        Relationships: [];
      };
      budgets: {
        Row: { id: string; user_id: string; effective_month: string; amount_cents: number; savings_rate_bps: number; income_cents: number | null };
        Insert: { id?: string; user_id?: string; effective_month: string; amount_cents: number; savings_rate_bps?: number; income_cents?: number | null };
        Update: {
          id?: string;
          user_id?: string;
          effective_month?: string;
          amount_cents?: number;
          savings_rate_bps?: number;
          income_cents?: number | null;
        };
        Relationships: [];
      };
      imports: {
        Row: ImportRow;
        Insert: Partial<ImportRow> & Pick<ImportRow, "filename" | "row_count" | "imported_count" | "skipped_count">;
        Update: Partial<ImportRow>;
        Relationships: [];
      };
      transactions: {
        Row: {
          id: string;
          user_id: string;
          occurred_on: string;
          amount_cents: number;
          description: string;
          merchant_key: string | null;
          category: Category;
          is_one_off: boolean;
          source: "manual" | "csv";
          import_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          occurred_on: string;
          amount_cents: number;
          description?: string;
          merchant_key?: string | null;
          category?: Category;
          is_one_off?: boolean;
          source: "manual" | "csv";
          import_id?: string | null;
          created_at?: string;
        };
        Update: {
          occurred_on?: string;
          amount_cents?: number;
          description?: string;
          merchant_key?: string | null;
          category?: Category;
          is_one_off?: boolean;
        };
        Relationships: [];
      };
      merchant_categories: {
        Row: { user_id: string; merchant_key: string; category: Category };
        Insert: { user_id?: string; merchant_key: string; category: Category };
        Update: { merchant_key?: string; category?: Category };
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: {
      import_transactions: {
        Args: { p_filename: string; p_row_count: number; p_rows: Json };
        Returns: ImportRow;
      };
      delete_my_account: {
        Args: Record<PropertyKey, never>;
        Returns: undefined;
      };
    };
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
};

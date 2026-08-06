// Supabase schema types.
//
// Hand-maintained until a Supabase access token is available to run:
//   supabase gen types typescript --linked > packages/database/src/types.ts
// Keep in sync with supabase/migrations/*.
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
      profiles: {
        Row: {
          id: string;
          username: string | null;
          display_name: string | null;
          avatar_path: string | null;
          bio: string | null;
          country_code: string | null;
          city: string | null;
          onboarded_at: string | null;
          signup_intent: Database["public"]["Enums"]["profile_intent"] | null;
          is_verified: boolean;
          is_suspended: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username?: string | null;
          display_name?: string | null;
          avatar_path?: string | null;
          bio?: string | null;
          country_code?: string | null;
          city?: string | null;
          onboarded_at?: string | null;
          signup_intent?: Database["public"]["Enums"]["profile_intent"] | null;
          is_verified?: boolean;
          is_suspended?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          username?: string | null;
          display_name?: string | null;
          avatar_path?: string | null;
          bio?: string | null;
          country_code?: string | null;
          city?: string | null;
          onboarded_at?: string | null;
          signup_intent?: Database["public"]["Enums"]["profile_intent"] | null;
          is_verified?: boolean;
          is_suspended?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      profile_intent: "sell" | "browse" | "both";
      listing_status:
        | "draft"
        | "pending_review"
        | "active"
        | "reserved"
        | "sold"
        | "paused"
        | "rejected"
        | "removed";
      item_condition: "new" | "like_new" | "very_good" | "good" | "fair";
      story_mode: "clean_break" | "little_tea" | "full_story";
      identity_visibility: "public" | "limited" | "anonymous";
      moderation_status:
        | "pending"
        | "approved"
        | "needs_changes"
        | "rejected"
        | "removed";
      order_status:
        | "pending_payment"
        | "paid"
        | "awaiting_shipping"
        | "shipped"
        | "delivered"
        | "completed"
        | "cancelled"
        | "disputed"
        | "refunded";
      offer_status:
        | "pending"
        | "accepted"
        | "declined"
        | "withdrawn"
        | "expired";
      chapter_status: "active" | "completed" | "paused" | "archived";
      report_status: "open" | "reviewing" | "resolved" | "dismissed";
      reaction_type:
        | "dead"
        | "red_flag"
        | "tea"
        | "good_for_you"
        | "sending_love"
        | "savage";
    };
  };
};

// ---------------------------------------------------------------------------
// Convenience aliases
// ---------------------------------------------------------------------------
export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];
export type Enums<T extends keyof Database["public"]["Enums"]> =
  Database["public"]["Enums"][T];

export type Profile = Tables<"profiles">;
export type ProfileIntent = Enums<"profile_intent">;

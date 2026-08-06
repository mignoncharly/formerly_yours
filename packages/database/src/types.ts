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
          deactivated_at: string | null;
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
          deactivated_at?: string | null;
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
          deactivated_at?: string | null;
          is_verified?: boolean;
          is_suspended?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      categories: {
        Row: {
          id: number;
          parent_id: number | null;
          slug: string;
          name: string;
          sort_order: number;
          is_active: boolean;
        };
        Insert: {
          id?: number;
          parent_id?: number | null;
          slug: string;
          name: string;
          sort_order?: number;
          is_active?: boolean;
        };
        Update: {
          id?: number;
          parent_id?: number | null;
          slug?: string;
          name?: string;
          sort_order?: number;
          is_active?: boolean;
        };
        Relationships: [];
      };
      listings: {
        Row: {
          id: string;
          seller_id: string;
          category_id: number | null;
          short_id: string;
          title: string | null;
          description: string | null;
          brand: string | null;
          model: string | null;
          condition: Database["public"]["Enums"]["item_condition"] | null;
          currency: string;
          price_amount: number | null;
          status: Database["public"]["Enums"]["listing_status"];
          country_code: string | null;
          city: string | null;
          published_at: string | null;
          sold_at: string | null;
          created_at: string;
          updated_at: string;
          // generated tsvector column (read-only)
          search_tsv: unknown | null;
        };
        Insert: {
          id?: string;
          seller_id: string;
          category_id?: number | null;
          short_id?: string;
          title?: string | null;
          description?: string | null;
          brand?: string | null;
          model?: string | null;
          condition?: Database["public"]["Enums"]["item_condition"] | null;
          currency?: string;
          price_amount?: number | null;
          status?: Database["public"]["Enums"]["listing_status"];
          country_code?: string | null;
          city?: string | null;
          published_at?: string | null;
          sold_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          seller_id?: string;
          category_id?: number | null;
          short_id?: string;
          title?: string | null;
          description?: string | null;
          brand?: string | null;
          model?: string | null;
          condition?: Database["public"]["Enums"]["item_condition"] | null;
          currency?: string;
          price_amount?: number | null;
          status?: Database["public"]["Enums"]["listing_status"];
          country_code?: string | null;
          city?: string | null;
          published_at?: string | null;
          sold_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      listing_images: {
        Row: {
          id: string;
          listing_id: string;
          storage_path: string;
          sort_order: number;
          moderation_status: Database["public"]["Enums"]["moderation_status"];
          width: number | null;
          height: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          listing_id: string;
          storage_path: string;
          sort_order?: number;
          moderation_status?: Database["public"]["Enums"]["moderation_status"];
          width?: number | null;
          height?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          listing_id?: string;
          storage_path?: string;
          sort_order?: number;
          moderation_status?: Database["public"]["Enums"]["moderation_status"];
          width?: number | null;
          height?: number | null;
          created_at?: string;
        };
        Relationships: [];
      };
      saved_listings: {
        Row: {
          user_id: string;
          listing_id: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          listing_id: string;
          created_at?: string;
        };
        Update: {
          user_id?: string;
          listing_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      search_listings: {
        Args: {
          q?: string | null;
          in_category?: number | null;
          in_condition?: Database["public"]["Enums"]["item_condition"] | null;
          min_price?: number | null;
          max_price?: number | null;
          in_country?: string | null;
          lim?: number | null;
          off?: number | null;
        };
        Returns: Database["public"]["Tables"]["listings"]["Row"][];
      };
    };
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
export type Category = Tables<"categories">;
export type Listing = Tables<"listings">;
export type ListingImage = Tables<"listing_images">;
export type SavedListing = Tables<"saved_listings">;
export type ItemCondition = Enums<"item_condition">;
export type ListingStatus = Enums<"listing_status">;

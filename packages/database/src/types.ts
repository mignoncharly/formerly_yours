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
      relationship_contexts: {
        Row: {
          id: number;
          slug: string;
          label: string;
          emoji: string | null;
          is_sensitive: boolean;
          sort_order: number;
          is_active: boolean;
        };
        Insert: {
          id?: number;
          slug: string;
          label: string;
          emoji?: string | null;
          is_sensitive?: boolean;
          sort_order?: number;
          is_active?: boolean;
        };
        Update: {
          id?: number;
          slug?: string;
          label?: string;
          emoji?: string | null;
          is_sensitive?: boolean;
          sort_order?: number;
          is_active?: boolean;
        };
        Relationships: [];
      };
      stories: {
        Row: {
          id: string;
          listing_id: string;
          author_id: string;
          short_id: string;
          mode: Database["public"]["Enums"]["story_mode"];
          visibility: Database["public"]["Enums"]["identity_visibility"];
          headline: string | null;
          body: string | null;
          original_input: string | null;
          ai_assisted: boolean;
          moderation_status: Database["public"]["Enums"]["moderation_status"];
          published_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          listing_id: string;
          author_id: string;
          short_id?: string;
          mode?: Database["public"]["Enums"]["story_mode"];
          visibility?: Database["public"]["Enums"]["identity_visibility"];
          headline?: string | null;
          body?: string | null;
          original_input?: string | null;
          ai_assisted?: boolean;
          moderation_status?: Database["public"]["Enums"]["moderation_status"];
          published_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          listing_id?: string;
          author_id?: string;
          short_id?: string;
          mode?: Database["public"]["Enums"]["story_mode"];
          visibility?: Database["public"]["Enums"]["identity_visibility"];
          headline?: string | null;
          body?: string | null;
          original_input?: string | null;
          ai_assisted?: boolean;
          moderation_status?: Database["public"]["Enums"]["moderation_status"];
          published_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      story_relationship_contexts: {
        Row: { story_id: string; context_id: number };
        Insert: { story_id: string; context_id: number };
        Update: { story_id?: string; context_id?: number };
        Relationships: [];
      };
      story_reactions: {
        Row: {
          story_id: string;
          user_id: string;
          reaction: Database["public"]["Enums"]["reaction_type"];
          created_at: string;
        };
        Insert: {
          story_id: string;
          user_id: string;
          reaction: Database["public"]["Enums"]["reaction_type"];
          created_at?: string;
        };
        Update: {
          story_id?: string;
          user_id?: string;
          reaction?: Database["public"]["Enums"]["reaction_type"];
          created_at?: string;
        };
        Relationships: [];
      };
      comments: {
        Row: {
          id: string;
          story_id: string;
          author_id: string;
          parent_comment_id: string | null;
          body: string;
          moderation_status: Database["public"]["Enums"]["moderation_status"];
          created_at: string;
          edited_at: string | null;
        };
        Insert: {
          id?: string;
          story_id: string;
          author_id: string;
          parent_comment_id?: string | null;
          body: string;
          moderation_status?: Database["public"]["Enums"]["moderation_status"];
          created_at?: string;
          edited_at?: string | null;
        };
        Update: {
          id?: string;
          story_id?: string;
          author_id?: string;
          parent_comment_id?: string | null;
          body?: string;
          moderation_status?: Database["public"]["Enums"]["moderation_status"];
          created_at?: string;
          edited_at?: string | null;
        };
        Relationships: [];
      };
      follows: {
        Row: {
          follower_id: string;
          followed_id: string;
          created_at: string;
        };
        Insert: {
          follower_id: string;
          followed_id: string;
          created_at?: string;
        };
        Update: {
          follower_id?: string;
          followed_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      feed_stories: {
        Args: {
          viewer?: string | null;
          following_only?: boolean | null;
          lim?: number | null;
          off?: number | null;
        };
        Returns: {
          story_id: string;
          story_short_id: string;
          headline: string | null;
          body: string | null;
          visibility: Database["public"]["Enums"]["identity_visibility"];
          published_at: string | null;
          author_id: string;
          listing_id: string;
          listing_short_id: string;
          listing_title: string | null;
          price_amount: number | null;
          currency: string;
          reaction_count: number;
          comment_count: number;
          save_count: number;
          score: number;
        }[];
      };
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
      story_reaction_counts: {
        Args: { in_story: string };
        Returns: {
          reaction: Database["public"]["Enums"]["reaction_type"];
          count: number;
        }[];
      };
      story_is_visible: {
        Args: { sid: string };
        Returns: boolean;
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
export type Story = Tables<"stories">;
export type RelationshipContext = Tables<"relationship_contexts">;
export type StoryReaction = Tables<"story_reactions">;
export type Comment = Tables<"comments">;
export type Follow = Tables<"follows">;
export type StoryMode = Enums<"story_mode">;
export type IdentityVisibility = Enums<"identity_visibility">;
export type ReactionType = Enums<"reaction_type">;

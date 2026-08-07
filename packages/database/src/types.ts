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
          role: Database["public"]["Enums"]["staff_role"];
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
          role?: Database["public"]["Enums"]["staff_role"];
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
          role?: Database["public"]["Enums"]["staff_role"];
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
      next_chapters: {
        Row: {
          id: string;
          owner_id: string;
          short_id: string;
          title: string;
          description: string | null;
          target_amount: number | null;
          currency: string;
          visibility: Database["public"]["Enums"]["identity_visibility"];
          status: Database["public"]["Enums"]["chapter_status"];
          is_simulated: boolean;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          short_id?: string;
          title: string;
          description?: string | null;
          target_amount?: number | null;
          currency?: string;
          visibility?: Database["public"]["Enums"]["identity_visibility"];
          status?: Database["public"]["Enums"]["chapter_status"];
          is_simulated?: boolean;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          short_id?: string;
          title?: string;
          description?: string | null;
          target_amount?: number | null;
          currency?: string;
          visibility?: Database["public"]["Enums"]["identity_visibility"];
          status?: Database["public"]["Enums"]["chapter_status"];
          is_simulated?: boolean;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      listing_chapters: {
        Row: { listing_id: string; chapter_id: string };
        Insert: { listing_id: string; chapter_id: string };
        Update: { listing_id?: string; chapter_id?: string };
        Relationships: [];
      };
      chapter_updates: {
        Row: {
          id: string;
          chapter_id: string;
          author_id: string;
          body: string;
          image_path: string | null;
          moderation_status: Database["public"]["Enums"]["moderation_status"];
          published_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          chapter_id: string;
          author_id: string;
          body: string;
          image_path?: string | null;
          moderation_status?: Database["public"]["Enums"]["moderation_status"];
          published_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          chapter_id?: string;
          author_id?: string;
          body?: string;
          image_path?: string | null;
          moderation_status?: Database["public"]["Enums"]["moderation_status"];
          published_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      blocked_users: {
        Row: { blocker_id: string; blocked_id: string; created_at: string };
        Insert: { blocker_id: string; blocked_id: string; created_at?: string };
        Update: { blocker_id?: string; blocked_id?: string; created_at?: string };
        Relationships: [];
      };
      reports: {
        Row: {
          id: string;
          reporter_id: string;
          story_id: string | null;
          comment_id: string | null;
          listing_id: string | null;
          chapter_id: string | null;
          reported_user_id: string | null;
          reason: Database["public"]["Enums"]["report_reason"];
          details: string | null;
          status: Database["public"]["Enums"]["report_status"];
          created_at: string;
        };
        Insert: {
          id?: string;
          reporter_id: string;
          story_id?: string | null;
          comment_id?: string | null;
          listing_id?: string | null;
          chapter_id?: string | null;
          reported_user_id?: string | null;
          reason: Database["public"]["Enums"]["report_reason"];
          details?: string | null;
          status?: Database["public"]["Enums"]["report_status"];
          created_at?: string;
        };
        Update: {
          id?: string;
          reporter_id?: string;
          story_id?: string | null;
          comment_id?: string | null;
          listing_id?: string | null;
          chapter_id?: string | null;
          reported_user_id?: string | null;
          reason?: Database["public"]["Enums"]["report_reason"];
          details?: string | null;
          status?: Database["public"]["Enums"]["report_status"];
          created_at?: string;
        };
        Relationships: [];
      };
      offers: {
        Row: {
          id: string;
          listing_id: string;
          buyer_id: string;
          seller_id: string;
          proposed_by: string;
          parent_offer_id: string | null;
          amount: number;
          status: Database["public"]["Enums"]["offer_status"];
          expires_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          listing_id: string;
          buyer_id: string;
          seller_id: string;
          proposed_by: string;
          parent_offer_id?: string | null;
          amount: number;
          status?: Database["public"]["Enums"]["offer_status"];
          expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          listing_id?: string;
          buyer_id?: string;
          seller_id?: string;
          proposed_by?: string;
          parent_offer_id?: string | null;
          amount?: number;
          status?: Database["public"]["Enums"]["offer_status"];
          expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      conversations: {
        Row: { id: string; listing_id: string | null; created_at: string };
        Insert: { id?: string; listing_id?: string | null; created_at?: string };
        Update: { id?: string; listing_id?: string | null; created_at?: string };
        Relationships: [];
      };
      conversation_members: {
        Row: { conversation_id: string; user_id: string; joined_at: string };
        Insert: { conversation_id: string; user_id: string; joined_at?: string };
        Update: { conversation_id?: string; user_id?: string; joined_at?: string };
        Relationships: [];
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          sender_id: string;
          body: string | null;
          attachment_path: string | null;
          created_at: string;
          edited_at: string | null;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          sender_id: string;
          body?: string | null;
          attachment_path?: string | null;
          created_at?: string;
          edited_at?: string | null;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          sender_id?: string;
          body?: string | null;
          attachment_path?: string | null;
          created_at?: string;
          edited_at?: string | null;
          deleted_at?: string | null;
        };
        Relationships: [];
      };
      fee_rules: {
        Row: {
          id: number;
          is_active: boolean;
          platform_fee_bps: number;
          buyer_protection_bps: number;
          min_platform_fee: number;
          created_at: string;
        };
        Insert: {
          id?: number;
          is_active?: boolean;
          platform_fee_bps: number;
          buyer_protection_bps: number;
          min_platform_fee?: number;
          created_at?: string;
        };
        Update: {
          id?: number;
          is_active?: boolean;
          platform_fee_bps?: number;
          buyer_protection_bps?: number;
          min_platform_fee?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      orders: {
        Row: {
          id: string;
          buyer_id: string;
          seller_id: string;
          currency: string;
          subtotal_amount: number;
          buyer_fee_amount: number;
          seller_fee_amount: number;
          shipping_amount: number;
          total_amount: number;
          status: Database["public"]["Enums"]["order_status"];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          buyer_id: string;
          seller_id: string;
          currency?: string;
          subtotal_amount: number;
          buyer_fee_amount?: number;
          seller_fee_amount?: number;
          shipping_amount?: number;
          total_amount: number;
          status?: Database["public"]["Enums"]["order_status"];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          buyer_id?: string;
          seller_id?: string;
          currency?: string;
          subtotal_amount?: number;
          buyer_fee_amount?: number;
          seller_fee_amount?: number;
          shipping_amount?: number;
          total_amount?: number;
          status?: Database["public"]["Enums"]["order_status"];
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          listing_id: string;
          price_amount: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          listing_id: string;
          price_amount: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          listing_id?: string;
          price_amount?: number;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      compute_fees: {
        Args: { subtotal: number };
        Returns: { platform_fee: number; buyer_protection: number }[];
      };
      create_pending_order: {
        Args: { in_listing: string; in_buyer: string };
        Returns: {
          order_id: string;
          total: number;
          seller_id: string;
          stripe_account: string | null;
        }[];
      };
      attach_payment_session: {
        Args: { in_order: string; in_session: string };
        Returns: undefined;
      };
      confirm_order_paid: {
        Args: { in_session: string; in_intent: string };
        Returns: undefined;
      };
      upsert_seller_stripe_account: {
        Args: { in_user: string; in_account: string };
        Returns: undefined;
      };
      set_seller_payouts: {
        Args: { in_user: string; in_enabled: boolean; in_kyc: string | null };
        Returns: undefined;
      };
      set_seller_payouts_by_account: {
        Args: { in_account: string; in_enabled: boolean; in_kyc: string | null };
        Returns: undefined;
      };
      get_seller_account: {
        Args: { in_user: string };
        Returns: {
          stripe_account_id: string | null;
          payouts_enabled: boolean;
          kyc_status: string | null;
        }[];
      };
      is_conversation_member: { Args: { conv: string }; Returns: boolean };
      start_conversation: { Args: { in_listing: string }; Returns: string };
      accept_offer: { Args: { in_offer: string }; Returns: undefined };
      decline_offer: { Args: { in_offer: string }; Returns: undefined };
      withdraw_offer: { Args: { in_offer: string }; Returns: undefined };
      counter_offer: {
        Args: { in_offer: string; new_amount: number };
        Returns: string;
      };
      is_staff: { Args: Record<string, never>; Returns: boolean };
      moderate_content: {
        Args: {
          content_type: string;
          content_id: string;
          new_status: Database["public"]["Enums"]["moderation_status"];
          reason?: string | null;
        };
        Returns: undefined;
      };
      suspend_user: {
        Args: { target: string; suspended: boolean; reason?: string | null };
        Returns: undefined;
      };
      resolve_report: {
        Args: {
          in_report: string;
          new_status: Database["public"]["Enums"]["report_status"];
          reason?: string | null;
        };
        Returns: undefined;
      };
      chapter_progress: {
        Args: { in_chapter: string };
        Returns: { raised: number; items_sold: number }[];
      };
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
      report_reason:
        | "doxxing"
        | "harassment"
        | "threat"
        | "spam"
        | "stolen_item"
        | "scam"
        | "counterfeit"
        | "explicit_content"
        | "hate"
        | "other";
      staff_role: "user" | "support" | "moderator" | "admin" | "super_admin";
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
export type NextChapter = Tables<"next_chapters">;
export type ChapterUpdate = Tables<"chapter_updates">;
export type ChapterStatus = Enums<"chapter_status">;
export type StoryMode = Enums<"story_mode">;
export type IdentityVisibility = Enums<"identity_visibility">;
export type ReactionType = Enums<"reaction_type">;
export type Report = Tables<"reports">;
export type ReportReason = Enums<"report_reason">;
export type ReportStatus = Enums<"report_status">;
export type StaffRole = Enums<"staff_role">;
export type BlockedUser = Tables<"blocked_users">;
export type ModerationStatus = Enums<"moderation_status">;
export type Offer = Tables<"offers">;
export type OfferStatus = Enums<"offer_status">;
export type Conversation = Tables<"conversations">;
export type Message = Tables<"messages">;
export type Order = Tables<"orders">;
export type OrderItem = Tables<"order_items">;
export type FeeRule = Tables<"fee_rules">;

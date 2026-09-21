export type PostcardStatus =
  | "draft"
  | "preparing"
  | "in_transit"
  | "arrived"
  | "opened"
  | "cancelled";

export type LocationPrecision = "exact" | "city" | "region";

export type NotificationType = "postcard_arrived" | "postcard_opened";

/** The front-of-card artwork, drawn in CSS/SVG from seeded reference data. */
export type SceneType =
  | "horizon"
  | "dunes"
  | "clouds"
  | "gradient-sky"
  | "coast"
  | "mountains";

export type EdgeTreatment =
  | "hairline"
  | "deckle"
  | "airmail"
  | "scallop"
  | "photo-border";

export type DesignConfig = {
  paper: string;
  ink: string;
  accent: string;
  texture: "smooth" | "linen" | "pulp" | "film";
  grain: number;
  edge: EdgeTreatment;
  rule: string;
  typography: { family: "sans" | "serif" | "mono"; tracking: string };
  stamp: { bg: string; ink: string; label: string };
  scene: { type: SceneType; palette: string[] };
}

export type Profile = {
  id: string;
  username: string | null;
  display_name: string;
  avatar_url: string | null;
  latitude: number | null;
  longitude: number | null;
  location_name: string | null;
  location_precision: LocationPrecision;
  created_at: string;
  updated_at: string;
}

export type PublicProfile = {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  location_name: string | null;
  has_location: boolean;
}

export type PostcardTemplate = {
  id: string;
  slug: string;
  name: string;
  description: string;
  image_url: string | null;
  design_config: DesignConfig;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

/**
 * The shape every read path returns. `message` is null while a postcard the
 * user is receiving is still in transit — the server withholds it rather than
 * the client hiding it.
 */
export type PostcardView = {
  id: string;
  direction: "sent" | "received";
  status: PostcardStatus;
  message: string | null;
  message_available: boolean;
  template_id: string;
  template_slug: string;
  template_name: string;
  template_design_config: DesignConfig;
  counterpart_id: string;
  counterpart_username: string;
  counterpart_display_name: string;
  counterpart_avatar_url: string | null;
  origin_location_name: string | null;
  destination_location_name: string | null;
  origin_latitude: number;
  origin_longitude: number;
  destination_latitude: number;
  destination_longitude: number;
  distance_km: number;
  travel_duration_seconds: number;
  sent_at: string | null;
  estimated_delivery_at: string | null;
  delivered_at: string | null;
  opened_at: string | null;
  created_at: string;
}

export type AppNotification = {
  id: string;
  user_id: string;
  type: NotificationType;
  postcard_id: string | null;
  title: string;
  body: string;
  read_at: string | null;
  created_at: string;
}

export type DeliverySettings = {
  virtual_speed_kmh: number;
  min_travel_seconds: number;
  max_travel_seconds: number;
  variation_pct: number;
}

/**
 * Deliberately says nothing about postcards still on their way to you — see
 * sync_and_summarize. Counting them would give the surprise away as surely as
 * listing them would.
 */
export type HomeSummary = {
  /** Yours, still crossing. */
  traveling: number;
  /** Yours, that got there. */
  delivered: number;
  /** Waiting for you to open. */
  unopened: number;
}

/** What the sender may know before writing: a distance, never a pin. */
export type JourneyPreview = {
  distance_km: number;
  travel_duration_seconds: number;
  destination_location_name: string | null;
  recipient_username: string;
  recipient_display_name: string;
}

export type GeoPlace = {
  name: string;
  latitude: number;
  longitude: number;
}

/** Minimal hand-maintained schema map for the typed Supabase client. */
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile> & { id: string };
        Update: Partial<Omit<Profile, "id" | "created_at">>;
        Relationships: [];
      };
      // Read-only from the client; RLS grants no write policy. The Insert and
      // Update shapes exist only to satisfy the client's generic constraint.
      postcard_templates: {
        Row: PostcardTemplate;
        Insert: Partial<PostcardTemplate>;
        Update: Partial<PostcardTemplate>;
        Relationships: [];
      };
      postcards: {
        Row: {
          id: string;
          sender_id: string;
          recipient_id: string;
          template_id: string;
          message: string;
          origin_latitude: number;
          origin_longitude: number;
          destination_latitude: number;
          destination_longitude: number;
          origin_location_name: string | null;
          destination_location_name: string | null;
          distance_km: number;
          travel_duration_seconds: number;
          sent_at: string | null;
          estimated_delivery_at: string | null;
          delivered_at: string | null;
          opened_at: string | null;
          status: PostcardStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: Record<string, never>;
        Update: Record<string, never>;
        Relationships: [];
      };
      notifications: {
        Row: AppNotification;
        Insert: Record<string, never>;
        Update: { read_at: string | null };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_username_available: { Args: { p_username: string }; Returns: boolean };
      search_profiles: {
        Args: { p_query: string; p_limit?: number };
        Returns: PublicProfile[];
      };
      get_public_profile: {
        Args: { p_username: string };
        Returns: PublicProfile[];
      };
      get_delivery_settings: { Args: Record<string, never>; Returns: DeliverySettings };
      preview_journey: {
        Args: { p_recipient_username: string };
        Returns: JourneyPreview;
      };
      send_postcard: {
        Args: { p_recipient_username: string; p_template_id: string; p_message: string };
        Returns: string;
      };
      list_postcards: {
        Args: { p_box?: string | null; p_limit?: number };
        Returns: PostcardView[];
      };
      get_postcard: { Args: { p_id: string }; Returns: PostcardView };
      open_postcard: { Args: { p_id: string }; Returns: PostcardView };
      sync_and_summarize: { Args: Record<string, never>; Returns: HomeSummary };
      settle_due_postcards: { Args: Record<string, never>; Returns: number };
      mark_notifications_read: {
        Args: { p_ids?: string[] | null };
        Returns: number;
      };
    };
    Enums: {
      postcard_status: PostcardStatus;
      location_precision: LocationPrecision;
    };
    CompositeTypes: Record<string, never>;
  };
}

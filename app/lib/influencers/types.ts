export type InfluencerStatus = "pending" | "approved" | "hidden" | "rejected";

export type InfluencerProfile = {
  id: string;
  site_id: string;
  user_id: string | null;
  email: string;
  full_name: string;
  city: string | null;
  bio: string | null;
  instagram_url: string | null;
  tiktok_url: string | null;
  youtube_url: string | null;
  website_url: string | null;
  photo_url: string | null;
  niche: string | null;
  follower_count: string | null;
  status: InfluencerStatus;
  public_listing: boolean;
  created_at: string;
  updated_at: string;
};

export type InfluencerAdminInput = Pick<InfluencerProfile, "email" | "full_name" | "city" | "bio" | "instagram_url" | "tiktok_url" | "youtube_url" | "website_url" | "photo_url" | "niche" | "follower_count" | "public_listing"> & {
  status: "pending" | "approved";
};

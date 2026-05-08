export interface ProductListItem {
  id: string;
  seller_id: string;
  title: string;
  price: number;
  status: "selling" | "reserved" | "sold";
  location_name: string | null;
  view_count: number;
  like_count: number;
  is_negotiable: boolean;
  created_at: string;
  thumbnail_url: string | null;
  seller_nickname: string | null;
  distance_km: number | null;
}

export interface ProductImage {
  id: string;
  image_url: string;
  display_order: number;
}

export interface ProductDetail extends ProductListItem {
  description: string | null;
  category_id: number | null;
  updated_at: string;
  images: ProductImage[];
  seller_avatar: string | null;
  seller_manner_temp: number | null;
  is_liked: boolean;
}

export interface ProfileResponse {
  id: string;
  nickname: string;
  avatar_url: string | null;
  bio: string | null;
  manner_temp: number;
  location_name: string | null;
  created_at: string;
}

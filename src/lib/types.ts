export type Role = "admin" | "quality" | "rasid" | "partner" | string;

export type User = {
  id: string;
  username: string;
  password_hash: string;
  full_name: string;
  role: Role;
  custom_role: string | null;
  status: "active" | "frozen";
  created_at: string;
  reset_requested_at: string | null;
  failed_attempts: number;
};

export type Permissions = {
  user_id: string;
  can_upload: 0 | 1;
  can_review: 0 | 1;
  can_dashboard: 0 | 1;
  can_admin: 0 | 1;
};

export type SessionUser = {
  id: string;
  username: string;
  full_name: string;
  role: Role;
  permissions: {
    upload: boolean;
    review: boolean;
    dashboard: boolean;
    admin: boolean;
  };
};

export type Board = {
  id: string;
  name: string;
  type: string;
  category: string;
  city: string | null;
  district: string | null;
  streets: string; // JSON string array
  faces: number;
  screens: number;
  price: number;
  price_duration_days: number;
  location_url: string | null;
  image_url: string | null;
  company: string | null;
  created_at: string;
};

export type Sighting = {
  id: string;
  code: string;
  board_id: string;
  rasid_id: string;
  video_url: string | null;
  image_url: string | null;
  video_size_bytes: number | null;
  captured_date: string;
  captured_time: string;
  status: "pending" | "analyzed" | "deleted";
  deleted_at: string | null;
  created_at: string;
};

export type Ad = {
  id: string;
  sighting_id: string;
  company_name: string;
  sector: string;
  duration_seconds: number | null;
  repeats_per_minute: number | null;
  repeats_per_day: number | null;
  frame_image_url: string | null;
  objective: string | null;
  created_at: string;
};

export type Sector = { id: string; name: string };

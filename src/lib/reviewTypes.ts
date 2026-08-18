export type SightingRow = {
  id: string;
  code: string;
  board_id: string;
  board_name: string;
  board_type: string;
  board_city: string | null;
  rasid_id: string;
  rasid_name: string;
  video_url: string;
  video_size_bytes: number | null;
  captured_date: string;
  captured_time: string;
  status: "pending" | "analyzed" | "deleted";
  deleted_at: string | null;
};

export type AdRow = {
  id: string;
  sighting_id: string;
  sighting_code: string;
  captured_date: string;
  captured_time: string;
  board_id: string;
  board_name: string;
  board_category: string;
  board_streets: string[];
  board_city: string | null;
  company_name: string;
  sector: string;
  duration_seconds: number;
  repeats_per_minute: number;
  repeats_per_day: number;
  frame_image_url: string | null;
  objective: string | null;
};

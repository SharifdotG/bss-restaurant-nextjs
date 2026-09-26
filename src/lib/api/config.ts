export const API_ORIGIN = (process.env.NEXT_PUBLIC_API_ORIGIN ?? "http://localhost:8000").replace(
  /\/$/,
  "",
);
export const API_BASE = `${API_ORIGIN}/api/v1`;
export const LIVE_URL = `${API_ORIGIN.replace(/^http/, "ws")}/api/v1/live`;

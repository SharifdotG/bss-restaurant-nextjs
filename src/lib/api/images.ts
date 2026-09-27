import { API_ORIGIN } from "./config";

// Local storage gives "/media/foods/abc.webp", R2 gives a full URL. The API already serves
// one resized WebP, so these skip next/image and its optimisation quota.
export function imageUrl(url: string | null | undefined) {
  if (!url) return null;
  return url.startsWith("/") ? `${API_ORIGIN}${url}` : url;
}

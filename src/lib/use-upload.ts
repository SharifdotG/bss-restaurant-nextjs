import { useMutation } from "@tanstack/react-query";
import { api, unwrap } from "@/lib/api/client";
import type { ImageFolder } from "@/lib/api/schema";

/**
 * Sends a photo to the API, which turns it into one WebP of at most 1600px and returns a key.
 * The key is what dishes, staff and expenses store; nothing changes until that save happens.
 */
export function useUploadImage(folder: ImageFolder) {
  return useMutation({
    mutationFn: (file: Blob) =>
      unwrap(
        api.POST("/api/v1/uploads/images", {
          body: { file: file as unknown as string, folder },
          bodySerializer: (body) => {
            const form = new FormData();
            form.append("file", body.file as unknown as Blob, "photo.webp");
            form.append("folder", body.folder);
            return form;
          },
        }),
      ),
  });
}

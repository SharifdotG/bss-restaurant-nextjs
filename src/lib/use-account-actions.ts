import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { api, unwrap } from "@/lib/api/client";
import type { PasswordChange, ProfileUpdate, RestaurantUpdate } from "@/lib/api/schema";
import { signIn, updateUser } from "@/lib/session/client";

/** Settings reach every screen: the header, the hours, the bills and the guest pages. */
export function useSaveRestaurant() {
  const client = useQueryClient();
  const t = useTranslations("settings");

  return useMutation({
    mutationFn: (body: RestaurantUpdate) => unwrap(api.PATCH("/api/v1/restaurant", { body })),
    onSuccess: (restaurant) => {
      client.setQueryData(["restaurant"], restaurant);
      void client.invalidateQueries({ queryKey: ["public", "restaurant"] });
      toast.success(t("saved"));
    },
  });
}

export function useUpdateProfile() {
  const t = useTranslations("profile");

  return useMutation({
    mutationFn: (body: ProfileUpdate) => unwrap(api.PATCH("/api/v1/auth/me", { body })),
    onSuccess: (user) => {
      updateUser(user);
      toast.success(t("saved"));
    },
  });
}

/**
 * The API signs every other device out and hands this one fresh tokens, which replace the
 * ones in the cookie straight away so this tab stays signed in.
 */
export function useChangePassword() {
  const t = useTranslations("profile.password");

  return useMutation({
    mutationFn: async (body: PasswordChange) => {
      const tokens = await unwrap(api.POST("/api/v1/auth/me/password", { body }));
      await signIn(tokens, { remember: "keep" });
      return tokens;
    },
    onSuccess: () => toast.success(t("changed")),
  });
}

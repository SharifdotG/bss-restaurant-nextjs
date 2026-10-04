import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { api, unwrap } from "@/lib/api/client";
import type { FoodOut, PageFoodOut } from "@/lib/api/schema";
import { useErrorText } from "@/lib/api/use-error-text";

type AvailabilityInput = { food: Pick<FoodOut, "id" | "name">; available: boolean };

const withAvailability = (page: PageFoodOut | undefined, id: number, available: boolean) =>
  page && {
    ...page,
    items: page.items.map((food) => (food.id === id ? { ...food, isAvailable: available } : food)),
  };

/**
 * Sold out, or back on. It's easy to flip back, so the switch moves at once and only rolls
 * back if the API says no.
 */
export function useSetAvailability() {
  const client = useQueryClient();
  const t = useTranslations("menu.availability");
  const errorText = useErrorText();

  return useMutation({
    mutationFn: ({ food, available }: AvailabilityInput) =>
      unwrap(
        api.PUT("/api/v1/foods/{food_id}/availability", {
          params: { path: { food_id: food.id } },
          body: { isAvailable: available },
        }),
      ),
    onMutate: async ({ food, available }) => {
      await client.cancelQueries({ queryKey: ["foods"] });
      const before = client.getQueryData<PageFoodOut>(["foods"]);
      client.setQueryData<PageFoodOut>(["foods"], (page) =>
        withAvailability(page, food.id, available),
      );
      return { before };
    },
    onSuccess: (saved) =>
      toast.success(t(saved.isAvailable ? "backOn" : "soldOut", { name: saved.name })),
    onError: (error, { food }, context) => {
      client.setQueryData(["foods"], context?.before);
      toast.error(t("failed", { name: food.name }), { description: errorText.message(error) });
    },
    onSettled: () => client.invalidateQueries({ queryKey: ["foods"] }),
  });
}

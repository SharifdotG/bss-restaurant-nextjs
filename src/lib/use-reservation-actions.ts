import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { api, unwrap } from "@/lib/api/client";
import type {
  ReservationCreate,
  ReservationOut,
  ReservationStatus,
  ReservationUpdate,
} from "@/lib/api/schema";
import { useErrorText } from "@/lib/api/use-error-text";
import { receive, toLiveReservation } from "@/lib/live/store";
import { PAGE_PATHS } from "@/lib/permissions";
import { draftForTable } from "@/lib/pos-draft";
import { useSession } from "@/lib/session/client";

/** A saved booking goes to the lists on their next fetch and to the live store (bell, floor) now. */
function applyBooking(client: QueryClient, booking: ReservationOut) {
  void client.invalidateQueries({ queryKey: ["reservations"] });
  void client.invalidateQueries({ queryKey: ["dashboard"] });
  receive({
    event: "reservation.updated",
    topic: "reservations",
    at: booking.updatedAt,
    data: toLiveReservation(booking),
  });
}

type BookingRef = Pick<ReservationOut, "id" | "customerName">;
export type BookingMove = Exclude<ReservationStatus, "requested">;
type StatusInput = { booking: BookingRef; status: BookingMove; tableId?: number; note?: string };

/**
 * Confirm, seat, finish, cancel, decline or no-show. Nothing here can be undone, so it waits for
 * the API; seating offers to start the table's order straight from the toast.
 */
export function useReservationStatus({ toastErrors = true } = {}) {
  const client = useQueryClient();
  const t = useTranslations("reservations.moved");
  const errorText = useErrorText();
  const router = useRouter();
  const session = useSession();

  return useMutation({
    mutationFn: ({ booking, status, tableId, note }: StatusInput) =>
      unwrap(
        api.POST("/api/v1/reservations/{reservation_id}/status", {
          params: { path: { reservation_id: booking.id } },
          body: { status, tableId: tableId ?? null, note: note?.trim() || null },
        }),
      ),
    onSuccess: (booking, { status }) => {
      applyBooking(client, booking);
      const table = booking.table?.number ?? "";
      const message = t(status, { name: booking.customerName, table });
      const userId = session.status === "authenticated" ? session.user.id : null;
      if (status === "seated" && booking.table && userId !== null) {
        const tableId = booking.table.id;
        toast.success(message, {
          action: {
            label: t("startOrder"),
            onClick: () => {
              draftForTable(userId, tableId);
              router.push(PAGE_PATHS.newOrder);
            },
          },
        });
      } else {
        toast.success(message);
      }
    },
    onError: (error, { booking }) => {
      void client.invalidateQueries({ queryKey: ["reservations"] });
      if (!toastErrors) return;
      toast.error(t("failed", { name: booking.customerName }), {
        description: errorText.message(error),
      });
    },
  });
}

type SaveInput =
  { id?: undefined; body: ReservationCreate } | { id: number; body: ReservationUpdate };

/** New bookings from staff are confirmed on a table straight away; edits keep their status. */
export function useSaveReservation() {
  const client = useQueryClient();
  const t = useTranslations("reservations.sheet");

  return useMutation({
    mutationFn: ({ id, body }: SaveInput) =>
      id === undefined
        ? unwrap(api.POST("/api/v1/reservations", { body }))
        : unwrap(
            api.PATCH("/api/v1/reservations/{reservation_id}", {
              params: { path: { reservation_id: id } },
              body,
            }),
          ),
    onSuccess: (booking, { id }) => {
      applyBooking(client, booking);
      toast.success(
        t(id === undefined ? "created" : "saved", {
          name: booking.customerName,
          table: booking.table?.number ?? "",
        }),
      );
    },
  });
}

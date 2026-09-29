import { useTranslations } from "next-intl";
import { Pill } from "@/components/ui/pill";
import type { OrderStatus } from "@/lib/api/schema";
import { STATUS_LOOK } from "@/lib/orders";

export function OrderStatusPill({
  status,
  className,
}: {
  status: OrderStatus;
  className?: string;
}) {
  const t = useTranslations("status.order");
  const { tone, icon } = STATUS_LOOK[status];
  return (
    <Pill tone={tone} icon={icon} className={className}>
      {t(status)}
    </Pill>
  );
}

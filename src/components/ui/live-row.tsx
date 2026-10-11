"use client";

import type { HTMLMotionProps } from "motion/react";
import * as m from "motion/react-m";
import { listItem } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { rowClass } from "./table";

/**
 * A table row that drops in when it arrives and fades where it stands when it leaves;
 * rows can't be lifted out of a table, so the ones below glide up after it's gone.
 */
function LiveRow({ className, ...props }: HTMLMotionProps<"tr">) {
  return (
    <m.tr
      data-slot="table-row"
      {...listItem}
      exit={{ opacity: 0, transition: listItem.exit.transition }}
      className={cn(rowClass, className)}
      {...props}
    />
  );
}

export { LiveRow };

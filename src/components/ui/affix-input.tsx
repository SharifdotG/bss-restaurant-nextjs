import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type AffixInputProps = React.ComponentProps<"input"> & {
  /** Before the value, like "৳". */
  prefix?: React.ReactNode;
  /** After the value, like "%" or "min". */
  suffix?: React.ReactNode;
};

/** A number field that names its unit, so "15" can't be read as taka when it means percent. */
function AffixInput({ prefix, suffix, className, ...props }: AffixInputProps) {
  const affix = "pointer-events-none absolute top-1/2 -translate-y-1/2 text-muted-foreground";
  return (
    <div className="relative">
      {prefix && <span className={cn(affix, "left-3.5")}>{prefix}</span>}
      <Input
        inputMode="decimal"
        autoComplete="off"
        className={cn("tabular-nums", prefix && "pl-8", suffix && "pr-12", className)}
        {...props}
      />
      {suffix && <span className={cn(affix, "right-3.5 text-sm")}>{suffix}</span>}
    </div>
  );
}

export { AffixInput };

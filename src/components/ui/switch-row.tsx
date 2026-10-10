import { Switch } from "@/components/ui/switch";

type SwitchRowProps = {
  title: React.ReactNode;
  hint?: React.ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
};

/** A setting you turn on or off, with a line saying what it does. The whole box toggles it. */
function SwitchRow({ title, hint, checked, onChange, disabled }: SwitchRowProps) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-lg border border-border p-4 has-disabled:cursor-default has-disabled:opacity-60">
      <span>
        <span className="block text-sm font-bold">{title}</span>
        {hint && <span className="mt-0.5 block text-xs text-muted-foreground">{hint}</span>}
      </span>
      <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} />
    </label>
  );
}

export { SwitchRow };

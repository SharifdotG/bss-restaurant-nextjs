"use client";

import { useState } from "react";
import {
  CheckIcon,
  CopyIcon,
  EyeIcon,
  EyeSlashIcon,
  LockSimpleIcon,
  DiceFiveIcon,
} from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { IconInput } from "@/components/ui/input";
import { generatePassword } from "@/lib/staff";

type PasswordInputProps = Omit<React.ComponentProps<"input">, "value" | "onChange" | "type"> & {
  value: string;
  onChange: (value: string) => void;
  /** Offers a readable temporary password and a copy button, for setting up someone else. */
  generate?: boolean;
};

export function PasswordInput({ value, onChange, generate, ...props }: PasswordInputProps) {
  const t = useTranslations("inputs.password");
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard blocked; the password is on screen to read out instead
    }
  }

  return (
    <div className="grid gap-2">
      <IconInput
        icon={LockSimpleIcon}
        type={visible ? "text" : "password"}
        value={value}
        maxLength={128}
        spellCheck={false}
        autoCapitalize="off"
        onChange={(event) => onChange(event.target.value)}
        className={visible ? "font-mono tracking-wide" : undefined}
        end={
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground"
            aria-label={visible ? t("hide") : t("show")}
            aria-pressed={visible}
            onClick={() => setVisible((shown) => !shown)}
          >
            {visible ? <EyeSlashIcon weight="duotone" /> : <EyeIcon weight="duotone" />}
          </Button>
        }
        {...props}
      />
      {generate && (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="soft"
            onClick={() => {
              onChange(generatePassword());
              setVisible(true);
            }}
          >
            <DiceFiveIcon weight="duotone" />
            {t("generate")}
          </Button>
          {value && (
            <Button type="button" size="sm" variant="ghost" onClick={() => void copy()}>
              {copied ? <CheckIcon weight="bold" /> : <CopyIcon />}
              {copied ? t("copied") : t("copy")}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

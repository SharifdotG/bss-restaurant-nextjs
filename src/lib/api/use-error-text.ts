import { useTranslations, type Messages } from "next-intl";
import { useFormat } from "@/lib/use-format";
import { describeError, fieldErrors } from "./errors";

type CodeKey = `codes.${keyof Messages["errors"]["codes"]}`;

/** Turns API errors into sentences in the current language. */
export function useErrorText() {
  const t = useTranslations("errors");
  const format = useFormat();

  function message(error: unknown) {
    const { code, generic, minutes, amount } = describeError(error);
    const key = `codes.${code}` as CodeKey;
    if (code && t.has(key)) {
      return t(key, {
        minutes: minutes ?? 1,
        amount: amount === undefined ? "" : format.money(amount),
      });
    }
    return t(`generic.${generic}`);
  }

  // English keeps the API's own wording, which names limits ("at least 8 characters").
  function fields(error: unknown): Record<string, string> {
    return Object.fromEntries(
      fieldErrors(error).map(({ field, problem, message }) => [
        field,
        format.locale === "en" ? message : t(`fields.${problem}`),
      ]),
    );
  }

  return { message, fields };
}

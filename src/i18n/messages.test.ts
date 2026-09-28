import { createTranslator } from "next-intl";
import { describe, expect, it } from "vitest";
import bn from "../../messages/bn.json";
import en from "../../messages/en.json";

type Tree = { [key: string]: string | Tree };

function flatten(tree: Tree, prefix = ""): Record<string, string> {
  return Object.entries(tree).reduce<Record<string, string>>((all, [key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof value === "string"
      ? { ...all, [path]: value }
      : { ...all, ...flatten(value, path) };
  }, {});
}

// Top-level ICU arguments only: "{minutes, plural, ...}" and "{amount}" both give their name.
const argumentsOf = (message: string) =>
  [...message.matchAll(/\{(\w+)[,}]/g)].map(([, name]) => name).sort();

describe("messages", () => {
  const english = flatten(en);
  const bangla = flatten(bn);

  it("has the same keys in English and Bangla", () => {
    expect(Object.keys(bangla).sort()).toEqual(Object.keys(english).sort());
  });

  it("uses the same arguments in both languages", () => {
    for (const [key, message] of Object.entries(english)) {
      expect(argumentsOf(bangla[key] ?? ""), key).toEqual(argumentsOf(message));
    }
  });

  // A bare {count} prints Latin digits even in Bangla; counts need {count, number}.
  it("formats counts with Bangla digits", () => {
    const t = createTranslator({ locale: "bn", messages: bn });
    expect(t("session.check.liveSummary", { orders: 7, bookings: 12 })).toBe(
      "৭টি চালু অর্ডার · আজ ১২টি বুকিং",
    );
    expect(t("errors.codes.rate_limited", { minutes: 5 })).toContain("৫ মিনিট");
    expect(t("session.tokenExpires", { seconds: 89 })).toContain("৮৯");
  });
});

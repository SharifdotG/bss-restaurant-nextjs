import { TIME_ZONE } from "@/lib/format";

const clock = new Intl.DateTimeFormat("en-GB", {
  timeZone: TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

const minutes = (time: string) => {
  const [hours = 0, mins = 0] = time.split(":").map(Number);
  return hours * 60 + mins;
};

export type OpeningState = { open: boolean; until: string };

/**
 * Whether the restaurant is open at `now` (Dhaka time), and the opening or closing time that
 * comes next. Hours that run past midnight, like 17:00 to 02:00, count as one evening.
 */
export function openingState(now: Date | number, opensAt: string, closesAt: string): OpeningState {
  const current = minutes(clock.format(now));
  const opens = minutes(opensAt);
  const closes = minutes(closesAt);
  // Same opening and closing time: open around the clock.
  if (opens === closes) return { open: true, until: closesAt };
  const open =
    opens < closes ? current >= opens && current < closes : current >= opens || current < closes;
  return { open, until: open ? closesAt : opensAt };
}

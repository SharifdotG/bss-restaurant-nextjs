// The five soft tones every state maps onto. A tinted ground with dark text, never a bare colour.
export const TONES = {
  amber: "bg-tone-amber-subtle text-tone-amber-text",
  orange: "bg-tone-orange-subtle text-tone-orange-text",
  green: "bg-tone-green-subtle text-tone-green-text",
  slate: "bg-tone-slate-subtle text-tone-slate-text",
  red: "bg-tone-red-subtle text-tone-red-text",
} as const;

export type Tone = keyof typeof TONES;

/** A tone's edge, for blocks that sit on a busy background like the bookings grid. */
export const TONE_EDGES: Record<Tone, string> = {
  amber: "border-tone-amber/70",
  orange: "border-tone-orange/60",
  green: "border-tone-green/60",
  slate: "border-tone-slate/60",
  red: "border-tone-red/60",
};

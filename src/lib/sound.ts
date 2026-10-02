import { useSyncExternalStore } from "react";

// Chimes are made on the spot with Web Audio, so there's no sound file to load. Browsers keep
// audio locked until someone taps the page, so the context is created on the first tap.

export type Chime = "ticket" | "guest";

// Two rising notes; guests get a brighter pair so the two are told apart across a room.
const NOTES: Record<Chime, [number, number]> = {
  ticket: [659.25, 880], // E5, A5
  guest: [880, 1318.5], // A5, E6
};

const KEY = "bss-sound";
let context: AudioContext | null = null;
let muted: boolean | null = null;
const listeners = new Set<() => void>();

/** Starts audio from inside a tap. Safe to call on every tap. */
export function unlockSound() {
  try {
    context ??= new AudioContext();
    if (context.state === "suspended") void context.resume();
  } catch {
    // No Web Audio here; the screen still works without sound.
  }
}

let primed = false;
/** Unlocks audio on the next tap anywhere, for screens that chime without a start button. */
export function primeSound() {
  if (primed || typeof window === "undefined") return;
  primed = true;
  window.addEventListener("pointerdown", unlockSound, { capture: true, once: true });
  window.addEventListener("keydown", unlockSound, { capture: true, once: true });
}

function note(audio: AudioContext, frequency: number, at: number) {
  const gain = audio.createGain();
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(0.25, at + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.9);
  gain.connect(audio.destination);

  // A sine with a quiet octave on top sounds like a bell rather than a beep.
  for (const [type, multiple, level] of [
    ["sine", 1, 1],
    ["triangle", 2, 0.12],
  ] as const) {
    const osc = audio.createOscillator();
    const partial = audio.createGain();
    osc.type = type;
    osc.frequency.value = frequency * multiple;
    partial.gain.value = level;
    osc.connect(partial).connect(gain);
    osc.start(at);
    osc.stop(at + 1);
  }
}

export function playChime(kind: Chime) {
  if (isMuted() || !context || context.state !== "running") return;
  const [first, second] = NOTES[kind];
  const at = context.currentTime + 0.02;
  note(context, first, at);
  note(context, second, at + 0.16);
}

/** True once audio is unlocked and able to play. */
export const soundReady = () => context?.state === "running";

function isMuted() {
  if (muted === null) {
    try {
      muted = localStorage.getItem(KEY) === "off";
    } catch {
      muted = false;
    }
  }
  return muted;
}

export function setMuted(next: boolean) {
  muted = next;
  try {
    localStorage.setItem(KEY, next ? "off" : "on");
  } catch {
    // Remembered until the page closes.
  }
  listeners.forEach((listener) => listener());
}

export const useMuted = () =>
  useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    isMuted,
    () => false,
  );

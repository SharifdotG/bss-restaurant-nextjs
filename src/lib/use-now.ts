import { useEffect, useState } from "react";

/** The current time, ticking every `interval` ms, for countdowns and "5 minutes ago". */
export function useNow(interval = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), interval);
    return () => clearInterval(timer);
  }, [interval]);
  return now;
}

/** Measure elapsed playback, never the furthest position reached by seeking. */
export function createPlaybackTracker() {
  let previous: { position: number; time: number } | null = null;
  let watchedSeconds = 0;
  return {
    sample(position: number, time: number, playing: boolean, seeking: boolean) {
      if (previous && playing && !seeking) {
        const elapsed = Math.max(0, (time - previous.time) / 1000);
        const advanced = position - previous.position;
        // Discard seeks and long gaps (e.g. a backgrounded browser tab).
        if (elapsed <= 2 && advanced > 0 && advanced <= elapsed * 2 + 0.5) {
          watchedSeconds += Math.min(advanced, elapsed);
        }
      }
      previous = playing && !seeking ? { position, time } : null;
      return watchedSeconds;
    },
  };
}

import { useCallback, useEffect, useRef, useState } from "react";

// Clock for scenario playback. `time` (seconds) drives the UI; the ref holds
// the same value for the animation loop so it never reads stale state.
export function usePlayback(duration: number) {
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const timeRef = useRef(0);

  const seek = useCallback((t: number) => {
    timeRef.current = t;
    setTime(t);
  }, []);

  const play = useCallback(() => {
    if (timeRef.current >= duration) seek(0);
    setPlaying(true);
  }, [duration, seek]);

  const pause = useCallback(() => setPlaying(false), []);

  const reset = useCallback(() => {
    setPlaying(false);
    seek(0);
  }, [seek]);

  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const next = timeRef.current + ((now - last) / 1000) * speed;
      last = now;
      if (next >= duration) {
        seek(duration);
        setPlaying(false);
        return;
      }
      seek(next);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, speed, duration, seek]);

  return { time, playing, speed, setSpeed, play, pause, reset, seek };
}

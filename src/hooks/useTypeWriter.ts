import { useState, useEffect, useRef } from 'react';

interface TypewriterResult {
  displayed: string;
  isDone: boolean;
}

export function useTypewriter({
  text,
  active,
  wps = 40,
}: {
  text: string;
  active: boolean;
  wps?: number;
}): TypewriterResult {
  const [displayed, setDisplayed] = useState('');
  const [isDone, setIsDone] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textRef = useRef(text);

  useEffect(() => {
    // Cancel any running animation
    if (timerRef.current) clearTimeout(timerRef.current);

    if (!active) {
      setDisplayed(text);
      setIsDone(true);
      return;
    }

    if (!text) {
      setDisplayed('');
      setIsDone(true);
      return;
    }

    textRef.current = text;
    setDisplayed('');
    setIsDone(false);

    // Split preserving whitespace so reconstruction is lossless.
    const tokens = text.match(/(\S+\s*)/g) ?? [text];
    const CHUNK = 2; // tokens per tick
    const delay = Math.round((1000 / wps) * CHUNK);

    let idx = 0;
    textRef.current = text;

    const tick = () => {
      if (textRef.current !== text) return; // text changed, bail

      idx += CHUNK;
      if (idx >= tokens.length) {
        setDisplayed(text); // exact final value - no truncation
        setIsDone(true);
        return;
      }

      setDisplayed(tokens.slice(0, idx).join(''));
      timerRef.current = setTimeout(tick, delay);
    };

    timerRef.current = setTimeout(tick, 0);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, active]);

  return { displayed, isDone };
}
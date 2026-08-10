"use client";

import { useEffect, useState } from "react";

/**
 * Trails `value` by `delay` ms. Used so a search box can feel instant (the
 * input renders every keystroke) while the server only sees the pause.
 */
export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);

  return debounced;
}

import { useEffect, useState } from "react";

export default function useDebouncedValue(value, delayMs = 1000) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handle = setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);

    return () => clearTimeout(handle);
  }, [value, delayMs]);

  return debouncedValue;
}

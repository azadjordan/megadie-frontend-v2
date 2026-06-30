import { useCallback, useSyncExternalStore } from "react";

function getMediaQueryMatch(query, fallback) {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return fallback;
  }
  return window.matchMedia(query).matches;
}

export default function useMediaQuery(query, fallback = false) {
  const subscribe = useCallback(
    (onStoreChange) => {
      if (
        typeof window === "undefined" ||
        typeof window.matchMedia !== "function"
      ) {
        return () => {};
      }

      const mediaQueryList = window.matchMedia(query);

      if (typeof mediaQueryList.addEventListener === "function") {
        mediaQueryList.addEventListener("change", onStoreChange);
        return () =>
          mediaQueryList.removeEventListener("change", onStoreChange);
      }

      mediaQueryList.addListener(onStoreChange);
      return () => mediaQueryList.removeListener(onStoreChange);
    },
    [query]
  );

  const getSnapshot = useCallback(
    () => getMediaQueryMatch(query, fallback),
    [query, fallback]
  );
  const getServerSnapshot = useCallback(() => fallback, [fallback]);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

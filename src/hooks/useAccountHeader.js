// src/hooks/useAccountHeader.js
import { useOutletContext } from "react-router-dom";

export default function useAccountHeader() {
  const ctx = useOutletContext();
  return (
    ctx || {
      setAccountHeader: () => {},
      clearAccountHeader: () => {},
    }
  );
}

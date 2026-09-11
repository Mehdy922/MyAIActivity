import { useCallback, useRef, useState } from "react";
import { S } from "../theme.js";

export function useToast() {
  const [toast, setToast] = useState("");
  const timer = useRef(null);
  const flash = useCallback((msg) => {
    setToast(msg);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(""), 2600);
  }, []);
  return { toast, flash };
}

export function Toast({ message }) {
  if (!message) return null;
  return <div role="status" className="nl-pop" style={S.toast}>{message}</div>;
}

import { useEffect, useRef } from "react";
import { C, LABEL_COLORS, S } from "../theme.js";

export function MiniPattern({ pts }) {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext("2d");
    ctx.fillStyle = C.cream; ctx.fillRect(0, 0, 56, 56);
    (pts || []).forEach((p) => {
      ctx.beginPath(); ctx.arc(p.x * 56, p.y * 56, 2.5, 0, 7);
      ctx.fillStyle = LABEL_COLORS[p.c ? 1 : 0]; ctx.fill();
    });
  }, [pts]);
  return <canvas ref={ref} width={56} height={56} style={S.mini} aria-hidden="true" />;
}

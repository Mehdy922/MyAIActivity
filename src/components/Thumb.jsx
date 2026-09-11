import { useEffect, useRef } from "react";
import { S } from "../theme.js";
import { GRID, pixToRGBA } from "../ml/capture.js";

export function Thumb({ pix, tint }) {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext("2d");
    const img = ctx.createImageData(GRID, GRID);
    img.data.set(pixToRGBA(pix));
    ctx.putImageData(img, 0, 0);
  }, [pix]);
  return <canvas ref={ref} width={GRID} height={GRID} style={{ ...S.thumb, borderColor: tint }} aria-hidden="true" />;
}

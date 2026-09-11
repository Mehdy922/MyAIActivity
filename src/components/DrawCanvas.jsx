import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from "react";
import { S } from "../theme.js";
import { captureFromCanvas } from "../ml/capture.js";

export const DrawCanvas = forwardRef(function DrawCanvas({ size = 300, onStrokeStart }, ref) {
  const cvs = useRef(null);
  const drawing = useRef(false);

  const clear = useCallback(() => {
    const c = cvs.current; if (!c) return;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, c.width, c.height);
  }, []);

  useEffect(() => { clear(); }, [clear]);

  useImperativeHandle(ref, () => ({
    clear,
    capture: () => (cvs.current ? captureFromCanvas(cvs.current) : null),
  }), [clear]);

  const pos = (e) => {
    const c = cvs.current, r = c.getBoundingClientRect();
    return [(e.clientX - r.left) * (c.width / r.width), (e.clientY - r.top) * (c.height / r.height)];
  };
  const down = (e) => {
    drawing.current = true;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    onStrokeStart?.();
    const ctx = cvs.current.getContext("2d");
    ctx.strokeStyle = "#111"; ctx.lineWidth = 14; ctx.lineCap = "round"; ctx.lineJoin = "round";
    const [x, y] = pos(e);
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 0.01, y + 0.01); ctx.stroke();
  };
  const move = (e) => {
    if (!drawing.current) return;
    const ctx = cvs.current.getContext("2d");
    const [x, y] = pos(e);
    ctx.lineTo(x, y); ctx.stroke();
  };
  const up = () => { drawing.current = false; };

  return (
    <canvas ref={cvs} width={size} height={size} style={S.canvas} aria-label="Drawing canvas"
      onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onPointerLeave={up} />
  );
});

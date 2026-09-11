import { useEffect, useRef } from "react";
import QRCode from "qrcode";
import { C, S } from "../theme.js";

export function QrLink({ url, size = 200 }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current || !url) return;
    QRCode.toCanvas(ref.current, url, { width: size, margin: 1, color: { dark: C.ink, light: "#FFFFFF" } }).catch(() => {});
  }, [url, size]);
  return <canvas ref={ref} style={{ ...S.qr, width: size, height: size }} aria-label={`QR code for ${url}`} />;
}

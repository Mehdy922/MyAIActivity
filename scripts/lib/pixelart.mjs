// Synthetic 16×16 "drawings" of the two default things, with a per-team style.
// Shared by the bot simulator (scripts/simulate.mjs) and the slide builder (slides/build.mjs)
// so the deck's pixel art is literally what the bots draw.
import { GRID, NPIX } from "../../src/ml/capture.js";

// kind 0 = mango (squashed, tilted ellipse, optional stem); kind 1 = cricket ball (circle + seam).
export function drawShape(kind, style, rand) {
  const pix = new Array(NPIX).fill(0);
  const cx = GRID / 2 + (rand() - 0.5) * style.jitter, cy = GRID / 2 + (rand() - 0.5) * style.jitter;
  const r = GRID * 0.5 * style.scale * (0.9 + rand() * 0.2);
  const ex = 1.0, ey = kind === 0 ? 0.78 : 1.0;
  const tilt = kind === 0 ? style.tilt : 0;
  const cos = Math.cos(tilt), sin = Math.sin(tilt);
  for (let y = 0; y < GRID; y++) for (let x = 0; x < GRID; x++) {
    const dx = x + 0.5 - cx, dy = y + 0.5 - cy;
    const u = (dx * cos + dy * sin) / (r * ex), v = (-dx * sin + dy * cos) / (r * ey);
    const d = Math.sqrt(u * u + v * v);
    let ink = 0;
    if (style.filled) ink = d <= 1 ? 1 : 0;
    else ink = Math.abs(d - 1) <= style.weight / r ? 1 : 0;
    if (kind === 1 && d <= 1) {
      const s = style.seamVertical ? Math.abs(dx) : Math.abs(dy);
      if (s <= style.weight * 0.6) ink = 1;
      if (style.stitches && s <= style.weight * 1.8 && Math.round((style.seamVertical ? y : x) / 2) % 2 === 0) ink = 1;
    }
    if (kind === 0 && style.stem && dy < -r * ey * 0.85 && Math.abs(dx) < style.weight * 0.6) ink = 1;
    if (ink && rand() < style.dropout) ink = 0;
    if (!ink && rand() < style.noise) ink = 0.6;
    pix[y * GRID + x] = ink;
  }
  return pix;
}

export const STYLES = [
  { filled: true, scale: 0.85, weight: 1.2, tilt: -0.5, seamVertical: true, stitches: false, stem: true, jitter: 1.5, dropout: 0.02, noise: 0.00 },
  { filled: false, scale: 0.9, weight: 1.6, tilt: 0.4, seamVertical: true, stitches: true, stem: false, jitter: 1.0, dropout: 0.05, noise: 0.01 },
  { filled: false, scale: 0.6, weight: 1.0, tilt: -0.2, seamVertical: false, stitches: false, stem: true, jitter: 2.5, dropout: 0.08, noise: 0.02 },
  { filled: true, scale: 0.7, weight: 2.2, tilt: 0.9, seamVertical: false, stitches: true, stem: false, jitter: 2.0, dropout: 0.03, noise: 0.03 },
  { filled: false, scale: 0.8, weight: 2.4, tilt: 0.0, seamVertical: true, stitches: false, stem: true, jitter: 1.0, dropout: 0.10, noise: 0.00 },
  { filled: true, scale: 0.95, weight: 1.0, tilt: -0.9, seamVertical: false, stitches: true, stem: true, jitter: 0.5, dropout: 0.00, noise: 0.05 },
];

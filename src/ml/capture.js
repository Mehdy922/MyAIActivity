// Canvas -> auto-crop -> centre -> 16x16 -> 256 floats in 0..1.
// The crop/centre step is what stops a team "winning" by always drawing in one corner.

export const GRID = 16;
export const NPIX = GRID * GRID;
export const INK_THRESHOLD = 200;

export function inkBounds(data, width, height, threshold = INK_THRESHOLD) {
  let x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4] < threshold) {
        if (x < x0) x0 = x; if (x > x1) x1 = x;
        if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
    }
  }
  return x1 < 0 ? null : { x0, y0, x1, y1 };
}

export function cropBox({ x0, y0, x1, y1 }) {
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  const side = Math.max(x1 - x0, y1 - y0) * 1.25 + 8;
  return { sx: cx - side / 2, sy: cy - side / 2, side };
}

export function rgbaToPix(data, n = NPIX) {
  const out = new Array(n);
  for (let i = 0; i < n; i++) out[i] = 1 - data[i * 4] / 255;
  return out;
}

export function pixToRGBA(pix) {
  const out = new Uint8ClampedArray(pix.length * 4);
  for (let i = 0; i < pix.length; i++) {
    const v = 255 - Math.round(pix[i] * 255);
    out[i * 4] = v; out[i * 4 + 1] = v; out[i * 4 + 2] = v; out[i * 4 + 3] = 255;
  }
  return out;
}

export function captureFromCanvas(canvas, grid = GRID) {
  const ctx = canvas.getContext("2d");
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const bounds = inkBounds(img.data, canvas.width, canvas.height);
  if (!bounds) return null;
  const { sx, sy, side } = cropBox(bounds);
  const small = document.createElement("canvas");
  small.width = grid; small.height = grid;
  const sc = small.getContext("2d");
  sc.imageSmoothingEnabled = true;
  sc.fillStyle = "#fff"; sc.fillRect(0, 0, grid, grid);
  sc.drawImage(canvas, sx, sy, side, side, 0, 0, grid, grid);
  return rgbaToPix(sc.getImageData(0, 0, grid, grid).data, grid * grid);
}

import { describe, it, expect } from "vitest";
import { inkBounds, cropBox, rgbaToPix, pixToRGBA, GRID, NPIX } from "./capture.js";

function whiteRGBA(w, h) {
  const d = new Uint8ClampedArray(w * h * 4);
  d.fill(255);
  return d;
}
function ink(d, w, x, y) {
  const i = (y * w + x) * 4;
  d[i] = 17; d[i + 1] = 17; d[i + 2] = 17; d[i + 3] = 255;
}

describe("constants", () => {
  it("grid is 16 and NPIX 256", () => {
    expect(GRID).toBe(16);
    expect(NPIX).toBe(256);
  });
});

describe("inkBounds", () => {
  it("returns null for a blank canvas", () => {
    expect(inkBounds(whiteRGBA(10, 10), 10, 10)).toBeNull();
  });
  it("finds the bounding box of dark pixels", () => {
    const d = whiteRGBA(20, 20);
    ink(d, 20, 3, 4); ink(d, 20, 10, 12); ink(d, 20, 7, 7);
    expect(inkBounds(d, 20, 20)).toEqual({ x0: 3, y0: 4, x1: 10, y1: 12 });
  });
  it("ignores light grey above the threshold", () => {
    const d = whiteRGBA(5, 5);
    d[0] = 230;
    expect(inkBounds(d, 5, 5)).toBeNull();
  });
});

describe("cropBox", () => {
  it("centres a square 25% larger plus 8px", () => {
    const box = cropBox({ x0: 10, y0: 20, x1: 50, y1: 40 });
    // w=40, h=20 -> side = 40*1.25+8 = 58, centre (30,30)
    expect(box.side).toBe(58);
    expect(box.sx).toBe(30 - 29);
    expect(box.sy).toBe(30 - 29);
  });
});

describe("rgbaToPix / pixToRGBA", () => {
  it("inverts red channel to 0..1", () => {
    const d = new Uint8ClampedArray([255, 255, 255, 255, 0, 0, 0, 255, 127.5, 0, 0, 255]);
    const pix = rgbaToPix(d, 3);
    expect(pix[0]).toBe(0);
    expect(pix[1]).toBe(1);
    expect(pix[2]).toBeCloseTo(0.5, 1);
  });
  it("round-trips through pixToRGBA", () => {
    const pix = [0, 1, 0.5];
    const rgba = pixToRGBA(pix);
    expect(rgba).toHaveLength(12);
    expect(rgba[0]).toBe(255); expect(rgba[3]).toBe(255);
    expect(rgba[4]).toBe(0);
    expect(rgba[8]).toBe(255 - 128);
  });
});

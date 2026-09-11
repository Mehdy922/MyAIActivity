import { describe, it, expect } from "vitest";
import { mulberry32, newNet, fwd, trainEpochs, accuracy, packNet, packPix, pct, HID_A, EPOCHS_A, LR_A } from "./net.js";

// 16x16 synthetic drawings: label 0 = left half inked, label 1 = right half inked
function halfPattern(side, shift) {
  const pix = new Array(256).fill(0);
  for (let y = 0; y < 16; y++)
    for (let x = 0; x < 16; x++) {
      const inked = side === 0 ? x < 8 + shift : x >= 8 + shift;
      pix[y * 16 + x] = inked ? 1 : 0;
    }
  return pix;
}

describe("mulberry32", () => {
  it("is deterministic and in [0,1)", () => {
    const a = mulberry32(7), b = mulberry32(7);
    const xs = Array.from({ length: 5 }, () => a());
    const ys = Array.from({ length: 5 }, () => b());
    expect(xs).toEqual(ys);
    xs.forEach((v) => { expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThan(1); });
  });
});

describe("newNet / fwd", () => {
  it("builds the right shapes and outputs a probability", () => {
    const net = newNet(4, 3, 1);
    expect(net.W1).toHaveLength(3);
    expect(net.W1[0]).toHaveLength(4);
    expect(net.b1).toHaveLength(3);
    expect(net.W2).toHaveLength(3);
    const { h, y } = fwd(net, [0.1, 0.2, 0.3, 0.4]);
    expect(h).toHaveLength(3);
    expect(y).toBeGreaterThan(0);
    expect(y).toBeLessThan(1);
  });
});

describe("trainEpochs", () => {
  it("reaches 100% on a linearly separable 2D set", () => {
    const X = [[-1, -1], [-1, 1], [1, -1], [1, 1], [-0.5, 0.2], [0.5, -0.3]];
    const Y = [0, 0, 1, 1, 0, 1];
    const net = newNet(2, 1, 3);
    trainEpochs(net, X, Y, 200, 0.3);
    const samples = X.map((pix, i) => ({ pix, label: Y[i] }));
    expect(accuracy(net, samples)).toBe(1);
  });

  it("reaches 100% on synthetic 16x16 drawings with the production settings", () => {
    const samples = [];
    for (const shift of [-1, 0, 1, 2]) {
      samples.push({ pix: halfPattern(0, shift), label: 0 });
      samples.push({ pix: halfPattern(1, shift), label: 1 });
    }
    const net = newNet(256, HID_A, samples.length * 7 + 3);
    trainEpochs(net, samples.map((s) => s.pix), samples.map((s) => s.label), EPOCHS_A, LR_A);
    expect(accuracy(net, samples)).toBe(1);
  });
});

describe("accuracy", () => {
  it("returns null for no samples", () => {
    expect(accuracy(newNet(2, 1), [])).toBeNull();
  });
});

describe("packNet / packPix", () => {
  it("rounds weights to 3 dp and keeps predictions", () => {
    const net = newNet(2, 2, 5);
    net.W1[0][0] = 0.123456;
    const packed = packNet(net);
    expect(packed.W1[0][0]).toBe(0.123);
    expect(packed.nIn).toBe(2);
    expect(packed.nHid).toBe(2);
    const y1 = fwd(net, [0.3, -0.7]).y, y2 = fwd(packed, [0.3, -0.7]).y;
    expect(Math.abs(y1 - y2)).toBeLessThan(0.01);
  });
  it("packPix rounds to 2 dp", () => {
    expect(packPix([0.123, 0.999, 0])).toEqual([0.12, 1, 0]);
  });
});

describe("pct", () => {
  it("formats", () => {
    expect(pct(null)).toBe("—");
    expect(pct(undefined)).toBe("—");
    expect(pct(0.5)).toBe("50%");
    expect(pct(0.666)).toBe("67%");
  });
});

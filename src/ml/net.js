// Tiny MLP: nIn -> nHid (tanh) -> 1 (sigmoid). Lifted from the prototype unchanged.

export const HID_A = 10;        // hidden units for the drawing net
export const EPOCHS_A = 240;
export const LR_A = 0.06;
export const MIN_PER_LABEL = 4;

export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function newNet(nIn, nHid, seed = 1) {
  const r = mulberry32(seed);
  return {
    nIn, nHid,
    W1: Array.from({ length: nHid }, () =>
      Array.from({ length: nIn }, () => (r() * 2 - 1) * Math.sqrt(2 / nIn))),
    b1: new Array(nHid).fill(0),
    W2: Array.from({ length: nHid }, () => (r() * 2 - 1) * Math.sqrt(2 / nHid)),
    b2: 0,
  };
}

export function fwd(net, x) {
  const h = new Array(net.nHid);
  for (let j = 0; j < net.nHid; j++) {
    let s = net.b1[j];
    const w = net.W1[j];
    for (let i = 0; i < net.nIn; i++) s += w[i] * x[i];
    h[j] = Math.tanh(s);
  }
  let o = net.b2;
  for (let j = 0; j < net.nHid; j++) o += net.W2[j] * h[j];
  return { h, y: 1 / (1 + Math.exp(-o)) };
}

export function trainEpochs(net, X, Y, epochs, lr) {
  for (let e = 0; e < epochs; e++) {
    for (let n = 0; n < X.length; n++) {
      const x = X[n], t = Y[n];
      const { h, y } = fwd(net, x);
      const dO = y - t;
      for (let j = 0; j < net.nHid; j++) {
        const dH = dO * net.W2[j] * (1 - h[j] * h[j]);
        net.W2[j] -= lr * dO * h[j];
        const w = net.W1[j];
        for (let i = 0; i < net.nIn; i++) if (x[i] !== 0) w[i] -= lr * dH * x[i];
        net.b1[j] -= lr * dH;
      }
      net.b2 -= lr * dO;
    }
  }
}

export function accuracy(net, samples) {
  if (!samples || !samples.length) return null;
  let ok = 0;
  samples.forEach((s) => { if ((fwd(net, s.pix).y > 0.5 ? 1 : 0) === s.label) ok++; });
  return ok / samples.length;
}

const r3 = (v) => Math.round(v * 1000) / 1000;
const r2 = (v) => Math.round(v * 100) / 100;

export const packNet = (n) => ({
  nIn: n.nIn, nHid: n.nHid,
  W1: n.W1.map((row) => row.map(r3)),
  b1: n.b1.map(r3),
  W2: n.W2.map(r3),
  b2: r3(n.b2),
});

export const packPix = (p) => p.map(r2);

export const pct = (v) => (v == null ? "—" : `${Math.round(v * 100)}%`);

import { describe, it, expect } from "vitest";
import { newNet, trainEpochs, mulberry32, HID_A, EPOCHS_A, LR_A } from "./net.js";
import { buildModelPayload } from "../rooms/api.js";
import { buildTournamentTable } from "./scoring.js";

// 16x16 synthetic drawings: label 0 = left half inked, label 1 = right half inked
// (copied from net.test.js so this test locks the write-shape <-> read-shape seam
// end to end: a real trained net -> the RTDB write payload -> the tournament reader).
function halfPattern(side, shift) {
  const pix = new Array(256).fill(0);
  for (let y = 0; y < 16; y++)
    for (let x = 0; x < 16; x++) {
      const inked = side === 0 ? x < 8 + shift : x >= 8 + shift;
      pix[y * 16 + x] = inked ? 1 : 0;
    }
  return pix;
}

describe("write-shape / read-shape seam", () => {
  it("a real trained net's model payload round-trips through buildTournamentTable", () => {
    const samples = [];
    for (const shift of [-1, 0, 1, 2]) {
      samples.push({ pix: halfPattern(0, shift), label: 0 });
      samples.push({ pix: halfPattern(1, shift), label: 1 });
    }
    const net = newNet(256, HID_A, samples.length * 7 + 3);
    trainEpochs(net, samples.map((s) => s.pix), samples.map((s) => s.label), EPOCHS_A, LR_A);

    const payload = buildModelPayload({ net, samples, own: 1, uid: "u1", rand: mulberry32(1) });

    expect(payload.model.nIn).toBe(256);
    expect(payload.model.nHid).toBe(10);
    expect(payload.tests).toHaveLength(6);
    payload.tests.forEach((t) => expect(t.pix).toHaveLength(256));

    const models = { tA: payload, tB: payload };
    const teams = { tA: { name: "A" }, tB: { name: "B" } };
    const rows = buildTournamentTable(models, teams);

    expect(rows).toHaveLength(2);
    rows.forEach((r) => {
      expect(r.cross).toBe(1);
      expect(r.n).toBe(6);
    });
  });
});

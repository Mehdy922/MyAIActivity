import { describe, it, expect } from "vitest";
import { CODE_ALPHABET, CODE_LENGTH, generateRoomCode, normalizeCode, isValidCode } from "./codes.js";

describe("codes", () => {
  it("alphabet has no O, 0, I, 1", () => {
    for (const ch of "O0I1") expect(CODE_ALPHABET.includes(ch)).toBe(false);
    expect(CODE_ALPHABET).toHaveLength(32);
  });
  it("generates 5 chars from the alphabet", () => {
    for (let i = 0; i < 50; i++) {
      const c = generateRoomCode();
      expect(c).toHaveLength(CODE_LENGTH);
      for (const ch of c) expect(CODE_ALPHABET.includes(ch)).toBe(true);
    }
  });
  it("is deterministic given rand", () => {
    let i = 0;
    const rand = () => [0, 0.5, 0.999, 0.25, 0.75][i++ % 5];
    expect(generateRoomCode(rand)).toBe("A" + CODE_ALPHABET[16] + CODE_ALPHABET[31] + CODE_ALPHABET[8] + CODE_ALPHABET[24]);
  });
  it("normalizes user input", () => {
    expect(normalizeCode(" ab-cd e ")).toBe("ABCDE");
    expect(normalizeCode("abcdefg")).toBe("ABCDE");
  });
  it("validates", () => {
    expect(isValidCode("ABCDE")).toBe(true);
    expect(isValidCode("ABCD")).toBe(false);
    expect(isValidCode("ABCD0")).toBe(false);
    expect(isValidCode("abcde")).toBe(false);
    expect(isValidCode("")).toBe(false);
    expect(isValidCode(null)).toBe(false);
  });
});

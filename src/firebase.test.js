import { describe, it, expect } from "vitest";
import { isConfigured } from "./firebase.js";
import { firebaseConfig } from "./firebaseConfig.js";

describe("isConfigured", () => {
  it("is false while placeholders remain", () => {
    expect(isConfigured({ apiKey: "PASTE_API_KEY", projectId: "x" })).toBe(false);
  });
  it("is true when every value is a non-placeholder string", () => {
    expect(isConfigured({ apiKey: "AIza123", authDomain: "p.firebaseapp.com", databaseURL: "https://p-default-rtdb.firebaseio.com", projectId: "p", appId: "1:2:web:3" })).toBe(true);
  });
  it("shipped config exposes the five required keys", () => {
    for (const k of ["apiKey", "authDomain", "databaseURL", "projectId", "appId"]) {
      expect(typeof firebaseConfig[k]).toBe("string");
    }
  });
});

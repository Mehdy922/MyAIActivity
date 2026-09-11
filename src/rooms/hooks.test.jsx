import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

const subs = new Map();   // path -> callback
const offs = new Map();   // path -> unsubscribe spy
const errs = new Map();   // path -> error callback

vi.mock("../firebase.js", () => ({
  subscribe: (path, cb, onError) => {
    subs.set(path, cb);
    errs.set(path, onError);
    const off = vi.fn(() => subs.delete(path));
    offs.set(path, off);
    return off;
  },
  ensureAuth: () => Promise.resolve("uid-1"),
}));

import { usePath, useRoom, useAuth } from "./hooks.js";

beforeEach(() => { subs.clear(); offs.clear(); errs.clear(); });

const fire = (path, value) => act(() => { subs.get(path)(value); });

describe("usePath", () => {
  it("is loading until the first value, then exposes it", () => {
    const { result } = renderHook(() => usePath("rooms/X/teams"));
    expect(result.current.loading).toBe(true);
    fire("rooms/X/teams", { t1: { name: "A" } });
    expect(result.current.loading).toBe(false);
    expect(result.current.value).toEqual({ t1: { name: "A" } });
  });
  it("reports null for a missing node", () => {
    const { result } = renderHook(() => usePath("rooms/X/meta"));
    fire("rooms/X/meta", null);
    expect(result.current.value).toBeNull();
    expect(result.current.loading).toBe(false);
  });
  it("does not subscribe when disabled or path is null, and unsubscribes on unmount", () => {
    const { unmount: u1 } = renderHook(() => usePath("rooms/X/models", false));
    expect(subs.has("rooms/X/models")).toBe(false);
    u1();
    const { unmount } = renderHook(() => usePath("rooms/X/models", true));
    expect(subs.has("rooms/X/models")).toBe(true);
    unmount();
    expect(offs.get("rooms/X/models")).toHaveBeenCalled();
  });
  it("exposes a subscription error", () => {
    const { result } = renderHook(() => usePath("rooms/X/meta"));
    act(() => { errs.get("rooms/X/meta")(new Error("PERMISSION_DENIED")); });
    expect(result.current.error.message).toBe("PERMISSION_DENIED");
  });
});

describe("useRoom", () => {
  it("subscribes to meta, members and teams and reports missing rooms", () => {
    const { result } = renderHook(() => useRoom("ABCDE"));
    expect(result.current.loading).toBe(true);
    fire("rooms/ABCDE/meta", null);
    expect(result.current.missing).toBe(true);
  });
  it("exposes live state", () => {
    const { result } = renderHook(() => useRoom("ABCDE"));
    fire("rooms/ABCDE/meta", { phase: "teach", teacherUid: "t" });
    expect(result.current.loading).toBe(true);
    fire("rooms/ABCDE/members", { u1: { name: "Sana", teamId: "t1" } });
    fire("rooms/ABCDE/teams", { t1: { name: "A" } });
    expect(result.current.loading).toBe(false);
    expect(result.current.missing).toBe(false);
    expect(result.current.meta.phase).toBe("teach");
    expect(result.current.members.u1.name).toBe("Sana");
    expect(result.current.teams.t1.name).toBe("A");
  });
  it("defaults members and teams to empty objects", () => {
    const { result } = renderHook(() => useRoom("ABCDE"));
    fire("rooms/ABCDE/meta", { phase: "lobby" });
    fire("rooms/ABCDE/members", null);
    fire("rooms/ABCDE/teams", null);
    expect(result.current.members).toEqual({});
    expect(result.current.teams).toEqual({});
  });
});

describe("useAuth", () => {
  it("resolves the uid", async () => {
    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.uid).toBe("uid-1"));
    expect(result.current.error).toBeNull();
  });
});

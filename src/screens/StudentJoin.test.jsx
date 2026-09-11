import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const api = { getRoomMeta: vi.fn(), joinRoom: vi.fn() };
vi.mock("../rooms/api.js", () => ({
  getRoomMeta: (...a) => api.getRoomMeta(...a),
  joinRoom: (...a) => api.joinRoom(...a),
}));

import { StudentJoin } from "./StudentJoin.jsx";

beforeEach(() => { api.getRoomMeta.mockReset(); api.joinRoom.mockReset(); localStorage.clear(); });

describe("StudentJoin", () => {
  it("disables Join until code is valid and name is filled, normalizes code", () => {
    render(<StudentJoin uid="u1" onJoined={() => {}} onExit={() => {}} />);
    const join = screen.getByRole("button", { name: /Join/ });
    expect(join.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText(/Room code/), { target: { value: "ab cde" } });
    expect(screen.getByLabelText(/Room code/).value).toBe("ABCDE");
    expect(join.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText(/Your name/), { target: { value: "Sana" } });
    expect(join.disabled).toBe(false);
  });
  it("shows an error when the room does not exist", async () => {
    api.getRoomMeta.mockResolvedValue(null);
    render(<StudentJoin uid="u1" onJoined={() => {}} onExit={() => {}} />);
    fireEvent.change(screen.getByLabelText(/Room code/), { target: { value: "ABCDE" } });
    fireEvent.change(screen.getByLabelText(/Your name/), { target: { value: "Sana" } });
    fireEvent.click(screen.getByRole("button", { name: /Join/ }));
    await waitFor(() => expect(screen.getByText(/No room called ABCDE/)).toBeTruthy());
    expect(api.joinRoom).not.toHaveBeenCalled();
  });
  it("joins and reports the code", async () => {
    api.getRoomMeta.mockResolvedValue({ phase: "lobby" });
    api.joinRoom.mockResolvedValue();
    const onJoined = vi.fn();
    render(<StudentJoin uid="u1" onJoined={onJoined} onExit={() => {}} />);
    fireEvent.change(screen.getByLabelText(/Room code/), { target: { value: "ABCDE" } });
    fireEvent.change(screen.getByLabelText(/Your name/), { target: { value: "Sana" } });
    fireEvent.click(screen.getByRole("button", { name: /Join/ }));
    await waitFor(() => expect(onJoined).toHaveBeenCalledWith("ABCDE"));
    expect(api.joinRoom).toHaveBeenCalledWith({ code: "ABCDE", uid: "u1", name: "Sana" });
  });
  it("locks the code field when lockedCode is given", () => {
    render(<StudentJoin uid="u1" lockedCode="QWERT" onJoined={() => {}} onExit={() => {}} />);
    const code = screen.getByLabelText(/Room code/);
    expect(code.value).toBe("QWERT");
    expect(code.disabled).toBe(true);
  });
});

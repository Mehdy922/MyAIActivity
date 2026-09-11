import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { TeamCard } from "./TeamCard.jsx";

const team = { name: "Aloo Gosht" };
const members = [{ uid: "u1", name: "Sana" }, { uid: "u2", name: "Bilal" }];

afterEach(cleanup);

describe("TeamCard", () => {
  it("shows name, count and members, and joins", () => {
    const onJoin = vi.fn();
    render(<TeamCard teamId="t1" team={team} members={members} cap={4} canJoin onJoin={onJoin} />);
    expect(screen.getByText("Aloo Gosht")).toBeTruthy();
    expect(screen.getByText("2/4")).toBeTruthy();
    expect(screen.getByText("Sana")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Join/ }));
    expect(onJoin).toHaveBeenCalledWith("t1");
  });
  it("disables join when full", () => {
    render(<TeamCard teamId="t1" team={team} members={members} cap={2} canJoin onJoin={() => {}} />);
    expect(screen.getByRole("button", { name: /Full/ }).disabled).toBe(true);
  });
  it("shows Leave for my team unless locked", () => {
    const onLeave = vi.fn();
    const { rerender } = render(<TeamCard teamId="t1" team={team} members={members} cap={4} isMine onLeave={onLeave} />);
    fireEvent.click(screen.getByRole("button", { name: /Leave/ }));
    expect(onLeave).toHaveBeenCalled();
    rerender(<TeamCard teamId="t1" team={team} members={members} cap={4} isMine locked onLeave={onLeave} />);
    expect(screen.queryByRole("button", { name: /Leave/ })).toBeNull();
    expect(screen.getByText(/sent/i)).toBeTruthy();
  });
  it("shows teacher controls", () => {
    const onDelete = vi.fn();
    render(<TeamCard teamId="t1" team={team} members={members} cap={4} teacher onRename={() => {}} onDelete={onDelete} />);
    fireEvent.click(screen.getByRole("button", { name: /Delete/ }));
    expect(onDelete).toHaveBeenCalledWith("t1");
  });
  it("rename field picks up the latest team name when editing starts", () => {
    const onRename = vi.fn();
    const { rerender } = render(<TeamCard teamId="t1" team={{ name: "Old" }} members={members} cap={4} teacher onRename={onRename} onDelete={() => {}} />);
    rerender(<TeamCard teamId="t1" team={{ name: "New" }} members={members} cap={4} teacher onRename={onRename} onDelete={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: /Rename/ }));
    expect(screen.getByLabelText("Team name").value).toBe("New");
    fireEvent.click(screen.getByRole("button", { name: /Save/ }));
    expect(onRename).toHaveBeenCalledWith("t1", "New");
  });
});

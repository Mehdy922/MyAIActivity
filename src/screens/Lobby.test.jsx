import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("../rooms/hooks.js", () => ({ useTeamModel: () => ({ value: null, loading: false, error: null }) }));
vi.mock("../rooms/api.js", () => ({
  createTeam: vi.fn(), joinTeam: vi.fn(), leaveTeam: vi.fn(), renameTeam: vi.fn(), deleteTeam: vi.fn(), moveMember: vi.fn(),
  DEFAULT_TEAM_CAP: 4,
}));
vi.mock("../components/QrLink.jsx", () => ({ QrLink: () => null }));

import { Lobby } from "./Lobby.jsx";

const teams = { t1: { name: "Aloo", createdAt: 1 }, t2: { name: "Bhindi", createdAt: 2 } };
const members = { u1: { name: "Sana", teamId: "t1" }, u2: { name: "Bilal", teamId: "t2" }, me: { name: "Zara" } };
const base = { code: "ABCDE", uid: "me", members, teams, team: null, isTeacher: false, flash: () => {} };

describe("Lobby team limit (student view)", () => {
  it("lets students create a team while under the limit", () => {
    render(<Lobby {...base} meta={{ teamCap: 4, maxTeams: 3 }} />);
    expect(screen.getByLabelText("New team name")).toBeTruthy();
    expect(screen.getByText("2/3")).toBeTruthy();
  });
  it("hides the create form and explains when the limit is reached", () => {
    render(<Lobby {...base} meta={{ teamCap: 4, maxTeams: 2 }} />);
    expect(screen.queryByLabelText("New team name")).toBeNull();
    expect(screen.getByText(/All 2 teams are made/)).toBeTruthy();
    expect(screen.getByText("2/2")).toBeTruthy();
  });
  it("has no limit when maxTeams is unset", () => {
    render(<Lobby {...base} meta={{ teamCap: 4 }} />);
    expect(screen.getByLabelText("New team name")).toBeTruthy();
    expect(screen.queryByText(/teams are made/)).toBeNull();
  });
});

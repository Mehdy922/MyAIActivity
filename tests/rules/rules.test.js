import { readFileSync } from "node:fs";
import { beforeAll, afterAll, beforeEach, describe, it } from "vitest";
import { initializeTestEnvironment, assertSucceeds, assertFails } from "@firebase/rules-unit-testing";

const CODE = "ABCDE";
const TEACHER = "teacher1";
let env;

const db = (uid) => (uid ? env.authenticatedContext(uid) : env.unauthenticatedContext()).database();
const path = (sub) => `rooms/${CODE}/${sub}`;

const validModel = {
  model: { nIn: 256, nHid: 10, W1: [[0.1]], b1: [0], W2: [0.2], b2: 0 },
  tests: [{ label: 0, pix: [0, 1] }, { label: 1, pix: [1, 0] }],
  own: 1,
  sentBy: "s1",
  at: 1,
};

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-neural-lab",
    database: {
      rules: readFileSync("database.rules.json", "utf8"),
      host: "127.0.0.1",
      port: 9000,
    },
  });
});

afterAll(async () => { await env.cleanup(); });

beforeEach(async () => {
  await env.clearDatabase();
  await env.withSecurityRulesDisabled(async (ctx) => {
    await ctx.database().ref(`rooms/${CODE}`).set({
      meta: { labels: ["Mango", "Cricket ball"], teamCap: 4, phase: "teach", teacherUid: TEACHER },
      teams: { tA: { name: "A", createdBy: "s1" }, tB: { name: "B", createdBy: "s2" } },
      members: { s1: { name: "Sana", teamId: "tA" }, s2: { name: "Bilal", teamId: "tB" } },
      challenges: { c1: { teamId: "tA", teamName: "A", pts: [{ x: 0.1, y: 0.2, c: 0 }] } },
    });
  });
});

describe("reads", () => {
  it("denies unauthenticated read", async () => {
    await assertFails(db(null).ref(path("meta")).get());
  });
  it("allows any anonymous user to read", async () => {
    await assertSucceeds(db("anyone").ref(path("meta")).get());
  });
});

describe("meta", () => {
  it("teacher can change phase and labels", async () => {
    await assertSucceeds(db(TEACHER).ref(path("meta")).update({ phase: "reveal" }));
    await assertSucceeds(db(TEACHER).ref(path("meta")).update({ labels: ["Sun", "Flower"] }));
    await assertSucceeds(db(TEACHER).ref(path("meta")).update({ teamCap: 6 }));
  });
  it("student cannot write meta", async () => {
    await assertFails(db("s1").ref(path("meta")).update({ phase: "reveal" }));
    await assertFails(db("s1").ref(path("meta/teacherUid")).set("s1"));
  });
  it("anyone can create a new room whose teacherUid is themselves", async () => {
    await assertSucceeds(db("t2").ref("rooms/ZZZZZ/meta").set({ labels: ["A", "B"], teamCap: 4, phase: "lobby", teacherUid: "t2", createdAt: 1 }));
  });
  it("cannot create a room claiming someone else as teacher", async () => {
    await assertFails(db("t2").ref("rooms/YYYYY/meta").set({ labels: ["A", "B"], teamCap: 4, phase: "lobby", teacherUid: "t3" }));
  });
  it("rejects bad phase or cap", async () => {
    await assertFails(db(TEACHER).ref(path("meta")).update({ phase: "party" }));
    await assertFails(db(TEACHER).ref(path("meta")).update({ teamCap: 0 }));
    await assertFails(db(TEACHER).ref(path("meta")).update({ teamCap: 13 }));
  });
  it("maxTeams must be 2..20 or cleared", async () => {
    await assertFails(db(TEACHER).ref(path("meta")).update({ maxTeams: 1 }));
    await assertFails(db(TEACHER).ref(path("meta")).update({ maxTeams: 21 }));
    await assertFails(db(TEACHER).ref(path("meta")).update({ maxTeams: "6" }));
    await assertSucceeds(db(TEACHER).ref(path("meta")).update({ maxTeams: 2 }));
    await assertSucceeds(db(TEACHER).ref(path("meta")).update({ maxTeams: 20 }));
    await assertSucceeds(db(TEACHER).ref(path("meta")).update({ maxTeams: null }));
    await assertFails(db("s1").ref(path("meta")).update({ maxTeams: 5 }));
  });
});

describe("members", () => {
  it("a user can write only their own member record", async () => {
    await assertSucceeds(db("s3").ref(path("members/s3")).set({ name: "Zara", joinedAt: 1 }));
    await assertFails(db("s3").ref(path("members/s1")).update({ name: "Hacked" }));
  });
  it("teacher can move any member", async () => {
    await assertSucceeds(db(TEACHER).ref(path("members/s1")).update({ teamId: "tB" }));
  });
  it("teamId must reference an existing team", async () => {
    await assertSucceeds(db("s1").ref(path("members/s1")).update({ teamId: "tB" }));
    await assertFails(db("s1").ref(path("members/s1")).update({ teamId: "nope" }));
    await assertSucceeds(db("s1").ref(path("members/s1")).update({ teamId: null }));
  });
  it("name length is bounded", async () => {
    await assertFails(db("s4").ref(path("members/s4")).set({ name: "x".repeat(25) }));
    await assertFails(db("s4").ref(path("members/s4")).set({ name: "" }));
  });
  it("teamId rejects path injection and empty string", async () => {
    await assertFails(db("s1").ref(path("members/s1")).update({ teamId: "tA/name" }));
    await assertFails(db("s1").ref(path("members/s1")).update({ teamId: "" }));
  });
});

describe("teams", () => {
  it("any member can create a team; only teacher can rename or delete", async () => {
    await assertSucceeds(db("s3").ref(path("teams/tC")).set({ name: "C", createdBy: "s3", createdAt: 1 }));
    await assertFails(db("s1").ref(path("teams/tA")).update({ name: "Renamed" }));
    await assertFails(db("s1").ref(path("teams/tA")).remove());
    await assertSucceeds(db(TEACHER).ref(path("teams/tA")).update({ name: "Renamed" }));
    await assertSucceeds(db(TEACHER).ref(path("teams/tB")).remove());
  });
  it("team name length is bounded", async () => {
    await assertFails(db("s3").ref(path("teams/tD")).set({ name: "x".repeat(23), createdBy: "s3" }));
  });
});

describe("models", () => {
  it("a member can write their own team's model", async () => {
    await assertSucceeds(db("s1").ref(path("models/tA")).set(validModel));
  });
  it("a member cannot write another team's model", async () => {
    await assertFails(db("s1").ref(path("models/tB")).set(validModel));
  });
  it("a member with no team cannot write any model", async () => {
    await env.withSecurityRulesDisabled((ctx) => ctx.database().ref(path("members/s9")).set({ name: "Solo" }));
    await assertFails(db("s9").ref(path("models/tA")).set(validModel));
  });
  it("rejects a model with the wrong shape", async () => {
    await assertFails(db("s1").ref(path("models/tA")).set({ ...validModel, model: { ...validModel.model, nHid: 3 } }));
    await assertFails(db("s1").ref(path("models/tA")).set({ ...validModel, model: { ...validModel.model, nIn: 64 } }));
  });
  it("teacher can wipe all models", async () => {
    await env.withSecurityRulesDisabled((ctx) => ctx.database().ref(path("models/tA")).set(validModel));
    await assertFails(db("s1").ref(path("models")).remove());
    await assertSucceeds(db(TEACHER).ref(path("models")).remove());
  });
  it("rejects a model with more than 12 tests", async () => {
    const tooMany = { ...validModel, tests: Array.from({ length: 13 }, (_, i) => ({ label: i % 2, pix: [0, 1] })) };
    await assertFails(db("s1").ref(path("models/tA")).set(tooMany));
  });
});

describe("challenges", () => {
  it("any member can post a challenge and update best; only teacher deletes", async () => {
    await assertSucceeds(db("s2").ref(path("challenges/c2")).set({ teamId: "tB", teamName: "B", pts: [{ x: 0.5, y: 0.5, c: 1 }], at: 1 }));
    await assertSucceeds(db("s2").ref(path("challenges/c1/best")).set({ teamId: "tB", teamName: "B", neurons: 2 }));
    await assertFails(db("s2").ref(path("challenges/c1")).remove());
    await assertSucceeds(db(TEACHER).ref(path("challenges/c1")).remove());
    await assertSucceeds(db(TEACHER).ref(path("challenges")).remove());
  });
  it("a student cannot overwrite or gut another team's challenge", async () => {
    await assertFails(db("s2").ref(path("challenges/c1")).set({ teamId: "tB", teamName: "B", pts: [{ x: 0, y: 0, c: 0 }], at: 1 }));
    await assertFails(db("s2").ref(path("challenges/c1/pts")).set([{ x: 0, y: 0, c: 0 }]));
    await assertFails(db("s2").ref(path("challenges/c1/teamName")).set("Impostor"));
    await env.withSecurityRulesDisabled((ctx) => ctx.database().ref(path("challenges/c1/best")).set({ teamId: "tA", teamName: "A", neurons: 3 }));
    await assertFails(db("s2").ref(path("challenges/c1/best")).remove());
    await assertSucceeds(db("s2").ref(path("challenges/c1/best")).set({ teamId: "tB", teamName: "B", neurons: 2 }));
  });
  it("best.neurons must be 1..8", async () => {
    await assertFails(db("s2").ref(path("challenges/c1/best")).set({ teamId: "tB", teamName: "B", neurons: 0 }));
    await assertFails(db("s2").ref(path("challenges/c1/best")).set({ teamId: "tB", teamName: "B", neurons: 9 }));
  });
  it("rejects a challenge with more than 60 points", async () => {
    const tooMany = { teamId: "tB", teamName: "B", pts: Array.from({ length: 61 }, () => ({ x: 0, y: 0, c: 0 })), at: 1 };
    await assertFails(db("s2").ref(path("challenges/c2")).set(tooMany));
  });
});

describe("rounds", () => {
  it("meta.round must be a number >= 1", async () => {
    await assertFails(db(TEACHER).ref(path("meta")).update({ round: 0 }));
    await assertFails(db(TEACHER).ref(path("meta")).update({ round: "2" }));
    await assertSucceeds(db(TEACHER).ref(path("meta")).update({ round: 2 }));
  });
  it("only the teacher writes round history; everyone can read it", async () => {
    const results = { tA: { name: "A", own: 1, cross: 0.5 }, tB: { name: "B", own: 1 } };
    await assertFails(db("s1").ref(path("rounds/1")).set(results));
    await assertSucceeds(db(TEACHER).ref(path("rounds/1")).set(results));
    await assertSucceeds(db("s2").ref(path("rounds")).get());
  });
  it("teacher can start the next round in one update; a student cannot", async () => {
    await env.withSecurityRulesDisabled((ctx) => ctx.database().ref(path("models/tA")).set(validModel));
    const upd = { "rounds/1": { tA: { name: "A", own: 1, cross: 0.5 } }, models: null, "meta/round": 2, "meta/phase": "teach" };
    await assertFails(db("s1").ref(`rooms/${CODE}`).update(upd));
    await assertSucceeds(db(TEACHER).ref(`rooms/${CODE}`).update(upd));
  });
  it("reset clears history and round", async () => {
    await env.withSecurityRulesDisabled((ctx) => ctx.database().ref(path("rounds/1/tA")).set({ name: "A", own: 1, cross: 0.5 }));
    await assertSucceeds(db(TEACHER).ref(`rooms/${CODE}`).update({ models: null, challenges: null, rounds: null, "meta/phase": "teach", "meta/round": 1 }));
  });
});

describe("multi-path updates used by the client", () => {
  it("teacher can delete a team with its model and member links in one update", async () => {
    await env.withSecurityRulesDisabled((ctx) => ctx.database().ref(path("models/tA")).set(validModel));
    await assertSucceeds(db(TEACHER).ref(`rooms/${CODE}`).update({ "teams/tA": null, "models/tA": null, "members/s1/teamId": null }));
  });
  it("teacher can reset the board; a student cannot", async () => {
    await env.withSecurityRulesDisabled((ctx) => ctx.database().ref(path("models/tA")).set(validModel));
    await assertFails(db("s1").ref(`rooms/${CODE}`).update({ models: null, challenges: null, "meta/phase": "teach" }));
    await assertSucceeds(db(TEACHER).ref(`rooms/${CODE}`).update({ models: null, challenges: null, "meta/phase": "teach" }));
  });
});

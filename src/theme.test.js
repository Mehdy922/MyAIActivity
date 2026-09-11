import { describe, it, expect } from "vitest";
import { C, LABEL_COLORS, CSS, S } from "./theme.js";

describe("theme", () => {
  it("label colours are mango then sky", () => {
    expect(LABEL_COLORS).toEqual([C.mango, C.sky]);
  });
  it("CSS loads Fredoka and Nunito and defines the button class", () => {
    expect(CSS).toContain("Fredoka");
    expect(CSS).toContain("Nunito");
    expect(CSS).toContain(".nl-btn");
  });
  it("defines every style key the screens use", () => {
    const needed = ["app", "head", "word", "tag", "tabs", "tab", "tabOn", "strip", "chip", "main", "wide", "card",
      "h1", "h2", "lede", "hint", "empty", "pickRow", "pick", "pickN", "canvas", "btnRow", "primary", "ghost",
      "accent", "tiny", "danger", "guess", "guessLbl", "guessConf", "thumbs", "thumb", "train", "send", "score",
      "scoreN", "scoreL", "bigCompare", "bigN", "bigL", "arrow", "table", "tr", "thead", "barCell", "bar", "qBox",
      "qKick", "q", "qBig", "closing", "qNote", "sliderRow", "slLbl", "slider", "slVal", "chList", "ch", "mini",
      "chBody", "chTeam", "chBest", "chBtns", "toast", "center", "centerCard", "choiceGrid", "choiceCard",
      "choiceEmoji", "choiceTitle", "choiceSub", "field", "label", "input", "codeInput", "codeBig", "qr", "link",
      "teamGrid", "teamCard", "teamCardMine", "teamName", "teamCount", "memberList", "member", "caution", "badge",
      "phaseBar", "phaseBtn", "phaseNow", "settingsGrid", "notesP", "sheetRow", "logo", "row"];
    for (const k of needed) expect(S[k], `S.${k}`).toBeDefined();
  });
});

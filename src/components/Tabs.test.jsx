import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Tabs } from "./Tabs.jsx";

const tabs = [{ key: "a", label: "Alpha", emoji: "🅰️" }, { key: "b", label: "Beta", emoji: "🅱️" }];

describe("Tabs", () => {
  it("renders each tab and fires onChange", () => {
    const onChange = vi.fn();
    render(<Tabs tabs={tabs} active="a" onChange={onChange} />);
    fireEvent.click(screen.getByRole("tab", { name: /Beta/ }));
    expect(onChange).toHaveBeenCalledWith("b");
    expect(screen.getByRole("tab", { name: /Alpha/ }).getAttribute("aria-selected")).toBe("true");
  });
});

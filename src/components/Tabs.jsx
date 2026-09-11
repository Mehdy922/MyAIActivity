import { S } from "../theme.js";

export function Tabs({ tabs, active, onChange }) {
  return (
    <nav role="tablist" style={S.tabs}>
      {tabs.map((t) => (
        <button key={t.key} role="tab" aria-selected={active === t.key} className="nl-btn"
          style={{ ...S.tab, ...(active === t.key ? S.tabOn : null) }} onClick={() => onChange(t.key)}>
          <span aria-hidden="true">{t.emoji}</span> {t.label}
        </button>
      ))}
    </nav>
  );
}

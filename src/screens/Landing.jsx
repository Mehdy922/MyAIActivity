import { S } from "../theme.js";

export function Landing({ onChoose, rejoinCode, onRejoin }) {
  return (
    <div style={S.center}>
      <div className="nl-fade" style={{ ...S.centerCard, maxWidth: 640 }}>
        <div className="nl-bounce" style={{ fontSize: 64, lineHeight: 1 }} aria-hidden="true">🧠</div>
        <h1 style={S.h1}>Neural Lab</h1>
        <p style={{ ...S.lede, margin: "0 auto 18px" }}>Teach a machine to see. Then find out what it really learned.</p>
        {rejoinCode && (
          <button className="nl-btn" style={{ ...S.accent, width: "100%", marginBottom: 18 }} onClick={() => onRejoin(rejoinCode)}>
            Rejoin room {rejoinCode} →
          </button>
        )}
        <p style={{ ...S.label, fontSize: 16 }}>Are you a teacher or a student?</p>
        <div style={S.choiceGrid}>
          <button className="nl-btn" style={S.choiceCard} onClick={() => onChoose("teacher")}>
            <div style={S.choiceEmoji} aria-hidden="true">👩‍🏫</div>
            <div style={S.choiceTitle}>Teacher</div>
            <div style={S.choiceSub}>Create a room for your class</div>
          </button>
          <button className="nl-btn" style={S.choiceCard} onClick={() => onChoose("student")}>
            <div style={S.choiceEmoji} aria-hidden="true">🙋</div>
            <div style={S.choiceTitle}>Student</div>
            <div style={S.choiceSub}>Join with a room code</div>
          </button>
        </div>
      </div>
    </div>
  );
}

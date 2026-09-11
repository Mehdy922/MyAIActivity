import { Component } from "react";
import { S, C } from "../theme.js";

export class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <div style={S.center}>
        <div className="nl-fade" style={S.centerCard}>
          <h1 style={S.h1}>Something went wrong</h1>
          <p style={{ ...S.lede, color: C.muted }}><code>{error.message || String(error)}</code></p>
          <button className="nl-btn" style={S.primary} onClick={() => window.location.reload()}>Reload</button>
        </div>
      </div>
    );
  }
}

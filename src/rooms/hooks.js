import { useEffect, useState } from "react";
import { subscribe, ensureAuth } from "../firebase.js";

export function useAuth() {
  const [state, setState] = useState({ uid: null, error: null });
  useEffect(() => {
    let alive = true;
    Promise.resolve().then(() => ensureAuth())
      .then((uid) => alive && setState({ uid, error: null }))
      .catch((error) => alive && setState({ uid: null, error }));
    return () => { alive = false; };
  }, []);
  return state;
}

// value: undefined while loading, null when the node does not exist.
export function usePath(path, enabled = true) {
  const [value, setValue] = useState(undefined);
  const [error, setError] = useState(null);
  useEffect(() => {
    if (!enabled || !path) { setValue(undefined); setError(null); return undefined; }
    setValue(undefined);
    setError(null);
    const off = subscribe(path, (v) => setValue(v === undefined ? null : v), (e) => setError(e));
    return () => off();
  }, [path, enabled]);
  return { value, loading: value === undefined, error };
}

export function useRoom(code) {
  const meta = usePath(code ? `rooms/${code}/meta` : null);
  const members = usePath(code ? `rooms/${code}/members` : null);
  const teams = usePath(code ? `rooms/${code}/teams` : null);
  return {
    meta: meta.value,
    members: members.value || {},
    teams: teams.value || {},
    loading: meta.loading || members.loading || teams.loading,
    missing: meta.value === null,
    error: meta.error || members.error || teams.error || null,
  };
}

export const useModels = (code, enabled = true) => usePath(code ? `rooms/${code}/models` : null, enabled);
export const useChallenges = (code, enabled = true) => usePath(code ? `rooms/${code}/challenges` : null, enabled);
export const useRounds = (code, enabled = true) => usePath(code ? `rooms/${code}/rounds` : null, enabled);
export const useTeamModel = (code, teamId) => usePath(code && teamId ? `rooms/${code}/models/${teamId}` : null, Boolean(teamId));

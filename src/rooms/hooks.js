import { useEffect, useState } from "react";
import { subscribe, ensureAuth } from "../firebase.js";

export function useAuth() {
  const [state, setState] = useState({ uid: null, error: null });
  useEffect(() => {
    let alive = true;
    ensureAuth()
      .then((uid) => alive && setState({ uid, error: null }))
      .catch((error) => alive && setState({ uid: null, error }));
    return () => { alive = false; };
  }, []);
  return state;
}

// value: undefined while loading, null when the node does not exist.
export function usePath(path, enabled = true) {
  const [value, setValue] = useState(undefined);
  useEffect(() => {
    if (!enabled || !path) { setValue(undefined); return undefined; }
    setValue(undefined);
    const off = subscribe(path, (v) => setValue(v === undefined ? null : v));
    return () => off();
  }, [path, enabled]);
  return { value, loading: value === undefined };
}

export function useRoom(code) {
  const meta = usePath(code ? `rooms/${code}/meta` : null);
  const members = usePath(code ? `rooms/${code}/members` : null);
  const teams = usePath(code ? `rooms/${code}/teams` : null);
  return {
    meta: meta.value,
    members: members.value || {},
    teams: teams.value || {},
    loading: meta.loading,
    missing: meta.value === null,
  };
}

export const useModels = (code, enabled = true) => usePath(code ? `rooms/${code}/models` : null, enabled);
export const useChallenges = (code, enabled = true) => usePath(code ? `rooms/${code}/challenges` : null, enabled);
export const useTeamModel = (code, teamId) => usePath(code && teamId ? `rooms/${code}/models/${teamId}` : null, Boolean(teamId));

/* Lightweight, frontend-only handoff between the Agentic Hiring Pipeline demo
   and the existing Onboarding / Knowledge Transfer pages. No backend involved —
   this is sessionStorage acting as the "sync" so hires from the pipeline show
   up as real new employees when those pages are opened. Best-effort: failures
   (private browsing, storage disabled) are swallowed since this is a POC.

   Exposed via useSyncExternalStore-friendly helpers so pages can read it
   without a useEffect+setState round trip — sessionStorage doesn't exist
   during SSR, so a naive effect-based read would either crash the server
   render or cause a hydration mismatch once the client re-reads it. */

export interface SyncedHire {
  id: string;
  name: string;
  email: string;
  designation: string;
  ats: number;
  experience: string;
  skills: string[];
}

const STORAGE_KEY = "af_hiring_pipeline_new_hires";
const EMPTY: SyncedHire[] = [];

// Cached so getSnapshot() returns a stable reference across renders —
// sessionStorage never changes on its own within a page's lifetime, so a
// no-op subscribe (below) plus this cache is enough for useSyncExternalStore.
let cache: SyncedHire[] | null = null;

function readFromStorage(): SyncedHire[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : EMPTY;
  } catch {
    return EMPTY;
  }
}

export function writeSyncedHires(hires: SyncedHire[]) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(hires));
  } catch {
    /* best-effort only */
  }
  cache = hires;
}

export function clearSyncedHires() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
  cache = EMPTY;
}

export function getSyncedHiresSnapshot(): SyncedHire[] {
  if (cache === null) cache = readFromStorage();
  return cache;
}

export function getSyncedHiresServerSnapshot(): SyncedHire[] {
  return EMPTY;
}

export function subscribeSyncedHires(): () => void {
  return () => {};
}

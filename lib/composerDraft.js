// composer draft persistence — survives iOS Safari tab suspension.
// only used for NEW messages (not edits, which have a DB source of truth).

const KEY = (userId) => `everly-composer-${userId}`;

export function readComposerDraft(userId) {
  if (!userId || typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(KEY(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed.deliverAt) parsed.deliverAt = new Date(parsed.deliverAt);
    return parsed;
  } catch {
    return null;
  }
}

export function writeComposerDraft(userId, draft) {
  if (!userId || typeof window === 'undefined') return;
  try {
    const serialised = {
      ...draft,
      deliverAt: draft.deliverAt ? draft.deliverAt.toISOString() : null,
    };
    window.localStorage.setItem(KEY(userId), JSON.stringify(serialised));
  } catch {
    // quota, private mode — ignore
  }
}

export function clearComposerDraft(userId) {
  if (!userId || typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(KEY(userId));
  } catch {}
}

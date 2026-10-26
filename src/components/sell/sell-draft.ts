// The sell form's saved draft (src/components/sell/SellForm.tsx): what a seller typed, kept in this browser's
// localStorage so a refresh or a later sitting picks up where they left off while they look for their SPA.
// - One draft per account: the key ends with the user id, so on a shared device one seller never sees another's.
// - Text answers and the step only: never files or photos (a File can't be stored, and documents mustn't linger
//   on a shared device), the phone number or the ownership confirmation (given afresh at submit).
// - Removed once the listing is submitted, after 30 days, and on every page shown signed out (SellDraftJanitor in the
//   site layout), so signing out clears it.
// Every access is wrapped: storage can be missing or blocked (private windows, previews), and the form works without it.

export const SELL_DRAFT_KEY = "od_sell_draft_v1";
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
/** Generous caps, so a tampered entry can't blow up the form. */
const MAX_TEXT = 5000;
const MAX_PLAN_ROWS = 40;

export type DraftPlanRow = { label: string; dueDate: string; amount: string };

export type SellDraft = {
  savedAt: number;
  step: number;
  state: Record<string, string>;
  plan: DraftPlanRow[];
  leadId?: string;
};

const keyFor = (userId: string) => `${SELL_DRAFT_KEY}:${userId}`;
const text = (v: unknown, max = MAX_TEXT) => (typeof v === "string" ? v.slice(0, max) : "");

/** The saved draft of this account, with only the given text fields kept; null when there is none (or it is stale). */
export function readSellDraft(userId: string, fields: readonly string[]): SellDraft | null {
  try {
    const raw = window.localStorage.getItem(keyFor(userId));
    if (!raw) return null;
    const d = JSON.parse(raw) as Record<string, unknown> | null;
    const savedAt = typeof d?.savedAt === "number" ? d.savedAt : 0;
    if (!d || d.v !== 1 || Date.now() - savedAt > MAX_AGE_MS || Date.now() < savedAt - 60_000) {
      window.localStorage.removeItem(keyFor(userId));
      return null;
    }
    const src = (d.state ?? {}) as Record<string, unknown>;
    const state: Record<string, string> = {};
    for (const k of fields) if (typeof src[k] === "string") state[k] = text(src[k]);
    const plan = (Array.isArray(d.plan) ? d.plan : []).slice(0, MAX_PLAN_ROWS).map((p) => {
      const row = (p ?? {}) as Record<string, unknown>;
      return { label: text(row.label, 200), dueDate: text(row.dueDate, 10), amount: text(row.amount, 20) };
    });
    const step = typeof d.step === "number" && Number.isFinite(d.step) ? Math.trunc(d.step) : 0;
    const leadId = typeof d.leadId === "string" && /^[0-9a-f-]{36}$/i.test(d.leadId) ? d.leadId : undefined;
    return { savedAt, step, state, plan, leadId };
  } catch {
    return null;
  }
}

export function writeSellDraft(userId: string, draft: Omit<SellDraft, "savedAt">) {
  try {
    window.localStorage.setItem(keyFor(userId), JSON.stringify({ v: 1, savedAt: Date.now(), ...draft }));
  } catch {
    // Full or blocked storage: the form simply isn't saved.
  }
}

export function removeSellDraft(userId: string) {
  try {
    window.localStorage.removeItem(keyFor(userId));
  } catch {}
}

/** Every account's draft in this browser (signed out: nobody's draft should stay behind). */
export function removeAllSellDrafts() {
  try {
    const keys: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k === SELL_DRAFT_KEY || k?.startsWith(`${SELL_DRAFT_KEY}:`)) keys.push(k);
    }
    for (const k of keys) window.localStorage.removeItem(k);
  } catch {}
}

"use client";

import { useEffect } from "react";
import { removeAllSellDrafts } from "./sell-draft";

/**
 * Mounted by the site layout on pages shown signed out (after logging out, or once the session ended): removes the
 * saved sell-form drafts from this browser, so the next person on a shared device finds nothing of the last seller's.
 */
export function SellDraftJanitor() {
  useEffect(removeAllSellDrafts, []);
  return null;
}

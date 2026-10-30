import "server-only";
import { refCode } from "./format";
import { notifyAdmins } from "./notify";

export type InquiryNotice = {
  type: "info" | "viewing" | "contact";
  name: string;
  email: string;
  phone?: string | null;
  message?: string | null;
  /** The deal it is about, when it was sent from a deal page. */
  listing?: { projectName: string; refNo: number } | null;
};

/**
 * The admins' "inquiry.received" notice, sent when a message arrives (src/app/actions/market.ts createInquiry) and
 * when an admin moves one caught as spam back to the inbox (src/app/actions/admin.ts setInquirySpam). Project names
 * and reference codes read the same in both languages, so the deal line goes in as-is.
 */
export function notifyInquiryReceived(q: InquiryNotice, except?: (string | null | undefined)[]) {
  const about = q.listing ? `${q.listing.projectName} · ${refCode(q.listing.refNo)}` : null;
  return notifyAdmins(
    "inquiry.received",
    {
      kind: { t: "errors", key: `notify.inquiry.${q.type}` },
      name: q.name,
      contact: [q.email, q.phone].filter(Boolean).join(" · "),
      message: [about, q.message].filter(Boolean).join("\n"),
    },
    "/admin/inquiries",
    { except },
  );
}

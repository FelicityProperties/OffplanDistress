import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { eq } from "drizzle-orm";
import { StaffListingForm, type StaffPrefill } from "@/components/admin/StaffListingForm";
import { PageTitle } from "@/components/Kpi";
import { db } from "@/db";
import { listings, sellerLeads } from "@/db/schema";
import { isLocale } from "@/i18n/config";
import { getT } from "@/i18n/server";
import { requireAdmin } from "@/lib/auth";
import { COMMUNITIES, DEVELOPERS } from "@/lib/config";
import { leadCode, nextQuarters } from "@/lib/estimate";
import { refCode } from "@/lib/format";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * The form's starting values from a seller lead (/admin/leads → "Create listing from this lead"), and the listing it
 * was already turned into, if any (one per lead: adminCreateListing refuses a second).
 */
async function leadPrefill(id: string): Promise<{ prefill: StaffPrefill; ref: string; listing: { id: string; refNo: number } | null } | null> {
  if (!UUID.test(id)) return null;
  const [row] = await db
    .select({ lead: sellerLeads, listing: { id: listings.id, refNo: listings.refNo } })
    .from(sellerLeads)
    .leftJoin(listings, eq(listings.id, sellerLeads.listingId))
    .where(eq(sellerLeads.id, id))
    .limit(1);
  if (!row) return null;
  const { lead } = row;
  const listedDeveloper = DEVELOPERS.includes(lead.developer);
  const listedCommunity = lead.community ? COMMUNITIES.includes(lead.community) : false;
  return {
    listing: row.listing,
    ref: leadCode(lead.refNo),
    prefill: {
      leadId: lead.id,
      sellerName: lead.name,
      sellerPhone: lead.phone,
      sellerEmail: lead.email ?? undefined,
      sellerLocale: isLocale(lead.locale) ? lead.locale : "en",
      developer: listedDeveloper ? lead.developer : "Other",
      developerOther: listedDeveloper ? undefined : lead.developer,
      community: lead.community ? (listedCommunity ? lead.community : "Other") : undefined,
      communityOther: lead.community && !listedCommunity ? lead.community : undefined,
      projectName: lead.project ?? undefined,
      originalPrice: lead.spaPrice,
      amountPaid: lead.amountPaid,
      handoverDate: lead.handoverQuarter,
      motivation: lead.defaultNotice || lead.missed === "more" ? "urgent" : "motivated",
    },
  };
}

// Typed by hand (not PageProps<"/admin/listings/new">) so it compiles before Next regenerates its route types.
export default async function NewStaffListingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const [{ lead }, t] = await Promise.all([searchParams, getT("admin")]);
  const fromLead = typeof lead === "string" ? await leadPrefill(lead) : null;
  return (
    <div className="space-y-6">
      <Link
        href={fromLead ? "/admin/leads" : "/admin"}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4 rtl:-scale-x-100" aria-hidden /> {t(fromLead ? "nav.leads" : "nav.queue")}
      </Link>
      <PageTitle title={t("create.title")} sub={t("create.sub")} />
      {fromLead?.listing ? (
        // Opened again (Back, a second tab): the lead's unit is entered already, so no second form to fill in.
        <p role="note" className="rounded-xl border border-gold/40 bg-gold-soft px-4 py-3 text-sm text-gold-foreground" data-testid="lead-has-listing">
          {t("create.leadHasListing", { lead: fromLead.ref, ref: refCode(fromLead.listing.refNo) })}{" "}
          <Link href={`/admin/listings/${fromLead.listing.id}`} className="font-medium underline underline-offset-4 hover:no-underline">
            {t("users.openListing", { ref: refCode(fromLead.listing.refNo) })}
          </Link>
        </p>
      ) : (
        <>
          {fromLead && (
            <p role="note" className="rounded-xl border border-gold/40 bg-gold-soft px-4 py-3 text-sm text-gold-foreground">
              {t("create.fromLead", { ref: fromLead.ref })}
            </p>
          )}
          <StaffListingForm prefill={fromLead?.prefill} quarters={nextQuarters()} />
        </>
      )}
    </div>
  );
}

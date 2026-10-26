import type { Locale } from "@/i18n/config";
import type { Vars } from "@/i18n/define";
import type { Namespace } from "@/i18n/messages";
import { translator, type TKey } from "@/i18n/translator";
import { formatAED, formatDate } from "./format";

// In-app + email copy for every notification, in each supported language.
// {placeholders} are filled from the params passed to notify(), resolved in each recipient's language.

export type { Locale };

type Copy = { title: string; body?: string; cta: string };
type Template = { en: Copy; ar: Copy };

export const TEMPLATES = {
  "listing.submitted": {
    en: { title: "New listing to verify: {project}", body: "{seller} submitted {ref}. Check the SPA, Oqood and statement of account.", cta: "Review listing" },
    ar: { title: "إعلان جديد بانتظار التحقق: {project}", body: "قدّم {seller} الإعلان {ref}. راجِع اتفاقية البيع والشراء وشهادة أوقود وكشف الحساب.", cta: "مراجعة الإعلان" },
  },
  "listing.changed": {
    en: {
      title: "Listing changed, approve it again: {project}",
      body: "{seller} changed the asking price or description of {ref}. It is off the market until you update the DLD permit if needed and approve it again.",
      cta: "Review listing",
    },
    ar: {
      title: "تعديل على إعلان بانتظار إعادة الموافقة: {project}",
      body: "عدّل {seller} السعر المطلوب أو الوصف في الإعلان {ref}. الإعلان خارج السوق حتى تحدّث تصريح دائرة الأراضي والأملاك عند الحاجة وتوافق عليه مجدداً.",
      cta: "مراجعة الإعلان",
    },
  },
  "listing.approved": {
    en: { title: "Your listing is live: {project}", body: "We verified your documents. Buyers can now see {ref} and make offers.", cta: "View listing" },
    ar: { title: "إعلانك منشور الآن: {project}", body: "تحققنا من مستنداتك. يمكن للمشترين الآن مشاهدة {ref} وتقديم العروض.", cta: "عرض الإعلان" },
  },
  "listing.rejected": {
    en: { title: "Your listing needs attention: {project}", body: "{reason}", cta: "Open listing" },
    ar: { title: "إعلانك بحاجة إلى إجراء منك: {project}", body: "{reason}", cta: "فتح الإعلان" },
  },
  // Permit lifecycle, from the daily ops cron (src/lib/permits.ts). {document}, {when}, {then} and {reason} are
  // errors.ts "notify.doc.*", "notify.expiry.*" and "notify.paused.*" lines. Admins only:
  "listing.permit_expiring": {
    en: {
      title: "{document} expires {when}: {project}",
      body: "The {document} for {ref} expires {when}. Renew it and enter the new expiry date in the listing editor. {then}",
      cta: "Open listing",
    },
    ar: {
      title: "تنتهي صلاحية {document} {when}: {project}",
      body: "تنتهي صلاحية {document} للإعلان ⁨{ref}⁩ {when}. جدِّده وأدخِل تاريخ الانتهاء الجديد في صفحة تعديل الإعلان. {then}",
      cta: "فتح الإعلان",
    },
  },
  // A unit with an agreed deal whose permit or Form A ran out: not paused, the admins decide. {status} is its status.
  "listing.permit_lapsed": {
    en: {
      title: "{document} expired during a deal: {project}",
      body: "The {document} for {ref} expired on {date}. The listing is “{status}”, so it was not paused and the deal is unaffected, but it no longer shows as an advert on the site. Renew the {document} and enter the new expiry date, or decide what should happen to the listing.",
      cta: "Open listing",
    },
    ar: {
      title: "انتهت صلاحية {document} أثناء صفقة: {project}",
      body: "انتهت صلاحية {document} للإعلان ⁨{ref}⁩ في {date}. حالة الإعلان «{status}»، لذلك لم يُوقَف نشره ولم تتأثر الصفقة، لكنه لم يعد يظهر كإعلان على الموقع. جدِّد {document} وأدخِل تاريخ الانتهاء الجديد، أو قرِّر ما يلزم بشأن الإعلان.",
      cta: "فتح الإعلان",
    },
  },
  // The seller, when the cron takes their listing down:
  "listing.paused_permit": {
    en: { title: "Your listing is paused: {project}", body: "{reason}", cta: "Open listing" },
    ar: { title: "أُوقف نشر إعلانك مؤقتاً: {project}", body: "{reason}", cta: "فتح الإعلان" },
  },
  "offer.received": {
    en: { title: "New offer on {project}: {amount}", body: "A {financing} buyer offered {amount} for your equity (asking {asking}).", cta: "Review offer" },
    ar: { title: "عرض جديد على {project}: {amount}", body: "قدّم مشترٍ ({financing}) مبلغ {amount} مقابل حصتك (السعر المطلوب {asking}).", cta: "مراجعة العرض" },
  },
  "offer.received.admin": {
    en: { title: "New offer on {project}: {amount}", body: "{buyer} offered {amount} ({financing}). Asking {asking}.", cta: "Open listing" },
    ar: { title: "عرض جديد على {project}: {amount}", body: "قدّم {buyer} مبلغ {amount} ({financing}). السعر المطلوب {asking}.", cta: "فتح الإعلان" },
  },
  "offer.accepted": {
    en: { title: "Your offer on {project} was accepted", body: "The seller accepted {amount}. Our transactions team will contact you to start the developer NOC.", cta: "View my offers" },
    ar: { title: "تم قبول عرضك على {project}", body: "قبل البائع مبلغ {amount}. سيتواصل معك فريق المعاملات لبدء إجراءات شهادة عدم الممانعة من المطوّر.", cta: "عرض عروضي" },
  },
  "offer.declined": {
    en: { title: "Your offer on {project} was declined", body: "The seller declined {amount}. You can make a new offer while the unit is available.", cta: "View my offers" },
    ar: { title: "تم رفض عرضك على {project}", body: "رفض البائع مبلغ {amount}. يمكنك تقديم عرض جديد ما دامت الوحدة متاحة.", cta: "عرض عروضي" },
  },
  "offer.countered": {
    en: { title: "Counter-offer on {project}: {amount}", body: "The seller countered your offer of {original} with {amount}.", cta: "Respond" },
    ar: { title: "عرض مقابل على {project}: {amount}", body: "ردّ البائع على عرضك البالغ {original} بعرض مقابل قدره {amount}.", cta: "الرد" },
  },
  "offer.counter_accepted": {
    en: { title: "Buyer accepted your counter on {project}", body: "Agreed at {amount}. Our team will start the developer NOC.", cta: "Open listing" },
    ar: { title: "وافق المشتري على عرضك المقابل على {project}", body: "تم الاتفاق على {amount}. سيبدأ فريقنا إجراءات شهادة عدم الممانعة من المطوّر.", cta: "فتح الإعلان" },
  },
  "offer.counter_declined": {
    en: { title: "Buyer declined your counter on {project}", body: "Your counter of {amount} was declined.", cta: "Open listing" },
    ar: { title: "رفض المشتري عرضك المقابل على {project}", body: "تم رفض عرضك المقابل البالغ {amount}.", cta: "فتح الإعلان" },
  },
  "offer.withdrawn": {
    en: { title: "An offer on {project} was withdrawn", body: "The buyer withdrew their offer of {amount}.", cta: "Open listing" },
    ar: { title: "تم سحب عرض على {project}", body: "سحب المشتري عرضه البالغ {amount}.", cta: "فتح الإعلان" },
  },
  // The other bidders on a unit once the seller accepts an offer (see src/lib/offers.ts).
  "offer.backup": {
    en: {
      title: "Your offer on {project} is kept as a backup",
      body: "The seller accepted another buyer's offer. Your offer of {amount} stays on file as a backup: if that deal doesn't go ahead and the unit comes back on the market, your offer becomes active again. You can withdraw it at any time.",
      cta: "View my offers",
    },
    ar: {
      title: "عرضك على {project} محفوظ كعرض احتياطي",
      body: "قبل البائع عرض مشترٍ آخر. سيبقى عرضك البالغ {amount} محفوظاً كعرض احتياطي: إذا لم تكتمل تلك الصفقة وعادت الوحدة إلى السوق، يصبح عرضك نشطاً من جديد. يمكنك سحب عرضك في أي وقت.",
      cta: "عرض عروضي",
    },
  },
  "offer.backup_reopened": {
    en: { title: "{project} is back on the market", body: "The deal the seller had agreed didn't go ahead, so the unit is available once more and your backup offer of {amount} is active again.", cta: "View my offers" },
    ar: { title: "عادت الوحدة في {project} إلى السوق", body: "لم تكتمل الصفقة التي وافق عليها البائع، فعادت الوحدة متاحة وأصبح عرضك الاحتياطي البالغ {amount} نشطاً من جديد.", cta: "عرض عروضي" },
  },
  "offer.unit_sold": {
    en: { title: "Your offer on {project} was closed", body: "The seller agreed a sale with another buyer, so the unit is no longer available and your offer of {amount} was closed.", cta: "Browse deals" },
    ar: { title: "أُغلق عرضك على {project}", body: "اتفق البائع على البيع لمشترٍ آخر، لذلك لم تعد الوحدة متاحة وأُغلق عرضك البالغ {amount}.", cta: "تصفّح الصفقات" },
  },
  // The unit left the market without a sale (withdrawn, rejected or removed): its open offers are closed.
  "offer.unit_unavailable": {
    en: { title: "{project} is no longer available", body: "The unit is no longer available, so your offer of {amount} was closed.", cta: "Browse deals" },
    ar: { title: "لم تعد الوحدة في {project} متاحة", body: "لم تعد الوحدة متاحة، لذلك أُغلق عرضك البالغ {amount}.", cta: "تصفّح الصفقات" },
  },
  // The buyer whose offer was accepted, when the unit is put back on the market (the deal fell through).
  "offer.deal_cancelled": {
    en: {
      title: "The deal on {project} did not go ahead",
      body: "The deal agreed on your offer of {amount} did not go ahead, so your offer is now closed. The unit may be offered again, and you can make a new offer if it is.",
      cta: "View my offers",
    },
    ar: {
      title: "لم تكتمل الصفقة على {project}",
      body: "لم تكتمل الصفقة المتفق عليها بناءً على عرضك البالغ {amount}، لذلك أُغلق عرضك. قد تُعرض الوحدة للبيع مجدداً، وعندها يمكنك تقديم عرض جديد.",
      cta: "عرض عروضي",
    },
  },
  "deal.agreed.admin": {
    en: { title: "Deal agreed on {project} at {amount}", body: "Seller {seller}, buyer {buyer}. Start the developer NOC and move the listing to “NOC in progress”.", cta: "Open listing" },
    ar: { title: "تم الاتفاق على صفقة {project} بمبلغ {amount}", body: "البائع {seller}، المشتري {buyer}. ابدأ إجراءات شهادة عدم الممانعة وانقل الإعلان إلى «قيد إصدار شهادة عدم الممانعة».", cta: "فتح الإعلان" },
  },
  "deal.noc_in_progress": {
    en: { title: "NOC in progress for {project}", body: "We've applied to the developer for the NOC on {ref}. Next we'll book the DLD transfer at a trustee office and confirm the date with you.", cta: "View progress" },
    ar: { title: "بدء إجراءات شهادة عدم الممانعة لـ {project}", body: "تقدّمنا إلى المطوّر بطلب شهادة عدم الممانعة للإعلان {ref}. سنحجز بعدها موعد نقل الملكية لدى مكتب أمين التسجيل ونؤكد معك الموعد.", cta: "متابعة التقدّم" },
  },
  "deal.transferred": {
    en: { title: "Transfer complete: {project}", body: "The DLD transfer for {ref} is registered. Thank you for dealing with OffplanDistress.", cta: "View details" },
    ar: { title: "اكتمل نقل الملكية: {project}", body: "تم تسجيل نقل ملكية {ref} لدى دائرة الأراضي والأملاك. شكراً لتعاملك مع OffplanDistress.", cta: "عرض التفاصيل" },
  },
  "kyc.requested.admin": {
    en: { title: "Identity verification requested: {name}", body: "{name} ({email}) asked to verify their identity. Review their documents and update the KYC status.", cta: "Open users" },
    ar: { title: "طلب التحقق من الهوية: {name}", body: "طلب {name} ({email}) التحقق من هويته. راجِع المستندات وحدّث حالة التحقق من الهوية.", cta: "فتح المستخدمين" },
  },
  "kyc.verified": {
    en: { title: "Your identity is verified", body: "Our team has completed your KYC check. Your account now shows as verified.", cta: "View profile" },
    ar: { title: "تم التحقق من هويتك", body: "أكمل فريقنا التحقق من هويتك، ويظهر حسابك الآن كحساب موثّق.", cta: "عرض الملف الشخصي" },
  },
  "inquiry.received": {
    en: { title: "New {kind} from {name}", body: "{contact}\n{message}", cta: "Open inquiries" },
    ar: { title: "{kind} جديد من {name}", body: "{contact}\n{message}", cta: "فتح الاستفسارات" },
  },
  // Admins only: the free seller estimate (src/app/actions/leads.ts). {urgent}, {missed}, {notice} and {handover} are
  // sell.ts "estimate.notify.*" words; {urgent} is empty unless there is a default notice or more than one missed instalment.
  "lead.seller": {
    en: {
      title: "{urgent}New seller lead {ref}: {project}",
      body: "{name} · {phone}\nSPA price {price}, paid {paid} ({pct}). Handover {handover}.\n{missed} {notice}\nEstimate shown: {low} to {high}.",
      cta: "Open seller leads",
    },
    ar: {
      title: "{urgent}طلب جديد من بائع ⁨{ref}⁩: {project}",
      body: "{name} · ⁦{phone}⁩\nالسعر في الاتفاقية {price}، والمدفوع {paid} (⁨{pct}⁩). التسليم {handover}.\n{missed} {notice}\nالتقدير المعروض: من {low} إلى {high}.",
      cta: "فتح طلبات البائعين",
    },
  },
  "watch.price_drop": {
    en: { title: "Price drop on {project}", body: "The asking price fell from {from} to {to}.", cta: "View deal" },
    ar: { title: "انخفاض سعر {project}", body: "انخفض السعر المطلوب من {from} إلى {to}.", cta: "عرض الصفقة" },
  },
  "search.matches": {
    en: { title: "New deals for “{name}”: {count}", body: "{list}", cta: "See matches" },
    ar: { title: "صفقات جديدة تطابق «{name}»: {count}", body: "{list}", cta: "عرض النتائج" },
  },
  "password.reset": {
    en: { title: "Reset your password", body: "Someone asked to reset the password for this account. The link works for 1 hour. If it wasn't you, ignore this email.", cta: "Choose a new password" },
    ar: { title: "إعادة تعيين كلمة المرور", body: "طلب أحدهم إعادة تعيين كلمة المرور لهذا الحساب. الرابط صالح لمدة ساعة واحدة. إن لم تطلب ذلك، فتجاهل هذه الرسالة.", cta: "اختيار كلمة مرور جديدة" },
  },
  // Admins only. {reason} is one of the errors.ts "notify.cron.*" lines (see src/lib/cron.ts).
  "ops.cron_failed": {
    en: { title: "Scheduled job failed: {job}", body: "{reason}\nDetails are in the Vercel function logs for /api/cron/{job}.", cta: "Open admin" },
    // ‎ keeps the left-to-right path from flipping inside Arabic text.
    ar: { title: "تعذّر تنفيذ مهمة مجدولة: {job}", body: "{reason}\nتجد التفاصيل في سجلات الدوال على Vercel للمسار ‎/api/cron/{job}.", cta: "فتح لوحة الإدارة" },
  },
} satisfies Record<string, Template>;

export type TemplateKey = keyof typeof TEMPLATES;

/** A word from a message namespace, translated for each recipient: { t: "errors", key: "notify.financing.cash" }. */
export type TermParam = { [N in Namespace]: { t: N; key: TKey<N>; vars?: Vars } }[Namespace];

/**
 * One {placeholder} value. Plain strings/numbers are used as-is; { aed } is formatted as money, { date: "2026-11-02" }
 * as a date and { t, key } is translated — all in the recipient's language.
 */
export type TemplateParam =
  | string
  | number
  | null
  | undefined
  | { aed: number | null | undefined }
  | { date: string | null | undefined }
  | TermParam;
export type TemplateParams = Record<string, TemplateParam>;

export function resolveParam(p: TemplateParam, locale: Locale): string {
  if (p == null) return "";
  if (typeof p === "string" || typeof p === "number") return String(p);
  if ("aed" in p) return formatAED(p.aed, locale);
  if ("date" in p) return formatDate(p.date, locale);
  return (translator(p.t, locale) as (key: string, vars?: Vars) => string)(p.key, p.vars);
}

export function renderTemplate(key: TemplateKey, locale: Locale, params: TemplateParams = {}) {
  const copy: Copy = TEMPLATES[key][locale] ?? TEMPLATES[key].en;
  const values: Record<string, string> = {};
  for (const [k, v] of Object.entries(params)) values[k] = resolveParam(v, locale);
  const fill = (s: string) => s.replace(/\{(\w+)\}/g, (_, k: string) => values[k] ?? "");
  return { title: fill(copy.title), body: copy.body ? fill(copy.body).trim() || null : null, cta: copy.cta };
}

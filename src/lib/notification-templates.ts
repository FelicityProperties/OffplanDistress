// In-app + email copy for every notification, in each supported language.
// {placeholders} are filled from the params passed to notify().

type Copy = { title: string; body?: string; cta: string };
type Template = { en: Copy; ar: Copy };

export const TEMPLATES = {
  "listing.submitted": {
    en: { title: "New listing to verify: {project}", body: "{seller} submitted {ref}. Check the SPA, Oqood and statement of account.", cta: "Review listing" },
    ar: { title: "إعلان جديد بانتظار التحقق: {project}", body: "قدّم {seller} الإعلان {ref}. راجِع اتفاقية البيع والشراء وشهادة أوقود وكشف الحساب.", cta: "مراجعة الإعلان" },
  },
  "listing.approved": {
    en: { title: "Your listing is live: {project}", body: "We verified your documents. Buyers can now see {ref} and make offers.", cta: "View listing" },
    ar: { title: "إعلانك منشور الآن: {project}", body: "تحققنا من مستنداتك. يمكن للمشترين الآن مشاهدة {ref} وتقديم العروض.", cta: "عرض الإعلان" },
  },
  "listing.rejected": {
    en: { title: "Your listing needs attention: {project}", body: "{reason}", cta: "Open listing" },
    ar: { title: "إعلانك بحاجة إلى مراجعة: {project}", body: "{reason}", cta: "فتح الإعلان" },
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
    en: { title: "Your offer on {project} was declined", body: "The seller declined {amount}. You can make a new offer while the unit is available.", cta: "View deal" },
    ar: { title: "تم رفض عرضك على {project}", body: "رفض البائع مبلغ {amount}. يمكنك تقديم عرض جديد ما دامت الوحدة متاحة.", cta: "عرض الصفقة" },
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
  "deal.agreed.admin": {
    en: { title: "Deal agreed on {project} at {amount}", body: "Seller {seller}, buyer {buyer}. Start the developer NOC and move the listing to “NOC in progress”.", cta: "Open listing" },
    ar: { title: "تم الاتفاق على صفقة {project} بمبلغ {amount}", body: "البائع {seller}، المشتري {buyer}. ابدأ إجراءات شهادة عدم الممانعة وانقل الإعلان إلى «قيد إصدار عدم الممانعة».", cta: "فتح الإعلان" },
  },
  "inquiry.received": {
    en: { title: "New {kind} from {name}", body: "{contact}\n{message}", cta: "Open inquiries" },
    ar: { title: "{kind} جديد من {name}", body: "{contact}\n{message}", cta: "فتح الاستفسارات" },
  },
  "watch.price_drop": {
    en: { title: "Price drop on {project}", body: "The asking price fell from {from} to {to}.", cta: "View deal" },
    ar: { title: "انخفاض السعر على {project}", body: "انخفض السعر المطلوب من {from} إلى {to}.", cta: "عرض الصفقة" },
  },
  "search.matches": {
    en: { title: "{count} new deals match “{name}”", body: "{list}", cta: "See matches" },
    ar: { title: "{count} صفقات جديدة تطابق «{name}»", body: "{list}", cta: "عرض النتائج" },
  },
  "password.reset": {
    en: { title: "Reset your password", body: "Someone asked to reset the password for this account. The link works for 1 hour. If it wasn't you, ignore this email.", cta: "Choose a new password" },
    ar: { title: "إعادة تعيين كلمة المرور", body: "طلب أحدهم إعادة تعيين كلمة المرور لهذا الحساب. الرابط صالح لمدة ساعة واحدة. إن لم تكن أنت، تجاهل هذه الرسالة.", cta: "اختيار كلمة مرور جديدة" },
  },
} satisfies Record<string, Template>;

export type TemplateKey = keyof typeof TEMPLATES;
export type Locale = "en" | "ar";

export function renderTemplate(key: TemplateKey, locale: Locale, params: Record<string, string | number>) {
  const copy: Copy = TEMPLATES[key][locale] ?? TEMPLATES[key].en;
  const fill = (s: string) => s.replace(/\{(\w+)\}/g, (_, k: string) => (params[k] != null ? String(params[k]) : ""));
  return { title: fill(copy.title), body: copy.body ? fill(copy.body).trim() || null : null, cta: copy.cta };
}

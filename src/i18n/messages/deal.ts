import { defineMessages } from "../define";

// Deal detail page (/deals/[ref]) and the offer dialog. Unit types, statuses, communities and other
// shared words come from "common".
export default defineMessages({
  en: {
    "meta.unavailable": "Deal unavailable",
    "meta.title": "{unit} in {project}",
    "meta.titleDiscount": "{unit} in {project} — {pct}% below launch",
    "meta.description":
      "{developer}, {community}. {paid} paid, handover {handover}. Take over the payment plan for {upfront} upfront.",

    back: "Back to deals",
    "banner.underOffer": "The seller has accepted an offer on this unit. You can still save it or send a backup offer.",
    "banner.private": "Only you can see this page — the listing is currently “{status}”.",

    "badge.verified": "SPA & payment history verified",
    "badge.nocEligible": "NOC eligible",

    "watchers.one": "{n} person watching",
    "watchers.many": "{n} people watching",
    ref: "Ref",

    "facts.view": "View",
    "facts.originalPrice": "Original price",
    "facts.launchPrice": "Launch price today",
    "facts.beingAssessed": "Being assessed",

    "plan.title": "Payment plan",
    "plan.paid": "Paid to developer",
    "plan.remaining": "Remaining",
    "plan.paidPct": "{pct} paid",
    "plan.nextWithAmount": "Next instalment {amount} on {date}",
    "plan.nextOn": "Next instalment on {date}",
    "plan.milestone": "Milestone",
    "plan.due": "Due",
    "plan.amount": "Amount",
    "plan.sample.milestone": "Construction milestone {n}",
    "plan.sample.onHandover": "On handover",
    "sample.description":
      "Sample listing for illustration. {unit} in {project} by {developer}, {community}, with {paid} of the purchase price already paid to the developer. A buyer can step into the remaining payment plan below today's launch price.",

    "cost.title": "True cost to you",
    "cost.asking": "Asking price (seller equity)",
    "cost.remaining": "Remaining balance to developer",
    "cost.fee": "{brand} fee ({rate})",
    "cost.vat": "VAT on fee ({rate})",
    "cost.dld": "DLD transfer fee ({rate})",
    "cost.dldAdmin": "DLD registration & trustee fees (est.)",
    "cost.noc": "Developer NOC / admin (est.)",
    "cost.total": "Total all-in",
    "cost.launchAllIn": "Buying new from the developer today (incl. {rate} DLD)",
    "cost.saving": "Your net saving",
    "cost.disclaimer": "DLD and developer fees are estimates and are confirmed when the NOC is issued.",

    "side.payNow": "Pay seller now",
    "side.thenPlan": "then {amount} to {developer} per plan",
    "side.nextInstalment": "Next instalment {date}",
    "side.feeNote": "2% + VAT, charged only on successful transfer. We handle the NOC, assignment and DLD paperwork.",

    similar: "Similar deals",

    "offer.ownListing": "This is your listing",
    "offer.sampleListing": "Sample listing",
    "offer.signIn": "Sign in to make an offer",
    "offer.cta": "Make an offer",
    "offer.title": "Make an offer",
    "offer.description": "{project} · Asking {amount} for the seller's equity",
    "offer.amount": "Your offer to the seller (AED)",
    "offer.amountHint": "You'll also take over the remaining payment plan.",
    "offer.financing": "Financing",
    "offer.mortgage": "Mortgage at handover",
    "offer.message": "Message to seller (optional)",
    "offer.placeholder": "I can complete within 3 weeks…",
    "offer.submit": "Submit offer",
    "offer.sent": "Offer sent",
    "offer.sentDescription": "We'll present it to the seller and update you in your dashboard.",
    "offer.legal": "By sending an offer you agree to our {terms}. Offers aren't binding until Form F / MOU is signed.",
    "offer.legal.terms": "Terms of Use",
  },
  ar: {
    "meta.unavailable": "الصفقة غير متاحة",
    "meta.title": "{unit} في {project}",
    "meta.titleDiscount": "{unit} في {project} — أقل بـ {pct}% من سعر الإطلاق",
    "meta.description":
      "{developer}، {community}. نسبة المدفوع {paid}، والتسليم {handover}. تولَّ خطة الدفع مقابل دفعة مقدّمة قدرها {upfront}.",

    back: "العودة إلى الصفقات",
    "banner.underOffer": "قبل البائع عرضاً على هذه الوحدة. لا يزال بإمكانك حفظها أو إرسال عرض احتياطي.",
    "banner.private": "هذه الصفحة مرئية لك فقط — حالة الإعلان حالياً «{status}».",

    "badge.verified": "اتفاقية البيع والشراء وسجل الدفعات موثّقان",
    "badge.nocEligible": "مؤهّلة لشهادة عدم الممانعة",

    "watchers.one": "عدد المتابعين: {n}",
    "watchers.many": "عدد المتابعين: {n}",
    ref: "المرجع",

    "facts.view": "الإطلالة",
    "facts.originalPrice": "السعر الأصلي",
    "facts.launchPrice": "سعر الإطلاق الحالي",
    "facts.beingAssessed": "قيد التقييم",

    "plan.title": "خطة الدفع",
    "plan.paid": "المدفوع للمطوّر",
    "plan.remaining": "المتبقي",
    "plan.paidPct": "نسبة المدفوع {pct}",
    "plan.nextWithAmount": "القسط التالي بقيمة {amount} بتاريخ {date}",
    "plan.nextOn": "القسط التالي بتاريخ {date}",
    "plan.milestone": "المرحلة",
    "plan.due": "تاريخ الاستحقاق",
    "plan.amount": "المبلغ",
    "plan.sample.milestone": "دفعة أثناء الإنشاء {n}",
    "plan.sample.onHandover": "عند التسليم",
    "sample.description":
      "إعلان توضيحي فقط. وحدة ({unit}) في {project} من تطوير {developer}، {community}، وقد سُدِّد {paid} من سعر الشراء للمطوّر. يمكن للمشتري تولّي ما تبقّى من خطة الدفع بأقل من سعر الإطلاق الحالي.",

    "cost.title": "التكلفة الفعلية عليك",
    "cost.asking": "السعر المطلوب (حصة البائع)",
    "cost.remaining": "الرصيد المتبقي للمطوّر",
    "cost.fee": "رسوم {brand} ({rate})",
    "cost.vat": "ضريبة القيمة المضافة على الرسوم ({rate})",
    "cost.dld": "رسوم نقل الملكية لدى دائرة الأراضي والأملاك ({rate})",
    "cost.dldAdmin": "رسوم التسجيل لدى دائرة الأراضي والأملاك ومكتب أمين التسجيل (تقديرية)",
    "cost.noc": "شهادة عدم الممانعة / الرسوم الإدارية للمطوّر (تقديرية)",
    "cost.total": "الإجمالي شاملاً جميع الرسوم",
    "cost.launchAllIn": "الشراء جديداً من المطوّر اليوم (شاملاً {rate} لدائرة الأراضي والأملاك)",
    "cost.saving": "صافي التوفير لك",
    "cost.disclaimer": "رسوم دائرة الأراضي والأملاك والمطوّر تقديرية، وتُؤكَّد عند إصدار شهادة عدم الممانعة.",

    "side.payNow": "تدفع للبائع الآن",
    "side.thenPlan": "ثم {amount} إلى {developer} وفق خطة الدفع",
    "side.nextInstalment": "القسط التالي {date}",
    "side.feeNote":
      "2% + ضريبة القيمة المضافة، تُستحق فقط عند إتمام نقل الملكية. نتولى إجراءات شهادة عدم الممانعة والتنازل ودائرة الأراضي والأملاك.",

    similar: "صفقات مشابهة",

    "offer.ownListing": "هذا إعلانك",
    "offer.sampleListing": "إعلان توضيحي",
    "offer.signIn": "سجّل الدخول لتقديم عرض",
    "offer.cta": "قدّم عرضاً",
    "offer.title": "قدّم عرضاً",
    "offer.description": "{project} · السعر المطلوب {amount} مقابل حصة البائع",
    "offer.amount": "عرضك للبائع (درهم)",
    "offer.amountHint": "ستتولى أيضاً سداد المتبقي من خطة الدفع.",
    "offer.financing": "التمويل",
    "offer.mortgage": "تمويل عقاري عند التسليم",
    "offer.message": "رسالة إلى البائع (اختياري)",
    "offer.placeholder": "يمكنني إتمام الصفقة خلال 3 أسابيع…",
    "offer.submit": "إرسال العرض",
    "offer.sent": "تم إرسال العرض",
    "offer.sentDescription": "سنعرضه على البائع ونطلعك على المستجدات في لوحة التحكم.",
    "offer.legal": "بإرسالك العرض، فإنك توافق على {terms}. ولا تكون العروض ملزمة إلا بعد توقيع النموذج (F) / مذكرة التفاهم.",
    "offer.legal.terms": "شروط الاستخدام",
  },
});

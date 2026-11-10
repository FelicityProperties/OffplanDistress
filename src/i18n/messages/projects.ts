import { defineMessages } from "../define";

// Project pages: /projects (every project with an available resale unit) and /projects/<slug> (its units, how buying a
// resale there works, the FAQ), the link from a deal page to its project, and the footer link. Fee rates arrive formatted
// from FEES ({commission}, {vat}, {dld}); the fee is due when the transfer completes, never worded as "only" then.
// "Below the original price": the sale value (asking price + balance still owed to the developer) under the SPA price.
// "Available": status live; a unit under offer is listed apart and never counted. Variants: "Paid" when every unit
// listed is fully paid (nothing left to pay the developer), "Ready" when every one is handed over (a title deed, not an
// Oqood), "Mixed" when only some are. The Chinese spaces a placeholder as for a Latin name; projectsT
// (src/lib/projects.ts) drops that space when the placeholder holds Chinese ("开发商").
export default defineMessages({
  en: {
    projects: "Projects",
    // In a sentence, for a project with several developers (or one not stated).
    theDeveloper: "the developer",
    // A handover range: "Q4 2027 – Q2 2028", "Ready – Q2 2028".
    range: "{from} – {to}",
    // The page's title and H1. "Below": at least one of its available units is 1% or more below the original price.
    titleBelow: "{project} resale: units below the original price",
    titleNeutral: "{project} resale: off-plan units for sale",
    // Neutral, when one of its units is already handed over.
    titleNeutralReady: "{project} resale: units for sale",

    "meta.units.one": "{count} resale unit available in {project}.",
    "meta.units.many": "{count} resale units available in {project}.",
    "meta.byIn": "By {developer} in {community}.",
    "meta.by": "By {developer}.",
    "meta.in": "In {community}.",
    "meta.handover": "Handover {handover}.",
    "meta.upTo": "Up to {pct}% below the original price.",

    breadcrumb: "Breadcrumb",
    intro:
      "Owners in {project} are reselling these off-plan units. You pay the seller their asking price and take over the rest of the payment plan; each card shows the cash you need on transfer day.",
    introMixed:
      "Owners in {project} are reselling these units. You pay the seller their asking price and take over whatever remains of the payment plan; each card shows the cash you need on transfer day.",
    introPaid:
      "Owners in {project} are reselling these fully paid units. You pay the seller their asking price, with nothing left to pay the developer; each card shows the cash you need on transfer day.",
    "facts.developer": "Developer",
    "facts.community": "Community",
    "facts.handover": "Handover",
    "facts.units": "Available units",
    // Under the count, when some of its units have an accepted offer.
    "facts.reserved": "+{count} under offer",
    "facts.belowOriginal": "Below the original price",
    "facts.upTo": "Up to {pct}%",

    "deals.title": "Resale units in {project}",
    "deals.reservedTitle": "Under offer ({count})",
    "deals.reservedNote":
      "The seller has accepted an offer on each of these units. You can still save one or send a backup offer, in case the sale falls through.",

    "how.title": "How buying a resale in {project} works",
    "how.sub": "Our RERA-licensed transactions team handles each step with you.",
    "how.plan.title": "Take over the payment plan",
    "how.plan.body":
      "You pay the seller their asking price for their equity, what they have paid the developer so far (many ask less than that), and continue the remaining instalments to {developer} on the original plan. The sale value is the asking price plus the balance still owed to the developer.",
    // Added when some of the units listed, not all, are fully paid.
    "how.plan.mixed": "A fully paid unit has no instalments left: its sale value is the asking price.",
    "how.paid.title": "Pay the seller's asking price",
    "how.paid.body":
      "Every unit listed here is fully paid, so nothing is left to pay {developer}: you pay the seller their asking price, which is also the sale value.",
    "how.noc.title": "Developer NOC",
    "how.noc.body":
      "Before the transfer, {developer} issues a No Objection Certificate (NOC). Most developers require a minimum share of the price to be paid first, often 30–50%. We check this for each unit and apply for the NOC for you; the developer sets its own NOC and admin fee.",
    "how.noc.bodyPaid":
      "Before the transfer, {developer} issues a No Objection Certificate (NOC). We apply for it for you; the developer sets its own NOC and admin fee.",
    "how.transfer.title": "DLD transfer",
    "how.transfer.body":
      "Settlement takes place at a DLD trustee office: the seller's asking price is paid by manager's cheque at the moment ownership moves to you, never before the NOC. You pay the DLD transfer fee of {dld} of the sale value plus registration and trustee office fees, and DLD issues a new Oqood in your name.",
    "how.transfer.bodyMixed":
      "Settlement takes place at a DLD trustee office: the seller's asking price is paid by manager's cheque at the moment ownership moves to you, never before the NOC. You pay the DLD transfer fee of {dld} of the sale value plus registration and trustee office fees, and DLD issues a new Oqood in your name, or a new title deed for a ready unit.",
    "how.transfer.bodyReady":
      "Settlement takes place at a DLD trustee office: the seller's asking price is paid by manager's cheque at the moment ownership moves to you, never before the NOC. You pay the DLD transfer fee of {dld} of the sale value plus registration and trustee office fees, and DLD issues a new title deed in your name.",
    "how.fee.title": "Our fee: {commission} + VAT, on completion",
    "how.fee.body":
      "{commission} of the sale value plus {vat} VAT on the fee, paid by you when the transfer completes. Nothing upfront, and no fee if the transfer doesn't complete.",
    // When the seller pays our fee (FEES.payer).
    "how.fee.bodySeller":
      "The seller pays our {commission} of the sale value plus {vat} VAT on the fee when the transfer completes. You pay us nothing, upfront or later.",

    // The FAQ: the same text on the page and in its FAQPage structured data. Each question names the project, and each
    // answer ends with the project's own figures, from its available units (the cards' amounts).
    "faq.title": "Questions about buying a resale in {project}",
    "faq.cash.q": "How much cash do I need on transfer day for a unit in {project}?",
    "faq.cash.a":
      "The cash needed on transfer day covers the seller's asking price, our {commission} fee plus VAT, the DLD transfer fee of {dld} of the sale value, the DLD registration and trustee office fees and the NOC fee charged by {developer}, plus any overdue instalments and late fees, which the developer wants cleared before it issues the NOC. Each deal page shows its own estimate.",
    "faq.cash.aSeller":
      "The cash needed on transfer day covers the seller's asking price, the DLD transfer fee of {dld} of the sale value, the DLD registration and trustee office fees and the NOC fee charged by {developer}, plus any overdue instalments and late fees, which the developer wants cleared before it issues the NOC. Each deal page shows its own estimate.",
    "faq.cash.one": "For the unit available in {project}, it comes to about {amount}.",
    "faq.cash.each": "For each of the {count} units available in {project}, it comes to about {amount}.",
    "faq.cash.many": "For the {count} units available in {project}, it ranges from about {min} to {max}.",
    "faq.plan.q": "What does taking over the payment plan in {project} mean?",
    "faq.plan.a":
      "You take the seller's place in their contract with {developer}: you pay them their asking price for the equity they have paid in, and the remaining instalments continue to the developer on the original schedule, now in your name.",
    "faq.paid.q": "Is anything left to pay the developer in {project}?",
    "faq.paid.a":
      "No. Every unit listed in {project} is fully paid: you pay the seller their asking price and take on no payment plan with {developer}.",
    "faq.time.q": "How long do the NOC and the transfer take in {project}?",
    "faq.time.a":
      "Typically 2–5 weeks from an accepted offer to the new Oqood in your name, depending on how quickly {developer} issues the NOC.",
    "faq.time.aMixed":
      "Typically 2–5 weeks from an accepted offer to the new Oqood, or title deed for a ready unit, in your name, depending on how quickly {developer} issues the NOC.",
    "faq.time.aReady":
      "Typically 2–5 weeks from an accepted offer to the new title deed in your name, depending on how quickly {developer} issues the NOC.",
    "faq.fee.q": "What is your fee on a resale in {project}?",
    "faq.fee.a":
      "{commission} of the sale value plus {vat} VAT on the fee, paid by the buyer when the transfer completes. Nothing is paid to us upfront, and there is no fee if the transfer doesn't complete.",
    "faq.fee.aSeller":
      "Buyers pay us nothing: the seller pays our {commission} of the sale value plus {vat} VAT on the fee when the transfer completes.",
    "faq.fee.one": "For the unit available in {project}, that is about {amount} including VAT.",
    "faq.fee.each": "For each of the {count} units available in {project}, that is about {amount} including VAT.",
    "faq.fee.many": "For the {count} units available in {project}, it ranges from about {min} to {max} including VAT.",
    "faq.below.q": "What does “below the original price” mean in {project}?",
    "faq.below.a":
      "It compares the sale value, which is the seller's asking price plus the balance still owed to the developer, with the price the first buyer signed with the developer in the SPA. The percentage on each card is how much lower the sale value is.",
    "faq.below.one": "The unit available in {project} is {pct}% below it.",
    "faq.below.oneNone": "The unit available in {project} is not 1% or more below it at the moment.",
    "faq.below.manyOne": "In {project}, one of the {count} units available is below it, by {pct}%.",
    "faq.below.many": "In {project}, {below} of the {count} units available are below it, by up to {pct}%.",
    "faq.below.all": "Every unit available in {project} is below it, by up to {pct}%.",
    "faq.below.manyNone": "None of the {count} units available in {project} is 1% or more below it at the moment.",

    "cta.title": "Looking for another unit?",
    "cta.body": "Browse every off-plan resale on {brand}, or see the other projects with units for sale.",
    "cta.allProjects": "All projects",

    // On a deal page, under its title: the project's page. The count stays with the name's last word (no-break space).
    dealLink: "All resale units in {project}",
    dealLinkCount: " ({n} available)",

    "index.meta.title": "Dubai off-plan projects with resale deals",
    "index.meta.description":
      "Every Dubai off-plan project with resale units on {brand}: developer, community, handover and how far below the original price the units are offered.",
    "index.eyebrow": "Off-plan resale",
    "index.title": "Projects with resale deals",
    "index.subtitle":
      "Dubai off-plan projects where owners are reselling units, often below the original price. Pick a project to see its units and how buying a resale there works.",
    "index.count.one": "{count} project",
    "index.count.many": "{count} projects",
    "index.empty": "No project has a resale unit listed right now. New deals are posted every week.",
    "index.filter.label": "Find a project",
    "index.filter.placeholder": "Project, developer or community",
    "index.filter.none": "No project matches “{q}”.",
    "card.units.one": "{n} unit available",
    "card.units.many": "{n} units available",
    "card.reserved": "+{n} under offer",
    "card.upTo": "Up to {pct}% below the original price",
    "card.handover": "Handover {when}",
    "card.cta": "See the units",
  },
  ar: {
    projects: "المشاريع",
    theDeveloper: "المطوّر",
    range: "⁨{from}⁩ – ⁨{to}⁩",
    titleBelow: "⁨{project}⁩ لإعادة البيع: وحدات بأقل من السعر الأصلي",
    titleNeutral: "⁨{project}⁩ لإعادة البيع: وحدات على الخارطة معروضة للبيع",
    titleNeutralReady: "⁨{project}⁩ لإعادة البيع: وحدات معروضة للبيع",

    "meta.units.one": "وحدة واحدة متاحة لإعادة البيع في ⁨{project}⁩.",
    "meta.units.many": "عدد وحدات إعادة البيع المتاحة في ⁨{project}⁩: ⁨{count}⁩.",
    "meta.byIn": "من تطوير ⁨{developer}⁩ في ⁨{community}⁩.",
    "meta.by": "من تطوير ⁨{developer}⁩.",
    "meta.in": "في ⁨{community}⁩.",
    "meta.handover": "التسليم: {handover}.",
    "meta.upTo": "بأقل من السعر الأصلي بنسبة تصل إلى ⁨{pct}%⁩.",

    breadcrumb: "مسار التنقل",
    intro:
      "يعيد ملاك في ⁨{project}⁩ بيع هذه الوحدات على الخارطة. تدفع للبائع السعر الذي يطلبه وتتولى ما تبقى من خطة الدفع، وتعرض كل بطاقة المبلغ النقدي الذي تحتاجه يوم نقل الملكية.",
    introMixed:
      "يعيد ملاك في ⁨{project}⁩ بيع هذه الوحدات. تدفع للبائع السعر الذي يطلبه وتتولى ما قد يتبقى من خطة الدفع، وتعرض كل بطاقة المبلغ النقدي الذي تحتاجه يوم نقل الملكية.",
    introPaid:
      "يعيد ملاك في ⁨{project}⁩ بيع هذه الوحدات المسدّدة بالكامل. تدفع للبائع السعر الذي يطلبه، ولا يتبقى شيء تدفعه للمطوّر، وتعرض كل بطاقة المبلغ النقدي الذي تحتاجه يوم نقل الملكية.",
    "facts.developer": "المطوّر",
    "facts.community": "المنطقة",
    "facts.handover": "التسليم",
    "facts.units": "الوحدات المتاحة",
    "facts.reserved": "إضافةً إلى ⁨{count}⁩ عليها عرض مقبول",
    "facts.belowOriginal": "أقل من السعر الأصلي",
    "facts.upTo": "حتى ⁨{pct}%⁩",

    "deals.title": "وحدات إعادة البيع في ⁨{project}⁩",
    "deals.reservedTitle": "عليها عرض مقبول (⁨{count}⁩)",
    "deals.reservedNote":
      "قبل البائع عرضاً على كل وحدة من هذه الوحدات. لا يزال بإمكانك حفظ أي منها أو إرسال عرض احتياطي تحسّباً لتعثّر البيع.",

    "how.title": "كيف تشتري وحدة لإعادة البيع في ⁨{project}⁩",
    "how.sub": "يتولى فريق المعاملات لدينا، المرخّص من ريرا، كل خطوة معك.",
    "how.plan.title": "تولّي خطة الدفع",
    "how.plan.body":
      "تدفع للبائع السعر الذي يطلبه مقابل حصته في الوحدة، أي ما سدّده للمطوّر حتى الآن (ويطلب كثير من البائعين أقل من ذلك)، وتواصل سداد الأقساط المتبقية إلى ⁨{developer}⁩ وفق الخطة الأصلية. وقيمة البيع هي السعر المطلوب مضافاً إليه الرصيد المتبقي المستحق للمطوّر.",
    "how.plan.mixed": "أما الوحدة المسدّدة بالكامل فلا أقساط متبقية عليها، وقيمة بيعها هي السعر المطلوب.",
    "how.paid.title": "ادفع السعر الذي يطلبه البائع",
    "how.paid.body":
      "كل الوحدات المعروضة هنا مسدّدة بالكامل، فلا يتبقى شيء تدفعه إلى ⁨{developer}⁩: تدفع للبائع السعر الذي يطلبه، وهو أيضاً قيمة البيع.",
    "how.noc.title": "شهادة عدم الممانعة من المطوّر",
    "how.noc.body":
      "قبل نقل الملكية، يُصدر ⁨{developer}⁩ شهادة عدم الممانعة. ويشترط معظم المطوّرين سداد حد أدنى من السعر أولاً، يتراوح غالباً بين 30% و50%. نتحقق من ذلك لكل وحدة ونتقدّم بطلب الشهادة نيابةً عنك، ويحدد المطوّر رسوم الشهادة ورسومه الإدارية.",
    "how.noc.bodyPaid":
      "قبل نقل الملكية، يُصدر ⁨{developer}⁩ شهادة عدم الممانعة. نتقدّم بطلب الشهادة نيابةً عنك، ويحدد المطوّر رسوم الشهادة ورسومه الإدارية.",
    "how.transfer.title": "نقل الملكية لدى دائرة الأراضي والأملاك",
    "how.transfer.body":
      "تتم التسوية في مكتب أمين التسجيل التابع لدائرة الأراضي والأملاك: يُدفع السعر الذي يطلبه البائع بشيك مدير في لحظة انتقال الملكية إليك، ولا يحدث ذلك أبداً قبل صدور شهادة عدم الممانعة. وتدفع رسوم نقل الملكية بنسبة ⁨{dld}⁩ من قيمة البيع إضافةً إلى رسوم التسجيل ومكتب أمين التسجيل، ثم تُصدر الدائرة شهادة أوقود جديدة باسمك.",
    "how.transfer.bodyMixed":
      "تتم التسوية في مكتب أمين التسجيل التابع لدائرة الأراضي والأملاك: يُدفع السعر الذي يطلبه البائع بشيك مدير في لحظة انتقال الملكية إليك، ولا يحدث ذلك أبداً قبل صدور شهادة عدم الممانعة. وتدفع رسوم نقل الملكية بنسبة ⁨{dld}⁩ من قيمة البيع إضافةً إلى رسوم التسجيل ومكتب أمين التسجيل، ثم تُصدر الدائرة شهادة أوقود جديدة باسمك، أو سند ملكية جديداً إذا كانت الوحدة جاهزة.",
    "how.transfer.bodyReady":
      "تتم التسوية في مكتب أمين التسجيل التابع لدائرة الأراضي والأملاك: يُدفع السعر الذي يطلبه البائع بشيك مدير في لحظة انتقال الملكية إليك، ولا يحدث ذلك أبداً قبل صدور شهادة عدم الممانعة. وتدفع رسوم نقل الملكية بنسبة ⁨{dld}⁩ من قيمة البيع إضافةً إلى رسوم التسجيل ومكتب أمين التسجيل، ثم تُصدر الدائرة سند ملكية جديداً باسمك.",
    "how.fee.title": "رسومنا: ⁨{commission}⁩ مع ضريبة القيمة المضافة، عند الإتمام",
    "how.fee.body":
      "⁨{commission}⁩ من قيمة البيع مضافاً إليها ضريبة القيمة المضافة بنسبة ⁨{vat}⁩ على الرسوم، تدفعها عند إتمام نقل الملكية. لا شيء مقدّماً، ولا رسوم إذا لم يكتمل نقل الملكية.",
    "how.fee.bodySeller":
      "يدفع البائع رسومنا البالغة ⁨{commission}⁩ من قيمة البيع مضافاً إليها ضريبة القيمة المضافة بنسبة ⁨{vat}⁩ على الرسوم عند إتمام نقل الملكية. ولا تدفع لنا شيئاً، لا مقدّماً ولا لاحقاً.",

    "faq.title": "أسئلة حول شراء وحدة لإعادة البيع في ⁨{project}⁩",
    "faq.cash.q": "ما المبلغ النقدي الذي أحتاجه يوم نقل الملكية لوحدة في ⁨{project}⁩؟",
    "faq.cash.a":
      "يشمل المبلغ النقدي اللازم يوم نقل الملكية السعرَ الذي يطلبه البائع، ورسومنا البالغة ⁨{commission}⁩ مع ضريبة القيمة المضافة، ورسوم نقل الملكية لدى دائرة الأراضي والأملاك بنسبة ⁨{dld}⁩ من قيمة البيع، ورسوم التسجيل ومكتب أمين التسجيل، ورسوم شهادة عدم الممانعة لدى ⁨{developer}⁩، إضافةً إلى أي أقساط متأخرة وغرامات تأخير يشترط المطوّر سدادها قبل إصدار الشهادة. وتعرض صفحة كل صفقة تقديرها الخاص لهذا المبلغ.",
    "faq.cash.aSeller":
      "يشمل المبلغ النقدي اللازم يوم نقل الملكية السعرَ الذي يطلبه البائع، ورسوم نقل الملكية لدى دائرة الأراضي والأملاك بنسبة ⁨{dld}⁩ من قيمة البيع، ورسوم التسجيل ومكتب أمين التسجيل، ورسوم شهادة عدم الممانعة لدى ⁨{developer}⁩، إضافةً إلى أي أقساط متأخرة وغرامات تأخير يشترط المطوّر سدادها قبل إصدار الشهادة. وتعرض صفحة كل صفقة تقديرها الخاص لهذا المبلغ.",
    "faq.cash.one": "وللوحدة المتاحة في ⁨{project}⁩ يبلغ نحو ⁨{amount}⁩.",
    "faq.cash.each": "ولكل وحدة من الوحدات المتاحة في ⁨{project}⁩ (⁨{count}⁩) يبلغ نحو ⁨{amount}⁩.",
    "faq.cash.many": "وللوحدات المتاحة في ⁨{project}⁩ (⁨{count}⁩) يتراوح بين نحو ⁨{min}⁩ و⁨{max}⁩.",
    "faq.plan.q": "ماذا يعني تولّي خطة الدفع في ⁨{project}⁩؟",
    "faq.plan.a":
      "تحلّ محل البائع في عقده مع ⁨{developer}⁩: تدفع له السعر الذي يطلبه مقابل حصته التي سدّدها، وتستمر الأقساط المتبقية للمطوّر وفق الجدول الأصلي، ولكن باسمك.",
    "faq.paid.q": "هل يتبقى شيء أدفعه للمطوّر في ⁨{project}⁩؟",
    "faq.paid.a":
      "لا. كل الوحدات المعروضة في ⁨{project}⁩ مسدّدة بالكامل: تدفع للبائع السعر الذي يطلبه، ولا تتولى أي خطة دفع مع ⁨{developer}⁩.",
    "faq.time.q": "كم تستغرق شهادة عدم الممانعة ونقل الملكية في ⁨{project}⁩؟",
    "faq.time.a":
      "عادةً من أسبوعين إلى خمسة أسابيع من قبول العرض حتى إصدار شهادة أوقود جديدة باسمك، بحسب سرعة ⁨{developer}⁩ في إصدار شهادة عدم الممانعة.",
    "faq.time.aMixed":
      "عادةً من أسبوعين إلى خمسة أسابيع من قبول العرض حتى إصدار شهادة أوقود جديدة باسمك، أو سند ملكية جديد إذا كانت الوحدة جاهزة، بحسب سرعة ⁨{developer}⁩ في إصدار شهادة عدم الممانعة.",
    "faq.time.aReady":
      "عادةً من أسبوعين إلى خمسة أسابيع من قبول العرض حتى إصدار سند ملكية جديد باسمك، بحسب سرعة ⁨{developer}⁩ في إصدار شهادة عدم الممانعة.",
    "faq.fee.q": "ما رسومكم عند الشراء في ⁨{project}⁩؟",
    "faq.fee.a":
      "⁨{commission}⁩ من قيمة البيع مضافاً إليها ضريبة القيمة المضافة بنسبة ⁨{vat}⁩ على الرسوم، يدفعها المشتري عند إتمام نقل الملكية. لا يُدفع لنا أي مبلغ مقدّماً، ولا رسوم إذا لم يكتمل نقل الملكية.",
    "faq.fee.aSeller":
      "لا يدفع المشتري لنا شيئاً: يدفع البائع رسومنا البالغة ⁨{commission}⁩ من قيمة البيع مضافاً إليها ضريبة القيمة المضافة بنسبة ⁨{vat}⁩ على الرسوم عند إتمام نقل الملكية.",
    "faq.fee.one": "وللوحدة المتاحة في ⁨{project}⁩ تبلغ نحو ⁨{amount}⁩ شاملةً ضريبة القيمة المضافة.",
    "faq.fee.each": "ولكل وحدة من الوحدات المتاحة في ⁨{project}⁩ (⁨{count}⁩) تبلغ نحو ⁨{amount}⁩ شاملةً ضريبة القيمة المضافة.",
    "faq.fee.many": "وللوحدات المتاحة في ⁨{project}⁩ (⁨{count}⁩) تتراوح بين نحو ⁨{min}⁩ و⁨{max}⁩ شاملةً ضريبة القيمة المضافة.",
    "faq.below.q": "ماذا يعني «أقل من السعر الأصلي» في ⁨{project}⁩؟",
    "faq.below.a":
      "يعني مقارنة قيمة البيع، أي السعر الذي يطلبه البائع مضافاً إليه الرصيد المتبقي المستحق للمطوّر، بالسعر الذي وقّعه المشتري الأول مع المطوّر في اتفاقية البيع والشراء. والنسبة الظاهرة على كل بطاقة هي مقدار انخفاض قيمة البيع عن ذلك السعر.",
    "faq.below.one": "والوحدة المتاحة في ⁨{project}⁩ أقل منه بنسبة ⁨{pct}%⁩.",
    "faq.below.oneNone": "والوحدة المتاحة في ⁨{project}⁩ ليست أقل منه بنسبة 1% أو أكثر حالياً.",
    "faq.below.manyOne": "ومن الوحدات المتاحة في ⁨{project}⁩ (⁨{count}⁩) وحدة واحدة أقل منه، بنسبة ⁨{pct}%⁩.",
    "faq.below.many": "ومن الوحدات المتاحة في ⁨{project}⁩ (⁨{count}⁩) عدد ⁨{below}⁩ أقل منه، بنسبة تصل إلى ⁨{pct}%⁩.",
    "faq.below.all": "وكل الوحدات المتاحة في ⁨{project}⁩ أقل منه، بنسبة تصل إلى ⁨{pct}%⁩.",
    "faq.below.manyNone": "ولا توجد بين الوحدات المتاحة في ⁨{project}⁩ (⁨{count}⁩) وحدة أقل منه بنسبة 1% أو أكثر حالياً.",

    "cta.title": "تبحث عن وحدة أخرى؟",
    "cta.body": "تصفّح كل وحدات إعادة البيع على الخارطة المعروضة على ⁨{brand}⁩، أو اطّلع على المشاريع الأخرى التي تضم وحدات معروضة.",
    "cta.allProjects": "كل المشاريع",

    dealLink: "كل وحدات إعادة البيع في ⁨{project}⁩",
    dealLinkCount: " (المتاح منها: ⁨{n}⁩)",

    "index.meta.title": "مشاريع دبي على الخارطة التي تضم وحدات لإعادة البيع",
    "index.meta.description":
      "كل مشاريع دبي على الخارطة التي تضم وحدات معروضة لإعادة البيع على ⁨{brand}⁩: المطوّر والمنطقة وموعد التسليم، ومدى انخفاض أسعار الوحدات المعروضة عن السعر الأصلي.",
    "index.eyebrow": "إعادة بيع الوحدات على الخارطة",
    "index.title": "مشاريع تضم وحدات لإعادة البيع",
    "index.subtitle":
      "مشاريع على الخارطة في دبي يعيد فيها ملّاك الوحدات بيعها، وغالباً بأقل من السعر الأصلي. اختر مشروعاً لترى وحداته وكيف يتم شراء وحدة لإعادة البيع فيه.",
    "index.count.one": "مشروع واحد",
    "index.count.many": "عدد المشاريع: ⁨{count}⁩",
    "index.empty": "لا توجد حالياً وحدات معروضة لإعادة البيع في أي مشروع. ننشر صفقات جديدة كل أسبوع.",
    "index.filter.label": "ابحث عن مشروع",
    "index.filter.placeholder": "المشروع أو المطوّر أو المنطقة",
    "index.filter.none": "لا يوجد مشروع يطابق «⁨{q}⁩».",
    "card.units.one": "وحدة واحدة متاحة",
    "card.units.many": "الوحدات المتاحة: ⁨{n}⁩",
    "card.reserved": "و⁨{n}⁩ عليها عرض مقبول",
    "card.upTo": "أقل من السعر الأصلي بنسبة تصل إلى ⁨{pct}%⁩",
    "card.handover": "التسليم: {when}",
    "card.cta": "عرض الوحدات",
  },
  zh: {
    projects: "项目",
    theDeveloper: "开发商",
    range: "{from}至 {to}",
    titleBelow: "{project} 转售：低于原始合同价的单元",
    titleNeutral: "{project} 转售：在售期房单元",
    titleNeutralReady: "{project} 转售：在售单元",

    "meta.units.one": "{project} 有 {count} 套可售转售单元。",
    "meta.units.many": "{project} 有 {count} 套可售转售单元。",
    "meta.byIn": "开发商为 {developer}，位于 {community}。",
    "meta.by": "开发商为 {developer}。",
    "meta.in": "位于 {community}。",
    "meta.handover": "交房时间：{handover}。",
    "meta.upTo": "较原始合同价最多低 {pct}%。",

    breadcrumb: "导航路径",
    intro:
      "{project} 的业主正在转售以下期房单元。您向卖家支付其要价，并承接剩余付款计划；每张卡片均显示过户当天所需现金。",
    introMixed:
      "{project} 的业主正在转售以下单元。您向卖家支付其要价，并承接尚余的付款计划（如有）；每张卡片均显示过户当天所需现金。",
    introPaid:
      "{project} 的业主正在转售以下已全额付清的单元。您向卖家支付其要价，无需再向开发商付款；每张卡片均显示过户当天所需现金。",
    "facts.developer": "开发商",
    "facts.community": "社区",
    "facts.handover": "交房",
    "facts.units": "可售单元",
    "facts.reserved": "另有 {count} 套议价中",
    "facts.belowOriginal": "低于原始合同价",
    "facts.upTo": "最多 {pct}%",

    "deals.title": "{project} 的转售单元",
    "deals.reservedTitle": "议价中（{count}）",
    "deals.reservedNote": "卖家已接受以下各单元的报价。您仍可将其加入关注列表，或提交备选报价，以防交易未能完成。",

    "how.title": "如何在 {project} 购买转售单元",
    "how.sub": "我们持有迪拜房地产监管局（RERA）牌照的交易团队将与您一起办理每一步。",
    "how.plan.title": "承接付款计划",
    "how.plan.body":
      "您向卖家支付其要价，以换取其已付权益，即其迄今已向开发商支付的金额（许多卖家的要价低于这一金额），并按原付款计划继续向 {developer} 支付剩余分期款。交易总价为卖家要价加上尚欠开发商的余款。",
    "how.plan.mixed": "已全额付清的单元没有剩余分期款，其交易总价即为卖家要价。",
    "how.paid.title": "支付卖家要价",
    "how.paid.body": "此处列出的单元均已全额付清，无需再向 {developer} 付款：您向卖家支付其要价，该要价即为交易总价。",
    "how.noc.title": "开发商无异议函（NOC）",
    "how.noc.body":
      "过户前，{developer} 需出具无异议函（NOC）。多数开发商要求先付清一定比例的房价，通常为 30%–50%。我们会逐套核查，并为您申请 NOC；NOC 费及行政费由开发商自行规定。",
    "how.noc.bodyPaid": "过户前，{developer} 需出具无异议函（NOC）。我们会为您申请 NOC；NOC 费及行政费由开发商自行规定。",
    "how.transfer.title": "迪拜土地局（DLD）过户",
    "how.transfer.body":
      "交割在迪拜土地局产权登记受托机构进行：卖家要价以银行本票支付，与产权转移至您名下同时完成，绝不会在 NOC 签发前支付。您需支付交易总价 {dld} 的 DLD 过户费，另加登记费及产权登记受托机构费用，随后 DLD 将以您的名义签发新的 Oqood 期房登记。",
    "how.transfer.bodyMixed":
      "交割在迪拜土地局产权登记受托机构进行：卖家要价以银行本票支付，与产权转移至您名下同时完成，绝不会在 NOC 签发前支付。您需支付交易总价 {dld} 的 DLD 过户费，另加登记费及产权登记受托机构费用，随后 DLD 将以您的名义签发新的 Oqood 期房登记；如为现房，则签发新的产权证书（Title Deed）。",
    "how.transfer.bodyReady":
      "交割在迪拜土地局产权登记受托机构进行：卖家要价以银行本票支付，与产权转移至您名下同时完成，绝不会在 NOC 签发前支付。您需支付交易总价 {dld} 的 DLD 过户费，另加登记费及产权登记受托机构费用，随后 DLD 将以您的名义签发新的产权证书（Title Deed）。",
    "how.fee.title": "服务费：{commission} + 增值税，过户完成时收取",
    "how.fee.body":
      "交易总价的 {commission}，另加服务费 {vat} 的增值税，由您在过户完成时支付。无需预付，若过户未完成则不收取任何费用。",
    "how.fee.bodySeller":
      "服务费为交易总价的 {commission}，另加服务费 {vat} 的增值税，由卖家在过户完成时支付。您无需向我们支付任何费用，无论事前还是事后。",

    "faq.title": "在 {project} 购买转售单元常见问题",
    "faq.cash.q": "购买 {project} 的单元，过户当天需要准备多少现金？",
    "faq.cash.a":
      "过户当天所需现金包括：卖家要价、我们的 {commission} 服务费及增值税、交易总价 {dld} 的 DLD 过户费、DLD 登记费及产权登记受托机构费用、{developer} 的 NOC 费，以及开发商要求在签发 NOC 前结清的逾期分期款及滞纳金（如有）。每个房源页面都会显示各自的估算金额。",
    "faq.cash.aSeller":
      "过户当天所需现金包括：卖家要价、交易总价 {dld} 的 DLD 过户费、DLD 登记费及产权登记受托机构费用、{developer} 的 NOC 费，以及开发商要求在签发 NOC 前结清的逾期分期款及滞纳金（如有）。每个房源页面都会显示各自的估算金额。",
    "faq.cash.one": "{project} 目前可售的这套单元约需 {amount}。",
    "faq.cash.each": "{project} 目前可售的 {count} 套单元每套约需 {amount}。",
    "faq.cash.many": "{project} 目前可售的 {count} 套单元约需 {min} 至 {max}。",
    "faq.plan.q": "在 {project} 承接付款计划是什么意思？",
    "faq.plan.a":
      "您将取代卖家在与 {developer} 所签合同中的位置：向卖家支付其要价，以换取其已付权益；剩余分期款则按原付款时间表继续支付给开发商，只是改为以您的名义支付。",
    "faq.paid.q": "在 {project} 购买，还需要向开发商付款吗？",
    "faq.paid.a": "不需要。{project} 列出的单元均已全额付清：您向卖家支付其要价即可，无需承接 {developer} 的任何付款计划。",
    "faq.time.q": "{project} 的 NOC 和过户需要多长时间？",
    "faq.time.a": "从接受报价到以您的名义签发新的 Oqood 期房登记，通常需要 2–5 周，视 {developer} 签发 NOC 的速度而定。",
    "faq.time.aMixed":
      "从接受报价到以您的名义签发新的 Oqood 期房登记（现房则为产权证书），通常需要 2–5 周，视 {developer} 签发 NOC 的速度而定。",
    "faq.time.aReady": "从接受报价到以您的名义签发新的产权证书，通常需要 2–5 周，视 {developer} 签发 NOC 的速度而定。",
    "faq.fee.q": "在 {project} 购买，你们的服务费是多少？",
    "faq.fee.a":
      "交易总价的 {commission}，另加服务费 {vat} 的增值税，由买家在过户完成时支付。无需向我们预付任何费用，若过户未完成则不收费。",
    "faq.fee.aSeller": "买家无需向我们付费：服务费为交易总价的 {commission}，另加服务费 {vat} 的增值税，由卖家在过户完成时支付。",
    "faq.fee.one": "{project} 目前可售的这套单元，服务费约为 {amount}（含增值税）。",
    "faq.fee.each": "{project} 目前可售的 {count} 套单元，每套服务费约为 {amount}（含增值税）。",
    "faq.fee.many": "{project} 目前可售的 {count} 套单元，服务费约为 {min} 至 {max}（含增值税）。",
    "faq.below.q": "在 {project}，“低于原始合同价”是什么意思？",
    "faq.below.a":
      "指将交易总价（卖家要价加上尚欠开发商的余款）与首位买家在买卖协议（SPA）中与开发商签订的价格进行比较。每张卡片上的百分比，就是交易总价低于该价格的幅度。",
    "faq.below.one": "{project} 目前可售的这套单元低于该价格 {pct}%。",
    "faq.below.oneNone": "{project} 目前可售的这套单元暂未低于该价格 1% 或以上。",
    "faq.below.manyOne": "{project} 目前可售的 {count} 套单元中，有 1 套低于该价格，幅度为 {pct}%。",
    "faq.below.many": "{project} 目前可售的 {count} 套单元中，有 {below} 套低于该价格，最多低 {pct}%。",
    "faq.below.all": "{project} 目前可售的单元均低于该价格，最多低 {pct}%。",
    "faq.below.manyNone": "{project} 目前可售的 {count} 套单元中，暂无低于该价格 1% 或以上的单元。",

    "cta.title": "想看看其他单元？",
    "cta.body": "浏览 {brand} 上的所有期房转售房源，或查看其他有在售单元的项目。",
    "cta.allProjects": "全部项目",

    // No visible space before the bracket (full-width punctuation): a word joiner keeps the count with the name.
    dealLink: "{project} 的全部转售单元",
    dealLinkCount: "⁠（{n} 套可售）",

    "index.meta.title": "有转售房源的迪拜期房项目",
    "index.meta.description": "{brand} 上所有有转售单元的迪拜期房项目：开发商、社区、交房时间，以及单元低于原始合同价的幅度。",
    "index.eyebrow": "期房转售",
    "index.title": "有转售房源的项目",
    "index.subtitle": "迪拜期房项目中业主正在转售的单元，价格往往低于原始合同价。选择一个项目，查看其单元以及在该项目购买转售单元的流程。",
    "index.count.one": "{count} 个项目",
    "index.count.many": "{count} 个项目",
    "index.empty": "目前没有项目挂牌转售单元。我们每周都会发布新房源。",
    "index.filter.label": "查找项目",
    "index.filter.placeholder": "项目、开发商或社区",
    "index.filter.none": "没有与“{q}”匹配的项目。",
    "card.units.one": "{n} 套可售",
    "card.units.many": "{n} 套可售",
    "card.reserved": "另有 {n} 套议价中",
    "card.upTo": "较原始合同价最多低 {pct}%",
    "card.handover": "交房：{when}",
    "card.cta": "查看单元",
  },
});

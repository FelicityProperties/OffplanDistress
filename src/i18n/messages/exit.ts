import { defineMessages } from "../define";

// The seller exit calculator (/exit-calculator): keep paying, stop paying, or sell the unit.
// Legal copy follows Article 11 of Dubai Law No. (13) of 2008 as replaced by Law No. (19) of 2020 —
// sources are listed in src/components/exit/exit-math.ts. Keep the two in step.
// Placeholders wrapped in {…} are filled with formatted (bidi-isolated) amounts by the calculator.
export default defineMessages({
  en: {
    "meta.title": "Off-plan exit calculator",
    "meta.description":
      "Can't keep paying your Dubai off-plan plan? Compare keeping the unit, stopping payments (what Article 11 of Law No. 13 of 2008 lets the developer keep) and selling your contract.",

    "hero.eyebrow": "Seller exit calculator",
    "hero.title": "Can't keep paying? Compare your three ways out",
    "hero.sub":
      "Enter your numbers to see what it costs to keep paying, what Dubai law lets your developer keep if you stop, and what selling your contract could bring — before you miss an instalment.",
    "hero.ctaCalc": "Calculate my exit",
    "hero.ctaLaw": "What the law says",
    "hero.point.law": "Based on Article 11 of Dubai Law No. (13) of 2008, as replaced in 2020",
    "hero.point.live": "Results update as you type",
    "hero.point.private": "Nothing you enter is saved or sent, unless you choose to send it to us on WhatsApp",

    "calc.title": "Your numbers",
    "calc.sub": "Use the figures in your SPA and your latest statement of account.",
    "calc.optional": "Optional",
    "calc.seeResults": "See your three options",
    "in.price": "Purchase price",
    "in.price.hint": "The unit price in your SPA.",
    "in.paid": "Paid so far",
    "in.paid.hint": "{pct} of the price",
    "in.paid.over": "This can't be more than the purchase price, so we've used the purchase price instead.",
    "in.progress": "Construction progress",
    "in.progress.hint": "Your developer's latest update. The law uses the project's official completion percentage, as stated in DLD's document and calculated under RERA's standards, not the share you've paid. Enter it exactly, decimals included.",
    "in.progress.zeroHint": "At 0%, tick the box if works haven't actually started: the 25% limit applies only once the developer has started construction.",
    "in.notStarted": "Works haven't started, or RERA has cancelled the project",
    "in.market": "Today's price for a similar unit",
    "in.market.hint":
      "What a comparable unit resells for today: resale asking prices are a better guide than the developer's launch price list. Left blank, we assume it equals your purchase price.",
    "in.market.clear": "Clear",
    "in.months": "Months until handover",
    "in.months.hint": "Used to show the average monthly amount you'd still need.",
    "in.months.unit": "months",
    // Picked with Intl.PluralRules (Arabic needs one / two / few / many forms)
    "count.months.zero": "{n} months",
    "count.months.one": "{n} month",
    "count.months.two": "{n} months",
    "count.months.few": "{n} months",
    "count.months.many": "{n} months",
    "count.months.other": "{n} months",
    "in.placeholder.optional": "Optional",

    "out.title": "Your three ways out",
    "out.empty": "Enter your purchase price to compare your options.",
    "out.option": "Option {n}",

    "verdict.sell.title": "Selling looks better than stopping payments",
    "verdict.sell.body": "A sale in the range below would leave you {low} to {high} more than the refund you could expect if you stop paying.",
    "verdict.sell.bodySingle": "A sale at the estimate below would leave you {high} more than the refund you could expect if you stop paying.",
    "verdict.maybe.title": "Selling can beat stopping payments — if the price is right",
    "verdict.maybe.body":
      "Sold close to full value, you'd keep up to {high} more than the refund you could expect if you stop paying. At a deep discount it may not.",
    "verdict.law.title": "On these numbers, a quick sale doesn't beat the refund you'd get if the developer cancels",
    "verdict.law.body":
      "Read your SPA and take legal advice before you stop paying: the result depends on the developer's choice and the official completion percentage. We can still tell you what your unit could fetch.",
    "verdict.none.title": "On these numbers, neither exit gets your money back",
    "verdict.none.body":
      "At today's price your equity is wiped out, and if you stop paying the developer may keep everything you've paid. Compare keeping the unit to handover, and talk to us before you decide.",
    "verdict.over80":
      "Above 80% complete the developer doesn't have to cancel. It may keep the contract, keep everything you've paid and claim the {amount} still owed, or ask DLD to sell the unit at public auction to recover what you owe, with the sale costs charged to you. The refund shown applies only if it chooses to cancel.",
    "verdict.over80Short": "Above 80% complete the developer doesn't have to cancel: see Option 2 before you stop paying.",
    "verdict.nocCaveat": "Check your developer's resale rules first: many only issue a resale NOC once 30–40% of the price is paid, and you've paid {pct}.",

    "opt1.title": "Keep paying to handover",
    "opt1.desc": "You keep the unit and fund every remaining instalment.",
    "opt1.remaining": "Still to pay the developer",
    "opt1.perMonth": "Average per month over {months}",
    "opt1.perMonth.note": "A simple average — your plan may put more on handover.",
    "opt1.value": "Value at today's price",
    "opt1.gain": "Paper gain or loss on your price",
    "opt1.noMarket": "Add today's price to see this",

    "opt2.title": "Stop paying",
    "opt2.desc": "What Dubai law lets the developer do after you default.",
    "opt2.rule": "Rule that applies",
    "opt2.max": "Most the developer may keep ({pct} of the price)",
    "opt2.max.over80": "Most the developer may keep if it cancels ({pct} of the price)",
    "opt2.lose": "You could lose",
    "opt2.refund": "Refund due to you",
    "opt2.refund.ifCancelled": "Refund due if the developer cancels",
    "opt2.refund.note": "Within one year of termination, or 60 days after the unit is resold — whichever comes first.",
    "opt2.refund.escrow": "In this case the law requires the developer to refund everything you've paid, following the escrow-law procedures (Law No. 8 of 2007).",
    "opt2.notice": "First the developer must notify DLD, and DLD must give you 30 days to meet your obligations, usually by paying what's overdue.",
    "opt2.spa": "Shown against what you've paid. Check your SPA for any further claim.",
    "opt2.shortfall": "You've paid less than the most the developer may keep. The law doesn't clearly say whether it can also claim the {amount} difference from you, and some lawyers say it can. Take legal advice.",
    "opt2.boundary": "You're on a boundary. The law says 'exceeds 80%' and 'less than 60%', so we treat exactly 60% and exactly 80% as the 60–80% band. We know of no ruling that confirms this, so check the certified figure with DLD.",

    "tier.over80": "Above 80% complete",
    "tier.from60to80": "60% to 80% complete (both included)",
    "tier.under60": "Works started, below 60%",
    "tier.notStarted": "Not started, or cancelled by RERA",
    "tier.over80.rule":
      "The developer may choose to keep the contract, keep everything you've paid and claim the balance; to ask DLD to sell the unit at public auction to recover what you owe, with the sale costs charged to you; or to cancel, keep up to 40% of the price and refund the rest.",
    "tier.from60to80.rule": "Cancel the contract and keep up to 40% of the price.",
    "tier.under60.rule": "Cancel the contract and keep up to 25% of the price.",
    "tier.notStarted.rule":
      "The developer must refund everything you've paid, under the procedures of Dubai's escrow law (Law No. 8 of 2007), where works haven't started for reasons beyond its control and without its own negligence, or where RERA has cancelled the project by a final decision. If works haven't started for another reason, take legal advice.",

    "opt3.title": "Sell your contract through {brand}",
    "opt3.desc": "A buyer pays you for your equity and takes over the remaining instalments.",
    "opt3.position": "Value of your position",
    "opt3.position.formula": "Paid so far + (today's price − your price)",
    "opt3.range": "Quick-sale range",
    "opt3.range.note": "Our assumption: to buy fast, a buyer wants {low}–{high}% off today's price for the whole unit, and that comes out of your equity. Not a valuation.",
    "opt3.fee": "Our fee to you",
    "opt3.fee.buyer": "The buyer pays our 2% + VAT",
    "opt3.fee.seller": "2% + VAT of the sale value, on completion",
    "opt3.noc": "Developer NOC fee (estimate)",
    "opt3.noc.note": "Set by each developer and confirmed when the NOC is issued. In our deals it's part of the buyer's closing costs.",
    "opt3.net": "You could receive",
    "opt3.takeover": "The buyer also takes over the {amount} still owed to the developer.",
    "opt3.noMarket": "We've assumed today's price equals your purchase price. Add today's price for a sharper estimate.",
    "opt3.underwater": "At today's price the drop wipes out what you've paid, so a buyer would pay little or nothing for the contract.",
    "opt3.nocWarning":
      "Most developers require 30–50% of the price to be paid before they issue a resale NOC; the rule depends on your developer. We'll check its policy and tell you your options.",

    "cta.list": "List my unit",
    "cta.whatsapp": "Ask us on WhatsApp",
    "cta.how": "How it works",
    "wa.text":
      "Hello {brand}, I used your exit calculator. My unit: purchase price {price}, paid so far {paid}, construction {progress}. I'd like help selling it.",
    "wa.progress": "{pct}% complete",
    "wa.notStarted": "not started yet",

    "paths.eyebrow": "Your options",
    "paths.title": "Three ways out of an off-plan payment plan",
    "paths.sub": "Each path has a different cost. The calculator above puts numbers on all three.",
    "paths.keep.title": "Keep paying",
    "paths.keep.body":
      "You keep the unit and any gain or loss at handover, but you must fund every remaining instalment, including any handover payment in your plan.",
    "paths.stop.title": "Stop paying",
    "paths.stop.body":
      "Missing instalments doesn't end the contract. The developer goes through DLD and, once the 30-day notice runs out and DLD confirms the procedure, may cancel and keep part of the price, depending on construction progress. Above 80% it may instead keep the contract and claim the balance, or have the unit auctioned. If works haven't started for reasons beyond its control, it must refund you in full.",
    "paths.sell.title": "Sell the contract",
    "paths.sell.body":
      "An assignment: a buyer pays you for what you've paid in and takes over the remaining instalments, with the developer's NOC and a DLD transfer. You choose the price and the timing.",

    "law.eyebrow": "The law",
    "law.title": "What a developer may do if you stop paying",
    "law.sub":
      "Off-plan defaults in Dubai follow a set procedure through the Dubai Land Department (DLD). What the developer may keep depends on how far construction has progressed.",
    "law.citation": "Law No. (13) of 2008 Regulating the Interim Real Property Register in the Emirate of Dubai — Article 11, as replaced by Law No. (19) of 2020.",
    "law.reviewed": "Last updated October 2026",
    "law.step": "Step {n}",
    "law.step1.title": "The developer notifies DLD",
    "law.step1.body": "On DLD's prescribed form, setting out the obligations you haven't met.",
    "law.step2.title": "You get 30 days",
    "law.step2.body": "DLD serves you a written notice giving you 30 days to meet your obligations under the SPA, which usually means paying what's overdue. Where possible it also tries to reach an amicable settlement, recorded in an addendum you both sign.",
    "law.step3.title": "DLD confirms, the developer acts",
    "law.step3.body":
      "If you neither pay nor reach a settlement within the 30 days, DLD issues a document confirming the developer followed the procedure and stating the completion percentage, calculated under RERA's standards. The developer can then act on that percentage without going to court or arbitration. You can still go to court or arbitration yourself if you think it hasn't followed the law.",
    "law.tiers.title": "What the developer may or must do, by construction progress",
    "law.col.progress": "Construction progress",
    "law.col.options": "What the law allows or requires",
    "law.refund": "When the developer cancels and keeps a share, it must refund the rest within one year of termination, or within 60 days of reselling the unit to another buyer, whichever is earlier.",
    "law.base": "The 25% and 40% limits are percentages of the unit price in your SPA — not of the amount you've paid.",
    "law.maximum": "The 25% and 40% figures are the most the developer may keep when it cancels, not amounts it is automatically owed. Completion is the project's official percentage stated in DLD's document, calculated under RERA's standards.",
    "law.before2020": "Before the 2020 amendment, where works hadn't started for reasons beyond the developer's control, it could keep up to 30% of the amounts paid. That is no longer the rule: it must now refund everything.",
    "law.badge.ifCancelled": "if it cancels",
    "law.source": "Read Law No. (19) of 2020, which sets out Article 11, on the Dubai Legislation Portal",

    "faq.eyebrow": "FAQ",
    "faq.title": "Questions sellers ask",
    "faq.q1": "Can the developer cancel my unit if I miss one instalment?",
    "faq.a1":
      "Not straight away. The developer must first notify the Dubai Land Department, which gives you 30 days to pay or settle. Only after that, and DLD's confirmation, can the developer act — and how much it may keep depends on construction progress.",
    "faq.q2": "Can I sell my unit before I've finished paying?",
    "faq.a2":
      "Usually, yes, through an assignment (a resale before handover). The buyer pays you for what you've paid in and takes over the remaining instalments. The developer has to issue a NOC, and many only do so once 30–40% of the price is paid.",
    "faq.q3": "How do you estimate what my position is worth?",
    "faq.a3":
      "We take what you've paid and add or subtract the difference between today's price for a similar unit and your purchase price. A quick sale usually needs a sharper price: buyers want {low}–{high}% off the whole unit, and that discount comes out of your equity, so we show that range. It's an estimate, not a valuation — we check real comparables when you list.",
    "faq.q4": "What does it cost me to sell through {brand}?",
    "faq.a4.buyer":
      "Nothing. Listing is free and the buyer pays our 2% + VAT, only when the transfer completes. The developer's NOC fee and DLD's transfer fee are part of the buyer's closing costs.",
    "faq.a4.seller": "Our fee is 2% + VAT of the sale value, charged only when the transfer completes. Listing is free.",

    "disclaimer.title": "Important",
    "disclaimer.body":
      "General information only, not legal advice. Results are estimates based on the figures you enter and on Article 11 of Dubai Law No. (13) of 2008, as replaced by Law No. (19) of 2020, under the rules in force as we understand them in October 2026. They are not a valuation or an offer. The percentages are maximums, not amounts the developer is owed, and they apply in Dubai only. Article 11 applies whatever your SPA says, but your SPA, your developer's choices and the official completion percentage still shape the outcome. Check your SPA, confirm your position with DLD and speak to a qualified lawyer before you stop paying.",
  },
  ar: {
    "meta.title": "حاسبة الخروج من الوحدة على الخارطة",
    "meta.description":
      "لم تعد قادراً على سداد أقساط وحدتك على الخارطة في دبي؟ قارن بين مواصلة السداد، والتوقف عنه (وما تجيزه المادة 11 من القانون رقم 13 لسنة 2008 للمطوّر)، وبيع عقدك.",

    "hero.eyebrow": "حاسبة الخروج للبائعين",
    "hero.title": "لم تعد قادراً على السداد؟ قارن بين طرق الخروج الثلاث",
    "hero.sub":
      "أدخل أرقامك لترى كلفة مواصلة السداد، وما يجيز القانون في دبي للمطوّر الاحتفاظ به إن توقفت، وما قد يحققه بيع عقدك — قبل أن تتأخر عن أي قسط.",
    "hero.ctaCalc": "احسب خروجي",
    "hero.ctaLaw": "ماذا يقول القانون",
    "hero.point.law": "مبنية على المادة 11 من القانون رقم (13) لسنة 2008 في دبي، بصيغتها المستبدلة عام 2020",
    "hero.point.live": "تتحدّث النتائج فور إدخال الأرقام",
    "hero.point.private": "لا نحفظ ما تُدخله ولا نرسله، إلا إذا اخترت إرساله إلينا عبر واتساب",

    "calc.title": "أرقامك",
    "calc.sub": "استخدم الأرقام الواردة في اتفاقية البيع والشراء وآخر كشف حساب لديك.",
    "calc.optional": "اختياري",
    "calc.seeResults": "اعرض خياراتك الثلاثة",
    "in.price": "سعر الشراء",
    "in.price.hint": "سعر الوحدة في اتفاقية البيع والشراء.",
    "in.paid": "المبلغ المدفوع حتى الآن",
    "in.paid.hint": "{pct} من السعر",
    "in.paid.over": "لا يمكن أن يتجاوز هذا المبلغ سعر الشراء، لذا اعتمدنا سعر الشراء حداً أقصى.",
    "in.progress": "نسبة إنجاز البناء",
    "in.progress.hint": "وفق آخر تحديث من المطوّر. يعتمد القانون نسبة إنجاز المشروع الرسمية كما تبيّنها وثيقة دائرة الأراضي والأملاك والمحتسبة وفق معايير مؤسسة التنظيم العقاري (ريرا)، وليس نسبة ما دفعته. أدخلها كما هي بكسورها العشرية.",
    "in.progress.zeroHint": "عند 0%، ضع علامة في المربع إن لم تبدأ الأعمال فعلياً، فحد 25% لا يسري إلا بعد أن يباشر المطوّر البناء.",
    "in.notStarted": "لم تبدأ الأعمال، أو ألغت ريرا المشروع",
    "in.market": "السعر الحالي لوحدة مماثلة",
    "in.market.hint":
      "سعر إعادة بيع وحدة مماثلة اليوم؛ فأسعار إعادة البيع المعروضة أدق من قائمة أسعار الإطلاق لدى المطوّر. إن تركته فارغاً نفترض أنه يساوي سعر شرائك.",
    "in.market.clear": "مسح",
    "in.months": "الأشهر المتبقية حتى التسليم",
    "in.months.hint": "نستخدمه لعرض متوسط المبلغ الشهري الذي ستحتاجه.",
    "in.months.unit": "شهر",
    "count.months.zero": "{n} شهر",
    "count.months.one": "شهر واحد",
    "count.months.two": "شهران",
    "count.months.few": "{n} أشهر",
    "count.months.many": "{n} شهراً",
    "count.months.other": "{n} شهر",
    "in.placeholder.optional": "اختياري",

    "out.title": "طرق الخروج الثلاث",
    "out.empty": "أدخل سعر الشراء لمقارنة خياراتك.",
    "out.option": "الخيار {n}",

    "verdict.sell.title": "البيع يبدو أفضل من التوقف عن السداد",
    "verdict.sell.body": "البيع ضمن النطاق أدناه يُبقي لك ما بين {low} و{high} زيادةً على المبلغ الذي قد يُرد إليك إن توقفت عن السداد.",
    "verdict.sell.bodySingle": "البيع بالتقدير أدناه يُبقي لك {high} زيادةً على المبلغ الذي قد يُرد إليك إن توقفت عن السداد.",
    "verdict.maybe.title": "قد يتفوق البيع على التوقف عن السداد — إن كان السعر مناسباً",
    "verdict.maybe.body":
      "إن بعت بسعر قريب من القيمة الكاملة، يبقى لك ما يصل إلى {high} زيادةً على المبلغ الذي قد يُرد إليك إن توقفت عن السداد. أما مع خصم كبير فقد لا يكون الأمر كذلك.",
    "verdict.law.title": "وفق هذه الأرقام، لا يتفوق البيع السريع على ما يُرد إليك إن فسخ المطوّر العقد",
    "verdict.law.body":
      "راجع اتفاقية البيع والشراء واستشر محامياً قبل أن تتوقف عن السداد، فالنتيجة تتوقف على قرار المطوّر ونسبة الإنجاز الرسمية. ويسعدنا مع ذلك أن نخبرك بالسعر الذي قد تحققه وحدتك.",
    "verdict.none.title": "وفق هذه الأرقام، لا يعيد إليك أيّ من الخيارين أموالك",
    "verdict.none.body":
      "بسعر اليوم تتلاشى قيمة حصتك، وإن توقفت عن السداد فقد يحتفظ المطوّر بكل ما دفعته. قارن ذلك بمواصلة السداد حتى التسليم، وتحدّث معنا قبل أن تقرر.",
    "verdict.over80":
      "إذا تجاوزت نسبة الإنجاز 80% فلا يُلزم المطوّر بفسخ العقد: يجوز له الإبقاء على العقد والاحتفاظ بكل ما دفعته ومطالبتك بالمبلغ المتبقي البالغ {amount}، أو أن يطلب من دائرة الأراضي والأملاك بيع الوحدة بالمزاد العلني لاستيفاء المستحق له على أن تتحمّل أنت تكاليف البيع. ولا ينطبق المبلغ المعروض للردّ إلا إذا اختار فسخ العقد.",
    "verdict.over80Short": "إذا تجاوزت نسبة الإنجاز 80% فلا يُلزم المطوّر بفسخ العقد: اطّلع على الخيار 2 قبل أن تتوقف عن السداد.",
    "verdict.nocCaveat": "تحقق أولاً من شروط إعادة البيع لدى مطوّرك: كثير من المطوّرين لا يصدرون شهادة عدم ممانعة لإعادة البيع إلا بعد سداد 30–40% من السعر، وقد سددت {pct}.",

    "opt1.title": "مواصلة السداد حتى التسليم",
    "opt1.desc": "تحتفظ بالوحدة وتسدّد جميع الأقساط المتبقية.",
    "opt1.remaining": "المتبقي للمطوّر",
    "opt1.perMonth": "المتوسط الشهري (المدة: {months})",
    "opt1.perMonth.note": "متوسط بسيط، وقد تحمّل خطتك دفعة أكبر عند التسليم.",
    "opt1.value": "القيمة بسعر اليوم",
    "opt1.gain": "الربح أو الخسارة الدفترية مقارنة بسعرك",
    "opt1.noMarket": "أضف السعر الحالي لرؤية ذلك",

    "opt2.title": "التوقف عن السداد",
    "opt2.desc": "ما يجيزه القانون في دبي للمطوّر بعد تخلفك عن السداد.",
    "opt2.rule": "القاعدة المطبّقة",
    "opt2.max": "أقصى ما يحق للمطوّر الاحتفاظ به ({pct} من السعر)",
    "opt2.max.over80": "أقصى ما يحق للمطوّر الاحتفاظ به إن فسخ العقد ({pct} من السعر)",
    "opt2.lose": "ما قد تخسره",
    "opt2.refund": "المبلغ المستحق ردّه إليك",
    "opt2.refund.ifCancelled": "المبلغ المستحق ردّه إليك إن فسخ المطوّر العقد",
    "opt2.refund.note": "خلال سنة من فسخ العقد، أو خلال 60 يوماً من إعادة بيع الوحدة، أيهما أسبق.",
    "opt2.refund.escrow": "في هذه الحالة يُلزم القانون المطوّر بردّ كامل ما دفعته، وفق إجراءات قانون حسابات الضمان (القانون رقم 8 لسنة 2007).",
    "opt2.notice": "على المطوّر أولاً إخطار دائرة الأراضي والأملاك، وعلى الدائرة أن تمنحك مهلة 30 يوماً للوفاء بالتزاماتك، أي غالباً سداد المتأخر.",
    "opt2.spa": "محسوبة مقارنة بما دفعته. راجع اتفاقية البيع والشراء لمعرفة أي مطالبات أخرى.",
    "opt2.shortfall": "ما دفعته أقل من أقصى ما يحق للمطوّر الاحتفاظ به. ولا يحسم القانون بوضوح ما إذا كان يحق له مطالبتك بالفرق البالغ {amount}، ويرى بعض المحامين أن ذلك يحق له. استشر محامياً.",
    "opt2.boundary": "أنت عند حدّ فاصل. ينص القانون على نسبة «تزيد على 80%» و«تقل عن 60%»، لذا نعامل نسبة 60% تماماً و80% تماماً ضمن الشريحة بين 60% و80%. ولا نعلم بحكم قضائي يؤكد ذلك، فتحقق من النسبة المعتمدة لدى دائرة الأراضي والأملاك.",

    "tier.over80": "نسبة الإنجاز أعلى من 80%",
    "tier.from60to80": "نسبة الإنجاز من 60% إلى 80% (شاملة)",
    "tier.under60": "بدأت الأعمال، والإنجاز أقل من 60%",
    "tier.notStarted": "لم تبدأ الأعمال، أو ألغت ريرا المشروع",
    "tier.over80.rule":
      "للمطوّر أن يختار: الإبقاء على العقد والاحتفاظ بكل ما دفعته ومطالبتك بالمتبقي؛ أو طلب بيع الوحدة بالمزاد العلني عبر الدائرة لاستيفاء المستحق له على أن تتحمّل تكاليف البيع؛ أو فسخ العقد والاحتفاظ بما لا يزيد على 40% من السعر وردّ الباقي إليك.",
    "tier.from60to80.rule": "فسخ العقد والاحتفاظ بما لا يزيد على 40% من السعر.",
    "tier.under60.rule": "فسخ العقد والاحتفاظ بما لا يزيد على 25% من السعر.",
    "tier.notStarted.rule":
      "على المطوّر ردّ كامل ما دفعته، وفق إجراءات قانون حسابات ضمان التطوير العقاري (القانون رقم 8 لسنة 2007)، إذا لم تبدأ الأعمال لأسباب خارجة عن إرادته ودون إهمال أو تقصير منه، أو إذا ألغت ريرا المشروع بقرار نهائي. وإن لم تبدأ الأعمال لسبب آخر فاستشر محامياً.",

    "opt3.title": "بيع عقدك عبر {brand}",
    "opt3.desc": "يدفع لك المشتري قيمة حصتك ويتولى سداد الأقساط المتبقية.",
    "opt3.position": "قيمة حصتك",
    "opt3.position.formula": "المدفوع حتى الآن + (السعر الحالي − سعرك)",
    "opt3.range": "نطاق البيع السريع",
    "opt3.range.note": "افتراض منّا: لكي يشتري بسرعة، يطلب المشتري خصماً بنسبة {low}–{high}% من السعر الحالي للوحدة كاملةً، ويُقتطع ذلك من حصتك. وليس تقييماً.",
    "opt3.fee": "رسومنا عليك",
    "opt3.fee.buyer": "يدفع المشتري رسومنا البالغة 2% + الضريبة",
    "opt3.fee.seller": "2% + الضريبة من قيمة البيع، عند الإتمام",
    "opt3.noc": "رسوم شهادة عدم الممانعة من المطوّر (تقديرية)",
    "opt3.noc.note": "يحددها كل مطوّر وتُؤكَّد عند إصدار الشهادة. وهي في صفقاتنا ضمن تكاليف الإتمام التي يتحملها المشتري.",
    "opt3.net": "ما قد تحصل عليه",
    "opt3.takeover": "ويتولى المشتري أيضاً سداد المبلغ المتبقي للمطوّر البالغ {amount}.",
    "opt3.noMarket": "افترضنا أن السعر الحالي يساوي سعر شرائك. أضف السعر الحالي للحصول على تقدير أدق.",
    "opt3.underwater": "بسعر اليوم يمحو انخفاض السعر ما دفعته، لذا قد لا يدفع المشتري شيئاً يُذكر مقابل العقد.",
    "opt3.nocWarning":
      "يشترط معظم المطوّرين سداد ما بين 30% و50% من السعر قبل إصدار شهادة عدم الممانعة لإعادة البيع، وتختلف القاعدة من مطوّر إلى آخر. سنتحقق من سياسة مطوّرك ونوضح لك خياراتك.",

    "cta.list": "اعرض وحدتي",
    "cta.whatsapp": "تواصل معنا عبر واتساب",
    "cta.how": "كيف تعمل المنصة",
    "wa.text":
      "مرحباً {brand}، استخدمت حاسبة الخروج لديكم. وحدتي: سعر الشراء {price}، والمدفوع حتى الآن {paid}، وحالة البناء: {progress}. أرغب في مساعدتكم لبيعها.",
    "wa.progress": "منجز بنسبة {pct}%",
    "wa.notStarted": "لم يبدأ بعد",

    "paths.eyebrow": "خياراتك",
    "paths.title": "ثلاث طرق للخروج من خطة سداد على الخارطة",
    "paths.sub": "لكل طريق كلفة مختلفة، والحاسبة أعلاه تضع أرقاماً للطرق الثلاث.",
    "paths.keep.title": "مواصلة السداد",
    "paths.keep.body":
      "تحتفظ بالوحدة وبأي ربح أو خسارة عند التسليم، لكن عليك سداد جميع الأقساط المتبقية، بما فيها أي دفعة عند التسليم في خطتك.",
    "paths.stop.title": "التوقف عن السداد",
    "paths.stop.body":
      "التأخر عن الأقساط لا يُنهي العقد. يلجأ المطوّر إلى دائرة الأراضي والأملاك، وبعد انقضاء مهلة الثلاثين يوماً وتأكيد الدائرة للإجراءات، يجوز له بحسب نسبة إنجاز البناء فسخ العقد والاحتفاظ بجزء من السعر، أو — إذا تجاوز الإنجاز 80% — الإبقاء على العقد والمطالبة بالمتبقي أو طلب بيع الوحدة بالمزاد. وإن لم تبدأ الأعمال لأسباب خارجة عن إرادته، فعليه ردّ كامل ما دفعته.",
    "paths.sell.title": "بيع العقد",
    "paths.sell.body":
      "التنازل: يدفع لك المشتري ما سددته ويتولى الأقساط المتبقية، بموجب شهادة عدم ممانعة من المطوّر ونقل لدى دائرة الأراضي والأملاك. أنت من يحدد السعر والتوقيت.",

    "law.eyebrow": "القانون",
    "law.title": "ما يجوز للمطوّر فعله إن توقفت عن السداد",
    "law.sub":
      "يخضع التخلف عن سداد أقساط الوحدات على الخارطة في دبي لإجراءات محددة عبر دائرة الأراضي والأملاك، ويتوقف ما يحق للمطوّر الاحتفاظ به على نسبة إنجاز البناء.",
    "law.citation": "القانون رقم (13) لسنة 2008 بشأن تنظيم السجل العقاري المبدئي في إمارة دبي — المادة (11)، كما استُبدلت بموجب القانون رقم (19) لسنة 2020.",
    "law.reviewed": "آخر تحديث: أكتوبر 2026",
    "law.step": "الخطوة {n}",
    "law.step1.title": "يُخطر المطوّر دائرة الأراضي والأملاك",
    "law.step1.body": "على النموذج المعتمد لدى الدائرة، مع بيان الالتزامات التي لم تفِ بها.",
    "law.step2.title": "تُمنح مهلة 30 يوماً",
    "law.step2.body": "تُخطرك الدائرة كتابياً وتمنحك 30 يوماً للوفاء بالتزاماتك التعاقدية، وغالباً ما يعني ذلك سداد المتأخر. وتسعى، إن أمكن، إلى تسوية ودية بينكما تُثبت بملحق للعقد يوقّعه الطرفان.",
    "law.step3.title": "تؤكد الدائرة، فيتصرف المطوّر",
    "law.step3.body":
      "إن لم تفِ بالتزاماتك ولم تتم تسوية خلال الثلاثين يوماً، تُصدر الدائرة وثيقة تؤكد التزام المطوّر بالإجراءات وتبيّن نسبة الإنجاز المحتسبة وفق معايير ريرا، فيحق له عندئذ التصرف وفق تلك النسبة دون اللجوء إلى القضاء أو التحكيم. ويبقى لك حق اللجوء إلى القضاء أو التحكيم إن رأيت أنه لم يلتزم بالقانون.",
    "law.tiers.title": "ما يجوز للمطوّر فعله أو يلزمه، بحسب نسبة الإنجاز",
    "law.col.progress": "نسبة إنجاز البناء",
    "law.col.options": "ما يجيزه القانون أو يُلزم به",
    "law.refund": "إذا فسخ المطوّر العقد واحتفظ بحصته، وجب عليه ردّ الباقي خلال سنة من فسخ العقد، أو خلال 60 يوماً من إعادة بيع الوحدة لمشترٍ آخر، أيهما أسبق.",
    "law.base": "حدّا 25% و40% نسبتان من سعر الوحدة في اتفاقية البيع والشراء، وليسا من المبلغ الذي دفعته.",
    "law.maximum": "نسبتا 25% و40% هما أقصى ما يجوز للمطوّر الاحتفاظ به عند فسخ العقد، وليستا مبالغ مستحقة له تلقائياً. ونسبة الإنجاز المعتمدة هي نسبة إنجاز المشروع الرسمية الواردة في وثيقة الدائرة والمحتسبة وفق معايير ريرا.",
    "law.before2020": "قبل تعديل عام 2020، كان يحق للمطوّر، إذا لم تبدأ الأعمال لأسباب خارجة عن إرادته، الاحتفاظ بما يصل إلى 30% من المبالغ المدفوعة. ولم تعد هذه هي القاعدة، إذ عليه الآن ردّ كامل المبالغ.",
    "law.badge.ifCancelled": "عند الفسخ",
    "law.source": "اقرأ القانون رقم (19) لسنة 2020 الذي يتضمن نص المادة (11) على بوابة دبي التشريعية",

    "faq.eyebrow": "أسئلة شائعة",
    "faq.title": "أسئلة يطرحها البائعون",
    "faq.q1": "هل يحق للمطوّر إلغاء وحدتي إذا تأخرت عن قسط واحد؟",
    "faq.a1":
      "ليس فوراً. على المطوّر أولاً إخطار دائرة الأراضي والأملاك، التي تمنحك 30 يوماً للسداد أو التسوية. ولا يحق له التصرف إلا بعد ذلك وبعد تأكيد الدائرة، ويتوقف ما يحق له الاحتفاظ به على نسبة إنجاز البناء.",
    "faq.q2": "هل يمكنني بيع وحدتي قبل إكمال السداد؟",
    "faq.a2":
      "نعم في الغالب، عن طريق التنازل (إعادة البيع قبل التسليم). يدفع لك المشتري ما سددته ويتولى الأقساط المتبقية. ويجب أن يصدر المطوّر شهادة عدم ممانعة، وكثير من المطوّرين لا يصدرونها إلا بعد سداد 30–40% من السعر.",
    "faq.q3": "كيف تقدّرون قيمة حصتي؟",
    "faq.a3":
      "نبدأ بما دفعته، ثم نضيف أو نطرح الفرق بين السعر الحالي لوحدة مماثلة وسعر شرائك. ولأن البيع السريع يتطلب عادةً سعراً أكثر تنافسية، إذ يطلب المشترون خصماً بنسبة {low}–{high}% من سعر الوحدة كاملةً يُقتطع من حصتك، نعرض هذا النطاق. إنه تقدير وليس تقييماً، ونتحقق من الصفقات المماثلة الفعلية عند عرض وحدتك.",
    "faq.q4": "كم يكلفني البيع عبر {brand}؟",
    "faq.a4.buyer":
      "لا شيء. الإعلان مجاني، ويدفع المشتري رسومنا البالغة 2% + ضريبة القيمة المضافة عند إتمام نقل الملكية فقط. أما رسوم شهادة عدم الممانعة لدى المطوّر ورسوم النقل لدى دائرة الأراضي والأملاك فهي ضمن تكاليف الإتمام التي يتحملها المشتري.",
    "faq.a4.seller": "رسومنا 2% + ضريبة القيمة المضافة من قيمة البيع، ولا نتقاضاها إلا عند إتمام نقل الملكية. والإعلان مجاني.",

    "disclaimer.title": "تنبيه مهم",
    "disclaimer.body":
      "معلومات عامة فقط وليست استشارة قانونية. النتائج تقديرات مبنية على الأرقام التي تُدخلها وعلى المادة (11) من القانون رقم (13) لسنة 2008 في دبي، كما استُبدلت بموجب القانون رقم (19) لسنة 2020، وفق فهمنا للأحكام السارية في أكتوبر 2026، وليست تقييماً ولا عرضاً. والنسب المذكورة حدود قصوى وليست مبالغ مستحقة للمطوّر، وهي تخص دبي وحدها. وتسري المادة (11) أياً كان ما تنص عليه اتفاقيتك، لكن اتفاقيتك وقرارات المطوّر ونسبة الإنجاز الرسمية تؤثر في النتيجة، لذا راجع اتفاقيتك وتحقق من وضعك لدى دائرة الأراضي والأملاك واستشر محامياً مؤهلاً قبل أن تتوقف عن السداد.",
  },
});

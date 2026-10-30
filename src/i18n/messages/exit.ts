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
    "verdict.nocCaveat":
      "Check your developer's resale rules first: most require 30–50% of the price to be paid before they issue a resale NOC, and you've paid {pct}.",

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
      "Usually, yes, through an assignment (a resale before handover). The buyer pays you for what you've paid in and takes over the remaining instalments. The developer has to issue a NOC, and most require 30–50% of the price to be paid first; the rule depends on the developer.",
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
    "verdict.nocCaveat":
      "تحقق أولاً من شروط إعادة البيع لدى مطوّرك: يشترط معظم المطوّرين سداد ما بين 30% و50% من السعر قبل إصدار شهادة عدم الممانعة لإعادة البيع، وقد سددت {pct}.",

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
      "نعم في الغالب، عن طريق التنازل (إعادة البيع قبل التسليم). يدفع لك المشتري ما سددته ويتولى الأقساط المتبقية. ويجب أن يصدر المطوّر شهادة عدم ممانعة، ويشترط معظم المطوّرين لذلك سداد ما بين 30% و50% من السعر، وتختلف القاعدة من مطوّر إلى آخر.",
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
  zh: {
    "meta.title": "期房退出测算器",
    "meta.description":
      "无力继续支付迪拜期房的付款计划？比较继续持有单元、停止付款（2008 年第 13 号法律第 11 条允许开发商留存的部分）与转让合同三种选择。",

    "hero.eyebrow": "卖家退出测算器",
    "hero.title": "无力继续付款？比较您的三条退出路径",
    "hero.sub":
      "在错过任何一期分期款之前，输入您的数字，看看继续付款需要多少成本、停止付款后迪拜法律允许开发商留存多少，以及转让合同可能为您带来多少。",
    "hero.ctaCalc": "测算我的退出方案",
    "hero.ctaLaw": "法律怎么说",
    "hero.point.law": "依据迪拜 2008 年第 13 号法律第 11 条（2020 年替换后的条文）",
    "hero.point.live": "结果随输入实时更新",
    "hero.point.private": "您输入的内容不会被保存或发送，除非您选择通过 WhatsApp 发送给我们",

    "calc.title": "您的数字",
    "calc.sub": "请使用买卖协议（SPA）和最新付款对账单中的数字。",
    "calc.optional": "选填",
    "calc.seeResults": "查看三种方案",
    "in.price": "原始合同价",
    "in.price.hint": "即买卖协议（SPA）中的单元价格。",
    "in.paid": "已付金额",
    "in.paid.hint": "占原始合同价的 {pct}",
    "in.paid.over": "已付金额不能超过原始合同价，因此我们按原始合同价计算。",
    "in.progress": "施工进度",
    "in.progress.hint": "以开发商的最新进度更新为准。法律采用的是项目的官方完工率，即迪拜土地局（DLD）文件所载、按迪拜房地产监管局（RERA）标准计算的比例，而非您已付款的比例。请按原数填写，包括小数。",
    "in.progress.zeroHint": "如为 0%，且工程确实尚未开工，请勾选该选项：25% 的上限仅在开发商已开工后才适用。",
    "in.notStarted": "工程尚未开工，或项目已被 RERA 取消",
    "in.market": "同类单元的当前市价",
    "in.market.hint":
      "同类单元目前的转售价格：转售要价比开发商的开盘价目表更有参考价值。留空则视为与您的原始合同价相同。",
    "in.market.clear": "清除",
    "in.months": "距交房月数",
    "in.months.hint": "用于显示您仍需支付的月均金额。",
    "in.months.unit": "个月",
    "count.months.zero": "{n} 个月",
    "count.months.one": "{n} 个月",
    "count.months.two": "{n} 个月",
    "count.months.few": "{n} 个月",
    "count.months.many": "{n} 个月",
    "count.months.other": "{n} 个月",
    "in.placeholder.optional": "选填",

    "out.title": "您的三条退出路径",
    "out.empty": "请输入原始合同价以比较各项方案。",
    "out.option": "方案 {n}",

    "verdict.sell.title": "转让看起来优于停止付款",
    "verdict.sell.body": "按下方区间转让，您到手的金额将比停止付款可预期的退款多出 {low} 至 {high}。",
    "verdict.sell.bodySingle": "按下方估算转让，您到手的金额将比停止付款可预期的退款多出 {high}。",
    "verdict.maybe.title": "价格合适时，转让可能优于停止付款",
    "verdict.maybe.body":
      "若以接近全值的价格转让，您最多可比停止付款可预期的退款多留 {high}；若折让过深，则未必如此。",
    "verdict.law.title": "按这些数字，快速转让并不优于开发商解除合同时您可获得的退款",
    "verdict.law.body":
      "停止付款前，请先查阅买卖协议（SPA）并咨询法律意见：结果取决于开发商的选择和官方完工率。我们仍可以告诉您该单元可能卖到的价格。",
    "verdict.none.title": "按这些数字，两种退出方式都无法收回您的资金",
    "verdict.none.body":
      "按当前市价，您的权益已归零；若停止付款，开发商可能留存您已付的全部款项。请与继续持有至交房的方案比较，并在做决定前与我们联系。",
    "verdict.over80":
      "完工率超过 80% 时，开发商无需解除合同。它可以保留合同、留存您已付的全部款项并追讨尚欠的 {amount}，或请迪拜土地局（DLD）公开拍卖该单元以收回欠款，拍卖费用由您承担。所示退款仅在开发商选择解除合同时适用。",
    "verdict.over80Short": "完工率超过 80% 时，开发商无需解除合同：停止付款前请先查看方案 2。",
    "verdict.nocCaveat":
      "请先确认开发商的转售规定：大多数开发商要求已付款达到合同价的 30%–50% 才会出具转售无异议函（NOC），而您已付 {pct}。",

    "opt1.title": "继续付款至交房",
    "opt1.desc": "您保留单元，并支付其余全部分期款。",
    "opt1.remaining": "尚需支付开发商",
    "opt1.perMonth": "{months}内的月均金额",
    "opt1.perMonth.note": "简单平均值，您的付款计划可能在交房时安排更大的一笔款项。",
    "opt1.value": "按当前市价计算的价值",
    "opt1.gain": "相对原始合同价的账面盈亏",
    "opt1.noMarket": "填写当前市价后显示",

    "opt2.title": "停止付款",
    "opt2.desc": "您违约后，迪拜法律允许开发商采取的措施。",
    "opt2.rule": "适用规则",
    "opt2.max": "开发商最多可留存（合同价的 {pct}）",
    "opt2.max.over80": "开发商解除合同时最多可留存（合同价的 {pct}）",
    "opt2.lose": "您可能损失",
    "opt2.refund": "应退还给您的金额",
    "opt2.refund.ifCancelled": "开发商解除合同时应退还给您的金额",
    "opt2.refund.note": "合同解除后一年内，或单元转售后 60 天内，以先到者为准。",
    "opt2.refund.escrow": "在此情形下，法律要求开发商按托管账户法（2007 年第 8 号法律）的程序退还您已付的全部款项。",
    "opt2.notice": "开发商须先通知迪拜土地局（DLD），DLD 须给您 30 天时间履行义务，通常即补缴逾期款项。",
    "opt2.spa": "按您的已付金额计算。请查阅买卖协议（SPA），了解开发商是否还有其他追偿权。",
    "opt2.shortfall": "您的已付金额低于开发商最多可留存的金额。法律并未明确开发商能否向您追讨 {amount} 的差额，部分律师认为可以。请咨询法律意见。",
    "opt2.boundary": "您正处于临界值。法律的表述是“超过 80%”和“低于 60%”，因此我们将恰好 60% 和恰好 80% 归入 60%–80% 区间。我们尚未发现确认这一处理方式的判例，请向迪拜土地局（DLD）核实经认证的完工率。",

    "tier.over80": "完工率超过 80%",
    "tier.from60to80": "完工率 60% 至 80%（含两端）",
    "tier.under60": "已开工，完工率低于 60%",
    "tier.notStarted": "尚未开工，或已被 RERA 取消",
    "tier.over80.rule":
      "开发商可以选择：保留合同，留存您已付的全部款项并追讨余款；请迪拜土地局（DLD）公开拍卖该单元以收回欠款，拍卖费用由您承担；或解除合同，留存不超过合同价 40% 的款项并退还其余部分。",
    "tier.from60to80.rule": "解除合同，留存不超过合同价 40% 的款项。",
    "tier.under60.rule": "解除合同，留存不超过合同价 25% 的款项。",
    "tier.notStarted.rule":
      "如因开发商无法控制且非其自身过失的原因导致工程尚未开工，或 RERA 以最终决定取消项目，开发商须按迪拜托管账户法（2007 年第 8 号法律）的程序退还您已付的全部款项。如工程因其他原因尚未开工，请咨询法律意见。",

    "opt3.title": "通过 {brand} 转让您的合同",
    "opt3.desc": "买家买下您的权益，并接手其余分期款。",
    "opt3.position": "您的权益价值",
    "opt3.position.formula": "已付金额 +（当前市价 − 原始合同价）",
    "opt3.range": "快速出售价格区间",
    "opt3.range.note": "我们的假设：买家要想快速成交，通常会要求整套单元较当前市价折让 {low}–{high}%，而这部分折让从您的权益中扣除。此为假设，并非估值。",
    "opt3.fee": "我们向您收取的费用",
    "opt3.fee.buyer": "我们的服务费 2% + 增值税由买家支付",
    "opt3.fee.seller": "交易总价的 2% + 增值税，过户完成时支付",
    "opt3.noc": "开发商无异议函（NOC）费用（估算）",
    "opt3.noc.note": "由各开发商自行设定，出具 NOC 时确认。在我们的交易中，该费用计入买家的成交费用。",
    "opt3.net": "您可能收到",
    "opt3.takeover": "买家还将接手尚欠开发商的 {amount}。",
    "opt3.noMarket": "我们已假设当前市价与您的原始合同价相同。填写当前市价可获得更准确的估算。",
    "opt3.underwater": "按当前市价，跌幅已抵销您的全部已付款项，因此买家对该合同几乎不会出价。",
    "opt3.nocWarning":
      "大多数开发商要求已付款达到合同价的 30%–50% 才会出具转售无异议函（NOC），具体规定因开发商而异。我们将核实您开发商的政策，并告知您的可选方案。",

    "cta.list": "发布我的房源",
    "cta.whatsapp": "通过 WhatsApp 咨询",
    "cta.how": "运作方式",
    "wa.text":
      "您好 {brand}，我使用了贵方的退出测算器。我的单元：原始合同价 {price}，已付 {paid}，施工情况：{progress}。希望获得出售方面的协助。",
    "wa.progress": "已完工 {pct}%",
    "wa.notStarted": "尚未开工",

    "paths.eyebrow": "您的选择",
    "paths.title": "退出期房付款计划的三条路径",
    "paths.sub": "每条路径的代价各不相同，上方的测算器为三者给出具体数字。",
    "paths.keep.title": "继续付款",
    "paths.keep.body":
      "您保留单元以及交房时的任何盈亏，但必须支付其余全部分期款，包括付款计划中的交房款。",
    "paths.stop.title": "停止付款",
    "paths.stop.body":
      "错过分期款并不会终止合同。开发商须通过迪拜土地局（DLD）走程序，待 30 天通知期届满且 DLD 确认程序后，可视施工进度解除合同并留存部分合同价。完工率超过 80% 时，开发商也可改为保留合同并追讨余款，或将单元拍卖。如因开发商无法控制的原因导致工程尚未开工，则须向您全额退款。",
    "paths.sell.title": "转让合同",
    "paths.sell.body":
      "即合同转让：买家向您支付您已付的款项，并接手其余分期款，需取得开发商无异议函（NOC）并在迪拜土地局（DLD）办理过户。价格和时机由您决定。",

    "law.eyebrow": "法律依据",
    "law.title": "您停止付款后，开发商可以怎么做",
    "law.sub":
      "在迪拜，期房违约须通过迪拜土地局（DLD）按既定程序处理。开发商可留存多少，取决于施工进度。",
    "law.citation": "迪拜酋长国《2008 年第 13 号关于规范临时房地产登记册的法律》第 11 条，经《2020 年第 19 号法律》替换。",
    "law.reviewed": "最后更新：2026 年 10 月",
    "law.step": "第 {n} 步",
    "law.step1.title": "开发商通知迪拜土地局（DLD）",
    "law.step1.body": "使用 DLD 规定的表格，列明您尚未履行的义务。",
    "law.step2.title": "您有 30 天期限",
    "law.step2.body": "DLD 向您送达书面通知，给您 30 天时间履行买卖协议（SPA）下的义务，通常即补缴逾期款项。在可能的情况下，DLD 还会尝试促成双方和解，并以双方签署的补充协议记录。",
    "law.step3.title": "DLD 确认，开发商采取行动",
    "law.step3.body":
      "如您在 30 天内既未付款也未达成和解，DLD 将出具文件，确认开发商已遵守程序，并载明按 RERA 标准计算的完工率。开发商随后可依据该完工率采取行动，无需诉诸法院或仲裁。如您认为开发商未依法行事，仍可自行提起诉讼或仲裁。",
    "law.tiers.title": "按施工进度划分：开发商可以或必须采取的措施",
    "law.col.progress": "施工进度",
    "law.col.options": "法律允许或要求的措施",
    "law.refund": "开发商解除合同并留存部分款项时，须在合同解除后一年内，或将单元转售给其他买家后 60 天内退还其余款项，以先到者为准。",
    "law.base": "25% 和 40% 的上限按买卖协议（SPA）中的单元价格（合同价）计算，而非按您的已付金额计算。",
    "law.maximum": "25% 和 40% 是开发商解除合同时最多可留存的比例，而非其自动应得的金额。完工率以 DLD 文件所载、按 RERA 标准计算的项目官方完工率为准。",
    "law.before2020": "2020 年修订前，如因开发商无法控制的原因导致工程尚未开工，开发商可留存已付款项的最多 30%。该规定已不再适用：开发商现在必须全额退款。",
    "law.badge.ifCancelled": "若解除合同",
    "law.source": "在迪拜立法门户网站阅读载有第 11 条的《2020 年第 19 号法律》",

    "faq.eyebrow": "常见问题",
    "faq.title": "卖家常问的问题",
    "faq.q1": "我错过一期分期款，开发商能解除合同吗？",
    "faq.a1":
      "不会立即解除。开发商须先通知迪拜土地局（DLD），DLD 会给您 30 天时间付款或和解。只有在此之后并经 DLD 确认，开发商才能采取行动，而其可留存多少取决于施工进度。",
    "faq.q2": "付款尚未完成，我可以出售单元吗？",
    "faq.a2":
      "通常可以，通过合同转让（交房前转售）的方式。买家向您支付您已付的款项，并接手其余分期款。开发商须出具无异议函（NOC），大多数开发商要求已付款先达到合同价的 30%–50%，具体规定因开发商而异。",
    "faq.q3": "我的权益价值是如何估算的？",
    "faq.a3":
      "我们以您的已付金额为基础，加上或减去同类单元当前市价与您原始合同价之间的差额。快速出售通常需要更有吸引力的价格：买家希望整套单元折让 {low}–{high}%，而折让部分从您的权益中扣除，因此我们显示该区间。这只是估算，并非估值；您发布房源后，我们会核对真实的可比成交。",
    "faq.q4": "通过 {brand} 出售需要支付什么费用？",
    "faq.a4.buyer":
      "无需任何费用。发布房源免费，我们的服务费 2% + 增值税由买家支付，且仅在过户完成时收取。开发商的 NOC 费用和迪拜土地局（DLD）的过户费属于买家的成交费用。",
    "faq.a4.seller": "我们的服务费为交易总价的 2% + 增值税，仅在过户完成时收取。发布房源免费。",

    "disclaimer.title": "重要提示",
    "disclaimer.body":
      "本页内容仅为一般信息，不构成法律意见。测算结果为估算值，基于您输入的数字以及迪拜 2008 年第 13 号法律第 11 条（经 2020 年第 19 号法律替换），并依据我们对 2026 年 10 月现行规定的理解；不构成估值或要约。所述比例为上限，并非开发商应得的金额，且仅适用于迪拜。无论您的买卖协议（SPA）如何约定，第 11 条均适用，但您的买卖协议、开发商的选择以及官方完工率仍会影响最终结果。停止付款前，请查阅您的买卖协议，向迪拜土地局（DLD）核实您的情况，并咨询具备资质的律师。",
  },
});

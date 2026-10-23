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
    "hero.point.law": "Based on Article 11 of Dubai Law No. (13) of 2008",
    "hero.point.live": "Results update as you type",
    "hero.point.private": "Nothing you enter is saved or sent",

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
    "in.progress.hint": "Your developer's latest update. The law uses the official completion percentage, calculated under RERA's rules.",
    "in.notStarted": "Construction hasn't started",
    "in.market": "Today's price for a similar unit",
    "in.market.hint":
      "What a comparable unit costs today, from the developer's price list or resale asking prices. Left blank, we assume it equals your purchase price.",
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
    "verdict.law.title": "On these numbers, a quick sale doesn't beat the legal refund",
    "verdict.law.body":
      "Read your SPA and take legal advice before you stop paying: the result depends on the developer's choice and the official completion percentage. We can still tell you what your unit could fetch.",
    "verdict.none.title": "On these numbers, neither exit gets your money back",
    "verdict.none.body":
      "At today's price your equity is wiped out, and if you stop paying the developer may keep everything you've paid. Compare keeping the unit to handover, and talk to us before you decide.",
    "verdict.over80":
      "Above 80% complete the developer may also refuse to cancel and claim the {amount} still owed — stopping payments doesn't end the debt.",

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
    "opt2.lose": "You could lose",
    "opt2.refund": "Refund due to you",
    "opt2.refund.note": "Within one year of termination, or 60 days after the unit is resold — whichever comes first.",
    "opt2.refund.escrow": "In this case the law requires the developer to refund everything you've paid.",
    "opt2.notice": "First the developer must notify DLD, and DLD must give you 30 days to pay what's due.",
    "opt2.spa": "Shown against what you've paid. Check your SPA for any further claim.",

    "tier.over80": "Above 80% complete",
    "tier.from60to80": "60% – 80% complete",
    "tier.under60": "Works started, below 60%",
    "tier.notStarted": "Works not started",
    "tier.over80.rule":
      "Keep the contract and claim the balance, have DLD sell the unit at public auction, or cancel and keep up to 40% of the price.",
    "tier.from60to80.rule": "Cancel the contract and keep up to 40% of the price.",
    "tier.under60.rule": "Cancel the contract and keep up to 25% of the price.",
    "tier.notStarted.rule":
      "The developer must refund everything you've paid, where works haven't started for reasons beyond its control or RERA has cancelled the project.",

    "opt3.title": "Sell your contract through {brand}",
    "opt3.desc": "A buyer pays you for your equity and takes over the remaining instalments.",
    "opt3.position": "Value of your position",
    "opt3.position.formula": "Paid so far + (today's price − your price)",
    "opt3.range": "Quick-sale range",
    "opt3.range.note": "Our assumption: a fast sale at {low}–{high}% of the position's value. Not a valuation.",
    "opt3.fee": "Our fee to you",
    "opt3.fee.buyer": "The buyer pays our 2% + VAT",
    "opt3.fee.seller": "2% + VAT of the sale value, on completion",
    "opt3.noc": "Developer NOC fee (estimate)",
    "opt3.noc.note": "Set by each developer and confirmed when the NOC is issued. In our deals it's part of the buyer's closing costs.",
    "opt3.net": "You could receive",
    "opt3.takeover": "The buyer also takes over the {amount} still owed to the developer.",
    "opt3.noMarket": "We've assumed today's price equals your purchase price. Add today's price for a sharper estimate.",
    "opt3.underwater": "At today's price the drop wipes out what you've paid, so a buyer would pay little or nothing for the contract.",
    "opt3.nocWarning": "Many developers only issue a resale NOC after 30–40% is paid. We'll check your developer's policy and tell you your options.",

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
      "Missing instalments doesn't end the contract. The developer goes through DLD and, once the 30-day notice runs out, may — depending on construction progress — keep the contract and claim the balance, or cancel it and keep part of the price.",
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
    "law.step2.body": "DLD notifies you and gives you 30 days to pay what's due. It may also try to settle the matter between you.",
    "law.step3.title": "DLD confirms, the developer acts",
    "law.step3.body":
      "If you don't pay, DLD issues a document confirming the developer followed the procedure and stating the completion percentage. The developer can then act without a court ruling, according to that percentage.",
    "law.tiers.title": "What the developer may or must do, by construction progress",
    "law.col.progress": "Construction progress",
    "law.col.options": "What the law allows or requires",
    "law.refund": "Anything above the developer's share must be refunded within one year of termination, or within 60 days of the unit's resale, whichever is earlier.",
    "law.base": "The 25% and 40% limits are percentages of the unit price in your SPA — not of the amount you've paid.",
    "law.maximum": "These are maximums. Your SPA may agree less, and completion is the official percentage, calculated under RERA's rules.",
    "law.before2020": "Before the 2020 amendment, a developer could keep up to 30% of the amounts paid when works hadn't started. That is no longer the rule.",
    "law.source": "Read the law on the Dubai Legislation Portal",

    "faq.eyebrow": "FAQ",
    "faq.title": "Questions sellers ask",
    "faq.q1": "Can the developer cancel my unit if I miss one instalment?",
    "faq.a1":
      "Not straight away. The developer must first notify the Dubai Land Department, which gives you 30 days to pay. Only after that, and DLD's confirmation, can the developer act — and how much it may keep depends on construction progress.",
    "faq.q2": "Can I sell my unit before I've finished paying?",
    "faq.a2":
      "Usually, yes, through an assignment (a resale before handover). The buyer pays you for what you've paid in and takes over the remaining instalments. The developer has to issue a NOC, and many only do so once 30–40% of the price is paid.",
    "faq.q3": "How do you estimate what my position is worth?",
    "faq.a3":
      "We take what you've paid and add or subtract the difference between today's price for a similar unit and your purchase price. A quick sale usually needs a sharper price, so we show {low}–{high}% of that figure. It's an estimate, not a valuation — we check real comparables when you list.",
    "faq.q4": "What does it cost me to sell through {brand}?",
    "faq.a4.buyer":
      "Nothing. Listing is free and the buyer pays our 2% + VAT, only when the transfer completes. The developer's NOC fee and DLD's transfer fee are part of the buyer's closing costs.",
    "faq.a4.seller": "Our fee is 2% + VAT of the sale value, charged only when the transfer completes. Listing is free.",

    "disclaimer.title": "Important",
    "disclaimer.body":
      "General information only, not legal advice. Results are estimates based on the figures you enter and on Article 11 of Law No. (13) of 2008 as amended — they are not a valuation or an offer. Your SPA may set different terms and developer policies differ, so check your SPA and speak to a qualified lawyer before you stop paying.",
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
    "hero.point.law": "مبنية على المادة 11 من القانون رقم (13) لسنة 2008 في دبي",
    "hero.point.live": "تتحدّث النتائج فور إدخال الأرقام",
    "hero.point.private": "لا نحفظ ما تُدخله ولا نرسله",

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
    "in.progress.hint": "وفق آخر تحديث من المطوّر. يعتمد القانون نسبة الإنجاز الرسمية المحتسبة وفق معايير مؤسسة التنظيم العقاري (ريرا).",
    "in.notStarted": "لم تبدأ أعمال البناء بعد",
    "in.market": "السعر الحالي لوحدة مماثلة",
    "in.market.hint":
      "سعر وحدة مماثلة اليوم، من قائمة أسعار المطوّر أو أسعار إعادة البيع المعروضة. إن تركته فارغاً نفترض أنه يساوي سعر شرائك.",
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
    "verdict.law.title": "وفق هذه الأرقام، لا يتفوق البيع السريع على ما يُرد إليك بموجب القانون",
    "verdict.law.body":
      "راجع اتفاقية البيع والشراء واستشر محامياً قبل أن تتوقف عن السداد، فالنتيجة تتوقف على قرار المطوّر ونسبة الإنجاز الرسمية. ويسعدنا مع ذلك أن نخبرك بالسعر الذي قد تحققه وحدتك.",
    "verdict.none.title": "وفق هذه الأرقام، لا يعيد إليك أيّ من الخيارين أموالك",
    "verdict.none.body":
      "بسعر اليوم تتلاشى قيمة حصتك، وإن توقفت عن السداد فقد يحتفظ المطوّر بكل ما دفعته. قارن ذلك بمواصلة السداد حتى التسليم، وتحدّث معنا قبل أن تقرر.",
    "verdict.over80":
      "إذا تجاوزت نسبة الإنجاز 80% فيحق للمطوّر أيضاً الإبقاء على العقد ومطالبتك بالمبلغ المتبقي البالغ {amount}، فالتوقف عن السداد لا يُسقط الدين.",

    "opt1.title": "مواصلة السداد حتى التسليم",
    "opt1.desc": "تحتفظ بالوحدة وتسدّد جميع الأقساط المتبقية.",
    "opt1.remaining": "المتبقي للمطوّر",
    "opt1.perMonth": "المتوسط الشهري على مدى {months}",
    "opt1.perMonth.note": "متوسط بسيط، وقد تحمّل خطتك دفعة أكبر عند التسليم.",
    "opt1.value": "القيمة بسعر اليوم",
    "opt1.gain": "الربح أو الخسارة الدفترية مقارنة بسعرك",
    "opt1.noMarket": "أضف السعر الحالي لرؤية ذلك",

    "opt2.title": "التوقف عن السداد",
    "opt2.desc": "ما يجيزه القانون في دبي للمطوّر بعد تخلفك عن السداد.",
    "opt2.rule": "القاعدة المطبّقة",
    "opt2.max": "أقصى ما يحق للمطوّر الاحتفاظ به ({pct} من السعر)",
    "opt2.lose": "ما قد تخسره",
    "opt2.refund": "المبلغ المستحق ردّه إليك",
    "opt2.refund.note": "خلال سنة من فسخ العقد، أو خلال 60 يوماً من إعادة بيع الوحدة، أيهما أسبق.",
    "opt2.refund.escrow": "في هذه الحالة يُلزم القانون المطوّر بردّ كامل ما دفعته.",
    "opt2.notice": "على المطوّر أولاً إخطار دائرة الأراضي والأملاك، وعلى الدائرة أن تمنحك مهلة 30 يوماً لسداد المستحق.",
    "opt2.spa": "محسوبة مقارنة بما دفعته. راجع اتفاقية البيع والشراء لمعرفة أي مطالبات أخرى.",

    "tier.over80": "نسبة الإنجاز أعلى من 80%",
    "tier.from60to80": "نسبة الإنجاز بين 60% و80%",
    "tier.under60": "بدأت الأعمال، والإنجاز أقل من 60%",
    "tier.notStarted": "لم تبدأ الأعمال",
    "tier.over80.rule":
      "الإبقاء على العقد والمطالبة بالمتبقي، أو طلب بيع الوحدة بالمزاد العلني عبر الدائرة، أو فسخ العقد والاحتفاظ بما لا يزيد على 40% من السعر.",
    "tier.from60to80.rule": "فسخ العقد والاحتفاظ بما لا يزيد على 40% من السعر.",
    "tier.under60.rule": "فسخ العقد والاحتفاظ بما لا يزيد على 25% من السعر.",
    "tier.notStarted.rule":
      "على المطوّر ردّ كامل ما دفعته، إذا لم تبدأ الأعمال لأسباب خارجة عن إرادته أو ألغت ريرا المشروع.",

    "opt3.title": "بيع عقدك عبر {brand}",
    "opt3.desc": "يدفع لك المشتري قيمة حصتك ويتولى سداد الأقساط المتبقية.",
    "opt3.position": "قيمة حصتك",
    "opt3.position.formula": "المدفوع حتى الآن + (السعر الحالي − سعرك)",
    "opt3.range": "نطاق البيع السريع",
    "opt3.range.note": "افتراض منّا: بيع سريع بنسبة {low}–{high}% من قيمة الحصة. وليس تقييماً.",
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
      "كثير من المطوّرين لا يصدرون شهادة عدم ممانعة لإعادة البيع إلا بعد سداد 30–40% من السعر. سنتحقق من سياسة مطوّرك ونوضح لك خياراتك.",

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
      "التأخر عن الأقساط لا يُنهي العقد. يلجأ المطوّر إلى دائرة الأراضي والأملاك، وبعد انقضاء مهلة الثلاثين يوماً يجوز له، بحسب نسبة إنجاز البناء، الإبقاء على العقد والمطالبة بالمتبقي، أو فسخه والاحتفاظ بجزء من السعر.",
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
    "law.step2.body": "تُخطرك الدائرة وتمنحك 30 يوماً لسداد المستحق، وقد تسعى أيضاً إلى تسوية الأمر بينكما.",
    "law.step3.title": "تؤكد الدائرة، فيتصرف المطوّر",
    "law.step3.body":
      "إن لم تسدّد، تُصدر الدائرة وثيقة تؤكد التزام المطوّر بالإجراءات وتبيّن نسبة الإنجاز، فيحق له عندئذ التصرف دون حكم قضائي، وفق تلك النسبة.",
    "law.tiers.title": "ما يجوز للمطوّر فعله أو يلزمه، بحسب نسبة الإنجاز",
    "law.col.progress": "نسبة إنجاز البناء",
    "law.col.options": "ما يجيزه القانون أو يُلزم به",
    "law.refund": "يجب ردّ ما يزيد على حصة المطوّر خلال سنة من فسخ العقد، أو خلال 60 يوماً من إعادة بيع الوحدة، أيهما أسبق.",
    "law.base": "حدّا 25% و40% نسبتان من سعر الوحدة في اتفاقية البيع والشراء، وليسا من المبلغ الذي دفعته.",
    "law.maximum": "هذه حدود قصوى، وقد تنص اتفاقيتك على أقل منها. ونسبة الإنجاز المعتمدة هي النسبة الرسمية المحتسبة وفق معايير ريرا.",
    "law.before2020": "قبل تعديل عام 2020 كان يحق للمطوّر الاحتفاظ بما يصل إلى 30% من المبالغ المدفوعة إذا لم تبدأ الأعمال، ولم تعد هذه هي القاعدة.",
    "law.source": "اقرأ القانون على بوابة دبي التشريعية",

    "faq.eyebrow": "أسئلة شائعة",
    "faq.title": "أسئلة يطرحها البائعون",
    "faq.q1": "هل يحق للمطوّر إلغاء وحدتي إذا تأخرت عن قسط واحد؟",
    "faq.a1":
      "ليس فوراً. على المطوّر أولاً إخطار دائرة الأراضي والأملاك، التي تمنحك 30 يوماً للسداد. ولا يحق له التصرف إلا بعد ذلك وبعد تأكيد الدائرة، ويتوقف ما يحق له الاحتفاظ به على نسبة إنجاز البناء.",
    "faq.q2": "هل يمكنني بيع وحدتي قبل إكمال السداد؟",
    "faq.a2":
      "نعم في الغالب، عن طريق التنازل (إعادة البيع قبل التسليم). يدفع لك المشتري ما سددته ويتولى الأقساط المتبقية. ويجب أن يصدر المطوّر شهادة عدم ممانعة، وكثير من المطوّرين لا يصدرونها إلا بعد سداد 30–40% من السعر.",
    "faq.q3": "كيف تقدّرون قيمة حصتي؟",
    "faq.a3":
      "نبدأ بما دفعته، ثم نضيف أو نطرح الفرق بين السعر الحالي لوحدة مماثلة وسعر شرائك. ولأن البيع السريع يتطلب عادةً سعراً أكثر تنافسية، نعرض {low}–{high}% من هذا الرقم. إنه تقدير وليس تقييماً، ونتحقق من الصفقات المماثلة الفعلية عند عرض وحدتك.",
    "faq.q4": "كم يكلفني البيع عبر {brand}؟",
    "faq.a4.buyer":
      "لا شيء. الإعلان مجاني، ويدفع المشتري رسومنا البالغة 2% + ضريبة القيمة المضافة عند إتمام نقل الملكية فقط. أما رسوم شهادة عدم الممانعة لدى المطوّر ورسوم النقل لدى دائرة الأراضي والأملاك فهي ضمن تكاليف الإتمام التي يتحملها المشتري.",
    "faq.a4.seller": "رسومنا 2% + ضريبة القيمة المضافة من قيمة البيع، ولا نتقاضاها إلا عند إتمام نقل الملكية. والإعلان مجاني.",

    "disclaimer.title": "تنبيه مهم",
    "disclaimer.body":
      "معلومات عامة فقط وليست استشارة قانونية. النتائج تقديرات مبنية على الأرقام التي تُدخلها وعلى المادة (11) من القانون رقم (13) لسنة 2008 وتعديلاته، وليست تقييماً ولا عرضاً. قد تنص اتفاقية البيع والشراء على شروط مختلفة وتختلف سياسات المطوّرين، لذا راجع اتفاقيتك واستشر محامياً مؤهلاً قبل أن تتوقف عن السداد.",
  },
});

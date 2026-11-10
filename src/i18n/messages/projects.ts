import { defineMessages } from "../define";

// Project pages: /projects (every project with a resale deal) and /projects/<slug> (its deals, how buying a resale there
// works, the FAQ), the link from a deal page to its project, and the footer link. Fee rates arrive formatted from FEES
// ({commission}, {vat}, {dld}); the fee is due when the transfer completes, never worded as "only" then. "Below the
// original price": the sale value (asking price + balance still owed to the developer) under the SPA price.
export default defineMessages({
  en: {
    projects: "Projects",
    // In a sentence, for a project with several developers (or one not stated).
    theDeveloper: "the developer",
    // A handover range: "Q4 2027 – Q2 2028".
    range: "{from} – {to}",
    // The page's title and H1. "Below": at least one of its units is 1% or more below the original price.
    titleBelow: "{project} resale: units below the original price",
    titleNeutral: "{project} resale: off-plan units for sale",

    "meta.units.one": "{count} resale unit in {project}.",
    "meta.units.many": "{count} resale units in {project}.",
    "meta.byIn": "By {developer} in {community}.",
    "meta.by": "By {developer}.",
    "meta.in": "In {community}.",
    "meta.handover": "Handover {handover}.",
    "meta.upTo": "Up to {pct}% below the original price.",

    breadcrumb: "Breadcrumb",
    intro:
      "Owners in {project} are reselling these off-plan units. You pay the seller their asking price and take over the rest of the payment plan; each card shows the cash you need on transfer day.",
    "facts.developer": "Developer",
    "facts.community": "Community",
    "facts.handover": "Handover",
    "facts.units": "Resale units",
    "facts.belowOriginal": "Below the original price",
    "facts.upTo": "Up to {pct}%",

    "deals.title": "Resale units in {project}",
    "deals.more": "Showing the first {shown} of {total} units.",
    "deals.moreLink": "See them all on the deals page",

    "how.title": "How buying a resale in {project} works",
    "how.sub": "Our RERA-licensed transactions team handles each step with you.",
    "how.plan.title": "Take over the payment plan",
    "how.plan.body":
      "You pay the seller their asking price, which is their equity in the unit, and continue the remaining instalments to {developer} on the original plan. The sale value is the asking price plus the balance still owed to the developer.",
    "how.noc.title": "Developer NOC",
    "how.noc.body":
      "Before the transfer, {developer} issues a No Objection Certificate (NOC). Most developers require a minimum share of the price to be paid first, often 30–50%. We check this for each unit and apply for the NOC for you; the developer sets its own NOC and admin fee.",
    "how.transfer.title": "DLD transfer",
    "how.transfer.body":
      "Settlement takes place at a DLD trustee office: the seller's asking price is paid by manager's cheque at the moment ownership moves to you, never before the NOC. You pay the DLD transfer fee of {dld} of the sale value plus registration and trustee office fees, and DLD issues a new Oqood in your name.",
    "how.fee.title": "Our fee: {commission} + VAT, on completion",
    "how.fee.body":
      "{commission} of the sale value plus {vat} VAT on the fee, paid by you when the transfer completes. Nothing upfront, and no fee if the transfer doesn't complete.",
    // When the seller pays our fee (FEES.payer).
    "how.fee.bodySeller":
      "The seller pays our {commission} of the sale value plus {vat} VAT on the fee when the transfer completes. You pay us nothing, upfront or later.",

    // The FAQ: the same text on the page and in its FAQPage structured data.
    "faq.title": "Questions about buying a resale",
    "faq.cash.q": "How much cash do I need on transfer day?",
    "faq.cash.a":
      "On transfer day you pay the seller's asking price, our {commission} fee plus VAT, the DLD transfer fee of {dld} of the sale value, the DLD registration and trustee office fees and the NOC fee of {developer}, plus any overdue instalments the developer wants cleared before the NOC. Each deal page shows its own estimate.",
    "faq.cash.aSeller":
      "On transfer day you pay the seller's asking price, the DLD transfer fee of {dld} of the sale value, the DLD registration and trustee office fees and the NOC fee of {developer}, plus any overdue instalments the developer wants cleared before the NOC. Each deal page shows its own estimate.",
    "faq.plan.q": "What does taking over the payment plan mean?",
    "faq.plan.a":
      "You take the seller's place in their contract with {developer}: you pay them their asking price for the equity they have paid in, and the remaining instalments continue to the developer on the original schedule, now in your name.",
    "faq.time.q": "How long do the NOC and the transfer take?",
    "faq.time.a":
      "Typically 2–5 weeks from an accepted offer to the new Oqood in your name, depending on how quickly {developer} issues the NOC.",
    "faq.fee.q": "What is your fee?",
    "faq.fee.a":
      "{commission} of the sale value plus {vat} VAT on the fee, paid by the buyer when the transfer completes. Nothing is paid to us upfront, and there is no fee if the transfer doesn't complete.",
    "faq.fee.aSeller":
      "Buyers pay us nothing: the seller pays our {commission} of the sale value plus {vat} VAT on the fee when the transfer completes.",
    "faq.below.q": "What does “below the original price” mean?",
    "faq.below.a":
      "It compares the sale value, which is the seller's asking price plus the balance still owed to the developer, with the price the first buyer signed with the developer in the SPA. The percentage on each card is how much lower the sale value is.",

    "cta.title": "Looking for another unit?",
    "cta.body": "Browse every off-plan resale in Dubai, or see the other projects with units for sale.",
    "cta.allProjects": "All projects",

    // On a deal page, under its title: the project's page.
    dealLink: "All resale units in {project} ({n})",

    "index.meta.title": "Dubai off-plan projects with resale deals",
    "index.meta.description":
      "Every Dubai off-plan project with resale units on {brand}: developer, community, handover and how far below the original price the units sell.",
    "index.eyebrow": "Off-plan resale",
    "index.title": "Projects with resale deals",
    "index.subtitle":
      "Dubai off-plan projects where owners are reselling units, often below the original price. Pick a project to see its units and how buying a resale there works.",
    "index.count.one": "{count} project",
    "index.count.many": "{count} projects",
    "index.empty": "No project has a resale unit listed right now. New deals are posted every week.",
    "card.units.one": "{n} unit",
    "card.units.many": "{n} units",
    "card.upTo": "Up to {pct}% below the original price",
    "card.handover": "Handover {when}",
    "card.cta": "See the units",
  },
  ar: {
    projects: "المشاريع",
    theDeveloper: "المطوّر",
    range: "⁨{from}⁩ – ⁨{to}⁩",
    titleBelow: "⁨{project}⁩ لإعادة البيع: وحدات بأقل من السعر الأصلي",
    titleNeutral: "⁨{project}⁩ لإعادة البيع: وحدات على الخارطة متاحة الآن",

    "meta.units.one": "وحدة واحدة لإعادة البيع في ⁨{project}⁩.",
    "meta.units.many": "عدد وحدات إعادة البيع في ⁨{project}⁩: ⁨{count}⁩.",
    "meta.byIn": "من تطوير ⁨{developer}⁩ في ⁨{community}⁩.",
    "meta.by": "من تطوير ⁨{developer}⁩.",
    "meta.in": "في ⁨{community}⁩.",
    "meta.handover": "التسليم: {handover}.",
    "meta.upTo": "بأقل من السعر الأصلي بنسبة تصل إلى ⁨{pct}%⁩.",

    breadcrumb: "مسار التنقل",
    intro:
      "يعيد ملاك في ⁨{project}⁩ بيع هذه الوحدات على الخارطة. تدفع للبائع السعر الذي يطلبه وتتولى ما تبقى من خطة الدفع، وتعرض كل بطاقة المبلغ النقدي الذي تحتاجه يوم نقل الملكية.",
    "facts.developer": "المطوّر",
    "facts.community": "المنطقة",
    "facts.handover": "التسليم",
    "facts.units": "وحدات إعادة البيع",
    "facts.belowOriginal": "أقل من السعر الأصلي",
    "facts.upTo": "حتى ⁨{pct}%⁩",

    "deals.title": "وحدات إعادة البيع في ⁨{project}⁩",
    "deals.more": "نعرض هنا أول ⁨{shown}⁩ من أصل ⁨{total}⁩ وحدة.",
    "deals.moreLink": "اطّلع عليها كلها في صفحة الصفقات",

    "how.title": "كيف تشتري وحدة لإعادة البيع في ⁨{project}⁩",
    "how.sub": "يتولى فريق المعاملات لدينا، المرخّص من ريرا، كل خطوة معك.",
    "how.plan.title": "تولّي خطة الدفع",
    "how.plan.body":
      "تدفع للبائع السعر الذي يطلبه، وهو حصته في الوحدة، وتواصل سداد الأقساط المتبقية إلى ⁨{developer}⁩ وفق الخطة الأصلية. وقيمة البيع هي السعر المطلوب مضافاً إليه الرصيد المتبقي المستحق للمطوّر.",
    "how.noc.title": "شهادة عدم الممانعة من المطوّر",
    "how.noc.body":
      "قبل نقل الملكية، يُصدر ⁨{developer}⁩ شهادة عدم الممانعة. ويشترط معظم المطوّرين سداد حد أدنى من السعر أولاً، يتراوح غالباً بين 30% و50%. نتحقق من ذلك لكل وحدة ونتقدّم بطلب الشهادة نيابةً عنك، ويحدد المطوّر رسوم الشهادة ورسومه الإدارية.",
    "how.transfer.title": "نقل الملكية لدى دائرة الأراضي والأملاك",
    "how.transfer.body":
      "تتم التسوية في مكتب أمين التسجيل التابع لدائرة الأراضي والأملاك: يُدفع السعر الذي يطلبه البائع بشيك مدير في لحظة انتقال الملكية إليك، ولا يحدث ذلك أبداً قبل صدور شهادة عدم الممانعة. وتدفع رسوم نقل الملكية بنسبة ⁨{dld}⁩ من قيمة البيع إضافةً إلى رسوم التسجيل ومكتب أمين التسجيل، ثم تُصدر الدائرة شهادة أوقود جديدة باسمك.",
    "how.fee.title": "رسومنا: ⁨{commission}⁩ مع ضريبة القيمة المضافة، عند الإتمام",
    "how.fee.body":
      "⁨{commission}⁩ من قيمة البيع مضافاً إليها ضريبة القيمة المضافة بنسبة ⁨{vat}⁩ على الرسوم، تدفعها عند إتمام نقل الملكية. لا شيء مقدّماً، ولا رسوم إذا لم يكتمل نقل الملكية.",
    "how.fee.bodySeller":
      "يدفع البائع رسومنا البالغة ⁨{commission}⁩ من قيمة البيع مضافاً إليها ضريبة القيمة المضافة بنسبة ⁨{vat}⁩ على الرسوم عند إتمام نقل الملكية. ولا تدفع لنا شيئاً، لا مقدّماً ولا لاحقاً.",

    "faq.title": "أسئلة حول شراء وحدة لإعادة البيع",
    "faq.cash.q": "ما المبلغ النقدي الذي أحتاجه يوم نقل الملكية؟",
    "faq.cash.a":
      "تدفع يوم نقل الملكية السعر الذي يطلبه البائع، ورسومنا البالغة ⁨{commission}⁩ مع ضريبة القيمة المضافة، ورسوم نقل الملكية لدى دائرة الأراضي والأملاك بنسبة ⁨{dld}⁩ من قيمة البيع، ورسوم التسجيل ومكتب أمين التسجيل، ورسوم شهادة عدم الممانعة لدى ⁨{developer}⁩، إضافةً إلى أي أقساط متأخرة يشترط المطوّر سدادها قبل إصدار الشهادة. وتعرض صفحة كل صفقة تقديرها الخاص لهذا المبلغ.",
    "faq.cash.aSeller":
      "تدفع يوم نقل الملكية السعر الذي يطلبه البائع، ورسوم نقل الملكية لدى دائرة الأراضي والأملاك بنسبة ⁨{dld}⁩ من قيمة البيع، ورسوم التسجيل ومكتب أمين التسجيل، ورسوم شهادة عدم الممانعة لدى ⁨{developer}⁩، إضافةً إلى أي أقساط متأخرة يشترط المطوّر سدادها قبل إصدار الشهادة. وتعرض صفحة كل صفقة تقديرها الخاص لهذا المبلغ.",
    "faq.plan.q": "ماذا يعني تولّي خطة الدفع؟",
    "faq.plan.a":
      "تحلّ محل البائع في عقده مع ⁨{developer}⁩: تدفع له السعر الذي يطلبه مقابل حصته التي سدّدها، وتستمر الأقساط المتبقية للمطوّر وفق الجدول الأصلي، ولكن باسمك.",
    "faq.time.q": "كم تستغرق شهادة عدم الممانعة ونقل الملكية؟",
    "faq.time.a":
      "عادةً من أسبوعين إلى خمسة أسابيع من قبول العرض حتى إصدار شهادة أوقود الجديدة باسمك، بحسب سرعة ⁨{developer}⁩ في إصدار شهادة عدم الممانعة.",
    "faq.fee.q": "ما رسومكم؟",
    "faq.fee.a":
      "⁨{commission}⁩ من قيمة البيع مضافاً إليها ضريبة القيمة المضافة بنسبة ⁨{vat}⁩ على الرسوم، يدفعها المشتري عند إتمام نقل الملكية. لا يُدفع لنا أي مبلغ مقدّماً، ولا رسوم إذا لم يكتمل نقل الملكية.",
    "faq.fee.aSeller":
      "لا يدفع المشتري لنا شيئاً: يدفع البائع رسومنا البالغة ⁨{commission}⁩ من قيمة البيع مضافاً إليها ضريبة القيمة المضافة بنسبة ⁨{vat}⁩ على الرسوم عند إتمام نقل الملكية.",
    "faq.below.q": "ماذا يعني «أقل من السعر الأصلي»؟",
    "faq.below.a":
      "يعني مقارنة قيمة البيع، أي السعر الذي يطلبه البائع مضافاً إليه الرصيد المتبقي المستحق للمطوّر، بالسعر الذي وقّعه المشتري الأول مع المطوّر في اتفاقية البيع والشراء. والنسبة الظاهرة على كل بطاقة هي مقدار انخفاض قيمة البيع عن ذلك السعر.",

    "cta.title": "تبحث عن وحدة أخرى؟",
    "cta.body": "تصفّح كل وحدات إعادة البيع على الخارطة في دبي، أو اطّلع على المشاريع الأخرى التي تضم وحدات معروضة.",
    "cta.allProjects": "كل المشاريع",

    dealLink: "كل وحدات إعادة البيع في ⁨{project}⁩ (⁨{n}⁩)",

    "index.meta.title": "مشاريع دبي على الخارطة التي تضم وحدات لإعادة البيع",
    "index.meta.description":
      "كل مشاريع دبي على الخارطة التي تضم وحدات معروضة لإعادة البيع على ⁨{brand}⁩: المطوّر والمنطقة وموعد التسليم، ومدى انخفاض أسعار الوحدات عن السعر الأصلي.",
    "index.eyebrow": "إعادة بيع الوحدات على الخارطة",
    "index.title": "مشاريع تضم وحدات لإعادة البيع",
    "index.subtitle":
      "مشاريع على الخارطة في دبي يعيد فيها ملاكها بيع وحداتهم، وغالباً بأقل من السعر الأصلي. اختر مشروعاً لترى وحداته وكيف يتم شراء وحدة لإعادة البيع فيه.",
    "index.count.one": "مشروع واحد",
    "index.count.many": "عدد المشاريع: ⁨{count}⁩",
    "index.empty": "لا توجد حالياً وحدات معروضة لإعادة البيع في أي مشروع. ننشر صفقات جديدة كل أسبوع.",
    "card.units.one": "وحدة واحدة",
    "card.units.many": "عدد الوحدات: ⁨{n}⁩",
    "card.upTo": "أقل من السعر الأصلي بنسبة تصل إلى ⁨{pct}%⁩",
    "card.handover": "التسليم: {when}",
    "card.cta": "عرض الوحدات",
  },
  zh: {
    projects: "项目",
    theDeveloper: "开发商",
    range: "{from} 至 {to}",
    titleBelow: "{project} 转售：低于原始合同价的单元",
    titleNeutral: "{project} 转售：在售期房单元",

    "meta.units.one": "{project} 有 {count} 套转售单元。",
    "meta.units.many": "{project} 有 {count} 套转售单元。",
    "meta.byIn": "开发商为 {developer}，位于 {community}。",
    "meta.by": "开发商为 {developer}。",
    "meta.in": "位于 {community}。",
    "meta.handover": "交房时间：{handover}。",
    "meta.upTo": "较原始合同价最多低 {pct}%。",

    breadcrumb: "导航路径",
    intro:
      "{project} 的业主正在转售以下期房单元。您向卖家支付其要价，并承接剩余付款计划；每张卡片均显示过户当天所需现金。",
    "facts.developer": "开发商",
    "facts.community": "社区",
    "facts.handover": "交房",
    "facts.units": "转售单元",
    "facts.belowOriginal": "低于原始合同价",
    "facts.upTo": "最多 {pct}%",

    "deals.title": "{project} 的转售单元",
    "deals.more": "此处显示前 {shown} 套，共 {total} 套。",
    "deals.moreLink": "在房源列表页查看全部",

    "how.title": "如何在 {project} 购买转售单元",
    "how.sub": "持有迪拜房地产监管局（RERA）牌照的交易团队与您一起办理每一步。",
    "how.plan.title": "承接付款计划",
    "how.plan.body":
      "您向卖家支付其要价（即其在该单元的已付权益），并按原付款计划继续向 {developer} 支付剩余分期款。交易总价为卖家要价加上尚欠开发商的余款。",
    "how.noc.title": "开发商无异议函（NOC）",
    "how.noc.body":
      "过户前，{developer} 需出具无异议函（NOC）。多数开发商要求先付清一定比例的房价，通常为 30%–50%。我们会逐套核查，并为您申请 NOC；NOC 费及行政费由开发商自行规定。",
    "how.transfer.title": "迪拜土地局（DLD）过户",
    "how.transfer.body":
      "交割在迪拜土地局产权登记受托机构进行：卖家要价以银行本票支付，与产权转移至您名下同时完成，绝不会在 NOC 签发前支付。您需支付交易总价 {dld} 的 DLD 过户费，另加登记费及产权登记受托机构费用，随后 DLD 将以您的名义签发新的 Oqood 期房登记。",
    "how.fee.title": "服务费：{commission} + 增值税，过户完成时收取",
    "how.fee.body":
      "交易总价的 {commission}，另加服务费 {vat} 的增值税，由您在过户完成时支付。无需预付，若过户未完成则不收取任何费用。",
    "how.fee.bodySeller":
      "服务费为交易总价的 {commission}，另加服务费 {vat} 的增值税，由卖家在过户完成时支付。您无需向我们支付任何费用，无论事前还是事后。",

    "faq.title": "购买转售单元常见问题",
    "faq.cash.q": "过户当天需要准备多少现金？",
    "faq.cash.a":
      "过户当天，您需支付卖家要价、我们的 {commission} 服务费及增值税、交易总价 {dld} 的 DLD 过户费、DLD 登记费及产权登记受托机构费用，以及 {developer} 的 NOC 费；如有开发商要求在签发 NOC 前结清的逾期分期款，也需一并支付。每个房源页面都会显示各自的估算金额。",
    "faq.cash.aSeller":
      "过户当天，您需支付卖家要价、交易总价 {dld} 的 DLD 过户费、DLD 登记费及产权登记受托机构费用，以及 {developer} 的 NOC 费；如有开发商要求在签发 NOC 前结清的逾期分期款，也需一并支付。每个房源页面都会显示各自的估算金额。",
    "faq.plan.q": "承接付款计划是什么意思？",
    "faq.plan.a":
      "您将取代卖家在与 {developer} 所签合同中的位置：向卖家支付其要价，以换取其已付权益；剩余分期款则按原付款时间表继续支付给开发商，只是改为以您的名义支付。",
    "faq.time.q": "NOC 和过户需要多长时间？",
    "faq.time.a": "从接受报价到以您的名义签发新的 Oqood 期房登记，通常需要 2–5 周，视 {developer} 签发 NOC 的速度而定。",
    "faq.fee.q": "你们的服务费是多少？",
    "faq.fee.a":
      "交易总价的 {commission}，另加服务费 {vat} 的增值税，由买家在过户完成时支付。无需向我们预付任何费用，若过户未完成则不收费。",
    "faq.fee.aSeller": "买家无需向我们付费：服务费为交易总价的 {commission}，另加服务费 {vat} 的增值税，由卖家在过户完成时支付。",
    "faq.below.q": "“低于原始合同价”是什么意思？",
    "faq.below.a":
      "即将交易总价（卖家要价加上尚欠开发商的余款）与首位买家在买卖协议（SPA）中与开发商签订的价格相比较。每张卡片上的百分比，就是交易总价低于该价格的幅度。",

    "cta.title": "想看看其他单元？",
    "cta.body": "浏览迪拜所有期房转售房源，或查看其他有在售单元的项目。",
    "cta.allProjects": "全部项目",

    dealLink: "{project} 的全部转售单元（{n}）",

    "index.meta.title": "有转售房源的迪拜期房项目",
    "index.meta.description": "{brand} 上所有有转售单元的迪拜期房项目：开发商、社区、交房时间，以及单元低于原始合同价的幅度。",
    "index.eyebrow": "期房转售",
    "index.title": "有转售房源的项目",
    "index.subtitle": "迪拜期房项目中业主正在转售的单元，价格往往低于原始合同价。选择一个项目，查看其单元以及在该项目购买转售单元的流程。",
    "index.count.one": "{count} 个项目",
    "index.count.many": "{count} 个项目",
    "index.empty": "目前没有项目挂牌转售单元。我们每周都会发布新房源。",
    "card.units.one": "{n} 套单元",
    "card.units.many": "{n} 套单元",
    "card.upTo": "较原始合同价最多低 {pct}%",
    "card.handover": "交房：{when}",
    "card.cta": "查看单元",
  },
});

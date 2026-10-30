import type { Locale } from "@/i18n/config";
import type { Vars } from "@/i18n/define";
import type { Namespace } from "@/i18n/messages";
import { translator, type TKey } from "@/i18n/translator";
import { formatAED, formatDate } from "./format";

// In-app + email copy for every notification, in each supported language.
// {placeholders} are filled from the params passed to notify(), resolved in each recipient's language.

export type { Locale };

type Copy = { title: string; body?: string; cta: string };
// One Copy per locale in LOCALES (src/i18n/config.ts): a new language fails to compile until every template has it.
type Template = Record<Locale, Copy>;

export const TEMPLATES = {
  "listing.submitted": {
    en: { title: "New listing to verify: {project}", body: "{seller} submitted {ref}. Check the SPA, Oqood and statement of account.", cta: "Review listing" },
    ar: { title: "إعلان جديد بانتظار التحقق: {project}", body: "قدّم {seller} الإعلان {ref}. راجِع اتفاقية البيع والشراء وشهادة أوقود وكشف الحساب.", cta: "مراجعة الإعلان" },
    zh: { title: "待核实的新房源：{project}", body: "{seller} 已提交 {ref}。请核查买卖协议（SPA）、Oqood 期房登记和付款对账单。", cta: "审核房源" },
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
    zh: {
      title: "房源已修改，需重新批准：{project}",
      body: "{seller} 修改了 {ref} 的卖家要价或描述。该房源已暂时下架，直至您更新迪拜土地局广告许可（如需要）并重新批准为止。",
      cta: "审核房源",
    },
  },
  // A seller's photos on a listing past review wait for our team (src/app/api/listings/[id]/files/route.ts); one notice
  // until it is read, however many photos follow.
  "listing.photos": {
    en: {
      title: "New photos to check: {project}",
      body: "{seller} added photos to {ref}. They are not public yet: check them and add them to the listing's gallery.",
      cta: "Review photos",
    },
    ar: {
      title: "صور جديدة بانتظار المراجعة: {project}",
      body: "أضاف {seller} صوراً إلى الإعلان ⁨{ref}⁩، وهي غير منشورة بعد. راجِعها وأضِفها إلى معرض صور الإعلان.",
      cta: "مراجعة الصور",
    },
    zh: {
      title: "待审核的新照片：{project}",
      body: "{seller} 为 {ref} 添加了照片，目前尚未公开。请审核后将其加入该房源的图库。",
      cta: "审核照片",
    },
  },
  // Not "we verified your documents": a listing can be approved without the Verified mark (an imported unit confirmed
  // from the owner's Form A, say, before its SPA is in; Terms "Verified").
  "listing.approved": {
    en: { title: "Your listing is live: {project}", body: "Our team has approved your listing. Buyers can now see {ref} and make offers.", cta: "View listing" },
    ar: { title: "إعلانك منشور الآن: {project}", body: "وافق فريقنا على إعلانك. يمكن للمشترين الآن مشاهدة ⁨{ref}⁩ وتقديم العروض.", cta: "عرض الإعلان" },
    zh: { title: "您的房源现已在售：{project}", body: "我们的团队已批准您的房源。买家现在可以查看 {ref} 并提出报价。", cta: "查看房源" },
  },
  "listing.rejected": {
    en: { title: "Your listing needs attention: {project}", body: "{reason}", cta: "Open listing" },
    ar: { title: "إعلانك بحاجة إلى إجراء منك: {project}", body: "{reason}", cta: "فتح الإعلان" },
    zh: { title: "您的房源需要您处理：{project}", body: "{reason}", cta: "打开房源" },
  },
  // Staff-assisted intake (src/lib/claim.ts). The seller, with their claim link (emailed, or the same words sent on
  // WhatsApp by our team); never sent for sample listings. Worded for every way a unit reaches our team: the seller's
  // own documents, or a partner network's file through their broker (bulk import).
  "listing.claim": {
    en: {
      title: "Confirm your listing: {project}",
      body: "Hello {name}, our team has prepared your listing {ref} from the details and documents we received. Open the link to check the details and confirm that you own the unit or are authorised to sell it. The link works once and expires in 7 days.",
      cta: "Confirm my listing",
    },
    ar: {
      title: "تأكيد إعلانك: {project}",
      body: "مرحباً {name}، أعدّ فريقنا إعلانك ⁨{ref}⁩ من البيانات والمستندات التي وصلتنا. افتح الرابط لمراجعة البيانات وتأكيد أنك مالك الوحدة أو مخوَّل ببيعها. يُستخدم الرابط مرة واحدة وتنتهي صلاحيته بعد 7 أيام.",
      cta: "تأكيد إعلاني",
    },
    zh: {
      title: "请确认您的房源：{project}",
      body: "{name} 您好，我们的团队已根据收到的资料和文件为您准备好房源 {ref}。请打开链接核对信息，并确认您是该单元的业主或已获授权出售该单元。该链接仅可使用一次，7 天后失效。",
      cta: "确认我的房源",
    },
  },
  // Admins, once the seller has confirmed through that link.
  "listing.claimed": {
    en: {
      title: "Seller confirmed ownership: {project}",
      body: "{seller} confirmed {ref} through their claim link. Check the documents and the DLD permit, then approve it.",
      cta: "Review listing",
    },
    ar: {
      title: "أكّد البائع ملكيته: {project}",
      body: "أكّد {seller} الإعلان ⁨{ref}⁩ عبر رابط التأكيد. راجِع المستندات وتصريح دائرة الأراضي والأملاك، ثم وافق عليه.",
      cta: "مراجعة الإعلان",
    },
    zh: {
      title: "卖家已确认业主身份：{project}",
      body: "{seller} 已通过确认链接确认 {ref}。请核查文件和迪拜土地局广告许可，然后批准该房源。",
      cta: "审核房源",
    },
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
    zh: {
      title: "{document}即将到期（{when}）：{project}",
      body: "{ref} 的{document}即将到期（{when}）。请续期并在房源编辑页中填写新的到期日。{then}",
      cta: "打开房源",
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
    zh: {
      title: "{document}在交易进行期间已到期：{project}",
      body: "{ref} 的{document}已到期（到期日：{date}）。该房源状态为“{status}”，因此未被暂停，交易不受影响，但它已不再作为广告在网站上展示。请为{document}续期并填写新的到期日，或决定该房源的后续处理。",
      cta: "打开房源",
    },
  },
  // The seller, when the cron takes their listing down:
  "listing.paused_permit": {
    en: { title: "Your listing is paused: {project}", body: "{reason}", cta: "Open listing" },
    ar: { title: "أُوقف نشر إعلانك مؤقتاً: {project}", body: "{reason}", cta: "فتح الإعلان" },
    zh: { title: "您的房源已暂停展示：{project}", body: "{reason}", cta: "打开房源" },
  },
  "offer.received": {
    en: { title: "New offer on {project}: {amount}", body: "A {financing} buyer offered {amount} for your equity (asking {asking}).", cta: "Review offer" },
    ar: { title: "عرض جديد على {project}: {amount}", body: "قدّم مشترٍ ({financing}) مبلغ {amount} مقابل حصتك (السعر المطلوب {asking}).", cta: "مراجعة العرض" },
    zh: { title: "{project} 收到新报价：{amount}", body: "一位{financing}买家对您的已付权益报价 {amount}（您的要价为 {asking}）。", cta: "查看报价" },
  },
  "offer.received.admin": {
    en: { title: "New offer on {project}: {amount}", body: "{buyer} offered {amount} ({financing}). Asking {asking}.", cta: "Open listing" },
    ar: { title: "عرض جديد على {project}: {amount}", body: "قدّم {buyer} مبلغ {amount} ({financing}). السعر المطلوب {asking}.", cta: "فتح الإعلان" },
    zh: { title: "{project} 收到新报价：{amount}", body: "{buyer} 报价 {amount}（{financing}）。卖家要价 {asking}。", cta: "打开房源" },
  },
  "offer.accepted": {
    en: { title: "Your offer on {project} was accepted", body: "The seller accepted {amount}. Our transactions team will contact you to start the developer NOC.", cta: "View my offers" },
    ar: { title: "تم قبول عرضك على {project}", body: "قبل البائع مبلغ {amount}. سيتواصل معك فريق المعاملات لبدء إجراءات شهادة عدم الممانعة من المطوّر.", cta: "عرض عروضي" },
    zh: { title: "您对 {project} 的报价已被接受", body: "卖家已接受 {amount} 的报价。我们的交易团队将与您联系，启动开发商无异议函（NOC）的办理。", cta: "查看我的报价" },
  },
  "offer.declined": {
    en: { title: "Your offer on {project} was declined", body: "The seller declined {amount}. You can make a new offer while the unit is available.", cta: "View my offers" },
    ar: { title: "تم رفض عرضك على {project}", body: "رفض البائع مبلغ {amount}. يمكنك تقديم عرض جديد ما دامت الوحدة متاحة.", cta: "عرض عروضي" },
    zh: { title: "您对 {project} 的报价已被拒绝", body: "卖家拒绝了 {amount} 的报价。在该单元仍可购买期间，您可以重新报价。", cta: "查看我的报价" },
  },
  "offer.countered": {
    en: { title: "Counter-offer on {project}: {amount}", body: "The seller countered your offer of {original} with {amount}.", cta: "Respond" },
    ar: { title: "عرض مقابل على {project}: {amount}", body: "ردّ البائع على عرضك البالغ {original} بعرض مقابل قدره {amount}.", cta: "الرد" },
    zh: { title: "{project} 的还价：{amount}", body: "卖家对您 {original} 的报价还价为 {amount}。", cta: "回复" },
  },
  "offer.counter_accepted": {
    en: { title: "Buyer accepted your counter on {project}", body: "Agreed at {amount}. Our team will start the developer NOC.", cta: "Open listing" },
    ar: { title: "وافق المشتري على عرضك المقابل على {project}", body: "تم الاتفاق على {amount}. سيبدأ فريقنا إجراءات شهادة عدم الممانعة من المطوّر.", cta: "فتح الإعلان" },
    zh: { title: "买家已接受您对 {project} 的还价", body: "双方已按 {amount} 达成一致。我们的团队将启动开发商无异议函（NOC）的办理。", cta: "打开房源" },
  },
  "offer.counter_declined": {
    en: { title: "Buyer declined your counter on {project}", body: "Your counter of {amount} was declined.", cta: "Open listing" },
    ar: { title: "رفض المشتري عرضك المقابل على {project}", body: "تم رفض عرضك المقابل البالغ {amount}.", cta: "فتح الإعلان" },
    zh: { title: "买家拒绝了您对 {project} 的还价", body: "您 {amount} 的还价已被拒绝。", cta: "打开房源" },
  },
  "offer.withdrawn": {
    en: { title: "An offer on {project} was withdrawn", body: "The buyer withdrew their offer of {amount}.", cta: "Open listing" },
    ar: { title: "تم سحب عرض على {project}", body: "سحب المشتري عرضه البالغ {amount}.", cta: "فتح الإعلان" },
    zh: { title: "{project} 的一项报价已撤回", body: "买家撤回了 {amount} 的报价。", cta: "打开房源" },
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
    zh: {
      title: "您对 {project} 的报价已保留为备选",
      body: "卖家接受了另一位买家的报价。您 {amount} 的报价将作为备选报价保留：如该交易未能完成、该单元重新挂牌，您的报价将重新生效。您可以随时撤回。",
      cta: "查看我的报价",
    },
  },
  "offer.backup_reopened": {
    en: { title: "{project} is back on the market", body: "The deal the seller had agreed didn't go ahead, so the unit is available once more and your backup offer of {amount} is active again.", cta: "View my offers" },
    ar: { title: "عادت الوحدة في {project} إلى السوق", body: "لم تكتمل الصفقة التي وافق عليها البائع، فعادت الوحدة متاحة وأصبح عرضك الاحتياطي البالغ {amount} نشطاً من جديد.", cta: "عرض عروضي" },
    zh: { title: "{project} 已重新挂牌", body: "卖家此前达成的交易未能完成，该单元再次可供购买，您 {amount} 的备选报价已重新生效。", cta: "查看我的报价" },
  },
  "offer.unit_sold": {
    en: { title: "Your offer on {project} was closed", body: "The seller agreed a sale with another buyer, so the unit is no longer available and your offer of {amount} was closed.", cta: "Browse deals" },
    ar: { title: "أُغلق عرضك على {project}", body: "اتفق البائع على البيع لمشترٍ آخر، لذلك لم تعد الوحدة متاحة وأُغلق عرضك البالغ {amount}.", cta: "تصفّح الصفقات" },
    zh: { title: "您对 {project} 的报价已关闭", body: "卖家已与另一位买家达成交易，该单元不再可售，您 {amount} 的报价已关闭。", cta: "浏览房源" },
  },
  // The unit left the market without a sale (withdrawn, rejected or removed): its open offers are closed.
  "offer.unit_unavailable": {
    en: { title: "{project} is no longer available", body: "The unit is no longer available, so your offer of {amount} was closed.", cta: "Browse deals" },
    ar: { title: "لم تعد الوحدة في {project} متاحة", body: "لم تعد الوحدة متاحة، لذلك أُغلق عرضك البالغ {amount}.", cta: "تصفّح الصفقات" },
    zh: { title: "{project} 已不再可售", body: "该单元已不再可售，您 {amount} 的报价已关闭。", cta: "浏览房源" },
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
    zh: {
      title: "{project} 的交易未能完成",
      body: "基于您 {amount} 报价达成的交易未能完成，您的报价现已关闭。该单元可能会再次挂牌出售，届时您可以重新报价。",
      cta: "查看我的报价",
    },
  },
  "deal.withdrawn.admin": {
    en: { title: "Seller withdrew {project} after a deal was agreed", body: "{seller} withdrew {ref} while it was under offer. The buyer has been told the deal did not go ahead.", cta: "Open listing" },
    ar: { title: "سحب البائع {project} بعد الاتفاق على صفقة", body: "سحب {seller} الإعلان {ref} وهو قيد عرض مقبول، وأُبلغ المشتري بأن الصفقة لم تتم.", cta: "فتح الإعلان" },
    zh: { title: "卖家在交易达成后撤回了 {project}", body: "{seller} 在 {ref} 处于“已接受报价”状态时将其撤回。已通知买家该交易未能完成。", cta: "打开房源" },
  },
  "deal.agreed.admin": {
    en: { title: "Deal agreed on {project} at {amount}", body: "Seller {seller}, buyer {buyer}. Start the developer NOC and move the listing to “NOC in progress”.", cta: "Open listing" },
    ar: { title: "تم الاتفاق على صفقة {project} بمبلغ {amount}", body: "البائع {seller}، المشتري {buyer}. ابدأ إجراءات شهادة عدم الممانعة وانقل الإعلان إلى «قيد إصدار شهادة عدم الممانعة».", cta: "فتح الإعلان" },
    zh: { title: "{project} 以 {amount} 达成交易", body: "卖家 {seller}，买家 {buyer}。请启动开发商无异议函（NOC）的办理，并将房源状态改为“无异议函（NOC）办理中”。", cta: "打开房源" },
  },
  "deal.noc_in_progress": {
    en: { title: "NOC in progress for {project}", body: "We've applied to the developer for the NOC on {ref}. Next we'll book the DLD transfer at a trustee office and confirm the date with you.", cta: "View progress" },
    ar: { title: "بدء إجراءات شهادة عدم الممانعة لـ {project}", body: "تقدّمنا إلى المطوّر بطلب شهادة عدم الممانعة للإعلان {ref}. سنحجز بعدها موعد نقل الملكية لدى مكتب أمين التسجيل ونؤكد معك الموعد.", cta: "متابعة التقدّم" },
    zh: { title: "无异议函（NOC）办理中：{project}", body: "我们已就 {ref} 向开发商申请无异议函（NOC）。接下来我们将在产权登记受托机构预约迪拜土地局（DLD）过户，并与您确认日期。", cta: "查看进度" },
  },
  "deal.transferred": {
    en: { title: "Transfer complete: {project}", body: "The DLD transfer for {ref} is registered. Thank you for dealing with OffplanDistress.", cta: "View details" },
    ar: { title: "اكتمل نقل الملكية: {project}", body: "تم تسجيل نقل ملكية {ref} لدى دائرة الأراضي والأملاك. شكراً لتعاملك مع OffplanDistress.", cta: "عرض التفاصيل" },
    zh: { title: "过户完成：{project}", body: "{ref} 已在迪拜土地局（DLD）完成过户登记。感谢您选择 OffplanDistress。", cta: "查看详情" },
  },
  "kyc.requested.admin": {
    en: { title: "Identity verification requested: {name}", body: "{name} ({email}) asked to verify their identity. Review their documents and update the KYC status.", cta: "Open users" },
    ar: { title: "طلب التحقق من الهوية: {name}", body: "طلب {name} ({email}) التحقق من هويته. راجِع المستندات وحدّث حالة التحقق من الهوية.", cta: "فتح المستخدمين" },
    zh: { title: "身份核验申请：{name}", body: "{name}（{email}）申请进行身份核验。请审核其文件并更新 KYC 状态。", cta: "打开用户列表" },
  },
  "kyc.verified": {
    en: { title: "Your identity is verified", body: "Our team has completed your KYC check. Your account now shows as verified.", cta: "View profile" },
    ar: { title: "تم التحقق من هويتك", body: "أكمل فريقنا التحقق من هويتك، ويظهر حسابك الآن كحساب موثّق.", cta: "عرض الملف الشخصي" },
    zh: { title: "您的身份已通过核验", body: "我们的团队已完成您的 KYC 审核，您的账户现已显示为“已认证”。", cta: "查看个人资料" },
  },
  "inquiry.received": {
    en: { title: "New {kind} from {name}", body: "{contact}\n{message}", cta: "Open inquiries" },
    ar: { title: "{kind} جديد من {name}", body: "{contact}\n{message}", cta: "فتح الاستفسارات" },
    zh: { title: "来自 {name} 的新{kind}", body: "{contact}\n{message}", cta: "打开咨询列表" },
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
    zh: {
      title: "{urgent}新的卖家线索 {ref}：{project}",
      body: "{name} · {phone}\n原始合同价 {price}，已付 {paid}（{pct}）。交房：{handover}。\n{missed}{notice}\n显示的估价：{low} 至 {high}。",
      cta: "打开卖家线索",
    },
  },
  "watch.price_drop": {
    en: { title: "Price drop on {project}", body: "The asking price fell from {from} to {to}.", cta: "View deal" },
    ar: { title: "انخفاض سعر {project}", body: "انخفض السعر المطلوب من {from} إلى {to}.", cta: "عرض الصفقة" },
    zh: { title: "{project} 已降价", body: "卖家要价已从 {from} 降至 {to}。", cta: "查看房源" },
  },
  "search.matches": {
    en: { title: "New deals for “{name}”: {count}", body: "{list}", cta: "See matches" },
    ar: { title: "صفقات جديدة تطابق «{name}»: {count}", body: "{list}", cta: "عرض النتائج" },
    zh: { title: "“{name}”的新房源：{count}", body: "{list}", cta: "查看匹配结果" },
  },
  "password.reset": {
    en: { title: "Reset your password", body: "Someone asked to reset the password for this account. The link works for 1 hour. If it wasn't you, ignore this email.", cta: "Choose a new password" },
    ar: { title: "إعادة تعيين كلمة المرور", body: "طلب أحدهم إعادة تعيين كلمة المرور لهذا الحساب. الرابط صالح لمدة ساعة واحدة. إن لم تطلب ذلك، فتجاهل هذه الرسالة.", cta: "اختيار كلمة مرور جديدة" },
    zh: { title: "重置您的密码", body: "有人申请重置此账户的密码。该链接在 1 小时内有效。如果不是您本人操作，请忽略这封邮件。", cta: "设置新密码" },
  },
  // Admins only. {reason} is one of the errors.ts "notify.cron.*" lines (see src/lib/cron.ts).
  "ops.cron_failed": {
    en: { title: "Scheduled job failed: {job}", body: "{reason}\nDetails are in the Vercel function logs for /api/cron/{job}.", cta: "Open admin" },
    // ‎ keeps the left-to-right path from flipping inside Arabic text.
    ar: { title: "تعذّر تنفيذ مهمة مجدولة: {job}", body: "{reason}\nتجد التفاصيل في سجلات الدوال على Vercel للمسار ‎/api/cron/{job}.", cta: "فتح لوحة الإدارة" },
    zh: { title: "定时任务执行失败：{job}", body: "{reason}\n详情见 Vercel 函数日志（路径：/api/cron/{job}）。", cta: "打开管理后台" },
  },
  // Follow-up nudges from the daily ops cron (src/lib/reminders.ts), each sent once. Never for sample listings, staff
  // accounts, or sellers our team added who haven't set a password yet.
  // A seller account (or a seller from the free estimate) with nothing listed, 24 h and again 72 h after sign-up.
  "seller.finish_listing": {
    en: {
      title: "Finish listing your unit: it's free",
      body: "Hello {name}, you opened a seller account on OffplanDistress but haven't listed your unit yet. It takes about 10 minutes: the unit, your payment plan and your asking price. If you started the form and haven't signed out since, it picks up where you left off on the same device. No SPA to hand? List now and upload the documents later, or send them to us on WhatsApp and our team will prepare the listing for you.",
      cta: "Continue my listing",
    },
    ar: {
      title: "أكمِل إدراج وحدتك مجاناً",
      body: "مرحباً {name}، أنشأت حساب بائع على ⁦OffplanDistress⁩ لكنك لم تُدرج وحدتك بعد. لا يستغرق ذلك سوى 10 دقائق تقريباً: بيانات الوحدة وخطة الدفع والسعر المطلوب. وإن كنت قد بدأت تعبئة النموذج ولم تسجّل الخروج منذ ذلك الحين، فستكمل من حيث توقفت عند فتحه على الجهاز نفسه. لا تتوفر لديك اتفاقية البيع والشراء حالياً؟ أدرِج وحدتك الآن وارفع المستندات لاحقاً، أو أرسلها إلينا عبر واتساب ليُعدّ فريقنا الإعلان نيابةً عنك.",
      cta: "متابعة إدراج وحدتي",
    },
    zh: {
      title: "完成您的房源发布：完全免费",
      body: "{name} 您好，您已在 OffplanDistress 开通卖家账户，但尚未发布您的单元。整个过程仅需约 10 分钟：填写单元信息、您的付款计划和卖家要价。如果您已开始填写表格且此后未退出登录，在同一设备上打开即可从上次中断处继续。手边没有买卖协议（SPA）？可以先发布房源，稍后再上传文件；或通过 WhatsApp 将文件发给我们，由我们的团队为您准备房源。",
      cta: "继续发布房源",
    },
  },
  // A listing still under review 48 h after it was sent without the SPA/Oqood or the statement. {missing} is an
  // errors.ts "notify.reminder.missing.*" phrase.
  "seller.upload_docs": {
    en: {
      title: "Add your documents so we can verify {project}",
      body: "We can't verify {ref} and publish it until we have {missing}. Upload photos or PDFs from your listing page, or send them to us on WhatsApp. Once we've checked them with the developer, your listing goes live.",
      cta: "Upload documents",
    },
    ar: {
      title: "أضِف مستنداتك لنتحقق من إعلان {project}",
      body: "لا يمكننا التحقق من الإعلان ⁨{ref}⁩ ونشره قبل استلام {missing}. ارفع صوراً أو ملفات ⁦PDF⁩ من صفحة إعلانك، أو أرسلها إلينا عبر واتساب. وبعد التحقق منها لدى المطوّر، يُنشر إعلانك.",
      cta: "رفع المستندات",
    },
    zh: {
      title: "请添加文件，以便我们核实 {project}",
      body: "在收到{missing}之前，我们无法核实并发布 {ref}。请在您的房源页面上传照片或 PDF 文件，或通过 WhatsApp 发送给我们。待我们与开发商核对完毕后，您的房源即会上架在售。",
      cta: "上传文件",
    },
  },
  // A live listing without a single offer 21 days after it was published.
  "seller.no_offers": {
    en: {
      title: "No offers yet on {project}: review your price?",
      body: "{ref} has been live since {since} (views so far: {views}), but no buyer has made an offer yet. Buyers compare the cash they need on transfer day with similar units, so a lower asking price often brings the first offer. You can change it from your listing page; our team checks the change before the listing goes live again.",
      cta: "Review my price",
    },
    ar: {
      title: "لا عروض بعد على {project}: هل تراجع السعر؟",
      body: "الإعلان ⁨{ref}⁩ منشور منذ {since} (عدد المشاهدات حتى الآن: ⁨{views}⁩)، لكن لم يقدّم أي مشترٍ عرضاً بعد. يقارن المشترون المبلغ النقدي المطلوب منهم يوم نقل الملكية بالوحدات المماثلة، لذا كثيراً ما يجلب السعر المطلوب الأقل العرض الأول. يمكنك تعديل السعر من صفحة إعلانك، ويراجع فريقنا التعديل قبل إعادة نشر الإعلان.",
      cta: "مراجعة السعر",
    },
    zh: {
      title: "{project} 尚无报价：要调整价格吗？",
      body: "{ref} 已上架在售（上架日期：{since}；目前浏览量：{views}），但尚未有买家报价。买家会将过户所需现金与同类单元进行比较，因此适当下调卖家要价往往能带来第一笔报价。您可以在房源页面修改价格；我们的团队会在房源重新上架前审核该修改。",
      cta: "查看我的定价",
    },
  },
  // The seller, about an offer they haven't answered for 48 h (the admins see it in their digest from 3 days).
  "offer.reminder": {
    en: {
      title: "An offer on {project} is waiting for your answer",
      body: "A buyer offered {amount} for {ref} on {date} and hasn't heard back yet. Accept, counter or decline it from your offers page: buyers often move on to another unit if they don't get an answer within a few days.",
      cta: "Answer the offer",
    },
    ar: {
      title: "عرض على {project} بانتظار ردّك",
      body: "قدّم مشترٍ عرضاً بقيمة {amount} على الإعلان ⁨{ref}⁩ بتاريخ {date} ولم يتلقَّ ردّاً بعد. يمكنك قبوله أو تقديم عرض مقابل أو رفضه من صفحة العروض، إذ كثيراً ما ينتقل المشترون إلى وحدة أخرى إن لم يتلقّوا ردّاً خلال أيام قليلة.",
      cta: "الرد على العرض",
    },
    zh: {
      title: "{project} 的一项报价正等待您的回复",
      body: "{date}，一位买家对 {ref} 报价 {amount}，至今尚未收到您的回复。请在您的报价页面接受、还价或拒绝该报价：如果几天内得不到答复，买家往往会转向其他单元。",
      cta: "回复报价",
    },
  },
  // The buyer, about the seller's counter-offer they haven't answered for 48 h.
  "offer.counter_reminder": {
    en: {
      title: "The seller's counter-offer on {project} is waiting for you",
      body: "On {date} the seller answered your offer of {original} with a counter-offer of {amount}. Accept or decline it from your offers page, or make a new offer. The unit stays on the market until a deal is agreed.",
      cta: "Respond",
    },
    ar: {
      title: "العرض المقابل من البائع على {project} بانتظار ردّك",
      body: "بتاريخ {date} ردّ البائع على عرضك البالغ {original} بعرض مقابل قدره {amount}. يمكنك قبوله أو رفضه من صفحة عروضك، أو تقديم عرض جديد. تبقى الوحدة معروضة في السوق إلى أن يُتفق على صفقة.",
      cta: "الرد",
    },
    zh: {
      title: "卖家对 {project} 的还价正等待您的回复",
      body: "{date}，卖家对您 {original} 的报价还价为 {amount}。请在您的报价页面接受或拒绝该还价，或提出新的报价。在交易达成之前，该单元将继续在售。",
      cta: "回复",
    },
  },
  // Admins, once a day: how many follow-ups are open. Each {line} is an admin.ts "followups.digest.*" line (empty when
  // its count is 0), so the counts read the same as the Follow-ups section on /admin. {partial} says a rule failed today.
  // {inventory} is yesterday's market changes and the newsletter's reach (newsletter.ts "digest.inventory").
  "ops.digest": {
    en: {
      title: "Today's follow-ups ({date}): {total}",
      body: "{signup}{docs}{noOffers}{offers}{counters}{leads}{review}{instalments}{viewings}{inventory}{partial}{email}Each one is listed under Follow-ups on the admin home page, with call and WhatsApp buttons.",
      cta: "Open follow-ups",
    },
    ar: {
      title: "متابعات اليوم ({date}): ⁨{total}⁩",
      body: "{signup}{docs}{noOffers}{offers}{counters}{leads}{review}{instalments}{viewings}{inventory}{partial}{email}تجد كلاً منها في قسم المتابعات على الصفحة الرئيسية للوحة الإدارة، مع زرّي الاتصال وواتساب.",
      cta: "فتح المتابعات",
    },
    zh: {
      title: "今日待跟进事项（{date}）：{total}",
      body: "{signup}{docs}{noOffers}{offers}{counters}{leads}{review}{instalments}{viewings}{inventory}{partial}{email}以上各项均列于管理后台首页的“待跟进”板块，并附有致电和 WhatsApp 按钮。",
      cta: "打开待跟进",
    },
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
  const copy: Copy = TEMPLATES[key][locale];
  const values: Record<string, string> = {};
  for (const [k, v] of Object.entries(params)) values[k] = resolveParam(v, locale);
  const fill = (s: string) => s.replace(/\{(\w+)\}/g, (_, k: string) => values[k] ?? "");
  return { title: fill(copy.title), body: copy.body ? fill(copy.body).trim() || null : null, cta: copy.cta };
}

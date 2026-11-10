import { defineMessages } from "../define";

// Our WhatsApp deals community, "OffplanDistress Deals | Dubai" (BRAND.whatsappCommunity): the band and the one-line
// invitation (src/components/WhatsAppCommunity.tsx) on the home page, /deals, every deal page and after an enquiry, and
// the footer link. The daily newsletter's line is in newsletter.ts (issue.community*).
export default defineMessages({
  en: {
    title: "Get new deals on WhatsApp first",
    text: "Join our free WhatsApp community. Every week we post Dubai off-plan homes priced below what other buyers paid in the same project, with the cash you need on transfer day and what's left on the payment plan. Only we post, and members can't see each other's numbers.",
    button: "Join free on WhatsApp",
    // The one-line invitation: under a deal page's WhatsApp button, and once an enquiry is sent.
    "line.deal": "Want deals like this every week? Join our WhatsApp community",
    "line.sent": "While we get back to you, join our WhatsApp deals community",
    footer: "WhatsApp deals community",
    // Read after a join link's text by screen readers: it leaves the site.
    opens: "(opens WhatsApp)",
  },
  ar: {
    title: "احصل على الصفقات الجديدة عبر واتساب قبل غيرك",
    text: "انضم إلى مجتمعنا المجاني على واتساب. ننشر فيه كل أسبوع عقارات على الخارطة في دبي بأسعار أقل مما دفعه مشترون آخرون في المشروع نفسه، مع المبلغ النقدي الذي تحتاجه يوم نقل الملكية وما يتبقى من خطة الدفع. نحن وحدنا من ينشر، ولا يرى الأعضاء أرقام هواتف بعضهم.",
    button: "انضم مجاناً عبر واتساب",
    "line.deal": "هل تريد صفقات كهذه كل أسبوع؟ انضم إلى مجتمعنا على واتساب",
    "line.sent": "ريثما نردّ عليك، انضم إلى مجتمع صفقاتنا على واتساب",
    footer: "مجتمع الصفقات على واتساب",
    opens: "(يفتح واتساب)",
  },
  zh: {
    title: "在 WhatsApp 上抢先获取新房源",
    text: "加入我们免费的 WhatsApp 社群。我们每周发布迪拜期房房源，价格低于同一项目中其他买家的购入价，并列明过户当天所需现金，以及付款计划中尚需支付的余款。只有我们发布消息，成员之间看不到彼此的电话号码。",
    button: "免费加入 WhatsApp 社群",
    "line.deal": "想每周收到这样的房源？加入我们的 WhatsApp 社群",
    "line.sent": "在我们回复您之前，欢迎先加入我们的 WhatsApp 房源社群",
    footer: "WhatsApp 房源社群",
    opens: "（打开 WhatsApp）",
  },
});

import { contactBulletsAr, contactBulletsEn, contactBulletsZh, iso, LEGAL_UPDATED, OP } from "./brand";
import type { LegalContent } from "./types";

// Cookie Policy. The two cookies are set in src/lib/auth.ts (od_session) and src/i18n/actions.ts + src/proxy.ts
// (od_locale); update this text (and LEGAL_UPDATED) if either changes.

export const cookiePolicy: LegalContent = {
  en: {
    title: "Cookie Policy",
    updated: LEGAL_UPDATED,
    summary: `${OP.site} uses only two first-party cookies, both strictly necessary: one keeps you logged in and one remembers your language. We use no analytics, advertising or third-party cookies.`,
    sections: [
      {
        id: "what-are-cookies",
        heading: "What cookies are",
        paragraphs: [
          "Cookies are small text files that a website stores in your browser so that it can recognise your device on later visits. They may be set by the site you are visiting (first-party cookies) or by other services embedded in it (third-party cookies), and they last either until you close your browser or for a set period.",
          "This Policy explains the cookies used on the Platform. It forms part of our Terms of Use and should be read together with our Privacy Policy.",
        ],
      },
      {
        id: "cookies-we-use",
        heading: "The cookies we use",
        paragraphs: [`${OP.site} sets only two first-party cookies, both necessary for the Platform to work as you expect:`],
        bullets: [
          "od_session: keeps you signed in after you log in. It holds a random token, of which we store only a hashed copy. Type: strictly necessary, first-party and httpOnly, so scripts on the page cannot read it. Duration: 30 days, or until you log out.",
          "od_locale: remembers whether you chose English, Arabic or Chinese. It holds only “en”, “ar” or “zh” and is set when you pick a language, log in or sign up (to the language of that page), or open one of our pages in Arabic or Chinese. Type: strictly necessary (preference), first-party. Duration: 1 year.",
        ],
      },
      {
        id: "no-tracking",
        heading: "No analytics, advertising or third-party cookies",
        paragraphs: [
          "We do not use analytics, advertising, tracking or social-media cookies, and no third party sets cookies through our pages. Some photographs on the Platform are loaded directly from Unsplash’s servers; loading them does not set cookies on our pages, although Unsplash receives your IP address and browser details, as our Privacy Policy explains.",
          "Both of our cookies are needed to provide the service you ask for. If we ever introduce cookies that are not strictly necessary, we will update this Policy and ask for your consent before setting them.",
        ],
      },
      {
        id: "managing-cookies",
        heading: "Deleting or blocking cookies",
        paragraphs: [
          "You can view, delete and block cookies in your browser settings, usually under “Privacy” or “Site data”, and most browsers let you do this for individual sites.",
          "If you delete or block od_session, you will be logged out and will not be able to sign in, list a Unit, make Offers or use your dashboard until you allow it again. If you delete or block od_locale, each page opens in the language of its address (Arabic for addresses starting with /ar, Chinese for addresses starting with /zh, otherwise English), your dashboard in the language your browser prefers, and your choice of language will not be remembered.",
        ],
      },
      {
        id: "changes",
        heading: "Changes to this Policy",
        paragraphs: [
          "We will update this Policy if the cookies we use change, and the “Last updated” date above shows when it was last revised. If we add a cookie that is not strictly necessary, we will tell you before it is used.",
        ],
      },
      {
        id: "contact",
        heading: "Contact us",
        paragraphs: [`Questions about cookies can be sent to ${OP.company}:`],
        bullets: contactBulletsEn,
      },
    ],
  },

  ar: {
    title: "سياسة ملفات تعريف الارتباط",
    updated: LEGAL_UPDATED,
    summary: `لا تستخدم منصة ${iso(OP.site)} سوى ملفَّي تعريف ارتباط من الطرف الأول، وكلاهما ضروري تماماً: أحدهما يُبقيك مسجّلاً الدخول، والآخر يتذكّر لغتك. ولا نستخدم أي ملفات تعريف ارتباط للتحليلات أو الإعلانات أو تابعة لأطراف أخرى.`,
    sections: [
      {
        id: "what-are-cookies",
        heading: "ما ملفات تعريف الارتباط؟",
        paragraphs: [
          "ملفات تعريف الارتباط ملفات نصية صغيرة يخزّنها الموقع الإلكتروني في متصفحك ليتعرّف على جهازك في الزيارات اللاحقة. وقد يضعها الموقع الذي تزوره (ملفات الطرف الأول) أو خدمات أخرى مدمجة فيه (ملفات الطرف الثالث)، وتبقى إما حتى إغلاق المتصفح وإما لمدة محددة.",
          "توضّح هذه السياسة ملفات تعريف الارتباط المستخدمة على المنصة، وهي جزء من شروط الاستخدام وينبغي قراءتها مع سياسة الخصوصية.",
        ],
      },
      {
        id: "cookies-we-use",
        heading: "ملفات تعريف الارتباط التي نستخدمها",
        paragraphs: [`لا تضع منصة ${iso(OP.site)} سوى ملفَّي تعريف ارتباط من الطرف الأول، وكلاهما لازم لعمل المنصة على النحو الذي تتوقعه:`],
        bullets: [
          `${iso("od_session")}: يُبقيك مسجّلاً الدخول بعد تسجيلك، ويحمل رمزاً عشوائياً لا نحتفظ منه إلا بنسخة مجزّأة. النوع: ضروري تماماً، من الطرف الأول، ومن نوع ${iso("httpOnly")} فلا يمكن للنصوص البرمجية في الصفحة قراءته. المدة: 30 يوماً، أو حتى تسجيل الخروج.`,
          `${iso("od_locale")}: يتذكّر اختيارك للغة العربية أو الإنجليزية أو الصينية، ولا يحمل سوى القيمة «${iso("ar")}» أو «${iso("en")}» أو «${iso("zh")}»، ويُضبط عند اختيارك اللغة، أو عند تسجيل الدخول أو إنشاء حساب (على لغة تلك الصفحة)، أو عند فتح إحدى صفحاتنا باللغة العربية أو الصينية. النوع: ضروري تماماً (للتفضيلات)، من الطرف الأول. المدة: سنة واحدة.`,
        ],
      },
      {
        id: "no-tracking",
        heading: "لا ملفات للتحليلات أو الإعلانات أو لأطراف أخرى",
        paragraphs: [
          `لا نستخدم ملفات تعريف ارتباط للتحليلات أو الإعلانات أو التتبع أو وسائل التواصل الاجتماعي، ولا يضع أي طرف آخر ملفات تعريف ارتباط عبر صفحاتنا. وتُحمَّل بعض الصور على المنصة مباشرةً من خوادم ${iso("Unsplash")}، ولا يؤدي تحميلها إلى وضع أي ملفات تعريف ارتباط على صفحاتنا، وإن كانت ${iso("Unsplash")} تتلقى عنوان IP الخاص بك وبيانات متصفحك على النحو المبيّن في سياسة الخصوصية.`,
          "كلا الملفين لازم لتقديم الخدمة التي تطلبها. وإذا استخدمنا مستقبلاً أي ملفات تعريف ارتباط غير ضرورية، فسنحدّث هذه السياسة ونطلب موافقتك قبل وضعها.",
        ],
      },
      {
        id: "managing-cookies",
        heading: "حذف ملفات تعريف الارتباط أو حظرها",
        paragraphs: [
          "يمكنك عرض ملفات تعريف الارتباط وحذفها وحظرها من إعدادات متصفحك، وعادةً ما تجدها ضمن «الخصوصية» أو «بيانات المواقع»، وتتيح معظم المتصفحات ذلك لكل موقع على حدة.",
          `إذا حذفت الملف ${iso("od_session")} أو حظرته، فسيُسجَّل خروجك ولن تتمكن من تسجيل الدخول أو إدراج وحدة أو تقديم العروض أو استخدام لوحة التحكم حتى تسمح به مجدداً. وإذا حذفت الملف ${iso("od_locale")} أو حظرته، فستُفتح كل صفحة بلغة عنوانها (العربية للعناوين التي تبدأ بـ ${iso("/ar")}، والصينية للعناوين التي تبدأ بـ ${iso("/zh")}، والإنجليزية لغيرها)، وتُعرض لوحة التحكم باللغة التي يفضّلها متصفحك، ولن يُحفظ اختيارك للغة.`,
        ],
      },
      {
        id: "changes",
        heading: "التعديلات على هذه السياسة",
        paragraphs: [
          "سنحدّث هذه السياسة إذا تغيّرت ملفات تعريف الارتباط التي نستخدمها، ويبيّن تاريخ «آخر تحديث» أعلاه موعد آخر مراجعة لها. وإذا أضفنا ملفاً غير ضروري، فسنُعلمك بذلك قبل استخدامه.",
        ],
      },
      {
        id: "contact",
        heading: "التواصل معنا",
        paragraphs: [`لأي استفسار بشأن ملفات تعريف الارتباط، يُرجى التواصل مع ${OP.companyAr}:`],
        bullets: contactBulletsAr,
      },
    ],
  },

  zh: {
    title: "Cookie 政策",
    updated: LEGAL_UPDATED,
    summary: `${OP.site} 仅使用两个第一方 Cookie，且均为严格必要：一个用于保持您的登录状态，另一个用于记住您的语言。我们不使用任何分析、广告或第三方Cookie。本中文译本仅供参考，如有歧义，以英文版本为准。`,
    sections: [
      {
        id: "what-are-cookies",
        heading: "什么是 Cookie",
        paragraphs: [
          "Cookie 是网站存储在您浏览器中的小型文本文件，用于在您日后访问时识别您的设备。Cookie 可以由您正在访问的网站设置（第一方 Cookie），也可以由嵌入该网站的其他服务设置（第三方 Cookie）；其有效期或者截至您关闭浏览器为止，或者为一段设定的期限。",
          "本政策说明本平台所使用的 Cookie。本政策构成我们《使用条款》的一部分，应与我们的《隐私政策》一并阅读。",
        ],
      },
      {
        id: "cookies-we-use",
        heading: "我们使用的 Cookie",
        paragraphs: [`${OP.site} 仅设置两个第一方 Cookie，二者均为本平台按您所预期的方式运行所必需：`],
        bullets: [
          "od_session：在您登录后保持您的登录状态。它保存一个随机令牌，我们仅存储该令牌的哈希副本。类型：严格必要、第一方且为 httpOnly，因此页面上的脚本无法读取。有效期：30 天，或直至您退出登录。",
          "od_locale：记住您选择的是英文、阿拉伯文还是中文。它仅保存“en”、“ar”或“zh”，并在您选择语言、登录或注册（设为该页面的语言）或以阿拉伯文或中文打开我们的任一页面时设置。类型：严格必要（偏好设置）、第一方。有效期：1 年。",
        ],
      },
      {
        id: "no-tracking",
        heading: "不使用分析、广告或第三方 Cookie",
        paragraphs: [
          "我们不使用分析、广告、跟踪或社交媒体 Cookie，也没有任何第三方通过我们的页面设置 Cookie。本平台上的部分照片直接从 Unsplash 的服务器加载；加载这些照片不会在我们的页面上设置 Cookie，但 Unsplash 会收到您的 IP 地址和浏览器信息，详见我们的《隐私政策》。",
          "我们的这两个 Cookie 均为提供您所请求的服务所必需。如果我们今后引入并非严格必要的 Cookie，我们将更新本政策，并在设置之前征得您的同意。",
        ],
      },
      {
        id: "managing-cookies",
        heading: "删除或阻止 Cookie",
        paragraphs: [
          "您可以在浏览器设置中查看、删除和阻止 Cookie，相关选项通常位于“隐私”或“网站数据”之下，并且大多数浏览器允许您针对单个网站进行此类设置。",
          "如果您删除或阻止 od_session，您将被退出登录，并且在您重新允许该 Cookie 之前，将无法登录、发布房源、提出报价或使用“我的账户”。如果您删除或阻止 od_locale，每个页面将以其网址对应的语言打开（以 /ar 开头的网址为阿拉伯文，以 /zh 开头的网址为中文，其他为英文），“我的账户”将以您浏览器偏好的语言显示，并且您的语言选择不会被记住。",
        ],
      },
      {
        id: "changes",
        heading: "本政策的变更",
        paragraphs: [
          "如果我们使用的 Cookie 发生变化，我们将更新本政策；上方的“最后更新”日期显示本政策最近一次修订的时间。如果我们新增并非严格必要的 Cookie，我们将在使用之前告知您。",
        ],
      },
      {
        id: "contact",
        heading: "联系我们",
        paragraphs: [`有关 Cookie 的问题，请联系 ${OP.companyZh}：`],
        bullets: contactBulletsZh,
      },
    ],
  },
};

import { contactBulletsAr, contactBulletsEn, iso, LEGAL_UPDATED, OP } from "./brand";
import type { LegalContent } from "./types";

// Cookie Policy. The two cookies are set in src/lib/auth.ts (od_session) and src/i18n/actions.ts (od_locale);
// update this text if either changes.

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
          "od_locale: remembers whether you chose English or Arabic. It holds only “en” or “ar” and is set when you pick a language. Type: strictly necessary (preference), first-party. Duration: 1 year.",
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
          "If you delete or block od_session, you will be logged out and will not be able to sign in, list a Unit, make Offers or use your dashboard until you allow it again. If you delete or block od_locale, the Platform will show the language your browser prefers on each visit, and your choice of language will not be remembered.",
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
          `${iso("od_locale")}: يتذكّر اختيارك للغة العربية أو الإنجليزية، ولا يحمل سوى القيمة «${iso("ar")}» أو «${iso("en")}»، ويُضبط عند اختيارك اللغة. النوع: ضروري تماماً (للتفضيلات)، من الطرف الأول. المدة: سنة واحدة.`,
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
          `إذا حذفت الملف ${iso("od_session")} أو حظرته، فسيُسجَّل خروجك ولن تتمكن من تسجيل الدخول أو إدراج وحدة أو تقديم العروض أو استخدام لوحة التحكم حتى تسمح به مجدداً. وإذا حذفت الملف ${iso("od_locale")} أو حظرته، فستعرض المنصة اللغة التي يفضّلها متصفحك في كل زيارة، ولن يُحفظ اختيارك للغة.`,
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
};

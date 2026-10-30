import { contactBulletsAr, contactBulletsEn, contactBulletsZh, iso, LEGAL_UPDATED, OP } from "./brand";
import type { LegalContent } from "./types";

// Privacy Policy under UAE Federal Decree-Law No. (45) of 2021 (PDPL). Keep section ids and order identical in
// every language.

export const privacyPolicy: LegalContent = {
  en: {
    title: "Privacy Policy",
    updated: LEGAL_UPDATED,
    summary: `${OP.company} is the controller of the personal data processed on ${OP.site}. We collect what we need to run your account, verify listings, broker transactions and meet our anti-money-laundering duties under UAE law. We never sell your data or use it for advertising, Sellers do not see Buyers’ identities until the MOU (RERA Form F) is prepared, and we share data with the other party, Developers, the DLD, trustee offices and banks only when a transaction requires it. You can exercise your rights under the UAE Personal Data Protection Law by writing to ${OP.email}.`,
    sections: [
      {
        id: "who-we-are",
        heading: "Who we are",
        paragraphs: [
          `This Privacy Policy explains how ${OP.identityEn} (“we”, “us” or “our”), which operates the ${OP.site} platform (the “Platform”), collects, uses, shares and protects personal data. We are the controller of that data for the purposes of UAE Federal Decree-Law No. (45) of 2021 on the Protection of Personal Data (the “PDPL”).`,
          "This Policy applies to everyone who uses the Platform, including visitors, Buyers, Sellers and people who contact us. Capitalised words have the meanings given in our Terms of Use, which should be read together with this Policy and our Cookie Policy.",
        ],
      },
      {
        id: "data-we-collect",
        heading: "The personal data we collect",
        paragraphs: ["We collect the following categories of personal data:"],
        bullets: [
          "Account data: your full name, email address, mobile number (if you give one), whether you want to buy, sell or both, your preferred language, a hashed form of your password, your identity-verification (KYC) status and the date and time you accepted our Terms of Use and this Policy.",
          "Listing data: details of your Unit (developer, project, community, type, size, floor and view), the purchase price, the amount paid, the payment plan, the asking price, how quickly you need to sell, whether any instalments have been missed (this is noted in the public Listing description) and the description you write.",
          "Documents: files you upload, such as the SPA, Oqood certificate, statement of account, passport or Emirates ID and any other supporting document. These are stored in our database and, on the Platform, are visible only to you and our authorised staff.",
          "Listing photographs: photographs of the Unit that you upload with a Listing. These are published with the Listing and anyone can view them; even while the Listing is under review, anyone who has a photograph’s web address can view it.",
          "Transaction data: Offers and counter-offers, financing preferences, messages for the other party, the status of each deal and the information needed for the NOC and the Transfer.",
          "Activity and preferences: your watchlist, saved searches and alert settings, and the in-app notifications and emails we send you.",
          "Newsletter data: if you subscribe to our daily deals newsletter, the email address you enter, the language you subscribed in, where on the Platform you subscribed, the date and time and your IP address at that moment (together, your consent record), whether you have confirmed the subscription from the email we send you, and when each issue was sent to you. If you subscribe while signed in, the subscription is linked to your account.",
          "Enquiries: the name, email address, telephone number and message you send through our contact, viewing-request or seller assessment forms (for the seller assessment form, also the figures you enter about your Unit, such as the purchase price, the amount paid and whether you have received a default notice), or when you call us or message us on WhatsApp (including any figures you choose to send, such as those pre-filled from the exit calculator).",
          "Technical data: server logs containing your IP address, the pages requested and the date and time; rate-limit records containing your IP address and, for sign-in attempts and newsletter sign-ups, the email address entered; the two cookies described in our Cookie Policy; and, when you send one of our forms, how your visit reached us (the campaign tags of the link you followed, a partner’s referral code, the first page you opened and the referring website), which your browser keeps for that visit in session storage rather than in a cookie.",
          "Visit statistics: for each page you view outside your dashboard, the page’s address (without any query string), the website whose link brought you to us (if you arrived from another site), the campaign tags and partner referral code in the link you followed, your country and city as derived from your IP address by our hosting provider, the type of device (mobile, tablet or desktop) and browser, the language you use on the Platform and how long the page was shown on your screen. Pages are grouped into visits by a random identifier that your browser keeps in session storage for that tab (a new one after 30 minutes of inactivity), and visitors are told apart by an anonymous identifier calculated from your IP address and browser details together with the date and a secret key, which changes every day. We use no cookies for this, and we do not store your IP address or your browser’s full identification string (its user agent) with these statistics, only the device type and browser name. When you send one of our forms, the identifier of your visit is sent with it, so that we can see which pages were viewed before the form was sent. Nothing is recorded for our signed-in staff or for automated browsers.",
        ],
      },
      {
        id: "sources",
        heading: "Where the data comes from",
        paragraphs: [
          "Most of the personal data we hold is provided by you when you register, list a Unit, make an Offer, upload documents or contact us. Some is generated automatically when you use the Platform, such as server logs, rate-limit records, visit statistics and notifications.",
          "In the course of a transaction we also receive information from Developers (for example, statements of account and NOC conditions), from the DLD and trustee offices, and from the other party to the transaction. To meet our legal obligations we may also check public sources, such as sanctions lists.",
        ],
      },
      {
        id: "purposes",
        heading: "Why we use it and our legal bases",
        paragraphs: [
          "We process personal data only on a ground the PDPL allows: your consent, or where the processing is necessary to perform a contract with you or to take steps you request before entering into one, to comply with obligations imposed on us by other UAE laws, or to establish, exercise or defend legal claims.",
          "We do not sell personal data or use it for advertising. Where we rely on your consent, you may withdraw it at any time without affecting processing carried out before the withdrawal.",
          "We use personal data to:",
        ],
        bullets: [
          "create and manage your account, publish and manage Listings, present Offers and run watchlists, saved searches and notifications (necessary to perform our agreement with you under the Terms of Use);",
          "verify documents and broker your transaction, including requesting the NOC and arranging the Transfer (necessary to perform our brokerage agreement, including RERA Forms A and B, and to take the steps you request);",
          "verify your identity, check the source of funds, screen against sanctions lists, keep records and report suspicious activity (necessary to comply with our legal obligations, including under Federal Decree-Law No. (10) of 2025 on Anti-Money Laundering and Combating the Financing of Terrorism and Proliferation Financing);",
          "keep the Platform and your account secure, prevent fraud and abuse, for example by limiting repeated sign-in attempts, and fix faults (necessary to perform our agreement with you and to meet our duty under the PDPL to protect personal data);",
          "answer your enquiries, viewing requests and seller assessment requests (steps you ask us to take);",
          "record, when you send one of our forms, how your visit reached us (campaign tags, a partner’s referral code, the first page you opened and the referring website), so that we can tell which campaigns and partners bring enquiries and credit partner agents (with your consent, which you give by sending the form after being told about it here and next to the form; you can withdraw it by asking us to delete that record);",
          "compile the visit statistics described above, to understand how the Platform is used, improve it and measure how our campaigns perform (to the extent these statistics are personal data at all, this is necessary to provide, secure and improve the Platform you use under the Terms of Use). Visitors cannot be identified from these statistics alone and we use them only in aggregate, except that when you send one of our forms we can see the pages viewed during that visit alongside your enquiry (with your consent, which you give by sending the form after being told about it here; you can withdraw it by asking us to delete that record);",
          "send saved-search alerts and price-drop emails for deals on your watchlist (at your request; you can turn off the alerts for each saved search at any time, and stop price-drop emails for a deal by removing it from your watchlist);",
          "send you our daily deals newsletter if you subscribe to it: one email a day, only on days the inventory changed, with the deals that went live, the price drops and how many units are no longer available (with your consent, which you give by entering your address and confirming it from the email we send you; you can withdraw it at any time with the unsubscribe link in every issue); and",
          "establish, exercise or defend legal claims and respond to lawful requests from courts, the DLD, RERA and other authorities.",
        ],
      },
      {
        id: "sharing",
        heading: "Who we share it with",
        paragraphs: ["We do not sell personal data. We share it only as follows:"],
        bullets: [
          "Other Users: until the MOU (RERA Form F) is prepared, a Seller sees the amount and terms of an Offer, any message the Buyer wrote, whether the Buyer will pay in cash or with a mortgage and whether the Buyer has completed our identity check, but not the Buyer’s name or contact details. Listings, which anyone can view, show details of the Unit and the photographs uploaded with it, but never the Seller’s name or contact details.",
          `Our team: authorised staff of ${OP.company} can see both parties’ contact details and documents in order to verify Listings and manage transactions.`,
          "Parties to your transaction: when the MOU is prepared, we disclose each party’s identity details to the other as needed to sign RERA Form F and complete the Transfer. When a deal proceeds, we also share what is needed with the Developer (to obtain the NOC and record the assignment), with the DLD and the trustee office (to register the Transfer) and with any bank the Buyer chooses for financing or payment.",
          "Service providers: Vercel hosts the Platform, Neon provides our database and Resend sends our transactional emails. They process personal data on our instructions in order to provide their services to us.",
          "WhatsApp: if you message us on WhatsApp, the conversation is carried by WhatsApp (Meta Platforms), which processes it under its own terms and privacy policy. Nothing is sent to WhatsApp unless you choose to open it and send the message.",
          "Image hosting: some photographs on the Platform, namely the background images of the home page and of the sign-in, sign-up and password-reset pages and some photographs on sample listings, are loaded by your browser directly from the servers of Unsplash. Unsplash therefore receives your IP address and browser details when your browser fetches them, and handles that information under its own privacy policy.",
          "Authorities: courts, regulators, law-enforcement bodies and the competent anti-money-laundering authorities, where the law requires or permits it.",
          "Advisers and successors: our professional advisers, who owe us a duty of confidentiality, and any buyer of all or part of our business, which would be bound by this Policy.",
        ],
      },
      {
        id: "international-transfers",
        heading: "International transfers",
        paragraphs: [
          "Some of our service providers store or process data outside the UAE. In particular, the servers of our database provider, Neon, may be located outside the UAE, our hosting and email providers operate internationally, Unsplash, which serves some photographs directly to your browser, operates outside the UAE, and so does WhatsApp (Meta Platforms) if you message us there.",
          "When personal data is transferred outside the UAE, we transfer it only as the PDPL permits: to a country with an adequate level of data protection, or subject to appropriate safeguards, such as contractual commitments requiring the recipient to protect the data to a standard consistent with the PDPL, or otherwise on a ground the PDPL allows.",
        ],
      },
      {
        id: "retention",
        heading: "How long we keep it",
        paragraphs: ["We keep personal data only for as long as we need it for the purposes described above or as the law requires:"],
        bullets: [
          "Account data: while your account is open. You can ask us to close your account at any time; when we close it, we delete or anonymise your account data within a reasonable time, except where we must keep it for the reasons below.",
          "Transaction and AML records: Listings, Offers, documents and records relating to a transaction, and the identity and source-of-funds information collected for anti-money-laundering purposes, for at least five years, as the law requires.",
          "Server logs: up to 30 days.",
          "Rate-limit records: deleted automatically once they are more than 24 hours old. The clean-up runs whenever a new attempt is recorded and at least once a day.",
          "Visit statistics: 13 months, then deleted automatically by a daily clean-up.",
          "Enquiries: as long as needed to respond and follow up, and afterwards only as part of the transaction records described above where relevant.",
          "Seller assessment requests: up to 24 months after our last contact with you, then deleted automatically, unless they have been linked to your account or have become part of a Listing or transaction, in which case the periods above apply.",
          "Newsletter subscriptions: while you are subscribed. After you unsubscribe, or if you never confirm the address, we keep the record with the dates of your consent and of your unsubscription as evidence of your choice, until you ask us to delete it.",
        ],
      },
      {
        id: "your-rights",
        heading: "Your rights",
        paragraphs: ["Subject to the conditions and exceptions set out in the PDPL, you have the right to:"],
        bullets: [
          "Access: obtain information about the personal data we hold about you, how we use it and who receives it, and a copy of it.",
          "Correction: have inaccurate or incomplete data corrected. You can update most account details yourself on the profile page of your dashboard.",
          "Deletion: ask us to erase personal data that we no longer need or that we process unlawfully.",
          "Restriction: ask us to restrict processing, for example while we check the accuracy of your data or consider an objection.",
          "Objection: object to processing, or ask us to stop it, in the cases the PDPL allows.",
          "Portability: receive the data you gave us in a structured, machine-readable format, or have it transferred to another controller where technically feasible.",
          "Withdrawing consent: withdraw your consent at any time where we rely on it, without affecting processing carried out before the withdrawal.",
          "Complaint: lodge a complaint with the UAE Data Office if you believe we have breached the PDPL.",
        ],
      },
      {
        id: "exercising-rights",
        heading: "How to exercise your rights",
        paragraphs: [
          `To exercise any of these rights, write to ${OP.email} from the email address registered on your account. We may need to verify your identity before acting on a request, and we will respond within the period set by the PDPL and its implementing regulations.`,
          "Some rights are limited by law. For example, we cannot delete records that we must keep under anti-money-laundering rules or that we need for a transaction in progress. If we cannot meet a request in full, we will explain why.",
        ],
      },
      {
        id: "security",
        heading: "How we protect it",
        paragraphs: [
          "No method of transmission or storage is completely secure, but we protect personal data with technical and organisational measures appropriate to the risk. If a breach is likely to affect your privacy, we will notify you and the UAE Data Office as the PDPL requires. If you believe your account has been compromised, change your password and contact us immediately.",
          "Our measures include:",
        ],
        bullets: [
          "encryption in transit (TLS/HTTPS) on every page and between our servers and our database;",
          "passwords stored only as salted bcrypt hashes, never in readable form;",
          "httpOnly session cookies that scripts on the page cannot read, with only a hashed copy of each session token kept on our side;",
          "on the Platform, access to uploaded documents and contact details limited to the account holder and authorised staff (Listing photographs, which are published with the Listing, are the exception); and",
          "limits on repeated sign-in and sign-up attempts.",
        ],
      },
      {
        id: "cookies",
        heading: "Cookies",
        paragraphs: [
          "We use only two cookies, both strictly necessary: od_session keeps you logged in and od_locale remembers your language. We do not use analytics, advertising or third-party cookies; our visit statistics work without cookies. Our Cookie Policy explains them in detail.",
        ],
      },
      {
        id: "children",
        heading: "Children",
        paragraphs: [
          "The Platform is intended for adults. You must be 18 or over to create an account, and we do not knowingly collect personal data from children. If you believe a child has provided personal data to us, please contact us and we will delete it.",
        ],
      },
      {
        id: "emails",
        heading: "Emails you receive",
        paragraphs: [
          "We send emails about your account and its security, including password resets; about your Listings and Offers, counter-offers and the progress of your deals; and, when the price of a deal on your watchlist drops, a price-drop email. We write in the language you last used on the Platform. Account, security and deal emails are part of the service and continue while your account is open. To stop price-drop emails for a deal, remove it from your watchlist. Most of these messages also appear as notifications in your dashboard; password-reset emails do not.",
          "When you save a search, alerts are switched on by default: we email you when new matching deals are published, at most once a day. You can turn off the alerts for each saved search, or delete the saved search, at any time from the saved-searches page of your dashboard.",
          "If you subscribe to our daily deals newsletter, we email you at most once a day, only on days the inventory changed, in the language you subscribed in, and only after you have confirmed your address from the email we send you. Every issue carries an unsubscribe link that stops the newsletter with one click, and you can subscribe again at any time. The newsletter needs no account and is separate from your account: closing your account does not unsubscribe you.",
        ],
      },
      {
        id: "changes",
        heading: "Changes to this Policy",
        paragraphs: [
          "We may update this Policy from time to time, for example when we change service providers or the law changes. We will publish the new version on this page with a new “Last updated” date and, where the changes are significant, tell you by email or through the Platform.",
        ],
      },
      {
        id: "contact",
        heading: "Contact us",
        paragraphs: [`For questions about this Policy or about how we handle your personal data, please contact ${OP.company}:`],
        bullets: contactBulletsEn,
      },
    ],
  },

  ar: {
    title: "سياسة الخصوصية",
    updated: LEGAL_UPDATED,
    summary: `${OP.companyAr} هي المتحكم في البيانات الشخصية التي تُعالَج على منصة ${iso(OP.site)}. نجمع ما نحتاج إليه لإدارة حسابك والتحقق من الإعلانات وإتمام المعاملات بصفتنا وسيطاً، وللوفاء بالتزاماتنا في مكافحة غسل الأموال بموجب القانون الإماراتي. لا نبيع بياناتك ولا نستخدمها لأغراض إعلانية، ولا يطّلع البائعون على هوية المشترين حتى إعداد مذكرة التفاهم (النموذج (F) الصادر عن مؤسسة التنظيم العقاري)، ولا نشارك البيانات مع الطرف الآخر في المعاملة أو المطوّرين أو دائرة الأراضي والأملاك أو مكاتب أمناء التسجيل أو البنوك إلا بالقدر الذي تتطلبه المعاملة. ويمكنك ممارسة حقوقك بموجب قانون حماية البيانات الشخصية الإماراتي بمراسلتنا على ${OP.emailAr}.`,
    sections: [
      {
        id: "who-we-are",
        heading: "من نحن",
        paragraphs: [
          `توضّح سياسة الخصوصية هذه كيفية قيام ${OP.identityAr} (ويُشار إليها بـ«نحن» أو بضمير المتكلم)، التي تدير منصة ${iso(OP.site)} («المنصة»)، بجمع البيانات الشخصية واستخدامها ومشاركتها وحمايتها. ونحن المتحكم في هذه البيانات لأغراض المرسوم بقانون اتحادي رقم (45) لسنة 2021 بشأن حماية البيانات الشخصية («قانون حماية البيانات الشخصية»).`,
          "تسري هذه السياسة على جميع مستخدمي المنصة، بمن فيهم الزوار والمشترون والبائعون ومن يتواصلون معنا. ويكون للمصطلحات المعرَّفة فيها المعاني الواردة في شروط الاستخدام، والتي ينبغي قراءتها مع هذه السياسة ومع سياسة ملفات تعريف الارتباط.",
        ],
      },
      {
        id: "data-we-collect",
        heading: "البيانات الشخصية التي نجمعها",
        paragraphs: ["نجمع الفئات الآتية من البيانات الشخصية:"],
        bullets: [
          "بيانات الحساب: اسمك الكامل، وعنوان بريدك الإلكتروني، ورقم هاتفك المتحرك (إن قدّمته)، ورغبتك في الشراء أو البيع أو كليهما، ولغتك المفضّلة، وقيمة التجزئة المشفّرة لكلمة المرور (لا كلمة المرور نفسها)، وحالة التحقق من هويتك، وتاريخ موافقتك على شروط الاستخدام وهذه السياسة ووقتها.",
          "بيانات الإعلان: تفاصيل وحدتك (المطوّر والمشروع والمنطقة والنوع والمساحة والطابق والإطلالة)، وسعر الشراء، والمبلغ المدفوع، وخطة الدفع، والسعر المطلوب، ومدى استعجالك في البيع، وما إذا كان قد فات سداد أي قسط (ويُذكر ذلك في الوصف المنشور للإعلان)، والوصف الذي تكتبه.",
          "المستندات: الملفات التي ترفعها، مثل اتفاقية البيع والشراء وشهادة أوقود وكشف الحساب وجواز السفر أو بطاقة الهوية الإماراتية وأي مستند مؤيِّد آخر، وتُحفظ في قاعدة بياناتنا، ولا يطّلع عليها على المنصة سواك والموظفون المخوَّلون لدينا.",
          "صور الإعلان: صور الوحدة التي ترفعها مع الإعلان، وتُنشر معه ويمكن لأي شخص مشاهدتها، بل يمكن لكل من لديه رابط الصورة مشاهدتها حتى أثناء مراجعة الإعلان.",
          "بيانات المعاملات: العروض والعروض المقابلة، وطريقة التمويل المفضّلة، والرسائل الموجّهة إلى الطرف الآخر، وحالة كل صفقة، والمعلومات اللازمة لشهادة عدم الممانعة ونقل الملكية.",
          "النشاط والتفضيلات: قائمة المتابعة، وعمليات البحث المحفوظة وإعدادات التنبيه، والإشعارات داخل المنصة والرسائل الإلكترونية التي نرسلها إليك.",
          "بيانات النشرة الإخبارية: إذا اشتركت في نشرة الصفقات اليومية، عنوان البريد الإلكتروني الذي تُدخله، واللغة التي اشتركت بها، ومكان اشتراكك في المنصة، وتاريخ الاشتراك ووقته وعنوان IP الخاص بك في تلك اللحظة (وهذه مجتمعةً سجل موافقتك)، وما إذا كنت قد أكّدت الاشتراك من الرسالة التي نرسلها إليك، وموعد إرسال كل عدد إليك. وإذا اشتركت وأنت مسجّل الدخول، يُربط الاشتراك بحسابك.",
          "الاستفسارات: الاسم وعنوان البريد الإلكتروني ورقم الهاتف والرسالة التي ترسلها عبر نموذج التواصل أو نموذج طلب المعاينة أو نموذج تقييم البائع (وفي نموذج تقييم البائع أيضاً الأرقام التي تُدخلها عن وحدتك، كسعر الشراء والمبلغ المدفوع وما إذا كنت قد تسلّمت إخطاراً بالتعثّر في السداد)، أو عند اتصالك بنا هاتفياً أو مراسلتنا عبر واتساب (بما في ذلك أي أرقام تختار إرسالها، كالأرقام المعبّأة مسبقاً من حاسبة الخروج).",
          "البيانات التقنية: سجلات الخادم التي تتضمن عنوان IP الخاص بك والصفحات المطلوبة وتاريخ الطلب ووقته؛ وسجلات الحدّ من المحاولات المتكررة التي تتضمن عنوان IP الخاص بك، وكذلك عنوان البريد الإلكتروني المُدخَل في محاولات تسجيل الدخول وعند الاشتراك في النشرة الإخبارية؛ وملفّا تعريف الارتباط المبيّنان في سياسة ملفات تعريف الارتباط؛ وعند إرسالك أحد نماذجنا، طريقة وصول زيارتك إلينا (وسوم الحملة في الرابط الذي اتبعته، ورمز الإحالة الخاص بأحد الشركاء، وأول صفحة فتحتها، والموقع الذي أحالك إلينا)، ويحتفظ بها متصفحك طوال تلك الزيارة في مساحة تخزين الجلسة لا في ملف تعريف ارتباط.",
          "إحصاءات الزيارات: نسجّل لكل صفحة تتصفحها خارج لوحة التحكم الخاصة بك عنوانها (دون أي معاملات استعلام)، والموقع الذي أوصلك رابطه إلينا (إن جئت من موقع آخر)، ووسوم الحملة ورمز إحالة الشريك في الرابط الذي اتبعته، والدولة والمدينة كما يستنتجهما مزوّد الاستضافة من عنوان IP الخاص بك، ونوع الجهاز (هاتف محمول أو جهاز لوحي أو حاسوب) والمتصفح، واللغة التي تستخدمها على المنصة، والمدة التي ظلّت فيها الصفحة معروضة على شاشتك. وتُجمَع الصفحات في زيارات بواسطة معرّف عشوائي يحتفظ به متصفحك في مساحة تخزين الجلسة لعلامة التبويب تلك (ويُستبدل بآخر بعد 30 دقيقة دون أي نشاط)، ويُميَّز الزوار بعضهم من بعض بمعرّف مجهول يُحتسب من عنوان IP وبيانات المتصفح مع التاريخ ومفتاح سري، ويتغيّر كل يوم. ولا نستخدم لذلك أي ملفات تعريف ارتباط، ولا نخزّن مع هذه الإحصاءات عنوان IP الخاص بك ولا سلسلة تعريف متصفحك الكاملة (وكيل المستخدم)، بل نوع الجهاز واسم المتصفح فقط. وعند إرسالك أحد نماذجنا، يُرسَل معه معرّف زيارتك لنتمكن من معرفة الصفحات التي تُصفِّحت قبل إرساله. ولا يُسجَّل شيء لموظفينا المسجّلين الدخول ولا للمتصفحات الآلية.",
        ],
      },
      {
        id: "sources",
        heading: "مصادر البيانات",
        paragraphs: [
          "تقدّم أنت معظم البيانات الشخصية التي نحتفظ بها عند التسجيل أو إدراج وحدة أو تقديم عرض أو رفع المستندات أو التواصل معنا، ويُنشأ بعضها تلقائياً عند استخدامك للمنصة، مثل سجلات الخادم وسجلات الحدّ من المحاولات وإحصاءات الزيارات والإشعارات.",
          "وفي سياق المعاملة، نتلقى أيضاً معلومات من المطوّرين (مثل كشوف الحساب وشروط إصدار شهادة عدم الممانعة)، ومن دائرة الأراضي والأملاك ومكاتب أمناء التسجيل، ومن الطرف الآخر في المعاملة. وقد نرجع كذلك إلى مصادر عامة، مثل قوائم العقوبات، للوفاء بالتزاماتنا القانونية.",
        ],
      },
      {
        id: "purposes",
        heading: "أغراض المعالجة وأسسها القانونية",
        paragraphs: [
          "لا نعالج البيانات الشخصية إلا استناداً إلى أساس يجيزه قانون حماية البيانات الشخصية، وهو موافقتك، أو كون المعالجة ضرورية لتنفيذ عقد أنت طرف فيه أو لاتخاذ إجراءات تطلبها قبل إبرامه، أو للوفاء بالتزامات تفرضها علينا قوانين أخرى في الدولة، أو لإثبات الحقوق القانونية أو ممارستها أو الدفاع عنها.",
          "لا نبيع البيانات الشخصية ولا نستخدمها لأغراض إعلانية. ومتى استندنا إلى موافقتك، يحق لك سحبها في أي وقت دون أن يؤثر ذلك في المعالجة التي تمت قبل السحب.",
          "ونستخدم البيانات الشخصية من أجل:",
        ],
        bullets: [
          "إنشاء حسابك وإدارته، ونشر الإعلانات وإدارتها، وعرض العروض، وتشغيل قوائم المتابعة وعمليات البحث المحفوظة والإشعارات (وهي معالجة ضرورية لتنفيذ اتفاقنا معك بموجب شروط الاستخدام)؛",
          "التحقق من المستندات وإتمام معاملتك بصفتنا وسيطاً، بما في ذلك طلب شهادة عدم الممانعة وترتيب نقل الملكية (وهي معالجة ضرورية لتنفيذ اتفاقية الوساطة، بما فيها النموذجان (A) و(B) الصادران عن مؤسسة التنظيم العقاري، ولاتخاذ الإجراءات التي تطلبها)؛",
          "التحقق من هويتك ومن مصدر الأموال، وفحص قوائم العقوبات، والاحتفاظ بالسجلات، والإبلاغ عن الأنشطة المشبوهة (وهي معالجة ضرورية للوفاء بالتزاماتنا القانونية، بما فيها الالتزامات المقررة بموجب المرسوم بقانون اتحادي رقم (10) لسنة 2025 في شأن مواجهة غسل الأموال ومكافحة تمويل الإرهاب وتمويل انتشار التسلح)؛",
          "حماية المنصة وحسابك، ومنع الاحتيال وإساءة الاستخدام، كالحدّ من محاولات تسجيل الدخول المتكررة، وإصلاح الأعطال (وهي معالجة ضرورية لتنفيذ اتفاقنا معك وللوفاء بواجبنا في حماية البيانات الشخصية بموجب القانون)؛",
          "الرد على استفساراتك وطلبات المعاينة وطلبات تقييم وحدات البائعين (بناءً على طلبك)؛",
          "تسجيل الطريقة التي وصلت بها زيارتك إلينا عند إرسالك أحد نماذجنا (وسوم الحملة، ورمز إحالة الشريك، وأول صفحة فتحتها، والموقع الذي أحالك)، لنعرف الحملات والشركاء الذين يجلبون الاستفسارات ولنحتسب مستحقات الوسطاء الشركاء (بناءً على موافقتك التي تمنحها بإرسال النموذج بعد إعلامك بذلك هنا وبجوار النموذج، ويمكنك سحبها بأن تطلب منا حذف هذا السجل)؛",
          "إعداد إحصاءات الزيارات المبيّنة أعلاه، لفهم كيفية استخدام المنصة وتحسينها وقياس أداء حملاتنا (وبقدر ما تُعدّ هذه الإحصاءات بيانات شخصية أصلاً، فإن معالجتها ضرورية لتقديم المنصة التي تستخدمها بموجب شروط الاستخدام وحمايتها وتحسينها). ولا يمكن التعرّف على الزوار من هذه الإحصاءات وحدها، ولا نستخدمها إلا مجمّعةً، باستثناء أنه عند إرسالك أحد نماذجنا يمكننا الاطلاع على الصفحات التي تُصفِّحت خلال تلك الزيارة إلى جانب طلبك (بناءً على موافقتك التي تمنحها بإرسال النموذج بعد إعلامك بذلك هنا، ويمكنك سحبها بأن تطلب منا حذف هذا السجل)؛",
          "إرسال تنبيهات عمليات البحث المحفوظة ورسائل انخفاض أسعار الصفقات المدرجة في قائمة متابعتك (بناءً على طلبك، ويمكنك في أي وقت إيقاف التنبيهات لكل عملية بحث محفوظة على حدة، وإيقاف رسائل انخفاض السعر لصفقة ما بإزالتها من قائمة المتابعة)؛",
          "إرسال نشرة الصفقات اليومية إليك إذا اشتركت فيها: رسالة واحدة في اليوم، فقط في الأيام التي يتغيّر فيها المخزون، تضم الصفقات التي نُشرت وتخفيضات الأسعار وعدد الوحدات التي لم تعد متاحة (بناءً على موافقتك التي تمنحها بإدخال عنوانك وتأكيده من الرسالة التي نرسلها إليك، ويمكنك سحبها في أي وقت عبر رابط إلغاء الاشتراك الموجود في كل عدد)؛",
          "إثبات الحقوق القانونية أو ممارستها أو الدفاع عنها، والاستجابة للطلبات المشروعة من المحاكم ودائرة الأراضي والأملاك ومؤسسة التنظيم العقاري وغيرها من الجهات.",
        ],
      },
      {
        id: "sharing",
        heading: "الجهات التي نشارك البيانات معها",
        paragraphs: ["لا نبيع البيانات الشخصية، ولا نشاركها إلا على النحو الآتي:"],
        bullets: [
          "المستخدمون الآخرون: حتى إعداد مذكرة التفاهم (النموذج (F) الصادر عن مؤسسة التنظيم العقاري)، يطّلع البائع على مبلغ العرض وشروطه، وعلى أي رسالة كتبها المشتري، وعلى ما إذا كان المشتري سيدفع نقداً أم بتمويل عقاري، وما إذا كان قد أتمّ إجراءات التحقق من الهوية لدينا، دون اسم المشتري أو بيانات التواصل معه. أما الإعلانات، التي يمكن لأي شخص الاطلاع عليها، فتعرض تفاصيل الوحدة والصور المرفوعة معها، ولا تعرض بأي حال اسم البائع أو بيانات التواصل معه.",
          `فريقنا: يطّلع الموظفون المخوَّلون لدى ${OP.companyAr} على بيانات التواصل مع الطرفين وعلى المستندات، للتحقق من الإعلانات وإدارة المعاملات.`,
          "أطراف معاملتك: عند إعداد مذكرة التفاهم، نُفصح لكل طرف عن بيانات هوية الطرف الآخر بالقدر اللازم لتوقيع النموذج (F) وإتمام نقل الملكية. وعند المضي في الصفقة، نشارك كذلك القدر اللازم من البيانات مع المطوّر (للحصول على شهادة عدم الممانعة وتسجيل التنازل)، ومع دائرة الأراضي والأملاك ومكتب أمين التسجيل (لتسجيل نقل الملكية)، ومع أي بنك يختاره المشتري للتمويل أو للدفع.",
          `مزوّدو الخدمات: تستضيف شركة ${iso("Vercel")} المنصة، وتوفّر شركة ${iso("Neon")} قاعدة بياناتنا، وترسل شركة ${iso("Resend")} رسائلنا الإلكترونية الخدمية. ويعالج هؤلاء البيانات الشخصية وفق تعليماتنا لتقديم خدماتهم لنا.`,
          `واتساب: إذا راسلتنا عبر ${iso("WhatsApp")} فإن المحادثة تمر عبر خدمة ${iso("WhatsApp")} (شركة ${iso("Meta Platforms")})، التي تعالجها وفق شروطها وسياسة الخصوصية الخاصة بها. ولا يُرسل أي شيء إلى ${iso("WhatsApp")} ما لم تختر فتحه وإرسال الرسالة بنفسك.`,
          `استضافة الصور: يُحمّل متصفحك بعض الصور المعروضة على المنصة مباشرةً من خوادم ${iso("Unsplash")}، وهي صور الخلفية في الصفحة الرئيسية وفي صفحات تسجيل الدخول وإنشاء الحساب وإعادة تعيين كلمة المرور، وبعض صور الإعلانات التوضيحية. ولذلك تتلقى ${iso("Unsplash")} عنوان IP الخاص بك وبيانات متصفحك عند تحميل هذه الصور، وتتعامل مع هذه المعلومات وفق سياسة الخصوصية الخاصة بها.`,
          "الجهات الرسمية: المحاكم والجهات التنظيمية وجهات إنفاذ القانون والسلطات المختصة بمكافحة غسل الأموال، متى أوجب القانون ذلك أو أجازه.",
          "المستشارون والخلفاء: مستشارونا المهنيون الملتزمون بواجب السرية، وأي جهة تستحوذ على أعمالنا كلياً أو جزئياً وتلتزم بهذه السياسة.",
        ],
      },
      {
        id: "international-transfers",
        heading: "نقل البيانات إلى خارج الدولة",
        paragraphs: [
          `يخزّن بعض مزوّدي خدماتنا البيانات أو يعالجونها خارج دولة الإمارات العربية المتحدة؛ فقد تقع خوادم مزوّد قاعدة البيانات ${iso("Neon")} خارج الدولة، ويعمل مزوّدا الاستضافة والبريد الإلكتروني على نطاق دولي، كما تعمل ${iso("Unsplash")}، التي تقدّم بعض الصور مباشرةً إلى متصفحك، من خارج الدولة، وكذلك ${iso("WhatsApp")} (شركة ${iso("Meta Platforms")}) إن راسلتنا عبرها.`,
          "وعند نقل البيانات الشخصية إلى خارج الدولة، لا ننقلها إلا وفق ما يجيزه قانون حماية البيانات الشخصية: إلى دولة توفّر مستوى ملائماً من الحماية، أو مع ضمانات مناسبة، كالتزامات تعاقدية تُلزم الجهة المستلمة بحماية البيانات وفق معايير تتسق مع القانون، أو استناداً إلى أي أساس آخر يجيزه القانون.",
        ],
      },
      {
        id: "retention",
        heading: "مدة الاحتفاظ بالبيانات",
        paragraphs: ["لا نحتفظ بالبيانات الشخصية إلا للمدة اللازمة لتحقيق الأغراض المبيّنة أعلاه أو التي يقتضيها القانون:"],
        bullets: [
          "بيانات الحساب: طوال مدة بقاء حسابك قائماً. ويمكنك أن تطلب منا إغلاق حسابك في أي وقت، وعند إغلاقه نحذف بيانات حسابك أو نجعلها مجهولة الهوية خلال مدة معقولة، ما لم يلزمنا الاحتفاظ بها للأسباب المبيّنة أدناه.",
          "سجلات المعاملات ومكافحة غسل الأموال: الإعلانات والعروض والمستندات والسجلات المتعلقة بأي معاملة، وبيانات الهوية ومصدر الأموال التي نجمعها لأغراض مكافحة غسل الأموال، لمدة لا تقل عن خمس سنوات وفقاً لما يقتضيه القانون.",
          "سجلات الخادم: مدة أقصاها 30 يوماً.",
          "سجلات الحدّ من المحاولات المتكررة: تُحذف تلقائياً متى تجاوز عمرها 24 ساعة، وتجري عملية الحذف عند تسجيل كل محاولة جديدة ومرة واحدة يومياً على الأقل.",
          "إحصاءات الزيارات: 13 شهراً، ثم تُحذف تلقائياً بعملية تنظيف يومية.",
          "الاستفسارات: المدة اللازمة للرد عليها ومتابعتها، ثم ضمن سجلات المعاملات المبيّنة أعلاه عند الاقتضاء.",
          "طلبات تقييم وحدات البائعين: مدة أقصاها 24 شهراً من آخر تواصل بيننا، ثم تُحذف تلقائياً، ما لم تُربط بحسابك أو تصبح جزءاً من إعلان أو معاملة، فتسري عندئذ المدد المبيّنة أعلاه.",
          "اشتراكات النشرة الإخبارية: ما دمت مشتركاً. وبعد إلغاء اشتراكك، أو إذا لم تؤكّد عنوانك أصلاً، نحتفظ بالسجل مع تاريخ موافقتك وتاريخ إلغاء الاشتراك إثباتاً لاختيارك، إلى أن تطلب منا حذفه.",
        ],
      },
      {
        id: "your-rights",
        heading: "حقوقك",
        paragraphs: ["مع مراعاة الشروط والاستثناءات الواردة في قانون حماية البيانات الشخصية، يحق لك:"],
        bullets: [
          "الاطلاع: الحصول على معلومات عن البيانات الشخصية التي نحتفظ بها عنك وكيفية استخدامها والجهات التي تتلقاها، وعلى نسخة منها.",
          "التصحيح: تصحيح البيانات غير الدقيقة أو استكمال الناقص منها، ويمكنك تحديث معظم بيانات حسابك بنفسك من صفحة الملف الشخصي في لوحة التحكم.",
          "الحذف: طلب مسح البيانات الشخصية التي لم نعد بحاجة إليها أو التي نعالجها بصورة غير مشروعة.",
          "تقييد المعالجة: طلب تقييد المعالجة، كأن يكون ذلك أثناء تحققنا من دقة بياناتك أو نظرنا في اعتراضك.",
          "الاعتراض: الاعتراض على المعالجة أو طلب إيقافها في الحالات التي يجيزها القانون.",
          "نقل البيانات: الحصول على البيانات التي قدّمتها لنا بصيغة منظّمة وقابلة للقراءة آلياً، أو نقلها إلى متحكم آخر متى كان ذلك ممكناً تقنياً.",
          "سحب الموافقة: سحب موافقتك في أي وقت متى استندنا إليها، دون أن يؤثر ذلك في المعالجة التي تمت قبل السحب.",
          "تقديم شكوى: تقديم شكوى إلى مكتب الإمارات للبيانات إذا رأيت أننا خالفنا قانون حماية البيانات الشخصية.",
        ],
      },
      {
        id: "exercising-rights",
        heading: "كيفية ممارسة حقوقك",
        paragraphs: [
          `لممارسة أي من هذه الحقوق، راسلنا على ${OP.emailAr} من عنوان البريد الإلكتروني المسجّل في حسابك. وقد نحتاج إلى التحقق من هويتك قبل تنفيذ الطلب، وسنرد عليه خلال المدة التي يحددها القانون ولائحته التنفيذية.`,
          "بعض هذه الحقوق مقيّد بموجب القانون؛ فلا يمكننا مثلاً حذف السجلات التي يلزمنا الاحتفاظ بها بموجب قواعد مكافحة غسل الأموال أو التي نحتاج إليها لمعاملة جارية. وإذا تعذّر علينا تلبية طلبك كاملاً، فسنوضّح لك السبب.",
        ],
      },
      {
        id: "security",
        heading: "حماية البيانات",
        paragraphs: [
          "لا توجد وسيلة نقل أو تخزين آمنة تماماً، لكننا نحمي البيانات الشخصية بتدابير تقنية وتنظيمية تتناسب مع المخاطر. وإذا وقع اختراق يُرجَّح أن يمسّ خصوصيتك، فسنُخطرك ونُخطر مكتب الإمارات للبيانات وفقاً لما يقتضيه القانون. وإذا اعتقدت أن حسابك قد تعرّض للاختراق، فغيّر كلمة المرور وتواصل معنا فوراً.",
          "وتشمل تدابيرنا ما يلي:",
        ],
        bullets: [
          `تشفير البيانات أثناء نقلها باستخدام بروتوكول ${iso("TLS/HTTPS")} في جميع الصفحات وبين خوادمنا وقاعدة بياناتنا؛`,
          `تخزين كلمات المرور في صورة قيم تجزئة مملّحة باستخدام خوارزمية ${iso("bcrypt")} فقط، وعدم حفظها بصيغة مقروءة مطلقاً؛`,
          `استخدام ملفات تعريف ارتباط للجلسات من نوع ${iso("httpOnly")} لا يمكن للنصوص البرمجية في الصفحة قراءتها، مع الاحتفاظ لدينا بنسخة مجزّأة فقط من رمز كل جلسة؛`,
          "قصر الاطلاع على المنصة على المستندات المرفوعة وبيانات التواصل على صاحب الحساب والموظفين المخوَّلين (باستثناء صور الإعلانات التي تُنشر مع الإعلان)؛",
          "الحدّ من محاولات تسجيل الدخول وإنشاء الحسابات المتكررة.",
        ],
      },
      {
        id: "cookies",
        heading: "ملفات تعريف الارتباط",
        paragraphs: [
          `لا نستخدم سوى ملفَّي تعريف ارتباط، وكلاهما ضروري تماماً: ${iso("od_session")} لإبقائك مسجّلاً الدخول، و${iso("od_locale")} لتذكّر لغتك. ولا نستخدم ملفات تعريف ارتباط للتحليلات أو الإعلانات أو تابعة لأطراف أخرى، ولا تعتمد إحصاءات الزيارات لدينا على أي ملفات تعريف ارتباط. وتوضّحها سياسة ملفات تعريف الارتباط بالتفصيل.`,
        ],
      },
      {
        id: "children",
        heading: "الأطفال",
        paragraphs: [
          "المنصة مخصصة للبالغين؛ إذ يجب أن تكون قد أتممت الثامنة عشرة لإنشاء حساب، ولا نجمع عن علمٍ بيانات شخصية من الأطفال. وإذا اعتقدت أن طفلاً قدّم إلينا بيانات شخصية، فيُرجى التواصل معنا لنحذفها.",
        ],
      },
      {
        id: "emails",
        heading: "الرسائل الإلكترونية التي تصلك",
        paragraphs: [
          "نرسل إليك رسائل إلكترونية تتعلق بحسابك وأمانه، بما فيها رسائل إعادة تعيين كلمة المرور، وبإعلاناتك وعروضك والعروض المقابلة وسير صفقاتك، ورسالة عند انخفاض سعر أي صفقة مدرجة في قائمة متابعتك، وذلك باللغة التي استخدمتها آخر مرة على المنصة. وتُعدّ رسائل الحساب والأمان والصفقات جزءاً من الخدمة وتستمر ما دام حسابك قائماً. ولإيقاف رسائل انخفاض السعر لصفقة ما، أزِلها من قائمة المتابعة. وتظهر معظم هذه الرسائل أيضاً في صورة إشعارات في لوحة التحكم، باستثناء رسائل إعادة تعيين كلمة المرور.",
          "عند حفظ عملية بحث، تكون التنبيهات مفعّلة تلقائياً، فنراسلك عند نشر صفقات جديدة مطابقة، بمعدل لا يتجاوز مرة واحدة يومياً. ويمكنك في أي وقت إيقاف التنبيهات لكل عملية بحث محفوظة على حدة، أو حذف عملية البحث المحفوظة، من صفحة عمليات البحث المحفوظة في لوحة التحكم.",
          "وإذا اشتركت في نشرة الصفقات اليومية، نراسلك مرة واحدة في اليوم على الأكثر، فقط في الأيام التي يتغيّر فيها المخزون، وباللغة التي اشتركت بها، ولا نبدأ بذلك إلا بعد تأكيدك لعنوانك من الرسالة التي نرسلها إليك. ويتضمن كل عدد رابطاً لإلغاء الاشتراك يوقف النشرة بنقرة واحدة، ويمكنك الاشتراك مجدداً في أي وقت. ولا تحتاج النشرة إلى حساب، وهي مستقلة عن حسابك: فإغلاق حسابك لا يلغي اشتراكك فيها.",
        ],
      },
      {
        id: "changes",
        heading: "التعديلات على هذه السياسة",
        paragraphs: [
          "قد نحدّث هذه السياسة من حين لآخر، كأن نغيّر مزوّدي خدماتنا أو يتغيّر القانون. وسننشر النسخة الجديدة على هذه الصفحة مع تاريخ «آخر تحديث» جديد، ونُخطرك عبر البريد الإلكتروني أو من خلال المنصة إذا كانت التعديلات جوهرية.",
        ],
      },
      {
        id: "contact",
        heading: "التواصل معنا",
        paragraphs: [`لأي استفسار بشأن هذه السياسة أو كيفية تعاملنا مع بياناتك الشخصية، يُرجى التواصل مع ${OP.companyAr}:`],
        bullets: contactBulletsAr,
      },
    ],
  },

  zh: {
    title: "隐私政策",
    updated: LEGAL_UPDATED,
    summary: `${OP.companyZh} 是 ${OP.site} 平台上所处理个人数据的数据控制者。我们收集的是运营您的账户、核实房源、居间促成交易以及履行阿联酋法律规定的反洗钱义务所需的数据。我们绝不出售您的数据，也不将其用于广告；在迪拜房地产监管局（RERA）F 表谅解备忘录（MOU）准备完成之前，卖家无法看到买家的身份；只有在交易需要时，我们才会与交易相对方、开发商、迪拜土地局（DLD）、产权登记受托机构和银行共享数据。您可以通过致函 ${OP.emailZh} 行使您在《阿联酋个人数据保护法》下的权利。本中文译本仅供参考，如有歧义，以英文版本为准。`,
    sections: [
      {
        id: "who-we-are",
        heading: "我们是谁",
        paragraphs: [
          `本隐私政策说明我们如何收集、使用、共享和保护个人数据。“我们”指 ${OP.identityZh}，即 ${OP.site} 平台（以下简称“本平台”）的运营方。就《阿联酋 2021 年第（45）号关于保护个人数据的联邦法令》（UAE Federal Decree-Law No. (45) of 2021 on the Protection of Personal Data，以下简称《个人数据保护法》）而言，我们是该等数据的数据控制者（Controller）。`,
          "本政策适用于本平台的所有使用者，包括访客、买家、卖家以及与我们联系的人士。本政策中的定义术语具有我们《使用条款》中赋予的含义；《使用条款》应与本政策及我们的《Cookie 政策》一并阅读。",
        ],
      },
      {
        id: "data-we-collect",
        heading: "我们收集的个人数据",
        paragraphs: ["我们收集以下类别的个人数据："],
        bullets: [
          "账户数据：您的全名、电子邮箱地址、手机号码（如您提供）、您希望购买、出售还是两者兼有、您的首选语言、您密码的哈希值、您的身份核验（了解您的客户，KYC）状态，以及您接受我们《使用条款》和本政策的日期和时间。",
          "房源数据：您单元的详细信息（开发商、项目、社区、类型、面积、楼层和景观）、购买价格、已付金额、付款计划、要价、您需要出售的紧急程度、是否有任何分期款逾期未付（这一点会在公开的房源描述中注明），以及您撰写的描述。",
          "文件：您上传的文件，例如买卖协议（SPA）、Oqood 期房登记证书、付款对账单、护照或阿联酋身份证（Emirates ID）以及任何其他证明文件。这些文件存储在我们的数据库中，在本平台上仅您本人和我们的授权员工可以查看。",
          "房源照片：您随房源上传的单元照片。这些照片与房源一并发布，任何人均可查看；即使房源仍在审核中，任何持有照片网址的人也都可以查看。",
          "交易数据：报价和还价、融资偏好、发送给相对方的留言、每笔交易的状态，以及办理开发商无异议函（NOC）和过户所需的信息。",
          "活动和偏好：您的关注列表、已保存的搜索和提醒设置，以及我们发送给您的站内通知和电子邮件。",
          "每日资讯订阅数据：如果您订阅我们的每日资讯，则包括您输入的电子邮箱地址、您订阅时所用的语言、您在本平台上订阅的位置、订阅的日期和时间以及当时的 IP 地址（以上合称您的同意记录）、您是否已通过我们发送的邮件确认订阅，以及每期资讯发送给您的时间。如果您在登录状态下订阅，该订阅将与您的账户关联。",
          "咨询：您通过我们的联系表单、看房预约表单或卖家评估表单发送的姓名、电子邮箱地址、电话号码和留言（对于卖家评估表单，还包括您输入的有关您单元的数字，例如购买价格、已付金额以及您是否已收到违约通知），或者您致电我们或通过 WhatsApp 向我们发送消息时提供的信息（包括您选择发送的任何数字，例如从退出测算器预填的数字）。",
          "技术数据：包含您的 IP 地址、所请求页面以及日期和时间的服务器日志；包含您的 IP 地址以及（对于登录尝试和每日资讯订阅）所输入电子邮箱地址的频率限制记录；我们《Cookie 政策》中所述的两个 Cookie；以及当您提交我们的任一表单时，您的访问是如何到达我们的（您所点击链接的推广活动标签、合作伙伴的推荐码、您打开的第一个页面以及来源网站）——这些信息由您的浏览器在该次访问期间保存在会话存储（session storage）中，而非保存在 Cookie 中。",
          "访问统计：对于您在“我的账户”之外浏览的每个页面，我们记录该页面的地址（不含任何查询字符串）、将您带到我们网站的来源网站（如果您来自其他网站）、您所点击链接中的推广活动标签和合作伙伴推荐码、我们的托管服务商根据您的 IP 地址推算的国家和城市、设备类型（手机、平板或台式电脑）和浏览器、您在本平台上使用的语言，以及该页面在您屏幕上显示的时长。各页面通过一个随机标识符归并为一次访问，该标识符由您的浏览器为该标签页保存在会话存储中（闲置 30 分钟后生成新的标识符）；不同访客则通过一个匿名标识符加以区分，该标识符由您的 IP 地址和浏览器信息连同日期和一个每天更换的密钥计算得出。我们不为此使用任何 Cookie，也不会将您的 IP 地址或浏览器的完整标识字符串（用户代理，user agent）与这些统计数据一并存储，仅存储设备类型和浏览器名称。当您提交我们的任一表单时，您本次访问的标识符会随表单一并发送，以便我们了解表单提交前浏览过哪些页面。对于我们已登录的员工和自动化浏览器，不记录任何内容。",
        ],
      },
      {
        id: "sources",
        heading: "数据来源",
        paragraphs: [
          "我们持有的大部分个人数据由您在注册、发布房源、提出报价、上传文件或联系我们时提供。部分数据在您使用本平台时自动生成，例如服务器日志、频率限制记录、访问统计和通知。",
          "在交易过程中，我们还会从开发商（例如付款对账单和无异议函的条件）、迪拜土地局（DLD）和产权登记受托机构以及交易相对方处获取信息。为履行我们的法律义务，我们还可能查询公开来源，例如制裁名单。",
        ],
      },
      {
        id: "purposes",
        heading: "我们使用数据的目的及法律依据",
        paragraphs: [
          "我们仅基于《个人数据保护法》允许的依据处理个人数据：您的同意；或者该处理为履行与您之间的合同或应您的请求在订立合同前采取步骤所必需，为遵守阿联酋其他法律对我们规定的义务所必需，或为确立、行使或抗辩法律主张所必需。",
          "我们不出售个人数据，也不将其用于广告。在我们依据您的同意进行处理的情形下，您可以随时撤回同意，但不影响撤回前已进行的处理。",
          "我们将个人数据用于：",
        ],
        bullets: [
          "创建和管理您的账户，发布和管理房源，转达报价，以及运行关注列表、已保存的搜索和通知（为履行我们根据《使用条款》与您达成的协议所必需）；",
          "核实文件并居间促成您的交易，包括申请无异议函和安排过户（为履行我们的经纪协议——包括迪拜房地产监管局（RERA）A 表和 B 表——以及采取您所请求的步骤所必需）；",
          "核验您的身份、核查资金来源、筛查制裁名单、保存记录并报告可疑活动（为遵守我们的法律义务所必需，包括《2025 年第（10）号关于反洗钱、打击恐怖主义融资和扩散融资的联邦法令》（Federal Decree-Law No. (10) of 2025 on Anti-Money Laundering and Combating the Financing of Terrorism and Proliferation Financing）规定的义务）；",
          "保障本平台和您账户的安全，防止欺诈和滥用（例如限制重复的登录尝试），以及排除故障（为履行我们与您之间的协议以及履行《个人数据保护法》规定的保护个人数据的义务所必需）；",
          "回复您的咨询、看房预约和卖家评估请求（您请求我们采取的步骤）；",
          "在您提交我们的任一表单时，记录您的访问是如何到达我们的（推广活动标签、合作伙伴的推荐码、您打开的第一个页面以及来源网站），以便我们了解哪些推广活动和合作伙伴带来了咨询，并将相关咨询归于相应的合作伙伴经纪人（基于您的同意：您在本政策中及表单旁获知此事后提交表单，即视为同意；您可以要求我们删除该记录以撤回同意）；",
          "编制上述访问统计，以了解本平台的使用情况、改进本平台并衡量我们推广活动的效果（在这些统计数据构成个人数据的范围内，该处理为提供、保护和改进您根据《使用条款》使用的本平台所必需）。仅凭这些统计数据无法识别访客身份，我们也仅以汇总形式使用这些数据；但当您提交我们的任一表单时，我们可以在您的咨询旁查看该次访问期间浏览过的页面（基于您的同意：您在本政策中获知此事后提交表单，即视为同意；您可以要求我们删除该记录以撤回同意）；",
          "发送已保存搜索的提醒以及您关注列表中房源的降价邮件（应您的请求；您可以随时关闭每个已保存搜索的提醒，并可通过将某一房源从关注列表中移除来停止其降价邮件）；",
          "如果您订阅了我们的每日资讯，则向您发送该资讯：每天一封邮件，且仅在房源库存发生变化的日子发送，内容包括新上线的房源、降价信息以及已不再可售的单元数量（基于您的同意：您输入邮箱地址并通过我们发送的邮件确认，即视为同意；您可以随时通过每期资讯中的退订链接撤回同意）；以及",
          "确立、行使或抗辩法律主张，并回应法院、迪拜土地局、RERA 及其他主管机关的合法要求。",
        ],
      },
      {
        id: "sharing",
        heading: "我们与谁共享数据",
        paragraphs: ["我们不出售个人数据。我们仅在下列情形下共享个人数据："],
        bullets: [
          "其他用户：在谅解备忘录（MOU，即 RERA F 表）准备完成之前，卖家可以看到报价的金额和条件、买家撰写的任何留言、买家将以现金还是按揭付款以及买家是否已完成我们的身份核验，但看不到买家的姓名或联系方式。任何人均可查看的房源会显示单元的详细信息以及随房源上传的照片，但绝不显示卖家的姓名或联系方式。",
          `我们的团队：${OP.companyZh} 的授权员工可以查看双方的联系方式和文件，以核实房源和管理交易。`,
          "您交易的各方：在准备谅解备忘录时，我们会在签署 RERA F 表和完成过户所需的范围内，向交易各方相互披露对方的身份信息。当交易推进时，我们还会在必要范围内与开发商（为取得无异议函并登记转让）、迪拜土地局和产权登记受托机构（为登记过户）以及买家为融资或付款所选择的任何银行共享所需信息。",
          "服务提供商：Vercel 托管本平台，Neon 提供我们的数据库，Resend 发送我们的事务性电子邮件。它们按照我们的指示处理个人数据，以向我们提供其服务。",
          "WhatsApp：如果您通过 WhatsApp 向我们发送消息，该对话由 WhatsApp（Meta Platforms 公司）传输，并由其根据自身的条款和隐私政策进行处理。除非您选择打开 WhatsApp 并发送消息，否则不会有任何内容发送至 WhatsApp。",
          "图片托管：本平台上的部分照片，即首页以及登录、注册和密码重置页面的背景图片和部分示例房源的照片，由您的浏览器直接从 Unsplash 的服务器加载。因此，当您的浏览器获取这些图片时，Unsplash 会收到您的 IP 地址和浏览器信息，并根据其自身的隐私政策处理该等信息。",
          "主管机关：在法律要求或允许的情况下，向法院、监管机构、执法机关以及反洗钱主管机关提供。",
          "顾问和继受方：对我们负有保密义务的专业顾问，以及收购我们全部或部分业务的任何收购方（该收购方将受本政策约束）。",
        ],
      },
      {
        id: "international-transfers",
        heading: "跨境传输",
        paragraphs: [
          "我们的部分服务提供商在阿联酋境外存储或处理数据。特别是，我们的数据库提供商 Neon 的服务器可能位于阿联酋境外，我们的托管和电子邮件服务提供商在全球范围内运营，直接向您的浏览器提供部分照片的 Unsplash 在阿联酋境外运营，如果您通过 WhatsApp 向我们发送消息，WhatsApp（Meta Platforms 公司）同样在阿联酋境外运营。",
          "当个人数据被传输至阿联酋境外时，我们仅按《个人数据保护法》允许的方式进行传输：传输至具有充分数据保护水平的国家，或在适当的保障措施（例如要求接收方按照与《个人数据保护法》相一致的标准保护数据的合同承诺）之下传输，或基于《个人数据保护法》允许的其他依据进行传输。",
        ],
      },
      {
        id: "retention",
        heading: "我们保存数据的期限",
        paragraphs: ["我们仅在实现上述目的所需或法律要求的期限内保存个人数据："],
        bullets: [
          "账户数据：在您的账户存续期间。您可以随时要求我们注销您的账户；注销后，我们会在合理期限内删除或匿名化您的账户数据，但因下述原因必须保留的除外。",
          "交易和反洗钱记录：房源、报价、文件以及与交易相关的记录，以及为反洗钱目的收集的身份和资金来源信息，按法律要求至少保存五年。",
          "服务器日志：最长 30 天。",
          "频率限制记录：超过 24 小时后自动删除。清理程序在每次记录新的尝试时运行，并且每天至少运行一次。",
          "访问统计：13 个月，之后由每日清理程序自动删除。",
          "咨询：在回复和跟进所需的期限内保存，此后仅在相关情况下作为上述交易记录的一部分保存。",
          "卖家评估请求：自我们与您最后一次联系起最长 24 个月，之后自动删除；但如果该请求已与您的账户关联，或已成为房源或交易的一部分，则适用上述期限。",
          "每日资讯订阅：在您订阅期间。在您退订后，或者您从未确认邮箱地址的，我们将保留该记录及其中您同意和退订的日期，作为您所作选择的证明，直至您要求我们删除为止。",
        ],
      },
      {
        id: "your-rights",
        heading: "您的权利",
        paragraphs: ["在遵守《个人数据保护法》规定的条件和例外的前提下，您有权："],
        bullets: [
          "访问：获取有关我们所持有的您的个人数据、我们如何使用该等数据以及谁会接收该等数据的信息，并获取其副本。",
          "更正：要求更正不准确或不完整的数据。您可以在“我的账户”的个人资料页面自行更新大部分账户信息。",
          "删除：要求我们删除我们不再需要或非法处理的个人数据。",
          "限制处理：要求我们限制处理，例如在我们核实您数据的准确性或考虑您的反对意见期间。",
          "反对：在《个人数据保护法》允许的情形下，反对处理或要求我们停止处理。",
          "数据可携：以结构化、机器可读的格式接收您提供给我们的数据，或在技术可行的情况下要求将其传输给另一数据控制者。",
          "撤回同意：在我们依据您的同意进行处理的情形下，随时撤回同意，但不影响撤回前已进行的处理。",
          "投诉：如果您认为我们违反了《个人数据保护法》，可向阿联酋数据办公室（UAE Data Office）投诉。",
        ],
      },
      {
        id: "exercising-rights",
        heading: "如何行使您的权利",
        paragraphs: [
          `如需行使上述任何权利，请使用您账户注册的电子邮箱地址致函 ${OP.emailZh}。在处理请求之前，我们可能需要核实您的身份；我们将在《个人数据保护法》及其实施条例规定的期限内作出答复。`,
          "部分权利受法律限制。例如，我们不能删除根据反洗钱规则必须保留的记录，或正在进行的交易所需的记录。如果我们无法完全满足您的请求，我们将说明原因。",
        ],
      },
      {
        id: "security",
        heading: "我们如何保护数据",
        paragraphs: [
          "没有任何传输或存储方式是绝对安全的，但我们会采取与风险相适应的技术和组织措施保护个人数据。如果发生可能影响您隐私的数据泄露，我们将按《个人数据保护法》的要求通知您和阿联酋数据办公室。如果您认为您的账户已被盗用，请立即更改密码并联系我们。",
          "我们的措施包括：",
        ],
        bullets: [
          "在每个页面以及我们的服务器与数据库之间均采用传输加密（TLS/HTTPS）；",
          "密码仅以加盐的 bcrypt 哈希值形式存储，绝不以可读形式存储；",
          "采用页面脚本无法读取的 httpOnly 会话 Cookie，并且我们这一端仅保留每个会话令牌的哈希副本；",
          "在本平台上，对所上传文件和联系方式的访问仅限于账户持有人和授权员工（随房源发布的房源照片除外）；以及",
          "对重复的登录和注册尝试进行限制。",
        ],
      },
      {
        id: "cookies",
        heading: "Cookie 的使用",
        paragraphs: [
          "我们仅使用两个 Cookie，且均为严格必要：od_session 用于保持您的登录状态，od_locale 用于记住您的语言。我们不使用分析、广告或第三方 Cookie；我们的访问统计无需 Cookie 即可运行。我们的《Cookie 政策》对此有详细说明。",
        ],
      },
      {
        id: "children",
        heading: "儿童",
        paragraphs: [
          "本平台面向成年人。您必须年满 18 周岁才能创建账户，我们不会在知情的情况下收集儿童的个人数据。如果您认为有儿童向我们提供了个人数据，请联系我们，我们将予以删除。",
        ],
      },
      {
        id: "emails",
        heading: "您收到的电子邮件",
        paragraphs: [
          "我们会发送有关您的账户及其安全（包括密码重置）的电子邮件；有关您的房源、报价、还价以及交易进展的电子邮件；以及在您关注列表中的房源降价时发送的降价邮件。我们使用您在本平台上最后使用的语言撰写邮件。账户、安全和交易邮件是服务的一部分，在您的账户存续期间持续发送。如需停止某一房源的降价邮件，请将其从关注列表中移除。上述大部分邮件也会以通知的形式显示在“我的账户”中；密码重置邮件除外。",
          "当您保存搜索时，提醒默认开启：当有新的匹配房源发布时，我们会向您发送电子邮件，每天最多一次。您可以随时在“我的账户”的已保存搜索页面关闭每个已保存搜索的提醒，或删除该已保存搜索。",
          "如果您订阅了我们的每日资讯，我们每天最多向您发送一封邮件，仅在房源库存发生变化的日子发送，使用您订阅时所用的语言，并且仅在您通过我们发送的邮件确认您的邮箱地址之后发送。每期资讯均附有退订链接，一键即可停止接收，您也可以随时重新订阅。每日资讯无需账户，并且独立于您的账户：注销账户并不会取消您的订阅。",
        ],
      },
      {
        id: "changes",
        heading: "本政策的变更",
        paragraphs: [
          "我们可能不时更新本政策，例如在我们更换服务提供商或法律发生变化时。我们将在本页面发布新版本并更新“最后更新”日期；如果变更属于重大变更，我们将通过电子邮件或本平台告知您。",
        ],
      },
      {
        id: "contact",
        heading: "联系我们",
        paragraphs: [`如对本政策或我们处理您个人数据的方式有任何疑问，请联系 ${OP.companyZh}：`],
        bullets: contactBulletsZh,
      },
    ],
  },
};

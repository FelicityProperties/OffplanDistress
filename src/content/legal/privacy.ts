import { contactBulletsAr, contactBulletsEn, iso, LEGAL_UPDATED, OP } from "./brand";
import type { LegalContent } from "./types";

// Privacy Policy under UAE Federal Decree-Law No. (45) of 2021 (PDPL). Keep section ids and order identical in
// both languages.

export const privacyPolicy: LegalContent = {
  en: {
    title: "Privacy Policy",
    updated: LEGAL_UPDATED,
    summary: `${OP.company} is the controller of the personal data processed on ${OP.site}. We collect what we need to run your account, verify listings, broker transactions and meet our anti-money-laundering duties under UAE law. We never sell your data or use it for advertising, Sellers never see Buyers’ identities, and we share data with Developers, the DLD, trustee offices and banks only when a transaction requires it. You can exercise your rights under the UAE Personal Data Protection Law by writing to ${OP.email}.`,
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
          "Listing data: details of your Unit (developer, project, community, type, size, floor and view), the purchase price, the amount paid, the payment plan, any arrears, the asking price, how quickly you need to sell and the description you write.",
          "Documents: files you upload, such as the SPA, Oqood certificate, statement of account, passport or Emirates ID and photographs of the Unit. These are stored in our database.",
          "Transaction data: Offers and counter-offers, financing preferences, messages for the other party, the status of each deal and the information needed for the NOC and the Transfer.",
          "Activity and preferences: your watchlist, saved searches and alert settings, and the in-app notifications and emails we send you.",
          "Enquiries: the name, email address, telephone number and message you send through our contact or viewing-request forms.",
          "Technical data: server logs and rate-limit records containing your IP address, the pages requested and the date and time, and the two cookies described in our Cookie Policy.",
        ],
      },
      {
        id: "sources",
        heading: "Where the data comes from",
        paragraphs: [
          "Most of the personal data we hold is provided by you when you register, list a Unit, make an Offer, upload documents or contact us. Some is generated automatically when you use the Platform, such as server logs, rate-limit records and notifications.",
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
          "verify your identity, check the source of funds, screen against sanctions lists, keep records and report suspicious activity (necessary to comply with our legal obligations, including under Federal Decree-Law No. (20) of 2018);",
          "keep the Platform and your account secure, prevent fraud and abuse, for example by limiting repeated sign-in attempts, and fix faults (necessary to perform our agreement with you and to meet our duty under the PDPL to protect personal data);",
          "answer your enquiries and viewing requests (steps you ask us to take);",
          "send saved-search alerts (at your request; you can turn them off at any time); and",
          "establish, exercise or defend legal claims and respond to lawful requests from courts, the DLD, RERA and other authorities.",
        ],
      },
      {
        id: "sharing",
        heading: "Who we share it with",
        paragraphs: ["We do not sell personal data. We share it only as follows:"],
        bullets: [
          "Other Users: Sellers see the amount and terms of Offers but never a Buyer’s identity or contact details. Listings show details of the Unit, not the Seller’s contact details.",
          `Our team: authorised staff of ${OP.company} can see both parties’ contact details and documents in order to verify Listings and manage transactions.`,
          "Parties to your transaction: when a deal proceeds, we share what is needed with the Developer (to obtain the NOC and record the assignment), with the DLD and the trustee office (to register the Transfer) and with any bank the Buyer chooses for financing or payment.",
          "Service providers: Vercel hosts the Platform, Neon provides our database and Resend sends our transactional emails. They process personal data on our instructions in order to provide their services to us.",
          "Authorities: courts, regulators, law-enforcement bodies and the competent anti-money-laundering authorities, where the law requires or permits it.",
          "Advisers and successors: our professional advisers, who owe us a duty of confidentiality, and any buyer of all or part of our business, which would be bound by this Policy.",
        ],
      },
      {
        id: "international-transfers",
        heading: "International transfers",
        paragraphs: [
          "Some of our service providers store or process data outside the UAE. In particular, the servers of our database provider, Neon, may be located outside the UAE, and our hosting and email providers operate internationally.",
          "When personal data is transferred outside the UAE, we transfer it only as the PDPL permits: to a country with an adequate level of data protection, or subject to appropriate safeguards, such as contractual commitments requiring the recipient to protect the data to a standard consistent with the PDPL, or otherwise on a ground the PDPL allows.",
        ],
      },
      {
        id: "retention",
        heading: "How long we keep it",
        paragraphs: ["We keep personal data only for as long as we need it for the purposes described above or as the law requires:"],
        bullets: [
          "Account data: while your account is active. When you close your account, we delete or anonymise it within a reasonable time, except where we must keep it for the reasons below.",
          "Transaction and AML records: Listings, Offers, documents and records relating to a transaction, and the identity and source-of-funds information collected for anti-money-laundering purposes, for at least five years, as the law requires.",
          "Server logs: up to 30 days.",
          "Rate-limit records containing IP addresses: 24 hours.",
          "Enquiries: as long as needed to respond and follow up, and afterwards only as part of the transaction records described above where relevant.",
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
          "access to documents and contact details limited to the account holder and authorised staff; and",
          "limits on repeated sign-in and sign-up attempts.",
        ],
      },
      {
        id: "cookies",
        heading: "Cookies",
        paragraphs: [
          "We use only two cookies, both strictly necessary: od_session keeps you logged in and od_locale remembers your language. We do not use analytics, advertising or third-party cookies. Our Cookie Policy explains them in detail.",
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
          "We send transactional emails about your account, password resets, your Listings and Offers, counter-offers and the progress of your deals, in the language you last used on the Platform. They are part of the service and continue while your account is open, and the same messages appear as notifications in your dashboard.",
          "When you save a search, alerts are switched on by default: we email you when new matching deals are published, at most once a day. You can turn alerts off, or delete the saved search, at any time from the saved-searches page of your dashboard.",
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
    summary: `${OP.companyAr} هي المتحكم في البيانات الشخصية التي تُعالَج على منصة ${iso(OP.site)}. نجمع ما نحتاج إليه لإدارة حسابك والتحقق من الإعلانات وإتمام المعاملات بصفتنا وسيطاً، وللوفاء بالتزاماتنا في مكافحة غسل الأموال بموجب القانون الإماراتي. لا نبيع بياناتك ولا نستخدمها لأغراض إعلانية، ولا يطّلع البائعون على هوية المشترين، ولا نشارك البيانات مع المطوّرين أو دائرة الأراضي والأملاك أو مكاتب أمناء التسجيل أو البنوك إلا بالقدر الذي تتطلبه المعاملة. ويمكنك ممارسة حقوقك بموجب قانون حماية البيانات الشخصية الإماراتي بمراسلتنا على ${OP.emailAr}.`,
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
          "بيانات الإعلان: تفاصيل وحدتك (المطوّر والمشروع والمنطقة والنوع والمساحة والطابق والإطلالة)، وسعر الشراء، والمبلغ المدفوع، وخطة الدفع، وأي متأخرات، والسعر المطلوب، ومدى استعجالك في البيع، والوصف الذي تكتبه.",
          "المستندات: الملفات التي ترفعها، مثل اتفاقية البيع والشراء وشهادة أوقود وكشف الحساب وجواز السفر أو بطاقة الهوية الإماراتية وصور الوحدة، وتُحفظ في قاعدة بياناتنا.",
          "بيانات المعاملات: العروض والعروض المقابلة، وطريقة التمويل المفضّلة، والرسائل الموجّهة إلى الطرف الآخر، وحالة كل صفقة، والمعلومات اللازمة لشهادة عدم الممانعة ونقل الملكية.",
          "النشاط والتفضيلات: قائمة المتابعة، وعمليات البحث المحفوظة وإعدادات التنبيه، والإشعارات داخل المنصة والرسائل الإلكترونية التي نرسلها إليك.",
          "الاستفسارات: الاسم وعنوان البريد الإلكتروني ورقم الهاتف والرسالة التي ترسلها عبر نموذج التواصل أو نموذج طلب المعاينة.",
          "البيانات التقنية: سجلات الخادم وسجلات الحدّ من المحاولات المتكررة التي تتضمن عنوان IP الخاص بك والصفحات المطلوبة وتاريخ الطلب ووقته، وملفّا تعريف الارتباط المبيّنان في سياسة ملفات تعريف الارتباط.",
        ],
      },
      {
        id: "sources",
        heading: "مصادر البيانات",
        paragraphs: [
          "تقدّم أنت معظم البيانات الشخصية التي نحتفظ بها عند التسجيل أو إدراج وحدة أو تقديم عرض أو رفع المستندات أو التواصل معنا، ويُنشأ بعضها تلقائياً عند استخدامك للمنصة، مثل سجلات الخادم وسجلات الحدّ من المحاولات والإشعارات.",
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
          "التحقق من هويتك ومن مصدر الأموال، وفحص قوائم العقوبات، والاحتفاظ بالسجلات، والإبلاغ عن الأنشطة المشبوهة (وهي معالجة ضرورية للوفاء بالتزاماتنا القانونية، بما فيها الالتزامات المقررة بموجب المرسوم بقانون اتحادي رقم (20) لسنة 2018)؛",
          "حماية المنصة وحسابك، ومنع الاحتيال وإساءة الاستخدام، كالحدّ من محاولات تسجيل الدخول المتكررة، وإصلاح الأعطال (وهي معالجة ضرورية لتنفيذ اتفاقنا معك وللوفاء بواجبنا في حماية البيانات الشخصية بموجب القانون)؛",
          "الرد على استفساراتك وطلبات المعاينة (بناءً على طلبك)؛",
          "إرسال تنبيهات عمليات البحث المحفوظة (بناءً على طلبك، ويمكنك إيقافها في أي وقت)؛",
          "إثبات الحقوق القانونية أو ممارستها أو الدفاع عنها، والاستجابة للطلبات المشروعة من المحاكم ودائرة الأراضي والأملاك ومؤسسة التنظيم العقاري وغيرها من الجهات.",
        ],
      },
      {
        id: "sharing",
        heading: "الجهات التي نشارك البيانات معها",
        paragraphs: ["لا نبيع البيانات الشخصية، ولا نشاركها إلا على النحو الآتي:"],
        bullets: [
          "المستخدمون الآخرون: يطّلع البائعون على مبلغ العرض وشروطه، دون هوية المشتري أو بيانات التواصل معه بأي حال. وتعرض الإعلانات تفاصيل الوحدة دون بيانات التواصل مع البائع.",
          `فريقنا: يطّلع الموظفون المخوَّلون لدى ${OP.companyAr} على بيانات التواصل مع الطرفين وعلى المستندات، للتحقق من الإعلانات وإدارة المعاملات.`,
          "أطراف معاملتك: عند المضي في الصفقة، نشارك القدر اللازم من البيانات مع المطوّر (للحصول على شهادة عدم الممانعة وتسجيل التنازل)، ومع دائرة الأراضي والأملاك ومكتب أمين التسجيل (لتسجيل نقل الملكية)، ومع أي بنك يختاره المشتري للتمويل أو للدفع.",
          `مزوّدو الخدمات: تستضيف شركة ${iso("Vercel")} المنصة، وتوفّر شركة ${iso("Neon")} قاعدة بياناتنا، وترسل شركة ${iso("Resend")} رسائلنا الإلكترونية الخدمية. ويعالج هؤلاء البيانات الشخصية وفق تعليماتنا لتقديم خدماتهم لنا.`,
          "الجهات الرسمية: المحاكم والجهات التنظيمية وجهات إنفاذ القانون والسلطات المختصة بمكافحة غسل الأموال، متى أوجب القانون ذلك أو أجازه.",
          "المستشارون والخلفاء: مستشارونا المهنيون الملتزمون بواجب السرية، وأي جهة تستحوذ على أعمالنا كلياً أو جزئياً وتلتزم بهذه السياسة.",
        ],
      },
      {
        id: "international-transfers",
        heading: "نقل البيانات إلى خارج الدولة",
        paragraphs: [
          `يخزّن بعض مزوّدي خدماتنا البيانات أو يعالجونها خارج دولة الإمارات العربية المتحدة؛ فقد تقع خوادم مزوّد قاعدة البيانات ${iso("Neon")} خارج الدولة، ويعمل مزوّدا الاستضافة والبريد الإلكتروني على نطاق دولي.`,
          "وعند نقل البيانات الشخصية إلى خارج الدولة، لا ننقلها إلا وفق ما يجيزه قانون حماية البيانات الشخصية: إلى دولة توفّر مستوى ملائماً من الحماية، أو مع ضمانات مناسبة، كالتزامات تعاقدية تُلزم الجهة المستلمة بحماية البيانات وفق معايير تتسق مع القانون، أو استناداً إلى أي أساس آخر يجيزه القانون.",
        ],
      },
      {
        id: "retention",
        heading: "مدة الاحتفاظ بالبيانات",
        paragraphs: ["لا نحتفظ بالبيانات الشخصية إلا للمدة اللازمة لتحقيق الأغراض المبيّنة أعلاه أو التي يقتضيها القانون:"],
        bullets: [
          "بيانات الحساب: طوال مدة نشاط حسابك. وعند إغلاقه، نحذفها أو نجعلها مجهولة الهوية خلال مدة معقولة، ما لم يلزمنا الاحتفاظ بها للأسباب المبيّنة أدناه.",
          "سجلات المعاملات ومكافحة غسل الأموال: الإعلانات والعروض والمستندات والسجلات المتعلقة بأي معاملة، وبيانات الهوية ومصدر الأموال التي نجمعها لأغراض مكافحة غسل الأموال، لمدة لا تقل عن خمس سنوات وفقاً لما يقتضيه القانون.",
          "سجلات الخادم: مدة أقصاها 30 يوماً.",
          "سجلات الحدّ من المحاولات المتكررة التي تتضمن عناوين IP: مدة 24 ساعة.",
          "الاستفسارات: المدة اللازمة للرد عليها ومتابعتها، ثم ضمن سجلات المعاملات المبيّنة أعلاه عند الاقتضاء.",
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
          "قصر الاطلاع على المستندات وبيانات التواصل على صاحب الحساب والموظفين المخوَّلين؛",
          "الحدّ من محاولات تسجيل الدخول وإنشاء الحسابات المتكررة.",
        ],
      },
      {
        id: "cookies",
        heading: "ملفات تعريف الارتباط",
        paragraphs: [
          `لا نستخدم سوى ملفَّي تعريف ارتباط، وكلاهما ضروري تماماً: ${iso("od_session")} لإبقائك مسجّلاً الدخول، و${iso("od_locale")} لتذكّر لغتك. ولا نستخدم ملفات تعريف ارتباط للتحليلات أو الإعلانات أو تابعة لأطراف أخرى. وتوضّحها سياسة ملفات تعريف الارتباط بالتفصيل.`,
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
          "نرسل رسائل إلكترونية خدمية تتعلق بحسابك وإعادة تعيين كلمة المرور وإعلاناتك وعروضك والعروض المقابلة وسير صفقاتك، باللغة التي استخدمتها آخر مرة على المنصة. وتُعدّ هذه الرسائل جزءاً من الخدمة وتستمر ما دام حسابك قائماً، وتظهر الرسائل ذاتها في صورة إشعارات في لوحة التحكم.",
          "عند حفظ عملية بحث، تكون التنبيهات مفعّلة تلقائياً، فنراسلك عند نشر صفقات جديدة مطابقة، بمعدل لا يتجاوز مرة واحدة يومياً. ويمكنك إيقاف التنبيهات أو حذف عملية البحث المحفوظة في أي وقت من صفحة عمليات البحث المحفوظة في لوحة التحكم.",
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
};

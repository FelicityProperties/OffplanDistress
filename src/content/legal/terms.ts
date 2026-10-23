import { BUYER_PAYS, contactBulletsAr, contactBulletsEn, iso, LEGAL_UPDATED, OP, RATES } from "./brand";
import type { LegalContent } from "./types";

// Terms of Use. Section numbers are referenced in the text ("section 7"), so keep the order in sync across both
// languages when adding or moving a section.

export const termsOfUse: LegalContent = {
  en: {
    title: "Terms of Use",
    updated: LEGAL_UPDATED,
    summary: `${OP.site} is operated by ${OP.company}, a Dubai real-estate brokerage. We verify listings, match buyers with owners of off-plan units, negotiate between them and handle the developer NOC and the DLD transfer, but we are never a party to the sale. ${
      BUYER_PAYS
        ? `Listing is free; the buyer pays our fee of ${RATES.commission} of the sale value plus ${RATES.vat} VAT, and only when the transfer completes.`
        : `The seller pays our fee of ${RATES.commission} of the sale value plus ${RATES.vat} VAT, and only when the transfer completes.`
    } Offers are not binding until RERA Form F (the MOU) is signed.`,
    sections: [
      {
        id: "about",
        heading: "About these Terms",
        paragraphs: [
          `These Terms of Use (the “Terms”) govern your use of the ${OP.site} website and the services we provide through it (the “Platform”), operated by ${OP.identityEn} (“we”, “us” or “our”).`,
          "By creating an account, listing a Unit, making an Offer or otherwise using the Platform, you agree to these Terms. Our Privacy Policy and Cookie Policy form part of them. If you do not agree, do not use the Platform.",
          "Each transaction is also governed by the RERA forms and contracts signed for it (sections 5 and 6), which prevail over these Terms on matters concerning that transaction.",
        ],
      },
      {
        id: "definitions",
        heading: "Definitions",
        paragraphs: ["In these Terms:"],
        bullets: [
          "“Unit” means an off-plan property in Dubai, sold by a Developer under an SPA, that has not yet been handed over.",
          "“Developer” means the developer that sold the Unit and administers its payment plan; “SPA” means the sale and purchase agreement between the original purchaser and the Developer; and “Oqood” means the Unit’s interim registration with the DLD.",
          "“Seller” means a User who lists a Unit, and “Buyer” means a User who makes an Offer.",
          "“Equity” means the instalments the Seller has paid to the Developer, and “Agreed Price” means the amount the Buyer agrees to pay the Seller for it.",
          "“Remaining Instalments” means the unpaid balance of the payment plan, which the Buyer takes over, and “Sale Value” means the Agreed Price plus the Remaining Instalments.",
          "“NOC” means the Developer’s no-objection certificate permitting resale or assignment.",
          "“DLD” means the Dubai Land Department, and “RERA” means its Real Estate Regulatory Agency.",
          "“Transfer” means registration of the Unit, or assignment of the SPA, in the Buyer’s name at a DLD trustee office.",
          "“Listing” means a Unit as presented on the Platform, and “Offer” means a price proposal, including a counter-offer, made through the Platform.",
          "“User” or “you” means anyone who visits or uses the Platform.",
        ],
      },
      {
        id: "eligibility",
        heading: "Eligibility and accounts",
        paragraphs: [
          "You must be at least 18 years old and have full legal capacity to contract. If you act for a company or another person, you confirm that you are authorised to bind them.",
          "You need an account to list a Unit, make an Offer, keep a watchlist or save a search. Give accurate and complete information, including your full legal name, a working email address and, when asked, a mobile number, and keep it up to date. Each person may hold one account, which may not be shared or transferred.",
          `Keep your login details confidential; you are responsible for activity under your account. Tell us immediately at ${OP.email} if you suspect unauthorised access. We will never ask for your password.`,
        ],
      },
      {
        id: "service",
        heading: "Our service",
        paragraphs: [
          "The Platform connects owners of off-plan Units who can no longer keep up with a Developer payment plan with Buyers who pay the Seller for the Equity and take over the Remaining Instalments.",
          "We act only as a broker and are never a party to the sale or assignment of a Unit. Any contract of sale is made directly between Buyer and Seller, who each remain responsible for performing it.",
          "Only the Developer decides whether to issue an NOC, and it may require a minimum percentage of the price to be paid or arrears and fees to be settled; the DLD registers Transfers under its own rules. We check documents and Developer eligibility before a Listing goes live, but we cannot guarantee that an NOC will be issued, when it will be issued, or that a Transfer will complete.",
          "As broker, we:",
        ],
        bullets: [
          "review the Seller’s documents (SPA, Oqood, statement of account and identity documents) and check the Listing against them;",
          "check, as far as the Developer’s published requirements allow, whether the Unit can be resold or assigned;",
          "publish approved Listings and match them with Buyers;",
          "present Offers and counter-offers and negotiate between the parties;",
          "request the NOC once a price is agreed, and prepare the assignment documents and RERA forms; and",
          "book the Transfer at a DLD trustee office.",
        ],
      },
      {
        id: "sellers",
        heading: "If you are selling",
        paragraphs: [
          `${
            BUYER_PAYS
              ? "Listing is free: we charge Sellers no listing fee, retainer or commission."
              : "Listing carries no upfront charge; our fee is set out in section 7."
          } We may ask you to sign RERA Form A (the Seller–broker agreement); like the other RERA forms, it is signed outside the Platform as part of the transaction.`,
          "We may edit a Listing for clarity, request further documents, or decline, pause or remove a Listing, for example if its information cannot be verified. Tell us promptly if anything changes, including if you sell the Unit elsewhere.",
          "Accepting an Offer lets us request the NOC and prepare the documents; the sale becomes binding only when you and the Buyer sign RERA Form F (the MOU).",
          "By submitting a Listing, you confirm that:",
        ],
        bullets: [
          "you are the registered purchaser under the SPA or are legally authorised to sell the Unit (for example, under a valid power of attorney), and any co-owners agree to the sale;",
          "the information in the Listing, including prices, the amount paid, the payment plan, arrears and the handover date, is true and complete;",
          "every document you upload is genuine, unaltered and relates to the Unit; and",
          "you have told us in writing of any dispute, mortgage, attachment or restriction that could prevent or delay the sale.",
        ],
      },
      {
        id: "buyers",
        heading: "If you are buying",
        paragraphs: [
          "Make an Offer only if you intend, and can afford, to complete at that price, including the Agreed Price, the Remaining Instalments as they fall due and the third-party costs in section 7. We may restrict accounts that repeatedly make Offers they do not pursue.",
          "We may ask you to prove your identity (passport or Emirates ID) and, where required, the source of your funds (section 15), and to sign RERA Form B (the Buyer–broker agreement), which records our fee.",
          "Offers on the Platform are not binding sale contracts. A binding agreement arises only when Buyer and Seller sign RERA Form F, the memorandum of understanding (“MOU”), whose terms, including those on deposits and default, then apply.",
          "On Transfer, the Seller is paid by manager’s cheque at the DLD trustee office. Never send money to anyone outside this process, even someone who claims to act for us; contact us first.",
        ],
      },
      {
        id: "fees",
        heading: "Fees and third-party costs",
        paragraphs: [
          `Our fee is ${RATES.commission} of the Sale Value plus VAT at ${RATES.vat} on the fee, paid by the ${BUYER_PAYS ? "Buyer" : "Seller"} only when the Transfer completes at the DLD. If the Transfer does not complete, no fee is payable. ${
            BUYER_PAYS
              ? "The Platform is free for Sellers, and we charge no retainers or listing fees."
              : "Making Offers is free for Buyers, and we charge no retainers or listing fees."
          }`,
          `Third-party costs are set and charged by those bodies, in addition to our fee: the DLD transfer fee (currently ${RATES.dld} of the property value), DLD registration and trustee office charges, and the Developer’s NOC or administration fee. The MOU records who bears each of them.`,
          "Fee calculators and cost breakdowns on the Platform are estimates. The amounts that apply are those charged at the time of the transaction, and our fee is calculated on the Sale Value in the MOU.",
        ],
      },
      {
        id: "non-circumvention",
        heading: "Anonymity and non-circumvention",
        paragraphs: [
          "Buyers remain anonymous to Sellers: a Seller sees the amount and terms of an Offer, not the Buyer’s identity or contact details, and all negotiation goes through our team, which sees both parties’ details in order to manage the transaction.",
          "For 12 months after we first introduce you to a Unit, a Buyer or a Seller, you must not, directly or indirectly, deal with the other party over that Unit in a way that bypasses us or our fee. If you do, the fee under section 7 becomes payable to us, without prejudice to our other rights.",
        ],
      },
      {
        id: "verified",
        heading: "What “Verified” means",
        paragraphs: [
          "“Verified” means that our team has reviewed the Seller’s documents, typically the SPA or Oqood and a recent statement of account, found them consistent with the Listing, and received the Seller’s confirmation of ownership or authority to sell.",
          "It is a document check, not a guarantee. It does not mean that we have inspected or valued the Unit, confirmed construction progress or the handover date, ruled out every encumbrance, or that the Developer will issue an NOC. The records of the Developer and the DLD at Transfer are definitive.",
        ],
      },
      {
        id: "prohibited",
        heading: "Prohibited conduct",
        paragraphs: ["You must not:"],
        bullets: [
          "provide false or misleading information, documents or identity details, or those of another person;",
          "list a Unit you are not entitled to sell, or list the same Unit twice;",
          "make Offers you do not intend to honour, or manipulate prices;",
          "use the Platform for money laundering, terrorist financing, sanctions evasion, fraud or any other unlawful purpose;",
          "scrape or copy Listings or Users’ data, or use bots, without our written consent;",
          "attempt unauthorised access to the Platform or other accounts, disrupt the Platform or upload malicious code;",
          "harass or abuse our team or other Users, or upload unlawful or infringing content; or",
          "use the Platform to advertise competing services or to solicit its Users.",
        ],
      },
      {
        id: "intellectual-property",
        heading: "Intellectual property and your content",
        paragraphs: [
          "The Platform, its design, software, text, logos and compilation of Listings belong to us or our licensors. We grant you a limited, personal, revocable and non-transferable licence to use it for its intended purpose; you may not copy or reproduce it except as the law allows.",
          "You keep ownership of what you upload and grant us a non-exclusive, royalty-free licence to store, copy, adapt and display it to operate the Platform, market your Listing and complete your transaction, and to share it as our Privacy Policy describes. Some marketing photographs are supplied by third parties under their own licences.",
        ],
      },
      {
        id: "disclaimers",
        heading: "Estimates, information and advice",
        paragraphs: [
          "Prices, discounts, savings, payment plans, handover dates, fees and cost breakdowns on the Platform are estimates based on information from Sellers, Developers and public sources, and may change. Launch prices and comparisons are indicative.",
          "Nothing on the Platform is investment, legal, tax or financial advice. Off-plan property carries risks, including construction delays, project changes and market movements; take independent advice before you commit.",
          "To the extent the law permits, the Platform is provided “as is” and “as available”, without any warranty that it will be uninterrupted or error-free.",
        ],
      },
      {
        id: "liability",
        heading: "Limitation of liability",
        paragraphs: [
          "Nothing in these Terms excludes or limits any liability that cannot be excluded or limited under UAE law, including liability for fraud, gross negligence or wilful misconduct.",
          "Subject to that, we are not liable for: (a) the acts or omissions of Buyers, Sellers, Developers, the DLD, trustee offices, banks or other third parties; (b) a Developer’s refusal or delay in issuing an NOC, or a delayed or failed Transfer, unless caused by our breach of these Terms; (c) loss of profit, opportunity, data or goodwill, or any indirect or consequential loss; or (d) loss caused by your breach or by information you supplied.",
          "Subject to the first paragraph of this section, our total liability to you in connection with a transaction, whether in contract, tort or otherwise, is limited to the fees actually paid to us for that transaction.",
        ],
      },
      {
        id: "indemnity",
        heading: "Indemnity",
        paragraphs: [
          `You will indemnify ${OP.company}, its staff and agents against claims, losses, penalties and reasonable costs (including legal fees) arising from your breach of these Terms or of the law, or from false or non-genuine information or documents that you provide.`,
        ],
      },
      {
        id: "aml",
        heading: "Anti-money laundering and identity checks",
        paragraphs: [
          "Real-estate brokers are reporting entities under UAE Federal Decree-Law No. (20) of 2018 on Anti-Money Laundering and Combating the Financing of Terrorism and Financing of Illegal Organisations, as amended, and its implementing regulations.",
          "We will therefore ask for identity documents (passport or Emirates ID) and may ask for evidence of the source of funds or wealth, the purpose of the transaction and anyone on whose behalf you act, and verify it with reliable sources.",
          "We may refuse to act, pause a transaction or close an account if the information is not provided or we suspect a crime. Where the law requires, we report suspicious transactions to the competent authorities and may be prohibited from telling you. We keep identification and transaction records for at least five years.",
        ],
      },
      {
        id: "suspension",
        heading: "Suspension and termination",
        paragraphs: [
          "We may suspend or restrict your account, pause or remove a Listing, or decline to present an Offer if we reasonably believe that you have breached these Terms, given false information or created a risk to others, or if the law or a competent authority requires it.",
          "You may close your account at any time by contacting us. This does not affect transactions in progress, signed RERA forms, fees due or records we must keep. Sections 7, 8, 11, 13, 14, 15 and 19 survive closure.",
        ],
      },
      {
        id: "communications",
        heading: "Notices and communications",
        paragraphs: [
          `We contact you by email, through dashboard notifications and, about your Listings, Offers and transactions, by phone or message. These service messages continue while your account is open; saved-search alerts can be turned off in your dashboard. You can send notices to us at ${OP.email}, and we generally write to you in the language you last used on the Platform.`,
        ],
      },
      {
        id: "changes",
        heading: "Changes to the Platform and these Terms",
        paragraphs: [
          "We may change or withdraw features of the Platform and amend these Terms, for example to reflect changes in the law, in RERA or DLD practice or in our services. Amended Terms will be posted here with a new “Last updated” date, and we will give reasonable notice of material changes by email or on the Platform before they take effect.",
          "Amendments do not affect transactions for which an MOU has been signed. If you keep using the Platform after they take effect, you accept them; if not, stop using the Platform and close your account.",
        ],
      },
      {
        id: "governing-law",
        heading: "Governing law and disputes",
        paragraphs: [
          "These Terms, and any dispute arising from them or from the Platform, are governed by the federal laws of the United Arab Emirates as applied in the Emirate of Dubai.",
          `Please raise any complaint with us first at ${OP.email}. You may also complain about a real-estate broker through the channels of the Dubai Land Department and RERA. Subject to that, the courts of Dubai have exclusive jurisdiction.`,
        ],
      },
      {
        id: "language",
        heading: "Language",
        paragraphs: [
          "These Terms are published in English and Arabic. If there is any inconsistency between the two versions, the English version prevails to the extent permitted by law.",
        ],
      },
      {
        id: "contact",
        heading: "Contact us",
        paragraphs: [`For any question about these Terms, please contact ${OP.company}:`],
        bullets: contactBulletsEn,
      },
    ],
  },

  ar: {
    title: "شروط الاستخدام",
    updated: LEGAL_UPDATED,
    summary: `تدير منصة ${iso(OP.site)} ${OP.companyAr}، وهي شركة وساطة عقارية في دبي. نتحقق من الإعلانات، ونربط المشترين بمالكي الوحدات على الخارطة، ونتولى التفاوض بين الطرفين ومتابعة شهادة عدم الممانعة من المطوّر ونقل الملكية لدى دائرة الأراضي والأملاك، دون أن نكون طرفاً في البيع بأي حال. ${
      BUYER_PAYS
        ? `الإدراج مجاني، ويدفع المشتري أتعابنا البالغة ${RATES.commission} من قيمة البيع مضافاً إليها ضريبة القيمة المضافة بنسبة ${RATES.vat}، ولا تُستحق إلا عند إتمام نقل الملكية.`
        : `يدفع البائع أتعابنا البالغة ${RATES.commission} من قيمة البيع مضافاً إليها ضريبة القيمة المضافة بنسبة ${RATES.vat}، ولا تُستحق إلا عند إتمام نقل الملكية.`
    } ولا تكون العروض ملزمة إلا بعد توقيع النموذج (F) الصادر عن مؤسسة التنظيم العقاري (مذكرة التفاهم).`,
    sections: [
      {
        id: "about",
        heading: "نبذة عن هذه الشروط",
        paragraphs: [
          `تنظّم شروط الاستخدام هذه («الشروط») استخدامك للموقع الإلكتروني ${iso(OP.site)} وللخدمات التي نقدّمها من خلاله («المنصة»)، التي تديرها ${OP.identityAr} (ويُشار إليها بـ«نحن» أو بضمير المتكلم).`,
          "بإنشائك حساباً أو إدراجك وحدة أو تقديمك عرضاً أو استخدامك المنصة بأي وجه آخر، فإنك توافق على هذه الشروط. وتُعدّ سياسة الخصوصية وسياسة ملفات تعريف الارتباط جزءاً منها. وإذا كنت لا توافق عليها، فلا تستخدم المنصة.",
          "تخضع كل معاملة كذلك لنماذج مؤسسة التنظيم العقاري والعقود الموقّعة بشأنها (البندان 5 و6)، وتسود على هذه الشروط في المسائل المتعلقة بتلك المعاملة.",
        ],
      },
      {
        id: "definitions",
        heading: "التعريفات",
        paragraphs: ["في هذه الشروط، يُقصد بالعبارات الآتية المعاني المبيّنة قرين كلٍّ منها:"],
        bullets: [
          "«الوحدة»: عقار على الخارطة في دبي باعه المطوّر بموجب اتفاقية بيع وشراء ولم يُسلَّم بعد.",
          "«المطوّر»: المطوّر الذي باع الوحدة ويدير خطة سدادها، و«اتفاقية البيع والشراء»: الاتفاقية المبرمة بين المشتري الأصلي والمطوّر، و«أوقود»: التسجيل المبدئي للوحدة لدى الدائرة.",
          "«البائع»: المستخدم الذي يُدرج وحدة، و«المشتري»: المستخدم الذي يقدّم عرضاً.",
          "«الحصة المدفوعة»: الأقساط التي سدّدها البائع للمطوّر، و«الثمن المتفق عليه»: المبلغ الذي يوافق المشتري على دفعه للبائع مقابلها.",
          "«الأقساط المتبقية»: الرصيد غير المسدَّد من خطة الدفع الذي يتحمّله المشتري، و«قيمة البيع»: الثمن المتفق عليه مضافاً إليه الأقساط المتبقية.",
          "«شهادة عدم الممانعة»: الشهادة التي يصدرها المطوّر للسماح بإعادة بيع الوحدة أو التنازل عنها.",
          "«الدائرة»: دائرة الأراضي والأملاك في دبي، و«مؤسسة التنظيم العقاري»: مؤسسة التنظيم العقاري (ريرا) التابعة لها.",
          "«نقل الملكية»: تسجيل الوحدة، أو التنازل عن اتفاقية البيع والشراء، باسم المشتري لدى أحد مكاتب أمناء التسجيل المعتمدين من الدائرة.",
          "«الإعلان»: الوحدة كما تُعرض على المنصة، و«العرض»: عرض السعر المقدَّم عبر المنصة، بما في ذلك العرض المقابل.",
          "«المستخدم» أو «أنت»: كل من يزور المنصة أو يستخدمها.",
        ],
      },
      {
        id: "eligibility",
        heading: "الأهلية والحسابات",
        paragraphs: [
          "يجب أن تكون قد أتممت الثامنة عشرة من عمرك وأن تتمتع بالأهلية القانونية الكاملة للتعاقد. وإذا كنت تتصرف نيابةً عن شركة أو عن شخص آخر، فإنك تُقرّ بأنك مخوَّل بإلزامه.",
          "يلزمك حساب لإدراج وحدة أو تقديم عرض أو إنشاء قائمة متابعة أو حفظ عملية بحث. وعليك تقديم معلومات صحيحة وكاملة، بما فيها اسمك القانوني الكامل وعنوان بريد إلكتروني فعّال، ورقم هاتف متحرك عند الطلب، والحرص على تحديثها. ولا يجوز للشخص الواحد امتلاك أكثر من حساب، ولا يجوز مشاركته أو التنازل عنه.",
          `حافظ على سرية بيانات الدخول، فأنت مسؤول عن الأنشطة التي تتم من خلال حسابك. وأبلغنا فوراً على ${OP.emailAr} إذا اشتبهت في أي دخول غير مصرَّح به. ولن نطلب منك كلمة المرور بأي حال.`,
        ],
      },
      {
        id: "service",
        heading: "خدماتنا",
        paragraphs: [
          "تربط المنصة مالكي الوحدات على الخارطة الذين لم يعودوا قادرين على الاستمرار في خطة الدفع لدى المطوّر بمشترين يدفعون للبائع مقابل الحصة المدفوعة ويتحمّلون الأقساط المتبقية.",
          "نعمل بصفتنا وسيطاً فحسب، ولا نكون بأي حال طرفاً في بيع الوحدة أو التنازل عنها. ويُبرم أي عقد بيع مباشرةً بين المشتري والبائع، ويظل كلٌّ منهما مسؤولاً عن تنفيذه.",
          "يعود قرار إصدار شهادة عدم الممانعة إلى المطوّر وحده، وقد يشترط سداد نسبة دنيا من الثمن أو تسوية المتأخرات والرسوم، وتسجّل الدائرة نقل الملكية وفق أنظمتها. ومع أننا نتحقق من المستندات ومن أهلية الوحدة لدى المطوّر قبل نشر الإعلان، فلا يمكننا ضمان إصدار الشهادة أو موعد إصدارها أو إتمام نقل الملكية.",
          "وبصفتنا الوسيط، فإننا:",
        ],
        bullets: [
          "نراجع مستندات البائع (اتفاقية البيع والشراء وأوقود وكشف الحساب ووثائق الهوية) ونطابق الإعلان معها؛",
          "نتحقق، في حدود المتطلبات المعلنة للمطوّر، من إمكانية إعادة بيع الوحدة أو التنازل عنها؛",
          "ننشر الإعلانات المعتمدة ونربطها بالمشترين؛",
          "نعرض العروض والعروض المقابلة ونتفاوض بين الطرفين؛",
          "نطلب شهادة عدم الممانعة بعد الاتفاق على السعر، ونُعدّ مستندات التنازل ونماذج مؤسسة التنظيم العقاري؛",
          "نحجز موعد نقل الملكية لدى أحد مكاتب أمناء التسجيل.",
        ],
      },
      {
        id: "sellers",
        heading: "إذا كنت بائعاً",
        paragraphs: [
          `${
            BUYER_PAYS
              ? "الإدراج مجاني؛ فلا نتقاضى من البائعين رسوم إدراج أو دفعات مقدّمة أو عمولة."
              : "لا يترتب على الإدراج أي رسوم مقدّمة، وتُبيَّن أتعابنا في البند 7."
          } وقد نطلب منك توقيع النموذج (A) الصادر عن مؤسسة التنظيم العقاري (اتفاقية البائع والوسيط)، ويُوقَّع، شأنه شأن سائر نماذج المؤسسة، خارج المنصة في إطار إجراءات المعاملة.`,
          "يجوز لنا تحرير الإعلان لأغراض الوضوح، أو طلب مستندات إضافية، أو رفض الإعلان أو إيقافه أو حذفه، كأن يتعذّر التحقق من بياناته. وعليك إبلاغنا دون تأخير بأي تغيير، بما في ذلك بيع الوحدة عن طريق جهة أخرى.",
          "يتيح لنا قبولك عرضاً طلب شهادة عدم الممانعة وإعداد المستندات، ولا يصبح البيع ملزماً إلا بتوقيعك أنت والمشتري على النموذج (F) الصادر عن مؤسسة التنظيم العقاري (مذكرة التفاهم).",
          "وبتقديمك الإعلان، فإنك تُقرّ بما يلي:",
        ],
        bullets: [
          "أنك المشتري المسجّل بموجب اتفاقية البيع والشراء أو مخوَّل قانوناً ببيع الوحدة (بموجب وكالة سارية مثلاً)، وأن أي شركاء في ملكيتها موافقون على البيع؛",
          "أن بيانات الإعلان، بما فيها الأسعار والمبلغ المدفوع وخطة الدفع والمتأخرات وموعد التسليم، صحيحة وكاملة؛",
          "أن كل مستند ترفعه أصلي وغير معدَّل ويخص الوحدة؛",
          "أنك أبلغتنا كتابياً بأي نزاع أو رهن أو حجز أو قيد قد يمنع البيع أو يؤخره.",
        ],
      },
      {
        id: "buyers",
        heading: "إذا كنت مشترياً",
        paragraphs: [
          "لا تقدّم عرضاً إلا إذا كنت تنوي إتمام الشراء بذلك السعر وتقدر عليه، بما يشمل الثمن المتفق عليه والأقساط المتبقية في مواعيد استحقاقها وتكاليف الأطراف الأخرى المبيّنة في البند 7. ويجوز لنا تقييد الحسابات التي تكرر تقديم عروض لا تمضي فيها.",
          "قد نطلب منك إثبات هويتك (جواز السفر أو بطاقة الهوية الإماراتية) وبيان مصدر أموالك عند الاقتضاء (البند 15)، وتوقيع النموذج (B) الصادر عن مؤسسة التنظيم العقاري (اتفاقية المشتري والوسيط) الذي يوثّق أتعابنا.",
          "لا تُعدّ العروض المقدَّمة عبر المنصة عقود بيع ملزمة. ولا ينشأ اتفاق ملزم إلا عند توقيع المشتري والبائع على النموذج (F)، وهو مذكرة التفاهم التي تسري أحكامها بعد ذلك، بما فيها الأحكام المتعلقة بالعربون والإخلال.",
          `عند نقل الملكية، يُدفع للبائع بموجب شيك مصرفي مُصدَّق (${iso("Manager’s Cheque")}) لدى مكتب أمين التسجيل. فلا تحوّل أي أموال إلى أي شخص خارج هذه الإجراءات، حتى لو ادّعى أنه يمثلنا، وتواصل معنا أولاً.`,
        ],
      },
      {
        id: "fees",
        heading: "الأتعاب وتكاليف الأطراف الأخرى",
        paragraphs: [
          `تبلغ أتعابنا ${RATES.commission} من قيمة البيع مضافاً إليها ضريبة القيمة المضافة بنسبة ${RATES.vat} على الأتعاب، ويدفعها ${BUYER_PAYS ? "المشتري" : "البائع"} فقط عند إتمام نقل الملكية لدى الدائرة، ولا تُستحق أي أتعاب إذا لم يكتمل. ${
            BUYER_PAYS
              ? "والمنصة مجانية للبائعين، ولا نتقاضى دفعات مقدّمة أو رسوم إدراج."
              : "وتقديم العروض مجاني للمشترين، ولا نتقاضى دفعات مقدّمة أو رسوم إدراج."
          }`,
          `تحدّد الجهات الأخرى تكاليفها وتستوفيها إضافةً إلى أتعابنا، وتشمل رسم نقل الملكية لدى الدائرة (${RATES.dld} من قيمة العقار حالياً)، ورسوم التسجيل ومكتب أمين التسجيل، ورسوم شهادة عدم الممانعة أو الرسوم الإدارية لدى المطوّر. وتحدّد مذكرة التفاهم الطرف الذي يتحمّل كلاً منها.`,
          "حاسبات الأتعاب وتفاصيل التكاليف المعروضة على المنصة تقديرية، والمبالغ المعتمدة هي التي تُستوفى وقت المعاملة، وتُحتسب أتعابنا على أساس قيمة البيع الواردة في مذكرة التفاهم.",
        ],
      },
      {
        id: "non-circumvention",
        heading: "إخفاء الهوية وعدم التحايل",
        paragraphs: [
          "تبقى هوية المشتري غير معلنة للبائع؛ إذ يطّلع البائع على مبلغ العرض وشروطه دون هوية المشتري أو بيانات التواصل معه، وتجري جميع المفاوضات عن طريق فريقنا الذي يطّلع على بيانات الطرفين لإدارة المعاملة.",
          "تتعهد، لمدة 12 شهراً من تاريخ تعريفنا إياك لأول مرة بوحدة أو بمشترٍ أو ببائع، بألا تتعامل مع الطرف الآخر بشأن تلك الوحدة، مباشرةً أو بصورة غير مباشرة، بطريقة تتجاوزنا أو تتجاوز أتعابنا. وفي حال الإخلال بذلك، تُستحق لنا الأتعاب المقررة في البند 7، دون الإخلال بحقوقنا الأخرى.",
        ],
      },
      {
        id: "verified",
        heading: "معنى علامة «موثّق»",
        paragraphs: [
          "تعني علامة «موثّق» أن فريقنا راجع مستندات البائع، وهي عادةً اتفاقية البيع والشراء أو أوقود وكشف حساب حديث، ووجدها متوافقة مع الإعلان، وتلقّى إقرار البائع بملكيته للوحدة أو بتفويضه ببيعها.",
          "التوثيق فحصٌ للمستندات وليس ضماناً؛ فهو لا يعني أننا عاينّا الوحدة أو قيّمناها، أو تحققنا من مراحل الإنشاء أو موعد التسليم، أو استبعدنا كل القيود، أو أن المطوّر سيصدر شهادة عدم الممانعة. ويُعتدّ بسجلات المطوّر والدائرة وقت نقل الملكية.",
        ],
      },
      {
        id: "prohibited",
        heading: "السلوك المحظور",
        paragraphs: ["يُحظر عليك:"],
        bullets: [
          "تقديم معلومات أو مستندات أو بيانات هوية كاذبة أو مضلِّلة أو عائدة لغيرك؛",
          "إدراج وحدة لا يحق لك بيعها، أو إدراج الوحدة ذاتها مرتين؛",
          "تقديم عروض لا تنوي الوفاء بها، أو التلاعب بالأسعار؛",
          "استخدام المنصة في غسل الأموال أو تمويل الإرهاب أو التهرب من العقوبات أو الاحتيال أو أي غرض غير مشروع؛",
          "جمع الإعلانات أو بيانات المستخدمين أو نسخها آلياً، أو استخدام برامج الروبوت، دون موافقتنا الكتابية؛",
          "محاولة الدخول غير المصرَّح به إلى المنصة أو إلى حسابات الآخرين، أو تعطيل المنصة، أو رفع شيفرات ضارة؛",
          "مضايقة فريقنا أو المستخدمين الآخرين أو الإساءة إليهم، أو رفع محتوى غير مشروع أو منتهك لحقوق الغير؛",
          "استخدام المنصة للترويج لخدمات منافسة أو لاستمالة مستخدميها.",
        ],
      },
      {
        id: "intellectual-property",
        heading: "الملكية الفكرية ومحتواك",
        paragraphs: [
          "المنصة وتصميمها وبرمجياتها ونصوصها وشعاراتها وتجميع الإعلانات فيها مملوكة لنا أو للجهات المرخِّصة لنا. ونمنحك ترخيصاً محدوداً وشخصياً وقابلاً للإلغاء وغير قابل للتحويل لاستخدامها للغرض المخصصة له، ولا يجوز لك نسخها أو إعادة إنتاجها إلا في الحدود التي يجيزها القانون.",
          "تحتفظ بملكية ما ترفعه، وتمنحنا ترخيصاً غير حصري ودون مقابل لتخزينه ونسخه وتكييفه وعرضه لتشغيل المنصة وتسويق إعلانك وإتمام معاملتك، ولمشاركته وفق سياسة الخصوصية. وبعض صور التسويق مقدَّمة من أطراف أخرى بموجب تراخيصها الخاصة.",
        ],
      },
      {
        id: "disclaimers",
        heading: "التقديرات والمعلومات والمشورة",
        paragraphs: [
          "الأسعار والخصومات والوفورات وخطط الدفع ومواعيد التسليم والأتعاب وتفاصيل التكاليف المعروضة على المنصة تقديرات مبنية على معلومات من البائعين والمطوّرين والمصادر العامة، وهي عرضة للتغيير. وأسعار الإطلاق والمقارنات استرشادية.",
          "لا يُعدّ أي محتوى على المنصة مشورة استثمارية أو قانونية أو ضريبية أو مالية. وتنطوي العقارات على الخارطة على مخاطر، منها تأخر الإنشاء وتغيّر المشروع وتقلبات السوق، فاحصل على مشورة مستقلة قبل الالتزام.",
          "في الحدود التي يسمح بها القانون، تُقدَّم المنصة «بحالتها الراهنة» و«حسب توفرها»، دون أي ضمان لعملها دون انقطاع أو خلوّها من الأخطاء.",
        ],
      },
      {
        id: "liability",
        heading: "حدود المسؤولية",
        paragraphs: [
          "ليس في هذه الشروط ما يستبعد أو يحدّ من أي مسؤولية لا يجوز استبعادها أو الحدّ منها بموجب قوانين دولة الإمارات العربية المتحدة، بما في ذلك المسؤولية الناشئة عن الغش أو الخطأ الجسيم أو الفعل العمدي.",
          "ومع مراعاة ما تقدّم، لا نتحمّل المسؤولية عن: (أ) أفعال المشترين أو البائعين أو المطوّرين أو الدائرة أو مكاتب أمناء التسجيل أو البنوك أو غيرهم من الأطراف أو تقصيرهم؛ (ب) رفض المطوّر إصدار شهادة عدم الممانعة أو تأخره في إصدارها، أو تأخر نقل الملكية أو تعذّره، ما لم يكن ذلك ناتجاً عن إخلالنا بهذه الشروط؛ (ج) فوات الربح أو الفرص أو فقدان البيانات أو السمعة التجارية، أو أي خسارة غير مباشرة أو تبعية؛ (د) الخسائر الناتجة عن إخلالك أو عن معلومات قدّمتها.",
          "ومع مراعاة الفقرة الأولى من هذا البند، تقتصر مسؤوليتنا الإجمالية تجاهك فيما يتصل بأي معاملة، سواء أكانت عقدية أم تقصيرية أم غير ذلك، على الأتعاب المدفوعة لنا فعلياً عن تلك المعاملة.",
        ],
      },
      {
        id: "indemnity",
        heading: "التعويض",
        paragraphs: [
          `تلتزم بتعويض ${OP.companyAr} وموظفيها ووكلائها عن المطالبات والخسائر والغرامات والتكاليف المعقولة (بما فيها أتعاب المحاماة) الناشئة عن إخلالك بهذه الشروط أو بالقانون، أو عن معلومات أو مستندات كاذبة أو غير أصلية تقدّمها.`,
        ],
      },
      {
        id: "aml",
        heading: "مكافحة غسل الأموال والتحقق من الهوية",
        paragraphs: [
          "يُعدّ الوسطاء العقاريون من الجهات المُلزَمة بالإبلاغ بموجب المرسوم بقانون اتحادي رقم (20) لسنة 2018 في شأن مواجهة جرائم غسل الأموال ومكافحة تمويل الإرهاب وتمويل التنظيمات غير المشروعة وتعديلاته ولائحته التنفيذية.",
          "ولذلك سنطلب وثائق الهوية (جواز السفر أو بطاقة الهوية الإماراتية)، وقد نطلب ما يثبت مصدر الأموال أو الثروة والغرض من المعاملة وهوية من تتصرف نيابةً عنه، ونتحقق من ذلك من مصادر موثوقة.",
          "يجوز لنا الامتناع عن تقديم الخدمة أو تعليق المعاملة أو إغلاق الحساب إذا لم تُقدَّم المعلومات المطلوبة أو اشتبهنا في وجود جريمة. ونُبلغ السلطات المختصة عن المعاملات المشبوهة متى أوجب القانون ذلك، وقد يُحظر علينا إعلامك بذلك. ونحتفظ بسجلات الهوية والمعاملات لمدة لا تقل عن خمس سنوات.",
        ],
      },
      {
        id: "suspension",
        heading: "التعليق والإنهاء",
        paragraphs: [
          "يجوز لنا تعليق حسابك أو تقييده، أو إيقاف إعلان أو حذفه، أو الامتناع عن عرض عرضٍ ما، إذا اعتقدنا بصورة معقولة أنك أخللت بهذه الشروط أو قدّمت معلومات كاذبة أو تسبّبت في خطر على الآخرين، أو إذا اقتضى ذلك القانون أو طلبته جهة مختصة.",
          "يجوز لك إغلاق حسابك في أي وقت بالتواصل معنا، دون أن يؤثر ذلك في المعاملات الجارية أو نماذج مؤسسة التنظيم العقاري الموقّعة أو الأتعاب المستحقة أو السجلات التي يلزمنا الاحتفاظ بها. وتظل البنود 7 و8 و11 و13 و14 و15 و19 سارية بعد الإغلاق.",
        ],
      },
      {
        id: "communications",
        heading: "الإشعارات والمراسلات",
        paragraphs: [
          `نتواصل معك عبر البريد الإلكتروني وإشعارات لوحة التحكم، وعبر الهاتف أو الرسائل بشأن إعلاناتك وعروضك ومعاملاتك. وتستمر هذه الرسائل الخدمية ما دام حسابك قائماً، ويمكنك إيقاف تنبيهات عمليات البحث المحفوظة من لوحة التحكم. ويمكنك توجيه الإشعارات إلينا على ${OP.emailAr}، ونراسلك عادةً باللغة التي استخدمتها آخر مرة على المنصة.`,
        ],
      },
      {
        id: "changes",
        heading: "التعديلات على المنصة وعلى هذه الشروط",
        paragraphs: [
          "يجوز لنا تعديل خصائص المنصة أو إلغاؤها، وتعديل هذه الشروط، كأن يكون ذلك لمواكبة التغييرات في القانون أو في ممارسات مؤسسة التنظيم العقاري أو الدائرة أو في خدماتنا. وسننشر الشروط المعدَّلة على هذه الصفحة مع تاريخ «آخر تحديث» جديد، ونُخطرك بالتعديلات الجوهرية قبل سريانها بمدة معقولة عبر البريد الإلكتروني أو من خلال المنصة.",
          "لا تسري التعديلات على المعاملات التي وُقّعت مذكرات التفاهم الخاصة بها. ويُعدّ استمرارك في استخدام المنصة بعد سريانها قبولاً لها، وإلا فعليك التوقف عن استخدام المنصة وإغلاق حسابك.",
        ],
      },
      {
        id: "governing-law",
        heading: "القانون الواجب التطبيق وتسوية النزاعات",
        paragraphs: [
          "تخضع هذه الشروط، وأي نزاع ينشأ عنها أو عن المنصة، للقوانين الاتحادية لدولة الإمارات العربية المتحدة كما تُطبَّق في إمارة دبي.",
          `نرجو تقديم أي شكوى إلينا أولاً على ${OP.emailAr}. ويمكنك أيضاً تقديم شكوى بشأن أي وسيط عقاري عبر القنوات المعتمدة لدى دائرة الأراضي والأملاك ومؤسسة التنظيم العقاري. ومع مراعاة ما تقدّم، تختص محاكم دبي وحدها بنظر أي نزاع.`,
        ],
      },
      {
        id: "language",
        heading: "اللغة",
        paragraphs: [
          "تُنشر هذه الشروط باللغتين الإنجليزية والعربية، وفي حال وجود أي تعارض بين النسختين، تسود النسخة الإنجليزية في الحدود التي يسمح بها القانون.",
        ],
      },
      {
        id: "contact",
        heading: "التواصل معنا",
        paragraphs: [`لأي استفسار بشأن هذه الشروط، يُرجى التواصل مع ${OP.companyAr}:`],
        bullets: contactBulletsAr,
      },
    ],
  },
};

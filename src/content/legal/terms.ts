import { BUYER_PAYS, contactBulletsAr, contactBulletsEn, contactBulletsZh, iso, LEGAL_UPDATED, OP, RATES } from "./brand";
import type { LegalContent } from "./types";

// Terms of Use. Section numbers are referenced in the text ("section 7"), so keep the order in sync across all
// languages when adding or moving a section.

export const termsOfUse: LegalContent = {
  en: {
    title: "Terms of Use",
    updated: LEGAL_UPDATED,
    summary: `${OP.site} is operated by ${OP.company}, a Dubai real-estate brokerage. We review listings, match buyers with owners of off-plan units, negotiate between them and handle the developer NOC and the DLD transfer, but we are never a party to the sale. ${
      BUYER_PAYS
        ? `Listing is free; the buyer pays our fee of ${RATES.commission} of the sale value plus ${RATES.vat} VAT when the transfer completes; subject to section 8, nothing is payable if it does not.`
        : `The seller pays our fee of ${RATES.commission} of the sale value plus ${RATES.vat} VAT when the transfer completes; subject to section 8, nothing is payable if it does not.`
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
          "Only the Developer decides whether to issue an NOC, and it may require a minimum percentage of the price to be paid or overdue instalments and fees to be settled; the DLD registers Transfers under its own rules. We review each Listing, and any documents provided for it, and check Developer eligibility before the Listing goes live (section 9 explains when a Listing is marked Verified), but we cannot guarantee that an NOC will be issued, when it will be issued, or that a Transfer will complete.",
          "The Platform also shows sample listings, which we add to illustrate how the marketplace works. Each is labelled “Sample”, and the unit, prices and payment plan it shows are illustrative and not for sale. A sample listing is not an offer to sell and cannot receive Offers.",
          "As broker, we:",
        ],
        bullets: [
          "review the documents the Seller provides (such as the SPA, Oqood, statement of account and identity documents) and check the Listing against them;",
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
          } Before a Listing goes live you sign RERA Form A (the Seller–broker agreement) with us and we obtain a DLD advertising permit (Trakheesi) for it, as RERA requires for every property advertisement; like the other RERA forms, Form A is signed outside the Platform.`,
          "We may edit a Listing for clarity, request further documents, or decline, pause or remove a Listing, for example if its information cannot be verified. Tell us promptly if anything changes, including if you sell the Unit elsewhere.",
          "Photographs you upload with a Listing are published with it, and anyone who has a photograph’s web address can view it even while the Listing is under review. Other documents you upload are visible on the Platform only to you and our authorised staff.",
          "Accepting an Offer lets us request the NOC and prepare the documents; the sale becomes binding only when you and the Buyer sign RERA Form F (the MOU).",
          "By submitting a Listing, you confirm that:",
        ],
        bullets: [
          "you are the registered purchaser under the SPA or are legally authorised to sell the Unit (for example, under a valid power of attorney), and any co-owners agree to the sale;",
          "the information in the Listing, including prices, the amount paid, the payment plan, the handover date and whether any instalments have been missed, is true and complete;",
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
          `Our fee is ${RATES.commission} of the Sale Value plus VAT at ${RATES.vat} on the fee, paid by the ${BUYER_PAYS ? "Buyer" : "Seller"} when the Transfer completes at the DLD. Subject to section 8, if the Transfer does not complete, no fee is payable. ${
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
          "Until the MOU (RERA Form F) is prepared, Buyers remain anonymous to Sellers: a Seller sees the amount and terms of an Offer, any message the Buyer wrote, whether the Buyer will pay in cash or with a mortgage and whether the Buyer has completed our identity check, but not the Buyer’s name or contact details. Listings never show the Seller’s name or contact details. All negotiation goes through our team, which sees both parties’ details in order to manage the transaction. When the MOU is prepared, we disclose each party’s identity details to the other as needed to sign RERA Form F and complete the Transfer.",
          "For 12 months after we first introduce you to a Unit, a Buyer or a Seller, you must not, directly or indirectly, deal with the other party over that Unit in a way that bypasses us or our fee. If you do, the fee under section 7 becomes payable to us, without prejudice to our other rights.",
        ],
      },
      {
        id: "verified",
        heading: "What “Verified” means",
        paragraphs: [
          "“Verified” means that our team has reviewed the Seller’s SPA or Oqood and a statement of account against the Listing and found them consistent with it. When we approve a Listing, we mark it Verified only if the Seller has uploaded those documents and our team has reviewed them in this way; our team may also mark a Listing Verified after reviewing documents provided to it other than by upload to the Platform. A Listing approved without that review is published without the Verified mark, and sample listings (section 4) are never marked Verified. By submitting a Listing, the Seller also confirms that they own the Unit or are authorised to sell it (section 5).",
          "It is a document check made at the time of our review, not a guarantee. It does not mean that we have inspected or valued the Unit, confirmed construction progress or the handover date, ruled out every encumbrance, or that the Developer will issue an NOC. The records of the Developer and the DLD at Transfer are definitive.",
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
          "You keep ownership of what you upload and grant us a non-exclusive, royalty-free licence to store, copy, adapt and display it to operate the Platform, market your Listing and complete your transaction, and to share it as our Privacy Policy describes. Some photographs on the Platform, including those on sample listings, are supplied by third parties under their own licences.",
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
          "Real-estate brokers are reporting entities (designated non-financial businesses and professions) under UAE Federal Decree-Law No. (10) of 2025 on Anti-Money Laundering and Combating the Financing of Terrorism and Proliferation Financing, which replaced Federal Decree-Law No. (20) of 2018, and its implementing regulations.",
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
          `We contact you by email, through dashboard notifications and, about your Listings, Offers and transactions, by phone or message. These service messages continue while your account is open. You can turn off the alerts for each saved search in your dashboard, and stop price-drop emails for a deal by removing it from your watchlist. You can send notices to us at ${OP.email}, and we generally write to you in the language you last used on the Platform.`,
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
          "These Terms are published in English, Arabic and Simplified Chinese. If there is any inconsistency between the versions, the English version prevails to the extent permitted by law.",
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
    summary: `تدير منصة ${iso(OP.site)} ${OP.companyAr}، وهي شركة وساطة عقارية في دبي. نراجع الإعلانات، ونربط المشترين بمالكي الوحدات على الخارطة، ونتولى التفاوض بين الطرفين ومتابعة شهادة عدم الممانعة من المطوّر ونقل الملكية لدى دائرة الأراضي والأملاك، دون أن نكون طرفاً في البيع بأي حال. ${
      BUYER_PAYS
        ? `الإدراج مجاني، ويدفع المشتري أتعابنا البالغة ${RATES.commission} من قيمة البيع مضافاً إليها ضريبة القيمة المضافة بنسبة ${RATES.vat} عند إتمام نقل الملكية، ومع مراعاة البند 8، لا تُستحق أي أتعاب إذا لم يكتمل.`
        : `يدفع البائع أتعابنا البالغة ${RATES.commission} من قيمة البيع مضافاً إليها ضريبة القيمة المضافة بنسبة ${RATES.vat} عند إتمام نقل الملكية، ومع مراعاة البند 8، لا تُستحق أي أتعاب إذا لم يكتمل.`
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
          "يعود قرار إصدار شهادة عدم الممانعة إلى المطوّر وحده، وقد يشترط سداد نسبة دنيا من الثمن أو سداد الأقساط المتأخرة وتسوية الرسوم، وتسجّل الدائرة نقل الملكية وفق أنظمتها. ومع أننا نراجع كل إعلان وما يُقدَّم بشأنه من مستندات، ونتحقق من أهلية الوحدة لدى المطوّر قبل نشر الإعلان (ويبيّن البند 9 متى يُمنح الإعلان علامة «موثّق»)، فلا يمكننا ضمان إصدار الشهادة أو موعد إصدارها أو إتمام نقل الملكية.",
          "وتعرض المنصة كذلك إعلانات توضيحية نضيفها لبيان طريقة عمل السوق، ويحمل كلٌّ منها علامة «توضيحي»، والوحدة والأسعار وخطة الدفع المبيّنة فيه توضيحية وغير معروضة للبيع. ولا يُعدّ الإعلان التوضيحي عرضاً للبيع، ولا يجوز تقديم عروض عليه.",
          "وبصفتنا الوسيط، فإننا:",
        ],
        bullets: [
          "نراجع المستندات التي يقدّمها البائع (مثل اتفاقية البيع والشراء وأوقود وكشف الحساب ووثائق الهوية) ونطابق الإعلان معها؛",
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
          } وقبل نشر الإعلان توقّع معنا النموذج (A) الصادر عن مؤسسة التنظيم العقاري (اتفاقية البائع والوسيط)، ونستخرج له تصريح إعلان من دائرة الأراضي والأملاك (تراخيصي) كما تشترط المؤسسة لكل إعلان عقاري، ويُوقَّع النموذج (A)، شأنه شأن سائر نماذج المؤسسة، خارج المنصة.`,
          "يجوز لنا تحرير الإعلان لأغراض الوضوح، أو طلب مستندات إضافية، أو رفض الإعلان أو إيقافه أو حذفه، كأن يتعذّر التحقق من بياناته. وعليك إبلاغنا دون تأخير بأي تغيير، بما في ذلك بيع الوحدة عن طريق جهة أخرى.",
          "تُنشر الصور التي ترفعها مع الإعلان مع ذلك الإعلان، ويمكن لكل من لديه رابط الصورة مشاهدتها حتى أثناء مراجعة الإعلان. أما المستندات الأخرى التي ترفعها، فلا يطّلع عليها على المنصة سواك والموظفون المخوَّلون لدينا.",
          "يتيح لنا قبولك عرضاً طلب شهادة عدم الممانعة وإعداد المستندات، ولا يصبح البيع ملزماً إلا بتوقيعك أنت والمشتري على النموذج (F) الصادر عن مؤسسة التنظيم العقاري (مذكرة التفاهم).",
          "وبتقديمك الإعلان، فإنك تُقرّ بما يلي:",
        ],
        bullets: [
          "أنك المشتري المسجّل بموجب اتفاقية البيع والشراء أو مخوَّل قانوناً ببيع الوحدة (بموجب وكالة سارية مثلاً)، وأن أي شركاء في ملكيتها موافقون على البيع؛",
          "أن بيانات الإعلان، بما فيها الأسعار والمبلغ المدفوع وخطة الدفع وموعد التسليم وما إذا كان قد فات سداد أي قسط، صحيحة وكاملة؛",
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
          `تبلغ أتعابنا ${RATES.commission} من قيمة البيع مضافاً إليها ضريبة القيمة المضافة بنسبة ${RATES.vat} على الأتعاب، ويدفعها ${BUYER_PAYS ? "المشتري" : "البائع"} عند إتمام نقل الملكية لدى الدائرة. ومع مراعاة البند 8، لا تُستحق أي أتعاب إذا لم يكتمل نقل الملكية. ${
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
          "حتى إعداد مذكرة التفاهم (النموذج (F) الصادر عن مؤسسة التنظيم العقاري)، تبقى هوية المشتري غير معلنة للبائع؛ إذ يطّلع البائع على مبلغ العرض وشروطه، وعلى أي رسالة كتبها المشتري، وعلى ما إذا كان المشتري سيدفع نقداً أم بتمويل عقاري، وما إذا كان قد أتمّ إجراءات التحقق من الهوية لدينا، دون اسم المشتري أو بيانات التواصل معه. ولا تعرض الإعلانات بأي حال اسم البائع أو بيانات التواصل معه. وتجري جميع المفاوضات عن طريق فريقنا الذي يطّلع على بيانات الطرفين لإدارة المعاملة. وعند إعداد مذكرة التفاهم، نُفصح لكل طرف عن بيانات هوية الطرف الآخر بالقدر اللازم لتوقيع النموذج (F) وإتمام نقل الملكية.",
          "تتعهد، لمدة 12 شهراً من تاريخ تعريفنا إياك لأول مرة بوحدة أو بمشترٍ أو ببائع، بألا تتعامل مع الطرف الآخر بشأن تلك الوحدة، مباشرةً أو بصورة غير مباشرة، بطريقة تتجاوزنا أو تتجاوز أتعابنا. وفي حال الإخلال بذلك، تُستحق لنا الأتعاب المقررة في البند 7، دون الإخلال بحقوقنا الأخرى.",
        ],
      },
      {
        id: "verified",
        heading: "معنى علامة «موثّق»",
        paragraphs: [
          "تعني علامة «موثّق» أن فريقنا راجع ما قدّمه البائع من اتفاقية البيع والشراء أو أوقود ومن كشف الحساب، وطابقه مع الإعلان ووجده متوافقاً معه. وعند اعتماد الإعلان، لا نمنحه علامة «موثّق» إلا إذا رفع البائع هذه المستندات وراجعها فريقنا على هذا النحو، ويجوز لفريقنا كذلك منح الإعلان هذه العلامة بعد مراجعة مستندات قُدِّمت إليه بغير طريق رفعها على المنصة. ويُنشر الإعلان المعتمد دون هذه المراجعة بلا علامة «موثّق»، ولا تُمنح الإعلانات التوضيحية (البند 4) هذه العلامة بأي حال. ويُقرّ البائع، بتقديمه الإعلان، بملكيته للوحدة أو بتفويضه ببيعها (البند 5).",
          "التوثيق فحصٌ للمستندات يُجرى وقت مراجعتنا، وليس ضماناً؛ فهو لا يعني أننا عاينّا الوحدة أو قيّمناها، أو تحققنا من مراحل الإنشاء أو موعد التسليم، أو استبعدنا كل القيود، أو أن المطوّر سيصدر شهادة عدم الممانعة. ويُعتدّ بسجلات المطوّر والدائرة وقت نقل الملكية.",
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
          "تحتفظ بملكية ما ترفعه، وتمنحنا ترخيصاً غير حصري ودون مقابل لتخزينه ونسخه وتكييفه وعرضه لتشغيل المنصة وتسويق إعلانك وإتمام معاملتك، ولمشاركته وفق سياسة الخصوصية. وبعض الصور المعروضة على المنصة، ومنها صور الإعلانات التوضيحية، مقدَّمة من أطراف أخرى بموجب تراخيصها الخاصة.",
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
          "يُعدّ الوسطاء العقاريون من الجهات المُلزَمة بالإبلاغ (من الأعمال والمهن غير المالية المحددة) بموجب المرسوم بقانون اتحادي رقم (10) لسنة 2025 في شأن مواجهة غسل الأموال ومكافحة تمويل الإرهاب وتمويل انتشار التسلح، الذي حلّ محل المرسوم بقانون اتحادي رقم (20) لسنة 2018، ولائحته التنفيذية.",
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
          `نتواصل معك عبر البريد الإلكتروني وإشعارات لوحة التحكم، وعبر الهاتف أو الرسائل بشأن إعلاناتك وعروضك ومعاملاتك. وتستمر هذه الرسائل الخدمية ما دام حسابك قائماً. ويمكنك إيقاف التنبيهات لكل عملية بحث محفوظة على حدة من لوحة التحكم، وإيقاف رسائل انخفاض السعر لصفقة ما بإزالتها من قائمة المتابعة. ويمكنك توجيه الإشعارات إلينا على ${OP.emailAr}، ونراسلك عادةً باللغة التي استخدمتها آخر مرة على المنصة.`,
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
          "تُنشر هذه الشروط باللغات الإنجليزية والعربية والصينية المبسطة، وفي حال وجود أي تعارض بين النسخ، تسود النسخة الإنجليزية في الحدود التي يسمح بها القانون.",
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

  zh: {
    title: "使用条款",
    updated: LEGAL_UPDATED,
    summary: `${OP.site} 由迪拜房地产经纪公司 ${OP.companyZh} 运营。我们审核房源、撮合买家与期房单元的业主、在双方之间进行协商，并办理开发商无异议函（NOC）及迪拜土地局（DLD）过户，但我们在任何情况下均不是买卖的一方。${
      BUYER_PAYS
        ? `发布房源免费；买家在过户完成时支付我们的服务费，即交易总价的 ${RATES.commission} 另加 ${RATES.vat} 的增值税；除第 8 条另有规定外，过户未完成则无需支付任何费用。`
        : `卖家在过户完成时支付我们的服务费，即交易总价的 ${RATES.commission} 另加 ${RATES.vat} 的增值税；除第 8 条另有规定外，过户未完成则无需支付任何费用。`
    }在签署迪拜房地产监管局（RERA）F 表（谅解备忘录，MOU）之前，报价不具有约束力。`,
    sections: [
      {
        id: "about",
        heading: "关于本条款",
        paragraphs: [
          `本使用条款（以下简称“本条款”）规范您对 ${OP.site} 网站以及我们通过该网站提供的服务（以下简称“本平台”）的使用。本平台的运营方为 ${OP.identityZh}（以下简称“我们”）。`,
          "您一旦创建账户、挂牌出售单元、提出报价或以其他方式使用本平台，即表示同意本条款。我们的《隐私政策》和《Cookie 政策》构成本条款的一部分。如您不同意本条款，请勿使用本平台。",
          "每笔交易还受为该交易签署的迪拜房地产监管局（RERA）表格及合同的约束（第 5 条和第 6 条）；就涉及该交易的事项而言，上述表格及合同优先于本条款。",
        ],
      },
      {
        id: "definitions",
        heading: "定义",
        paragraphs: ["在本条款中："],
        bullets: [
          "“单元”指位于迪拜、由开发商根据买卖协议（SPA）出售且尚未交房的期房物业。",
          "“开发商”指出售该单元并管理其付款计划的开发商；“买卖协议”（SPA）指原始购买人与开发商之间签订的买卖协议；“Oqood”指该单元在迪拜土地局（DLD）的临时登记（期房登记）。",
          "“卖家”指挂牌出售单元的用户；“买家”指提出报价的用户。",
          "“已付权益”指卖家已向开发商支付的分期款；“约定价格”指买家为受让该已付权益而同意向卖家支付的金额。",
          "“剩余分期款”指付款计划中由买家承接的未付余额；“交易总价”指约定价格加上剩余分期款。",
          "“无异议函”（NOC）指开发商出具的、允许转售或转让的无异议证明。",
          "“DLD”指迪拜土地局（Dubai Land Department）；“RERA”指其下属的迪拜房地产监管局（Real Estate Regulatory Agency）。",
          "“过户”指在迪拜土地局产权登记受托机构将该单元登记至买家名下，或将买卖协议转让至买家名下。",
          "“房源”指在本平台上展示的单元；“报价”指通过本平台提出的价格提议，包括还价。",
          "“用户”或“您”指访问或使用本平台的任何人。",
        ],
      },
      {
        id: "eligibility",
        heading: "资格与账户",
        paragraphs: [
          "您必须年满 18 周岁并具有订立合同的完全法律行为能力。如您代表公司或他人行事，即表示您确认已获授权代表其承担具有约束力的义务。",
          "挂牌出售单元、提出报价、使用关注列表或保存搜索均需要账户。请提供准确、完整的信息，包括您的法定全名、有效的电子邮箱地址以及（在被要求时）手机号码，并保持信息更新。每人只能持有一个账户，且账户不得共享或转让。",
          `请对您的登录信息保密；您须对通过您账户进行的活动负责。如您怀疑账户遭到未经授权的访问，请立即通过 ${OP.emailZh} 告知我们。我们绝不会向您索要密码。`,
        ],
      },
      {
        id: "service",
        heading: "我们的服务",
        paragraphs: [
          "本平台将无法继续履行开发商付款计划的期房单元业主与买家联系起来；买家向卖家支付已付权益的对价，并承接剩余分期款。",
          "我们仅以经纪人身份行事，在任何情况下均不是单元买卖或转让的一方。任何买卖合同均直接在买家与卖家之间订立，双方各自对合同的履行负责。",
          "是否出具无异议函（NOC）完全由开发商决定，开发商可能要求已付款达到价格的最低比例，或要求先结清逾期分期款及费用；迪拜土地局（DLD）按其自身规则办理过户登记。我们会在房源上线前审核每个房源及为其提供的所有文件，并核查该单元是否符合开发商的转售条件（第 9 条说明房源在何种情况下标注为“已核实”），但我们无法保证无异议函一定会出具、何时出具，亦无法保证过户一定完成。",
          "本平台还展示示例房源，由我们添加以说明本交易平台的运作方式。每个示例房源均标注为“示例”，其显示的单元、价格和付款计划仅为示意，并非在售。示例房源不构成出售要约，亦不接受报价。",
          "作为经纪人，我们：",
        ],
        bullets: [
          "审核卖家提供的文件（如买卖协议、Oqood 期房登记、付款对账单及身份文件），并据此核对房源信息；",
          "在开发商公布的要求所允许的范围内，核查该单元能否转售或转让；",
          "发布经审核通过的房源，并为其匹配买家；",
          "转达报价与还价，并在双方之间进行协商；",
          "在价格达成一致后申请无异议函，并准备转让文件和 RERA 表格；以及",
          "在迪拜土地局产权登记受托机构预约办理过户。",
        ],
      },
      {
        id: "sellers",
        heading: "如果您是卖家",
        paragraphs: [
          `${
            BUYER_PAYS
              ? "发布房源免费：我们不向卖家收取任何挂牌费、预付费用或佣金。"
              : "发布房源无需预付任何费用；我们的服务费见第 7 条。"
          }房源上线前，您须与我们签署 RERA A 表（卖家与经纪人之间的委托销售协议），我们亦将按照 RERA 对每则房产广告的要求，为该房源取得迪拜土地局广告许可（Trakheesi）；与其他 RERA 表格一样，A 表在本平台之外签署。`,
          "我们可以为表述清晰而编辑房源、要求提供进一步的文件，或拒绝、暂停或移除房源，例如在房源信息无法核实的情况下。如有任何变化，包括您通过其他渠道出售该单元，请及时告知我们。",
          "您随房源上传的照片将与房源一同发布，任何持有照片网址的人即使在房源审核期间也能查看该照片。您上传的其他文件在本平台上仅对您本人和我们的授权员工可见。",
          "您接受报价后，我们即可申请无异议函并准备相关文件；买卖仅在您与买家签署 RERA F 表（谅解备忘录，MOU）后方具有约束力。",
          "提交房源即表示您确认：",
        ],
        bullets: [
          "您是买卖协议项下的登记购买人，或依法获授权出售该单元（例如持有有效的授权委托书），且所有共有人均同意出售；",
          "房源信息，包括价格、已付金额、付款计划、交房日期以及是否存在逾期未付的分期款，均真实、完整；",
          "您上传的每份文件均真实、未经篡改且与该单元相关；以及",
          "您已书面告知我们任何可能阻碍或延误出售的争议、抵押、查封或限制。",
        ],
      },
      {
        id: "buyers",
        heading: "如果您是买家",
        paragraphs: [
          "仅当您有意并有能力按该价格完成交易时方可提出报价，包括支付约定价格、按期支付剩余分期款以及第 7 条所述的第三方费用。对于反复提出报价却不跟进的账户，我们可以加以限制。",
          "我们可能要求您提供护照或阿联酋身份证（Emirates ID）以证明身份，在需要时证明资金来源（第 15 条），并签署载明我们服务费的 RERA B 表（买家与经纪人之间的协议）。",
          "本平台上的报价并非具有约束力的买卖合同。只有在买家与卖家签署 RERA F 表，即谅解备忘录（“MOU”）后，才产生具有约束力的协议，届时适用该备忘录的条款，包括其中关于定金和违约的条款。",
          "过户时，在迪拜土地局产权登记受托机构以银行本票（Manager’s Cheque）向卖家付款。切勿在此流程之外向任何人汇款，即使对方自称代表我们；请先与我们联系。",
        ],
      },
      {
        id: "fees",
        heading: "服务费与第三方费用",
        paragraphs: [
          `我们的服务费为交易总价的 ${RATES.commission}，另加按服务费的 ${RATES.vat} 计算的增值税，由${BUYER_PAYS ? "买家" : "卖家"}在迪拜土地局完成过户时支付。除第 8 条另有规定外，如过户未完成，则无需支付服务费。${
            BUYER_PAYS
              ? "本平台对卖家免费，我们不收取任何预付费用或挂牌费。"
              : "买家提出报价免费，我们不收取任何预付费用或挂牌费。"
          }`,
          `第三方费用由相关机构自行设定并收取，在我们的服务费之外另行支付，包括：迪拜土地局过户费（目前为物业价值的 ${RATES.dld}）、迪拜土地局登记费及产权登记受托机构收费，以及开发商的无异议函费用或行政管理费。谅解备忘录将载明各项费用分别由哪一方承担。`,
          "本平台上的费用计算器和费用明细仅为估算。实际适用的金额以交易时实际收取的金额为准，我们的服务费按谅解备忘录中载明的交易总价计算。",
        ],
      },
      {
        id: "non-circumvention",
        heading: "匿名与禁止规避",
        paragraphs: [
          "在谅解备忘录（RERA F 表）准备完成之前，买家对卖家保持匿名：卖家可以看到报价的金额和条件、买家撰写的任何留言、买家将以现金还是按揭付款，以及买家是否已完成我们的身份核验，但看不到买家的姓名或联系方式。房源在任何情况下均不显示卖家的姓名或联系方式。所有协商均通过我们的团队进行，我们的团队为管理交易可以查看双方的信息。谅解备忘录准备完成后，我们将在签署 RERA F 表和完成过户所需的范围内，向双方相互披露对方的身份信息。",
          "自我们首次向您介绍某个单元、买家或卖家之日起 12 个月内，您不得以规避我们或我们服务费的方式，直接或间接就该单元与对方进行交易。如您违反此规定，您须向我们支付第 7 条规定的服务费，且不影响我们的其他权利。",
        ],
      },
      {
        id: "verified",
        heading: "“已核实”的含义",
        paragraphs: [
          "“已核实”指我们的团队已将卖家的买卖协议或 Oqood 期房登记以及付款对账单与房源信息进行比对，并认定相符。我们在审核通过房源时，仅在卖家已上传上述文件且我们的团队已按此方式审阅的情况下，才将其标注为“已核实”；我们的团队也可以在审阅以上传至本平台以外的其他方式提供的文件后，将房源标注为“已核实”。未经该项审阅即审核通过的房源发布时不带“已核实”标注；示例房源（第 4 条）在任何情况下均不会标注为“已核实”。卖家提交房源，亦即确认其拥有该单元或获授权出售该单元（第 5 条）。",
          "该标注是我们在审核时进行的文件核查，并非保证。它不意味着我们已实地查看或评估该单元、已确认施工进度或交房日期、已排除所有产权负担，亦不意味着开发商将出具无异议函。以过户时开发商和迪拜土地局的记录为准。",
        ],
      },
      {
        id: "prohibited",
        heading: "禁止行为",
        paragraphs: ["您不得："],
        bullets: [
          "提供虚假或具有误导性的信息、文件或身份资料，或提供他人的信息、文件或身份资料；",
          "挂牌出售您无权出售的单元，或将同一单元重复挂牌；",
          "提出无意履行的报价，或操纵价格；",
          "将本平台用于洗钱、资助恐怖主义、规避制裁、欺诈或任何其他非法目的；",
          "未经我们书面同意，抓取或复制房源或用户数据，或使用自动化程序（机器人）；",
          "试图未经授权访问本平台或他人账户、干扰本平台运行或上传恶意代码；",
          "骚扰或辱骂我们的团队或其他用户，或上传非法或侵权内容；或",
          "利用本平台宣传竞争性服务或招揽本平台的用户。",
        ],
      },
      {
        id: "intellectual-property",
        heading: "知识产权与您的内容",
        paragraphs: [
          "本平台及其设计、软件、文本、标识和房源汇编归我们或我们的许可方所有。我们授予您有限的、个人的、可撤销且不可转让的许可，供您按预期用途使用本平台；除法律允许的情形外，您不得复制本平台。",
          "您保留对所上传内容的所有权，并授予我们非排他性、免版税的许可，允许我们为运营本平台、推广您的房源和完成您的交易而存储、复制、改编和展示该内容，并按我们《隐私政策》所述予以共享。本平台上的部分照片（包括示例房源的照片）由第三方根据其自身的许可提供。",
        ],
      },
      {
        id: "disclaimers",
        heading: "估算、信息与建议",
        paragraphs: [
          "本平台上的价格、折扣、节省金额、付款计划、交房日期、费用和费用明细均为基于卖家、开发商和公开来源信息的估算，可能发生变化。开发商当前售价（开盘价）及相关比较仅供参考。",
          "本平台上的任何内容均不构成投资、法律、税务或财务建议。期房存在风险，包括施工延误、项目变更和市场波动；请在作出承诺前寻求独立的专业意见。",
          "在法律允许的范围内，本平台按“现状”和“可用状态”提供，不保证其不会中断或没有错误。",
        ],
      },
      {
        id: "liability",
        heading: "责任限制",
        paragraphs: [
          "本条款的任何内容均不排除或限制依据阿联酋法律不得排除或限制的任何责任，包括因欺诈、重大过失或故意不当行为而产生的责任。",
          "在此前提下，我们对以下事项不承担责任：(a)买家、卖家、开发商、迪拜土地局、产权登记受托机构、银行或其他第三方的作为或不作为；(b)开发商拒绝或延迟出具无异议函，或过户延误或未能完成，但因我们违反本条款所致者除外；(c)利润、机会、数据或商誉的损失，或任何间接损失或后果性损失；或(d)因您的违约或您所提供的信息而造成的损失。",
          "除本条第一款另有规定外，无论基于合同、侵权或其他理由，我们就某笔交易对您承担的全部责任，以我们就该交易实际收取的服务费为限。",
        ],
      },
      {
        id: "indemnity",
        heading: "赔偿",
        paragraphs: [
          `对于因您违反本条款或法律，或因您提供虚假或不真实的信息或文件而产生的索赔、损失、罚款和合理费用（包括律师费），您应向 ${OP.companyZh} 及其员工和代理人作出赔偿。`,
        ],
      },
      {
        id: "aml",
        heading: "反洗钱与身份核验",
        paragraphs: [
          "根据《阿联酋 2025 年第（10）号关于反洗钱、打击恐怖主义融资和扩散融资的联邦法令》（UAE Federal Decree-Law No. (10) of 2025 on Anti-Money Laundering and Combating the Financing of Terrorism and Proliferation Financing）及其实施条例，房地产经纪人属于报告实体（特定非金融企业和职业）；该法令取代了《2018 年第（20）号联邦法令》（Federal Decree-Law No. (20) of 2018）。",
          "因此，我们将要求您提供身份文件（护照或阿联酋身份证），并可能要求您提供资金或财富来源、交易目的以及您所代表的任何人的证明材料，并通过可靠来源加以核实。",
          "如未提供相关信息或我们怀疑存在犯罪行为，我们可以拒绝提供服务、暂停交易或关闭账户。在法律要求的情况下，我们会向主管机关报告可疑交易，并且可能被禁止告知您。我们将身份识别记录和交易记录至少保存五年。",
        ],
      },
      {
        id: "suspension",
        heading: "暂停与终止",
        paragraphs: [
          "如我们有合理理由认为您违反了本条款、提供了虚假信息或对他人造成风险，或者法律或主管机关有此要求，我们可以暂停或限制您的账户、暂停或移除房源，或拒绝转达报价。",
          "您可以随时联系我们注销账户。注销账户不影响正在进行的交易、已签署的 RERA 表格、应付的费用或我们必须保存的记录。第 7、8、11、13、14、15 和 19 条在账户注销后继续有效。",
        ],
      },
      {
        id: "communications",
        heading: "通知与通讯",
        paragraphs: [
          `我们通过电子邮件和“我的账户”中的通知与您联系，并就您的房源、报价和交易通过电话或消息与您联系。只要您的账户处于开通状态，这些服务消息将持续发送。您可以在“我的账户”中关闭每个已保存搜索的提醒，并通过将房源从关注列表中移除来停止接收该房源的降价提醒邮件。您可以通过 ${OP.emailZh} 向我们发送通知；我们通常以您最后一次在本平台上使用的语言与您联系。`,
        ],
      },
      {
        id: "changes",
        heading: "本平台及本条款的变更",
        paragraphs: [
          "我们可以变更或取消本平台的功能并修订本条款，例如为反映法律、RERA 或迪拜土地局实务或我们服务的变化。修订后的条款将在此处发布并注明新的“最后更新”日期；对于重大变更，我们将在其生效前通过电子邮件或在本平台上给予合理通知。",
          "修订不影响已签署谅解备忘录的交易。如您在修订生效后继续使用本平台，即表示您接受修订；如不接受，请停止使用本平台并注销您的账户。",
        ],
      },
      {
        id: "governing-law",
        heading: "适用法律与争议解决",
        paragraphs: [
          "本条款以及因本条款或本平台产生的任何争议，均受在迪拜酋长国适用的阿拉伯联合酋长国联邦法律管辖。",
          `如有任何投诉，请先通过 ${OP.emailZh} 向我们提出。您也可以通过迪拜土地局和 RERA 的渠道对房地产经纪人进行投诉。在此前提下，迪拜法院拥有专属管辖权。`,
        ],
      },
      {
        id: "language",
        heading: "语言",
        paragraphs: [
          "本条款以英文、阿拉伯文和简体中文发布。各版本之间如有任何不一致，在法律允许的范围内，以英文版本为准。",
        ],
      },
      {
        id: "contact",
        heading: "联系我们",
        paragraphs: [`如对本条款有任何疑问，请联系 ${OP.companyZh}：`],
        bullets: contactBulletsZh,
      },
    ],
  },
};

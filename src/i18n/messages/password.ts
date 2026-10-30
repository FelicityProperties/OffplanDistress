import { defineMessages } from "../define";

// Self-service password reset: /forgot-password and /reset-password.
export default defineMessages({
  en: {
    "meta.forgot.title": "Forgot password",
    "meta.forgot.description": "Get a link to choose a new password for your account.",
    "meta.reset.title": "Choose a new password",

    "field.email": "Email",
    "field.password": "New password",
    "field.confirm": "Confirm new password",
    "field.passwordHint": "At least 8 characters",

    "forgot.title": "Forgot your password?",
    "forgot.sub": "Enter the email you signed up with and we'll send you a link to choose a new one.",
    "forgot.submit": "Send reset link",
    "forgot.resend": "Send again",
    "forgot.sentTitle": "Check your email",
    "forgot.sentBody":
      "If an account exists for {email}, we've sent it a link to reset your password. The link works for 1 hour — check your spam folder if you don't see it.",
    "forgot.noEmailTitle": "Email reset isn't available yet",
    "forgot.noEmailBody":
      "Email isn't set up on our side yet, so we can't send reset links. Contact our team and we'll reset your password for you.",
    "forgot.remembered": "Remembered it?",

    "reset.title": "Choose a new password",
    "reset.sub": "Pick a password you don't use anywhere else. You'll be logged in straight after.",
    "reset.submit": "Save new password",
    "reset.signOutNote": "This logs you out on every other device.",
    "reset.missingTitle": "Reset link missing",
    "reset.missingBody": "Open the link from your password reset email, or request a new one.",
    "reset.invalidTitle": "This link has expired",
    "reset.invalidBody": "Reset links work once and expire after 1 hour. Request a new one to continue.",
    "reset.requestNew": "Request a new link",

    "errors.email": "Enter a valid email",
    "errors.passwordMin": "Use at least 8 characters",
    "errors.mismatch": "Passwords don't match",
    "errors.invalidToken": "This reset link is invalid or has expired.",

    // /reset-password?claim=1: the link our team sends a seller whose listing they prepared from the seller's documents.
    "meta.claim.title": "Confirm your listing",
    "claim.title": "Confirm your listing",
    "claim.sub":
      "Our team prepared this listing from the details and documents we received. Check the details, confirm you can sell the unit and choose a password for your account.",
    "claim.subExisting": "Our team added this listing to your account. Check the details and confirm you can sell the unit.",
    "claim.summary": "Your listing",
    "claim.summary.ref": "Reference",
    "claim.summary.project": "Project",
    "claim.summary.unit": "Unit",
    "claim.summary.asking": "Your asking price",
    "claim.summaryNote": "Something wrong? Message our team before you confirm and we'll correct it.",
    "claim.name": "Account name",
    "claim.email": "Your email",
    "claim.emailHint": "You'll log in with this email, and we'll send updates about your listing to it.",
    "claim.submit": "Confirm and create my account",
    "claim.submitExisting": "Confirm my listing",
    "claim.after":
      "Next, our team checks your documents and sends you RERA Form A (our listing agreement) to sign. The listing is published once the DLD advertising permit is issued. Your contact details are never shown to buyers.",
    // A new account (no password yet) also accepts the Privacy Policy, as at sign-up; otherwise the sell form's line.
    "claim.confirmNew":
      "I own this unit or am authorised to sell it, the documents are genuine, and I agree to the {terms} and {privacy}",
    "claim.privacy": "Privacy Policy",
    "claim.errors.confirmNew": "Please confirm you can sell this unit and accept the Terms of Use and Privacy Policy",
    "claim.loginTitle": "Log in to confirm your listing",
    "claim.loginBody": "Our team added this listing to your existing account ({email}). Log in with your password, and this page opens again for you to confirm it.",
    "claim.loginCta": "Log in to confirm",
    "claim.otherAccount": "You're logged in to a different account. Log out, then open the link again and log in as {email}.",
    "claim.logout": "Log out",
    "claim.invalidTitle": "This link has expired",
    "claim.invalidBody":
      "Confirmation links work once and expire after 7 days. Already confirmed? Log in to see your listing. Otherwise, message our team on WhatsApp and we'll send you a new link.",
    "claim.contact": "Message us on WhatsApp",
    "claim.errors.emailTaken":
      "Another account already uses this email. Use a different one, or log in to that account and message us to move this listing to it.",
    "claim.errors.emailReserved": "This email can't be used for a seller account. Use a different one.",
    "claim.errors.signIn": "Log in to the account this listing belongs to, then open the link again.",

    backToLogin: "Back to log in",
  },
  ar: {
    "meta.forgot.title": "نسيت كلمة المرور",
    "meta.forgot.description": "احصل على رابط لاختيار كلمة مرور جديدة لحسابك.",
    "meta.reset.title": "اختر كلمة مرور جديدة",

    "field.email": "البريد الإلكتروني",
    "field.password": "كلمة المرور الجديدة",
    "field.confirm": "تأكيد كلمة المرور الجديدة",
    "field.passwordHint": "8 أحرف على الأقل",

    "forgot.title": "نسيت كلمة المرور؟",
    "forgot.sub": "أدخل البريد الإلكتروني الذي سجّلت به، وسنرسل إليك رابطاً لاختيار كلمة مرور جديدة.",
    "forgot.submit": "إرسال رابط إعادة التعيين",
    "forgot.resend": "إرسال مرة أخرى",
    "forgot.sentTitle": "تحقّق من بريدك الإلكتروني",
    "forgot.sentBody":
      "إذا كان هناك حساب مسجّل بالبريد {email}، فقد أرسلنا إليه رابطاً لإعادة تعيين كلمة المرور. الرابط صالح لمدة ساعة واحدة، وإن لم تجده فتحقّق من مجلد الرسائل غير المرغوب فيها.",
    "forgot.noEmailTitle": "إعادة التعيين عبر البريد الإلكتروني غير متاحة حالياً",
    "forgot.noEmailBody":
      "لم نُفعّل خدمة البريد الإلكتروني بعد، لذا لا يمكننا إرسال روابط إعادة التعيين. تواصل مع فريقنا وسنعيد تعيين كلمة المرور لك.",
    "forgot.remembered": "تذكّرت كلمة المرور؟",

    "reset.title": "اختر كلمة مرور جديدة",
    "reset.sub": "اختر كلمة مرور لا تستخدمها في أي مكان آخر. سيتم تسجيل دخولك مباشرةً بعد الحفظ.",
    "reset.submit": "حفظ كلمة المرور الجديدة",
    "reset.signOutNote": "سيؤدي ذلك إلى تسجيل خروجك من جميع الأجهزة الأخرى.",
    "reset.missingTitle": "رابط إعادة التعيين غير موجود",
    "reset.missingBody": "افتح الرابط الوارد في رسالة إعادة تعيين كلمة المرور، أو اطلب رابطاً جديداً.",
    "reset.invalidTitle": "انتهت صلاحية هذا الرابط",
    "reset.invalidBody": "يُستخدم رابط إعادة التعيين مرة واحدة فقط وتنتهي صلاحيته بعد ساعة. اطلب رابطاً جديداً للمتابعة.",
    "reset.requestNew": "طلب رابط جديد",

    "errors.email": "أدخل بريداً إلكترونياً صحيحاً",
    "errors.passwordMin": "استخدم 8 أحرف على الأقل",
    "errors.mismatch": "كلمتا المرور غير متطابقتين",
    "errors.invalidToken": "رابط إعادة التعيين غير صالح أو انتهت صلاحيته.",

    "meta.claim.title": "تأكيد إعلانك",
    "claim.title": "تأكيد إعلانك",
    "claim.sub":
      "أعدّ فريقنا هذا الإعلان من البيانات والمستندات التي وصلتنا. راجِع البيانات، وأكّد أحقيتك في بيع الوحدة، واختر كلمة مرور لحسابك.",
    "claim.subExisting": "أضاف فريقنا هذا الإعلان إلى حسابك. راجِع البيانات وأكّد أحقيتك في بيع الوحدة.",
    "claim.summary": "إعلانك",
    "claim.summary.ref": "الرقم المرجعي",
    "claim.summary.project": "المشروع",
    "claim.summary.unit": "الوحدة",
    "claim.summary.asking": "السعر الذي تطلبه",
    "claim.summaryNote": "هل هناك خطأ ما؟ راسل فريقنا قبل التأكيد وسنصحّحه.",
    "claim.name": "اسم الحساب",
    "claim.email": "بريدك الإلكتروني",
    "claim.emailHint": "ستسجّل الدخول بهذا البريد الإلكتروني، وإليه نرسل المستجدات المتعلقة بإعلانك.",
    "claim.submit": "التأكيد وإنشاء حسابي",
    "claim.submitExisting": "تأكيد إعلاني",
    "claim.after":
      "بعد ذلك يتحقق فريقنا من مستنداتك ويرسل إليك النموذج (A) الصادر عن مؤسسة التنظيم العقاري (اتفاقية الوساطة) لتوقيعه، ثم يُنشر الإعلان فور صدور تصريح الإعلان من دائرة الأراضي والأملاك. ولا تظهر بيانات التواصل الخاصة بك للمشترين أبداً.",
    "claim.confirmNew": "أُقرّ بأنني مالك هذه الوحدة أو مخوَّل ببيعها، وبأن المستندات أصلية، وأوافق على {terms} و{privacy}",
    "claim.privacy": "سياسة الخصوصية",
    "claim.errors.confirmNew": "يرجى تأكيد أحقيتك في بيع هذه الوحدة والموافقة على شروط الاستخدام وسياسة الخصوصية",
    "claim.loginTitle": "سجّل الدخول لتأكيد إعلانك",
    "claim.loginBody": "أضاف فريقنا هذا الإعلان إلى حسابك الحالي (⁦{email}⁩). سجّل الدخول بكلمة المرور، وستُفتح هذه الصفحة مجدداً لتأكيده.",
    "claim.loginCta": "تسجيل الدخول للتأكيد",
    "claim.otherAccount": "أنت مسجّل الدخول بحساب آخر. سجّل الخروج، ثم افتح الرابط مجدداً وسجّل الدخول بالحساب ⁦{email}⁩.",
    "claim.logout": "تسجيل الخروج",
    "claim.invalidTitle": "انتهت صلاحية هذا الرابط",
    "claim.invalidBody":
      "تُستخدم روابط التأكيد مرة واحدة وتنتهي صلاحيتها بعد 7 أيام. هل أكّدت إعلانك من قبل؟ سجّل الدخول لمشاهدته. وإلا فراسل فريقنا عبر واتساب وسنرسل إليك رابطاً جديداً.",
    "claim.contact": "راسلنا عبر واتساب",
    "claim.errors.emailTaken":
      "يوجد حساب آخر يستخدم هذا البريد الإلكتروني. استخدم بريداً آخر، أو سجّل الدخول إلى ذلك الحساب وراسلنا لنقل هذا الإعلان إليه.",
    "claim.errors.emailReserved": "لا يمكن استخدام هذا البريد الإلكتروني لحساب بائع. استخدم بريداً آخر.",
    "claim.errors.signIn": "سجّل الدخول إلى الحساب الذي يتبعه هذا الإعلان، ثم افتح الرابط مجدداً.",

    backToLogin: "العودة إلى تسجيل الدخول",
  },
  zh: {
    "meta.forgot.title": "忘记密码",
    "meta.forgot.description": "获取链接，为您的账户设置新密码。",
    "meta.reset.title": "设置新密码",

    "field.email": "电子邮箱",
    "field.password": "新密码",
    "field.confirm": "确认新密码",
    "field.passwordHint": "至少 8 个字符",

    "forgot.title": "忘记密码？",
    "forgot.sub": "输入您注册时使用的电子邮箱，我们将向您发送设置新密码的链接。",
    "forgot.submit": "发送重置链接",
    "forgot.resend": "重新发送",
    "forgot.sentTitle": "请查收邮件",
    "forgot.sentBody":
      "如果 {email} 对应的账户存在，我们已向该邮箱发送重置密码的链接。链接有效期为 1 小时，如未收到，请检查垃圾邮件文件夹。",
    "forgot.noEmailTitle": "邮件重置功能暂未开通",
    "forgot.noEmailBody":
      "我们的邮件服务尚未配置，暂时无法发送重置链接。请联系我们的团队，我们将为您重置密码。",
    "forgot.remembered": "想起密码了？",

    "reset.title": "设置新密码",
    "reset.sub": "请设置一个未在其他地方使用的密码。保存后将直接为您登录。",
    "reset.submit": "保存新密码",
    "reset.signOutNote": "此操作会使您在其他所有设备上退出登录。",
    "reset.missingTitle": "缺少重置链接",
    "reset.missingBody": "请打开密码重置邮件中的链接，或申请新的链接。",
    "reset.invalidTitle": "此链接已失效",
    "reset.invalidBody": "重置链接仅可使用一次，且 1 小时后失效。请申请新的链接以继续。",
    "reset.requestNew": "申请新链接",

    "errors.email": "请输入有效的电子邮箱",
    "errors.passwordMin": "请使用至少 8 个字符",
    "errors.mismatch": "两次输入的密码不一致",
    "errors.invalidToken": "此重置链接无效或已失效。",

    "meta.claim.title": "确认您的房源",
    "claim.title": "确认您的房源",
    "claim.sub":
      "我们的团队已根据收到的信息和文件准备好这条房源。请核对信息，确认您有权出售该单元，并为您的账户设置密码。",
    "claim.subExisting": "我们的团队已将这条房源添加到您的账户。请核对信息并确认您有权出售该单元。",
    "claim.summary": "您的房源",
    "claim.summary.ref": "参考编号",
    "claim.summary.project": "项目",
    "claim.summary.unit": "单元",
    "claim.summary.asking": "您的要价",
    "claim.summaryNote": "信息有误？请在确认前联系我们的团队，我们会为您更正。",
    "claim.name": "账户姓名",
    "claim.email": "您的电子邮箱",
    "claim.emailHint": "您将使用此邮箱登录，我们也会把房源的最新进展发送到此邮箱。",
    "claim.submit": "确认并创建我的账户",
    "claim.submitExisting": "确认我的房源",
    "claim.after":
      "接下来，我们的团队将核查您的文件，并向您发送迪拜房地产监管局（RERA）的 A 表（委托销售协议）供您签署。迪拜土地局广告许可签发后，房源即会发布。您的联系方式绝不会向买家显示。",
    "claim.confirmNew":
      "本人为该单元的业主或已获授权出售该单元，所提供的文件真实有效，并同意《{terms}》和《{privacy}》",
    "claim.privacy": "隐私政策",
    "claim.errors.confirmNew": "请确认您有权出售该单元，并接受《使用条款》和《隐私政策》",
    "claim.loginTitle": "登录以确认您的房源",
    "claim.loginBody": "我们的团队已将这条房源添加到您现有的账户（{email}）。请使用您的密码登录，登录后此页面会再次打开供您确认。",
    "claim.loginCta": "登录以确认",
    "claim.otherAccount": "您当前登录的是另一个账户。请先退出登录，然后重新打开链接并以 {email} 登录。",
    "claim.logout": "退出",
    "claim.invalidTitle": "此链接已失效",
    "claim.invalidBody":
      "确认链接仅可使用一次，且 7 天后失效。已经确认过了？登录即可查看您的房源。否则，请通过 WhatsApp 联系我们的团队，我们会向您发送新的链接。",
    "claim.contact": "通过 WhatsApp 联系我们",
    "claim.errors.emailTaken":
      "此邮箱已被另一个账户使用。请改用其他邮箱，或登录该账户并联系我们，将这条房源转移到该账户。",
    "claim.errors.emailReserved": "此邮箱不能用于卖家账户。请改用其他邮箱。",
    "claim.errors.signIn": "请登录这条房源所属的账户，然后重新打开链接。",

    backToLogin: "返回登录",
  },
});

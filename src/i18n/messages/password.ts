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
      "Our team prepared this listing from the documents you sent us. Check the details, confirm you can sell the unit and choose a password for your account.",
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
      "Next, our team checks your documents and publishes the listing once the DLD advertising permit is issued. Your contact details are never shown to buyers.",
    "claim.loginTitle": "Log in to confirm your listing",
    "claim.loginBody": "Our team added this listing to your existing account ({email}). Log in with your password, and this page opens again for you to confirm it.",
    "claim.loginCta": "Log in to confirm",
    "claim.otherAccount": "You're logged in to a different account. Log out, then open the link again and log in as {email}.",
    "claim.logout": "Log out",
    "claim.invalidTitle": "This link has expired",
    "claim.invalidBody": "Confirmation links work once and expire after 7 days. Message our team on WhatsApp and we'll send you a new one.",
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
      "أعدّ فريقنا هذا الإعلان من المستندات التي أرسلتها إلينا. راجِع البيانات، وأكّد أحقيتك في بيع الوحدة، واختر كلمة مرور لحسابك.",
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
      "بعد ذلك يتحقق فريقنا من مستنداتك وينشر الإعلان فور صدور تصريح الإعلان من دائرة الأراضي والأملاك. ولا تظهر بيانات التواصل الخاصة بك للمشترين أبداً.",
    "claim.loginTitle": "سجّل الدخول لتأكيد إعلانك",
    "claim.loginBody": "أضاف فريقنا هذا الإعلان إلى حسابك الحالي (⁦{email}⁩). سجّل الدخول بكلمة المرور، وستُفتح هذه الصفحة مجدداً لتأكيده.",
    "claim.loginCta": "تسجيل الدخول للتأكيد",
    "claim.otherAccount": "أنت مسجّل الدخول بحساب آخر. سجّل الخروج، ثم افتح الرابط مجدداً وسجّل الدخول بالحساب ⁦{email}⁩.",
    "claim.logout": "تسجيل الخروج",
    "claim.invalidTitle": "انتهت صلاحية هذا الرابط",
    "claim.invalidBody": "تُستخدم روابط التأكيد مرة واحدة وتنتهي صلاحيتها بعد 7 أيام. راسل فريقنا عبر واتساب وسنرسل إليك رابطاً جديداً.",
    "claim.contact": "راسلنا عبر واتساب",
    "claim.errors.emailTaken":
      "يوجد حساب آخر يستخدم هذا البريد الإلكتروني. استخدم بريداً آخر، أو سجّل الدخول إلى ذلك الحساب وراسلنا لنقل هذا الإعلان إليه.",
    "claim.errors.emailReserved": "لا يمكن استخدام هذا البريد الإلكتروني لحساب بائع. استخدم بريداً آخر.",
    "claim.errors.signIn": "سجّل الدخول إلى الحساب الذي يتبعه هذا الإعلان، ثم افتح الرابط مجدداً.",

    backToLogin: "العودة إلى تسجيل الدخول",
  },
});

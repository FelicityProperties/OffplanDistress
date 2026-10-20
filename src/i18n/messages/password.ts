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

    backToLogin: "العودة إلى تسجيل الدخول",
  },
});

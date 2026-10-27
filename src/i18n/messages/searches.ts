import { defineMessages } from "../define";

// Saved searches (/dashboard/searches), their alert switch, and the daily "new matches" alert.
// Counts are written as "label: {count}" in Arabic to sidestep plural agreement.
export default defineMessages({
  en: {
    "meta.title": "Saved searches",
    title: "Saved searches",
    sub: "Re-run your favourite filters in one click and see what's new since you saved them. With alerts on, we'll tell you about new matches every morning.",
    newSearch: "New search",

    "empty.title": "No saved searches yet",
    "empty.sub":
      "Set your filters on the Browse deals page and tap “Save search” to keep them here. We'll alert you when new deals match.",

    // What "Open" shows on /deals: units on the market, including those under offer (the alerts only send new live ones).
    "matches.one": "{count} match on the market",
    "matches.other": "{count} matches on the market",
    savedOn: "saved {date}",
    fresh: "{count} new",

    "alerts.label": "Email & in-app alerts",
    "alerts.on": "Alerts on. We'll send you new matches every morning.",
    "alerts.off": "Alerts off for this search.",

    "delete.label": "Delete saved search",
    "delete.done": "Search deleted",

    "error.signIn": "Please log in again to continue.",
    "error.notFound": "This saved search no longer exists.",
    "error.generic": "Something went wrong. Please try again.",

    // Last line of the alert list when there are more matches than we list.
    "alert.more": "+{count} more",
  },
  ar: {
    "meta.title": "عمليات البحث المحفوظة",
    title: "عمليات البحث المحفوظة",
    sub: "أعِد استخدام معايير البحث المفضلة لديك بنقرة واحدة، واطّلع على الجديد منذ حفظها. عند تفعيل التنبيهات، نرسل إليك الصفقات المطابقة الجديدة كل صباح.",
    newSearch: "بحث جديد",

    "empty.title": "لا توجد عمليات بحث محفوظة بعد",
    "empty.sub":
      "حدّد معايير البحث في صفحة تصفّح الصفقات واضغط «حفظ البحث» لتجدها هنا، وسننبّهك عند ظهور صفقات جديدة مطابقة.",

    "matches.one": "الصفقات المطابقة المعروضة: {count}",
    "matches.other": "الصفقات المطابقة المعروضة: {count}",
    savedOn: "تاريخ الحفظ: {date}",
    fresh: "جديدة: {count}",

    "alerts.label": "تنبيهات عبر البريد الإلكتروني وداخل المنصة",
    "alerts.on": "تم تفعيل التنبيهات. سنرسل إليك الصفقات المطابقة الجديدة كل صباح.",
    "alerts.off": "تم إيقاف التنبيهات لهذا البحث.",

    "delete.label": "حذف البحث المحفوظ",
    "delete.done": "تم حذف البحث",

    "error.signIn": "يرجى تسجيل الدخول مرة أخرى للمتابعة.",
    "error.notFound": "لم يعد هذا البحث المحفوظ موجوداً.",
    "error.generic": "حدث خطأ ما. يرجى المحاولة مرة أخرى.",

    "alert.more": "+{count} أخرى",
  },
});

import { defineMessages } from "../define";

// In-app notifications (header bell + /dashboard/notifications) and the account-area sidebar.
// Counts are written as "label: {count}" in Arabic to sidestep plural agreement.
export default defineMessages({
  en: {
    title: "Notifications",
    "bell.label": "Notifications",
    "bell.labelUnread": "Notifications ({count} unread)",
    unreadCount: "{count} unread",
    unread: "Unread",
    markAllRead: "Mark all as read",
    markRead: "Mark as read",
    seeAll: "See all notifications",
    allMarked: "All notifications marked as read",
    "menu.hasUnread": "{count} unread notifications",

    "empty.title": "You're all caught up",
    "empty.sub": "We'll let you know here when there's news on your offers, listings or saved searches.",

    "page.title": "Notifications",
    "page.sub": "Updates on your offers, listings and saved searches.",
    "page.subUnread": "Updates on your offers, listings and saved searches. {count} unread.",
    "page.emptyTitle": "No notifications yet",
    "page.emptySub":
      "Offer updates, listing reviews and new deals matching your saved searches will appear here.",
    "page.limitNote": "Showing your latest {count} notifications.",

    "error.signIn": "Please log in again to continue.",
    "error.generic": "We couldn't update your notifications. Please try again.",

    "shell.greeting": "Hi, {name}",
    "shell.overview": "Overview",
    "shell.listings": "My listings",
    "shell.offers": "Offers",
    "shell.watchlist": "Watchlist",
    "shell.searches": "Saved searches",
    "shell.notifications": "Notifications",
    "shell.profile": "Profile & KYC",
  },
  ar: {
    title: "الإشعارات",
    "bell.label": "الإشعارات",
    "bell.labelUnread": "الإشعارات (غير المقروءة: {count})",
    unreadCount: "غير المقروءة: {count}",
    unread: "غير مقروء",
    markAllRead: "تحديد الكل كمقروء",
    markRead: "تحديد كمقروء",
    seeAll: "عرض كل الإشعارات",
    allMarked: "تم تحديد كل الإشعارات كمقروءة",
    "menu.hasUnread": "إشعارات غير مقروءة: {count}",

    "empty.title": "لا توجد إشعارات جديدة",
    "empty.sub": "سنُعلمك هنا بأي مستجدات على عروضك أو إعلاناتك أو عمليات البحث المحفوظة.",

    "page.title": "الإشعارات",
    "page.sub": "آخر المستجدات على عروضك وإعلاناتك وعمليات البحث المحفوظة.",
    "page.subUnread": "آخر المستجدات على عروضك وإعلاناتك وعمليات البحث المحفوظة. غير المقروءة: {count}.",
    "page.emptyTitle": "لا توجد إشعارات بعد",
    "page.emptySub":
      "ستظهر هنا تحديثات العروض ونتائج مراجعة الإعلانات والصفقات الجديدة المطابقة لعمليات البحث المحفوظة.",
    "page.limitNote": "يُعرض آخر {count} إشعار.",

    "error.signIn": "يرجى تسجيل الدخول مجدداً للمتابعة.",
    "error.generic": "تعذّر تحديث الإشعارات. يرجى المحاولة مرة أخرى.",

    "shell.greeting": "مرحباً، {name}",
    "shell.overview": "نظرة عامة",
    "shell.listings": "إعلاناتي",
    "shell.offers": "العروض",
    "shell.watchlist": "قائمة المتابعة",
    "shell.searches": "عمليات البحث المحفوظة",
    "shell.notifications": "الإشعارات",
    "shell.profile": "الملف الشخصي والتحقق من الهوية",
  },
});

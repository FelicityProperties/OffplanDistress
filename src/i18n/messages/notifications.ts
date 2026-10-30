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
  zh: {
    title: "通知",
    "bell.label": "通知",
    "bell.labelUnread": "通知（{count} 条未读）",
    unreadCount: "{count} 条未读",
    unread: "未读",
    markAllRead: "全部标为已读",
    markRead: "标为已读",
    seeAll: "查看全部通知",
    allMarked: "所有通知已标为已读",
    "menu.hasUnread": "{count} 条未读通知",

    "empty.title": "暂无新通知",
    "empty.sub": "您的报价、房源或已保存的搜索有新动态时，我们会在此通知您。",

    "page.title": "通知",
    "page.sub": "您的报价、房源及已保存的搜索有新动态时，都会显示在这里。",
    "page.subUnread": "您的报价、房源及已保存的搜索有新动态时，都会显示在这里。{count} 条未读。",
    "page.emptyTitle": "暂无通知",
    "page.emptySub":
      "报价动态、房源审核结果以及与您已保存的搜索匹配的新房源将显示在这里。",
    "page.limitNote": "显示您最近的 {count} 条通知。",

    "error.signIn": "请重新登录以继续。",
    "error.generic": "无法更新您的通知。请重试。",

    "shell.greeting": "您好，{name}",
    "shell.overview": "概览",
    "shell.listings": "我的房源",
    "shell.offers": "报价",
    "shell.watchlist": "关注列表",
    "shell.searches": "已保存的搜索",
    "shell.notifications": "通知",
    "shell.profile": "个人资料与 KYC",
  },
});

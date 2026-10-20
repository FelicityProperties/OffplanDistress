import { defineMessages } from "../define";

// Marketplace browse page (/deals), its filters and toolbar, plus the deal card and gallery.
// Unit types, motivation, communities and watchlist words come from "common".
export default defineMessages({
  en: {
    "meta.title": "Browse distressed off-plan deals in Dubai",
    "meta.description":
      "Filter verified off-plan resale units by community, developer, upfront cash, % paid, handover and discount to launch price.",

    title: "Browse deals",
    subtitle: "Verified off-plan units, priced below today's developer launch.",

    "search.placeholder": "Search project, developer or community",
    "search.label": "Search deals",

    "sort.label": "Sort",
    "sort.discount": "Biggest discount",
    "sort.cash": "Lowest upfront cash",
    "sort.handover": "Handover soonest",
    "sort.newest": "Newest",

    "view.grid": "Grid view",
    "view.list": "List view",

    "filters.title": "Filters",
    "filters.budget": "Upfront cash to seller",
    "filters.budgetLabel": "Upfront cash budget",
    "filters.any": "Any",
    "filters.community": "Community",
    "filters.developer": "Developer",
    "filters.unitType": "Unit type",
    "filters.minPaid": "Min. % paid to developer",
    "filters.minDiscount": "Min. discount vs launch",
    "filters.atLeastPct": "{v}%+",
    "filters.handoverBy": "Handover by",
    "filters.anyTime": "Any time",
    "filters.endOfYear": "End of {year}",
    "filters.motivation": "Seller motivation",
    "filters.verifiedOnly": "Verified listings only",
    "filters.reset": "Reset filters",

    "results.one": "{count} deal found",
    "results.many": "{count} deals found",
    empty:
      "No deals match those filters. Try widening your budget, or save this search and we'll show you new matches on your dashboard.",

    "pagination.label": "Pagination",
    "pagination.previous": "Previous",
    "pagination.next": "Next",
    "pagination.page": "Page {page} of {pages}",

    "saveSearch.button": "Save search",
    "saveSearch.needsAuth": "Sign in to save searches and get alerts.",
    "saveSearch.saved": "Search saved to your dashboard",

    "summary.all": "All deals",
    "summary.maxCash": "≤ {amount} upfront",
    "summary.minDiscount": "{pct}%+ discount",
    "summary.handoverBy": "handover by {year}",
    "summary.query": "“{q}”",

    "gallery.showPhoto": "Show photo {n}",
  },
  ar: {
    "meta.title": "تصفّح فرص الوحدات على الخارطة المتعثرة في دبي",
    "meta.description":
      "تصفّح وحدات إعادة البيع الموثّقة على الخارطة وحدّد النتائج حسب المنطقة والمطوّر والمبلغ المقدّم ونسبة المدفوع وموعد التسليم والخصم مقارنةً بسعر الإطلاق.",

    title: "تصفّح الصفقات",
    subtitle: "وحدات على الخارطة موثّقة، بأسعار أقل من سعر الإطلاق الحالي لدى المطوّر.",

    "search.placeholder": "ابحث باسم المشروع أو المطوّر أو المنطقة",
    "search.label": "البحث في الصفقات",

    "sort.label": "الترتيب",
    "sort.discount": "الأعلى خصماً",
    "sort.cash": "الأقل مبلغاً مقدّماً",
    "sort.handover": "الأقرب تسليماً",
    "sort.newest": "الأحدث",

    "view.grid": "عرض شبكي",
    "view.list": "عرض قائمة",

    "filters.title": "الفلاتر",
    "filters.budget": "المبلغ المقدّم للبائع",
    "filters.budgetLabel": "ميزانية المبلغ المقدّم",
    "filters.any": "أي مبلغ",
    "filters.community": "المنطقة",
    "filters.developer": "المطوّر",
    "filters.unitType": "نوع الوحدة",
    "filters.minPaid": "الحد الأدنى للنسبة المدفوعة للمطوّر",
    "filters.minDiscount": "الحد الأدنى للخصم عن سعر الإطلاق",
    "filters.atLeastPct": "{v}% فأكثر",
    "filters.handoverBy": "التسليم بحلول",
    "filters.anyTime": "أي وقت",
    "filters.endOfYear": "نهاية {year}",
    "filters.motivation": "مدى استعجال البائع",
    "filters.verifiedOnly": "الإعلانات الموثّقة فقط",
    "filters.reset": "إعادة ضبط الفلاتر",

    "results.one": "عدد الصفقات: {count}",
    "results.many": "عدد الصفقات: {count}",
    empty:
      "لا توجد صفقات تطابق هذه الفلاتر. جرّب توسيع ميزانيتك، أو احفظ هذا البحث وسنعرض لك الصفقات المطابقة الجديدة في لوحة التحكم.",

    "pagination.label": "التنقل بين الصفحات",
    "pagination.previous": "السابق",
    "pagination.next": "التالي",
    "pagination.page": "الصفحة {page} من {pages}",

    "saveSearch.button": "حفظ البحث",
    "saveSearch.needsAuth": "سجّل الدخول لحفظ عمليات البحث وتلقي التنبيهات.",
    "saveSearch.saved": "تم حفظ البحث في لوحة التحكم",

    "summary.all": "جميع الصفقات",
    "summary.maxCash": "≤ {amount} مقدّماً",
    "summary.minDiscount": "خصم {pct}% فأكثر",
    "summary.handoverBy": "التسليم بحلول {year}",
    "summary.query": "«{q}»",

    "gallery.showPhoto": "عرض الصورة {n}",
  },
});

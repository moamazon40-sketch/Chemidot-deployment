import { createContext, useContext, useEffect, useState } from "react";
import { getStoredLang, setStoredLang } from "@/lib/storage";

export type Lang = "en" | "ar";

const translations = {
  en: {
    // Nav
    marketplace: "Marketplace",
    suppliers: "Suppliers",
    collectiveOrders: "Collective Orders",
    login: "Log in",
    signUp: "Sign Up",
    dashboard: "Dashboard",
    logout: "Log out",
    searchPlaceholder: "Search chemicals, CAS numbers, suppliers...",
    notifications: "Notifications",
    markAllRead: "Mark all read",
    noNotifications: "No new notifications",

    // Landing
    heroTag: "The Middle East's Premier Chemical Marketplace",
    heroTitle1: "Source Chemicals",
    heroTitle2: "Smarter",
    heroSubtitle: "The enterprise-grade digital command center for industrial sourcing. Connect directly with verified manufacturers and unlock collective buying power.",
    exploreMarketplace: "Explore Marketplace",
    howItWorks: "How It Works",
    whyChemidot: "Why Chemidot?",
    stats_buyers: "Active Buyers",
    stats_products: "Products Listed",
    stats_suppliers: "Verified Suppliers",
    stats_countries: "Countries",

    // Dashboard sidebar
    overview: "Overview",
    rfqsQuotes: "RFQs & Quotes",
    orders: "Orders",
    collectiveOrdersSidebar: "Collective Orders",
    myProducts: "My Products",
    messages: "Messages",
    profileSettings: "Profile Settings",
    adminPanel: "Admin Panel",

    // Auth
    createAccount: "Create an account",
    joinPlatform: "Join the premier B2B chemical marketplace",
    signUpTitle: "Sign up",
    signUpDesc: "Enter your details below to create your account.",
    iWantToUseAs: "I want to use Chemidot as a:",
    buyer: "Buyer",
    supplier: "Supplier",
    sourceChemicals: "Source chemicals",
    sellProducts: "Sell your products",
    firstName: "First name",
    lastName: "Last name",
    companyName: "Company Name",
    commercialReg: "Commercial Registration Number",
    workEmail: "Work Email",
    country: "Country",
    countryPlaceholder: "e.g. Saudi Arabia",
    phone: "Phone Number",
    password: "Password",
    createAccountBtn: "Create account",
    creatingAccount: "Creating account...",
    alreadyHaveAccount: "Already have an account?",
    signIn: "Sign in",
    signInTitle: "Welcome back",
    signInDesc: "Enter your credentials to access your account",
    signInBtn: "Sign in",
    signingIn: "Signing in...",
    noAccount: "Don't have an account?",

    // Industries step
    selectIndustries: "What industries are you in?",
    selectAllThatApply: "Select all that apply",
    backStep: "Back",
    continueStep: "Continue",
    selectAtLeast: "Please select at least one industry",
    industries: {
      academics: "Academics",
      adhesives: "Adhesives & Sealants",
      agriculture: "Agriculture & Feed",
      automotive: "Automotive & Transportation",
      building: "Building & Construction",
      chemical: "Chemical & Industrial Manufacturing",
      consumer: "Consumer Goods",
      distribution: "Distribution & Trading",
      electrical: "Electrical & Electronics",
      food: "Food & Nutrition",
      healthcare: "Healthcare & Pharma",
      homecare: "HI&I Care",
      leather: "Leather & Textiles",
      military: "Military & Defense",
      oil: "Oil, Gas & Mining",
      other: "Other/Non-Manufacturing",
    },

    // Marketplace
    marketplaceTitle: "Marketplace",
    filters: "Filters",
    search: "Search",
    searchKeywords: "Keywords, CAS...",
    allCategories: "All Categories",
    sortNewest: "Newest Arrivals",
    sortPriceLow: "Price: Low to High",
    sortPriceHigh: "Price: High to Low",
    collectiveEligible: "Collective Eligible",
    verifiedSuppliersOnly: "Verified Suppliers Only",
    viewDetails: "View Details",
    moq: "MOQ",
    estPrice: "Est. Price",
    showingProducts: (n: number) => `Showing ${n} products`,
    noProductsFound: "No products found",
    adjustFilters: "Try adjusting your filters or search terms.",

    // Suppliers
    verifiedSuppliers: "Verified Suppliers",
    suppliersSubtitle: "Connect with trusted chemical manufacturers and distributors across the Middle East.",
    allCountries: "All Countries",
    verifiedOnly: "Verified Only",
    viewProfile: "View Profile",
    responseRate: "response rate",
    response: "Response",
    suppliersFound: (n: number) => `${n} suppliers found`,
    noSuppliersFound: "No suppliers found",
    adjustSearch: "Try adjusting your search filters.",

    // Supplier profile
    backToSuppliers: "Back to Suppliers",
    verifiedManufacturer: "Verified Manufacturer",
    yearsLabel: "Years",
    avgResponse: "Avg Response:",
    companyInfo: "Company Info",
    certifications: "Certifications",
    noneListed: "None listed",
    products: "Products",
    messageSupplier: "Message Supplier",
    sendMessage: "Send Message",
    sending: "Sending…",
    cancel: "Cancel",
    messagePrompt: (name: string) => `Hi, I'm interested in doing business with ${name}. Could you share more about your product offerings and pricing?`,
    messageSent: "Message sent!",
    messageSentDesc: (name: string) => `Your message to ${name} has been sent.`,

    // Collective orders
    collectiveTitle: "We Save More Together",
    collectiveSubtitle: "Join forces with other buyers to unlock bulk pricing tiers. The more volume committed, the lower the price for everyone.",
    activeOpportunities: "Active Opportunities",
    activeOrders: (n: number) => `${n} active orders`,
    joinOrder: "Join This Order",
    noCollectiveOrders: "No active collective orders",
    checkBack: "Check back soon for new opportunities.",
    deadline: "Deadline",
    participants: "participants",
    filled: "filled",
    perUnit: "/unit",

    // Dashboard
    welcomeBack: "Welcome back",
    dashboardSubtitle: "Here's what's happening with your account.",
    totalOrders: "Total Orders",
    activeRfqs: "Active RFQs",
    totalSpent: "Total Spent",
    pendingQuotations: "Pending Quotations",
    recentOrders: "Recent Orders",
    recentRfqs: "Recent RFQs",
    noOrdersYet: "No orders yet",
    noRfqsYet: "No RFQs yet",

    // Common
    loading: "Loading...",
    error: "Error",
    save: "Save",
    saving: "Saving…",
    edit: "Edit",
    delete: "Delete",
    confirm: "Confirm",
    close: "Close",
    back: "Back",
    next: "Next",
    submit: "Submit",
    status: "Status",
    date: "Date",
    quantity: "Quantity",
    price: "Price",
    total: "Total",
    currency: "Currency",
    unit: "Unit",
    category: "Category",
    description: "Description",
    name: "Name",
    email: "Email",
    phone2: "Phone",
    country2: "Country",
    actions: "Actions",
    all: "All",
    active: "Active",
    pending: "Pending",
    completed: "Completed",
    cancelled: "Cancelled",
    saudiArabia: "Saudi Arabia",
  },

  ar: {
    // Nav
    marketplace: "السوق",
    suppliers: "الموردون",
    collectiveOrders: "الطلبات الجماعية",
    login: "تسجيل الدخول",
    signUp: "إنشاء حساب",
    dashboard: "لوحة التحكم",
    logout: "تسجيل الخروج",
    searchPlaceholder: "ابحث عن مواد كيميائية، أرقام CAS، موردين...",
    notifications: "الإشعارات",
    markAllRead: "تعيين الكل كمقروء",
    noNotifications: "لا توجد إشعارات جديدة",

    // Landing
    heroTag: "السوق الكيميائي الرائد في الشرق الأوسط",
    heroTitle1: "توريد المواد الكيميائية",
    heroTitle2: "بذكاء",
    heroSubtitle: "منصة المشتريات الصناعية المتكاملة. تواصل مباشرة مع الموردين المعتمدين واستفد من قوة الشراء الجماعي.",
    exploreMarketplace: "استكشف السوق",
    howItWorks: "كيف يعمل",
    whyChemidot: "لماذا كيميدوت؟",
    stats_buyers: "مشتري نشط",
    stats_products: "منتج مدرج",
    stats_suppliers: "مورد معتمد",
    stats_countries: "دولة",

    // Dashboard sidebar
    overview: "نظرة عامة",
    rfqsQuotes: "طلبات العروض",
    orders: "الطلبات",
    collectiveOrdersSidebar: "الطلبات الجماعية",
    myProducts: "منتجاتي",
    messages: "الرسائل",
    profileSettings: "إعدادات الملف الشخصي",
    adminPanel: "لوحة الإدارة",

    // Auth
    createAccount: "إنشاء حساب",
    joinPlatform: "انضم إلى السوق الرائد للمواد الكيميائية B2B",
    signUpTitle: "تسجيل",
    signUpDesc: "أدخل بياناتك أدناه لإنشاء حسابك.",
    iWantToUseAs: "أريد استخدام كيميدوت كـ:",
    buyer: "مشتري",
    supplier: "مورد",
    sourceChemicals: "مصدر المواد الكيميائية",
    sellProducts: "بيع منتجاتك",
    firstName: "الاسم الأول",
    lastName: "اسم العائلة",
    companyName: "اسم الشركة",
    commercialReg: "رقم السجل التجاري",
    workEmail: "البريد الإلكتروني للعمل",
    country: "الدولة",
    countryPlaceholder: "مثال: المملكة العربية السعودية",
    phone: "رقم الهاتف",
    password: "كلمة المرور",
    createAccountBtn: "إنشاء حساب",
    creatingAccount: "جارٍ إنشاء الحساب...",
    alreadyHaveAccount: "لديك حساب بالفعل؟",
    signIn: "تسجيل الدخول",
    signInTitle: "مرحباً بعودتك",
    signInDesc: "أدخل بيانات الدخول للوصول إلى حسابك",
    signInBtn: "تسجيل الدخول",
    signingIn: "جارٍ تسجيل الدخول...",
    noAccount: "ليس لديك حساب؟",

    // Industries step
    selectIndustries: "ما هي القطاعات التي تعمل فيها؟",
    selectAllThatApply: "اختر كل ما ينطبق",
    backStep: "رجوع",
    continueStep: "متابعة",
    selectAtLeast: "يرجى اختيار قطاع واحد على الأقل",
    industries: {
      academics: "الأوساط الأكاديمية",
      adhesives: "اللاصقات والمواد الكاتمة",
      agriculture: "الزراعة والأعلاف",
      automotive: "السيارات والنقل",
      building: "البناء والتشييد",
      chemical: "التصنيع الكيميائي والصناعي",
      consumer: "السلع الاستهلاكية",
      distribution: "التوزيع والتجارة",
      electrical: "الكهرباء والإلكترونيات",
      food: "الغذاء والتغذية",
      healthcare: "الرعاية الصحية والأدوية",
      homecare: "العناية المنزلية والصناعية",
      leather: "الجلود والمنسوجات",
      military: "الدفاع والجيش",
      oil: "النفط والغاز والتعدين",
      other: "أخرى / غير تصنيعية",
    },

    // Marketplace
    marketplaceTitle: "السوق",
    filters: "التصفية",
    search: "بحث",
    searchKeywords: "الكلمات المفتاحية، CAS...",
    allCategories: "جميع الفئات",
    sortNewest: "الأحدث أولاً",
    sortPriceLow: "السعر: الأقل أولاً",
    sortPriceHigh: "السعر: الأعلى أولاً",
    collectiveEligible: "مؤهل للشراء الجماعي",
    verifiedSuppliersOnly: "الموردون المعتمدون فقط",
    viewDetails: "عرض التفاصيل",
    moq: "الحد الأدنى للطلب",
    estPrice: "السعر التقديري",
    showingProducts: (n: number) => `عرض ${n} منتج`,
    noProductsFound: "لم يتم العثور على منتجات",
    adjustFilters: "حاول تعديل التصفية أو مصطلحات البحث.",

    // Suppliers
    verifiedSuppliers: "الموردون المعتمدون",
    suppliersSubtitle: "تواصل مع الموردين والمصنّعين الموثوقين في منطقة الشرق الأوسط.",
    allCountries: "جميع الدول",
    verifiedOnly: "المعتمدون فقط",
    viewProfile: "عرض الملف الشخصي",
    responseRate: "معدل الاستجابة",
    response: "الاستجابة",
    suppliersFound: (n: number) => `تم العثور على ${n} مورد`,
    noSuppliersFound: "لم يتم العثور على موردين",
    adjustSearch: "حاول تعديل معايير البحث.",

    // Supplier profile
    backToSuppliers: "العودة إلى الموردين",
    verifiedManufacturer: "مصنّع معتمد",
    yearsLabel: "سنة+",
    avgResponse: "متوسط الاستجابة:",
    companyInfo: "معلومات الشركة",
    certifications: "الشهادات",
    noneListed: "لا يوجد",
    products: "المنتجات",
    messageSupplier: "مراسلة المورد",
    sendMessage: "إرسال الرسالة",
    sending: "جارٍ الإرسال…",
    cancel: "إلغاء",
    messagePrompt: (name: string) => `مرحباً، أنا مهتم بالتعامل مع ${name}. هل يمكنك مشاركة معلومات حول منتجاتك وأسعارك؟`,
    messageSent: "تم إرسال الرسالة!",
    messageSentDesc: (name: string) => `تم إرسال رسالتك إلى ${name}.`,

    // Collective orders
    collectiveTitle: "نوفر المزيد معاً",
    collectiveSubtitle: "تكاتف مع المشترين الآخرين لفتح مستويات أسعار الجملة. كلما زاد الحجم، انخفض السعر للجميع.",
    activeOpportunities: "الفرص النشطة",
    activeOrders: (n: number) => `${n} طلبات نشطة`,
    joinOrder: "الانضمام إلى الطلب",
    noCollectiveOrders: "لا توجد طلبات جماعية نشطة",
    checkBack: "تحقق مرة أخرى قريباً للحصول على فرص جديدة.",
    deadline: "الموعد النهائي",
    participants: "مشاركون",
    filled: "مكتمل",
    perUnit: "/وحدة",

    // Dashboard
    welcomeBack: "مرحباً بعودتك",
    dashboardSubtitle: "إليك ما يحدث في حسابك.",
    totalOrders: "إجمالي الطلبات",
    activeRfqs: "طلبات العروض النشطة",
    totalSpent: "إجمالي الإنفاق",
    pendingQuotations: "عروض الأسعار المعلقة",
    recentOrders: "الطلبات الأخيرة",
    recentRfqs: "طلبات العروض الأخيرة",
    noOrdersYet: "لا توجد طلبات بعد",
    noRfqsYet: "لا توجد طلبات عروض بعد",

    // Common
    loading: "جارٍ التحميل...",
    error: "خطأ",
    save: "حفظ",
    saving: "جارٍ الحفظ…",
    edit: "تعديل",
    delete: "حذف",
    confirm: "تأكيد",
    close: "إغلاق",
    back: "رجوع",
    next: "التالي",
    submit: "إرسال",
    status: "الحالة",
    date: "التاريخ",
    quantity: "الكمية",
    price: "السعر",
    total: "الإجمالي",
    currency: "العملة",
    unit: "الوحدة",
    category: "الفئة",
    description: "الوصف",
    name: "الاسم",
    email: "البريد الإلكتروني",
    phone2: "الهاتف",
    country2: "الدولة",
    actions: "الإجراءات",
    all: "الكل",
    active: "نشط",
    pending: "قيد الانتظار",
    completed: "مكتمل",
    cancelled: "ملغى",
    saudiArabia: "المملكة العربية السعودية",
  },
} as const;

type Translations = typeof translations.en;

interface LanguageContextType {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: Translations;
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextType>({
  lang: "en",
  setLang: () => {},
  t: translations.en,
  isRTL: false,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    return (getStoredLang() as Lang) || "en";
  });

  const setLang = (l: Lang) => {
    setLangState(l);
    setStoredLang(l);
  };

  const isRTL = lang === "ar";

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = isRTL ? "rtl" : "ltr";
    if (isRTL) {
      document.documentElement.classList.add("font-tajawal");
    } else {
      document.documentElement.classList.remove("font-tajawal");
    }
  }, [lang, isRTL]);

  const t = translations[lang] as unknown as Translations;

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, isRTL }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}

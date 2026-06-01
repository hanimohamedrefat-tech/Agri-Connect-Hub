import { createContext, useContext, useState, useEffect } from "react";

type Lang = "ar" | "en";

const translations = {
  ar: {
    home: "الرئيسية",
    explore: "استكشف",
    meetings: "الاجتماعات",
    notifications: "الإشعارات",
    messages: "الرسائل",
    bookmarks: "المحفوظات",
    settings: "الإعدادات",
    newPost: "اكتب الآن",
    whatsOnMind: "ما الذي تريد مشاركته؟",
    post: "نشر",
    loading: "جاري التحميل...",
    loadingPosts: "جاري تحميل المنشورات...",
    noPosts: "لا توجد منشورات. ابدأ بمتابعة الآخرين أو انشر شيئاً!",
    trending: "مواضيع رائجة",
    suggestedUsers: "اقتراحات للمتابعة",
    trendingHashtags: "الهاشتاجات الرائجة",
    trendingPosts: "منشورات رائجة",
    follow: "متابعة",
    unfollow: "إلغاء المتابعة",
    editProfile: "تعديل الملف الشخصي",
    posts: "المنشورات",
    replies: "الردود",
    media: "الوسائط",
    comment: "تعليق",
    repost: "إعادة نشر",
    like: "إعجاب",
    save: "حفظ",
    share: "مشاركة",
    joinedIn: "انضم في",
    followers: "متابعون",
    following: "يتابع",
    appearance: "المظهر",
    language: "اللغة",
    theme: "الثيم",
    dark: "داكن",
    light: "فاتح",
    green: "أخضر",
    ocean: "عسلي",
    violet: "ليلي",
    logout: "تسجيل الخروج",
    signIn: "تسجيل الدخول",
    signUp: "إنشاء حساب",
    email: "البريد الإلكتروني",
    password: "كلمة المرور",
    displayName: "الاسم الكامل",
    username: "اسم المستخدم",
    saveChanges: "حفظ التغييرات",
    saving: "جاري الحفظ...",
    profilePhoto: "الصورة الشخصية",
    coverPhoto: "صورة الغلاف",
    bio: "نبذة عنك",
    specialty: "التخصص المهني",
    location: "الموقع الجغرافي",
    website: "الموقع الإلكتروني",
    profileSettings: "إعدادات الملف الشخصي",
    profileSettingsDesc: "قم بتحديث معلوماتك العامة التي تظهر للآخرين.",
    photos: "الصور",
    basicInfo: "المعلومات الأساسية",
    linkPhoto: "رابط الصورة",
    agri: "زراعة",
    postCount: "منشور",
    noPostsYet: "لا توجد منشورات",
    noPostsYetDesc: "لم يقم هذا المستخدم بنشر أي شيء بعد.",
    repliesHere: "الردود ستظهر هنا",
    mediaHere: "الوسائط ستظهر هنا",
    userNotFound: "المستخدم غير موجود",
    stats: "الإحصائيات",
  },
  en: {
    home: "Home",
    explore: "Explore",
    meetings: "Meetings",
    notifications: "Notifications",
    messages: "Messages",
    bookmarks: "Bookmarks",
    settings: "Settings",
    newPost: "Write Now",
    whatsOnMind: "What's on your mind?",
    post: "Post",
    loading: "Loading...",
    loadingPosts: "Loading posts...",
    noPosts: "No posts yet. Start following others or post something!",
    trending: "Trending Topics",
    suggestedUsers: "Suggested Users",
    trendingHashtags: "Trending Hashtags",
    trendingPosts: "Trending Posts",
    follow: "Follow",
    unfollow: "Unfollow",
    editProfile: "Edit Profile",
    posts: "Posts",
    replies: "Replies",
    media: "Media",
    comment: "Comment",
    repost: "Repost",
    like: "Like",
    save: "Save",
    share: "Share",
    joinedIn: "Joined",
    followers: "Followers",
    following: "Following",
    appearance: "Appearance",
    language: "Language",
    theme: "Theme",
    dark: "Dark",
    light: "Light",
    green: "Green",
    ocean: "Amber",
    violet: "Night",
    logout: "Logout",
    signIn: "Sign In",
    signUp: "Create Account",
    email: "Email",
    password: "Password",
    displayName: "Full Name",
    username: "Username",
    saveChanges: "Save Changes",
    saving: "Saving...",
    profilePhoto: "Profile Photo",
    coverPhoto: "Cover Photo",
    bio: "About You",
    specialty: "Professional Specialty",
    location: "Location",
    website: "Website",
    profileSettings: "Profile Settings",
    profileSettingsDesc: "Update your public information visible to others.",
    photos: "Photos",
    basicInfo: "Basic Information",
    linkPhoto: "Photo URL",
    agri: "Zira3a",
    postCount: "post",
    noPostsYet: "No Posts Yet",
    noPostsYetDesc: "This user hasn't posted anything yet.",
    repliesHere: "Replies will appear here",
    mediaHere: "Media will appear here",
    userNotFound: "User not found",
    stats: "Stats",
  },
};

type Translations = typeof translations.ar;

interface LangContextType {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: Translations;
  dir: "rtl" | "ltr";
}

const LangContext = createContext<LangContextType>({
  lang: "ar",
  setLang: () => {},
  t: translations.ar,
  dir: "rtl",
});

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    return (localStorage.getItem("zira3a-lang") as Lang) || "ar";
  });

  const setLang = (l: Lang) => {
    setLangState(l);
    localStorage.setItem("zira3a-lang", l);
    document.documentElement.dir = l === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = l;
  };

  useEffect(() => {
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = lang;
  }, [lang]);

  return (
    <LangContext.Provider value={{ lang, setLang, t: translations[lang], dir: lang === "ar" ? "rtl" : "ltr" }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  return useContext(LangContext);
}

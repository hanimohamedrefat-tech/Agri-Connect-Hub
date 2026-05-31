import { useGetMe } from "@workspace/api-client-react";
import { Link, useLocation } from "wouter";
import { 
  Home, 
  Compass, 
  Bookmark, 
  Bell, 
  MessageSquare, 
  Video, 
  Settings,
  LogOut
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { clearToken } from "@/lib/auth";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { data: user, isLoading } = useGetMe();
  const [, setLocation] = useLocation();

  const handleLogout = () => {
    clearToken();
    setLocation("/");
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!user) {
    // If not logged in, redirect handled in components or just render children for auth pages
    return <>{children}</>;
  }

  const navItems = [
    { icon: Home, label: "الرئيسية", href: "/feed" },
    { icon: Compass, label: "استكشف", href: "/explore" },
    { icon: Video, label: "الاجتماعات", href: "/meetings" },
    { icon: Bell, label: "الإشعارات", href: "/notifications" },
    { icon: MessageSquare, label: "الرسائل", href: "/messages" },
    { icon: Bookmark, label: "المحفوظات", href: "/bookmarks" },
    { icon: Settings, label: "الإعدادات", href: "/settings" },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row max-w-7xl mx-auto border-x border-border/40">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 lg:w-72 border-b md:border-b-0 md:border-l border-border/40 p-4 flex flex-col justify-between sticky top-0 md:h-screen overflow-y-auto">
        <div>
          <div className="mb-8 px-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-primary-foreground font-bold text-xl">
              ز
            </div>
            <h1 className="text-2xl font-bold text-primary tracking-tight">زراعة</h1>
          </div>
          
          <nav className="space-y-2">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} className="flex items-center gap-4 px-4 py-3 rounded-full hover:bg-muted transition-colors text-foreground font-medium text-lg">
                <item.icon className="w-6 h-6" />
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
          
          <div className="mt-8">
            <Button size="lg" className="w-full rounded-full text-lg font-bold">
              نشر جديد
            </Button>
          </div>
        </div>

        <div className="mt-auto pt-4 flex items-center justify-between">
          <Link href={`/profile/${user.username}`} className="flex items-center gap-3 hover:bg-muted p-2 rounded-full transition-colors flex-1">
            <Avatar>
              <AvatarImage src={user.avatar || ""} />
              <AvatarFallback>{user.displayName.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="font-bold text-sm leading-tight">{user.displayName}</span>
              <span className="text-muted-foreground text-xs">@{user.username}</span>
            </div>
          </Link>
          <Button variant="ghost" size="icon" onClick={handleLogout} className="rounded-full">
            <LogOut className="w-5 h-5 text-muted-foreground" />
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 border-l border-border/40">
        {children}
      </main>

      {/* Right Sidebar (Trending/Suggested) */}
      <aside className="hidden lg:block w-80 p-4 sticky top-0 h-screen overflow-y-auto">
        <div className="bg-muted/50 rounded-2xl p-4 mb-4">
          <h2 className="font-bold text-xl mb-4">مواضيع رائجة</h2>
          <div className="space-y-4">
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground">الزراعة العضوية</span>
              <span className="font-bold">#حصاد_القمح</span>
              <span className="text-xs text-muted-foreground">1,234 منشور</span>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}

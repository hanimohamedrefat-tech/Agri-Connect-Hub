import { useGetMe, getGetNotificationSummaryQueryKey } from "@workspace/api-client-react";
import { Link, useLocation } from "wouter";
import {
  Home,
  Compass,
  Bookmark,
  Bell,
  MessageSquare,
  Video,
  Settings,
  LogOut,
  Sun,
  Moon,
  Globe,
  Palette,
  Leaf,
  Waves,
  Sparkles,
  TrendingUp,
  UserPlus,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { clearToken } from "@/lib/auth";
import { useSocket } from "@/context/SocketContext";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation as useWouterLocation } from "wouter";
import { useLang } from "@/context/LangContext";
import { useTheme } from "@/context/ThemeContext";
import { useGetTrendingPosts, useGetSuggestedUsers, useFollowUser } from "@workspace/api-client-react";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { data: user, isLoading } = useGetMe();
  const [, setLocation] = useLocation();
  const [location] = useWouterLocation();
  const { unreadNotifications, clearUnread } = useSocket();
  const queryClient = useQueryClient();
  const { t, lang, setLang } = useLang();
  const { colorTheme, setColorTheme, darkMode, toggleDark } = useTheme();
  const { data: trending } = useGetTrendingPosts();
  const { data: suggested } = useGetSuggestedUsers();
  const followMutation = useFollowUser();
  const [followedUsernames, setFollowedUsernames] = useState<Set<string>>(new Set());

  const handleFollow = (username: string) => {
    followMutation.mutate({ username }, {
      onSuccess: () => setFollowedUsernames(prev => new Set([...prev, username])),
    });
  };

  const handleLogout = () => {
    clearToken();
    setLocation("/");
  };

  useEffect(() => {
    if (location === "/notifications") {
      clearUnread();
      queryClient.invalidateQueries({ queryKey: getGetNotificationSummaryQueryKey() });
    }
  }, [location]);

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/");
    }
  }, [isLoading, user]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 bg-primary/20 rounded-2xl flex items-center justify-center animate-pulse">
            <Leaf className="w-6 h-6 text-primary" />
          </div>
          <p className="text-muted-foreground text-sm">{t.loading}</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const navItems = [
    { icon: Home, label: t.home, href: "/feed" },
    { icon: Compass, label: t.explore, href: "/explore" },
    { icon: Video, label: t.meetings, href: "/meetings" },
    { icon: Bell, label: t.notifications, href: "/notifications", badge: unreadNotifications },
    { icon: MessageSquare, label: t.messages, href: "/messages" },
    { icon: Bookmark, label: t.bookmarks, href: "/bookmarks" },
    { icon: BarChart3, label: t.stats, href: "/stats" },
    { icon: Settings, label: t.settings, href: "/settings" },
  ];

  const themes = [
    { id: "green" as const, label: t.green, icon: Leaf, color: "bg-emerald-500" },
    { id: "ocean" as const, label: t.ocean, icon: Waves, color: "bg-sky-500" },
    { id: "violet" as const, label: t.violet, icon: Sparkles, color: "bg-violet-500" },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row max-w-7xl mx-auto border-x border-border/40">
      {/* Sidebar */}
      <aside className="w-full md:w-60 lg:w-72 border-b md:border-b-0 md:border-e border-border/40 flex flex-col sticky top-0 md:h-screen overflow-y-auto">
        {/* Logo */}
        <div className="p-4 pb-2">
          <div className="flex items-center gap-3 px-2 py-3">
            <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center text-primary-foreground shadow-sm">
              <Leaf className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-primary leading-none">{lang === "ar" ? "زراعة" : "Zira3a"}</h1>
              <p className="text-[10px] text-muted-foreground leading-none mt-0.5">{lang === "ar" ? "شبكة المزارعين" : "Farmers Network"}</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 space-y-0.5">
          {navItems.map((item) => {
            const isActive = location === item.href || (item.href === "/feed" && location === "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 font-medium text-[15px] group ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-foreground hover:bg-muted"
                }`}
              >
                <div className="relative shrink-0">
                  <item.icon className={`w-5 h-5 transition-transform group-hover:scale-110 ${isActive ? "" : ""}`} />
                  {item.badge != null && item.badge > 0 && (
                    <span className="absolute -top-2 -end-2 min-w-[16px] h-4 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1 shadow-sm">
                      {item.badge > 99 ? "99+" : item.badge}
                    </span>
                  )}
                </div>
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* New Post Button */}
        <div className="px-4 py-3">
          <Button asChild size="default" className="w-full rounded-xl font-bold shadow-sm text-sm h-10">
            <Link href="/feed">
              {t.newPost}
            </Link>
          </Button>
        </div>

        {/* Theme / Language controls */}
        <div className="px-4 py-3 border-t border-border/40 space-y-3">
          {/* Dark mode + Language */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={toggleDark}
              className="flex-1 gap-2 rounded-lg h-8 text-xs font-medium"
            >
              {darkMode === "dark" ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
              {darkMode === "dark" ? t.light : t.dark}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLang(lang === "ar" ? "en" : "ar")}
              className="flex-1 gap-2 rounded-lg h-8 text-xs font-medium"
            >
              <Globe className="w-3.5 h-3.5" />
              {lang === "ar" ? "English" : "عربي"}
            </Button>
          </div>

          {/* Color theme picker */}
          <div className="flex items-center gap-2">
            <Palette className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <div className="flex gap-1.5 flex-1">
              {themes.map((th) => (
                <button
                  key={th.id}
                  onClick={() => setColorTheme(th.id)}
                  title={th.label}
                  className={`flex-1 h-6 rounded-md transition-all duration-200 ${th.color} ${
                    colorTheme === th.id
                      ? "ring-2 ring-offset-1 ring-offset-background ring-foreground scale-105"
                      : "opacity-60 hover:opacity-100"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* User profile + logout */}
        <div className="px-3 py-3 border-t border-border/40">
          <div className="flex items-center gap-2">
            <Link href={`/profile/${user.username}`} className="flex items-center gap-2 hover:bg-muted p-2 rounded-xl transition-colors flex-1 min-w-0">
              <Avatar className="w-8 h-8 shrink-0 border border-border/40">
                <AvatarImage src={user.avatar || ""} />
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                  {(user.displayName || user.username || "?").charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col min-w-0">
                <span className="font-bold text-sm leading-tight truncate">{user.displayName}</span>
                <span className="text-muted-foreground text-xs truncate">@{user.username}</span>
              </div>
            </Link>
            <Button variant="ghost" size="icon" onClick={handleLogout} className="rounded-lg w-8 h-8 shrink-0 text-muted-foreground hover:text-destructive">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 border-e border-border/40">
        {children}
      </main>

      {/* Right Sidebar */}
      <aside className="hidden lg:flex flex-col w-80 p-4 gap-4 sticky top-0 h-screen overflow-y-auto">
        {/* Trending Topics */}
        {trending && Array.isArray(trending.hashtags) && trending.hashtags.length > 0 && (
          <div className="bg-muted/40 rounded-2xl p-4 border border-border/30">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-primary" />
              <h2 className="font-bold text-sm">{t.trending}</h2>
            </div>
            <div className="space-y-3">
              {trending.hashtags.slice(0, 5).map((tag, i) => (
                <div key={i} className="flex items-center justify-between group cursor-pointer">
                  <div>
                    <p className="font-bold text-sm text-primary group-hover:underline">#{tag.tag}</p>
                    <p className="text-xs text-muted-foreground">{tag.count} {lang === "ar" ? "منشور" : "posts"}</p>
                  </div>
                  <span className="text-xs text-muted-foreground font-medium bg-muted rounded-full px-2 py-0.5">#{i + 1}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Suggested Users */}
        {Array.isArray(suggested) && suggested.length > 0 && (
          <div className="bg-muted/40 rounded-2xl p-4 border border-border/30">
            <div className="flex items-center gap-2 mb-3">
              <UserPlus className="w-4 h-4 text-primary" />
              <h2 className="font-bold text-sm">{t.suggestedUsers}</h2>
            </div>
            <div className="space-y-3">
              {suggested.slice(0, 4).map((u) => (
                <div key={u.id} className="flex items-center justify-between gap-2">
                  <Link href={`/profile/${u.username}`} className="flex items-center gap-2 min-w-0 flex-1">
                    <Avatar className="w-8 h-8 shrink-0 border border-border/30">
                      <AvatarImage src={u.avatar || ""} />
                      <AvatarFallback className="text-xs bg-primary/10 text-primary font-bold">{u.displayName.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="font-bold text-sm truncate hover:text-primary transition-colors">{u.displayName}</p>
                      <p className="text-xs text-muted-foreground truncate">@{u.username}</p>
                    </div>
                  </Link>
                  <Button
                    variant={followedUsernames.has(u.username) ? "default" : "outline"}
                    size="sm"
                    className="rounded-full h-7 text-xs px-3 shrink-0 font-medium"
                    disabled={followedUsernames.has(u.username) || followMutation.isPending}
                    onClick={() => handleFollow(u.username)}
                  >
                    {followedUsernames.has(u.username) ? (lang === "ar" ? "متابَع" : "Following") : t.follow}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-auto">
          <p className="text-xs text-muted-foreground text-center">
            {lang === "ar" ? "© 2026 زراعة" : "© 2026 Zira3a"}
          </p>
        </div>
      </aside>
    </div>
  );
}

import { useQuery } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, FileText, Heart, MessageCircle, UserPlus, BarChart3, Loader2, TrendingUp } from "lucide-react";
import { useLang } from "@/context/LangContext";
import { formatDistanceToNow } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { Link } from "wouter";

interface StatsData {
  totals: {
    users: number;
    posts: number;
    likes: number;
    comments: number;
    follows: number;
  };
  recentUsers: {
    id: number;
    displayName: string;
    username: string;
    avatar: string | null;
    specialty: string | null;
    createdAt: string;
  }[];
  topPosts: {
    id: number;
    content: string;
    display_name: string;
    username: string;
    avatar: string | null;
    likes_count: number;
    created_at: string;
  }[];
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
  bg,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  color: string;
  bg: string;
}) {
  return (
    <div className="bg-card border border-border/40 rounded-2xl p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
        <Icon className={`w-6 h-6 ${color}`} />
      </div>
      <div>
        <p className="text-2xl font-bold">{value.toLocaleString("ar-EG")}</p>
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

export default function Stats() {
  const { lang } = useLang();

  const { data, isLoading } = useQuery<StatsData>({
    queryKey: ["platform-stats"],
    queryFn: async () => {
      const res = await fetch("/api/stats");
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    },
    refetchInterval: 30_000,
  });

  if (isLoading || !data) {
    return (
      <div className="flex flex-col items-center justify-center p-16 gap-3 text-muted-foreground">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <span className="text-sm">{lang === "ar" ? "جاري تحميل الإحصائيات..." : "Loading stats..."}</span>
      </div>
    );
  }

  const cards = [
    { icon: Users, label: lang === "ar" ? "المستخدمون" : "Users", value: data.totals.users, color: "text-sky-600", bg: "bg-sky-100 dark:bg-sky-900/30" },
    { icon: FileText, label: lang === "ar" ? "المنشورات" : "Posts", value: data.totals.posts, color: "text-primary", bg: "bg-primary/10" },
    { icon: Heart, label: lang === "ar" ? "الإعجابات" : "Likes", value: data.totals.likes, color: "text-rose-500", bg: "bg-rose-100 dark:bg-rose-900/30" },
    { icon: MessageCircle, label: lang === "ar" ? "التعليقات" : "Comments", value: data.totals.comments, color: "text-amber-500", bg: "bg-amber-100 dark:bg-amber-900/30" },
    { icon: UserPlus, label: lang === "ar" ? "المتابعات" : "Follows", value: data.totals.follows, color: "text-violet-500", bg: "bg-violet-100 dark:bg-violet-900/30" },
  ];

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/85 backdrop-blur-xl border-b border-border/50 px-4 py-3 flex items-center gap-3">
        <BarChart3 className="w-5 h-5 text-primary" />
        <h1 className="text-[17px] font-bold">
          {lang === "ar" ? "إحصائيات المنصة" : "Platform Stats"}
        </h1>
      </div>

      <div className="p-4 space-y-6">
        {/* Stat Cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {cards.map((c) => (
            <StatCard key={c.label} {...c} />
          ))}
        </div>

        {/* Top Posts */}
        {data.topPosts.length > 0 && (
          <div className="bg-card border border-border/40 rounded-2xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border/30">
              <TrendingUp className="w-4 h-4 text-primary" />
              <h2 className="font-bold text-sm">
                {lang === "ar" ? "أكثر المنشورات تفاعلاً" : "Most Liked Posts"}
              </h2>
            </div>
            <div className="divide-y divide-border/30">
              {data.topPosts.map((post, i) => (
                <Link key={post.id} href={`/post/${post.id}`}>
                  <div className="flex items-start gap-3 px-4 py-3 hover:bg-muted/30 transition-colors cursor-pointer">
                    <span className="text-lg font-black text-primary/40 w-6 shrink-0 text-center mt-0.5">
                      {i + 1}
                    </span>
                    <Avatar className="w-8 h-8 shrink-0 border border-border/30">
                      <AvatarImage src={post.avatar || ""} />
                      <AvatarFallback className="text-xs bg-primary/10 text-primary font-bold">
                        {post.display_name?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="font-bold text-sm truncate">{post.display_name}</span>
                        <span className="text-muted-foreground text-xs">@{post.username}</span>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2 break-words">{post.content}</p>
                    </div>
                    <div className="flex items-center gap-1 text-rose-500 shrink-0">
                      <Heart className="w-3.5 h-3.5 fill-current" />
                      <span className="text-xs font-bold">{post.likes_count}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Recent Users */}
        {data.recentUsers.length > 0 && (
          <div className="bg-card border border-border/40 rounded-2xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border/30">
              <Users className="w-4 h-4 text-primary" />
              <h2 className="font-bold text-sm">
                {lang === "ar" ? "أحدث المستخدمين" : "Newest Members"}
              </h2>
            </div>
            <div className="divide-y divide-border/30">
              {data.recentUsers.map((u) => (
                <Link key={u.id} href={`/profile/${u.username}`}>
                  <div className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors cursor-pointer">
                    <Avatar className="w-9 h-9 shrink-0 border border-border/30">
                      <AvatarImage src={u.avatar || ""} />
                      <AvatarFallback className="text-xs bg-primary/10 text-primary font-bold">
                        {u.displayName?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm truncate">{u.displayName}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {u.specialty || `@${u.username}`}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {formatDistanceToNow(new Date(u.createdAt), {
                        addSuffix: true,
                        locale: lang === "ar" ? ar : enUS,
                      })}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

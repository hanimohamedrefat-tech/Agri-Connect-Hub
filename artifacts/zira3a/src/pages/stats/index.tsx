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
  gradient,
  iconColor,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  gradient: string;
  iconColor: string;
}) {
  return (
    <div className={`relative overflow-hidden rounded-2xl p-5 ${gradient} border border-white/20 shadow-sm`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
      </div>
      <p className={`text-2xl font-black tracking-tight ${iconColor}`}>
        {value.toLocaleString("ar-EG")}
      </p>
      <p className={`text-xs font-semibold mt-0.5 ${iconColor} opacity-80`}>{label}</p>
      <div className="absolute -bottom-3 -left-3 w-16 h-16 rounded-full bg-white/10" />
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
    {
      icon: Users,
      label: lang === "ar" ? "المستخدمون" : "Users",
      value: data.totals.users,
      gradient: "bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/60 dark:to-emerald-900/40",
      iconColor: "text-emerald-700 dark:text-emerald-400",
    },
    {
      icon: FileText,
      label: lang === "ar" ? "المنشورات" : "Posts",
      value: data.totals.posts,
      gradient: "bg-gradient-to-br from-sky-50 to-sky-100 dark:from-sky-950/60 dark:to-sky-900/40",
      iconColor: "text-sky-700 dark:text-sky-400",
    },
    {
      icon: Heart,
      label: lang === "ar" ? "الإعجابات" : "Likes",
      value: data.totals.likes,
      gradient: "bg-gradient-to-br from-rose-50 to-rose-100 dark:from-rose-950/60 dark:to-rose-900/40",
      iconColor: "text-rose-600 dark:text-rose-400",
    },
    {
      icon: MessageCircle,
      label: lang === "ar" ? "التعليقات" : "Comments",
      value: data.totals.comments,
      gradient: "bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/60 dark:to-amber-900/40",
      iconColor: "text-amber-700 dark:text-amber-400",
    },
    {
      icon: UserPlus,
      label: lang === "ar" ? "المتابعات" : "Follows",
      value: data.totals.follows,
      gradient: "bg-gradient-to-br from-fuchsia-50 to-fuchsia-100 dark:from-fuchsia-950/60 dark:to-fuchsia-900/40",
      iconColor: "text-fuchsia-700 dark:text-fuchsia-400",
    },
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

      <div className="p-4 space-y-5">
        {/* Stat Cards — 2 col + full-width last on mobile, 5 col on lg */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {cards.map((c) => (
            <StatCard key={c.label} {...c} />
          ))}
        </div>

        {/* Totals summary strip */}
        <div className="rounded-2xl bg-gradient-to-r from-primary/10 via-secondary/5 to-primary/5 border border-primary/15 px-5 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            <span className="font-bold text-sm text-foreground">
              {lang === "ar" ? "إجمالي التفاعلات" : "Total interactions"}
            </span>
          </div>
          <span className="text-xl font-black text-primary">
            {(data.totals.likes + data.totals.comments + data.totals.follows).toLocaleString("ar-EG")}
          </span>
        </div>

        {/* Top Posts */}
        {data.topPosts.length > 0 && (
          <div className="bg-card border border-border/40 rounded-2xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border/30 bg-muted/20">
              <TrendingUp className="w-4 h-4 text-primary" />
              <h2 className="font-bold text-sm">
                {lang === "ar" ? "أكثر المنشورات تفاعلاً" : "Most Liked Posts"}
              </h2>
            </div>
            <div className="divide-y divide-border/30">
              {data.topPosts.map((post, i) => (
                <Link key={post.id} href={`/post/${post.id}`}>
                  <div className="flex items-start gap-3 px-4 py-3 hover:bg-muted/30 transition-colors cursor-pointer">
                    <span className={`text-base font-black w-6 shrink-0 text-center mt-1 ${
                      i === 0 ? "text-amber-500" : i === 1 ? "text-slate-400" : i === 2 ? "text-orange-400" : "text-muted-foreground/40"
                    }`}>
                      {i + 1}
                    </span>
                    <Avatar className="w-8 h-8 shrink-0 border border-border/30 mt-0.5">
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
                    <div className="flex items-center gap-1 text-rose-500 shrink-0 mt-1">
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
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border/30 bg-muted/20">
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
                    <span className="text-xs text-muted-foreground shrink-0 bg-muted/40 rounded-full px-2 py-0.5">
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

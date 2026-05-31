import { useGetTrendingPosts, useGetSuggestedUsers } from "@workspace/api-client-react";
import { PostCard } from "@/components/shared/PostCard";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Hash, TrendingUp, UserPlus, Loader2 } from "lucide-react";
import { useLang } from "@/context/LangContext";

export default function Explore() {
  const { data: trending, isLoading: loadingTrending } = useGetTrendingPosts();
  const { data: suggested, isLoading: loadingSuggested } = useGetSuggestedUsers();
  const { t, lang } = useLang();

  return (
    <div className="flex flex-col h-full min-h-screen">
      <div className="sticky top-0 z-20 bg-background/85 backdrop-blur-xl border-b border-border/50 px-4 py-3">
        <h1 className="text-[17px] font-bold">{t.explore}</h1>
      </div>

      {/* Suggested Users */}
      <div className="p-4 border-b border-border/50">
        <div className="flex items-center gap-2 mb-3">
          <UserPlus className="w-4 h-4 text-primary" />
          <h2 className="font-bold text-[15px]">{t.suggestedUsers}</h2>
        </div>
        {loadingSuggested ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Array.isArray(suggested) && suggested.slice(0, 4).map(user => (
              <div key={user.id} className="bg-card border border-border/40 p-3 rounded-2xl flex items-center justify-between hover:bg-muted/30 transition-colors">
                <Link href={`/profile/${user.username}`} className="flex items-center gap-2 min-w-0">
                  <Avatar className="w-10 h-10 border border-border/30">
                    <AvatarImage src={user.avatar || ""} />
                    <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">{user.displayName.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="font-bold text-sm truncate">{user.displayName}</p>
                    <p className="text-xs text-muted-foreground truncate">@{user.username}</p>
                    {user.specialty && (
                      <p className="text-xs text-primary truncate">{user.specialty}</p>
                    )}
                  </div>
                </Link>
                <Button variant="outline" size="sm" className="rounded-full h-7 px-3 text-xs font-medium shrink-0 ms-2">
                  {t.follow}
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Trending Hashtags */}
      <div className="p-4 border-b border-border/50">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-primary" />
          <h2 className="font-bold text-[15px]">{t.trendingHashtags}</h2>
        </div>
        {loadingTrending ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {Array.isArray(trending?.hashtags) && trending.hashtags.map((tag, i) => (
              <div
                key={i}
                className="bg-primary/8 hover:bg-primary/15 text-primary border border-primary/20 px-3 py-1.5 rounded-full font-medium flex items-center gap-1.5 cursor-pointer transition-colors text-sm"
              >
                <Hash className="w-3.5 h-3.5" />
                <span>{tag.tag}</span>
                <span className="text-xs opacity-60 bg-primary/10 rounded-full px-1.5 py-0.5">{tag.count}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Trending Posts */}
      <div>
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border/30">
          <TrendingUp className="w-4 h-4 text-primary" />
          <h2 className="font-bold text-[15px]">{t.trendingPosts}</h2>
        </div>
        {loadingTrending ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          trending?.posts?.map(post => (
            <PostCard key={post.id} post={post} />
          ))
        )}
      </div>
    </div>
  );
}

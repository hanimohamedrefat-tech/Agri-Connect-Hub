import { useGetTrendingPosts, useGetSuggestedUsers } from "@workspace/api-client-react";
import { PostCard } from "@/components/shared/PostCard";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Hash } from "lucide-react";

export default function Explore() {
  const { data: trending, isLoading: loadingTrending } = useGetTrendingPosts();
  const { data: suggested, isLoading: loadingSuggested } = useGetSuggestedUsers();

  return (
    <div className="flex flex-col h-full min-h-screen">
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border/50 px-4 py-3">
        <h1 className="text-xl font-bold">استكشف</h1>
      </div>

      <div className="p-4 bg-muted/30 border-b border-border/50">
        <h2 className="font-bold text-xl mb-4">اقتراحات للمتابعة</h2>
        {loadingSuggested ? (
          <div>جاري التحميل...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {suggested?.slice(0, 4).map(user => (
              <div key={user.id} className="bg-card p-4 rounded-xl border border-border/50 flex items-center justify-between">
                <Link href={`/profile/${user.username}`} className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={user.avatar || ""} />
                    <AvatarFallback>{user.displayName.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="font-bold hover:underline">{user.displayName}</span>
                    <span className="text-sm text-muted-foreground">@{user.username}</span>
                  </div>
                </Link>
                <Button variant="outline" size="sm" className="rounded-full">متابعة</Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-4 border-b border-border/50">
        <h2 className="font-bold text-xl mb-4">الهاشتاجات الرائجة</h2>
        {loadingTrending ? (
          <div>جاري التحميل...</div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {trending?.hashtags?.map((tag, i) => (
              <div key={i} className="bg-primary/10 text-primary px-4 py-2 rounded-full font-medium flex items-center gap-1 cursor-pointer hover:bg-primary/20 transition-colors">
                <Hash className="w-4 h-4" />
                <span>{tag.tag}</span>
                <span className="text-xs opacity-70 mr-2">{tag.count} منشور</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="divide-y divide-border/50">
        <h2 className="font-bold text-xl p-4 pb-2">منشورات رائجة</h2>
        {loadingTrending ? (
          <div className="p-8 text-center text-muted-foreground">جاري تحميل المنشورات...</div>
        ) : (
          trending?.posts?.map(post => (
            <PostCard key={post.id} post={post} />
          ))
        )}
      </div>
    </div>
  );
}

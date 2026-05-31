import { useGetBookmarks } from "@workspace/api-client-react";
import { PostCard } from "@/components/shared/PostCard";

export default function Bookmarks() {
  const { data: posts, isLoading } = useGetBookmarks();

  return (
    <div className="flex flex-col min-h-screen">
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border/50 px-4 py-3">
        <h1 className="text-xl font-bold">المحفوظات</h1>
        <p className="text-sm text-muted-foreground">المنشورات التي قمت بحفظها للرجوع إليها لاحقاً</p>
      </div>

      <div className="divide-y divide-border/50">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">جاري تحميل المحفوظات...</div>
        ) : posts?.length ? (
          posts.map(post => (
            <PostCard key={post.id} post={post} />
          ))
        ) : (
          <div className="p-12 text-center flex flex-col items-center">
            <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-4">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLineLinejoin="round" className="text-muted-foreground">
                <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>
              </svg>
            </div>
            <h3 className="text-2xl font-bold mb-2">احتفظ بمنشوراتك المفضلة هنا</h3>
            <p className="text-muted-foreground max-w-sm">
              لا تدع الأفكار والنصائح الزراعية المهمة تضيع. اضغط على أيقونة الحفظ في أي منشور وستجده هنا.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

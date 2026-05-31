import { useState } from "react";
import { useGetFeed, useCreatePost, useGetMe } from "@workspace/api-client-react";
import { PostCard } from "@/components/shared/PostCard";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Image as ImageIcon } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetFeedQueryKey } from "@workspace/api-client-react";

export default function Feed() {
  const { data: user } = useGetMe();
  const { data: posts, isLoading } = useGetFeed();
  const createPostMutation = useCreatePost();
  const queryClient = useQueryClient();
  const [content, setContent] = useState("");

  const handlePost = () => {
    if (!content.trim()) return;
    createPostMutation.mutate({ data: { content } }, {
      onSuccess: () => {
        setContent("");
        queryClient.invalidateQueries({ queryKey: getGetFeedQueryKey() });
      }
    });
  };

  return (
    <div className="flex flex-col h-full min-h-screen">
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border/50 px-4 py-3">
        <h1 className="text-xl font-bold">الرئيسية</h1>
      </div>

      <div className="p-4 border-b border-border/50">
        <div className="flex gap-4">
          <Avatar className="w-12 h-12">
            <AvatarImage src={user?.avatar || ""} />
            <AvatarFallback>{user?.displayName?.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-3">
            <Textarea 
              placeholder="ماذا تزرع اليوم؟" 
              className="min-h-[100px] text-lg resize-none border-none focus-visible:ring-0 p-0 bg-transparent"
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
            <div className="flex items-center justify-between border-t border-border/50 pt-3">
              <Button variant="ghost" size="icon" className="text-primary rounded-full">
                <ImageIcon className="w-5 h-5" />
              </Button>
              <Button 
                onClick={handlePost} 
                disabled={!content.trim() || createPostMutation.isPending}
                className="rounded-full px-6 font-bold"
              >
                نشر
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="divide-y divide-border/50">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">جاري تحميل المنشورات...</div>
        ) : posts?.length ? (
          posts.map(post => (
            <PostCard key={post.id} post={post} />
          ))
        ) : (
          <div className="p-8 text-center text-muted-foreground">
            لا توجد منشورات. ابدأ بمتابعة الآخرين أو انشر شيئاً!
          </div>
        )}
      </div>
    </div>
  );
}

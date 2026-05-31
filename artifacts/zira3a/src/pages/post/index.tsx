import { useState } from "react";
import { useParams, Link } from "wouter";
import { useGetPost, useListPostComments, useCreateComment, getGetPostQueryKey, getListPostCommentsQueryKey } from "@workspace/api-client-react";
import { PostCard } from "@/components/shared/PostCard";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowRight, Heart } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";
import { useQueryClient } from "@tanstack/react-query";

export default function PostDetail() {
  const params = useParams();
  const postId = Number(params.postId);
  
  const { data: post, isLoading: loadingPost } = useGetPost(postId, {
    query: { enabled: !!postId, queryKey: getGetPostQueryKey(postId) }
  });
  
  const { data: comments, isLoading: loadingComments } = useListPostComments(postId, {
    query: { enabled: !!postId, queryKey: getListPostCommentsQueryKey(postId) }
  });

  const createCommentMutation = useCreateComment();
  const queryClient = useQueryClient();
  const [content, setContent] = useState("");

  const handleComment = () => {
    if (!content.trim() || !postId) return;
    createCommentMutation.mutate({ postId, data: { content } }, {
      onSuccess: () => {
        setContent("");
        queryClient.invalidateQueries({ queryKey: getListPostCommentsQueryKey(postId) });
        queryClient.invalidateQueries({ queryKey: getGetPostQueryKey(postId) });
      }
    });
  };

  if (loadingPost) {
    return <div className="p-8 text-center">جاري التحميل...</div>;
  }

  if (!post) {
    return <div className="p-8 text-center">المنشور غير موجود</div>;
  }

  return (
    <div className="flex flex-col min-h-screen">
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border/50 px-4 py-3 flex items-center gap-6">
        <Link href="/feed" className="p-2 hover:bg-muted rounded-full transition-colors">
          <ArrowRight className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-bold">المنشور</h1>
      </div>

      <PostCard post={post} isDetailed />

      <div className="p-4 border-b border-border/50 flex gap-4">
        <div className="flex-1 space-y-3">
          <Textarea 
            placeholder="أضف ردك..." 
            className="min-h-[80px] resize-none focus-visible:ring-0 bg-muted/30"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
          <div className="flex justify-end">
            <Button 
              onClick={handleComment} 
              disabled={!content.trim() || createCommentMutation.isPending}
              className="rounded-full px-6 font-bold"
            >
              رد
            </Button>
          </div>
        </div>
      </div>

      <div className="divide-y divide-border/50 pb-20">
        {loadingComments ? (
          <div className="p-8 text-center text-muted-foreground">جاري تحميل الردود...</div>
        ) : comments?.length ? (
          comments.map(comment => (
            <div key={comment.id} className="p-4 flex gap-3 hover:bg-muted/10 transition-colors">
              <Link href={`/profile/${comment.author.username}`}>
                <Avatar className="w-10 h-10 hover:opacity-80 transition-opacity">
                  <AvatarImage src={comment.author.avatar || ""} />
                  <AvatarFallback>{comment.author.displayName.charAt(0)}</AvatarFallback>
                </Avatar>
              </Link>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Link href={`/profile/${comment.author.username}`} className="font-bold hover:underline">
                    {comment.author.displayName}
                  </Link>
                  <span className="text-muted-foreground text-sm">@{comment.author.username}</span>
                  <span className="text-muted-foreground text-sm">·</span>
                  <span className="text-muted-foreground text-sm">
                    {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true, locale: ar })}
                  </span>
                </div>
                <div className="whitespace-pre-wrap break-words mb-2">
                  {comment.content}
                </div>
                <div className="flex items-center gap-4 text-muted-foreground">
                  <Button variant="ghost" size="sm" className="gap-2 rounded-full hover:text-red-500 hover:bg-red-500/10 h-8 px-2">
                    <Heart className="w-4 h-4" />
                    <span className="text-xs">{comment.likesCount > 0 ? comment.likesCount : ''}</span>
                  </Button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="p-8 text-center text-muted-foreground">لا توجد ردود بعد.</div>
        )}
      </div>
    </div>
  );
}

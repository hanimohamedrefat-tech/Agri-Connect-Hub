import { useState } from "react";
import { useParams, Link } from "wouter";
import {
  useGetPost,
  useListPostComments,
  useCreateComment,
  getGetPostQueryKey,
  getListPostCommentsQueryKey,
} from "@workspace/api-client-react";
import { PostCard } from "@/components/shared/PostCard";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Heart, Loader2, MessageCircle, Send } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { useQueryClient } from "@tanstack/react-query";
import { useLang } from "@/context/LangContext";
import { useGetMe } from "@workspace/api-client-react";

export default function PostDetail() {
  const params = useParams();
  const postId = Number(params.postId);
  const { t, lang } = useLang();
  const { data: me } = useGetMe();
  const queryClient = useQueryClient();
  const [content, setContent] = useState("");

  const { data: post, isLoading: loadingPost } = useGetPost(postId, {
    query: { enabled: !!postId, queryKey: getGetPostQueryKey(postId) },
  });

  const { data: comments, isLoading: loadingComments } = useListPostComments(postId, {
    query: { enabled: !!postId, queryKey: getListPostCommentsQueryKey(postId) },
  });

  const createCommentMutation = useCreateComment();

  const handleComment = () => {
    if (!content.trim() || !postId) return;
    createCommentMutation.mutate(
      { postId, data: { content } },
      {
        onSuccess: () => {
          setContent("");
          queryClient.invalidateQueries({ queryKey: getListPostCommentsQueryKey(postId) });
          queryClient.invalidateQueries({ queryKey: getGetPostQueryKey(postId) });
        },
      }
    );
  };

  const timeAgo = (date: string) =>
    formatDistanceToNow(new Date(date), {
      addSuffix: true,
      locale: lang === "ar" ? ar : enUS,
    });

  const BackIcon = lang === "ar" ? ArrowLeft : ArrowRight;

  if (loadingPost) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        {lang === "ar" ? "المنشور غير موجود" : "Post not found"}
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/85 backdrop-blur-xl border-b border-border/50 px-4 py-2 flex items-center gap-4">
        <Link href="/feed" className="p-2 hover:bg-muted rounded-full transition-colors">
          <BackIcon className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-[17px] font-bold">{lang === "ar" ? "المنشور" : "Post"}</h1>
          {post.commentsCount > 0 && (
            <p className="text-xs text-muted-foreground">
              {post.commentsCount} {lang === "ar" ? "تعليق" : "comments"}
            </p>
          )}
        </div>
      </div>

      {/* Post */}
      <PostCard post={post} isDetailed />

      {/* Reply Composer */}
      <div className="p-4 border-b border-border/40 bg-card">
        <div className="flex gap-3">
          <Avatar className="w-9 h-9 shrink-0 border border-border/30">
            <AvatarImage src={me?.avatar || ""} />
            <AvatarFallback className="text-xs bg-primary/10 text-primary font-bold">
              {(me?.displayName || me?.username || "?").charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-2">
            <div
              contentEditable
              suppressContentEditableWarning
              data-placeholder={lang === "ar" ? "أضف تعليقك..." : "Add your comment..."}
              onInput={(e) => setContent((e.target as HTMLDivElement).innerText)}
              className="min-h-[48px] text-[14px] leading-relaxed outline-none bg-transparent break-words cursor-text"
              dir={lang === "ar" ? "rtl" : "ltr"}
            />
            <div className="flex items-center justify-end border-t border-border/30 pt-2">
              <Button
                onClick={handleComment}
                disabled={!content.trim() || createCommentMutation.isPending}
                size="sm"
                className="rounded-full px-5 h-8 text-xs font-bold gap-1.5"
              >
                {createCommentMutation.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    {lang === "ar" ? "رد" : "Reply"}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Comments */}
      <div className="pb-20">
        {loadingComments ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          </div>
        ) : !comments?.length ? (
          <div className="py-12 text-center">
            <MessageCircle className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              {lang === "ar" ? "لا توجد تعليقات بعد" : "No comments yet"}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/30">
            {comments.map((comment) => (
              <div key={comment.id} className="p-4 flex gap-3 hover:bg-muted/10 transition-colors">
                <Link href={`/profile/${comment.author.username}`}>
                  <Avatar className="w-9 h-9 shrink-0 border border-border/30">
                    <AvatarImage src={comment.author.avatar || ""} />
                    <AvatarFallback className="text-xs bg-primary/10 text-primary font-bold">
                      {(comment.author.displayName || "?").charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                </Link>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mb-1">
                    <Link href={`/profile/${comment.author.username}`} className="font-bold text-sm hover:text-primary transition-colors">
                      {comment.author.displayName}
                    </Link>
                    <span className="text-muted-foreground text-xs">@{comment.author.username}</span>
                    <span className="text-muted-foreground text-xs">· {timeAgo(comment.createdAt)}</span>
                  </div>
                  <p className="text-[14px] whitespace-pre-wrap break-words leading-relaxed mb-2">
                    {comment.content}
                  </p>
                  <button className="flex items-center gap-1.5 text-muted-foreground hover:text-rose-500 transition-colors group">
                    <Heart className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                    {comment.likesCount > 0 && (
                      <span className="text-xs">{comment.likesCount}</span>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

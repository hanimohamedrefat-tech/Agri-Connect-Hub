import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Loader2, Heart, Send, MessageCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { useGetMe, useListPostComments, useCreateComment, getListPostCommentsQueryKey, getGetPostQueryKey, getGetFeedQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { useLang } from "@/context/LangContext";
import type { Post } from "@workspace/api-client-react";

interface CommentDialogProps {
  post: Post;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommentDialog({ post, open, onOpenChange }: CommentDialogProps) {
  const { t, lang } = useLang();
  const { data: me } = useGetMe();
  const queryClient = useQueryClient();
  const [content, setContent] = useState("");

  const { data: comments, isLoading } = useListPostComments(post.id, {
    query: {
      enabled: open,
      queryKey: getListPostCommentsQueryKey(post.id),
    },
  });

  const createComment = useCreateComment();

  const handleSubmit = () => {
    if (!content.trim()) return;
    createComment.mutate(
      { postId: post.id, data: { content } },
      {
        onSuccess: () => {
          setContent("");
          queryClient.invalidateQueries({ queryKey: getListPostCommentsQueryKey(post.id) });
          queryClient.invalidateQueries({ queryKey: getGetPostQueryKey(post.id) });
          queryClient.invalidateQueries({ queryKey: getGetFeedQueryKey() });
        },
      }
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      handleSubmit();
    }
  };

  const timeAgo = (date: string) =>
    formatDistanceToNow(new Date(date), {
      addSuffix: true,
      locale: lang === "ar" ? ar : enUS,
    });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 gap-0 rounded-2xl overflow-hidden" dir={lang === "ar" ? "rtl" : "ltr"}>
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-border/40">
          <DialogTitle className="text-[15px] font-bold flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-primary" />
            {t.comment}
          </DialogTitle>
        </DialogHeader>

        {/* Original Post Preview */}
        <div className="px-5 py-3 border-b border-border/30 bg-muted/20">
          <div className="flex gap-2.5">
            <div className="flex flex-col items-center">
              <Avatar className="w-8 h-8 shrink-0 border border-border/30">
                <AvatarImage src={post.author.avatar || ""} />
                <AvatarFallback className="text-xs bg-primary/10 text-primary font-bold">
                  {post.author.displayName.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="w-0.5 flex-1 bg-border/40 rounded-full mt-1.5 min-h-[20px]" />
            </div>
            <div className="flex-1 min-w-0 pb-2">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="font-bold text-sm truncate">{post.author.displayName}</span>
                <span className="text-muted-foreground text-xs">@{post.author.username}</span>
                <span className="text-muted-foreground text-xs">· {timeAgo(post.createdAt)}</span>
              </div>
              <p className="text-sm text-foreground/90 line-clamp-3 whitespace-pre-wrap leading-relaxed">
                {post.content}
              </p>
            </div>
          </div>
        </div>

        {/* Compose Reply */}
        <div className="px-5 py-3 border-b border-border/30">
          <div className="flex gap-2.5">
            <Avatar className="w-8 h-8 shrink-0 border border-border/30">
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
                onKeyDown={handleKeyDown}
                className="min-h-[60px] text-[14px] leading-relaxed outline-none bg-transparent break-words cursor-text text-foreground"
                dir={lang === "ar" ? "rtl" : "ltr"}
              />
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  {lang === "ar" ? "Ctrl+Enter للإرسال" : "Ctrl+Enter to send"}
                </p>
                <Button
                  onClick={handleSubmit}
                  disabled={!content.trim() || createComment.isPending}
                  size="sm"
                  className="rounded-full px-4 h-7 text-xs font-bold gap-1.5"
                >
                  {createComment.isPending ? (
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

        {/* Comments List */}
        <div className="max-h-80 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            </div>
          ) : !comments?.length ? (
            <div className="py-8 text-center">
              <MessageCircle className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                {lang === "ar" ? "لا توجد تعليقات بعد. كن أول من يعلق!" : "No comments yet. Be the first!"}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/30">
              {comments.map((comment) => (
                <div key={comment.id} className="px-5 py-3 flex gap-2.5 hover:bg-muted/20 transition-colors">
                  <Link href={`/profile/${comment.author.username}`} onClick={() => onOpenChange(false)}>
                    <Avatar className="w-8 h-8 shrink-0 border border-border/30">
                      <AvatarImage src={comment.author.avatar || ""} />
                      <AvatarFallback className="text-xs bg-primary/10 text-primary font-bold">
                        {(comment.author.displayName || "?").charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                  </Link>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap mb-1">
                      <Link
                        href={`/profile/${comment.author.username}`}
                        onClick={() => onOpenChange(false)}
                        className="font-bold text-sm hover:text-primary transition-colors"
                      >
                        {comment.author.displayName}
                      </Link>
                      <span className="text-muted-foreground text-xs">@{comment.author.username}</span>
                      <span className="text-muted-foreground text-xs">· {timeAgo(comment.createdAt)}</span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap break-words leading-relaxed mb-2">
                      {comment.content}
                    </p>
                    <button className="flex items-center gap-1 text-muted-foreground hover:text-rose-500 transition-colors group">
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
      </DialogContent>
    </Dialog>
  );
}

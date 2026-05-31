import { useState } from "react";
import { Link } from "wouter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Heart, MessageCircle, Share2, Bookmark, Repeat2, MoreHorizontal, ThumbsUp, Send } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import type { Post } from "@workspace/api-client-react";
import { useLikePost, useBookmarkPost, useRepostPost } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetPostQueryKey, getListPostsQueryKey, getGetFeedQueryKey, getListUserPostsQueryKey } from "@workspace/api-client-react";
import { useLang } from "@/context/LangContext";

interface PostCardProps {
  post: Post;
  isDetailed?: boolean;
}

function fmtNum(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return String(n);
}

export function PostCard({ post, isDetailed = false }: PostCardProps) {
  const { t, lang } = useLang();
  const queryClient = useQueryClient();
  const likeMutation = useLikePost();
  const bookmarkMutation = useBookmarkPost();
  const repostMutation = useRepostPost();

  const [isLiked, setIsLiked] = useState(post.isLiked);
  const [likesCount, setLikesCount] = useState(post.likesCount);
  const [isBookmarked, setIsBookmarked] = useState(post.isBookmarked);
  const [isReposted, setIsReposted] = useState(post.isRepost);
  const [repostsCount, setRepostsCount] = useState(post.repostsCount);
  const [likeAnimating, setLikeAnimating] = useState(false);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getGetFeedQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetPostQueryKey(post.id) });
  };

  const handleLike = () => {
    setIsLiked(!isLiked);
    setLikesCount(isLiked ? likesCount - 1 : likesCount + 1);
    setLikeAnimating(true);
    setTimeout(() => setLikeAnimating(false), 300);
    likeMutation.mutate({ postId: post.id }, { onSuccess: invalidate });
  };

  const handleBookmark = () => {
    setIsBookmarked(!isBookmarked);
    bookmarkMutation.mutate({ postId: post.id }, { onSuccess: invalidate });
  };

  const handleRepost = () => {
    if (isReposted) return;
    setIsReposted(true);
    setRepostsCount(repostsCount + 1);
    repostMutation.mutate({ postId: post.id }, { onSuccess: invalidate });
  };

  const timeAgo = formatDistanceToNow(new Date(post.createdAt), {
    addSuffix: true,
    locale: lang === "ar" ? ar : enUS,
  });

  const hashtags = post.content.match(/#[\w\u0600-\u06FF]+/g) || [];
  const contentWithLinks = post.content.replace(
    /#([\w\u0600-\u06FF]+)/g,
    '<span class="text-primary font-medium cursor-pointer hover:underline">#$1</span>'
  );

  return (
    <article className={`bg-card border-b border-border/40 transition-colors hover:bg-muted/20 group ${isDetailed ? "" : "cursor-pointer"}`}>
      {/* Repost indicator */}
      {post.isRepost && (
        <div className="flex items-center gap-2 px-4 pt-3 pb-0 text-xs text-muted-foreground">
          <Repeat2 className="w-3.5 h-3.5" />
          <span>{lang === "ar" ? "أعاد نشر" : "Reposted"}</span>
        </div>
      )}

      <div className={`flex gap-3 p-4 ${isDetailed ? "p-5" : ""}`}>
        {/* Avatar column */}
        <div className="flex flex-col items-center gap-1 shrink-0">
          <Link href={`/profile/${post.author.username}`}>
            <Avatar className={`border-2 border-border/30 hover:border-primary/50 transition-colors ${isDetailed ? "w-14 h-14" : "w-11 h-11"}`}>
              <AvatarImage src={post.author.avatar || ""} />
              <AvatarFallback className="bg-primary/10 text-primary font-bold">
                {post.author.displayName.charAt(0)}
              </AvatarFallback>
            </Avatar>
          </Link>
          {isDetailed && <div className="w-0.5 flex-1 bg-border/30 rounded-full mt-1" />}
        </div>

        {/* Content column */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 min-w-0">
              <Link href={`/profile/${post.author.username}`} className="font-bold text-[15px] hover:text-primary transition-colors truncate">
                {post.author.displayName}
              </Link>
              {post.author.specialty && (
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium hidden sm:inline-block shrink-0">
                  {post.author.specialty}
                </span>
              )}
              <span className="text-muted-foreground text-sm hidden sm:inline">@{post.author.username}</span>
              <span className="text-muted-foreground text-xs">·</span>
              <span className="text-muted-foreground text-xs whitespace-nowrap">{timeAgo}</span>
            </div>
            <Button variant="ghost" size="icon" className="w-8 h-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shrink-0 text-muted-foreground hover:text-foreground">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </div>

          {/* Post content */}
          <div className={`mb-3 leading-relaxed text-[15px] ${isDetailed ? "text-base" : ""}`}>
            {isDetailed ? (
              <p className="whitespace-pre-wrap break-words">{post.content}</p>
            ) : (
              <Link href={`/post/${post.id}`} className="block">
                <p
                  className="whitespace-pre-wrap break-words"
                  dangerouslySetInnerHTML={{ __html: contentWithLinks }}
                />
              </Link>
            )}
          </div>

          {/* Images */}
          {post.images && post.images.length > 0 && (
            <div className={`grid gap-1.5 mb-3 rounded-2xl overflow-hidden border border-border/30 ${
              post.images.length === 1 ? "grid-cols-1" :
              post.images.length === 2 ? "grid-cols-2" :
              post.images.length >= 3 ? "grid-cols-2" : "grid-cols-1"
            }`}>
              {post.images.slice(0, 4).map((img, i) => (
                <div key={i} className={`overflow-hidden ${post.images!.length === 3 && i === 0 ? "row-span-2" : ""}`}>
                  <img
                    src={img}
                    alt={`Post image ${i + 1}`}
                    className="w-full h-full object-cover hover:scale-[1.02] transition-transform duration-300"
                    style={{ maxHeight: post.images!.length === 1 ? "480px" : "220px" }}
                  />
                </div>
              ))}
            </div>
          )}

          {/* LinkedIn-style "Read more" for long posts */}
          {!isDetailed && post.content.length > 280 && (
            <Link href={`/post/${post.id}`} className="text-primary text-sm font-medium hover:underline block mb-2">
              {lang === "ar" ? "...عرض المزيد" : "...see more"}
            </Link>
          )}

          {/* Engagement counts bar (Facebook/LinkedIn style) */}
          {(likesCount > 0 || post.commentsCount > 0 || repostsCount > 0) && (
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-2 pb-2 border-b border-border/30">
              <div className="flex items-center gap-1">
                {likesCount > 0 && (
                  <div className="flex items-center gap-1">
                    <div className="flex">
                      <span className="w-4 h-4 rounded-full bg-red-500 flex items-center justify-center text-[8px]">❤</span>
                      {repostsCount > 0 && <span className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center text-[8px] -ml-1">↻</span>}
                    </div>
                    <span>{fmtNum(likesCount)}</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3">
                {post.commentsCount > 0 && (
                  <span>{fmtNum(post.commentsCount)} {lang === "ar" ? "تعليق" : "comments"}</span>
                )}
                {repostsCount > 0 && (
                  <span>{fmtNum(repostsCount)} {lang === "ar" ? "إعادة نشر" : "reposts"}</span>
                )}
              </div>
            </div>
          )}

          {/* Action buttons (Twitter + LinkedIn + Facebook mix) */}
          <div className="flex items-center gap-0 -mx-2 mt-1">
            {/* Comment (Twitter style) */}
            <button
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/8 transition-all duration-200 text-sm font-medium group/btn"
            >
              <MessageCircle className="w-[18px] h-[18px] group-hover/btn:scale-110 transition-transform" />
              {post.commentsCount > 0 && <span className="text-xs">{fmtNum(post.commentsCount)}</span>}
            </button>

            {/* Repost (Twitter style) */}
            <button
              onClick={handleRepost}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-full transition-all duration-200 text-sm font-medium group/btn ${
                isReposted
                  ? "text-emerald-500"
                  : "text-muted-foreground hover:text-emerald-500 hover:bg-emerald-500/8"
              }`}
            >
              <Repeat2 className={`w-[18px] h-[18px] group-hover/btn:scale-110 transition-transform ${isReposted ? "scale-110" : ""}`} />
              {repostsCount > 0 && <span className="text-xs">{fmtNum(repostsCount)}</span>}
            </button>

            {/* Like (Facebook/Twitter mix with animation) */}
            <button
              onClick={handleLike}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-full transition-all duration-200 text-sm font-medium group/btn ${
                isLiked
                  ? "text-rose-500"
                  : "text-muted-foreground hover:text-rose-500 hover:bg-rose-500/8"
              }`}
            >
              <Heart
                className={`w-[18px] h-[18px] transition-all group-hover/btn:scale-110 ${isLiked ? "fill-current scale-110" : ""} ${likeAnimating ? "like-animate" : ""}`}
              />
              {likesCount > 0 && <span className="text-xs">{fmtNum(likesCount)}</span>}
            </button>

            {/* Bookmark (LinkedIn style save) */}
            <button
              onClick={handleBookmark}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-full transition-all duration-200 text-sm font-medium group/btn ${
                isBookmarked
                  ? "text-primary"
                  : "text-muted-foreground hover:text-primary hover:bg-primary/8"
              }`}
            >
              <Bookmark
                className={`w-[18px] h-[18px] group-hover/btn:scale-110 transition-transform ${isBookmarked ? "fill-current" : ""}`}
              />
            </button>

            {/* Share (Facebook style) */}
            <button
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-full text-muted-foreground hover:text-sky-500 hover:bg-sky-500/8 transition-all duration-200 text-sm font-medium group/btn"
            >
              <Send className="w-[18px] h-[18px] group-hover/btn:scale-110 transition-transform" />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

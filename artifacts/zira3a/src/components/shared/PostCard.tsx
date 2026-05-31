import { useState } from "react";
import { Link } from "wouter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Heart, MessageCircle, Share2, Bookmark } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";
import type { Post } from "@workspace/api-client-react";
import { useLikePost, useBookmarkPost, useRepostPost } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetPostQueryKey, getListPostsQueryKey, getGetFeedQueryKey, getListUserPostsQueryKey } from "@workspace/api-client-react";

interface PostCardProps {
  post: Post;
  isDetailed?: boolean;
}

export function PostCard({ post, isDetailed = false }: PostCardProps) {
  const queryClient = useQueryClient();
  const likeMutation = useLikePost();
  const bookmarkMutation = useBookmarkPost();
  const repostMutation = useRepostPost();

  const [isLiked, setIsLiked] = useState(post.isLiked);
  const [likesCount, setLikesCount] = useState(post.likesCount);
  const [isBookmarked, setIsBookmarked] = useState(post.isBookmarked);
  const [isReposted, setIsReposted] = useState(post.isRepost);
  const [repostsCount, setRepostsCount] = useState(post.repostsCount);

  const handleLike = () => {
    setIsLiked(!isLiked);
    setLikesCount(isLiked ? likesCount - 1 : likesCount + 1);
    likeMutation.mutate({ postId: post.id });
  };

  const handleBookmark = () => {
    setIsBookmarked(!isBookmarked);
    bookmarkMutation.mutate({ postId: post.id });
  };

  const handleRepost = () => {
    if (isReposted) return;
    setIsReposted(true);
    setRepostsCount(repostsCount + 1);
    repostMutation.mutate({ postId: post.id });
  };

  return (
    <div className={`bg-card border-b border-border/50 p-4 transition-colors hover:bg-muted/10 ${isDetailed ? 'text-lg' : ''}`}>
      <div className="flex gap-3">
        <Link href={`/profile/${post.author.username}`}>
          <Avatar className="w-12 h-12 shrink-0 hover:opacity-80 transition-opacity">
            <AvatarImage src={post.author.avatar || ""} />
            <AvatarFallback>{post.author.displayName.charAt(0)}</AvatarFallback>
          </Avatar>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Link href={`/profile/${post.author.username}`} className="font-bold hover:underline truncate">
              {post.author.displayName}
            </Link>
            <span className="text-muted-foreground text-sm truncate">@{post.author.username}</span>
            <span className="text-muted-foreground text-sm">·</span>
            <span className="text-muted-foreground text-sm whitespace-nowrap">
              {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true, locale: ar })}
            </span>
          </div>
          
          <div className="whitespace-pre-wrap break-words mb-3">
            {isDetailed ? post.content : (
              <Link href={`/post/${post.id}`} className="block">
                {post.content}
              </Link>
            )}
          </div>

          {post.images && post.images.length > 0 && (
            <div className={`grid gap-2 mb-3 rounded-2xl overflow-hidden ${post.images.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
              {post.images.map((img, i) => (
                <img key={i} src={img} alt="Post media" className="w-full h-auto object-cover max-h-96" />
              ))}
            </div>
          )}

          <div className="flex items-center justify-between text-muted-foreground max-w-md">
            <Button variant="ghost" size="sm" className="gap-2 rounded-full hover:text-primary hover:bg-primary/10">
              <MessageCircle className="w-5 h-5" />
              <span>{post.commentsCount > 0 ? post.commentsCount : ''}</span>
            </Button>
            
            <Button 
              variant="ghost" 
              size="sm" 
              className={`gap-2 rounded-full hover:text-green-500 hover:bg-green-500/10 ${isReposted ? 'text-green-500' : ''}`}
              onClick={handleRepost}
            >
              <Share2 className="w-5 h-5" />
              <span>{repostsCount > 0 ? repostsCount : ''}</span>
            </Button>
            
            <Button 
              variant="ghost" 
              size="sm" 
              className={`gap-2 rounded-full hover:text-red-500 hover:bg-red-500/10 ${isLiked ? 'text-red-500' : ''}`}
              onClick={handleLike}
            >
              <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
              <span>{likesCount > 0 ? likesCount : ''}</span>
            </Button>
            
            <Button 
              variant="ghost" 
              size="sm" 
              className={`gap-2 rounded-full hover:text-primary hover:bg-primary/10 ${isBookmarked ? 'text-primary' : ''}`}
              onClick={handleBookmark}
            >
              <Bookmark className={`w-5 h-5 ${isBookmarked ? 'fill-current' : ''}`} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

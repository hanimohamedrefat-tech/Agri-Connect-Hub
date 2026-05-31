import { useState } from "react";
import { useGetFeed, useCreatePost, useGetMe } from "@workspace/api-client-react";
import { PostCard } from "@/components/shared/PostCard";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Image as ImageIcon, Smile, MapPin, Hash, Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetFeedQueryKey } from "@workspace/api-client-react";
import { useLang } from "@/context/LangContext";

export default function Feed() {
  const { data: user } = useGetMe();
  const { data: posts, isLoading } = useGetFeed();
  const createPostMutation = useCreatePost();
  const queryClient = useQueryClient();
  const [content, setContent] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const { t, lang } = useLang();

  const handlePost = () => {
    if (!content.trim()) return;
    createPostMutation.mutate({ data: { content } }, {
      onSuccess: () => {
        setContent("");
        setIsFocused(false);
        queryClient.invalidateQueries({ queryKey: getGetFeedQueryKey() });
      }
    });
  };

  const charCount = content.length;
  const maxChars = 500;
  const remaining = maxChars - charCount;
  const isOverLimit = remaining < 0;
  const isNearLimit = remaining < 50 && remaining >= 0;

  return (
    <div className="flex flex-col h-full min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/85 backdrop-blur-xl border-b border-border/50 px-4 py-3">
        <h1 className="text-[17px] font-bold">{t.home}</h1>
      </div>

      {/* Compose Box */}
      <div className={`border-b border-border/50 transition-all duration-200 ${isFocused ? "bg-card shadow-sm" : ""}`}>
        <div className="p-4">
          <div className="flex gap-3">
            <Avatar className="w-10 h-10 shrink-0 border border-border/30">
              <AvatarImage src={user?.avatar || ""} />
              <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">
                {user?.displayName?.charAt(0)}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 space-y-3">
              <div
                contentEditable
                suppressContentEditableWarning
                data-placeholder={t.whatsOnMind}
                onFocus={() => setIsFocused(true)}
                onInput={(e) => setContent((e.target as HTMLDivElement).innerText)}
                className={`min-h-[44px] text-[15px] leading-relaxed outline-none bg-transparent break-words cursor-text ${
                  isFocused ? "min-h-[80px]" : ""
                }`}
                dir={lang === "ar" ? "rtl" : "ltr"}
              />

              {isFocused && (
                <div className="flex items-center justify-between border-t border-border/40 pt-3">
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="w-8 h-8 text-primary rounded-full hover:bg-primary/10">
                      <ImageIcon className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="w-8 h-8 text-primary rounded-full hover:bg-primary/10">
                      <Hash className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="w-8 h-8 text-primary rounded-full hover:bg-primary/10">
                      <Smile className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="w-8 h-8 text-primary rounded-full hover:bg-primary/10">
                      <MapPin className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="flex items-center gap-3">
                    {charCount > 0 && (
                      <div className="flex items-center gap-2">
                        {/* Circular progress */}
                        <div className="relative w-7 h-7">
                          <svg className="w-7 h-7 -rotate-90" viewBox="0 0 28 28">
                            <circle cx="14" cy="14" r="10" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-muted/40" />
                            <circle
                              cx="14" cy="14" r="10" fill="none" strokeWidth="2.5"
                              strokeDasharray={`${2 * Math.PI * 10}`}
                              strokeDashoffset={`${2 * Math.PI * 10 * (1 - Math.min(charCount / maxChars, 1))}`}
                              className={`transition-all duration-200 ${isOverLimit ? "text-destructive" : isNearLimit ? "text-amber-500" : "text-primary"}`}
                              stroke="currentColor"
                              strokeLinecap="round"
                            />
                          </svg>
                          {remaining <= 20 && (
                            <span className={`absolute inset-0 flex items-center justify-center text-[9px] font-bold ${isOverLimit ? "text-destructive" : "text-muted-foreground"}`}>
                              {remaining}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                    <Button
                      onClick={handlePost}
                      disabled={!content.trim() || isOverLimit || createPostMutation.isPending}
                      size="sm"
                      className="rounded-full px-5 font-bold h-8 text-sm"
                    >
                      {createPostMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : t.post}
                    </Button>
                  </div>
                </div>
              )}

              {!isFocused && (
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="w-8 h-8 text-primary rounded-full hover:bg-primary/10">
                      <ImageIcon className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="w-8 h-8 text-primary rounded-full hover:bg-primary/10">
                      <Hash className="w-4 h-4" />
                    </Button>
                  </div>
                  <Button
                    onClick={handlePost}
                    disabled={!content.trim()}
                    size="sm"
                    className="rounded-full px-5 font-bold h-8 text-sm"
                  >
                    {t.post}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Posts Feed */}
      <div>
        {isLoading ? (
          <div className="flex flex-col items-center gap-3 p-12 text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span className="text-sm">{t.loadingPosts}</span>
          </div>
        ) : Array.isArray(posts) && posts.length > 0 ? (
          posts.map(post => (
            <PostCard key={post.id} post={post} />
          ))
        ) : (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <ImageIcon className="w-7 h-7 text-primary/60" />
            </div>
            <p className="text-muted-foreground text-sm">{t.noPosts}</p>
          </div>
        )}
      </div>
    </div>
  );
}

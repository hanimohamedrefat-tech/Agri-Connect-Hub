import { useState, useRef, useCallback } from "react";
import { useGetFeed, useCreatePost, useGetMe } from "@workspace/api-client-react";
import { PostCard } from "@/components/shared/PostCard";
import { StoriesBar } from "@/components/shared/StoriesBar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Image as ImageIcon, Smile, MapPin, Hash, Loader2, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetFeedQueryKey } from "@workspace/api-client-react";
import { useLang } from "@/context/LangContext";
import { getToken } from "@/lib/auth";

export default function Feed() {
  const { data: user } = useGetMe();
  const { data: posts, isLoading } = useGetFeed();
  const createPostMutation = useCreatePost();
  const queryClient = useQueryClient();
  const [content, setContent] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [images, setImages] = useState<{ file: File; preview: string }[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { t, lang } = useLang();

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const remaining = 4 - images.length;
    const toAdd = files.slice(0, remaining);
    const newImages = toAdd.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));
    setImages((prev) => [...prev, ...newImages]);
    e.target.value = "";
  };

  const removeImage = useCallback((index: number) => {
    setImages((prev) => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const handlePost = async () => {
    if (!content.trim() && images.length === 0) return;

    let uploadedUrls: string[] = [];

    if (images.length > 0) {
      setIsUploading(true);
      try {
        const formData = new FormData();
        images.forEach(({ file }) => formData.append("images", file));
        const token = getToken();
        const res = await fetch("/api/upload", {
          method: "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: formData,
        });
        if (!res.ok) throw new Error("Upload failed");
        const data = await res.json();
        uploadedUrls = data.urls;
      } catch {
        setIsUploading(false);
        return;
      }
      setIsUploading(false);
    }

    createPostMutation.mutate(
      { data: { content, images: uploadedUrls.length > 0 ? uploadedUrls : undefined } },
      {
        onSuccess: () => {
          setContent("");
          setImages([]);
          setIsFocused(false);
          queryClient.invalidateQueries({ queryKey: getGetFeedQueryKey() });
        },
      }
    );
  };

  const charCount = content.length;
  const maxChars = 500;
  const remaining = maxChars - charCount;
  const isOverLimit = remaining < 0;
  const isNearLimit = remaining < 50 && remaining >= 0;
  const isPending = isUploading || createPostMutation.isPending;
  const canPost = (content.trim() || images.length > 0) && !isOverLimit && !isPending;

  return (
    <div className="flex flex-col h-full min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/85 backdrop-blur-xl border-b border-border/50 px-4 py-3">
        <h1 className="text-[17px] font-bold">{t.home}</h1>
      </div>

      {/* Stories Bar */}
      <StoriesBar />

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

              {/* Image previews */}
              {images.length > 0 && (
                <div className={`grid gap-1.5 rounded-2xl overflow-hidden border border-border/30 ${
                  images.length === 1 ? "grid-cols-1" : "grid-cols-2"
                }`}>
                  {images.map((img, i) => (
                    <div key={i} className="relative overflow-hidden group/img">
                      <img
                        src={img.preview}
                        alt=""
                        className="w-full object-cover"
                        style={{ maxHeight: images.length === 1 ? "320px" : "160px" }}
                      />
                      <button
                        onClick={() => removeImage(i)}
                        className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity hover:bg-black/80"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {isFocused && (
                <div className="flex items-center justify-between border-t border-border/40 pt-3">
                  <div className="flex items-center gap-1">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={handleImageSelect}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-8 h-8 text-primary rounded-full hover:bg-primary/10"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={images.length >= 4}
                    >
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
                      disabled={!canPost}
                      size="sm"
                      className="rounded-full px-5 font-bold h-8 text-sm"
                    >
                      {isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : t.post}
                    </Button>
                  </div>
                </div>
              )}

              {!isFocused && (
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-1">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={handleImageSelect}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-8 h-8 text-primary rounded-full hover:bg-primary/10"
                      onClick={() => { setIsFocused(true); fileInputRef.current?.click(); }}
                    >
                      <ImageIcon className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="w-8 h-8 text-primary rounded-full hover:bg-primary/10">
                      <Hash className="w-4 h-4" />
                    </Button>
                  </div>
                  <Button
                    onClick={handlePost}
                    disabled={!canPost}
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

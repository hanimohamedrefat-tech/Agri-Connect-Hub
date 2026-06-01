import { useState, useRef } from "react";
import { useCreateStory, useGetMe, getGetStoriesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ImageIcon, Loader2, X, Plus } from "lucide-react";
import { getToken } from "@/lib/auth";

interface StoryCreatorProps {
  onClose: () => void;
}

export function StoryCreator({ onClose }: StoryCreatorProps) {
  const { data: me } = useGetMe();
  const createMutation = useCreateStory();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    e.target.value = "";
  };

  const handlePost = async () => {
    if (!file) return;
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("images", file);
      const token = getToken();
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json() as { urls: string[] };
      const imageUrl = data.urls[0];

      createMutation.mutate(
        { data: { imageUrl, caption: caption.trim() || undefined } },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getGetStoriesQueryKey() });
            onClose();
          },
          onSettled: () => setIsUploading(false),
        },
      );
    } catch {
      setIsUploading(false);
    }
  };

  const isPending = isUploading || createMutation.isPending;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" dir="rtl">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
          <div className="flex items-center gap-3">
            <Avatar className="w-8 h-8">
              <AvatarImage src={me?.avatar ?? ""} />
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                {me?.displayName?.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <span className="font-bold text-sm">{me?.displayName}</span>
          </div>
          <Button variant="ghost" size="icon" className="w-8 h-8 rounded-full" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Image area */}
        <div className="relative bg-muted/30 min-h-[300px] flex items-center justify-center">
          {preview ? (
            <>
              <img src={preview} alt="preview" className="w-full max-h-[350px] object-contain" />
              <button
                onClick={() => { setPreview(null); setFile(null); }}
                className="absolute top-3 left-3 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center gap-3 text-muted-foreground hover:text-primary transition-colors p-8"
            >
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <ImageIcon className="w-8 h-8 text-primary/70" />
              </div>
              <span className="text-sm font-medium">اختر صورة لقصتك</span>
              <span className="text-xs text-muted-foreground/60">تختفي بعد 24 ساعة</span>
            </button>
          )}
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
        </div>

        {/* Caption input */}
        {preview && (
          <div className="px-4 py-3 border-t border-border/30">
            <Input
              value={caption}
              onChange={e => setCaption(e.target.value)}
              placeholder="أضف وصفاً للقصة... (اختياري)"
              className="text-sm border-0 bg-muted/30 focus-visible:ring-0"
              maxLength={150}
              dir="rtl"
            />
          </div>
        )}

        {/* Footer */}
        <div className="px-4 py-3 border-t border-border/30 flex items-center gap-3">
          <Button variant="ghost" className="flex-1 rounded-xl" onClick={onClose} disabled={isPending}>
            إلغاء
          </Button>
          <Button
            className="flex-1 rounded-xl gap-2"
            disabled={!preview || isPending}
            onClick={handlePost}
          >
            {isPending
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <><Plus className="w-4 h-4" />نشر القصة</>}
          </Button>
        </div>
      </div>
    </div>
  );
}

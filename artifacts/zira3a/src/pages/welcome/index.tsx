import { useState, useRef } from "react";
import { useGetMe, useUpdateProfile, getGetMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Camera, ArrowLeft, Leaf, CheckCircle2 } from "lucide-react";
import { getToken } from "@/lib/auth";
import { ZiraLogo } from "@/components/ZiraLogo";

async function uploadFile(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("images", file);
  const token = getToken();
  const res = await fetch("/api/upload", {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  if (!res.ok) throw new Error("Upload failed");
  const data = await res.json();
  return data.urls[0] as string;
}

const TIPS = [
  "تواصل مع آلاف المزارعين والمهندسين الزراعيين",
  "شارك تجاربك وأسئلتك في مجال الزراعة",
  "تابع آخر الأخبار والتقنيات الزراعية",
  "انضم إلى اجتماعات ونقاشات متخصصة",
];

export default function WelcomePage() {
  const queryClient = useQueryClient();
  const { data: user, isLoading } = useGetMe();
  const updateProfile = useUpdateProfile();

  const [avatar, setAvatar] = useState<string>("");
  const [bio, setBio] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tipIdx] = useState(() => Math.floor(Math.random() * TIPS.length));

  const avatarInputRef = useRef<HTMLInputElement>(null);

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );
  if (!user) { window.location.href = "/"; return null; }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadFile(file);
      setAvatar(url);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile.mutateAsync({
        username: user.username,
        data: {
          ...(avatar && { avatar }),
          ...(bio.trim() && { bio: bio.trim() }),
        },
      });
      await queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
    } finally {
      setSaving(false);
      window.location.href = "/feed";
    }
  };

  const handleSkip = () => {
    window.location.href = "/feed";
  };

  const displayAvatar = avatar || user.avatar || "";
  const initials = user.displayName?.charAt(0) ?? user.username?.charAt(0) ?? "؟";

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/5 flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 pt-5">
        <div className="flex items-center gap-2 text-primary">
          <ZiraLogo size={32} />
          <span className="font-black text-lg">زراعة.كوم</span>
        </div>
        <button
          onClick={handleSkip}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
        >
          تخطى
          <ArrowLeft className="w-4 h-4" />
        </button>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        <div className="w-full max-w-md space-y-8">

          {/* Welcome header */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-1.5 text-sm font-semibold mb-3">
              <Leaf className="w-4 h-4" />
              أهلاً بك في عائلة زراعة!
            </div>
            <h1 className="text-2xl font-black text-foreground leading-tight">
              مرحباً، {user.displayName} 👋
            </h1>
            <p className="text-muted-foreground text-sm max-w-xs mx-auto">
              أكمل ملفك الشخصي لتعريف مجتمعنا الزراعي بك
            </p>
          </div>

          {/* Avatar upload */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              <Avatar className="w-28 h-28 border-4 border-background shadow-xl ring-2 ring-primary/20">
                <AvatarImage src={displayAvatar} />
                <AvatarFallback className="text-3xl font-black bg-primary/10 text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>

              <button
                onClick={() => avatarInputRef.current?.click()}
                disabled={uploading}
                className="absolute -bottom-1 -left-1 w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:bg-primary/90 transition-colors border-2 border-background"
              >
                {uploading
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <Camera className="w-4 h-4" />
                }
              </button>
            </div>

            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />

            <button
              onClick={() => avatarInputRef.current?.click()}
              disabled={uploading}
              className="text-sm text-primary font-semibold hover:text-primary/80 transition-colors"
            >
              {uploading ? "جاري الرفع..." : avatar ? "تغيير الصورة" : "إضافة صورة شخصية"}
            </button>
          </div>

          {/* Bio */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-foreground block">
              نبذة عنك
              <span className="text-muted-foreground font-normal me-1"> (اختياري)</span>
            </label>
            <Textarea
              placeholder="مثال: مزارع من المنوفية، متخصص في زراعة الحبوب والخضروات منذ ١٥ عاماً..."
              value={bio}
              onChange={e => setBio(e.target.value)}
              maxLength={200}
              rows={3}
              className="resize-none text-sm leading-relaxed"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>اكتب جملة أو جملتين تعرّف بها نفسك</span>
              <span>{bio.length}/200</span>
            </div>
          </div>

          {/* Tip card */}
          <div className="rounded-xl bg-primary/8 border border-primary/15 p-4 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <p className="text-sm text-foreground/80">{TIPS[tipIdx]}</p>
          </div>

          {/* Actions */}
          <div className="space-y-3 pt-1">
            <Button
              onClick={handleSave}
              disabled={saving || uploading}
              className="w-full h-12 text-base font-bold"
            >
              {saving
                ? <><Loader2 className="w-4 h-4 animate-spin me-2" />جاري الحفظ...</>
                : "ابدأ رحلتك الزراعية 🌱"
              }
            </Button>
            <button
              onClick={handleSkip}
              className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
            >
              تخطى وأكمل لاحقاً
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

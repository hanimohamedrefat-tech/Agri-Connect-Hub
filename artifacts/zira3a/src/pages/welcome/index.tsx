import { useState, useRef } from "react";
import {
  useGetMe,
  useUpdateProfile,
  useGetSuggestedUsers,
  useFollowUser,
  getGetMeQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Loader2,
  Camera,
  ArrowLeft,
  Leaf,
  CheckCircle2,
  UserPlus,
  Check,
  ChevronLeft,
} from "lucide-react";
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

const STEPS = ["الملف الشخصي", "تابع مزارعين"];

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-2 justify-center">
      {STEPS.map((label, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                i < current
                  ? "bg-primary text-primary-foreground"
                  : i === current
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {i < current ? <Check className="w-3.5 h-3.5" /> : i + 1}
            </div>
            <span
              className={`text-xs font-semibold hidden sm:block ${
                i === current ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              {label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div
              className={`w-8 h-0.5 rounded-full transition-colors ${
                i < current ? "bg-primary" : "bg-muted"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function FollowCard({
  user,
  followed,
  onToggle,
  loading,
}: {
  user: { username: string; displayName: string; avatar?: string | null; bio?: string | null; specialty?: string | null };
  followed: boolean;
  onToggle: () => void;
  loading: boolean;
}) {
  const initials = user.displayName?.charAt(0) ?? user.username?.charAt(0) ?? "؟";
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-border hover:border-primary/30 hover:bg-primary/4 transition-all">
      <Avatar className="w-11 h-11 shrink-0">
        <AvatarImage src={user.avatar ?? undefined} />
        <AvatarFallback className="text-sm font-bold bg-primary/10 text-primary">
          {initials}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm text-foreground truncate">{user.displayName}</p>
        <p className="text-xs text-muted-foreground truncate">
          {user.specialty ?? user.bio ?? `@${user.username}`}
        </p>
      </div>
      <button
        onClick={onToggle}
        disabled={loading}
        className={`shrink-0 flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border transition-all ${
          followed
            ? "bg-primary/10 text-primary border-primary/30"
            : "bg-primary text-primary-foreground border-transparent hover:bg-primary/90"
        }`}
      >
        {loading ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : followed ? (
          <><Check className="w-3 h-3" /> يُتابَع</>
        ) : (
          <><UserPlus className="w-3 h-3" /> تابع</>
        )}
      </button>
    </div>
  );
}

export default function WelcomePage() {
  const queryClient = useQueryClient();
  const { data: user, isLoading } = useGetMe();
  const updateProfile = useUpdateProfile();
  const { data: suggested = [], isLoading: loadingSuggested } = useGetSuggestedUsers();
  const followMutation = useFollowUser();

  const [step, setStep] = useState(0);
  const [avatar, setAvatar] = useState<string>("");
  const [bio, setBio] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [followed, setFollowed] = useState<Set<string>>(new Set());
  const [followingNow, setFollowingNow] = useState<Set<string>>(new Set());

  const avatarInputRef = useRef<HTMLInputElement>(null);

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );
  if (!user) { window.location.href = "/"; return null; }

  const displayAvatar = avatar || user.avatar || "";
  const initials = user.displayName?.charAt(0) ?? user.username?.charAt(0) ?? "؟";

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

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      if (avatar || bio.trim()) {
        await updateProfile.mutateAsync({
          username: user.username,
          data: {
            ...(avatar && { avatar }),
            ...(bio.trim() && { bio: bio.trim() }),
          },
        });
        await queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
      }
    } finally {
      setSaving(false);
      setStep(1);
    }
  };

  const handleToggleFollow = async (username: string) => {
    setFollowingNow(prev => new Set(prev).add(username));
    try {
      await followMutation.mutateAsync({ username });
      setFollowed(prev => {
        const next = new Set(prev);
        if (next.has(username)) next.delete(username);
        else next.add(username);
        return next;
      });
    } finally {
      setFollowingNow(prev => { const n = new Set(prev); n.delete(username); return n; });
    }
  };

  const handleFinish = () => {
    window.location.href = "/feed";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/5 flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 pt-5">
        <div className="flex items-center gap-2 text-primary">
          <ZiraLogo size={32} />
          <span className="font-black text-lg">زراعة.كوم</span>
        </div>
        <button
          onClick={handleFinish}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
        >
          تخطى
          <ArrowLeft className="w-4 h-4" />
        </button>
      </div>

      {/* Step indicator */}
      <div className="pt-6 pb-2">
        <StepIndicator current={step} />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-6">
        <div className="w-full max-w-md space-y-6">

          {/* ─── STEP 0: Profile ─── */}
          {step === 0 && (
            <>
              <div className="text-center space-y-2">
                <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-1.5 text-sm font-semibold mb-3">
                  <Leaf className="w-4 h-4" />
                  أهلاً بك في عائلة زراعة!
                </div>
                <h1 className="text-2xl font-black text-foreground">
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
                  <span>جملة أو جملتان تعرّف بها نفسك</span>
                  <span>{bio.length}/200</span>
                </div>
              </div>

              {/* Tip */}
              <div className="rounded-xl bg-primary/8 border border-primary/15 p-4 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <p className="text-sm text-foreground/80">
                  المزارعون الذين يكملون ملفاتهم يحصلون على ضعف التفاعل!
                </p>
              </div>

              <div className="space-y-3 pt-1">
                <Button
                  onClick={handleSaveProfile}
                  disabled={saving || uploading}
                  className="w-full h-12 text-base font-bold"
                >
                  {saving
                    ? <><Loader2 className="w-4 h-4 animate-spin me-2" />جاري الحفظ...</>
                    : "التالي — تابع مزارعين 🌿"
                  }
                </Button>
                <button
                  onClick={() => setStep(1)}
                  className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
                >
                  تخطى هذه الخطوة
                </button>
              </div>
            </>
          )}

          {/* ─── STEP 1: Follow suggestions ─── */}
          {step === 1 && (
            <>
              <div className="text-center space-y-2">
                <div className="inline-flex items-center gap-2 bg-secondary/15 text-secondary-foreground rounded-full px-4 py-1.5 text-sm font-semibold mb-3">
                  <UserPlus className="w-4 h-4" />
                  اكتشف مجتمعك الزراعي
                </div>
                <h1 className="text-2xl font-black text-foreground">
                  تابع مزارعين مميزين 🌾
                </h1>
                <p className="text-muted-foreground text-sm max-w-xs mx-auto">
                  اختر من تريد متابعته ليظهر في فيدك مباشرةً
                </p>
              </div>

              {/* Suggested users */}
              <div className="space-y-2.5">
                {loadingSuggested ? (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : suggested.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    لا توجد اقتراحات الآن
                  </div>
                ) : (
                  suggested.slice(0, 6).map(u => (
                    <FollowCard
                      key={u.username}
                      user={u}
                      followed={followed.has(u.username)}
                      loading={followingNow.has(u.username)}
                      onToggle={() => handleToggleFollow(u.username)}
                    />
                  ))
                )}
              </div>

              {followed.size > 0 && (
                <div className="rounded-xl bg-primary/8 border border-primary/15 p-3 flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                  <p className="text-sm text-foreground/80 font-semibold">
                    رائع! تتابع الآن {followed.size} {followed.size === 1 ? "شخصاً" : "أشخاص"}
                  </p>
                </div>
              )}

              <div className="space-y-3 pt-1">
                <Button
                  onClick={handleFinish}
                  className="w-full h-12 text-base font-bold"
                >
                  ابدأ رحلتك في زراعة 🌱
                </Button>
                <button
                  onClick={() => setStep(0)}
                  className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors py-2 flex items-center justify-center gap-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                  رجوع
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

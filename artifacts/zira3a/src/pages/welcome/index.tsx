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
  Loader2, Camera, ArrowLeft, Leaf, CheckCircle2,
  UserPlus, Check, ChevronLeft, Hash,
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

const STEPS = ["ملفك الشخصي", "تابع مزارعين", "اهتماماتك"];

const HASHTAG_OPTIONS = [
  { tag: "قمح",       emoji: "🌾" },
  { tag: "ذرة",       emoji: "🌽" },
  { tag: "أرز",       emoji: "🍚" },
  { tag: "خضروات",    emoji: "🥦" },
  { tag: "فاكهة",     emoji: "🍊" },
  { tag: "زيتون",     emoji: "🫒" },
  { tag: "تمور",      emoji: "🌴" },
  { tag: "ري",        emoji: "💧" },
  { tag: "أسمدة",     emoji: "🧪" },
  { tag: "آفات",      emoji: "🐛" },
  { tag: "دواجن",     emoji: "🐔" },
  { tag: "مواشي",     emoji: "🐄" },
  { tag: "أسماك",     emoji: "🐟" },
  { tag: "بيوت_محمية", emoji: "🏡" },
  { tag: "زراعة_عضوية", emoji: "🌿" },
  { tag: "ميكنة",     emoji: "🚜" },
];

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-2 justify-center">
      {STEPS.map((label, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
              i < current ? "bg-primary text-primary-foreground"
              : i === current ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground"
            }`}>
              {i < current ? <Check className="w-3.5 h-3.5" /> : i + 1}
            </div>
            <span className={`text-xs font-semibold hidden sm:block ${i === current ? "text-foreground" : "text-muted-foreground"}`}>
              {label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={`w-6 h-0.5 rounded-full transition-colors ${i < current ? "bg-primary" : "bg-muted"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

function FollowCard({ user, followed, onToggle, loading }: {
  user: { username: string; displayName: string; avatar?: string | null; bio?: string | null; specialty?: string | null };
  followed: boolean; onToggle: () => void; loading: boolean;
}) {
  const initials = user.displayName?.charAt(0) ?? user.username?.charAt(0) ?? "؟";
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-border hover:border-primary/30 hover:bg-primary/4 transition-all">
      <Avatar className="w-11 h-11 shrink-0">
        <AvatarImage src={user.avatar ?? undefined} />
        <AvatarFallback className="text-sm font-bold bg-primary/10 text-primary">{initials}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm text-foreground truncate">{user.displayName}</p>
        <p className="text-xs text-muted-foreground truncate">{user.specialty ?? user.bio ?? `@${user.username}`}</p>
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
        {loading ? <Loader2 className="w-3 h-3 animate-spin" />
          : followed ? <><Check className="w-3 h-3" /> يُتابَع</>
          : <><UserPlus className="w-3 h-3" /> تابع</>}
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

  // Step 0 state
  const [avatar, setAvatar] = useState("");
  const [bio, setBio] = useState("");
  const [uploading, setUploading] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Step 1 state
  const [followed, setFollowed] = useState<Set<string>>(new Set());
  const [followingNow, setFollowingNow] = useState<Set<string>>(new Set());

  // Step 2 state
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [savingInterests, setSavingInterests] = useState(false);

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
    try { const url = await uploadFile(file); setAvatar(url); }
    finally { setUploading(false); }
  };

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      if (avatar || bio.trim()) {
        await updateProfile.mutateAsync({
          username: user.username,
          data: { ...(avatar && { avatar }), ...(bio.trim() && { bio: bio.trim() }) },
        });
        await queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
      }
    } finally {
      setSavingProfile(false);
      setStep(1);
    }
  };

  const handleToggleFollow = async (username: string) => {
    setFollowingNow(prev => new Set(prev).add(username));
    try {
      await followMutation.mutateAsync({ username });
      setFollowed(prev => {
        const next = new Set(prev);
        if (next.has(username)) next.delete(username); else next.add(username);
        return next;
      });
    } finally {
      setFollowingNow(prev => { const n = new Set(prev); n.delete(username); return n; });
    }
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag); else next.add(tag);
      return next;
    });
  };

  const handleSaveInterests = async () => {
    setSavingInterests(true);
    try {
      if (selectedTags.size > 0) {
        await updateProfile.mutateAsync({
          username: user.username,
          data: { interests: Array.from(selectedTags) },
        });
        await queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
      }
    } finally {
      setSavingInterests(false);
      window.location.href = "/feed";
    }
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
          onClick={() => { window.location.href = "/feed"; }}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
        >
          تخطى الكل
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
                <h1 className="text-2xl font-black text-foreground">مرحباً، {user.displayName} 👋</h1>
                <p className="text-muted-foreground text-sm max-w-xs mx-auto">أكمل ملفك الشخصي لتعريف مجتمعنا الزراعي بك</p>
              </div>

              <div className="flex flex-col items-center gap-3">
                <div className="relative">
                  <Avatar className="w-28 h-28 border-4 border-background shadow-xl ring-2 ring-primary/20">
                    <AvatarImage src={displayAvatar} />
                    <AvatarFallback className="text-3xl font-black bg-primary/10 text-primary">{initials}</AvatarFallback>
                  </Avatar>
                  <button
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={uploading}
                    className="absolute -bottom-1 -left-1 w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:bg-primary/90 transition-colors border-2 border-background"
                  >
                    {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                  </button>
                </div>
                <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                <button onClick={() => avatarInputRef.current?.click()} disabled={uploading}
                  className="text-sm text-primary font-semibold hover:text-primary/80 transition-colors">
                  {uploading ? "جاري الرفع..." : avatar ? "تغيير الصورة" : "إضافة صورة شخصية"}
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-foreground block">
                  نبذة عنك<span className="text-muted-foreground font-normal me-1"> (اختياري)</span>
                </label>
                <Textarea
                  placeholder="مثال: مزارع من المنوفية، متخصص في زراعة الحبوب والخضروات منذ ١٥ عاماً..."
                  value={bio} onChange={e => setBio(e.target.value)} maxLength={200} rows={3}
                  className="resize-none text-sm leading-relaxed"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>جملة أو جملتان تعرّف بها نفسك</span>
                  <span>{bio.length}/200</span>
                </div>
              </div>

              <div className="rounded-xl bg-primary/8 border border-primary/15 p-4 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <p className="text-sm text-foreground/80">المزارعون الذين يكملون ملفاتهم يحصلون على ضعف التفاعل!</p>
              </div>

              <div className="space-y-3 pt-1">
                <Button onClick={handleSaveProfile} disabled={savingProfile || uploading} className="w-full h-12 text-base font-bold">
                  {savingProfile
                    ? <><Loader2 className="w-4 h-4 animate-spin me-2" />جاري الحفظ...</>
                    : "التالي — تابع مزارعين 🌿"}
                </Button>
                <button onClick={() => setStep(1)} className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors py-2">
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
                <h1 className="text-2xl font-black text-foreground">تابع مزارعين مميزين 🌾</h1>
                <p className="text-muted-foreground text-sm max-w-xs mx-auto">اختر من تريد متابعته ليظهر في فيدك مباشرةً</p>
              </div>

              <div className="space-y-2.5">
                {loadingSuggested ? (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : suggested.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">لا توجد اقتراحات الآن</div>
                ) : suggested.slice(0, 6).map(u => (
                  <FollowCard key={u.username} user={u}
                    followed={followed.has(u.username)} loading={followingNow.has(u.username)}
                    onToggle={() => handleToggleFollow(u.username)} />
                ))}
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
                <Button onClick={() => setStep(2)} className="w-full h-12 text-base font-bold">
                  التالي — اختر اهتماماتك #
                </Button>
                <button onClick={() => setStep(0)}
                  className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors py-2 flex items-center justify-center gap-1">
                  <ChevronLeft className="w-4 h-4" />رجوع
                </button>
              </div>
            </>
          )}

          {/* ─── STEP 2: Hashtag interests ─── */}
          {step === 2 && (
            <>
              <div className="text-center space-y-2">
                <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-1.5 text-sm font-semibold mb-3">
                  <Hash className="w-4 h-4" />
                  خصّص فيدك الزراعي
                </div>
                <h1 className="text-2xl font-black text-foreground">ما الذي يهمّك؟ 🌱</h1>
                <p className="text-muted-foreground text-sm max-w-xs mx-auto">
                  اختر المواضيع التي تهمّك وسيظهر ما يخصّها في أعلى فيدك
                </p>
              </div>

              {/* Hashtag grid */}
              <div className="flex flex-wrap gap-2.5 justify-center">
                {HASHTAG_OPTIONS.map(({ tag, emoji }) => {
                  const active = selectedTags.has(tag);
                  return (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full border text-sm font-semibold transition-all ${
                        active
                          ? "bg-primary text-primary-foreground border-primary shadow-md scale-105"
                          : "bg-background text-foreground border-border hover:border-primary/50 hover:bg-primary/5"
                      }`}
                    >
                      <span>{emoji}</span>
                      <span>#{tag}</span>
                      {active && <Check className="w-3.5 h-3.5" />}
                    </button>
                  );
                })}
              </div>

              {selectedTags.size > 0 && (
                <div className="rounded-xl bg-primary/8 border border-primary/15 p-3 flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                  <p className="text-sm text-foreground/80 font-semibold">
                    اخترت {selectedTags.size} {selectedTags.size === 1 ? "موضوع" : "مواضيع"} — ممتاز!
                  </p>
                </div>
              )}

              <div className="space-y-3 pt-1">
                <Button
                  onClick={handleSaveInterests}
                  disabled={savingInterests}
                  className="w-full h-12 text-base font-bold"
                >
                  {savingInterests
                    ? <><Loader2 className="w-4 h-4 animate-spin me-2" />جاري الحفظ...</>
                    : selectedTags.size > 0 ? "ابدأ رحلتك في زراعة 🌱" : "تخطى وابدأ الآن"}
                </Button>
                <button onClick={() => setStep(1)}
                  className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors py-2 flex items-center justify-center gap-1">
                  <ChevronLeft className="w-4 h-4" />رجوع
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

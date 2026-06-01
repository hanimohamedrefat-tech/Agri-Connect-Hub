import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { useLogin, useRegister, useGetMe, useSendOtp, useVerifyOtp } from "@workspace/api-client-react";
import { setToken } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, ArrowRight, ArrowLeft, Eye, EyeOff, ChevronDown } from "lucide-react";

// ── Logo SVG ──────────────────────────────────────────────────────────────
function ZiraLogo({ size = 48 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="23" fill="currentColor" fillOpacity="0.1" />
      <line x1="24" y1="40" x2="24" y2="14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <ellipse cx="24" cy="11" rx="4" ry="5.5" fill="currentColor" />
      <ellipse cx="18.5" cy="16.5" rx="3.2" ry="4.5" fill="currentColor" transform="rotate(-25 18.5 16.5)" />
      <ellipse cx="29.5" cy="16.5" rx="3.2" ry="4.5" fill="currentColor" transform="rotate(25 29.5 16.5)" />
      <ellipse cx="19.5" cy="22" rx="2.8" ry="4" fill="currentColor" transform="rotate(-30 19.5 22)" />
      <ellipse cx="28.5" cy="22" rx="2.8" ry="4" fill="currentColor" transform="rotate(30 28.5 22)" />
      <path d="M20 40 Q24 37 28 40" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" fill="none" />
    </svg>
  );
}

// ── OTP Input (6 boxes) ───────────────────────────────────────────────────
function OtpInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length: 6 }, (_, i) => value[i] ?? "");

  const handleChange = (i: number, raw: string) => {
    const digit = raw.replace(/\D/g, "").slice(-1);
    const arr = [...digits];
    arr[i] = digit;
    onChange(arr.join(""));
    if (digit && i < 5) refs.current[i + 1]?.focus();
  };

  const handleKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      refs.current[i - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    onChange(pasted.padEnd(6, "").slice(0, 6));
    refs.current[Math.min(pasted.length, 5)]?.focus();
    e.preventDefault();
  };

  return (
    <div className="flex gap-2 justify-center" dir="ltr">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={el => { refs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={d}
          onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKey(i, e)}
          onPaste={handlePaste}
          className="w-11 h-14 text-center text-xl font-bold rounded-xl border-2 border-border bg-muted/30 focus:border-primary focus:bg-background focus:outline-none transition-colors text-foreground"
        />
      ))}
    </div>
  );
}

const SPECIALTIES = [
  "مزارع", "مهندس زراعي", "مهندس ري", "باحث زراعي",
  "بيطري", "تاجر منتجات زراعية", "مستشار زراعي",
  "طالب زراعة", "صاحب مشروع زراعي", "أخرى",
];

type Step = "identifier" | "otp" | "password" | "register";

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const { data: user, isLoading: checkingAuth } = useGetMe();
  const loginMutation = useLogin();
  const registerMutation = useRegister();
  const sendOtpMutation = useSendOtp();
  const verifyOtpMutation = useVerifyOtp();

  const [step, setStep] = useState<Step>("identifier");
  const [identifier, setIdentifier] = useState("");
  const [otp, setOtp] = useState("");
  const [demoCode, setDemoCode] = useState<string | null>(null);
  const [userExists, setUserExists] = useState(false);
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [error, setError] = useState("");
  const [showClassic, setShowClassic] = useState(false);

  // Register
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [showRegPass, setShowRegPass] = useState(false);

  // Classic login
  const [classicEmail, setClassicEmail] = useState("");
  const [classicPass, setClassicPass] = useState("");
  const [showClassicPass, setShowClassicPass] = useState(false);

  useEffect(() => {
    if (!checkingAuth && user) setLocation("/feed");
  }, [user, checkingAuth, setLocation]);

  const submitOtp = useCallback((code: string) => {
    if (code.replace(/\s/g, "").length < 6) return;
    setOtpError("");
    verifyOtpMutation.mutate(
      { data: { emailOrPhone: identifier.trim(), otp: code.trim() } },
      {
        onSuccess: (res) => {
          if (!res.valid) { setOtpError("الكود غير صحيح، حاول مجدداً"); return; }
          setStep(userExists ? "password" : "register");
        },
        onError: () => setOtpError("الكود غير صحيح أو منتهي الصلاحية"),
      },
    );
  }, [identifier, userExists, verifyOtpMutation]);

  // Auto-submit OTP on 6 digits
  useEffect(() => {
    if (step === "otp" && otp.length === 6 && !otp.includes(" ")) {
      submitOtp(otp);
    }
  }, [otp, step, submitOtp]);

  if (checkingAuth) return null;
  if (user) return null;

  const isPhone = /^[+\d]/.test(identifier) && !identifier.includes("@");

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) return;
    setError("");
    sendOtpMutation.mutate(
      { data: { emailOrPhone: identifier.trim() } },
      {
        onSuccess: (res) => {
          setUserExists(res.userExists);
          setDemoCode(res.demoCode ?? null);
          setOtp("");
          setStep("otp");
        },
        onError: () => setError("حدث خطأ، حاول مجدداً"),
      },
    );
  };

  const handlePasswordLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    loginMutation.mutate(
      { data: { email: identifier.trim(), password } },
      {
        onSuccess: (res) => { setToken(res.token); window.location.href = "/feed"; },
        onError: () => setError("كلمة المرور غير صحيحة"),
      },
    );
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const emailVal = isPhone ? `${Date.now()}@zira3a.app` : identifier.trim();
    const phoneVal = isPhone ? identifier.trim() : undefined;
    registerMutation.mutate(
      { data: { email: emailVal, username: username.trim(), password: regPassword, displayName: displayName.trim(), specialty: specialty || undefined, phone: phoneVal } },
      {
        onSuccess: (res) => { setToken(res.token); window.location.href = "/feed"; },
        onError: (err: unknown) => {
          const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
          setError(msg ?? "حدث خطأ، حاول مجدداً");
        },
      },
    );
  };

  const handleClassicLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    loginMutation.mutate(
      { data: { email: classicEmail, password: classicPass } },
      {
        onSuccess: (res) => { setToken(res.token); window.location.href = "/feed"; },
        onError: () => setError("البريد أو كلمة المرور غير صحيحة"),
      },
    );
  };

  return (
    <div className="min-h-screen bg-background flex flex-col" dir="rtl">
      {/* Background glows */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-primary/8 rounded-full blur-3xl" />
        <div className="absolute bottom-0 -left-16 w-64 h-64 bg-emerald-500/5 rounded-full blur-2xl" />
      </div>

      <div className="relative z-10 flex flex-col min-h-screen">

        {/* Header */}
        <div className="flex items-center gap-3 px-6 pt-8 pb-4">
          <div className="text-primary"><ZiraLogo size={46} /></div>
          <div>
            <div className="text-xl font-black text-primary leading-none tracking-tight">زراعة.كوم</div>
            <div className="text-xs text-muted-foreground/80 leading-none mt-1 font-medium">عالم الزراعة</div>
          </div>
        </div>

        <div className="flex-1 flex flex-col justify-center px-6 pb-10 max-w-md mx-auto w-full">

          {/* ── IDENTIFIER ── */}
          {step === "identifier" && !showClassic && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div>
                <h1 className="text-3xl font-black text-foreground mb-2">أهلاً بك 👋</h1>
                <p className="text-muted-foreground">سجّل دخولك أو أنشئ حساباً جديداً</p>
              </div>

              <form onSubmit={handleSendOtp} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-foreground">البريد الإلكتروني أو رقم الهاتف</label>
                  <Input
                    type="text"
                    inputMode="email"
                    placeholder="example@email.com أو 01xxxxxxxxx"
                    value={identifier}
                    onChange={e => { setIdentifier(e.target.value); setError(""); }}
                    className="h-12 text-sm rounded-xl border-border/60 bg-muted/20"
                    autoFocus
                    dir="ltr"
                  />
                  {error && <p className="text-sm text-destructive">{error}</p>}
                </div>
                <Button type="submit" className="w-full h-12 font-bold rounded-xl gap-2" disabled={!identifier.trim() || sendOtpMutation.isPending}>
                  {sendOtpMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <>متابعة <ArrowLeft className="w-4 h-4" /></>}
                </Button>
              </form>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-border/50" />
                <span className="text-xs text-muted-foreground">أو</span>
                <div className="flex-1 h-px bg-border/50" />
              </div>

              <button
                onClick={() => { setShowClassic(true); setError(""); }}
                className="w-full h-12 rounded-xl border border-border/60 text-sm font-medium text-muted-foreground hover:text-foreground hover:border-border transition-colors"
              >
                تسجيل الدخول بكلمة المرور
              </button>
            </div>
          )}

          {/* ── CLASSIC LOGIN ── */}
          {step === "identifier" && showClassic && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <button onClick={() => { setShowClassic(false); setError(""); }} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <ArrowRight className="w-4 h-4" /> رجوع
              </button>
              <div>
                <h1 className="text-2xl font-black mb-1">تسجيل الدخول</h1>
                <p className="text-sm text-muted-foreground">ادخل بريدك وكلمة مرورك</p>
              </div>
              <form onSubmit={handleClassicLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold">البريد الإلكتروني</label>
                  <Input type="email" value={classicEmail} onChange={e => setClassicEmail(e.target.value)} className="h-12 rounded-xl bg-muted/20" placeholder="example@email.com" dir="ltr" autoFocus />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold">كلمة المرور</label>
                  <div className="relative">
                    <Input type={showClassicPass ? "text" : "password"} value={classicPass} onChange={e => setClassicPass(e.target.value)} className="h-12 rounded-xl bg-muted/20 pe-10" placeholder="••••••••" />
                    <button type="button" onClick={() => setShowClassicPass(v => !v)} className="absolute inset-y-0 left-3 flex items-center text-muted-foreground hover:text-foreground">
                      {showClassicPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button type="submit" className="w-full h-12 font-bold rounded-xl" disabled={loginMutation.isPending}>
                  {loginMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "دخول"}
                </Button>
              </form>
            </div>
          )}

          {/* ── OTP ── */}
          {step === "otp" && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <button onClick={() => { setStep("identifier"); setOtp(""); setDemoCode(null); setOtpError(""); }} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <ArrowRight className="w-4 h-4" /> رجوع
              </button>
              <div>
                <h1 className="text-2xl font-black mb-2">تحقق من هويتك 🔐</h1>
                <p className="text-sm text-muted-foreground">
                  أرسلنا كود التحقق إلى <span className="font-bold text-foreground" dir="ltr">{identifier}</span>
                </p>
              </div>

              {demoCode && (
                <div className="rounded-xl border border-border/40 bg-muted/30 px-4 py-3 text-center">
                  <p className="text-xs text-muted-foreground mb-1">كودك هو</p>
                  <p className="text-3xl font-black tracking-[0.3em] text-foreground font-mono" dir="ltr">{demoCode}</p>
                </div>
              )}

              <div className="space-y-5">
                <OtpInput value={otp} onChange={v => { setOtp(v); setOtpError(""); }} />
                {otpError && <p className="text-sm text-destructive text-center">{otpError}</p>}
                <Button
                  className="w-full h-12 font-bold rounded-xl"
                  onClick={() => submitOtp(otp)}
                  disabled={otp.length < 6 || verifyOtpMutation.isPending}
                >
                  {verifyOtpMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "تأكيد الكود"}
                </Button>
              </div>

              <button
                className="w-full text-sm text-muted-foreground text-center hover:text-foreground transition-colors"
                onClick={() => sendOtpMutation.mutate({ data: { emailOrPhone: identifier } }, { onSuccess: r => setDemoCode(r.demoCode ?? null) })}
                disabled={sendOtpMutation.isPending}
              >
                لم تستلم الكود؟ <span className="text-primary font-semibold">أعد الإرسال</span>
              </button>
            </div>
          )}

          {/* ── PASSWORD (existing user) ── */}
          {step === "password" && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <button onClick={() => setStep("identifier")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <ArrowRight className="w-4 h-4" /> رجوع
              </button>
              <div>
                <h1 className="text-2xl font-black mb-2">مرحباً بعودتك 🌿</h1>
                <p className="text-sm text-muted-foreground">أدخل كلمة مرورك للدخول</p>
              </div>
              <form onSubmit={handlePasswordLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold">كلمة المرور</label>
                  <div className="relative">
                    <Input type={showPass ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} className="h-12 rounded-xl bg-muted/20 pe-10" placeholder="••••••••" autoFocus />
                    <button type="button" onClick={() => setShowPass(v => !v)} className="absolute inset-y-0 left-3 flex items-center text-muted-foreground hover:text-foreground">
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button type="submit" className="w-full h-12 font-bold rounded-xl" disabled={!password || loginMutation.isPending}>
                  {loginMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "دخول"}
                </Button>
              </form>
            </div>
          )}

          {/* ── REGISTER ── */}
          {step === "register" && (
            <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div>
                <h1 className="text-2xl font-black mb-1">أنشئ حسابك 🌱</h1>
                <p className="text-sm text-muted-foreground">أكمل بياناتك للانضمام إلى مجتمع زراعة</p>
              </div>
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold">الاسم الكامل</label>
                  <Input value={displayName} onChange={e => setDisplayName(e.target.value)} className="h-12 rounded-xl bg-muted/20" placeholder="اسمك الكامل" required autoFocus />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold">اسم المستخدم</label>
                  <div className="relative">
                    <Input
                      value={username}
                      onChange={e => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, "").toLowerCase())}
                      className="h-12 rounded-xl bg-muted/20 ps-8"
                      placeholder="username"
                      dir="ltr"
                      required
                    />
                    <span className="absolute inset-y-0 right-3 flex items-center text-muted-foreground font-bold text-sm">@</span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold">التخصص <span className="text-muted-foreground font-normal">(اختياري)</span></label>
                  <div className="relative">
                    <select
                      value={specialty}
                      onChange={e => setSpecialty(e.target.value)}
                      className="w-full h-12 rounded-xl border border-border/60 bg-muted/20 px-3 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary text-foreground"
                    >
                      <option value="">اختر تخصصك</option>
                      {SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  </div>
                </div>
                <div className="px-3 py-2 rounded-lg bg-muted/30 text-xs text-muted-foreground" dir="ltr">
                  {isPhone ? `📱 ${identifier}` : `📧 ${identifier}`}
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold">كلمة المرور</label>
                  <div className="relative">
                    <Input type={showRegPass ? "text" : "password"} value={regPassword} onChange={e => setRegPassword(e.target.value)} className="h-12 rounded-xl bg-muted/20 pe-10" placeholder="٦ أحرف على الأقل" required minLength={6} />
                    <button type="button" onClick={() => setShowRegPass(v => !v)} className="absolute inset-y-0 left-3 flex items-center text-muted-foreground hover:text-foreground">
                      {showRegPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button type="submit" className="w-full h-12 font-bold rounded-xl" disabled={!displayName.trim() || !username.trim() || regPassword.length < 6 || registerMutation.isPending}>
                  {registerMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "إنشاء الحساب 🌾"}
                </Button>
                <p className="text-xs text-muted-foreground text-center">بالتسجيل، أنت توافق على شروط الاستخدام وسياسة الخصوصية</p>
              </form>
            </div>
          )}

        </div>

        <div className="text-center pb-6 text-xs text-muted-foreground/50 px-4">
          زراعة.كوم © {new Date().getFullYear()} — المنصة الزراعية العربية
        </div>
      </div>
    </div>
  );
}

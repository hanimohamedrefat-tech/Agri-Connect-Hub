import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { useRegister, useGetMe, useSendOtp, useOtpLogin, useVerifyOtp } from "@workspace/api-client-react";
import { setToken } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Eye, EyeOff, ChevronDown } from "lucide-react";
import { ZiraBrand } from "@/components/ZiraLogo";

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

type Step = "email" | "otp" | "register";

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const { data: user, isLoading: checkingAuth } = useGetMe();
  const registerMutation = useRegister();
  const sendOtpMutation = useSendOtp();
  const otpLoginMutation = useOtpLogin();
  const verifyOtpMutation = useVerifyOtp();

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [demoCode, setDemoCode] = useState<string | null>(null);
  const [userExists, setUserExists] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [error, setError] = useState("");

  // Register fields
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [showRegPass, setShowRegPass] = useState(false);

  useEffect(() => {
    if (!checkingAuth && user) setLocation("/feed");
  }, [user, checkingAuth, setLocation]);

  // ── OTP auto-submit ───────────────────────────────────────────────────────
  const submitOtp = useCallback((code: string) => {
    if (code.replace(/\s/g, "").length < 6) return;
    setOtpError("");

    const extractError = (err: unknown): string => {
      const data = (err as { response?: { data?: { error?: string; attemptsLeft?: number } } })?.response?.data;
      if (data?.attemptsLeft !== undefined) return `الكود غير صحيح — تبقّى ${data.attemptsLeft} ${data.attemptsLeft === 1 ? "محاولة" : "محاولات"}`;
      return data?.error ?? "الكود غير صحيح أو منتهي الصلاحية";
    };

    if (userExists) {
      // Existing user → OTP login directly
      otpLoginMutation.mutate(
        { data: { email: email.trim(), otp: code.trim() } },
        {
          onSuccess: (res) => { setToken(res.token); window.location.href = "/feed"; },
          onError: (err) => setOtpError(extractError(err)),
        },
      );
    } else {
      // New user → verify OTP on backend first (proves email ownership) then register
      verifyOtpMutation.mutate(
        { data: { emailOrPhone: email.trim(), otp: code.trim() } },
        {
          onSuccess: (res) => {
            if (!res.valid) { setOtpError("الكود غير صحيح، حاول مجدداً"); return; }
            setStep("register");
          },
          onError: (err) => setOtpError(extractError(err)),
        },
      );
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email, userExists]);

  useEffect(() => {
    if (step === "otp" && otp.length === 6 && !otp.includes(" ")) {
      submitOtp(otp);
    }
  }, [otp, step, submitOtp]);

  if (checkingAuth) return null;
  if (user) return null;

  // ── Step: email ───────────────────────────────────────────────────────────
  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    const val = email.trim();
    if (!val || !val.includes("@")) { setError("أدخل بريداً إلكترونياً صحيحاً"); return; }
    setError("");
    sendOtpMutation.mutate(
      { data: { emailOrPhone: val } },
      {
        onSuccess: (res) => {
          setUserExists(res.userExists);
          setDemoCode(res.demoCode ?? null);
          setOtp("");
          setStep("otp");
        },
        onError: (err: unknown) => {
          const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
          setError(msg ?? "حدث خطأ، حاول مجدداً");
        },
      },
    );
  };

  // ── Step: register ────────────────────────────────────────────────────────
  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    registerMutation.mutate(
      {
        data: {
          email: email.trim(),
          username: username.trim(),
          password: regPassword,
          displayName: displayName.trim(),
          specialty: specialty || undefined,
        },
      },
      {
        onSuccess: (res) => { setToken(res.token); window.location.href = "/welcome"; },
        onError: (err: unknown) => {
          const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
          setError(msg ?? "حدث خطأ، حاول مجدداً");
        },
      },
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm space-y-6">

        {/* Brand */}
        <div className="flex flex-col items-center gap-3 text-center">
          <ZiraBrand size={64} />
          <p className="text-sm text-muted-foreground">
            {step === "email" && "أدخل بريدك الإلكتروني للدخول أو التسجيل"}
            {step === "otp" && (userExists ? "أهلاً بعودتك! أدخل الكود لتسجيل الدخول" : "حساب جديد — أدخل الكود للمتابعة")}
            {step === "register" && "أكمل بياناتك لإنشاء حسابك"}
          </p>
        </div>

        {/* ── STEP: email ─────────────────────────────────────────── */}
        {step === "email" && (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-foreground">البريد الإلكتروني</label>
              <Input
                type="email"
                inputMode="email"
                autoComplete="email"
                dir="ltr"
                placeholder="name@example.com"
                value={email}
                onChange={e => { setEmail(e.target.value); setError(""); }}
                className="h-11 text-base"
                autoFocus
              />
            </div>
            {error && <p className="text-sm text-destructive text-center">{error}</p>}
            <Button
              type="submit"
              className="w-full h-11 text-base font-bold"
              disabled={sendOtpMutation.isPending}
            >
              {sendOtpMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "متابعة"}
            </Button>
          </form>
        )}

        {/* ── STEP: otp ───────────────────────────────────────────── */}
        {step === "otp" && (
          <div className="space-y-5">
            <div className="rounded-xl bg-primary/8 border border-primary/20 px-4 py-3 text-center">
              <p className="text-sm text-muted-foreground">
                أرسلنا كود التحقق إلى
              </p>
              <p className="font-bold text-foreground mt-0.5" dir="ltr">{email}</p>
              {demoCode && (
                <p className="text-xs text-muted-foreground mt-1 font-mono bg-muted/50 rounded px-2 py-1 inline-block">
                  كود تجريبي: {demoCode}
                </p>
              )}
            </div>

            <OtpInput value={otp} onChange={setOtp} />

            {otpError && <p className="text-sm text-destructive text-center">{otpError}</p>}

            {(otpLoginMutation.isPending) && (
              <div className="flex items-center justify-center gap-2 text-primary text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>جاري تسجيل الدخول...</span>
              </div>
            )}

            <div className="flex items-center justify-between text-sm">
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => { setStep("email"); setOtp(""); setOtpError(""); }}
              >
                تغيير البريد
              </button>
              <button
                type="button"
                className="text-primary hover:text-primary/80 font-semibold transition-colors"
                onClick={() => {
                  sendOtpMutation.mutate(
                    { data: { emailOrPhone: email.trim() } },
                    {
                      onSuccess: (res) => {
                        setDemoCode(res.demoCode ?? null);
                        setOtp("");
                        setOtpError("");
                      },
                    },
                  );
                }}
                disabled={sendOtpMutation.isPending}
              >
                {sendOtpMutation.isPending ? "جاري الإرسال..." : "إعادة الإرسال"}
              </button>
            </div>
          </div>
        )}

        {/* ── STEP: register ──────────────────────────────────────── */}
        {step === "register" && (
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="rounded-xl bg-muted/40 border border-border/50 px-4 py-3 text-center">
              <p className="text-xs text-muted-foreground">البريد الإلكتروني</p>
              <p className="font-semibold text-sm" dir="ltr">{email}</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-foreground">الاسم الكامل</label>
              <Input
                placeholder="اسمك الكامل"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                className="h-11"
                autoFocus
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-foreground">اسم المستخدم</label>
              <Input
                placeholder="@username"
                dir="ltr"
                value={username}
                onChange={e => setUsername(e.target.value.replace(/[^a-z0-9_]/gi, "").toLowerCase())}
                className="h-11"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-foreground">
                التخصص <span className="text-muted-foreground font-normal">(اختياري)</span>
              </label>
              <div className="relative">
                <select
                  value={specialty}
                  onChange={e => setSpecialty(e.target.value)}
                  className="w-full h-11 rounded-md border border-border bg-background px-3 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">اختر تخصصك</option>
                  {SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-foreground">كلمة المرور</label>
              <div className="relative">
                <Input
                  type={showRegPass ? "text" : "password"}
                  placeholder="٦ أحرف على الأقل"
                  value={regPassword}
                  onChange={e => setRegPassword(e.target.value)}
                  className="h-11 pl-10"
                  minLength={6}
                  required
                />
                <button
                  type="button"
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowRegPass(v => !v)}
                >
                  {showRegPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && <p className="text-sm text-destructive text-center">{error}</p>}

            <Button
              type="submit"
              className="w-full h-11 text-base font-bold"
              disabled={registerMutation.isPending}
            >
              {registerMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "إنشاء الحساب"}
            </Button>

            <button
              type="button"
              className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => { setStep("otp"); setError(""); }}
            >
              رجوع
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

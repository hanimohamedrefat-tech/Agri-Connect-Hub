import { useState } from "react";
import { BadgeCheck, CheckCircle2, Shield, Star, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLang } from "@/context/LangContext";
import { useToast } from "@/hooks/use-toast";
import { getToken } from "@/lib/auth";

export default function VerifyPage() {
  const { data: user } = useGetMe();
  const queryClient = useQueryClient();
  const { lang } = useLang();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const isAr = lang === "ar";

  const handleVerify = async () => {
    setLoading(true);
    try {
      const token = getToken();
      const res = await fetch("/api/auth/request-verification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!res.ok) throw new Error("failed");
      setDone(true);
      queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
      toast({
        title: isAr ? "تهانينا! 🎉" : "Congratulations! 🎉",
        description: isAr ? "تم تفعيل علامة التوثيق الزرقاء على حسابك" : "Blue verification badge has been activated on your account",
      });
    } catch {
      toast({
        title: isAr ? "حدث خطأ" : "Error",
        description: isAr ? "لم يتم التحقق، حاول مرة أخرى" : "Verification failed, please try again",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  const features = isAr
    ? [
        "علامة توثيق زرقاء ✓ بجانب اسمك",
        "ظهور مميز في نتائج البحث",
        "أولوية في الاقتراحات للمتابعة",
        "شارة خاصة على صفحة ملفك الشخصي",
        "دعم فني مخصص",
      ]
    : [
        "Blue ✓ badge next to your name",
        "Priority in search results",
        "First in follow suggestions",
        "Special badge on your profile",
        "Dedicated support",
      ];

  return (
    <div className="max-w-lg mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
          <BadgeCheck className="w-10 h-10 text-blue-500" />
        </div>
        <h1 className="text-2xl font-bold">
          {isAr ? "احصل على التوثيق الرسمي" : "Get Official Verification"}
        </h1>
        <p className="text-muted-foreground text-sm leading-relaxed">
          {isAr
            ? "علامة التوثيق الزرقاء تُثبت هويتك وتزيد من مصداقيتك أمام مجتمع زراعة"
            : "The blue verification badge proves your identity and boosts your credibility on Zira3a"}
        </p>
      </div>

      {/* Already verified */}
      {user.isVerified ? (
        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-8 h-8 text-blue-500 shrink-0" />
              <div>
                <p className="font-bold text-blue-700 dark:text-blue-400">
                  {isAr ? "حسابك موثّق بالفعل ✓" : "Your account is already verified ✓"}
                </p>
                <p className="text-sm text-blue-600/70 dark:text-blue-400/70">
                  {isAr ? "علامة التوثيق الزرقاء تظهر بجانب اسمك" : "Blue badge appears next to your name"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Pricing Card */}
          <Card className="border-2 border-primary shadow-lg relative overflow-hidden">
            <div className="absolute top-3 start-3">
              <span className="bg-primary text-primary-foreground text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                <Star className="w-3 h-3" />
                {isAr ? "الأكثر طلباً" : "Most Popular"}
              </span>
            </div>
            <CardHeader className="pt-10 pb-2">
              <CardTitle className="text-lg">{isAr ? "التوثيق السنوي" : "Annual Verification"}</CardTitle>
              <CardDescription>{isAr ? "دفعة واحدة — صلاحية سنة كاملة" : "One payment — valid for a full year"}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-end gap-1">
                <span className="text-4xl font-black text-primary">99</span>
                <span className="text-xl font-bold text-primary mb-1">
                  {isAr ? "جنيه" : "EGP"}
                </span>
                <span className="text-muted-foreground text-sm mb-1.5">
                  / {isAr ? "سنة" : "year"}
                </span>
              </div>

              <ul className="space-y-2">
                {features.map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              {done ? (
                <div className="flex items-center gap-2 py-3 text-blue-600 font-semibold">
                  <BadgeCheck className="w-5 h-5" />
                  {isAr ? "تم التوثيق بنجاح!" : "Successfully verified!"}
                </div>
              ) : (
                <Button
                  className="w-full gap-2 h-11 text-base font-bold rounded-xl"
                  onClick={handleVerify}
                  disabled={loading}
                >
                  <Zap className="w-4 h-4" />
                  {loading
                    ? (isAr ? "جارٍ التفعيل..." : "Activating...")
                    : (isAr ? "ادفع واحصل على التوثيق" : "Pay & Get Verified")}
                </Button>
              )}

              <p className="text-xs text-muted-foreground text-center">
                {isAr
                  ? "* هذه نسخة تجريبية — التوثيق مجاني حالياً"
                  : "* Demo version — verification is currently free"}
              </p>
            </CardContent>
          </Card>

          {/* Security note */}
          <div className="flex items-start gap-2 text-xs text-muted-foreground">
            <Shield className="w-4 h-4 shrink-0 mt-0.5" />
            <p>
              {isAr
                ? "علامة التوثيق تخضع لمراجعة فريق زراعة. يُمنح التوثيق للمزارعين والخبراء الزراعيين والمتخصصين في المجال."
                : "Verification badges are reviewed by the Zira3a team and granted to farmers, agricultural experts, and field specialists."}
            </p>
          </div>
        </>
      )}
    </div>
  );
}

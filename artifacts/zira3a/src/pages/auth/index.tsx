import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useLogin, useRegister, useGetMe } from "@workspace/api-client-react";
import { setToken } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Leaf } from "lucide-react";

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const { data: user, isLoading: checkingAuth } = useGetMe();
  const loginMutation = useLogin();
  const registerMutation = useRegister();

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [regUsername, setRegUsername] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regDisplayName, setRegDisplayName] = useState("");
  const [regSpecialty, setRegSpecialty] = useState("");

  // Redirect in effect, not during render
  useEffect(() => {
    if (!checkingAuth && user) {
      setLocation("/feed");
    }
  }, [user, checkingAuth, setLocation]);

  if (checkingAuth) return null;
  if (user) return null;

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate({ data: { email: loginEmail, password: loginPassword } }, {
      onSuccess: (res) => {
        setToken(res.token);
        window.location.href = "/feed"; // full reload to setup token
      }
    });
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    registerMutation.mutate({ data: { 
      username: regUsername, 
      email: regEmail, 
      password: regPassword, 
      displayName: regDisplayName,
      specialty: regSpecialty 
    } }, {
      onSuccess: (res) => {
        setToken(res.token);
        window.location.href = "/feed";
      }
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-accent/10 rounded-full blur-3xl translate-y-1/3 -translate-x-1/3" />

      <div className="w-full max-w-5xl grid md:grid-cols-2 gap-8 items-center z-10">
        
        {/* Branding Side */}
        <div className="flex flex-col space-y-6 px-4 py-12 md:py-0">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center text-primary-foreground shadow-lg">
              <Leaf className="w-7 h-7" />
            </div>
            <div>
              <div className="text-2xl font-black text-primary leading-none">زراعة.كوم</div>
              <div className="text-sm text-muted-foreground leading-none mt-1">عالم الزراعة</div>
            </div>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-foreground">
            تواصل.<br />اكتب.<br /><span className="text-primary">احصد.</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-md leading-relaxed">
            المنصة الاجتماعية المهنية الأولى للمزارعين، والمهندسين الزراعيين، وخبراء القطاع في العالم العربي.
          </p>
        </div>

        {/* Auth Forms */}
        <Card className="border-border/50 shadow-xl shadow-black/5 bg-background/80 backdrop-blur-xl">
          <Tabs defaultValue="login" className="w-full">
            <CardHeader className="space-y-1">
              <TabsList className="grid w-full grid-cols-2 mb-4 bg-muted/50 p-1 rounded-xl">
                <TabsTrigger value="login" className="rounded-lg text-base">تسجيل الدخول</TabsTrigger>
                <TabsTrigger value="register" className="rounded-lg text-base">حساب جديد</TabsTrigger>
              </TabsList>
            </CardHeader>
            <CardContent>
              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">البريد الإلكتروني</Label>
                    <Input id="email" type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} required className="h-12 bg-background" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">كلمة المرور</Label>
                    <Input id="password" type="password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} required className="h-12 bg-background" />
                  </div>
                  <Button type="submit" className="w-full h-12 text-lg font-bold" disabled={loginMutation.isPending}>
                    {loginMutation.isPending ? "جاري الدخول..." : "دخول"}
                  </Button>
                </form>
              </TabsContent>
              <TabsContent value="register">
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="displayName">الاسم الكامل</Label>
                      <Input id="displayName" value={regDisplayName} onChange={e => setRegDisplayName(e.target.value)} required className="bg-background" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="username">اسم المستخدم</Label>
                      <Input id="username" value={regUsername} onChange={e => setRegUsername(e.target.value)} required className="bg-background text-left" dir="ltr" placeholder="@" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-email">البريد الإلكتروني</Label>
                    <Input id="reg-email" type="email" value={regEmail} onChange={e => setRegEmail(e.target.value)} required className="bg-background text-left" dir="ltr" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="specialty">التخصص (اختياري)</Label>
                    <Input id="specialty" value={regSpecialty} onChange={e => setRegSpecialty(e.target.value)} placeholder="مثال: مهندس ري، مزارع، باحث..." className="bg-background" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-password">كلمة المرور</Label>
                    <Input id="reg-password" type="password" value={regPassword} onChange={e => setRegPassword(e.target.value)} required className="bg-background" />
                  </div>
                  <Button type="submit" className="w-full h-12 text-lg font-bold mt-2" disabled={registerMutation.isPending}>
                    {registerMutation.isPending ? "جاري الإنشاء..." : "إنشاء حساب"}
                  </Button>
                </form>
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}

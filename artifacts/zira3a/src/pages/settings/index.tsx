import { useState, useEffect } from "react";
import { useGetMe, useUpdateProfile, getGetMeQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useLang } from "@/context/LangContext";
import { useTheme } from "@/context/ThemeContext";
import { Loader2, Moon, Sun, Globe, Leaf, Waves, Sparkles } from "lucide-react";

export default function Settings() {
  const { data: user } = useGetMe();
  const updateMutation = useUpdateProfile();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { t, lang, setLang } = useLang();
  const { colorTheme, setColorTheme, darkMode, toggleDark } = useTheme();

  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [location, setLocation] = useState("");
  const [website, setWebsite] = useState("");
  const [avatar, setAvatar] = useState("");
  const [coverPhoto, setCoverPhoto] = useState("");

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || "");
      setBio(user.bio || "");
      setSpecialty(user.specialty || "");
      setLocation(user.location || "");
      setWebsite(user.website || "");
      setAvatar(user.avatar || "");
      setCoverPhoto(user.coverPhoto || "");
    }
  }, [user]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    updateMutation.mutate({
      username: user.username,
      data: { displayName, bio, specialty, location, website, avatar, coverPhoto }
    }, {
      onSuccess: () => {
        toast({
          title: lang === "ar" ? "تم الحفظ بنجاح" : "Saved successfully",
          description: lang === "ar" ? "تم تحديث معلومات ملفك الشخصي." : "Your profile has been updated.",
        });
        queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
      }
    });
  };

  if (!user) return null;

  const themeOptions = [
    { id: "green" as const, label: t.green, icon: Leaf, colors: ["bg-emerald-500", "bg-amber-400"] },
    { id: "ocean" as const, label: t.ocean, icon: Waves, colors: ["bg-sky-500", "bg-cyan-400"] },
    { id: "violet" as const, label: t.violet, icon: Sparkles, colors: ["bg-violet-500", "bg-pink-400"] },
  ];

  return (
    <div className="flex flex-col min-h-screen pb-12">
      <div className="sticky top-0 z-20 bg-background/85 backdrop-blur-xl border-b border-border/50 px-4 py-3">
        <h1 className="text-[17px] font-bold">{t.settings}</h1>
      </div>

      <div className="p-4 max-w-2xl mx-auto w-full space-y-4">

        {/* Appearance Card */}
        <Card className="border border-border/50 shadow-sm rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t.appearance}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Dark / Light */}
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">{darkMode === "dark" ? t.dark : t.light}</p>
                <p className="text-xs text-muted-foreground">{lang === "ar" ? "وضع العرض" : "Display mode"}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={toggleDark}
                className="gap-2 rounded-full"
              >
                {darkMode === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                {darkMode === "dark" ? t.light : t.dark}
              </Button>
            </div>

            {/* Language */}
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">{t.language}</p>
                <p className="text-xs text-muted-foreground">{lang === "ar" ? "العربية / English" : "العربية / English"}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLang(lang === "ar" ? "en" : "ar")}
                className="gap-2 rounded-full"
              >
                <Globe className="w-4 h-4" />
                {lang === "ar" ? "English" : "عربي"}
              </Button>
            </div>

            {/* Color Theme */}
            <div>
              <p className="font-medium text-sm mb-3">{t.theme}</p>
              <div className="grid grid-cols-3 gap-3">
                {themeOptions.map((th) => (
                  <button
                    key={th.id}
                    onClick={() => setColorTheme(th.id)}
                    className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all duration-200 ${
                      colorTheme === th.id
                        ? "border-primary bg-primary/5"
                        : "border-border/40 hover:border-border hover:bg-muted/30"
                    }`}
                  >
                    <div className="flex gap-1">
                      {th.colors.map((c, i) => (
                        <div key={i} className={`w-5 h-5 rounded-full ${c}`} />
                      ))}
                    </div>
                    <span className="text-xs font-medium">{th.label}</span>
                    {colorTheme === th.id && (
                      <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Profile Settings Card */}
        <Card className="border border-border/50 shadow-sm rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t.profileSettings}</CardTitle>
            <CardDescription className="text-sm">{t.profileSettingsDesc}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">

              {/* Photos */}
              <div className="space-y-4 pb-6 border-b border-border/50">
                <h3 className="font-semibold text-sm">{t.photos}</h3>

                <div className="space-y-1.5">
                  <Label className="text-xs">{t.coverPhoto}</Label>
                  <div className="flex gap-3 items-center">
                    <div className="h-14 w-24 bg-muted rounded-lg overflow-hidden shrink-0 border border-border/40">
                      {coverPhoto ? <img src={coverPhoto} className="w-full h-full object-cover" alt="" /> : null}
                    </div>
                    <Input value={coverPhoto} onChange={e => setCoverPhoto(e.target.value)} placeholder="https://..." dir="ltr" className="text-left text-sm h-9" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">{t.profilePhoto}</Label>
                  <div className="flex gap-3 items-center">
                    <Avatar className="w-14 h-14 shrink-0 border-2 border-background shadow-sm">
                      <AvatarImage src={avatar} />
                      <AvatarFallback className="bg-primary/10 text-primary font-bold">{displayName.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <Input value={avatar} onChange={e => setAvatar(e.target.value)} placeholder="https://..." dir="ltr" className="text-left text-sm h-9" />
                  </div>
                </div>
              </div>

              {/* Basic Info */}
              <div className="space-y-4">
                <h3 className="font-semibold text-sm">{t.basicInfo}</h3>

                <div className="space-y-1.5">
                  <Label htmlFor="displayName" className="text-xs">
                    {t.displayName} <span className="text-destructive">*</span>
                  </Label>
                  <Input id="displayName" value={displayName} onChange={e => setDisplayName(e.target.value)} required className="h-9 text-sm" />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="bio" className="text-xs">{t.bio}</Label>
                  <Textarea
                    id="bio"
                    value={bio}
                    onChange={e => setBio(e.target.value)}
                    className="min-h-[80px] text-sm resize-none"
                    placeholder={lang === "ar" ? "مزارع شغوف، باحث في المحاصيل..." : "Passionate farmer, crop researcher..."}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="specialty" className="text-xs">{t.specialty}</Label>
                    <Input
                      id="specialty"
                      value={specialty}
                      onChange={e => setSpecialty(e.target.value)}
                      placeholder={lang === "ar" ? "هندسة ري، زراعة عضوية" : "Irrigation, Organic farming"}
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="location" className="text-xs">{t.location}</Label>
                    <Input
                      id="location"
                      value={location}
                      onChange={e => setLocation(e.target.value)}
                      placeholder={lang === "ar" ? "المدينة، البلد" : "City, Country"}
                      className="h-9 text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="website" className="text-xs">{t.website}</Label>
                  <Input
                    id="website"
                    value={website}
                    onChange={e => setWebsite(e.target.value)}
                    placeholder="https://..."
                    dir="ltr"
                    className="text-left h-9 text-sm"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  type="submit"
                  className="px-6 font-bold h-9 text-sm rounded-full"
                  disabled={!displayName.trim() || updateMutation.isPending}
                >
                  {updateMutation.isPending ? (
                    <><Loader2 className="w-4 h-4 animate-spin me-2" />{t.saving}</>
                  ) : t.saveChanges}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

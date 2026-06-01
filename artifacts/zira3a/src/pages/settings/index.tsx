import { useState, useEffect, useRef } from "react";
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
import { Loader2, Moon, Sun, Globe, Leaf, Waves, Sparkles, Camera, Upload } from "lucide-react";
import { getToken } from "@/lib/auth";

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

export default function Settings() {
  const { data: user } = useGetMe();
  const updateMutation = useUpdateProfile();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { t, lang, setLang } = useLang();
  const { colorTheme, setColorTheme, darkMode, toggleDark } = useTheme();

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [location, setLocation] = useState("");
  const [website, setWebsite] = useState("");
  const [avatar, setAvatar] = useState("");
  const [coverPhoto, setCoverPhoto] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

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

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const url = await uploadFile(file);
      setAvatar(url);
    } catch {
      toast({ title: lang === "ar" ? "فشل الرفع" : "Upload failed", variant: "destructive" });
    } finally {
      setUploadingAvatar(false);
      e.target.value = "";
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCover(true);
    try {
      const url = await uploadFile(file);
      setCoverPhoto(url);
    } catch {
      toast({ title: lang === "ar" ? "فشل الرفع" : "Upload failed", variant: "destructive" });
    } finally {
      setUploadingCover(false);
      e.target.value = "";
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    updateMutation.mutate(
      { username: user.username, data: { displayName, bio, specialty, location, website, avatar, coverPhoto } },
      {
        onSuccess: () => {
          toast({
            title: lang === "ar" ? "تم الحفظ بنجاح" : "Saved successfully",
            description: lang === "ar" ? "تم تحديث معلومات ملفك الشخصي." : "Your profile has been updated.",
          });
          queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
        },
      }
    );
  };

  if (!user) return null;

  const themeOptions = [
    { id: "green" as const, label: t.green, icon: Leaf, colors: ["bg-emerald-500", "bg-amber-400"] },
    { id: "ocean" as const, label: t.ocean, icon: Waves, colors: ["bg-amber-500", "bg-orange-400"] },
    { id: "violet" as const, label: t.violet, icon: Sparkles, colors: ["bg-emerald-800", "bg-emerald-600"] },
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
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">{darkMode === "dark" ? t.dark : t.light}</p>
                <p className="text-xs text-muted-foreground">{lang === "ar" ? "وضع العرض" : "Display mode"}</p>
              </div>
              <Button variant="outline" size="sm" onClick={toggleDark} className="gap-2 rounded-full">
                {darkMode === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                {darkMode === "dark" ? t.light : t.dark}
              </Button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">{t.language}</p>
                <p className="text-xs text-muted-foreground">العربية / English</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setLang(lang === "ar" ? "en" : "ar")} className="gap-2 rounded-full">
                <Globe className="w-4 h-4" />
                {lang === "ar" ? "English" : "عربي"}
              </Button>
            </div>

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
                    {colorTheme === th.id && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
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

                {/* Cover Photo Upload */}
                <div className="space-y-2">
                  <Label className="text-xs">{t.coverPhoto}</Label>
                  <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />
                  <div
                    onClick={() => coverInputRef.current?.click()}
                    className="relative h-28 w-full bg-muted rounded-xl overflow-hidden border-2 border-dashed border-border/60 hover:border-primary/50 hover:bg-muted/80 transition-all cursor-pointer group"
                  >
                    {coverPhoto ? (
                      <>
                        <img src={coverPhoto} className="w-full h-full object-cover" alt="" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <div className="flex items-center gap-2 text-white text-sm font-medium">
                            <Camera className="w-4 h-4" />
                            {lang === "ar" ? "تغيير الصورة" : "Change photo"}
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground group-hover:text-primary transition-colors">
                        {uploadingCover ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <>
                            <Upload className="w-5 h-5" />
                            <span className="text-xs font-medium">{lang === "ar" ? "رفع صورة الغلاف" : "Upload cover photo"}</span>
                          </>
                        )}
                      </div>
                    )}
                    {uploadingCover && (
                      <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                        <Loader2 className="w-5 h-5 animate-spin text-primary" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Avatar Upload */}
                <div className="space-y-2">
                  <Label className="text-xs">{t.profilePhoto}</Label>
                  <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                  <div className="flex items-center gap-4">
                    <div
                      onClick={() => avatarInputRef.current?.click()}
                      className="relative w-20 h-20 rounded-full cursor-pointer group shrink-0"
                    >
                      <Avatar className="w-20 h-20 border-2 border-border/50">
                        <AvatarImage src={avatar} />
                        <AvatarFallback className="bg-primary/10 text-primary font-bold text-xl">
                          {displayName.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        {uploadingAvatar ? (
                          <Loader2 className="w-4 h-4 text-white animate-spin" />
                        ) : (
                          <Camera className="w-4 h-4 text-white" />
                        )}
                      </div>
                    </div>
                    <div className="flex-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => avatarInputRef.current?.click()}
                        disabled={uploadingAvatar}
                        className="rounded-full gap-2 text-xs h-8"
                      >
                        {uploadingAvatar ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Upload className="w-3.5 h-3.5" />
                        )}
                        {lang === "ar" ? "رفع صورة شخصية" : "Upload photo"}
                      </Button>
                      <p className="text-xs text-muted-foreground mt-1.5">
                        {lang === "ar" ? "JPG أو PNG أو WebP، بحد أقصى 8 ميجابايت" : "JPG, PNG or WebP, max 8MB"}
                      </p>
                    </div>
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

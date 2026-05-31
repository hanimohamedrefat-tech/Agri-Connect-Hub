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

export default function Settings() {
  const { data: user } = useGetMe();
  const updateMutation = useUpdateProfile();
  const { toast } = useToast();
  const queryClient = useQueryClient();

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
      data: { 
        displayName,
        bio,
        specialty,
        location,
        website,
        avatar,
        coverPhoto
      } 
    }, {
      onSuccess: () => {
        toast({
          title: "تم الحفظ بنجاح",
          description: "تم تحديث معلومات ملفك الشخصي.",
        });
        queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
      }
    });
  };

  if (!user) return null;

  return (
    <div className="flex flex-col min-h-screen pb-12">
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border/50 px-4 py-3">
        <h1 className="text-xl font-bold">الإعدادات</h1>
      </div>

      <div className="p-4 md:p-8 max-w-3xl mx-auto w-full">
        <Card className="border-none shadow-md">
          <CardHeader>
            <CardTitle>تعديل الملف الشخصي</CardTitle>
            <CardDescription>قم بتحديث معلوماتك العامة التي تظهر للآخرين.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-8">
              
              <div className="space-y-4 border-b pb-8">
                <h3 className="font-bold text-lg">الصور</h3>
                
                <div className="space-y-2">
                  <Label>صورة الغلاف (رابط)</Label>
                  <div className="flex gap-4 items-center">
                    <div className="h-20 w-32 bg-muted rounded overflow-hidden shrink-0 border">
                      {coverPhoto ? <img src={coverPhoto} className="w-full h-full object-cover" /> : null}
                    </div>
                    <Input value={coverPhoto} onChange={e => setCoverPhoto(e.target.value)} placeholder="https://..." dir="ltr" className="text-left" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>الصورة الشخصية (رابط)</Label>
                  <div className="flex gap-4 items-center">
                    <Avatar className="w-20 h-20 shrink-0 border-2 border-background shadow-sm">
                      <AvatarImage src={avatar} />
                      <AvatarFallback>{displayName.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <Input value={avatar} onChange={e => setAvatar(e.target.value)} placeholder="https://..." dir="ltr" className="text-left" />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-bold text-lg">المعلومات الأساسية</h3>

                <div className="space-y-2">
                  <Label htmlFor="displayName">الاسم الكامل <span className="text-destructive">*</span></Label>
                  <Input id="displayName" value={displayName} onChange={e => setDisplayName(e.target.value)} required />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">نبذة عنك</Label>
                  <Textarea id="bio" value={bio} onChange={e => setBio(e.target.value)} className="min-h-[100px]" placeholder="مزارع شغوف، باحث في المحاصيل..." />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="specialty">التخصص المهني</Label>
                    <Input id="specialty" value={specialty} onChange={e => setSpecialty(e.target.value)} placeholder="مثال: هندسة ري، زراعة عضوية" />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="location">الموقع الجغرافي</Label>
                    <Input id="location" value={location} onChange={e => setLocation(e.target.value)} placeholder="المدينة، البلد" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="website">الموقع الإلكتروني</Label>
                  <Input id="website" value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://..." dir="ltr" className="text-left" />
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button type="submit" className="px-8 font-bold text-lg h-12" disabled={!displayName.trim() || updateMutation.isPending}>
                  {updateMutation.isPending ? "جاري الحفظ..." : "حفظ التغييرات"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

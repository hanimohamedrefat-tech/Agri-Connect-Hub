import { useState, useEffect, useCallback } from "react";
import { BadgeCheck, Megaphone, Trash2, Plus, Search, ToggleLeft, ToggleRight, ShieldCheck, ShieldX, Loader2, ExternalLink, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useLang } from "@/context/LangContext";
import { getToken } from "@/lib/auth";

interface Ad {
  id: number;
  title: string;
  body: string;
  imageUrl: string | null;
  linkUrl: string;
  sponsorName: string;
  isActive: boolean;
  createdAt: string;
}

interface AdminUser {
  id: number;
  username: string;
  displayName: string;
  email: string;
  avatar: string | null;
  specialty: string | null;
  isVerified: boolean;
  createdAt: string;
}

function authHeader() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...options,
    headers: { "Content-Type": "application/json", ...authHeader(), ...(options?.headers ?? {}) },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<T>;
}

// ─── ADS TAB ─────────────────────────────────────────────────────────────────

function AdsTab({ lang }: { lang: string }) {
  const isAr = lang === "ar";
  const { toast } = useToast();
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: "", body: "", linkUrl: "", sponsorName: "", imageUrl: "" });

  const loadAds = useCallback(async () => {
    setLoading(true);
    try { setAds(await apiFetch<Ad[]>("/api/admin/ads")); }
    catch { toast({ title: isAr ? "خطأ في تحميل الإعلانات" : "Failed to load ads", variant: "destructive" }); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadAds(); }, []);

  const toggleAd = async (ad: Ad) => {
    try {
      const updated = await apiFetch<Ad>(`/api/admin/ads/${ad.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !ad.isActive }),
      });
      setAds(prev => prev.map(a => a.id === updated.id ? updated : a));
      toast({ title: updated.isActive ? (isAr ? "تم تفعيل الإعلان" : "Ad activated") : (isAr ? "تم إيقاف الإعلان" : "Ad deactivated") });
    } catch { toast({ title: isAr ? "فشل التحديث" : "Update failed", variant: "destructive" }); }
  };

  const deleteAd = async (id: number) => {
    try {
      await apiFetch(`/api/admin/ads/${id}`, { method: "DELETE" });
      setAds(prev => prev.filter(a => a.id !== id));
      toast({ title: isAr ? "تم حذف الإعلان" : "Ad deleted" });
    } catch { toast({ title: isAr ? "فشل الحذف" : "Delete failed", variant: "destructive" }); }
  };

  const createAd = async () => {
    if (!form.title || !form.body || !form.linkUrl || !form.sponsorName) {
      toast({ title: isAr ? "يرجى تعبئة كل الحقول المطلوبة" : "Fill all required fields", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const ad = await apiFetch<Ad>("/api/admin/ads", {
        method: "POST",
        body: JSON.stringify({ ...form, imageUrl: form.imageUrl || undefined }),
      });
      setAds(prev => [...prev, ad]);
      setForm({ title: "", body: "", linkUrl: "", sponsorName: "", imageUrl: "" });
      setShowForm(false);
      toast({ title: isAr ? "تم إنشاء الإعلان" : "Ad created" });
    } catch { toast({ title: isAr ? "فشل الإنشاء" : "Create failed", variant: "destructive" }); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {isAr ? `${ads.length} إعلان` : `${ads.length} ads`}
          {ads.filter(a => a.isActive).length > 0 && ` · ${ads.filter(a => a.isActive).length} ${isAr ? "نشط" : "active"}`}
        </p>
        <Button size="sm" className="gap-2 rounded-full h-8" onClick={() => setShowForm(v => !v)}>
          {showForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
          {showForm ? (isAr ? "إلغاء" : "Cancel") : (isAr ? "إعلان جديد" : "New Ad")}
        </Button>
      </div>

      {/* Create form */}
      {showForm && (
        <Card className="border-2 border-primary/30 rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{isAr ? "إنشاء إعلان جديد" : "Create New Ad"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">{isAr ? "العنوان *" : "Title *"}</label>
                <Input
                  placeholder={isAr ? "عنوان الإعلان" : "Ad headline"}
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">{isAr ? "اسم الراعي *" : "Sponsor Name *"}</label>
                <Input
                  placeholder={isAr ? "اسم الشركة" : "Company name"}
                  value={form.sponsorName}
                  onChange={e => setForm(f => ({ ...f, sponsorName: e.target.value }))}
                  className="h-8 text-sm"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">{isAr ? "الوصف *" : "Body *"}</label>
              <Input
                placeholder={isAr ? "وصف الإعلان" : "Ad description"}
                value={form.body}
                onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
                className="h-8 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">{isAr ? "الرابط *" : "Link URL *"}</label>
                <Input
                  placeholder="https://..."
                  value={form.linkUrl}
                  onChange={e => setForm(f => ({ ...f, linkUrl: e.target.value }))}
                  className="h-8 text-sm"
                  dir="ltr"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">{isAr ? "رابط الصورة" : "Image URL"}</label>
                <Input
                  placeholder="https://..."
                  value={form.imageUrl}
                  onChange={e => setForm(f => ({ ...f, imageUrl: e.target.value }))}
                  className="h-8 text-sm"
                  dir="ltr"
                />
              </div>
            </div>
            <Button size="sm" className="w-full rounded-xl h-9" onClick={createAd} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : (isAr ? "إنشاء الإعلان" : "Create Ad")}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Ads list */}
      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : ads.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Megaphone className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">{isAr ? "لا توجد إعلانات بعد" : "No ads yet"}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {ads.map(ad => (
            <Card key={ad.id} className={`rounded-xl border transition-all ${ad.isActive ? "border-border/50" : "border-border/30 opacity-60"}`}>
              <CardContent className="p-3">
                <div className="flex items-start gap-3">
                  {ad.imageUrl && (
                    <img src={ad.imageUrl} alt="" className="w-14 h-14 rounded-lg object-cover shrink-0 border border-border/30" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-bold text-sm truncate">{ad.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{ad.body}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs bg-muted px-2 py-0.5 rounded-full">{ad.sponsorName}</span>
                          <a href={ad.linkUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-0.5">
                            <ExternalLink className="w-2.5 h-2.5" />
                            {isAr ? "رابط" : "Link"}
                          </a>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => toggleAd(ad)}
                          className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium transition-colors ${ad.isActive ? "bg-primary/10 text-primary hover:bg-primary/20" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                        >
                          {ad.isActive
                            ? <><ToggleRight className="w-3.5 h-3.5" />{isAr ? "نشط" : "Active"}</>
                            : <><ToggleLeft className="w-3.5 h-3.5" />{isAr ? "موقوف" : "Off"}</>
                          }
                        </button>
                        <button
                          onClick={() => deleteAd(ad.id)}
                          className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── USERS TAB ────────────────────────────────────────────────────────────────

function UsersTab({ lang }: { lang: string }) {
  const isAr = lang === "ar";
  const { toast } = useToast();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [updating, setUpdating] = useState<number | null>(null);

  const loadUsers = useCallback(async (q: string) => {
    setLoading(true);
    try { setUsers(await apiFetch<AdminUser[]>(`/api/admin/users?q=${encodeURIComponent(q)}`)); }
    catch { toast({ title: isAr ? "خطأ في تحميل المستخدمين" : "Failed to load users", variant: "destructive" }); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadUsers(""); }, []);

  useEffect(() => {
    const timer = setTimeout(() => loadUsers(query), 400);
    return () => clearTimeout(timer);
  }, [query]);

  const toggleVerify = async (user: AdminUser) => {
    setUpdating(user.id);
    try {
      const updated = await apiFetch<{ id: number; username: string; isVerified: boolean }>(
        `/api/admin/users/${user.id}/verify`,
        { method: "PATCH", body: JSON.stringify({ isVerified: !user.isVerified }) },
      );
      setUsers(prev => prev.map(u => u.id === updated.id ? { ...u, isVerified: updated.isVerified } : u));
      toast({
        title: updated.isVerified
          ? (isAr ? `✅ تم توثيق @${updated.username}` : `✅ @${updated.username} verified`)
          : (isAr ? `❌ تم إلغاء توثيق @${updated.username}` : `❌ @${updated.username} unverified`),
      });
    } catch { toast({ title: isAr ? "فشل التحديث" : "Update failed", variant: "destructive" }); }
    finally { setUpdating(null); }
  };

  const verifiedCount = users.filter(u => u.isVerified).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          <Input
            placeholder={isAr ? "ابحث بالاسم أو المعرّف أو البريد..." : "Search by name, username or email..."}
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="ps-9 h-9 text-sm"
          />
        </div>
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {isAr ? `${verifiedCount} موثّق` : `${verifiedCount} verified`}
        </span>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">{isAr ? "لا توجد نتائج" : "No users found"}</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {users.map(user => (
            <Card key={user.id} className="rounded-xl border border-border/50">
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10 shrink-0 border border-border/30">
                    <AvatarImage src={user.avatar || ""} />
                    <AvatarFallback className="bg-primary/10 text-primary text-sm font-bold">
                      {user.displayName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-sm truncate">{user.displayName}</span>
                      {user.isVerified && <BadgeCheck className="w-4 h-4 text-blue-500 shrink-0" />}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>@{user.username}</span>
                      {user.specialty && (
                        <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">{user.specialty}</span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => toggleVerify(user)}
                    disabled={updating === user.id}
                    className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-medium transition-all shrink-0 ${
                      user.isVerified
                        ? "bg-blue-100 text-blue-700 hover:bg-red-50 hover:text-red-600 dark:bg-blue-950/40 dark:text-blue-400 dark:hover:bg-red-950/30 dark:hover:text-red-400"
                        : "bg-muted text-muted-foreground hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950/30 dark:hover:text-blue-400"
                    }`}
                  >
                    {updating === user.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : user.isVerified ? (
                      <>
                        <ShieldCheck className="w-3.5 h-3.5" />
                        {isAr ? "موثّق" : "Verified"}
                      </>
                    ) : (
                      <>
                        <ShieldX className="w-3.5 h-3.5" />
                        {isAr ? "توثيق" : "Verify"}
                      </>
                    )}
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const { lang } = useLang();
  const isAr = lang === "ar";

  return (
    <div className="flex flex-col min-h-screen pb-12">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/90 backdrop-blur-xl border-b border-border/50 px-4 py-3 flex items-center gap-2">
        <ShieldCheck className="w-5 h-5 text-primary" />
        <h1 className="text-[17px] font-bold">{isAr ? "لوحة الإدارة" : "Admin Dashboard"}</h1>
      </div>

      <div className="p-4 max-w-2xl mx-auto w-full">
        <Tabs defaultValue="ads" dir={isAr ? "rtl" : "ltr"}>
          <TabsList className="w-full mb-4 rounded-xl h-10">
            <TabsTrigger value="ads" className="flex-1 gap-2 text-sm rounded-lg">
              <Megaphone className="w-4 h-4" />
              {isAr ? "الإعلانات" : "Ads"}
            </TabsTrigger>
            <TabsTrigger value="users" className="flex-1 gap-2 text-sm rounded-lg">
              <Users className="w-4 h-4" />
              {isAr ? "المستخدمون" : "Users"}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ads" className="mt-0">
            <AdsTab lang={lang} />
          </TabsContent>
          <TabsContent value="users" className="mt-0">
            <UsersTab lang={lang} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

import { Link, useLocation } from "wouter";
import { useListMeetings, useJoinMeetingByCode } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Video, Calendar, Users, Plus, Hash } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { useState } from "react";

export default function Meetings() {
  const { data: meetings, isLoading } = useListMeetings();
  const joinMutation = useJoinMeetingByCode();
  const [, setLocation] = useLocation();
  const [joinCode, setJoinCode] = useState("");

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    joinMutation.mutate({ joinCode: joinCode.trim() }, {
      onSuccess: (res) => {
        setLocation(`/meetings/${res.id}`);
      }
    });
  };

  return (
    <div className="flex flex-col min-h-screen">
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border/50 px-4 py-3 flex items-center justify-between">
        <h1 className="text-xl font-bold">الاجتماعات</h1>
        <Button asChild className="gap-2 rounded-full font-bold">
          <Link href="/meetings/new">
            <Plus className="w-4 h-4" />
            اجتماع جديد
          </Link>
        </Button>
      </div>

      <div className="p-4 md:p-6 lg:p-8 space-y-8">
        
        {/* Join Card */}
        <Card className="bg-primary/5 border-primary/20 shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video className="w-5 h-5 text-primary" />
              انضم إلى اجتماع
            </CardTitle>
            <CardDescription>أدخل رمز الاجتماع للدخول إلى الغرفة</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleJoin} className="flex gap-2">
              <div className="relative flex-1">
                <Hash className="absolute right-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input 
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  placeholder="مثال: abc-defg-hij" 
                  className="pl-4 pr-9 bg-background font-mono text-left" 
                  dir="ltr"
                />
              </div>
              <Button type="submit" disabled={!joinCode.trim() || joinMutation.isPending} className="font-bold px-8">
                انضمام
              </Button>
            </form>
          </CardContent>
        </Card>

        <div>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-muted-foreground" />
            الاجتماعات القادمة والنشطة
          </h2>
          
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">جاري تحميل الاجتماعات...</div>
          ) : Array.isArray(meetings) && meetings.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {meetings.map(meeting => (
                <Card key={meeting.id} className="transition-all hover:border-primary/50 group">
                  <CardContent className="p-5">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-bold text-lg leading-tight mb-1 group-hover:text-primary transition-colors">
                          {meeting.title}
                        </h3>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {meeting.description || "لا يوجد وصف"}
                        </p>
                      </div>
                      {meeting.status === 'live' && (
                        <span className="bg-red-500/10 text-red-500 text-xs font-bold px-2 py-1 rounded-full animate-pulse flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-red-500"></span>
                          مباشر الآن
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-6">
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        <span>{meeting.participantsCount} مشارك</span>
                      </div>
                      {meeting.scheduledAt && (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>{format(new Date(meeting.scheduledAt), 'd MMM yyyy - h:mm a', { locale: ar })}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button asChild className="flex-1 font-bold">
                        <Link href={`/meetings/${meeting.id}`}>
                          التفاصيل والانضمام
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center p-12 border rounded-xl border-dashed border-border">
              <p className="text-muted-foreground">لا توجد اجتماعات قادمة. بادر بإنشاء اجتماعك الأول!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

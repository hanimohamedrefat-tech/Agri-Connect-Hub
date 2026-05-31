import { useParams, Link } from "wouter";
import { useGetMeeting, getGetMeetingQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowRight, Video, Calendar, Users, Hash, Copy, Settings } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { useGetMe } from "@workspace/api-client-react";

export default function MeetingDetail() {
  const params = useParams();
  const meetingId = Number(params.meetingId);
  const { toast } = useToast();
  const { data: user } = useGetMe();

  const { data: meeting, isLoading } = useGetMeeting(meetingId, {
    query: { enabled: !!meetingId, queryKey: getGetMeetingQueryKey(meetingId) }
  });

  const isHost = meeting?.hostId === user?.id;

  const copyJoinCode = () => {
    if (meeting?.joinCode) {
      navigator.clipboard.writeText(meeting.joinCode);
      toast({
        title: "تم النسخ",
        description: "تم نسخ رمز الاجتماع إلى الحافظة",
      });
    }
  };

  if (isLoading) return <div className="p-8 text-center">جاري التحميل...</div>;
  if (!meeting) return <div className="p-8 text-center">الاجتماع غير موجود</div>;

  return (
    <div className="flex flex-col min-h-screen bg-muted/10">
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border/50 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/meetings" className="p-2 hover:bg-muted rounded-full transition-colors">
            <ArrowRight className="w-5 h-5" />
          </Link>
          <h1 className="text-xl font-bold truncate pr-4">تفاصيل الاجتماع</h1>
        </div>
        {isHost && (
          <Button variant="ghost" size="icon">
            <Settings className="w-5 h-5" />
          </Button>
        )}
      </div>

      <div className="p-4 md:p-8 max-w-4xl mx-auto w-full space-y-6">
        
        {/* Main Status Card */}
        <Card className="overflow-hidden border-none shadow-lg">
          <div className="h-32 bg-primary/20 w-full relative">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 bg-background rounded-full flex items-center justify-center shadow-lg">
                <Video className="w-8 h-8 text-primary" />
              </div>
            </div>
          </div>
          <CardContent className="pt-8 px-6 pb-6 text-center">
            <h2 className="text-3xl font-bold mb-2">{meeting.title}</h2>
            {meeting.description && (
              <p className="text-muted-foreground max-w-2xl mx-auto mb-6 whitespace-pre-wrap">
                {meeting.description}
              </p>
            )}

            <div className="flex flex-wrap justify-center gap-4 mb-8">
              <div className="flex items-center gap-2 bg-muted px-4 py-2 rounded-full text-sm font-medium">
                <Calendar className="w-4 h-4 text-primary" />
                <span>
                  {meeting.scheduledAt 
                    ? format(new Date(meeting.scheduledAt), 'd MMMM yyyy - h:mm a', { locale: ar })
                    : 'اجتماع فوري'}
                </span>
              </div>
              <div className="flex items-center gap-2 bg-muted px-4 py-2 rounded-full text-sm font-medium">
                <Users className="w-4 h-4 text-primary" />
                <span>المشاركين: {meeting.participantsCount}{meeting.maxParticipants ? ` / ${meeting.maxParticipants}` : ''}</span>
              </div>
              <div 
                className="flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-mono cursor-pointer hover:bg-primary/20 transition-colors"
                onClick={copyJoinCode}
                title="نسخ رمز الاجتماع"
              >
                <Hash className="w-4 h-4" />
                <span>{meeting.joinCode}</span>
                <Copy className="w-3 h-3 ml-2" />
              </div>
            </div>

            <div className="bg-background rounded-2xl p-6 border shadow-sm max-w-md mx-auto">
              <p className="text-sm font-medium mb-4">جاهز للانضمام؟</p>
              
              <div className="w-full aspect-video bg-muted rounded-xl mb-6 flex items-center justify-center overflow-hidden border">
                <Avatar className="w-20 h-20 opacity-50">
                  <AvatarImage src={user?.avatar || ""} />
                  <AvatarFallback>{user?.displayName?.charAt(0)}</AvatarFallback>
                </Avatar>
              </div>
              
              <Button asChild size="lg" className="w-full font-bold text-lg rounded-xl h-14 shadow-md shadow-primary/20">
                <Link href={`/meetings/${meeting.id}/room`}>
                  دخول الغرفة
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Host Info */}
        <div className="flex items-center gap-4 bg-card p-4 rounded-2xl border">
          <Avatar className="w-12 h-12">
            <AvatarImage src={meeting.host.avatar || ""} />
            <AvatarFallback>{meeting.host.displayName.charAt(0)}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm text-muted-foreground">مستضيف الاجتماع</p>
            <p className="font-bold">{meeting.host.displayName}</p>
          </div>
        </div>

      </div>
    </div>
  );
}

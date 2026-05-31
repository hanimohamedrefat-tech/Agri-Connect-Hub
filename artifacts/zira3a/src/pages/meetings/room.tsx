import { useState, useEffect } from "react";
import { useParams, Link } from "wouter";
import { useGetMeeting, getGetMeetingQueryKey } from "@workspace/api-client-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Video, VideoOff, MonitorUp, Hand, PhoneOff, MessageSquare, Users, Settings, X, Send } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function MeetingRoom() {
  const params = useParams();
  const meetingId = Number(params.meetingId);
  const { data: meeting } = useGetMeeting(meetingId, {
    query: { enabled: !!meetingId, queryKey: getGetMeetingQueryKey(meetingId) }
  });

  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isHandRaised, setIsHandRaised] = useState(false);
  
  const [sidebarPanel, setSidebarPanel] = useState<'chat' | 'participants' | null>(null);

  // Mock participants for visual demonstration
  const mockParticipants = [
    { id: 1, name: "أنت", isHost: false, isMuted: isMuted, isVideoOff: isVideoOff, isSpeaking: true },
    { id: 2, name: meeting?.host?.displayName || "المستضيف", isHost: true, isMuted: false, isVideoOff: false, isSpeaking: false },
    { id: 3, name: "م. أحمد عبدالله", isHost: false, isMuted: true, isVideoOff: true, isSpeaking: false },
    { id: 4, name: "سارة محمد", isHost: false, isMuted: false, isVideoOff: false, isSpeaking: false },
  ];

  return (
    <div className="flex flex-col h-screen bg-[#1c1f1c] text-white overflow-hidden">
      
      {/* Top Bar */}
      <div className="h-14 px-4 flex items-center justify-between bg-black/40 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="font-bold">{meeting?.title || 'جاري التحميل...'}</div>
          {meeting?.isRecording && (
            <div className="flex items-center gap-1 text-xs font-medium text-red-500 bg-red-500/10 px-2 py-1 rounded">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              تسجيل
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-white/10 px-3 py-1 rounded-md text-xs font-mono">
            {meeting?.joinCode}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Video Grid */}
        <div className="flex-1 p-4 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full auto-rows-fr">
            {mockParticipants.slice(0, 4).map((p, i) => (
              <div key={p.id} className={`relative rounded-xl overflow-hidden bg-black/60 border-2 ${p.isSpeaking ? 'border-primary' : 'border-transparent'} transition-colors`}>
                
                {/* Video Placeholder */}
                {p.isVideoOff ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Avatar className="w-24 h-24">
                      <AvatarFallback className="bg-[#2c302c] text-2xl">{p.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                  </div>
                ) : (
                  <div className="absolute inset-0 bg-[#2c302c] flex items-center justify-center">
                    <Video className="w-12 h-12 text-white/10" />
                  </div>
                )}

                {/* Participant Label */}
                <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur px-3 py-1.5 rounded-lg flex items-center gap-2 max-w-[calc(100%-24px)]">
                  {p.isMuted ? <MicOff className="w-4 h-4 text-red-400 shrink-0" /> : <Mic className="w-4 h-4 text-green-400 shrink-0" />}
                  <span className="text-sm font-medium truncate">{p.name}</span>
                  {p.isHost && <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded ml-1 shrink-0">مستضيف</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Sidebar */}
        {sidebarPanel && (
          <div className="w-80 bg-[#141614] border-r border-white/10 flex flex-col shrink-0">
            <div className="h-14 flex items-center justify-between px-4 border-b border-white/10 shrink-0">
              <h3 className="font-bold">{sidebarPanel === 'chat' ? 'الدردشة' : 'المشاركين'}</h3>
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={() => setSidebarPanel(null)}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            {sidebarPanel === 'chat' ? (
              <>
                <div className="flex-1 p-4 overflow-y-auto space-y-4">
                  <div className="text-center text-xs text-white/40 my-4">الرسائل هنا تُحذف بعد انتهاء الاجتماع</div>
                  {/* Mock message */}
                  <div className="bg-[#2c302c] p-3 rounded-lg rounded-br-none max-w-[85%] mr-auto text-sm">
                    <div className="font-bold text-xs text-primary mb-1">المستضيف</div>
                    أهلاً بكم جميعاً في هذه الجلسة.
                  </div>
                </div>
                <div className="p-3 border-t border-white/10 shrink-0">
                  <div className="flex gap-2">
                    <Input placeholder="رسالة..." className="bg-white/5 border-transparent text-white placeholder:text-white/40 focus-visible:ring-primary" />
                    <Button size="icon" className="shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground">
                      <Send className="w-4 h-4 rtl:-scale-x-100" />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 overflow-y-auto p-2">
                <div className="text-xs font-medium text-white/50 px-2 py-2 mb-2">في الاجتماع ({mockParticipants.length})</div>
                {mockParticipants.map(p => (
                  <div key={p.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5">
                    <div className="flex items-center gap-3 truncate pr-2">
                      <Avatar className="w-8 h-8 shrink-0">
                        <AvatarFallback className="bg-[#2c302c] text-xs">{p.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="truncate">
                        <div className="text-sm font-medium truncate">{p.name}</div>
                        {p.isHost && <div className="text-[10px] text-primary">المستضيف</div>}
                      </div>
                    </div>
                    <div className="flex gap-2 text-white/40 shrink-0">
                      {p.isVideoOff ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4 text-white" />}
                      {p.isMuted ? <MicOff className="w-4 h-4 text-red-400" /> : <Mic className="w-4 h-4 text-white" />}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Controls */}
      <div className="h-20 bg-black/60 border-t border-white/10 flex items-center justify-center gap-2 md:gap-4 px-4 shrink-0">
        
        <Button 
          variant={isMuted ? "destructive" : "secondary"} 
          size="icon" 
          className={`w-12 h-12 rounded-full ${!isMuted ? 'bg-[#2c302c] hover:bg-[#3c403c] text-white' : ''}`}
          onClick={() => setIsMuted(!isMuted)}
        >
          {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </Button>
        
        <Button 
          variant={isVideoOff ? "destructive" : "secondary"} 
          size="icon" 
          className={`w-12 h-12 rounded-full ${!isVideoOff ? 'bg-[#2c302c] hover:bg-[#3c403c] text-white' : ''}`}
          onClick={() => setIsVideoOff(!isVideoOff)}
        >
          {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
        </Button>

        <div className="w-px h-8 bg-white/10 mx-2 hidden md:block" />

        <Button 
          variant={isScreenSharing ? "default" : "secondary"} 
          size="icon" 
          className={`w-12 h-12 rounded-full hidden sm:flex ${!isScreenSharing ? 'bg-[#2c302c] hover:bg-[#3c403c] text-white' : ''}`}
          onClick={() => setIsScreenSharing(!isScreenSharing)}
        >
          <MonitorUp className="w-5 h-5" />
        </Button>

        <Button 
          variant={isHandRaised ? "default" : "secondary"} 
          size="icon" 
          className={`w-12 h-12 rounded-full ${!isHandRaised ? 'bg-[#2c302c] hover:bg-[#3c403c] text-white' : 'bg-orange-500 hover:bg-orange-600 text-white'}`}
          onClick={() => setIsHandRaised(!isHandRaised)}
        >
          <Hand className="w-5 h-5" />
        </Button>

        <div className="w-px h-8 bg-white/10 mx-2 hidden md:block" />

        <Button 
          variant="secondary" 
          size="icon" 
          className={`w-12 h-12 rounded-full bg-[#2c302c] hover:bg-[#3c403c] text-white ${sidebarPanel === 'participants' ? 'bg-primary text-primary-foreground hover:bg-primary/90' : ''}`}
          onClick={() => setSidebarPanel(sidebarPanel === 'participants' ? null : 'participants')}
        >
          <Users className="w-5 h-5" />
        </Button>

        <Button 
          variant="secondary" 
          size="icon" 
          className={`w-12 h-12 rounded-full bg-[#2c302c] hover:bg-[#3c403c] text-white ${sidebarPanel === 'chat' ? 'bg-primary text-primary-foreground hover:bg-primary/90' : ''}`}
          onClick={() => setSidebarPanel(sidebarPanel === 'chat' ? null : 'chat')}
        >
          <MessageSquare className="w-5 h-5" />
        </Button>

        <div className="flex-1" />

        <Button asChild variant="destructive" className="rounded-full px-6 h-12 font-bold gap-2">
          <Link href={`/meetings/${meetingId}`}>
            <PhoneOff className="w-5 h-5" />
            <span className="hidden sm:inline">مغادرة</span>
          </Link>
        </Button>
      </div>

    </div>
  );
}

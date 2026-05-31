import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "wouter";
import { useGetMeeting, getGetMeetingQueryKey, useGetMe } from "@workspace/api-client-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Video, VideoOff, MonitorUp, Hand, PhoneOff, MessageSquare, Users, X, Send } from "lucide-react";
import { Input } from "@/components/ui/input";
import { getSocket, connectSocket } from "@/lib/socket";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

interface ChatMessage {
  userId: number;
  displayName: string;
  content: string;
  timestamp: string;
}

interface Participant {
  userId: number;
  displayName: string;
}

export default function MeetingRoom() {
  const params = useParams();
  const meetingId = Number(params.meetingId);
  const { data: meeting } = useGetMeeting(meetingId, {
    query: { enabled: !!meetingId, queryKey: getGetMeetingQueryKey(meetingId) }
  });
  const { data: me } = useGetMe();

  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [sidebarPanel, setSidebarPanel] = useState<'chat' | 'participants' | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [liveParticipants, setLiveParticipants] = useState<Participant[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    connectSocket();
    const socket = getSocket();
    socket.emit("join:meeting", meetingId);

    socket.on("meeting:chat_message", (msg: ChatMessage) => {
      setChatMessages(prev => [...prev, msg]);
    });

    socket.on("meeting:participant_joined", (data: Participant) => {
      setLiveParticipants(prev => {
        if (prev.find(p => p.userId === data.userId)) return prev;
        return [...prev, data];
      });
    });

    socket.on("meeting:participant_left", (data: { userId: number }) => {
      setLiveParticipants(prev => prev.filter(p => p.userId !== data.userId));
    });

    if (me) {
      setLiveParticipants([{ userId: me.id, displayName: me.displayName }]);
    }

    return () => {
      socket.off("meeting:chat_message");
      socket.off("meeting:participant_joined");
      socket.off("meeting:participant_left");
      socket.emit("leave:meeting", meetingId);
    };
  }, [meetingId, me?.id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const sendChatMessage = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!chatInput.trim()) return;
    const socket = getSocket();
    socket.emit("meeting:chat", { meetingId, content: chatInput });
    setChatInput("");
  };

  const allParticipants = liveParticipants.length > 0
    ? liveParticipants
    : [{ userId: me?.id ?? 0, displayName: me?.displayName ?? "أنت" }];

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
        <div className="flex items-center gap-3">
          <div className="text-xs text-white/50">{allParticipants.length} مشارك</div>
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
            {allParticipants.slice(0, 4).map((p, i) => {
              const isMe = p.userId === me?.id;
              return (
                <div key={p.userId} className={`relative rounded-xl overflow-hidden bg-black/60 border-2 ${i === 0 ? 'border-primary' : 'border-transparent'} transition-colors`}>
                  
                  {/* Video Placeholder */}
                  {(isMe && isVideoOff) ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Avatar className="w-24 h-24">
                        <AvatarFallback className="bg-[#2c302c] text-2xl">{p.displayName.charAt(0)}</AvatarFallback>
                      </Avatar>
                    </div>
                  ) : (
                    <div className="absolute inset-0 bg-[#2c302c] flex items-center justify-center">
                      <Avatar className="w-20 h-20">
                        <AvatarFallback className="bg-[#3c403c] text-2xl">{p.displayName.charAt(0)}</AvatarFallback>
                      </Avatar>
                    </div>
                  )}

                  {/* Participant Label */}
                  <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur px-3 py-1.5 rounded-lg flex items-center gap-2 max-w-[calc(100%-24px)]">
                    {(isMe && isMuted) ? <MicOff className="w-4 h-4 text-red-400 shrink-0" /> : <Mic className="w-4 h-4 text-green-400 shrink-0" />}
                    <span className="text-sm font-medium truncate">{isMe ? `${p.displayName} (أنت)` : p.displayName}</span>
                    {p.userId === meeting?.hostId && <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded mr-1 shrink-0">مستضيف</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Sidebar */}
        {sidebarPanel && (
          <div className="w-80 bg-[#141614] border-r border-white/10 flex flex-col shrink-0">
            <div className="h-14 flex items-center justify-between px-4 border-b border-white/10 shrink-0">
              <h3 className="font-bold">{sidebarPanel === 'chat' ? 'الدردشة' : `المشاركين (${allParticipants.length})`}</h3>
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={() => setSidebarPanel(null)}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            {sidebarPanel === 'chat' ? (
              <>
                <div className="flex-1 p-4 overflow-y-auto space-y-4">
                  <div className="text-center text-xs text-white/40 my-4">الرسائل هنا مباشرة وتُحذف بعد انتهاء الاجتماع</div>
                  {chatMessages.map((msg, i) => {
                    const isMe = msg.userId === me?.id;
                    return (
                      <div key={i} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                        <div className={`max-w-[85%] p-3 rounded-xl text-sm ${isMe ? 'bg-primary/20 text-white rounded-br-none' : 'bg-[#2c302c] text-white rounded-bl-none'}`}>
                          {!isMe && <div className="font-bold text-xs text-primary mb-1">{msg.displayName}</div>}
                          {msg.content}
                        </div>
                        <span className="text-[10px] text-white/30 mt-1 mx-1">
                          {format(new Date(msg.timestamp), 'h:mm a', { locale: ar })}
                        </span>
                      </div>
                    );
                  })}
                  {chatMessages.length === 0 && (
                    <div className="text-center text-white/30 text-sm py-8">لا توجد رسائل بعد</div>
                  )}
                  <div ref={chatEndRef} />
                </div>
                <div className="p-3 border-t border-white/10 shrink-0">
                  <form onSubmit={sendChatMessage} className="flex gap-2">
                    <Input
                      value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                      placeholder="رسالة..."
                      className="bg-white/5 border-transparent text-white placeholder:text-white/40 focus-visible:ring-primary"
                    />
                    <Button type="submit" size="icon" disabled={!chatInput.trim()} className="shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground">
                      <Send className="w-4 h-4 rtl:-scale-x-100" />
                    </Button>
                  </form>
                </div>
              </>
            ) : (
              <div className="flex-1 overflow-y-auto p-2">
                <div className="text-xs font-medium text-white/50 px-2 py-2 mb-2">في الاجتماع ({allParticipants.length})</div>
                {allParticipants.map(p => (
                  <div key={p.userId} className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5">
                    <div className="flex items-center gap-3 truncate pr-2">
                      <Avatar className="w-8 h-8 shrink-0">
                        <AvatarFallback className="bg-[#2c302c] text-xs">{p.displayName.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="truncate">
                        <div className="text-sm font-medium truncate">
                          {p.displayName}
                          {p.userId === me?.id && <span className="text-white/40 text-xs mr-1">(أنت)</span>}
                        </div>
                        {p.userId === meeting?.hostId && <div className="text-[10px] text-primary">المستضيف</div>}
                      </div>
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
          className={`w-12 h-12 rounded-full bg-[#2c302c] hover:bg-[#3c403c] text-white ${sidebarPanel === 'participants' ? 'ring-2 ring-primary' : ''}`}
          onClick={() => setSidebarPanel(sidebarPanel === 'participants' ? null : 'participants')}
        >
          <Users className="w-5 h-5" />
        </Button>

        <Button 
          variant="secondary" 
          size="icon" 
          className={`w-12 h-12 rounded-full bg-[#2c302c] hover:bg-[#3c403c] text-white relative ${sidebarPanel === 'chat' ? 'ring-2 ring-primary' : ''}`}
          onClick={() => setSidebarPanel(sidebarPanel === 'chat' ? null : 'chat')}
        >
          <MessageSquare className="w-5 h-5" />
          {chatMessages.length > 0 && sidebarPanel !== 'chat' && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-primary-foreground text-[9px] font-bold rounded-full flex items-center justify-center">
              {chatMessages.length > 9 ? "9+" : chatMessages.length}
            </span>
          )}
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

import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "wouter";
import { useGetMeeting, getGetMeetingQueryKey, useGetMe } from "@workspace/api-client-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Video, VideoOff, MonitorUp, MonitorOff, Hand, PhoneOff, MessageSquare, Users, X, Send, WifiOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { getSocket, connectSocket } from "@/lib/socket";
import { useWebRTC } from "@/hooks/useWebRTC";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

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

function VideoTile({
  stream,
  muted,
  name,
  isVideoOff,
  isMuted: audioMuted,
  isSpeaking,
  isHost,
  isScreenShare,
  isHandRaised,
}: {
  stream: MediaStream | null;
  muted?: boolean;
  name: string;
  isVideoOff?: boolean;
  isMuted?: boolean;
  isSpeaking?: boolean;
  isHost?: boolean;
  isScreenShare?: boolean;
  isHandRaised?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream ?? null;
    }
  }, [stream]);

  const hasVideo = stream && stream.getVideoTracks().some(t => t.enabled) && !isVideoOff;

  return (
    <div className={`relative rounded-xl overflow-hidden bg-black/60 border-2 ${
      isHandRaised ? "border-orange-400" : isSpeaking ? "border-primary" : isScreenShare ? "border-blue-400" : "border-transparent"
    } transition-colors min-h-[180px]`}>
      {hasVideo ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={muted}
          className="absolute inset-0 w-full h-full object-contain bg-black"
        />
      ) : (
        <div className="absolute inset-0 bg-[#2c302c] flex items-center justify-center">
          <Avatar className="w-20 h-20">
            <AvatarFallback className="bg-[#3c403c] text-2xl text-white">{name.charAt(0)}</AvatarFallback>
          </Avatar>
        </div>
      )}
      {!hasVideo && stream && (
        <audio ref={(el) => { if (el) el.srcObject = stream; }} autoPlay />
      )}

      {/* Raised hand badge — top corner */}
      {isHandRaised && (
        <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-orange-500/90 backdrop-blur px-2.5 py-1.5 rounded-full animate-bounce shadow-lg">
          <Hand className="w-4 h-4 text-white" />
          <span className="text-xs font-bold text-white">يد مرفوعة</span>
        </div>
      )}

      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
        <div className="bg-black/60 backdrop-blur px-3 py-1.5 rounded-lg flex items-center gap-2 max-w-[70%]">
          {audioMuted
            ? <MicOff className="w-3.5 h-3.5 text-red-400 shrink-0" />
            : <Mic className="w-3.5 h-3.5 text-green-400 shrink-0" />}
          <span className="text-sm font-medium truncate text-white">{name}</span>
          {isScreenShare && (
            <span className="text-[10px] bg-blue-500/80 text-white px-1.5 py-0.5 rounded font-bold shrink-0">شاشة</span>
          )}
        </div>
        {isHost && (
          <span className="bg-primary/80 text-white text-[10px] font-bold px-2 py-1 rounded">مستضيف</span>
        )}
      </div>
    </div>
  );
}

export default function MeetingRoom() {
  const params = useParams();
  const meetingId = Number(params.meetingId);
  const { toast } = useToast();
  const { data: meeting } = useGetMeeting(meetingId, {
    query: { enabled: !!meetingId, queryKey: getGetMeetingQueryKey(meetingId) },
  });
  const { data: me } = useGetMe();

  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [raisedHands, setRaisedHands] = useState<Set<number>>(new Set());
  const [sidebarPanel, setSidebarPanel] = useState<"chat" | "participants" | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [liveParticipants, setLiveParticipants] = useState<Participant[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const {
    localStream,
    remoteStreams,
    hasMediaPermission,
    isScreenSharing,
    startScreenShare,
    stopScreenShare,
    canScreenShare,
  } = useWebRTC({ meetingId, myUserId: me?.id, isMuted, isVideoOff });

  const handleScreenShare = async () => {
    if (isScreenSharing) {
      stopScreenShare();
      toast({ title: "انتهت مشاركة الشاشة" });
    } else {
      if (!canScreenShare) {
        toast({ title: "غير مدعوم", description: "متصفحك لا يدعم مشاركة الشاشة.", variant: "destructive" });
        return;
      }
      await startScreenShare();
      if (isScreenSharing) {
        toast({ title: "مشاركة الشاشة نشطة", description: "الجميع يرى شاشتك الآن." });
      }
    }
  };

  useEffect(() => {
    if (!me) return;
    connectSocket();
    const socket = getSocket();

    socket.emit("join:meeting", { meetingId, displayName: me.displayName });
    setLiveParticipants([{ userId: me.id, displayName: me.displayName }]);

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
      setRaisedHands(prev => { const n = new Set(prev); n.delete(data.userId); return n; });
    });

    socket.on("meeting:hand_raised", (data: { userId: number; displayName: string }) => {
      setRaisedHands(prev => new Set([...prev, data.userId]));
      toast({
        title: "✋ " + data.displayName,
        description: "رفع يده ويريد التحدث",
        duration: 4000,
      });
    });

    socket.on("meeting:hand_lowered", (data: { userId: number }) => {
      setRaisedHands(prev => { const n = new Set(prev); n.delete(data.userId); return n; });
    });

    socket.on("meeting:all_hands_lowered", () => {
      setRaisedHands(new Set());
      setIsHandRaised(false);
    });

    return () => {
      socket.off("meeting:chat_message");
      socket.off("meeting:participant_joined");
      socket.off("meeting:participant_left");
      socket.off("meeting:hand_raised");
      socket.off("meeting:hand_lowered");
      socket.off("meeting:all_hands_lowered");
      socket.emit("leave:meeting", { meetingId });
    };
  }, [meetingId, me?.id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const sendChatMessage = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!chatInput.trim()) return;
    getSocket().emit("meeting:chat", { meetingId, content: chatInput });
    setChatInput("");
  };

  const totalCount = Math.max(liveParticipants.length, 1 + remoteStreams.size);

  return (
    <div className="flex flex-col h-screen bg-[#1c1f1c] text-white overflow-hidden">

      {/* Top bar */}
      <div className="h-14 px-4 flex items-center justify-between bg-black/40 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="font-bold truncate max-w-xs">{meeting?.title || "جاري التحميل..."}</div>
          {meeting?.isRecording && (
            <div className="flex items-center gap-1 text-xs font-medium text-red-500 bg-red-500/10 px-2 py-1 rounded">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              تسجيل
            </div>
          )}
          {isScreenSharing && (
            <div className="flex items-center gap-1.5 text-xs font-medium text-blue-400 bg-blue-400/10 px-2 py-1 rounded animate-pulse">
              <MonitorUp className="w-3.5 h-3.5" />
              أنت تشارك شاشتك
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          {!hasMediaPermission && (
            <div className="flex items-center gap-1.5 text-xs text-amber-400 bg-amber-400/10 px-2 py-1 rounded">
              <WifiOff className="w-3.5 h-3.5" />
              لا يوجد وصول للكاميرا/المايك
            </div>
          )}
          <div className="text-xs text-white/50">{totalCount} مشارك</div>
          <div className="bg-white/10 px-3 py-1 rounded-md text-xs font-mono">{meeting?.joinCode}</div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">

        {/* Video grid */}
        <div className="flex-1 p-4 overflow-y-auto">
          <div className={`grid gap-4 h-full ${
            totalCount <= 1 ? "grid-cols-1" :
            totalCount <= 2 ? "grid-cols-2" :
            totalCount <= 4 ? "grid-cols-2" : "grid-cols-3"
          }`}>

            {/* Local tile */}
            <VideoTile
              stream={localStream}
              muted
              name={me ? `${me.displayName} (أنت)` : "أنت"}
              isVideoOff={isVideoOff && !isScreenSharing}
              isMuted={isMuted}
              isSpeaking={!isMuted}
              isHost={me?.id === meeting?.hostId}
              isScreenShare={isScreenSharing}
              isHandRaised={isHandRaised}
            />

            {/* Remote tiles */}
            {Array.from(remoteStreams.entries()).map(([uid, stream]) => {
              const participant = liveParticipants.find(p => p.userId === uid);
              return (
                <VideoTile
                  key={uid}
                  stream={stream}
                  name={participant?.displayName ?? `مشارك ${uid}`}
                  isHost={uid === meeting?.hostId}
                  isHandRaised={raisedHands.has(uid)}
                />
              );
            })}

            {/* Placeholder tiles for participants without streams yet */}
            {liveParticipants
              .filter(p => p.userId !== me?.id && !remoteStreams.has(p.userId))
              .map(p => (
                <VideoTile
                  key={p.userId}
                  stream={null}
                  name={p.displayName}
                  isVideoOff
                  isMuted
                  isHost={p.userId === meeting?.hostId}
                  isHandRaised={raisedHands.has(p.userId)}
                />
              ))}
          </div>
        </div>

        {/* Right sidebar */}
        {sidebarPanel && (
          <div className="w-80 bg-[#141614] border-r border-white/10 flex flex-col shrink-0">
            <div className="h-14 flex items-center justify-between px-4 border-b border-white/10 shrink-0">
              <h3 className="font-bold">
                {sidebarPanel === "chat" ? "الدردشة" : `المشاركين (${totalCount})`}
              </h3>
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={() => setSidebarPanel(null)}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            {sidebarPanel === "chat" ? (
              <>
                <div className="flex-1 p-4 overflow-y-auto space-y-4">
                  <div className="text-center text-xs text-white/40 my-4">الرسائل تُحذف بعد انتهاء الاجتماع</div>
                  {chatMessages.map((msg, i) => {
                    const isMe = msg.userId === me?.id;
                    return (
                      <div key={i} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                        <div className={`max-w-[85%] p-3 rounded-xl text-sm ${isMe ? "bg-primary/20 text-white rounded-br-none" : "bg-[#2c302c] text-white rounded-bl-none"}`}>
                          {!isMe && <div className="font-bold text-xs text-primary mb-1">{msg.displayName}</div>}
                          {msg.content}
                        </div>
                        <span className="text-[10px] text-white/30 mt-1 mx-1">
                          {format(new Date(msg.timestamp), "h:mm a", { locale: ar })}
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
                    <Button type="submit" size="icon" disabled={!chatInput.trim()} className="shrink-0 bg-primary hover:bg-primary/90">
                      <Send className="w-4 h-4 rtl:-scale-x-100" />
                    </Button>
                  </form>
                </div>
              </>
            ) : (
              <div className="flex-1 overflow-y-auto p-2">
                <div className="text-xs font-medium text-white/50 px-2 py-2 mb-1">في الاجتماع ({totalCount})</div>

                {me && (
                  <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5">
                    <Avatar className="w-8 h-8 shrink-0">
                      <AvatarFallback className="bg-[#2c302c] text-xs text-white">{me.displayName.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 truncate">
                      <div className="text-sm font-medium truncate">{me.displayName} <span className="text-white/40 text-xs">(أنت)</span></div>
                      {me.id === meeting?.hostId && <div className="text-[10px] text-primary">المستضيف</div>}
                    </div>
                    <div className="flex gap-2 text-white/40 shrink-0">
                      {isHandRaised && <Hand className="w-4 h-4 text-orange-400" />}
                      {isScreenSharing && <MonitorUp className="w-4 h-4 text-blue-400" />}
                      {isVideoOff ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4 text-white" />}
                      {isMuted ? <MicOff className="w-4 h-4 text-red-400" /> : <Mic className="w-4 h-4 text-white" />}
                    </div>
                  </div>
                )}

                {liveParticipants.filter(p => p.userId !== me?.id).map(p => (
                  <div key={p.userId} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5">
                    <Avatar className="w-8 h-8 shrink-0">
                      <AvatarFallback className="bg-[#2c302c] text-xs text-white">{p.displayName.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 truncate">
                      <div className="text-sm font-medium truncate">{p.displayName}</div>
                      {p.userId === meeting?.hostId && <div className="text-[10px] text-primary">المستضيف</div>}
                    </div>
                    <div className="flex gap-2 shrink-0">
                      {raisedHands.has(p.userId) && <Hand className="w-4 h-4 text-orange-400" />}
                      {remoteStreams.has(p.userId)
                        ? <Video className="w-4 h-4 text-white" />
                        : <VideoOff className="w-4 h-4 text-white/40" />}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom controls */}
      <div className="h-20 bg-black/60 border-t border-white/10 flex items-center justify-center gap-2 md:gap-3 px-4 shrink-0">

        {/* Mic */}
        <Button
          variant={isMuted ? "destructive" : "secondary"}
          size="icon"
          title={isMuted ? "تفعيل المايك" : "كتم المايك"}
          className={`w-12 h-12 rounded-full ${!isMuted ? "bg-[#2c302c] hover:bg-[#3c403c] text-white" : ""}`}
          onClick={() => setIsMuted(v => !v)}
        >
          {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </Button>

        {/* Camera */}
        <Button
          variant={isVideoOff ? "destructive" : "secondary"}
          size="icon"
          title={isVideoOff ? "تفعيل الكاميرا" : "إيقاف الكاميرا"}
          className={`w-12 h-12 rounded-full ${!isVideoOff ? "bg-[#2c302c] hover:bg-[#3c403c] text-white" : ""}`}
          onClick={() => setIsVideoOff(v => !v)}
          disabled={isScreenSharing}
        >
          {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
        </Button>

        <div className="w-px h-8 bg-white/10 mx-1 hidden md:block" />

        {/* Screen share */}
        <Button
          variant={isScreenSharing ? "default" : "secondary"}
          size="icon"
          title={isScreenSharing ? "إيقاف مشاركة الشاشة" : "مشاركة الشاشة"}
          className={`w-12 h-12 rounded-full hidden sm:flex ${
            isScreenSharing
              ? "bg-blue-500 hover:bg-blue-600 text-white ring-2 ring-blue-400"
              : "bg-[#2c302c] hover:bg-[#3c403c] text-white"
          } ${!canScreenShare ? "opacity-40 cursor-not-allowed" : ""}`}
          onClick={handleScreenShare}
          disabled={!canScreenShare}
        >
          {isScreenSharing ? <MonitorOff className="w-5 h-5" /> : <MonitorUp className="w-5 h-5" />}
        </Button>

        {/* Lower all hands — host only, shown when hands are raised */}
        {me?.id === meeting?.hostId && raisedHands.size > 0 && (
          <Button
            variant="secondary"
            size="sm"
            title="إنزال كل الأيدي"
            className="h-12 px-3 rounded-full bg-orange-500/20 hover:bg-orange-500/40 text-orange-300 border border-orange-500/40 text-xs font-bold gap-1.5 hidden sm:flex"
            onClick={() => {
              getSocket().emit("meeting:lower_all_hands", { meetingId });
            }}
          >
            <Hand className="w-4 h-4" />
            <span>إنزال الكل ({raisedHands.size})</span>
          </Button>
        )}

        {/* Raise hand */}
        <Button
          variant={isHandRaised ? "default" : "secondary"}
          size="icon"
          title={isHandRaised ? "إنزال اليد" : "رفع اليد"}
          className={`w-12 h-12 rounded-full ${
            isHandRaised
              ? "bg-orange-500 hover:bg-orange-600 text-white ring-2 ring-orange-300"
              : "bg-[#2c302c] hover:bg-[#3c403c] text-white"
          }`}
          onClick={() => {
            const next = !isHandRaised;
            setIsHandRaised(next);
            if (next) {
              getSocket().emit("meeting:raise_hand", { meetingId });
            } else {
              getSocket().emit("meeting:lower_hand", { meetingId });
            }
          }}
        >
          <Hand className="w-5 h-5" />
        </Button>

        <div className="w-px h-8 bg-white/10 mx-1 hidden md:block" />

        {/* Participants */}
        <Button
          variant="secondary"
          size="icon"
          title="المشاركون"
          className={`w-12 h-12 rounded-full bg-[#2c302c] hover:bg-[#3c403c] text-white ${sidebarPanel === "participants" ? "ring-2 ring-primary" : ""}`}
          onClick={() => setSidebarPanel(sidebarPanel === "participants" ? null : "participants")}
        >
          <Users className="w-5 h-5" />
        </Button>

        {/* Chat */}
        <Button
          variant="secondary"
          size="icon"
          title="الدردشة"
          className={`w-12 h-12 rounded-full bg-[#2c302c] hover:bg-[#3c403c] text-white relative ${sidebarPanel === "chat" ? "ring-2 ring-primary" : ""}`}
          onClick={() => setSidebarPanel(sidebarPanel === "chat" ? null : "chat")}
        >
          <MessageSquare className="w-5 h-5" />
          {chatMessages.length > 0 && sidebarPanel !== "chat" && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-primary-foreground text-[9px] font-bold rounded-full flex items-center justify-center">
              {chatMessages.length > 9 ? "9+" : chatMessages.length}
            </span>
          )}
        </Button>

        <div className="flex-1" />

        {/* Leave */}
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

import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "wouter";
import { useGetMeeting, getGetMeetingQueryKey, useGetMe } from "@workspace/api-client-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Video, VideoOff, MonitorUp, Hand, PhoneOff, MessageSquare, Users, X, Send, WifiOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { getSocket, connectSocket } from "@/lib/socket";
import { useWebRTC } from "@/hooks/useWebRTC";
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

// Renders a MediaStream into a <video> element
function VideoTile({
  stream,
  muted,
  name,
  isVideoOff,
  isMuted: audioMuted,
  isSpeaking,
  isHost,
}: {
  stream: MediaStream | null;
  muted?: boolean;
  name: string;
  isVideoOff?: boolean;
  isMuted?: boolean;
  isSpeaking?: boolean;
  isHost?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream ?? null;
    }
  }, [stream]);

  const hasVideo = stream && stream.getVideoTracks().some(t => t.enabled) && !isVideoOff;

  return (
    <div className={`relative rounded-xl overflow-hidden bg-black/60 border-2 ${isSpeaking ? "border-primary" : "border-transparent"} transition-colors min-h-[180px]`}>
      {hasVideo ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={muted}
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 bg-[#2c302c] flex items-center justify-center">
          <Avatar className="w-20 h-20">
            <AvatarFallback className="bg-[#3c403c] text-2xl text-white">{name.charAt(0)}</AvatarFallback>
          </Avatar>
        </div>
      )}
      {/* hidden audio element for remote stream when video is off */}
      {!hasVideo && stream && (
        <audio ref={(el) => { if (el) el.srcObject = stream; }} autoPlay />
      )}
      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
        <div className="bg-black/60 backdrop-blur px-3 py-1.5 rounded-lg flex items-center gap-2 max-w-[70%]">
          {audioMuted
            ? <MicOff className="w-3.5 h-3.5 text-red-400 shrink-0" />
            : <Mic className="w-3.5 h-3.5 text-green-400 shrink-0" />}
          <span className="text-sm font-medium truncate text-white">{name}</span>
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
  const { data: meeting } = useGetMeeting(meetingId, {
    query: { enabled: !!meetingId, queryKey: getGetMeetingQueryKey(meetingId) },
  });
  const { data: me } = useGetMe();

  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [sidebarPanel, setSidebarPanel] = useState<"chat" | "participants" | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [liveParticipants, setLiveParticipants] = useState<Participant[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // WebRTC: real streams
  const { localStream, remoteStreams, hasMediaPermission } = useWebRTC({
    meetingId,
    myUserId: me?.id,
    isMuted,
    isVideoOff,
  });

  // Join meeting room over socket
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
    });

    return () => {
      socket.off("meeting:chat_message");
      socket.off("meeting:participant_joined");
      socket.off("meeting:participant_left");
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
          <div className={`grid gap-4 h-full ${totalCount <= 1 ? "" : totalCount <= 2 ? "grid-cols-2" : totalCount <= 4 ? "grid-cols-2" : "grid-cols-3"}`}>

            {/* Local tile */}
            <VideoTile
              stream={localStream}
              muted
              name={me ? `${me.displayName} (أنت)` : "أنت"}
              isVideoOff={isVideoOff}
              isMuted={isMuted}
              isSpeaking={!isMuted}
              isHost={me?.id === meeting?.hostId}
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

                {/* Self */}
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
                      {isVideoOff ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4 text-white" />}
                      {isMuted ? <MicOff className="w-4 h-4 text-red-400" /> : <Mic className="w-4 h-4 text-white" />}
                    </div>
                  </div>
                )}

                {/* Remote participants */}
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
      <div className="h-20 bg-black/60 border-t border-white/10 flex items-center justify-center gap-2 md:gap-4 px-4 shrink-0">

        <Button
          variant={isMuted ? "destructive" : "secondary"}
          size="icon"
          className={`w-12 h-12 rounded-full ${!isMuted ? "bg-[#2c302c] hover:bg-[#3c403c] text-white" : ""}`}
          onClick={() => setIsMuted(v => !v)}
        >
          {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </Button>

        <Button
          variant={isVideoOff ? "destructive" : "secondary"}
          size="icon"
          className={`w-12 h-12 rounded-full ${!isVideoOff ? "bg-[#2c302c] hover:bg-[#3c403c] text-white" : ""}`}
          onClick={() => setIsVideoOff(v => !v)}
        >
          {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
        </Button>

        <div className="w-px h-8 bg-white/10 mx-2 hidden md:block" />

        <Button
          variant={isScreenSharing ? "default" : "secondary"}
          size="icon"
          className={`w-12 h-12 rounded-full hidden sm:flex ${!isScreenSharing ? "bg-[#2c302c] hover:bg-[#3c403c] text-white" : ""}`}
          onClick={() => setIsScreenSharing(v => !v)}
        >
          <MonitorUp className="w-5 h-5" />
        </Button>

        <Button
          variant={isHandRaised ? "default" : "secondary"}
          size="icon"
          className={`w-12 h-12 rounded-full ${!isHandRaised ? "bg-[#2c302c] hover:bg-[#3c403c] text-white" : "bg-orange-500 hover:bg-orange-600 text-white"}`}
          onClick={() => setIsHandRaised(v => !v)}
        >
          <Hand className="w-5 h-5" />
        </Button>

        <div className="w-px h-8 bg-white/10 mx-2 hidden md:block" />

        <Button
          variant="secondary"
          size="icon"
          className={`w-12 h-12 rounded-full bg-[#2c302c] hover:bg-[#3c403c] text-white ${sidebarPanel === "participants" ? "ring-2 ring-primary" : ""}`}
          onClick={() => setSidebarPanel(sidebarPanel === "participants" ? null : "participants")}
        >
          <Users className="w-5 h-5" />
        </Button>

        <Button
          variant="secondary"
          size="icon"
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

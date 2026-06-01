import { useState, useEffect, useRef } from "react";
import { useParams, Link, useLocation } from "wouter";
import { useGetMeeting, getGetMeetingQueryKey, useGetMe } from "@workspace/api-client-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Mic, MicOff, Video, VideoOff, MonitorUp, Hand, PhoneOff,
  MessageSquare, Users, X, Send, WifiOff, Clock, UserCheck, UserX,
  ShieldAlert,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { getSocket, connectSocket } from "@/lib/socket";
import { useWebRTC } from "@/hooks/useWebRTC";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

// ── Types ──────────────────────────────────────────────────────────────────

type JoinStatus = "loading" | "waiting" | "admitted" | "rejected";

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

// ── VideoTile ──────────────────────────────────────────────────────────────

function VideoTile({
  stream, muted, name, isVideoOff, isMuted: audioMuted, isSpeaking, isHost,
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
    if (videoRef.current) videoRef.current.srcObject = stream ?? null;
  }, [stream]);

  const hasVideo = !!stream && stream.getVideoTracks().some(t => t.enabled) && !isVideoOff;

  return (
    <div className={`relative rounded-xl overflow-hidden bg-black/60 border-2 ${isSpeaking ? "border-primary" : "border-transparent"} transition-colors min-h-[180px]`}>
      {hasVideo ? (
        <video ref={videoRef} autoPlay playsInline muted={muted} className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <div className="absolute inset-0 bg-[#2c302c] flex items-center justify-center">
          <Avatar className="w-20 h-20">
            <AvatarFallback className="bg-[#3c403c] text-2xl text-white">{name.charAt(0)}</AvatarFallback>
          </Avatar>
        </div>
      )}
      {!hasVideo && stream && <audio ref={(el) => { if (el) el.srcObject = stream; }} autoPlay />}
      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
        <div className="bg-black/60 backdrop-blur px-3 py-1.5 rounded-lg flex items-center gap-2 max-w-[70%]">
          {audioMuted
            ? <MicOff className="w-3.5 h-3.5 text-red-400 shrink-0" />
            : <Mic className="w-3.5 h-3.5 text-green-400 shrink-0" />}
          <span className="text-sm font-medium truncate text-white">{name}</span>
        </div>
        {isHost && <span className="bg-primary/80 text-white text-[10px] font-bold px-2 py-1 rounded">مستضيف</span>}
      </div>
    </div>
  );
}

// ── Waiting Room Screen ────────────────────────────────────────────────────

function WaitingRoomScreen({ title, onCancel }: { title: string; onCancel: () => void }) {
  return (
    <div className="h-screen bg-[#1c1f1c] flex items-center justify-center text-white">
      <div className="text-center space-y-8 max-w-md px-8">
        <div className="w-24 h-24 rounded-full bg-primary/20 border-2 border-primary/40 flex items-center justify-center mx-auto">
          <Clock className="w-12 h-12 text-primary animate-pulse" />
        </div>
        <div>
          <h1 className="text-2xl font-bold mb-3">غرفة الانتظار</h1>
          <p className="text-white/50 text-sm leading-relaxed">
            جاري انتظار موافقة المضيف على انضمامك إلى
          </p>
          <p className="text-white font-semibold mt-2 text-lg">"{title}"</p>
        </div>
        <div className="flex gap-2 justify-center">
          {[0, 150, 300].map(delay => (
            <div
              key={delay}
              className="w-2.5 h-2.5 rounded-full bg-primary animate-bounce"
              style={{ animationDelay: `${delay}ms` }}
            />
          ))}
        </div>
        <Button variant="ghost" onClick={onCancel} className="text-white/40 hover:text-white hover:bg-white/10">
          إلغاء والخروج
        </Button>
      </div>
    </div>
  );
}

// ── Rejected Screen ────────────────────────────────────────────────────────

function RejectedScreen({ onBack }: { onBack: () => void }) {
  return (
    <div className="h-screen bg-[#1c1f1c] flex items-center justify-center text-white">
      <div className="text-center space-y-6 max-w-md px-8">
        <div className="w-24 h-24 rounded-full bg-red-500/20 border-2 border-red-500/40 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-12 h-12 text-red-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold mb-3">لم يُقبل طلبك</h1>
          <p className="text-white/50 text-sm leading-relaxed">
            قرر المضيف عدم السماح لك بالانضمام إلى هذا الاجتماع.
          </p>
        </div>
        <Button onClick={onBack} className="bg-white/10 hover:bg-white/20 text-white border-0 rounded-full px-8">
          العودة
        </Button>
      </div>
    </div>
  );
}

// ── Main Meeting Room ──────────────────────────────────────────────────────

export default function MeetingRoom() {
  const params = useParams();
  const meetingId = Number(params.meetingId);
  const [, setLocation] = useLocation();

  const { data: meeting, isLoading: meetingLoading } = useGetMeeting(meetingId, {
    query: { enabled: !!meetingId, queryKey: getGetMeetingQueryKey(meetingId) },
  });
  const { data: me } = useGetMe();

  const [joinStatus, setJoinStatus] = useState<JoinStatus>("loading");
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [sidebarPanel, setSidebarPanel] = useState<"chat" | "participants" | "waiting" | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [liveParticipants, setLiveParticipants] = useState<Participant[]>([]);
  const [waitingQueue, setWaitingQueue] = useState<Participant[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const isHost = !!me && !!meeting && me.id === meeting.hostId;
  const admitted = joinStatus === "admitted";

  // WebRTC — only active once admitted
  const { localStream, remoteStreams, hasMediaPermission } = useWebRTC({
    meetingId,
    myUserId: me?.id,
    isMuted,
    isVideoOff,
    enabled: admitted,
  });

  // ── Determine join status once meeting + me are loaded ───────────────────
  useEffect(() => {
    if (!me || meetingLoading || !meeting) return;
    if (joinStatus !== "loading") return;

    connectSocket();
    const socket = getSocket();

    if (me.id === meeting.hostId) {
      // Host joins immediately
      setJoinStatus("admitted");
    } else {
      // Non-host: request admission
      setJoinStatus("waiting");
      socket.emit("meeting:request_join", {
        meetingId,
        hostId: meeting.hostId,
        displayName: me.displayName,
      });
    }

    // Listen for admission/rejection
    const onAdmitted = ({ meetingId: mid }: { meetingId: number }) => {
      if (mid === meetingId) setJoinStatus("admitted");
    };
    const onRejected = ({ meetingId: mid }: { meetingId: number }) => {
      if (mid === meetingId) setJoinStatus("rejected");
    };

    socket.on("meeting:admitted", onAdmitted);
    socket.on("meeting:rejected", onRejected);

    return () => {
      socket.off("meeting:admitted", onAdmitted);
      socket.off("meeting:rejected", onRejected);
    };
  }, [me?.id, meeting?.hostId, meetingLoading, meetingId]);

  // ── Join socket room + presence events once admitted ─────────────────────
  useEffect(() => {
    if (!admitted || !me) return;
    const socket = getSocket();

    socket.emit("join:meeting", { meetingId, displayName: me.displayName });
    setLiveParticipants([{ userId: me.id, displayName: me.displayName }]);

    const onChatMsg = (msg: ChatMessage) => setChatMessages(prev => [...prev, msg]);

    const onParticipantJoined = (data: Participant) =>
      setLiveParticipants(prev => prev.find(p => p.userId === data.userId) ? prev : [...prev, data]);

    const onParticipantLeft = ({ userId: uid }: { userId: number }) =>
      setLiveParticipants(prev => prev.filter(p => p.userId !== uid));

    // Host: receive waiting room requests
    const onWaitingRequest = (data: Participant) =>
      setWaitingQueue(prev => prev.find(p => p.userId === data.userId) ? prev : [...prev, data]);

    socket.on("meeting:chat_message", onChatMsg);
    socket.on("meeting:participant_joined", onParticipantJoined);
    socket.on("meeting:participant_left", onParticipantLeft);
    socket.on("meeting:waiting_request", onWaitingRequest);

    return () => {
      socket.off("meeting:chat_message", onChatMsg);
      socket.off("meeting:participant_joined", onParticipantJoined);
      socket.off("meeting:participant_left", onParticipantLeft);
      socket.off("meeting:waiting_request", onWaitingRequest);
      socket.emit("leave:meeting", { meetingId });
    };
  }, [admitted, meetingId, me?.id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // Auto-open waiting panel for host when someone is waiting
  useEffect(() => {
    if (isHost && waitingQueue.length > 0 && sidebarPanel !== "waiting") {
      setSidebarPanel("waiting");
    }
  }, [waitingQueue.length, isHost]);

  const sendChatMessage = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!chatInput.trim()) return;
    getSocket().emit("meeting:chat", { meetingId, content: chatInput });
    setChatInput("");
  };

  const admitParticipant = (targetUserId: number) => {
    getSocket().emit("meeting:admit", { meetingId, targetUserId });
    setWaitingQueue(prev => prev.filter(p => p.userId !== targetUserId));
  };

  const rejectParticipant = (targetUserId: number) => {
    getSocket().emit("meeting:reject", { meetingId, targetUserId });
    setWaitingQueue(prev => prev.filter(p => p.userId !== targetUserId));
  };

  // ── Screens ───────────────────────────────────────────────────────────────

  if (joinStatus === "loading" || (joinStatus === "waiting" && !meeting)) {
    return (
      <div className="h-screen bg-[#1c1f1c] flex items-center justify-center text-white">
        <div className="text-white/40 text-sm animate-pulse">جاري الاتصال...</div>
      </div>
    );
  }

  if (joinStatus === "waiting" && meeting) {
    return <WaitingRoomScreen title={meeting.title} onCancel={() => setLocation(`/meetings/${meetingId}`)} />;
  }

  if (joinStatus === "rejected") {
    return <RejectedScreen onBack={() => setLocation(`/meetings/${meetingId}`)} />;
  }

  // ── Main Room UI ──────────────────────────────────────────────────────────

  const totalCount = Math.max(liveParticipants.length, 1 + remoteStreams.size);
  const gridCols = totalCount <= 1 ? "grid-cols-1" : totalCount <= 2 ? "grid-cols-2" : "grid-cols-2 md:grid-cols-2";

  return (
    <div className="flex flex-col h-screen bg-[#1c1f1c] text-white overflow-hidden">

      {/* Top bar */}
      <div className="h-14 px-4 flex items-center justify-between bg-black/40 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="font-bold truncate max-w-xs">{meeting?.title}</div>
          {isHost && (
            <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded font-medium">مستضيف</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {!hasMediaPermission && (
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-amber-400 bg-amber-400/10 px-2 py-1 rounded">
              <WifiOff className="w-3.5 h-3.5" />
              لا يوجد وصول للكاميرا
            </div>
          )}
          {waitingQueue.length > 0 && isHost && (
            <button
              onClick={() => setSidebarPanel("waiting")}
              className="flex items-center gap-1.5 text-xs text-amber-300 bg-amber-400/10 border border-amber-400/20 px-3 py-1.5 rounded-lg hover:bg-amber-400/20 transition-colors animate-pulse"
            >
              <Clock className="w-3.5 h-3.5" />
              {waitingQueue.length} في الانتظار
            </button>
          )}
          <div className="text-xs text-white/50">{totalCount} مشارك</div>
          <div className="bg-white/10 px-3 py-1 rounded-md text-xs font-mono">{meeting?.joinCode}</div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">

        {/* Video grid */}
        <div className="flex-1 p-4 overflow-y-auto">
          <div className={`grid gap-4 h-full ${gridCols}`}>
            <VideoTile
              stream={localStream}
              muted
              name={me ? `${me.displayName} (أنت)` : "أنت"}
              isVideoOff={isVideoOff}
              isMuted={isMuted}
              isSpeaking={!isMuted}
              isHost={isHost}
            />
            {Array.from(remoteStreams.entries()).map(([uid, stream]) => {
              const p = liveParticipants.find(x => x.userId === uid);
              return (
                <VideoTile
                  key={uid}
                  stream={stream}
                  name={p?.displayName ?? `مشارك`}
                  isHost={uid === meeting?.hostId}
                />
              );
            })}
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
                {sidebarPanel === "chat" && "الدردشة"}
                {sidebarPanel === "participants" && `المشاركين (${totalCount})`}
                {sidebarPanel === "waiting" && (
                  <span className="flex items-center gap-2">
                    غرفة الانتظار
                    {waitingQueue.length > 0 && (
                      <span className="w-5 h-5 bg-amber-400 text-black text-[10px] font-bold rounded-full flex items-center justify-center">
                        {waitingQueue.length}
                      </span>
                    )}
                  </span>
                )}
              </h3>
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={() => setSidebarPanel(null)}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* ── Chat ── */}
            {sidebarPanel === "chat" && (
              <>
                <div className="flex-1 p-4 overflow-y-auto space-y-4">
                  <div className="text-center text-xs text-white/30 my-4">الرسائل تُحذف بعد انتهاء الاجتماع</div>
                  {chatMessages.map((msg, i) => {
                    const isMe = msg.userId === me?.id;
                    return (
                      <div key={i} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                        <div className={`max-w-[85%] p-3 rounded-xl text-sm ${isMe ? "bg-primary/20 rounded-br-none" : "bg-[#2c302c] rounded-bl-none"}`}>
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
            )}

            {/* ── Participants ── */}
            {sidebarPanel === "participants" && (
              <div className="flex-1 overflow-y-auto p-2">
                <div className="text-xs font-medium text-white/40 px-2 py-2 mb-1">في الاجتماع ({totalCount})</div>
                {me && (
                  <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5">
                    <Avatar className="w-8 h-8 shrink-0">
                      <AvatarFallback className="bg-[#2c302c] text-xs text-white">{me.displayName.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 truncate">
                      <div className="text-sm font-medium truncate">{me.displayName} <span className="text-white/40 text-xs">(أنت)</span></div>
                      {isHost && <div className="text-[10px] text-primary">المستضيف</div>}
                    </div>
                    <div className="flex gap-1.5 text-white/40 shrink-0">
                      {isVideoOff ? <VideoOff className="w-3.5 h-3.5" /> : <Video className="w-3.5 h-3.5 text-white" />}
                      {isMuted ? <MicOff className="w-3.5 h-3.5 text-red-400" /> : <Mic className="w-3.5 h-3.5 text-white" />}
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
                    <div className="shrink-0">
                      {remoteStreams.has(p.userId)
                        ? <Video className="w-3.5 h-3.5 text-white" />
                        : <VideoOff className="w-3.5 h-3.5 text-white/40" />}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── Waiting Room (host only) ── */}
            {sidebarPanel === "waiting" && (
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {waitingQueue.length === 0 ? (
                  <div className="text-center text-white/30 text-sm py-12">
                    <Clock className="w-8 h-8 mx-auto mb-3 text-white/20" />
                    لا أحد في الانتظار حالياً
                  </div>
                ) : (
                  <>
                    <p className="text-xs text-white/40 mb-4">ينتظر هؤلاء الأشخاص موافقتك على الانضمام</p>
                    {waitingQueue.map(p => (
                      <div key={p.userId} className="bg-white/5 rounded-xl p-4 space-y-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-10 h-10 shrink-0">
                            <AvatarFallback className="bg-[#3c403c] text-white">{p.displayName.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 truncate">
                            <div className="font-medium text-sm truncate">{p.displayName}</div>
                            <div className="text-xs text-white/40 flex items-center gap-1 mt-0.5">
                              <Clock className="w-3 h-3" />
                              ينتظر الانضمام
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => admitParticipant(p.userId)}
                            className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground gap-2 rounded-lg h-9"
                          >
                            <UserCheck className="w-4 h-4" />
                            قبول
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => rejectParticipant(p.userId)}
                            className="flex-1 text-red-400 hover:text-red-300 hover:bg-red-500/10 gap-2 rounded-lg h-9"
                          >
                            <UserX className="w-4 h-4" />
                            رفض
                          </Button>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom controls */}
      <div className="h-20 bg-black/60 border-t border-white/10 flex items-center justify-center gap-2 md:gap-3 px-4 shrink-0">

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

        <div className="w-px h-8 bg-white/10 mx-1 hidden md:block" />

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

        <div className="w-px h-8 bg-white/10 mx-1 hidden md:block" />

        {/* Waiting room button — host only */}
        {isHost && (
          <Button
            variant="secondary"
            size="icon"
            className={`w-12 h-12 rounded-full relative bg-[#2c302c] hover:bg-[#3c403c] text-white ${sidebarPanel === "waiting" ? "ring-2 ring-amber-400" : ""}`}
            onClick={() => setSidebarPanel(sidebarPanel === "waiting" ? null : "waiting")}
          >
            <Clock className="w-5 h-5" />
            {waitingQueue.length > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-amber-400 text-black text-[9px] font-bold rounded-full flex items-center justify-center px-1">
                {waitingQueue.length}
              </span>
            )}
          </Button>
        )}

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

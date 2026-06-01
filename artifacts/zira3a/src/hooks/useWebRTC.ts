import { useEffect, useRef, useState, useCallback } from "react";
import { getSocket } from "@/lib/socket";

const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
  { urls: "stun:stun3.l.google.com:19302" },
  { urls: "stun:stun4.l.google.com:19302" },
  { urls: "stun:stun.cloudflare.com:3478" },
  { urls: "stun:global.stun.twilio.com:3478" },
  { urls: "stun:stun.stunprotocol.org:3478" },
  { urls: "stun:stun.voip.blackberry.com:3478" },
  { urls: "stun:stun.sipnet.ru:3478" },
];

export interface UseWebRTCOptions {
  meetingId: number;
  myUserId: number | undefined;
  isMuted: boolean;
  isVideoOff: boolean;
}

export interface UseWebRTCResult {
  localStream: MediaStream | null;
  remoteStreams: Map<number, MediaStream>;
  hasMediaPermission: boolean;
  isScreenSharing: boolean;
  startScreenShare: () => Promise<void>;
  stopScreenShare: () => void;
  canScreenShare: boolean;
}

export function useWebRTC({ meetingId, myUserId, isMuted, isVideoOff }: UseWebRTCOptions): UseWebRTCResult {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<number, MediaStream>>(new Map());
  const [hasMediaPermission, setHasMediaPermission] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  const localStreamRef = useRef<MediaStream | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const peerConns = useRef<Map<number, RTCPeerConnection>>(new Map());

  const canScreenShare = typeof navigator !== "undefined" &&
    !!navigator.mediaDevices &&
    "getDisplayMedia" in navigator.mediaDevices;

  // ── Replace the video track in all peer connections ───────────────────────
  const replaceVideoTrackInPeers = useCallback((newTrack: MediaStreamTrack | null) => {
    peerConns.current.forEach((pc) => {
      const sender = pc.getSenders().find(s => s.track?.kind === "video");
      if (sender && newTrack) {
        sender.replaceTrack(newTrack).catch(console.error);
      }
    });
  }, []);

  // ── Create or get a PeerConnection for a remote peer ─────────────────────
  const getPeerConnection = useCallback((remoteUserId: number): RTCPeerConnection => {
    if (peerConns.current.has(remoteUserId)) {
      return peerConns.current.get(remoteUserId)!;
    }

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    peerConns.current.set(remoteUserId, pc);

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    pc.ontrack = (event) => {
      const stream = event.streams[0];
      if (stream) {
        setRemoteStreams(prev => new Map(prev).set(remoteUserId, stream));
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        getSocket().emit("webrtc:ice-candidate", {
          targetUserId: remoteUserId,
          meetingId,
          candidate: event.candidate.toJSON(),
        });
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "failed" || pc.connectionState === "closed") {
        pc.close();
        peerConns.current.delete(remoteUserId);
        setRemoteStreams(prev => {
          const next = new Map(prev);
          next.delete(remoteUserId);
          return next;
        });
      }
    };

    return pc;
  }, [meetingId]);

  // ── Acquire camera + microphone ───────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    navigator.mediaDevices?.getUserMedia({ video: true, audio: true })
      .then(stream => {
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        localStreamRef.current = stream;
        cameraStreamRef.current = stream;
        setLocalStream(stream);
        setHasMediaPermission(true);
      })
      .catch(() => {
        navigator.mediaDevices?.getUserMedia({ video: false, audio: true })
          .then(stream => {
            if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
            localStreamRef.current = stream;
            cameraStreamRef.current = stream;
            setLocalStream(stream);
            setHasMediaPermission(true);
          })
          .catch(() => setHasMediaPermission(false));
      });

    return () => {
      cancelled = true;
      localStreamRef.current?.getTracks().forEach(t => t.stop());
      screenStreamRef.current?.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
      cameraStreamRef.current = null;
      screenStreamRef.current = null;
    };
  }, []);

  // ── Apply mute / video-off ────────────────────────────────────────────────
  useEffect(() => {
    localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = !isMuted; });
  }, [isMuted]);

  useEffect(() => {
    if (!isScreenSharing) {
      localStreamRef.current?.getVideoTracks().forEach(t => { t.enabled = !isVideoOff; });
    }
  }, [isVideoOff, isScreenSharing]);

  // ── Start screen sharing ──────────────────────────────────────────────────
  const startScreenShare = useCallback(async () => {
    if (!canScreenShare) return;
    try {
      const screenStream = await (navigator.mediaDevices as MediaDevices & {
        getDisplayMedia: (c: DisplayMediaStreamOptions) => Promise<MediaStream>;
      }).getDisplayMedia({
        video: { frameRate: { ideal: 30 }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });

      screenStreamRef.current = screenStream;
      const screenVideoTrack = screenStream.getVideoTracks()[0];

      // Replace video track in all peer connections
      replaceVideoTrackInPeers(screenVideoTrack);

      // Build a combined stream: screen video + mic audio
      const combinedStream = new MediaStream();
      combinedStream.addTrack(screenVideoTrack);
      const audioTrack = cameraStreamRef.current?.getAudioTracks()[0];
      if (audioTrack) combinedStream.addTrack(audioTrack);

      localStreamRef.current = combinedStream;
      setLocalStream(combinedStream);
      setIsScreenSharing(true);

      // Auto-stop when user clicks "Stop sharing" in browser UI
      screenVideoTrack.onended = () => {
        stopScreenShareInternal();
      };
    } catch (err: unknown) {
      // User cancelled the picker — not an error
      if (err instanceof DOMException && err.name === "NotAllowedError") return;
      console.error("Screen share error:", err);
    }
  }, [canScreenShare, replaceVideoTrackInPeers]);

  // ── Stop screen sharing ───────────────────────────────────────────────────
  const stopScreenShareInternal = useCallback(() => {
    screenStreamRef.current?.getTracks().forEach(t => t.stop());
    screenStreamRef.current = null;

    // Restore camera video track in peers
    const cameraVideoTrack = cameraStreamRef.current?.getVideoTracks()[0] ?? null;
    replaceVideoTrackInPeers(cameraVideoTrack);

    // Restore camera stream as local display
    if (cameraStreamRef.current) {
      localStreamRef.current = cameraStreamRef.current;
      setLocalStream(cameraStreamRef.current);
    }
    setIsScreenSharing(false);
  }, [replaceVideoTrackInPeers]);

  const stopScreenShare = useCallback(() => {
    stopScreenShareInternal();
  }, [stopScreenShareInternal]);

  // ── Socket signaling handlers ─────────────────────────────────────────────
  useEffect(() => {
    if (!myUserId) return;
    const socket = getSocket();

    const onPeerReady = async ({ fromUserId }: { fromUserId: number; meetingId: number }) => {
      try {
        const pc = getPeerConnection(fromUserId);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit("webrtc:offer", { targetUserId: fromUserId, meetingId, offer });
      } catch (err) {
        console.error("Failed to create offer", err);
      }
    };

    const onOffer = async ({ fromUserId, offer }: { fromUserId: number; meetingId: number; offer: RTCSessionDescriptionInit }) => {
      try {
        const pc = getPeerConnection(fromUserId);
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit("webrtc:answer", { targetUserId: fromUserId, meetingId, answer });
      } catch (err) {
        console.error("Failed to handle offer", err);
      }
    };

    const onAnswer = async ({ fromUserId, answer }: { fromUserId: number; answer: RTCSessionDescriptionInit }) => {
      try {
        const pc = peerConns.current.get(fromUserId);
        if (pc && pc.signalingState !== "stable") {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
        }
      } catch (err) {
        console.error("Failed to handle answer", err);
      }
    };

    const onIceCandidate = async ({ fromUserId, candidate }: { fromUserId: number; candidate: RTCIceCandidateInit }) => {
      try {
        const pc = peerConns.current.get(fromUserId);
        if (pc && pc.remoteDescription) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        }
      } catch (err) {
        console.error("Failed to add ICE candidate", err);
      }
    };

    const onParticipantLeft = ({ userId: leftId }: { userId: number }) => {
      const pc = peerConns.current.get(leftId);
      if (pc) { pc.close(); peerConns.current.delete(leftId); }
      setRemoteStreams(prev => { const n = new Map(prev); n.delete(leftId); return n; });
    };

    socket.on("webrtc:peer_ready", onPeerReady);
    socket.on("webrtc:offer", onOffer);
    socket.on("webrtc:answer", onAnswer);
    socket.on("webrtc:ice-candidate", onIceCandidate);
    socket.on("meeting:participant_left", onParticipantLeft);

    return () => {
      socket.off("webrtc:peer_ready", onPeerReady);
      socket.off("webrtc:offer", onOffer);
      socket.off("webrtc:answer", onAnswer);
      socket.off("webrtc:ice-candidate", onIceCandidate);
      socket.off("meeting:participant_left", onParticipantLeft);
      peerConns.current.forEach(pc => pc.close());
      peerConns.current.clear();
      setRemoteStreams(new Map());
    };
  }, [myUserId, meetingId, getPeerConnection]);

  return { localStream, remoteStreams, hasMediaPermission, isScreenSharing, startScreenShare, stopScreenShare, canScreenShare };
}

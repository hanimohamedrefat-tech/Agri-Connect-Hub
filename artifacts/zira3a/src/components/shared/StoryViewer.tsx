import { useEffect, useRef, useState, useCallback } from "react";
import type { StoryGroup } from "@workspace/api-client-react";
import { useViewStory, useDeleteStory, useGetMe } from "@workspace/api-client-react";
import { X, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";

const STORY_DURATION_MS = 5000;

interface StoryViewerProps {
  groups: StoryGroup[];
  initialGroupIndex: number;
  onClose: () => void;
  onStoryDeleted?: () => void;
}

export function StoryViewer({ groups, initialGroupIndex, onClose, onStoryDeleted }: StoryViewerProps) {
  const [groupIdx, setGroupIdx] = useState(initialGroupIndex);
  const [storyIdx, setStoryIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const viewMutation = useViewStory();
  const deleteMutation = useDeleteStory();
  const { data: me } = useGetMe();

  const currentGroup = groups[groupIdx];
  const currentStory = currentGroup?.stories[storyIdx];

  const goNext = useCallback(() => {
    if (!currentGroup) return;
    if (storyIdx < currentGroup.stories.length - 1) {
      setStoryIdx(s => s + 1);
      setProgress(0);
    } else if (groupIdx < groups.length - 1) {
      setGroupIdx(g => g + 1);
      setStoryIdx(0);
      setProgress(0);
    } else {
      onClose();
    }
  }, [storyIdx, groupIdx, currentGroup, groups.length, onClose]);

  const goPrev = useCallback(() => {
    if (storyIdx > 0) {
      setStoryIdx(s => s - 1);
      setProgress(0);
    } else if (groupIdx > 0) {
      const prevGroup = groups[groupIdx - 1];
      setGroupIdx(g => g - 1);
      setStoryIdx(prevGroup.stories.length - 1);
      setProgress(0);
    }
  }, [storyIdx, groupIdx, groups]);

  // Auto-advance timer
  useEffect(() => {
    if (paused) return;
    intervalRef.current = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          goNext();
          return 0;
        }
        return p + (100 / (STORY_DURATION_MS / 100));
      });
    }, 100);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [paused, goNext, storyIdx, groupIdx]);

  // Mark viewed when story changes
  useEffect(() => {
    if (!currentStory || !me) return;
    if (currentStory.userId !== me.id) {
      viewMutation.mutate({ storyId: currentStory.id });
    }
  }, [currentStory?.id]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, goNext, goPrev]);

  const handleDelete = () => {
    if (!currentStory) return;
    deleteMutation.mutate({ storyId: currentStory.id }, {
      onSuccess: () => {
        onStoryDeleted?.();
        goNext();
      },
    });
  };

  if (!currentGroup || !currentStory) return null;

  const isOwnStory = me?.id === currentStory.userId;
  const timeAgo = formatDistanceToNow(new Date(currentStory.createdAt), { addSuffix: true, locale: ar });

  return (
    <div className="fixed inset-0 z-50 bg-black flex items-center justify-center" dir="rtl">
      {/* Dark backdrop */}
      <div className="absolute inset-0 bg-black/95" onClick={onClose} />

      {/* Story card */}
      <div
        className="relative z-10 w-full max-w-sm h-[calc(100svh-0px)] sm:h-[90vh] sm:max-h-[700px] rounded-none sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col"
        onMouseDown={() => setPaused(true)}
        onMouseUp={() => setPaused(false)}
        onTouchStart={() => setPaused(true)}
        onTouchEnd={() => setPaused(false)}
      >
        {/* Story image */}
        <img
          src={currentStory.imageUrl}
          alt="story"
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/70" />

        {/* Progress bars */}
        <div className="relative z-10 flex gap-1 px-3 pt-3">
          {currentGroup.stories.map((_, i) => (
            <div key={i} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-none"
                style={{
                  width: i < storyIdx ? "100%" : i === storyIdx ? `${progress}%` : "0%",
                }}
              />
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="relative z-10 flex items-center gap-3 px-3 pt-3 pb-2">
          <Avatar className="w-10 h-10 border-2 border-white/80 shrink-0">
            <AvatarImage src={currentGroup.user.avatar ?? ""} />
            <AvatarFallback className="bg-primary/80 text-white font-bold text-sm">
              {currentGroup.user.displayName.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-white text-sm truncate">{currentGroup.user.displayName}</div>
            <div className="text-white/60 text-xs">{timeAgo}</div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {isOwnStory && (
              <Button
                variant="ghost" size="icon"
                className="w-8 h-8 text-white/80 hover:text-red-400 hover:bg-white/10 rounded-full"
                onClick={handleDelete}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
            <Button
              variant="ghost" size="icon"
              className="w-8 h-8 text-white/80 hover:text-white hover:bg-white/10 rounded-full"
              onClick={onClose}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Caption */}
        {currentStory.caption && (
          <div className="relative z-10 mt-auto px-4 pb-4">
            <p className="text-white text-sm leading-relaxed bg-black/40 backdrop-blur-sm rounded-xl px-4 py-3">
              {currentStory.caption}
            </p>
          </div>
        )}

        {/* Views count (own stories) */}
        {isOwnStory && currentStory.viewsCount > 0 && (
          <div className="relative z-10 px-4 pb-4 mt-auto">
            <div className="text-white/60 text-xs flex items-center gap-1">
              <span>👁</span>
              <span>{currentStory.viewsCount} مشاهدة</span>
            </div>
          </div>
        )}

        {/* Tap zones */}
        <div className="absolute inset-0 z-20 flex">
          <button className="flex-1 flex items-center justify-start ps-2 opacity-0 hover:opacity-100 transition-opacity" onClick={(e) => { e.stopPropagation(); goPrev(); }}>
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <ChevronRight className="w-5 h-5 text-white" />
            </div>
          </button>
          <button className="flex-1 flex items-center justify-end pe-2 opacity-0 hover:opacity-100 transition-opacity" onClick={(e) => { e.stopPropagation(); goNext(); }}>
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <ChevronLeft className="w-5 h-5 text-white" />
            </div>
          </button>
        </div>
      </div>

      {/* Prev/Next group buttons (desktop) */}
      {groupIdx > 0 && (
        <button
          className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/20 hover:bg-white/40 flex items-center justify-center backdrop-blur transition-colors hidden sm:flex"
          onClick={() => { setGroupIdx(g => g - 1); setStoryIdx(0); setProgress(0); }}
        >
          <ChevronRight className="w-5 h-5 text-white" />
        </button>
      )}
      {groupIdx < groups.length - 1 && (
        <button
          className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/20 hover:bg-white/40 flex items-center justify-center backdrop-blur transition-colors hidden sm:flex"
          onClick={() => { setGroupIdx(g => g + 1); setStoryIdx(0); setProgress(0); }}
        >
          <ChevronLeft className="w-5 h-5 text-white" />
        </button>
      )}
    </div>
  );
}

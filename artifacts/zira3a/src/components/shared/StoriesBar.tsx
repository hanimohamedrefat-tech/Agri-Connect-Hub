import { useState } from "react";
import { useGetStories, useGetMe, getGetStoriesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import type { StoryGroup } from "@workspace/api-client-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Plus } from "lucide-react";
import { StoryViewer } from "./StoryViewer";
import { StoryCreator } from "./StoryCreator";

export function StoriesBar() {
  const { data: me } = useGetMe();
  const { data: groups = [], isLoading } = useGetStories();
  const queryClient = useQueryClient();

  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerGroupIdx, setViewerGroupIdx] = useState(0);
  const [creatorOpen, setCreatorOpen] = useState(false);

  const openStory = (idx: number) => {
    setViewerGroupIdx(idx);
    setViewerOpen(true);
  };

  const ownGroup = groups.find(g => g.user.id === me?.id);
  const othersGroups = groups.filter(g => g.user.id !== me?.id);

  // Merge: own group first (even if empty, we show the "add" button), others after
  const displayGroups: StoryGroup[] = ownGroup ? [ownGroup, ...othersGroups] : othersGroups;

  if (isLoading) {
    return (
      <div className="border-b border-border/40 px-4 py-3">
        <div className="flex gap-4 overflow-x-auto scrollbar-hide">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5 shrink-0">
              <div className="w-14 h-14 rounded-full bg-muted animate-pulse" />
              <div className="w-12 h-2 rounded bg-muted animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="border-b border-border/40 px-4 py-3">
        <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-1">

          {/* My story / Add button */}
          <button
            onClick={() => ownGroup ? openStory(displayGroups.indexOf(ownGroup)) : setCreatorOpen(true)}
            className="flex flex-col items-center gap-1.5 shrink-0 group"
          >
            <div className="relative">
              <div className={`p-0.5 rounded-full ${ownGroup && !ownGroup.hasViewed
                ? "bg-gradient-to-br from-primary to-emerald-400"
                : ownGroup
                  ? "bg-muted"
                  : "bg-transparent"
                }`}>
                <div className="p-0.5 bg-background rounded-full">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={me?.avatar ?? ""} />
                    <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">
                      {me?.displayName?.charAt(0) ?? "؟"}
                    </AvatarFallback>
                  </Avatar>
                </div>
              </div>
              {/* Add icon overlay */}
              {!ownGroup && (
                <div className="absolute -bottom-0.5 -left-0.5 w-5 h-5 bg-primary rounded-full border-2 border-background flex items-center justify-center">
                  <Plus className="w-3 h-3 text-primary-foreground" />
                </div>
              )}
            </div>
            <span className="text-[11px] text-muted-foreground truncate w-14 text-center leading-tight">
              {ownGroup ? "قصتي" : "أضف قصة"}
            </span>
          </button>

          {/* Other users' stories */}
          {othersGroups.map((group) => {
            const globalIdx = displayGroups.indexOf(group);
            return (
              <button
                key={group.user.id}
                onClick={() => openStory(globalIdx)}
                className="flex flex-col items-center gap-1.5 shrink-0 group"
              >
                <div className={`p-0.5 rounded-full ${
                  group.hasViewed
                    ? "bg-muted"
                    : "bg-gradient-to-br from-primary to-emerald-400"
                }`}>
                  <div className="p-0.5 bg-background rounded-full">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={group.user.avatar ?? ""} />
                      <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">
                        {group.user.displayName.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                </div>
                <span className="text-[11px] text-muted-foreground truncate w-14 text-center leading-tight">
                  {group.user.displayName.split(" ")[0]}
                </span>
              </button>
            );
          })}

          {/* Empty state — no stories from others */}
          {othersGroups.length === 0 && !isLoading && (
            <div className="flex items-center text-muted-foreground/50 text-xs pe-4 ps-2">
              لا توجد قصص حالياً
            </div>
          )}
        </div>
      </div>

      {viewerOpen && displayGroups.length > 0 && (
        <StoryViewer
          groups={displayGroups}
          initialGroupIndex={viewerGroupIdx}
          onClose={() => setViewerOpen(false)}
          onStoryDeleted={() => {
            queryClient.invalidateQueries({ queryKey: getGetStoriesQueryKey() });
            setViewerOpen(false);
          }}
        />
      )}

      {creatorOpen && (
        <StoryCreator onClose={() => setCreatorOpen(false)} />
      )}
    </>
  );
}

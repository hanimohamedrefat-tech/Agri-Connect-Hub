import { useParams, Link } from "wouter";
import { useGetUserByUsername, useListUserPosts, getGetUserByUsernameQueryKey, getListUserPostsQueryKey, useFollowUser, useGetMe } from "@workspace/api-client-react";
import { PostCard } from "@/components/shared/PostCard";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, ArrowRight, MapPin, Link as LinkIcon, Calendar, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { useQueryClient } from "@tanstack/react-query";
import { useLang } from "@/context/LangContext";

export default function Profile() {
  const params = useParams();
  const username = params.username || "";
  const { t, lang } = useLang();

  const { data: currentUser } = useGetMe();
  const { data: user, isLoading: loadingUser } = useGetUserByUsername(username, {
    query: { enabled: !!username, queryKey: getGetUserByUsernameQueryKey(username) }
  });

  const { data: posts, isLoading: loadingPosts } = useListUserPosts(username, {
    query: { enabled: !!username, queryKey: getListUserPostsQueryKey(username) }
  });

  const followMutation = useFollowUser();
  const queryClient = useQueryClient();

  const isOwnProfile = currentUser?.username === username;

  const handleFollow = () => {
    if (!user) return;
    followMutation.mutate({ username }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetUserByUsernameQueryKey(username) });
      }
    });
  };

  if (loadingUser) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-12 text-center text-muted-foreground">{t.userNotFound}</div>
    );
  }

  const BackIcon = lang === "ar" ? ArrowLeft : ArrowRight;

  return (
    <div className="flex flex-col min-h-screen">
      {/* Sticky header */}
      <div className="sticky top-0 z-20 bg-background/85 backdrop-blur-xl border-b border-border/50 px-4 py-2 flex items-center gap-4">
        <Link href="/feed" className="p-2 hover:bg-muted rounded-full transition-colors">
          <BackIcon className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-[17px] font-bold leading-tight">{user.displayName}</h1>
          <p className="text-xs text-muted-foreground">{user.postsCount} {t.postCount}</p>
        </div>
      </div>

      {/* Cover + Avatar */}
      <div className="relative">
        <div className="h-40 sm:h-52 bg-gradient-to-br from-primary/30 via-primary/10 to-muted w-full overflow-hidden">
          {user.coverPhoto && (
            <img src={user.coverPhoto} alt="Cover" className="w-full h-full object-cover" />
          )}
        </div>

        <div className="px-4 pb-4">
          <div className="flex justify-between items-end -mt-10 sm:-mt-14 mb-3">
            <Avatar className="w-20 h-20 sm:w-28 sm:h-28 border-4 border-background bg-background shadow-md">
              <AvatarImage src={user.avatar || ""} />
              <AvatarFallback className="text-2xl sm:text-4xl bg-primary/10 text-primary font-bold">
                {user.displayName.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div>
              {isOwnProfile ? (
                <Button variant="outline" className="rounded-full font-bold text-sm px-4 h-8" asChild>
                  <Link href="/settings">{t.editProfile}</Link>
                </Button>
              ) : (
                <Button
                  onClick={handleFollow}
                  variant={user.isFollowing ? "outline" : "default"}
                  className="rounded-full font-bold text-sm px-5 h-8"
                  disabled={followMutation.isPending}
                >
                  {followMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : user.isFollowing ? t.unfollow : t.follow}
                </Button>
              )}
            </div>
          </div>

          {/* User info */}
          <div className="space-y-2">
            <div>
              <h2 className="text-xl font-bold leading-tight">{user.displayName}</h2>
              <p className="text-muted-foreground text-sm">@{user.username}</p>
            </div>

            {user.specialty && (
              <span className="inline-block bg-primary/10 text-primary text-xs font-medium px-3 py-1 rounded-full">
                {user.specialty}
              </span>
            )}

            {user.bio && (
              <p className="text-[15px] whitespace-pre-wrap leading-relaxed">{user.bio}</p>
            )}

            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {user.location && (
                <div className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{user.location}</span>
                </div>
              )}
              {user.website && (
                <div className="flex items-center gap-1">
                  <LinkIcon className="w-3.5 h-3.5" />
                  <a href={user.website} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                    {user.website.replace(/^https?:\/\//, '')}
                  </a>
                </div>
              )}
              <div className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                <span>
                  {t.joinedIn} {format(new Date(user.createdAt), 'MMMM yyyy', { locale: lang === "ar" ? ar : enUS })}
                </span>
              </div>
            </div>

            <div className="flex gap-4 text-sm pt-1">
              <button className="hover:underline">
                <span className="font-bold text-foreground">{user.followingCount}</span>{" "}
                <span className="text-muted-foreground">{t.following}</span>
              </button>
              <button className="hover:underline">
                <span className="font-bold text-foreground">{user.followersCount}</span>{" "}
                <span className="text-muted-foreground">{t.followers}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="posts" className="w-full">
        <TabsList className="w-full justify-start rounded-none border-b border-border/50 bg-transparent h-11 p-0 gap-0">
          {[
            { value: "posts", label: t.posts },
            { value: "replies", label: t.replies },
            { value: "media", label: t.media },
          ].map(tab => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none h-full flex-1 font-semibold text-sm text-muted-foreground data-[state=active]:text-foreground"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="posts" className="m-0">
          {loadingPosts ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : posts?.length ? (
            posts.map(post => <PostCard key={post.id} post={post} />)
          ) : (
            <div className="p-12 text-center">
              <h3 className="text-lg font-bold mb-1">{t.noPostsYet}</h3>
              <p className="text-muted-foreground text-sm">{t.noPostsYetDesc}</p>
            </div>
          )}
        </TabsContent>
        <TabsContent value="replies" className="m-0 p-8 text-center text-muted-foreground text-sm">
          {t.repliesHere}
        </TabsContent>
        <TabsContent value="media" className="m-0 p-8 text-center text-muted-foreground text-sm">
          {t.mediaHere}
        </TabsContent>
      </Tabs>
    </div>
  );
}

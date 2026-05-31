import { useRef, useState } from "react";
import { useParams, Link } from "wouter";
import { useGetUserByUsername, useListUserPosts, getGetUserByUsernameQueryKey, getListUserPostsQueryKey, useFollowUser, useGetMe, useUpdateProfile, getGetMeQueryKey } from "@workspace/api-client-react";
import { PostCard } from "@/components/shared/PostCard";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, ArrowRight, MapPin, Link as LinkIcon, Calendar, Loader2, Camera } from "lucide-react";
import { format } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { useQueryClient } from "@tanstack/react-query";
import { useLang } from "@/context/LangContext";
import { getToken } from "@/lib/auth";

async function uploadFile(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("images", file);
  const token = getToken();
  const res = await fetch("/api/upload", {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  if (!res.ok) throw new Error("Upload failed");
  const data = await res.json();
  return data.urls[0] as string;
}

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
  const updateMutation = useUpdateProfile();
  const queryClient = useQueryClient();

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  const isOwnProfile = currentUser?.username === username;

  const handleFollow = () => {
    if (!user) return;
    followMutation.mutate({ username }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetUserByUsernameQueryKey(username) });
      }
    });
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;
    setUploadingAvatar(true);
    try {
      const url = await uploadFile(file);
      await updateMutation.mutateAsync({ username: currentUser.username, data: { avatar: url } });
      queryClient.invalidateQueries({ queryKey: getGetUserByUsernameQueryKey(username) });
      queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
    } finally {
      setUploadingAvatar(false);
      e.target.value = "";
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;
    setUploadingCover(true);
    try {
      const url = await uploadFile(file);
      await updateMutation.mutateAsync({ username: currentUser.username, data: { coverPhoto: url } });
      queryClient.invalidateQueries({ queryKey: getGetUserByUsernameQueryKey(username) });
      queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
    } finally {
      setUploadingCover(false);
      e.target.value = "";
    }
  };

  if (loadingUser) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <div className="p-12 text-center text-muted-foreground">{t.userNotFound}</div>;
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
        {/* Cover Photo */}
        <div className="relative h-40 sm:h-52 bg-gradient-to-br from-primary/30 via-primary/10 to-muted w-full overflow-hidden group">
          {user.coverPhoto && (
            <img src={user.coverPhoto} alt="Cover" className="w-full h-full object-cover" />
          )}
          {isOwnProfile && (
            <>
              <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />
              <button
                onClick={() => coverInputRef.current?.click()}
                disabled={uploadingCover}
                className="absolute inset-0 w-full h-full flex items-center justify-center bg-black/0 hover:bg-black/30 transition-all opacity-0 group-hover:opacity-100"
              >
                {uploadingCover ? (
                  <div className="bg-black/60 rounded-full p-2.5">
                    <Loader2 className="w-5 h-5 text-white animate-spin" />
                  </div>
                ) : (
                  <div className="bg-black/60 rounded-full p-2.5">
                    <Camera className="w-5 h-5 text-white" />
                  </div>
                )}
              </button>
            </>
          )}
        </div>

        <div className="px-4 pb-4">
          <div className="flex justify-between items-end -mt-10 sm:-mt-14 mb-3">
            {/* Avatar */}
            <div className="relative group">
              <Avatar className="w-20 h-20 sm:w-28 sm:h-28 border-4 border-background bg-background shadow-md">
                <AvatarImage src={user.avatar || ""} />
                <AvatarFallback className="text-2xl sm:text-4xl bg-primary/10 text-primary font-bold">
                  {user.displayName.charAt(0)}
                </AvatarFallback>
              </Avatar>
              {isOwnProfile && (
                <>
                  <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                  <button
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    className="absolute inset-0 rounded-full bg-black/0 hover:bg-black/40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100 border-4 border-background"
                  >
                    {uploadingAvatar ? (
                      <Loader2 className="w-5 h-5 text-white animate-spin" />
                    ) : (
                      <Camera className="w-5 h-5 text-white" />
                    )}
                  </button>
                </>
              )}
            </div>

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
                  {followMutation.isPending
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : user.isFollowing ? t.unfollow : t.follow}
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
                    {user.website.replace(/^https?:\/\//, "")}
                  </a>
                </div>
              )}
              <div className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                <span>
                  {t.joinedIn} {format(new Date(user.createdAt), "MMMM yyyy", { locale: lang === "ar" ? ar : enUS })}
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
        <TabsContent value="media" className="m-0">
          {posts?.filter(p => p.images && p.images.length > 0).length ? (
            <div className="grid grid-cols-3 gap-0.5 p-0.5">
              {posts!
                .filter(p => p.images && p.images.length > 0)
                .flatMap(p => p.images!.map((img, i) => ({ img, postId: p.id, i })))
                .map(({ img, postId, i }) => (
                  <Link key={`${postId}-${i}`} href={`/post/${postId}`}>
                    <div className="aspect-square overflow-hidden bg-muted">
                      <img src={img} alt="" className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                    </div>
                  </Link>
                ))}
            </div>
          ) : (
            <div className="p-8 text-center text-muted-foreground text-sm">{t.mediaHere}</div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

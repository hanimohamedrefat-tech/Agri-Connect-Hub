import { useParams, Link } from "wouter";
import { useGetUserByUsername, useListUserPosts, getGetUserByUsernameQueryKey, getListUserPostsQueryKey, useFollowUser, useGetMe } from "@workspace/api-client-react";
import { PostCard } from "@/components/shared/PostCard";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowRight, MapPin, Link as LinkIcon, Calendar } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { useQueryClient } from "@tanstack/react-query";

export default function Profile() {
  const params = useParams();
  const username = params.username || "";
  
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
    return <div className="p-8 text-center">جاري التحميل...</div>;
  }

  if (!user) {
    return <div className="p-8 text-center">المستخدم غير موجود</div>;
  }

  return (
    <div className="flex flex-col min-h-screen">
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-border/50 px-4 py-2 flex items-center gap-6">
        <Link href="/feed" className="p-2 hover:bg-muted rounded-full transition-colors">
          <ArrowRight className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold">{user.displayName}</h1>
          <p className="text-sm text-muted-foreground">{user.postsCount} منشور</p>
        </div>
      </div>

      <div className="relative">
        <div className="h-48 bg-primary/20 w-full">
          {user.coverPhoto && <img src={user.coverPhoto} alt="Cover" className="w-full h-full object-cover" />}
        </div>
        <div className="px-4 pb-4">
          <div className="flex justify-between items-start">
            <Avatar className="w-32 h-32 border-4 border-background -mt-16 bg-background">
              <AvatarImage src={user.avatar || ""} />
              <AvatarFallback className="text-4xl">{user.displayName.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="mt-4">
              {isOwnProfile ? (
                <Button variant="outline" className="rounded-full font-bold" asChild>
                  <Link href="/settings">تعديل الملف الشخصي</Link>
                </Button>
              ) : (
                <Button 
                  onClick={handleFollow}
                  variant={user.isFollowing ? "outline" : "default"} 
                  className="rounded-full font-bold px-6"
                >
                  {user.isFollowing ? "إلغاء المتابعة" : "متابعة"}
                </Button>
              )}
            </div>
          </div>

          <div className="mt-4 space-y-3">
            <div>
              <h2 className="text-2xl font-bold">{user.displayName}</h2>
              <p className="text-muted-foreground">@{user.username}</p>
            </div>
            
            {user.bio && <p className="text-[15px] whitespace-pre-wrap">{user.bio}</p>}
            
            <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">
              {user.specialty && (
                <div className="flex items-center gap-1">
                  <span className="font-medium text-primary">{user.specialty}</span>
                </div>
              )}
              {user.location && (
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  <span>{user.location}</span>
                </div>
              )}
              {user.website && (
                <div className="flex items-center gap-1">
                  <LinkIcon className="w-4 h-4" />
                  <a href={user.website} target="_blank" rel="noreferrer" className="text-primary hover:underline">{user.website.replace(/^https?:\/\//, '')}</a>
                </div>
              )}
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                <span>انضم في {format(new Date(user.createdAt), 'MMMM yyyy', { locale: ar })}</span>
              </div>
            </div>

            <div className="flex gap-4 text-sm pt-2">
              <Link href={`/profile/${username}/following`} className="hover:underline">
                <span className="font-bold text-foreground">{user.followingCount}</span> <span className="text-muted-foreground">يتابع</span>
              </Link>
              <Link href={`/profile/${username}/followers`} className="hover:underline">
                <span className="font-bold text-foreground">{user.followersCount}</span> <span className="text-muted-foreground">متابعون</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="posts" className="w-full">
        <TabsList className="w-full justify-start rounded-none border-b border-border/50 bg-transparent h-12 p-0">
          <TabsTrigger value="posts" className="rounded-none data-[state=active]:border-b-4 data-[state=active]:border-primary data-[state=active]:shadow-none h-full flex-1 font-bold text-base">المنشورات</TabsTrigger>
          <TabsTrigger value="replies" className="rounded-none data-[state=active]:border-b-4 data-[state=active]:border-primary data-[state=active]:shadow-none h-full flex-1 font-bold text-base">الردود</TabsTrigger>
          <TabsTrigger value="media" className="rounded-none data-[state=active]:border-b-4 data-[state=active]:border-primary data-[state=active]:shadow-none h-full flex-1 font-bold text-base">الوسائط</TabsTrigger>
        </TabsList>
        <TabsContent value="posts" className="m-0 divide-y divide-border/50">
          {loadingPosts ? (
            <div className="p-8 text-center text-muted-foreground">جاري تحميل المنشورات...</div>
          ) : posts?.length ? (
            posts.map(post => (
              <PostCard key={post.id} post={post} />
            ))
          ) : (
            <div className="p-12 text-center">
              <h3 className="text-xl font-bold mb-2">لا توجد منشورات</h3>
              <p className="text-muted-foreground">لم يقم هذا المستخدم بنشر أي شيء بعد.</p>
            </div>
          )}
        </TabsContent>
        <TabsContent value="replies" className="m-0 p-8 text-center text-muted-foreground">
          الردود ستظهر هنا
        </TabsContent>
        <TabsContent value="media" className="m-0 p-8 text-center text-muted-foreground">
          الوسائط ستظهر هنا
        </TabsContent>
      </Tabs>
    </div>
  );
}

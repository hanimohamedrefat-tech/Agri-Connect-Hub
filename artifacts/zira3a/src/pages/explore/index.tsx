import { useState, useDeferredValue } from "react";
import { useGetTrendingPosts, useGetSuggestedUsers, useListUsers, useListPosts, getListUsersQueryKey, getListPostsQueryKey } from "@workspace/api-client-react";
import { PostCard } from "@/components/shared/PostCard";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "wouter";
import { Hash, TrendingUp, UserPlus, Loader2, Search, Users, FileText, X } from "lucide-react";
import { useLang } from "@/context/LangContext";
import { useFollowUser, getGetUserByUsernameQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

type SearchTab = "posts" | "users";

export default function Explore() {
  const { data: trending, isLoading: loadingTrending } = useGetTrendingPosts();
  const { data: suggested, isLoading: loadingSuggested } = useGetSuggestedUsers();
  const { t, lang } = useLang();

  const [rawQuery, setRawQuery] = useState("");
  const [activeTab, setActiveTab] = useState<SearchTab>("posts");
  const query = useDeferredValue(rawQuery.trim());

  const isSearching = query.length >= 2;

  const { data: searchUsers, isLoading: loadingUsers } = useListUsers(
    { search: query },
    {
      query: {
        enabled: isSearching && activeTab === "users",
        queryKey: getListUsersQueryKey({ search: query }),
      }
    }
  );

  const { data: searchPosts, isLoading: loadingPosts } = useListPosts(
    { search: query },
    {
      query: {
        enabled: isSearching && activeTab === "posts",
        queryKey: getListPostsQueryKey({ search: query }),
      }
    }
  );

  const followMutation = useFollowUser();
  const queryClient = useQueryClient();

  const handleFollow = (username: string) => {
    followMutation.mutate({ username }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetUserByUsernameQueryKey(username) });
        queryClient.invalidateQueries({ queryKey: getListUsersQueryKey({ search: query }) });
      }
    });
  };

  return (
    <div className="flex flex-col h-full min-h-screen">
      {/* Sticky Header with Search */}
      <div className="sticky top-0 z-20 bg-background/90 backdrop-blur-xl border-b border-border/50">
        <div className="px-4 py-3">
          <div className="relative">
            <Search className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${rawQuery ? "text-primary" : "text-muted-foreground"} ${lang === "ar" ? "right-3" : "left-3"}`} />
            <Input
              value={rawQuery}
              onChange={e => setRawQuery(e.target.value)}
              placeholder={lang === "ar" ? "ابحث عن منشورات أو مزارعين..." : "Search posts or farmers..."}
              className={`h-10 rounded-full bg-muted/60 border-transparent focus:border-primary/40 text-sm ${lang === "ar" ? "pr-10 pl-9" : "pl-10 pr-9"}`}
              dir={lang === "ar" ? "rtl" : "ltr"}
            />
            {rawQuery && (
              <button
                onClick={() => setRawQuery("")}
                className={`absolute top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors ${lang === "ar" ? "left-3" : "right-3"}`}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Search Tabs — only show when searching */}
        {isSearching && (
          <div className="flex border-t border-border/30">
            {([
              { id: "posts" as SearchTab, label: lang === "ar" ? "المنشورات" : "Posts", icon: FileText },
              { id: "users" as SearchTab, label: lang === "ar" ? "المستخدمون" : "People", icon: Users },
            ] as const).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold transition-colors border-b-2 ${
                  activeTab === id
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Search Results */}
      {isSearching ? (
        <div className="flex-1">
          {/* Posts Results */}
          {activeTab === "posts" && (
            <>
              {loadingPosts ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : searchPosts?.length ? (
                searchPosts.map(post => <PostCard key={post.id} post={post} />)
              ) : (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
                  <Search className="w-8 h-8 opacity-30" />
                  <p className="font-semibold text-sm">
                    {lang === "ar" ? `لا توجد منشورات عن "${query}"` : `No posts for "${query}"`}
                  </p>
                  <p className="text-xs opacity-70">
                    {lang === "ar" ? "جرّب كلمات بحث مختلفة" : "Try different search terms"}
                  </p>
                </div>
              )}
            </>
          )}

          {/* Users Results */}
          {activeTab === "users" && (
            <>
              {loadingUsers ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : searchUsers?.length ? (
                <div className="divide-y divide-border/30">
                  {searchUsers.map(user => (
                    <div key={user.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
                      <Link href={`/profile/${user.username}`} className="flex items-center gap-3 flex-1 min-w-0">
                        <Avatar className="w-11 h-11 shrink-0 border border-border/30">
                          <AvatarImage src={user.avatar || ""} />
                          <AvatarFallback className="bg-primary/10 text-primary font-bold">
                            {user.displayName.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-sm truncate">{user.displayName}</p>
                          <p className="text-xs text-muted-foreground truncate">@{user.username}</p>
                          {user.specialty && (
                            <p className="text-xs text-primary truncate mt-0.5">{user.specialty}</p>
                          )}
                        </div>
                      </Link>
                      <Button
                        variant={user.isFollowing ? "outline" : "default"}
                        size="sm"
                        className="rounded-full h-7 px-3 text-xs font-bold shrink-0"
                        onClick={() => handleFollow(user.username)}
                        disabled={followMutation.isPending}
                      >
                        {user.isFollowing
                          ? (lang === "ar" ? "متابَع" : "Following")
                          : (lang === "ar" ? "متابعة" : "Follow")}
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
                  <Users className="w-8 h-8 opacity-30" />
                  <p className="font-semibold text-sm">
                    {lang === "ar" ? `لا يوجد مستخدمون باسم "${query}"` : `No users found for "${query}"`}
                  </p>
                  <p className="text-xs opacity-70">
                    {lang === "ar" ? "جرّب كلمات بحث مختلفة" : "Try a different name or username"}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        /* Discovery content when not searching */
        <>
          {/* Suggested Users */}
          <div className="p-4 border-b border-border/50">
            <div className="flex items-center gap-2 mb-3">
              <UserPlus className="w-4 h-4 text-primary" />
              <h2 className="font-bold text-[15px]">{t.suggestedUsers}</h2>
            </div>
            {loadingSuggested ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Array.isArray(suggested) && suggested.slice(0, 4).map(user => (
                  <div key={user.id} className="bg-card border border-border/40 p-3 rounded-2xl flex items-center justify-between hover:bg-muted/30 transition-colors">
                    <Link href={`/profile/${user.username}`} className="flex items-center gap-2 min-w-0">
                      <Avatar className="w-10 h-10 border border-border/30">
                        <AvatarImage src={user.avatar || ""} />
                        <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">
                          {user.displayName.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="font-bold text-sm truncate">{user.displayName}</p>
                        <p className="text-xs text-muted-foreground truncate">@{user.username}</p>
                        {user.specialty && (
                          <p className="text-xs text-primary truncate">{user.specialty}</p>
                        )}
                      </div>
                    </Link>
                    <Button variant="outline" size="sm" className="rounded-full h-7 px-3 text-xs font-medium shrink-0 ms-2" onClick={() => handleFollow(user.username)}>
                      {t.follow}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Trending Hashtags */}
          <div className="p-4 border-b border-border/50">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-primary" />
              <h2 className="font-bold text-[15px]">{t.trendingHashtags}</h2>
            </div>
            {loadingTrending ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {Array.isArray(trending?.hashtags) && trending.hashtags.map((tag, i) => (
                  <button
                    key={i}
                    onClick={() => setRawQuery(tag.tag)}
                    className="bg-primary/8 hover:bg-primary/15 text-primary border border-primary/20 px-3 py-1.5 rounded-full font-medium flex items-center gap-1.5 cursor-pointer transition-colors text-sm"
                  >
                    <Hash className="w-3.5 h-3.5" />
                    <span>{tag.tag}</span>
                    <span className="text-xs opacity-60 bg-primary/10 rounded-full px-1.5 py-0.5">{tag.count}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Trending Posts */}
          <div>
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border/30">
              <TrendingUp className="w-4 h-4 text-primary" />
              <h2 className="font-bold text-[15px]">{t.trendingPosts}</h2>
            </div>
            {loadingTrending ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : (
              trending?.posts?.map(post => (
                <PostCard key={post.id} post={post} />
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}

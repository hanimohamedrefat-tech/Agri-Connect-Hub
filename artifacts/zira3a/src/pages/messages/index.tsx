import { useState, useCallback } from "react";
import { Link } from "wouter";
import { useListConversations, useCreateConversation, useListUsers, getListUsersQueryKey } from "@workspace/api-client-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";
import { MailPlus, Search, Loader2 } from "lucide-react";
import { useGetMe } from "@workspace/api-client-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";

export default function Messages() {
  const { data: user } = useGetMe();
  const { data: conversations, isLoading } = useListConversations();
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const createConvMutation = useCreateConversation();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const { data: searchResults, isLoading: searching } = useListUsers(
    { search: searchQuery },
    {
      query: {
        enabled: searchQuery.trim().length >= 1,
        queryKey: getListUsersQueryKey({ search: searchQuery }),
      }
    }
  );

  const filteredResults = Array.isArray(searchResults)
    ? searchResults.filter(u => u.id !== user?.id)
    : [];

  const handleStartConv = useCallback((participantId: number) => {
    createConvMutation.mutate({ data: { participantId } }, {
      onSuccess: (res) => {
        setNewChatOpen(false);
        setSearchQuery("");
        setLocation(`/messages/${res.id}`);
      }
    });
  }, [createConvMutation, setLocation]);

  return (
    <div className="flex flex-col min-h-screen">
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border/50 px-4 py-3 flex items-center justify-between">
        <h1 className="text-xl font-bold">الرسائل</h1>
        <Dialog open={newChatOpen} onOpenChange={(o) => { setNewChatOpen(o); if (!o) setSearchQuery(""); }}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" className="text-primary rounded-full">
              <MailPlus className="w-5 h-5" />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>محادثة جديدة</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 pt-2">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="ابحث عن مستخدم..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pr-9"
                  autoFocus
                />
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-border/40">
                {searching && (
                  <div className="p-4 text-center">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" />
                  </div>
                )}
                {!searching && searchQuery.trim().length >= 1 && filteredResults.length === 0 && (
                  <div className="p-4 text-center text-sm text-muted-foreground">لا توجد نتائج</div>
                )}
                {filteredResults.map(u => (
                  <button
                    key={u.id}
                    className="w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors rounded-lg text-right"
                    onClick={() => handleStartConv(u.id)}
                    disabled={createConvMutation.isPending}
                  >
                    <Avatar className="w-10 h-10 shrink-0">
                      <AvatarImage src={u.avatar || ""} />
                      <AvatarFallback className="bg-primary/10 text-primary font-bold">
                        {u.displayName.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm truncate">{u.displayName}</p>
                      <p className="text-xs text-muted-foreground truncate">@{u.username}</p>
                      {u.specialty && (
                        <p className="text-xs text-primary/70 truncate">{u.specialty}</p>
                      )}
                    </div>
                    {createConvMutation.isPending && (
                      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground shrink-0" />
                    )}
                  </button>
                ))}
                {!searchQuery.trim() && (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    ابحث عن اسم أو تخصص للبدء
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="divide-y divide-border/50">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">جاري تحميل الرسائل...</div>
        ) : Array.isArray(conversations) && conversations.length > 0 ? (
          conversations.map(conv => {
            const otherParticipant = conv.participants.find(p => p.id !== user?.id) || conv.participants[0];
            return (
              <Link key={conv.id} href={`/messages/${conv.id}`} className="p-4 flex gap-4 transition-colors hover:bg-muted/10 items-center">
                <Avatar className="w-12 h-12">
                  <AvatarImage src={otherParticipant.avatar || ""} />
                  <AvatarFallback className="bg-primary/10 text-primary font-bold text-lg">
                    {otherParticipant.displayName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-1">
                    <div className="flex items-center gap-2 truncate">
                      <span className="font-bold truncate">{otherParticipant.displayName}</span>
                      <span className="text-sm text-muted-foreground truncate">@{otherParticipant.username}</span>
                    </div>
                    {conv.lastMessage && (
                      <span className="text-xs text-muted-foreground shrink-0 pr-2">
                        {formatDistanceToNow(new Date(conv.lastMessage.createdAt as string), { addSuffix: true, locale: ar })}
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground truncate flex justify-between items-center">
                    <span className="truncate">{conv.lastMessage ? (conv.lastMessage.content as string) : 'بدأت المحادثة'}</span>
                    {(conv.unreadCount ?? 0) > 0 && (
                      <span className="bg-primary text-primary-foreground text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0 mr-2">
                        {(conv.unreadCount ?? 0) > 99 ? "99+" : conv.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })
        ) : (
          <div className="p-12 text-center flex flex-col items-center">
            <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-4">
              <MailPlus className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-bold mb-2">أهلاً بك في الرسائل</h3>
            <p className="text-muted-foreground max-w-sm text-sm">
              تواصل بشكل خاص مع المزارعين والخبراء، شارك الأفكار وناقش تفاصيل محاصيلك.
            </p>
            <Button className="mt-6 font-bold rounded-xl gap-2" onClick={() => setNewChatOpen(true)}>
              <MailPlus className="w-4 h-4" />
              بدء محادثة جديدة
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

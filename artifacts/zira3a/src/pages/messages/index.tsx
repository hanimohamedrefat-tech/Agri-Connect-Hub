import { useState } from "react";
import { Link } from "wouter";
import { useListConversations, useCreateConversation } from "@workspace/api-client-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";
import { MailPlus } from "lucide-react";
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

export default function Messages() {
  const { data: user } = useGetMe();
  const { data: conversations, isLoading } = useListConversations();
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [targetId, setTargetId] = useState("");
  const createConvMutation = useCreateConversation();
  const [, setLocation] = useLocation();

  const handleCreate = () => {
    if (!targetId) return;
    createConvMutation.mutate({ data: { participantId: Number(targetId) } }, {
      onSuccess: (res) => {
        setNewChatOpen(false);
        setLocation(`/messages/${res.id}`);
      }
    });
  };

  return (
    <div className="flex flex-col min-h-screen">
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border/50 px-4 py-3 flex items-center justify-between">
        <h1 className="text-xl font-bold">الرسائل</h1>
        <Dialog open={newChatOpen} onOpenChange={setNewChatOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" className="text-primary rounded-full">
              <MailPlus className="w-5 h-5" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>محادثة جديدة</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <Input 
                placeholder="أدخل معرف المستخدم (ID)..." 
                value={targetId}
                onChange={e => setTargetId(e.target.value)}
                type="number"
              />
              <Button onClick={handleCreate} disabled={!targetId || createConvMutation.isPending} className="w-full">
                بدء المحادثة
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="divide-y divide-border/50">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">جاري تحميل الرسائل...</div>
        ) : conversations?.length ? (
          conversations.map(conv => {
            const otherParticipant = conv.participants.find(p => p.id !== user?.id) || conv.participants[0];
            return (
              <Link key={conv.id} href={`/messages/${conv.id}`} className="p-4 flex gap-4 transition-colors hover:bg-muted/10 items-center">
                <Avatar className="w-12 h-12">
                  <AvatarImage src={otherParticipant.avatar || ""} />
                  <AvatarFallback>{otherParticipant.displayName.charAt(0)}</AvatarFallback>
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
                  <div className="text-sm text-muted-foreground truncate flex justify-between">
                    <span className="truncate">{conv.lastMessage ? (conv.lastMessage.content as string) : 'بدأت المحادثة'}</span>
                    {conv.unreadCount ? conv.unreadCount > 0 && (
                      <span className="bg-primary text-primary-foreground text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0">
                        {conv.unreadCount}
                      </span>
                    ) : null}
                  </div>
                </div>
              </Link>
            );
          })
        ) : (
          <div className="p-12 text-center flex flex-col items-center">
            <h3 className="text-xl font-bold mb-2">أهلاً بك في الرسائل</h3>
            <p className="text-muted-foreground max-w-sm">
              تواصل بشكل خاص مع المزارعين والخبراء، شارك الصور، وناقش تفاصيل محاصيلك.
            </p>
            <Button className="mt-6 font-bold" onClick={() => setNewChatOpen(true)}>
              بدء محادثة جديدة
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

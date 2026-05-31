import { useState, useRef, useEffect } from "react";
import { useParams, Link } from "wouter";
import { useListConversationMessages, useSendMessage, getListConversationMessagesQueryKey } from "@workspace/api-client-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, Send } from "lucide-react";
import { useGetMe } from "@workspace/api-client-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { useQueryClient } from "@tanstack/react-query";

export default function Conversation() {
  const params = useParams();
  const conversationId = Number(params.conversationId);
  const { data: user } = useGetMe();
  
  const { data: messages, isLoading } = useListConversationMessages(conversationId, {
    query: { enabled: !!conversationId, queryKey: getListConversationMessagesQueryKey(conversationId) }
  });

  const sendMutation = useSendMessage();
  const queryClient = useQueryClient();
  const [content, setContent] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!content.trim() || !conversationId) return;
    sendMutation.mutate({ conversationId, data: { content } }, {
      onSuccess: () => {
        setContent("");
        queryClient.invalidateQueries({ queryKey: getListConversationMessagesQueryKey(conversationId) });
      }
    });
  };

  const otherUser = messages?.find(m => m.senderId !== user?.id)?.sender;

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <div className="shrink-0 bg-background/80 backdrop-blur-md border-b border-border/50 px-4 py-3 flex items-center gap-4">
        <Link href="/messages" className="p-2 hover:bg-muted rounded-full transition-colors shrink-0">
          <ArrowRight className="w-5 h-5" />
        </Link>
        {otherUser ? (
          <Link href={`/profile/${otherUser.username}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <Avatar className="w-10 h-10">
              <AvatarImage src={otherUser.avatar || ""} />
              <AvatarFallback>{otherUser.displayName.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <div className="font-bold">{otherUser.displayName}</div>
              <div className="text-xs text-muted-foreground">@{otherUser.username}</div>
            </div>
          </Link>
        ) : (
          <div className="font-bold">محادثة</div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading ? (
          <div className="text-center text-muted-foreground p-8">جاري التحميل...</div>
        ) : messages?.length ? (
          messages.map(msg => {
            const isMe = msg.senderId === user?.id;
            return (
              <div key={msg.id} className={`flex gap-3 max-w-[85%] ${isMe ? 'mr-auto flex-row-reverse' : 'ml-auto'}`}>
                <Avatar className="w-8 h-8 shrink-0 self-end mb-1">
                  <AvatarImage src={msg.sender.avatar || ""} />
                  <AvatarFallback>{msg.sender.displayName.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                  <div className={`px-4 py-2 rounded-2xl ${isMe ? 'bg-primary text-primary-foreground rounded-br-sm' : 'bg-muted rounded-bl-sm'}`}>
                    {msg.content}
                  </div>
                  <span className="text-[10px] text-muted-foreground mt-1 mx-1">
                    {format(new Date(msg.createdAt), 'h:mm a', { locale: ar })}
                  </span>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center text-muted-foreground p-8">لا توجد رسائل بعد.</div>
        )}
        <div ref={endRef} />
      </div>

      <div className="shrink-0 p-4 border-t border-border/50 bg-background">
        <form onSubmit={handleSend} className="flex gap-2">
          <Input 
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="اكتب رسالة..." 
            className="flex-1 bg-muted/30 border-transparent focus-visible:ring-primary rounded-full px-4"
          />
          <Button type="submit" size="icon" disabled={!content.trim() || sendMutation.isPending} className="rounded-full shrink-0 h-10 w-10">
            <Send className="w-5 h-5 rtl:-scale-x-100" />
          </Button>
        </form>
      </div>
    </div>
  );
}

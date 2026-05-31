import { useGetNotifications, useMarkAllNotificationsRead } from "@workspace/api-client-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";
import { Heart, MessageCircle, UserPlus, Share2, AtSign, CheckCircle2, Bell } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetNotificationsQueryKey, getGetNotificationSummaryQueryKey } from "@workspace/api-client-react";

const NotificationIcon = ({ type }: { type: string }) => {
  switch (type) {
    case 'like': return <Heart className="w-5 h-5 text-red-500 fill-current" />;
    case 'comment': return <MessageCircle className="w-5 h-5 text-primary" />;
    case 'follow': return <UserPlus className="w-5 h-5 text-blue-500" />;
    case 'repost': return <Share2 className="w-5 h-5 text-green-500" />;
    case 'mention': return <AtSign className="w-5 h-5 text-orange-500" />;
    default: return <Bell className="w-5 h-5 text-muted-foreground" />;
  }
};

export default function Notifications() {
  const { data: notifications, isLoading } = useGetNotifications();
  const markReadMutation = useMarkAllNotificationsRead();
  const queryClient = useQueryClient();

  const handleMarkAllRead = () => {
    markReadMutation.mutate(undefined, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetNotificationsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetNotificationSummaryQueryKey() });
      }
    });
  };

  return (
    <div className="flex flex-col min-h-screen">
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border/50 px-4 py-3 flex items-center justify-between">
        <h1 className="text-xl font-bold">الإشعارات</h1>
        <Button variant="ghost" size="sm" onClick={handleMarkAllRead} className="gap-2 text-primary" disabled={markReadMutation.isPending}>
          <CheckCircle2 className="w-4 h-4" />
          تحديد كـ مقروء
        </Button>
      </div>

      <div className="divide-y divide-border/50">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">جاري تحميل الإشعارات...</div>
        ) : Array.isArray(notifications) && notifications.length > 0 ? (
          notifications.map(notif => (
            <Link key={notif.id} href={notif.postId ? `/post/${notif.postId}` : (notif.actor ? `/profile/${notif.actor.username}` : '#')} className={`p-4 flex gap-4 transition-colors hover:bg-muted/10 ${!notif.isRead ? 'bg-primary/5' : ''}`}>
              <div className="pt-1">
                <NotificationIcon type={notif.type} />
              </div>
              <div className="flex-1">
                {notif.actor && (
                  <Avatar className="w-8 h-8 mb-2">
                    <AvatarImage src={notif.actor.avatar || ""} />
                    <AvatarFallback>{notif.actor.displayName.charAt(0)}</AvatarFallback>
                  </Avatar>
                )}
                <div className="text-base mb-1">
                  {notif.actor && <span className="font-bold">{notif.actor.displayName} </span>}
                  <span className="text-muted-foreground">{notif.message}</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true, locale: ar })}
                </div>
              </div>
            </Link>
          ))
        ) : (
          <div className="p-12 text-center flex flex-col items-center">
            <h3 className="text-xl font-bold mb-2">لا توجد إشعارات حالياً</h3>
            <p className="text-muted-foreground max-w-sm">
              عندما يتفاعل الأشخاص مع منشوراتك أو يقومون بمتابعتك، ستظهر إشعاراتهم هنا.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

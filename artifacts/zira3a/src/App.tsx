import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { AppLayout } from "@/components/layout/AppLayout";
import AuthPage from "@/pages/auth";
import { SocketProvider } from "@/context/SocketContext";

import Feed from "@/pages/feed";
import Explore from "@/pages/explore";
import PostDetail from "@/pages/post";
import Profile from "@/pages/profile";
import Bookmarks from "@/pages/bookmarks";
import Notifications from "@/pages/notifications";
import Messages from "@/pages/messages";
import Conversation from "@/pages/messages/conversation";
import Meetings from "@/pages/meetings";
import NewMeeting from "@/pages/meetings/new";
import MeetingDetail from "@/pages/meetings/detail";
import MeetingRoom from "@/pages/meetings/room";
import Settings from "@/pages/settings";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={AuthPage} />
      
      {/* Special route without standard app layout */}
      <Route path="/meetings/:meetingId/room" component={MeetingRoom} />
      
      <Route>
        <AppLayout>
          <Switch>
            <Route path="/feed" component={Feed} />
            <Route path="/explore" component={Explore} />
            <Route path="/post/:postId" component={PostDetail} />
            <Route path="/profile/:username" component={Profile} />
            <Route path="/bookmarks" component={Bookmarks} />
            <Route path="/notifications" component={Notifications} />
            <Route path="/messages" component={Messages} />
            <Route path="/messages/:conversationId" component={Conversation} />
            <Route path="/meetings" component={Meetings} />
            <Route path="/meetings/new" component={NewMeeting} />
            <Route path="/meetings/:meetingId" component={MeetingDetail} />
            <Route path="/settings" component={Settings} />
            <Route component={NotFound} />
          </Switch>
        </AppLayout>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <SocketProvider>
            <Router />
          </SocketProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

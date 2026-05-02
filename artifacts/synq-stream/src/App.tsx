import React, { useEffect } from 'react';
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout/Layout";
import { useStore } from "@/lib/store";
import { getAllVideos } from "@/lib/db";

import Home from "@/pages/Home";
import Settings from "@/pages/Settings";
import DevPanel from "@/pages/DevPanel";
import Player from "@/pages/Player";
import Embed from "@/pages/Embed";
import Thumb from "@/pages/Thumb";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/settings" component={Settings} />
      <Route path="/dev" component={DevPanel} />
      <Route path="/watch/:videoId" component={Player} />
      <Route path="/embed/:videoId" component={Embed} />
      <Route path="/thumb/:videoId" component={Thumb} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const { setVideos, devSession } = useStore();

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const loaded = await getAllVideos(!!devSession);
        if (mounted) setVideos(loaded);
      } catch (err) {
        console.error('Failed to load videos', err);
      }
    };
    load();
    return () => { mounted = false; };
  }, [setVideos, devSession]);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Layout>
            <Router />
          </Layout>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

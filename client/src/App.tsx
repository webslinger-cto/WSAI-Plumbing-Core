import { useState } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import AppSidebar from "@/components/AppSidebar";
import LoginPage from "@/components/LoginPage";

export const YELP_REVIEW_URL = "https://www.yelp.com/biz/chicago-sewer-experts-lyons-3?adjust_creative=microsoft&utm_campaign=yelp_feed&utm_medium=feed_v2&utm_source=microsoft";
import AdminDashboard from "@/pages/AdminDashboard";
import LeadsPage from "@/pages/LeadsPage";
import TechniciansPage from "@/pages/TechniciansPage";
import ImportPage from "@/pages/ImportPage";
import OutreachPage from "@/pages/OutreachPage";
import TechnicianDashboard from "@/pages/TechnicianDashboard";
import QuotePage from "@/pages/QuotePage";
import DispatcherDashboard from "@/pages/DispatcherDashboard";
import StaffingPool from "@/pages/StaffingPool";
import NotFound from "@/pages/not-found";

interface AuthState {
  isAuthenticated: boolean;
  role: "admin" | "dispatcher" | "technician" | null;
  username: string;
}

function AdminRouter() {
  return (
    <Switch>
      <Route path="/" component={AdminDashboard} />
      <Route path="/leads" component={LeadsPage} />
      <Route path="/technicians" component={TechniciansPage} />
      <Route path="/import" component={ImportPage} />
      <Route path="/outreach" component={OutreachPage} />
      <Route path="/settings" component={() => (
        <div className="space-y-4">
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-muted-foreground">Settings page coming soon.</p>
        </div>
      )} />
      <Route component={NotFound} />
    </Switch>
  );
}

function DispatcherRouter() {
  return (
    <Switch>
      <Route path="/" component={DispatcherDashboard} />
      <Route path="/staffing" component={StaffingPool} />
      <Route path="/calls" component={() => (
        <div className="space-y-4">
          <h1 className="text-2xl font-bold">Call Log</h1>
          <p className="text-muted-foreground">Call log page coming soon.</p>
        </div>
      )} />
      <Route path="/leads" component={LeadsPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function TechnicianRouter() {
  return (
    <Switch>
      <Route path="/" component={TechnicianDashboard} />
      <Route path="/quote" component={QuotePage} />
      <Route path="/jobs" component={() => (
        <div className="space-y-4">
          <h1 className="text-2xl font-bold">My Jobs</h1>
          <p className="text-muted-foreground">Jobs history page coming soon.</p>
        </div>
      )} />
      <Route path="/earnings" component={() => (
        <div className="space-y-4">
          <h1 className="text-2xl font-bold">Earnings</h1>
          <p className="text-muted-foreground">Earnings report page coming soon.</p>
        </div>
      )} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  // todo: remove mock functionality - replace with actual auth
  const [auth, setAuth] = useState<AuthState>({
    isAuthenticated: false,
    role: null,
    username: "",
  });

  const handleLogin = (role: "admin" | "dispatcher" | "technician", username: string) => {
    setAuth({
      isAuthenticated: true,
      role,
      username,
    });
  };

  const handleLogout = () => {
    setAuth({
      isAuthenticated: false,
      role: null,
      username: "",
    });
  };

  if (!auth.isAuthenticated) {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <LoginPage onLogin={handleLogin} />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    );
  }

  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3.5rem",
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <SidebarProvider style={sidebarStyle as React.CSSProperties}>
          <div className="flex h-screen w-full">
            <AppSidebar
              role={auth.role!}
              username={auth.username}
              onLogout={handleLogout}
            />
            <div className="flex flex-col flex-1 min-w-0">
              <header className="flex items-center gap-4 px-4 py-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <SidebarTrigger data-testid="button-sidebar-toggle" />
                <div className="flex-1" />
              </header>
              <main className="flex-1 overflow-auto p-6">
                {auth.role === "admin" ? (
                  <AdminRouter />
                ) : auth.role === "dispatcher" ? (
                  <DispatcherRouter />
                ) : (
                  <TechnicianRouter />
                )}
              </main>
            </div>
          </div>
        </SidebarProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

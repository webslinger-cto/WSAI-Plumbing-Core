import { useState, useEffect, useLayoutEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
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
import PayrollPage from "@/pages/PayrollPage";
import TechnicianDashboard from "@/pages/TechnicianDashboard";
import QuotePage from "@/pages/QuotePage";
import DispatcherDashboard from "@/pages/DispatcherDashboard";
import StaffingPool from "@/pages/StaffingPool";
import ExportPage from "@/pages/ExportPage";
import SettingsPage from "@/pages/SettingsPage";
import QuoteTemplatesPage from "@/pages/QuoteTemplatesPage";
import JobsPage from "@/pages/JobsPage";
import QuotesPage from "@/pages/QuotesPage";
import OperationsMenuPage from "@/pages/OperationsMenuPage";
import TechnicianMapPage from "@/pages/TechnicianMapPage";
import SalesDashboard from "@/pages/SalesDashboard";
import SalesLocationPage from "@/pages/SalesLocationPage";
import SalesAnalyticsPage from "@/pages/SalesAnalyticsPage";
import NotFound from "@/pages/not-found";
import PublicQuotePage from "@/pages/PublicQuotePage";

interface AuthState {
  isAuthenticated: boolean;
  role: "admin" | "dispatcher" | "technician" | "salesperson" | null;
  username: string;
  userId: string;
  technicianId: string | null;
  salespersonId: string | null;
  fullName: string;
}

function AdminRouter() {
  return (
    <Switch>
      <Route path="/" component={AdminDashboard} />
      <Route path="/leads" component={LeadsPage} />
      <Route path="/jobs" component={JobsPage} />
      <Route path="/quotes" component={QuotesPage} />
      <Route path="/technicians" component={TechniciansPage} />
      <Route path="/map" component={TechnicianMapPage} />
      <Route path="/quote-templates" component={QuoteTemplatesPage} />
      <Route path="/payroll" component={PayrollPage} />
      <Route path="/import" component={ImportPage} />
      <Route path="/outreach" component={OutreachPage} />
      <Route path="/export" component={ExportPage} />
      <Route path="/settings" component={SettingsPage} />
      <Route path="/operations">{() => <OperationsMenuPage role="admin" />}</Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function DispatcherRouter() {
  return (
    <Switch>
      <Route path="/" component={DispatcherDashboard} />
      <Route path="/jobs" component={JobsPage} />
      <Route path="/quotes" component={QuotesPage} />
      <Route path="/map" component={TechnicianMapPage} />
      <Route path="/staffing" component={StaffingPool} />
      <Route path="/calls" component={() => (
        <div className="space-y-4">
          <h1 className="text-2xl font-bold">Call Log</h1>
          <p className="text-muted-foreground">Call log page coming soon.</p>
        </div>
      )} />
      <Route path="/leads" component={LeadsPage} />
      <Route path="/operations">{() => <OperationsMenuPage role="dispatcher" />}</Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function TechnicianRouter({ technicianId, userId, fullName }: { technicianId: string; userId: string; fullName: string }) {
  return (
    <Switch>
      <Route path="/">
        {() => <TechnicianDashboard technicianId={technicianId} userId={userId} fullName={fullName} />}
      </Route>
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
      <Route path="/operations">{() => <OperationsMenuPage role="technician" username={fullName} />}</Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function SalespersonRouter({ salespersonId, userId, fullName }: { salespersonId: string; userId: string; fullName: string }) {
  return (
    <Switch>
      <Route path="/">
        {() => <SalesDashboard salespersonId={salespersonId} userId={userId} fullName={fullName} />}
      </Route>
      <Route path="/quote" component={QuotePage} />
      <Route path="/leads" component={LeadsPage} />
      <Route path="/jobs" component={JobsPage} />
      <Route path="/quotes" component={QuotesPage} />
      <Route path="/location">
        {() => <SalesLocationPage salespersonId={salespersonId} fullName={fullName} />}
      </Route>
      <Route path="/analytics">
        {() => <SalesAnalyticsPage salespersonId={salespersonId} fullName={fullName} />}
      </Route>
      <Route path="/earnings" component={() => (
        <div className="space-y-4">
          <h1 className="text-2xl font-bold">My Commissions</h1>
          <p className="text-muted-foreground">Detailed commission report coming soon.</p>
        </div>
      )} />
      <Route path="/operations">{() => <OperationsMenuPage role="salesperson" username={fullName} />}</Route>
      <Route component={NotFound} />
    </Switch>
  );
}

interface LoginResponse {
  id: string;
  username: string;
  role: "admin" | "dispatcher" | "technician" | "salesperson";
  fullName: string | null;
  technicianId: string | null;
  salespersonId: string | null;
}

function App() {
  const [location, setLocation] = useLocation();
  const [auth, setAuth] = useState<AuthState>({
    isAuthenticated: false,
    role: null,
    username: "",
    userId: "",
    technicianId: null,
    salespersonId: null,
    fullName: "",
  });

  // Always use dark mode for premium marble background
  useLayoutEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  const handleLogin = (loginData: LoginResponse) => {
    setAuth({
      isAuthenticated: true,
      role: loginData.role,
      username: loginData.username,
      userId: loginData.id,
      technicianId: loginData.technicianId,
      salespersonId: loginData.salespersonId,
      fullName: loginData.fullName || loginData.username,
    });
    setLocation("/");
  };

  const handleLogout = () => {
    setAuth({
      isAuthenticated: false,
      role: null,
      username: "",
      userId: "",
      technicianId: null,
      salespersonId: null,
      fullName: "",
    });
  };

  // Check if this is a public quote page (no auth required)
  if (location.startsWith('/quote/')) {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Switch>
            <Route path="/quote/:token" component={PublicQuotePage} />
          </Switch>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    );
  }

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
          <div className="flex h-screen w-full marble-bg">
            <AppSidebar
              role={auth.role!}
              username={auth.username}
              onLogout={handleLogout}
            />
            <div className="flex flex-col flex-1 min-w-0 bg-background/90 backdrop-blur-sm">
              <header className="flex items-center gap-4 px-4 py-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
                <SidebarTrigger data-testid="button-sidebar-toggle" />
                <div className="flex-1" />
              </header>
              <main className="flex-1 overflow-auto p-6">
                {auth.role === "admin" ? (
                  <AdminRouter />
                ) : auth.role === "dispatcher" ? (
                  <DispatcherRouter />
                ) : auth.role === "salesperson" ? (
                  <SalespersonRouter 
                    salespersonId={auth.salespersonId || ""} 
                    userId={auth.userId}
                    fullName={auth.fullName}
                  />
                ) : (
                  <TechnicianRouter 
                    technicianId={auth.technicianId || ""} 
                    userId={auth.userId}
                    fullName={auth.fullName}
                  />
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

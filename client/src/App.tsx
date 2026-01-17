import { useState, useEffect, useLayoutEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Crown, Eye, User } from "lucide-react";
import AppSidebar from "@/components/AppSidebar";
import LoginPage from "@/components/LoginPage";
import PasswordSetupPage from "@/components/PasswordSetupPage";

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
import PricebookPage from "@/pages/PricebookPage";
import MarketingROIPage from "@/pages/MarketingROIPage";
import SEOContentPage from "@/pages/seo-content";
import EarningsPage from "@/pages/EarningsPage";
import CallsPage from "@/pages/CallsPage";
import NotFound from "@/pages/not-found";
import PublicQuotePage from "@/pages/PublicQuotePage";
import BusinessIntakePage from "@/pages/business-intake";

interface AuthState {
  isAuthenticated: boolean;
  role: "admin" | "dispatcher" | "technician" | "salesperson" | null;
  username: string;
  userId: string;
  technicianId: string | null;
  salespersonId: string | null;
  fullName: string;
  requiresPasswordSetup: boolean;
  isSuperAdmin: boolean;
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
      <Route path="/pricebook" component={PricebookPage} />
      <Route path="/marketing" component={MarketingROIPage} />
      <Route path="/seo-content" component={SEOContentPage} />
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
      <Route path="/calls" component={CallsPage} />
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
      <Route path="/earnings">
        {() => <EarningsPage technicianId={technicianId} fullName={fullName} />}
      </Route>
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
      <Route path="/earnings">
        {() => <EarningsPage salespersonId={salespersonId} fullName={fullName} />}
      </Route>
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
  requiresPasswordSetup?: boolean;
  isSuperAdmin?: boolean;
}

interface TechnicianInfo {
  id: string;
  name: string;
  userId: string | null;
}

interface SalespersonInfo {
  id: string;
  name: string;
  userId: string | null;
}

interface GodModeRoleSwitcherProps {
  currentRole: string;
  currentTechnicianId: string | null;
  currentSalespersonId: string | null;
  onRoleChange: (role: "admin" | "dispatcher" | "technician" | "salesperson") => void;
  onTechnicianChange: (id: string, name: string) => void;
  onSalespersonChange: (id: string, name: string) => void;
}

function GodModeRoleSwitcher({ 
  currentRole, 
  currentTechnicianId, 
  currentSalespersonId,
  onRoleChange, 
  onTechnicianChange,
  onSalespersonChange 
}: GodModeRoleSwitcherProps) {
  const { data: technicians = [] } = useQuery<TechnicianInfo[]>({
    queryKey: ["/api/technicians"],
  });
  
  const { data: salespersons = [] } = useQuery<SalespersonInfo[]>({
    queryKey: ["/api/salespersons"],
  });

  const handleValueChange = (value: string) => {
    if (value === "admin" || value === "dispatcher") {
      onRoleChange(value);
    } else if (value.startsWith("tech:")) {
      const techId = value.replace("tech:", "");
      const tech = technicians.find(t => t.id === techId);
      if (tech) {
        onTechnicianChange(tech.id, tech.name);
      }
    } else if (value.startsWith("sales:")) {
      const salesId = value.replace("sales:", "");
      const sales = salespersons.find(s => s.id === salesId);
      if (sales) {
        onSalespersonChange(sales.id, sales.name);
      }
    }
  };

  const getCurrentValue = () => {
    if (currentRole === "admin" || currentRole === "dispatcher") {
      return currentRole;
    }
    if (currentRole === "technician" && currentTechnicianId) {
      return `tech:${currentTechnicianId}`;
    }
    if (currentRole === "salesperson" && currentSalespersonId) {
      return `sales:${currentSalespersonId}`;
    }
    return "admin";
  };

  const getCurrentLabel = () => {
    if (currentRole === "admin") return "Admin";
    if (currentRole === "dispatcher") return "Dispatcher";
    if (currentRole === "technician" && currentTechnicianId) {
      const tech = technicians.find(t => t.id === currentTechnicianId);
      return tech ? tech.name : "Technician";
    }
    if (currentRole === "salesperson" && currentSalespersonId) {
      const sales = salespersons.find(s => s.id === currentSalespersonId);
      return sales ? sales.name : "Salesperson";
    }
    return "Admin";
  };

  return (
    <div className="flex items-center gap-3">
      <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/30 gap-1">
        <Crown className="w-3 h-3" />
        God Mode
      </Badge>
      <div className="flex items-center gap-2">
        <Eye className="w-4 h-4 text-muted-foreground" />
        <Select value={getCurrentValue()} onValueChange={handleValueChange}>
          <SelectTrigger className="w-[180px] h-8" data-testid="select-view-as-role">
            <div className="flex items-center gap-2">
              <User className="w-3 h-3" />
              <span className="truncate">{getCurrentLabel()}</span>
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Roles</SelectLabel>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="dispatcher">Dispatcher</SelectItem>
            </SelectGroup>
            {technicians.length > 0 && (
              <SelectGroup>
                <SelectLabel>Technicians</SelectLabel>
                {technicians.map((tech) => (
                  <SelectItem key={tech.id} value={`tech:${tech.id}`}>
                    {tech.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            )}
            {salespersons.length > 0 && (
              <SelectGroup>
                <SelectLabel>Salespersons</SelectLabel>
                {salespersons.map((sales) => (
                  <SelectItem key={sales.id} value={`sales:${sales.id}`}>
                    {sales.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            )}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
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
    requiresPasswordSetup: false,
    isSuperAdmin: false,
  });
  
  // Super admin role switching - allows viewing the app as different roles
  const [viewAsRole, setViewAsRole] = useState<"admin" | "dispatcher" | "technician" | "salesperson" | null>(null);
  // Selected person when viewing as technician or salesperson
  const [viewAsTechnicianId, setViewAsTechnicianId] = useState<string | null>(null);
  const [viewAsTechnicianName, setViewAsTechnicianName] = useState<string>("Technician");
  const [viewAsSalespersonId, setViewAsSalespersonId] = useState<string | null>(null);
  const [viewAsSalespersonName, setViewAsSalespersonName] = useState<string>("Salesperson");
  
  // The effective role is either the "view as" role (for super admins) or the actual role
  const effectiveRole = auth.isSuperAdmin && viewAsRole ? viewAsRole : auth.role;
  
  // Effective IDs for technician/salesperson views
  const effectiveTechnicianId = auth.isSuperAdmin && viewAsRole === "technician" ? viewAsTechnicianId : auth.technicianId;
  const effectiveSalespersonId = auth.isSuperAdmin && viewAsRole === "salesperson" ? viewAsSalespersonId : auth.salespersonId;
  const effectiveFullName = auth.isSuperAdmin && viewAsRole === "technician" ? viewAsTechnicianName 
    : auth.isSuperAdmin && viewAsRole === "salesperson" ? viewAsSalespersonName 
    : auth.fullName;

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
      requiresPasswordSetup: loginData.requiresPasswordSetup || false,
      isSuperAdmin: loginData.isSuperAdmin || false,
    });
    if (!loginData.requiresPasswordSetup) {
      setLocation("/");
    }
  };

  const handlePasswordSetupComplete = () => {
    setAuth(prev => ({ ...prev, requiresPasswordSetup: false }));
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
      requiresPasswordSetup: false,
      isSuperAdmin: false,
    });
  };

  // Check if this is a public page (no auth required)
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

  // Public business intake form (no auth required)
  if (location === '/intake' || location.startsWith('/intake')) {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <BusinessIntakePage />
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

  // Show password setup screen for first-time users
  if (auth.requiresPasswordSetup) {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <PasswordSetupPage
            userId={auth.userId}
            username={auth.username}
            onComplete={handlePasswordSetupComplete}
          />
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
              role={effectiveRole!}
              username={auth.username}
              onLogout={handleLogout}
            />
            <div className="flex flex-col flex-1 min-w-0 bg-background/90 backdrop-blur-sm">
              <header className="flex items-center gap-4 px-4 py-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
                <SidebarTrigger data-testid="button-sidebar-toggle" />
                <div className="flex-1" />
                
                {auth.isSuperAdmin && (
                  <GodModeRoleSwitcher
                    currentRole={viewAsRole || auth.role || "admin"}
                    currentTechnicianId={viewAsTechnicianId}
                    currentSalespersonId={viewAsSalespersonId}
                    onRoleChange={(role) => {
                      setViewAsRole(role);
                      setLocation("/");
                    }}
                    onTechnicianChange={(id, name) => {
                      setViewAsTechnicianId(id);
                      setViewAsTechnicianName(name);
                      setViewAsRole("technician");
                      setLocation("/");
                    }}
                    onSalespersonChange={(id, name) => {
                      setViewAsSalespersonId(id);
                      setViewAsSalespersonName(name);
                      setViewAsRole("salesperson");
                      setLocation("/");
                    }}
                  />
                )}
              </header>
              <main className="flex-1 overflow-auto p-6">
                {effectiveRole === "admin" ? (
                  <AdminRouter />
                ) : effectiveRole === "dispatcher" ? (
                  <DispatcherRouter />
                ) : effectiveRole === "salesperson" ? (
                  <SalespersonRouter 
                    salespersonId={effectiveSalespersonId || ""} 
                    userId={auth.userId}
                    fullName={effectiveFullName}
                  />
                ) : (
                  <TechnicianRouter 
                    technicianId={effectiveTechnicianId || ""} 
                    userId={auth.userId}
                    fullName={effectiveFullName}
                  />
                )}
              </main>
              <footer className="px-4 py-2 text-center border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
                <span className="text-xs text-muted-foreground" data-testid="text-powered-by">
                  Powered by WebSlingerAI
                </span>
              </footer>
            </div>
          </div>
        </SidebarProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

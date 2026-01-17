import { Link, useLocation } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  LayoutDashboard,
  Users,
  FileText,
  Settings,
  LogOut,
  Wrench,
  ClipboardList,
  DollarSign,
  Upload,
  Megaphone,
  Phone,
  UserCog,
  Download,
  Wallet,
  Briefcase,
  Receipt,
  BookOpen,
  MapPin,
  BarChart3,
  Navigation,
  Tag,
  TrendingUp,
} from "lucide-react";
import cseMascot from "@assets/cse-mascot.png";

interface AppSidebarProps {
  role: "admin" | "dispatcher" | "technician" | "salesperson";
  username: string;
  onLogout: () => void;
}

const adminMenuItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Leads", url: "/leads", icon: Users },
  { title: "Jobs", url: "/jobs", icon: Briefcase },
  { title: "Quotes", url: "/quotes", icon: Receipt },
  { title: "Technician Map", url: "/map", icon: MapPin },
  { title: "Outreach", url: "/outreach", icon: Megaphone },
  { title: "Technicians", url: "/technicians", icon: Wrench },
  { title: "Quote Templates", url: "/quote-templates", icon: FileText },
  { title: "Pricebook", url: "/pricebook", icon: Tag },
  { title: "Marketing ROI", url: "/marketing", icon: TrendingUp },
  { title: "SEO Content", url: "/seo-content", icon: Megaphone },
  { title: "Payroll", url: "/payroll", icon: Wallet },
  { title: "Import Data", url: "/import", icon: Upload },
  { title: "Export Data", url: "/export", icon: Download },
  { title: "Operations Guide", url: "/operations", icon: BookOpen },
];

const dispatcherMenuItems = [
  { title: "Dispatch Center", url: "/", icon: LayoutDashboard },
  { title: "Jobs", url: "/jobs", icon: Briefcase },
  { title: "Quotes", url: "/quotes", icon: Receipt },
  { title: "Technician Map", url: "/map", icon: MapPin },
  { title: "Staffing Pool", url: "/staffing", icon: UserCog },
  { title: "Calls", url: "/calls", icon: Phone },
  { title: "Leads", url: "/leads", icon: Users },
  { title: "Operations Guide", url: "/operations", icon: BookOpen },
];

const techMenuItems = [
  { title: "My Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Quote Tool", url: "/quote", icon: FileText },
  { title: "My Jobs", url: "/jobs", icon: ClipboardList },
  { title: "Earnings", url: "/earnings", icon: DollarSign },
  { title: "Operations Guide", url: "/operations", icon: BookOpen },
];

const salesMenuItems = [
  { title: "My Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Leads", url: "/leads", icon: Users },
  { title: "Jobs", url: "/jobs", icon: Briefcase },
  { title: "Quotes", url: "/quotes", icon: Receipt },
  { title: "Quote Tool", url: "/quote", icon: FileText },
  { title: "Location Tracking", url: "/location", icon: Navigation },
  { title: "Analytics", url: "/analytics", icon: BarChart3 },
  { title: "Commissions", url: "/earnings", icon: DollarSign },
  { title: "Operations Guide", url: "/operations", icon: BookOpen },
];

export default function AppSidebar({ role, username, onLogout }: AppSidebarProps) {
  const [location] = useLocation();
  const menuItems = role === "admin" 
    ? adminMenuItems 
    : role === "dispatcher" 
      ? dispatcherMenuItems 
      : role === "salesperson"
        ? salesMenuItems
        : techMenuItems;

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <img 
            src={cseMascot} 
            alt="CSE Mascot" 
            className="w-12 h-12 object-contain"
            data-testid="img-cse-mascot"
          />
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-sm tracking-wide truncate">Emergency Chicago</h2>
            <p className="text-xs text-muted-foreground">Sewer Experts CRM</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="uppercase text-xs tracking-wider">
            {role === "admin" ? "Administration" : role === "dispatcher" ? "Dispatch Operations" : role === "salesperson" ? "Sales Portal" : "Technician Portal"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                  >
                    <Link href={item.url} data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, '-')}`}>
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {role === "admin" && (
          <SidebarGroup>
            <SidebarGroupLabel className="uppercase text-xs tracking-wider">
              System
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={location === "/settings"}>
                    <Link href="/settings" data-testid="nav-settings">
                      <Settings className="w-4 h-4" />
                      <span>Settings</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <Avatar className="w-9 h-9">
            <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
              {getInitials(username)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{username}</p>
            <Badge variant="secondary" className="text-xs capitalize mt-0.5">
              {role}
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onLogout}
            className="shrink-0"
            data-testid="button-logout"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

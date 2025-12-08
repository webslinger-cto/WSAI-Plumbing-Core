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
  BarChart3,
  Settings,
  LogOut,
  Wrench,
  ClipboardList,
  DollarSign,
  Upload,
  Megaphone,
} from "lucide-react";

interface AppSidebarProps {
  role: "admin" | "technician";
  username: string;
  onLogout: () => void;
}

const adminMenuItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Leads", url: "/leads", icon: Users },
  { title: "Outreach", url: "/outreach", icon: Megaphone },
  { title: "Technicians", url: "/technicians", icon: Wrench },
  { title: "Analytics", url: "/analytics", icon: BarChart3 },
  { title: "Import Data", url: "/import", icon: Upload },
];

const techMenuItems = [
  { title: "My Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Quote Tool", url: "/quote", icon: FileText },
  { title: "My Jobs", url: "/jobs", icon: ClipboardList },
  { title: "Earnings", url: "/earnings", icon: DollarSign },
];

export default function AppSidebar({ role, username, onLogout }: AppSidebarProps) {
  const [location] = useLocation();
  const menuItems = role === "admin" ? adminMenuItems : techMenuItems;

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
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg shadow-primary/25">
            <Wrench className="w-5 h-5 text-primary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-sm tracking-wide truncate">Chicago Sewer</h2>
            <p className="text-xs text-muted-foreground">Experts CRM</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="uppercase text-xs tracking-wider">
            {role === "admin" ? "Administration" : "Technician Portal"}
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

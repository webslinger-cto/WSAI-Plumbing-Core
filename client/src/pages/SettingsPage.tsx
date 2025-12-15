import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Settings,
  Users,
  Shield,
  Bell,
  Save,
  Search,
  Eye,
  FileEdit,
  Download,
  Upload,
  Megaphone,
  Wallet,
  LayoutDashboard,
  Wrench,
} from "lucide-react";

type FeaturePermission = {
  id: string;
  name: string;
  description: string;
  icon: typeof Settings;
};

type EmployeeAccess = {
  id: string;
  name: string;
  email: string;
  role: "dispatcher" | "technician";
  permissions: Record<string, boolean>;
};

const featurePermissions: FeaturePermission[] = [
  { id: "viewLeads", name: "View Leads", description: "Access to view lead information", icon: Eye },
  { id: "editLeads", name: "Edit Leads", description: "Ability to modify lead details", icon: FileEdit },
  { id: "viewDashboard", name: "View Dashboard", description: "Access to dashboard analytics", icon: LayoutDashboard },
  { id: "exportData", name: "Export Data", description: "Permission to export reports", icon: Download },
  { id: "importData", name: "Import Data", description: "Permission to import data", icon: Upload },
  { id: "manageOutreach", name: "Manage Outreach", description: "Access to outreach campaigns", icon: Megaphone },
  { id: "viewPayroll", name: "View Payroll", description: "Access to payroll information", icon: Wallet },
  { id: "viewTechnicians", name: "View Technicians", description: "Access to technician profiles", icon: Wrench },
];

const initialEmployees: EmployeeAccess[] = [
  {
    id: "1",
    name: "Sarah Miller",
    email: "sarah.miller@cse.com",
    role: "dispatcher",
    permissions: {
      viewLeads: true,
      editLeads: true,
      viewDashboard: true,
      exportData: false,
      importData: false,
      manageOutreach: true,
      viewPayroll: false,
      viewTechnicians: true,
    },
  },
  {
    id: "2",
    name: "Tom Davis",
    email: "tom.davis@cse.com",
    role: "dispatcher",
    permissions: {
      viewLeads: true,
      editLeads: false,
      viewDashboard: true,
      exportData: false,
      importData: false,
      manageOutreach: false,
      viewPayroll: false,
      viewTechnicians: true,
    },
  },
  {
    id: "3",
    name: "Mike Johnson",
    email: "mike.j@cse.com",
    role: "technician",
    permissions: {
      viewLeads: false,
      editLeads: false,
      viewDashboard: false,
      exportData: false,
      importData: false,
      manageOutreach: false,
      viewPayroll: false,
      viewTechnicians: false,
    },
  },
  {
    id: "4",
    name: "Carlos Rodriguez",
    email: "carlos.r@cse.com",
    role: "technician",
    permissions: {
      viewLeads: false,
      editLeads: false,
      viewDashboard: false,
      exportData: false,
      importData: false,
      manageOutreach: false,
      viewPayroll: false,
      viewTechnicians: false,
    },
  },
  {
    id: "5",
    name: "David Smith",
    email: "david.s@cse.com",
    role: "technician",
    permissions: {
      viewLeads: false,
      editLeads: false,
      viewDashboard: false,
      exportData: false,
      importData: false,
      manageOutreach: false,
      viewPayroll: false,
      viewTechnicians: false,
    },
  },
];

export default function SettingsPage() {
  const { toast } = useToast();
  const [employees, setEmployees] = useState<EmployeeAccess[]>(initialEmployees);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "dispatcher" | "technician">("all");
  const [hasChanges, setHasChanges] = useState(false);

  const [notificationSettings, setNotificationSettings] = useState({
    emailNewLeads: true,
    emailJobComplete: true,
    emailDailyReport: false,
    pushNewLeads: true,
    pushUrgentJobs: true,
  });

  const [generalSettings, setGeneralSettings] = useState({
    autoAssignLeads: true,
    requireQuoteApproval: false,
    allowTechSelfSchedule: true,
    defaultLeadExpiry: "7",
  });

  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch = 
      emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === "all" || emp.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const togglePermission = (employeeId: string, permissionId: string) => {
    setEmployees((prev) =>
      prev.map((emp) =>
        emp.id === employeeId
          ? {
              ...emp,
              permissions: {
                ...emp.permissions,
                [permissionId]: !emp.permissions[permissionId],
              },
            }
          : emp
      )
    );
    setHasChanges(true);
  };

  const toggleAllPermissions = (employeeId: string, enabled: boolean) => {
    setEmployees((prev) =>
      prev.map((emp) =>
        emp.id === employeeId
          ? {
              ...emp,
              permissions: Object.fromEntries(
                featurePermissions.map((fp) => [fp.id, enabled])
              ),
            }
          : emp
      )
    );
    setHasChanges(true);
  };

  const saveChanges = () => {
    toast({
      title: "Settings saved",
      description: "All changes have been saved successfully.",
    });
    setHasChanges(false);
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getEnabledCount = (permissions: Record<string, boolean>) => {
    return Object.values(permissions).filter(Boolean).length;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Manage system preferences and employee access controls
          </p>
        </div>
        {hasChanges && (
          <Button onClick={saveChanges} data-testid="button-save-settings">
            <Save className="w-4 h-4 mr-2" />
            Save Changes
          </Button>
        )}
      </div>

      <Tabs defaultValue="access" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="access" data-testid="tab-access">
            <Shield className="w-4 h-4 mr-2" />
            Access
          </TabsTrigger>
          <TabsTrigger value="notifications" data-testid="tab-notifications">
            <Bell className="w-4 h-4 mr-2" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="general" data-testid="tab-general">
            <Settings className="w-4 h-4 mr-2" />
            General
          </TabsTrigger>
        </TabsList>

        <TabsContent value="access" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Employee Access Control
              </CardTitle>
              <CardDescription>
                Control which features each employee can access. Admins always have full access.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search employees..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                    data-testid="input-search-employees"
                  />
                </div>
                <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as typeof roleFilter)}>
                  <SelectTrigger className="w-[180px]" data-testid="select-role-filter">
                    <SelectValue placeholder="Filter by role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="dispatcher">Dispatchers</SelectItem>
                    <SelectItem value="technician">Technicians</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-4">
                {filteredEmployees.map((employee) => (
                  <div key={employee.id} className="p-4 rounded-lg border bg-muted/30" data-testid={`card-employee-${employee.id}`}>
                    <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                      <div className="flex items-center gap-3 min-w-[200px]">
                        <Avatar className="w-10 h-10">
                          <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                            {getInitials(employee.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{employee.name}</p>
                          <p className="text-sm text-muted-foreground">{employee.email}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="secondary" className="capitalize text-xs">
                              {employee.role}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {getEnabledCount(employee.permissions)}/{featurePermissions.length} enabled
                            </Badge>
                          </div>
                        </div>
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center justify-between gap-4 mb-3">
                          <p className="text-sm font-medium">Feature Permissions</p>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => toggleAllPermissions(employee.id, true)}
                              data-testid={`button-enable-all-${employee.id}`}
                            >
                              Enable All
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => toggleAllPermissions(employee.id, false)}
                              data-testid={`button-disable-all-${employee.id}`}
                            >
                              Disable All
                            </Button>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                          {featurePermissions.map((feature) => (
                            <div
                              key={feature.id}
                              className="flex items-center gap-2 p-2 rounded-md bg-muted/50"
                            >
                              <Switch
                                id={`${employee.id}-${feature.id}`}
                                checked={employee.permissions[feature.id]}
                                onCheckedChange={() => togglePermission(employee.id, feature.id)}
                                data-testid={`switch-${employee.id}-${feature.id}`}
                              />
                              <Label
                                htmlFor={`${employee.id}-${feature.id}`}
                                className="text-xs cursor-pointer flex items-center gap-1"
                              >
                                <feature.icon className="w-3 h-3" />
                                {feature.name}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {filteredEmployees.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No employees found matching your criteria
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Notification Preferences
              </CardTitle>
              <CardDescription>
                Configure how and when you receive notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="font-medium">Email Notifications</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <Label htmlFor="emailNewLeads">New Lead Alerts</Label>
                      <p className="text-sm text-muted-foreground">Get notified when new leads come in</p>
                    </div>
                    <Switch
                      id="emailNewLeads"
                      checked={notificationSettings.emailNewLeads}
                      onCheckedChange={(checked) => {
                        setNotificationSettings((prev) => ({ ...prev, emailNewLeads: checked }));
                        setHasChanges(true);
                      }}
                      data-testid="switch-email-new-leads"
                    />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <Label htmlFor="emailJobComplete">Job Completion</Label>
                      <p className="text-sm text-muted-foreground">Notify when technicians complete jobs</p>
                    </div>
                    <Switch
                      id="emailJobComplete"
                      checked={notificationSettings.emailJobComplete}
                      onCheckedChange={(checked) => {
                        setNotificationSettings((prev) => ({ ...prev, emailJobComplete: checked }));
                        setHasChanges(true);
                      }}
                      data-testid="switch-email-job-complete"
                    />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <Label htmlFor="emailDailyReport">Daily Summary Report</Label>
                      <p className="text-sm text-muted-foreground">Receive a daily summary of activity</p>
                    </div>
                    <Switch
                      id="emailDailyReport"
                      checked={notificationSettings.emailDailyReport}
                      onCheckedChange={(checked) => {
                        setNotificationSettings((prev) => ({ ...prev, emailDailyReport: checked }));
                        setHasChanges(true);
                      }}
                      data-testid="switch-email-daily-report"
                    />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="font-medium">Push Notifications</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <Label htmlFor="pushNewLeads">New Lead Alerts</Label>
                      <p className="text-sm text-muted-foreground">Instant push for incoming leads</p>
                    </div>
                    <Switch
                      id="pushNewLeads"
                      checked={notificationSettings.pushNewLeads}
                      onCheckedChange={(checked) => {
                        setNotificationSettings((prev) => ({ ...prev, pushNewLeads: checked }));
                        setHasChanges(true);
                      }}
                      data-testid="switch-push-new-leads"
                    />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <Label htmlFor="pushUrgentJobs">Urgent Job Alerts</Label>
                      <p className="text-sm text-muted-foreground">Get alerts for urgent or emergency jobs</p>
                    </div>
                    <Switch
                      id="pushUrgentJobs"
                      checked={notificationSettings.pushUrgentJobs}
                      onCheckedChange={(checked) => {
                        setNotificationSettings((prev) => ({ ...prev, pushUrgentJobs: checked }));
                        setHasChanges(true);
                      }}
                      data-testid="switch-push-urgent-jobs"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                General Settings
              </CardTitle>
              <CardDescription>
                Configure system-wide behavior and preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="font-medium">Lead Management</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <Label htmlFor="autoAssignLeads">Auto-Assign Leads</Label>
                      <p className="text-sm text-muted-foreground">
                        Automatically assign new leads to available technicians
                      </p>
                    </div>
                    <Switch
                      id="autoAssignLeads"
                      checked={generalSettings.autoAssignLeads}
                      onCheckedChange={(checked) => {
                        setGeneralSettings((prev) => ({ ...prev, autoAssignLeads: checked }));
                        setHasChanges(true);
                      }}
                      data-testid="switch-auto-assign-leads"
                    />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 mr-4">
                      <Label htmlFor="defaultLeadExpiry">Default Lead Expiry (Days)</Label>
                      <p className="text-sm text-muted-foreground">
                        Number of days before leads are marked as expired
                      </p>
                    </div>
                    <Select
                      value={generalSettings.defaultLeadExpiry}
                      onValueChange={(v) => {
                        setGeneralSettings((prev) => ({ ...prev, defaultLeadExpiry: v }));
                        setHasChanges(true);
                      }}
                    >
                      <SelectTrigger className="w-[120px]" data-testid="select-lead-expiry">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="3">3 days</SelectItem>
                        <SelectItem value="5">5 days</SelectItem>
                        <SelectItem value="7">7 days</SelectItem>
                        <SelectItem value="14">14 days</SelectItem>
                        <SelectItem value="30">30 days</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="font-medium">Quote & Job Settings</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <Label htmlFor="requireQuoteApproval">Require Quote Approval</Label>
                      <p className="text-sm text-muted-foreground">
                        Quotes must be approved by admin before sending to customers
                      </p>
                    </div>
                    <Switch
                      id="requireQuoteApproval"
                      checked={generalSettings.requireQuoteApproval}
                      onCheckedChange={(checked) => {
                        setGeneralSettings((prev) => ({ ...prev, requireQuoteApproval: checked }));
                        setHasChanges(true);
                      }}
                      data-testid="switch-require-quote-approval"
                    />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <Label htmlFor="allowTechSelfSchedule">Technician Self-Scheduling</Label>
                      <p className="text-sm text-muted-foreground">
                        Allow technicians to schedule their own jobs
                      </p>
                    </div>
                    <Switch
                      id="allowTechSelfSchedule"
                      checked={generalSettings.allowTechSelfSchedule}
                      onCheckedChange={(checked) => {
                        setGeneralSettings((prev) => ({ ...prev, allowTechSelfSchedule: checked }));
                        setHasChanges(true);
                      }}
                      data-testid="switch-tech-self-schedule"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

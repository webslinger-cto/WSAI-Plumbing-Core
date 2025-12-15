import { useState } from "react";
import TechnicianCard, { type Technician, type TechnicianClassification } from "@/components/TechnicianCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Phone, DollarSign, TrendingUp, Pencil, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const CLASSIFICATION_OPTIONS: TechnicianClassification[] = ["senior", "junior", "digger"];

// todo: remove mock functionality and replace with API data
const initialMockTechnicians: Technician[] = [
  {
    id: "1",
    name: "Mike Johnson",
    initials: "MJ",
    phone: "(312) 555-0123",
    totalJobs: 156,
    completedJobs: 142,
    canceledJobs: 14,
    revenue: 28450,
    conversionRate: 78,
    status: "online",
    classification: "senior",
    hourlyRate: 75,
    commissionRate: 0.15,
  },
  {
    id: "2",
    name: "Carlos Rodriguez",
    initials: "CR",
    phone: "(773) 555-0456",
    totalJobs: 98,
    completedJobs: 85,
    canceledJobs: 13,
    revenue: 19200,
    conversionRate: 72,
    status: "busy",
    classification: "senior",
    hourlyRate: 70,
    commissionRate: 0.12,
  },
  {
    id: "3",
    name: "David Smith",
    initials: "DS",
    phone: "(708) 555-0789",
    totalJobs: 67,
    completedJobs: 58,
    canceledJobs: 9,
    revenue: 12800,
    conversionRate: 65,
    status: "offline",
    classification: "junior",
    hourlyRate: 45,
    commissionRate: 0.08,
  },
  {
    id: "4",
    name: "James Williams",
    initials: "JW",
    phone: "(630) 555-0321",
    totalJobs: 89,
    completedJobs: 81,
    canceledJobs: 8,
    revenue: 16750,
    conversionRate: 74,
    status: "online",
    classification: "junior",
    hourlyRate: 50,
    commissionRate: 0.10,
  },
  {
    id: "5",
    name: "Robert Brown",
    initials: "RB",
    phone: "(847) 555-0654",
    totalJobs: 45,
    completedJobs: 38,
    canceledJobs: 7,
    revenue: 8900,
    conversionRate: 62,
    status: "offline",
    classification: "digger",
    hourlyRate: 35,
    commissionRate: 0.05,
  },
];

export default function TechniciansPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [technicians, setTechnicians] = useState<Technician[]>(initialMockTechnicians);
  const [selectedTech, setSelectedTech] = useState<Technician | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    classification: "" as TechnicianClassification,
    hourlyRate: 0,
    commissionRate: 0,
  });

  const filteredTechs = technicians.filter((tech) =>
    tech.name.toLowerCase().includes(search.toLowerCase())
  );

  const startEditing = () => {
    if (selectedTech) {
      setEditForm({
        classification: selectedTech.classification,
        hourlyRate: selectedTech.hourlyRate,
        commissionRate: selectedTech.commissionRate,
      });
      setIsEditing(true);
    }
  };

  const saveChanges = () => {
    if (selectedTech) {
      const validatedForm = {
        classification: editForm.classification,
        hourlyRate: Math.max(0, editForm.hourlyRate),
        commissionRate: Math.max(0, Math.min(1, editForm.commissionRate)),
      };
      setTechnicians(prev => prev.map(tech => 
        tech.id === selectedTech.id 
          ? { ...tech, ...validatedForm }
          : tech
      ));
      const updated = { ...selectedTech, ...validatedForm };
      setSelectedTech(updated);
      setIsEditing(false);
      toast({ 
        title: "Technician updated", 
        description: `${selectedTech.name}'s profile has been updated.` 
      });
    }
  };

  const cancelEditing = () => {
    setIsEditing(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Technicians</h1>
          <p className="text-muted-foreground">
            Manage your team and track individual performance
          </p>
        </div>
        <Button data-testid="button-add-technician">
          <Plus className="w-4 h-4 mr-2" />
          Add Technician
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search technicians..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
          data-testid="input-search-technicians"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTechs.map((tech) => (
          <TechnicianCard
            key={tech.id}
            technician={tech}
            onClick={setSelectedTech}
          />
        ))}
        {filteredTechs.length === 0 && (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            No technicians found matching your search
          </div>
        )}
      </div>

      <Dialog open={!!selectedTech} onOpenChange={(open) => { if (!open) { setSelectedTech(null); setIsEditing(false); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{isEditing ? "Edit Technician" : "Technician Details"}</DialogTitle>
          </DialogHeader>
          {selectedTech && (
            <>
              {isEditing ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <span className="text-xl font-bold text-primary">
                        {selectedTech.initials}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-semibold">{selectedTech.name}</h3>
                      <p className="text-sm text-muted-foreground">{selectedTech.phone}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="classification">Classification</Label>
                    <Select
                      value={editForm.classification}
                      onValueChange={(v) => setEditForm(prev => ({ ...prev, classification: v as TechnicianClassification }))}
                    >
                      <SelectTrigger data-testid="select-classification">
                        <SelectValue placeholder="Select classification" />
                      </SelectTrigger>
                      <SelectContent>
                        {CLASSIFICATION_OPTIONS.map(opt => (
                          <SelectItem key={opt} value={opt} className="capitalize">
                            {opt}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="hourlyRate">Hourly Rate ($)</Label>
                    <Input
                      id="hourlyRate"
                      type="number"
                      min="0"
                      step="1"
                      value={editForm.hourlyRate}
                      onChange={(e) => setEditForm(prev => ({ ...prev, hourlyRate: parseFloat(e.target.value) || 0 }))}
                      data-testid="input-hourly-rate"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="commissionRate">Commission Rate (%)</Label>
                    <Input
                      id="commissionRate"
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      value={Math.round(editForm.commissionRate * 100)}
                      onChange={(e) => setEditForm(prev => ({ ...prev, commissionRate: (parseFloat(e.target.value) || 0) / 100 }))}
                      data-testid="input-commission-rate"
                    />
                  </div>

                  <DialogFooter className="gap-2 pt-4">
                    <Button variant="outline" onClick={cancelEditing} data-testid="button-cancel-edit">
                      Cancel
                    </Button>
                    <Button onClick={saveChanges} data-testid="button-save-tech">
                      <Save className="w-4 h-4 mr-2" />
                      Save Changes
                    </Button>
                  </DialogFooter>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center">
                      <span className="text-2xl font-bold text-primary">
                        {selectedTech.initials}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">{selectedTech.name}</h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Phone className="w-4 h-4" />
                        {selectedTech.phone}
                      </div>
                      <Badge variant="secondary" className="mt-1 capitalize">
                        {selectedTech.status}
                      </Badge>
                    </div>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-2xl font-bold">{selectedTech.totalJobs}</p>
                      <p className="text-xs text-muted-foreground">Total Jobs</p>
                    </div>
                    <div className="p-3 rounded-lg bg-green-500/10">
                      <p className="text-2xl font-bold text-green-500">
                        {selectedTech.completedJobs}
                      </p>
                      <p className="text-xs text-muted-foreground">Completed</p>
                    </div>
                    <div className="p-3 rounded-lg bg-red-500/10">
                      <p className="text-2xl font-bold text-red-500">
                        {selectedTech.canceledJobs}
                      </p>
                      <p className="text-xs text-muted-foreground">Canceled</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Success Rate</span>
                      <span className="font-medium">
                        {((selectedTech.completedJobs / selectedTech.totalJobs) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <Progress
                      value={(selectedTech.completedJobs / selectedTech.totalJobs) * 100}
                      className="h-2"
                    />
                  </div>

                  <Separator />

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                      <DollarSign className="w-5 h-5 text-green-500" />
                      <div>
                        <p className="text-sm text-muted-foreground">Revenue</p>
                        <p className="font-semibold">${selectedTech.revenue.toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                      <TrendingUp className="w-5 h-5 text-blue-500" />
                      <div>
                        <p className="text-sm text-muted-foreground">Conversion</p>
                        <p className="font-semibold">{selectedTech.conversionRate}%</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-center p-3 rounded-lg bg-muted/50">
                    <div>
                      <p className="text-xs text-muted-foreground">Classification</p>
                      <p className="font-medium capitalize">{selectedTech.classification}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Hourly Rate</p>
                      <p className="font-medium">${selectedTech.hourlyRate}/hr</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Commission</p>
                      <p className="font-medium">{(selectedTech.commissionRate * 100).toFixed(0)}%</p>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button className="flex-1" data-testid="button-view-jobs">
                      View Jobs
                    </Button>
                    <Button variant="outline" className="flex-1" onClick={startEditing} data-testid="button-edit-tech">
                      <Pencil className="w-4 h-4 mr-2" />
                      Edit Profile
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

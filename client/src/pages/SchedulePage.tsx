import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import {
  format,
  startOfWeek,
  addDays,
  isSameDay,
  addWeeks,
  subWeeks,
} from "date-fns";
import type { Job, Technician } from "@shared/schema";
import { serviceTypes } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Calendar config ───────────────────────────────────────────────────────────
const START_HOUR = 6;
const END_HOUR = 21;
const TOTAL_HOURS = END_HOUR - START_HOUR;
const HOUR_HEIGHT = 72; // px per 1-hour row
const GRID_HEIGHT = TOTAL_HOURS * HOUR_HEIGHT;
const TIME_GUTTER_W = 60;

// ─── Status colour map ─────────────────────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  pending:     "bg-yellow-500/20 border-yellow-400/50 text-yellow-200",
  assigned:    "bg-blue-500/20 border-blue-400/50 text-blue-200",
  confirmed:   "bg-indigo-500/20 border-indigo-400/50 text-indigo-200",
  en_route:    "bg-cyan-500/20 border-cyan-400/50 text-cyan-200",
  on_site:     "bg-violet-500/20 border-violet-400/50 text-violet-200",
  in_progress: "bg-orange-500/20 border-orange-400/50 text-orange-200",
  completed:   "bg-green-500/20 border-green-400/50 text-green-200 opacity-60",
  cancelled:   "bg-red-500/20 border-red-400/50 text-red-200 opacity-40",
};

// ─── Helpers ───────────────────────────────────────────────────────────────────
function timeToMins(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}
function minsToTime(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
function snapTo30(mins: number): number {
  return Math.round(mins / 30) * 30;
}
function getWeekDays(anchor: Date): Date[] {
  const monday = startOfWeek(anchor, { weekStartsOn: 1 });
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface DragPayload {
  jobId: string;
  originalTechId: string | null;
}
interface ConflictInfo {
  customerName: string;
  scheduledTimeStart: string | null;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function SchedulePage() {
  const { toast } = useToast();
  const [weekAnchor, setWeekAnchor] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const weekDays = getWeekDays(weekAnchor);

  const dragPayload = useRef<DragPayload | null>(null);
  const [dragOverTech, setDragOverTech] = useState<string | null>(null);
  const [conflict, setConflict] = useState<ConflictInfo | null>(null);

  const [createDialog, setCreateDialog] = useState<{
    open: boolean;
    technicianId: string | null;
    timeStart: string;
  }>({ open: false, technicianId: null, timeStart: "09:00" });

  const [form, setForm] = useState({
    customerName: "",
    customerPhone: "",
    address: "",
    serviceType: "Drain Cleaning" as string,
    estimatedDuration: 60,
  });

  // ─── Queries ───────────────────────────────────────────────────────────────
  const { data: technicians = [] } = useQuery<Technician[]>({
    queryKey: ["/api/technicians"],
  });
  const { data: allJobs = [] } = useQuery<Job[]>({
    queryKey: ["/api/jobs"],
  });

  const dayJobs = allJobs.filter(
    (j) => j.scheduledDate && isSameDay(new Date(j.scheduledDate), selectedDate)
  );

  const jobsByTech = (techId: string | null) =>
    dayJobs.filter((j) =>
      techId === null
        ? !j.assignedTechnicianId
        : j.assignedTechnicianId === techId
    );

  const dayJobCount = (d: Date) =>
    allJobs.filter(
      (j) => j.scheduledDate && isSameDay(new Date(j.scheduledDate), d)
    ).length;

  // ─── Mutations ────────────────────────────────────────────────────────────
  const rescheduleMutation = useMutation({
    mutationFn: async (body: {
      jobId: string;
      scheduledDate: string;
      scheduledTimeStart: string;
      scheduledTimeEnd: string;
      assignedTechnicianId: string | null;
    }) => {
      const { jobId, ...rest } = body;
      const res = await fetch(`/api/schedule/reschedule/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(rest),
      });
      if (res.status === 409) {
        const data = await res.json();
        const err = new Error("double_booking") as any;
        err.conflictingJob = data.conflictingJob as ConflictInfo;
        throw err;
      }
      if (!res.ok) throw new Error((await res.text()) || "Reschedule failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      setConflict(null);
      toast({ title: "Rescheduled", description: "Job moved successfully." });
    },
    onError: (err: any) => {
      if (err?.conflictingJob) {
        setConflict(err.conflictingJob as ConflictInfo);
      } else {
        toast({
          title: "Error",
          description: err?.message || "Failed to reschedule",
          variant: "destructive",
        });
      }
    },
  });

  const createJobMutation = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Create failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      toast({ title: "Job created", description: "Added to schedule." });
      setCreateDialog((p) => ({ ...p, open: false }));
      setForm({
        customerName: "",
        customerPhone: "",
        address: "",
        serviceType: "Drain Cleaning",
        estimatedDuration: 60,
      });
    },
    onError: (err: any) =>
      toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  // ─── Drag & drop handlers ─────────────────────────────────────────────────
  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>, techId: string | null) => {
      e.preventDefault();
      setDragOverTech(null);
      if (!dragPayload.current) return;
      const { jobId } = dragPayload.current;
      dragPayload.current = null;

      const rect = e.currentTarget.getBoundingClientRect();
      const offsetY = e.clientY - rect.top;
      const rawMins = (offsetY / HOUR_HEIGHT) * 60;
      const snapped = snapTo30(rawMins);
      const clamped = Math.max(0, Math.min(snapped, TOTAL_HOURS * 60 - 30));
      const startAbsMins = START_HOUR * 60 + clamped;
      const endAbsMins = startAbsMins + 60;

      rescheduleMutation.mutate({
        jobId,
        scheduledDate: format(selectedDate, "yyyy-MM-dd"),
        scheduledTimeStart: minsToTime(startAbsMins),
        scheduledTimeEnd: minsToTime(endAbsMins),
        assignedTechnicianId: techId,
      });
    },
    [selectedDate, rescheduleMutation]
  );

  // Click on empty calendar area → open create dialog
  const handleColumnClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>, techId: string | null) => {
      if ((e.target as HTMLElement).closest("[data-job-card]")) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const offsetY = e.clientY - rect.top;
      const rawMins = (offsetY / HOUR_HEIGHT) * 60;
      const snapped = snapTo30(rawMins);
      const clamped = Math.max(0, Math.min(snapped, TOTAL_HOURS * 60 - 30));
      const startAbsMins = START_HOUR * 60 + clamped;
      setCreateDialog({
        open: true,
        technicianId: techId,
        timeStart: minsToTime(startAbsMins),
      });
    },
    []
  );

  const handleCreateSubmit = () => {
    if (!form.customerName || !form.customerPhone || !form.address) {
      toast({
        title: "Missing required fields",
        description: "Name, phone, and address are required.",
        variant: "destructive",
      });
      return;
    }
    const startAbsMins = timeToMins(createDialog.timeStart);
    const endAbsMins = startAbsMins + form.estimatedDuration;
    createJobMutation.mutate({
      customerName: form.customerName,
      customerPhone: form.customerPhone,
      address: form.address,
      serviceType: form.serviceType,
      estimatedDuration: form.estimatedDuration,
      status: "pending",
      scheduledDate: selectedDate.toISOString(),
      scheduledTimeStart: createDialog.timeStart,
      scheduledTimeEnd: minsToTime(endAbsMins),
      assignedTechnicianId: createDialog.technicianId || null,
    });
  };

  // ─── Job card renderer ────────────────────────────────────────────────────
  function renderJobCard(job: Job) {
    if (!job.scheduledTimeStart) return null;
    const startAbsMins = timeToMins(job.scheduledTimeStart);
    const offsetMins = startAbsMins - START_HOUR * 60;
    if (offsetMins < 0 || offsetMins >= TOTAL_HOURS * 60) return null;

    const duration = job.estimatedDuration ?? 60;
    const topPx = (offsetMins / 60) * HOUR_HEIGHT;
    const heightPx = Math.max((duration / 60) * HOUR_HEIGHT, 28);
    const colorClass = STATUS_COLORS[job.status] ?? STATUS_COLORS.pending;
    const endLabel =
      job.scheduledTimeEnd ||
      minsToTime(startAbsMins + duration);

    return (
      <div
        key={job.id}
        data-job-card
        draggable
        onDragStart={(e) => {
          dragPayload.current = {
            jobId: job.id,
            originalTechId: job.assignedTechnicianId,
          };
          e.dataTransfer.effectAllowed = "move";
          e.dataTransfer.setData("text/plain", job.id);
        }}
        style={{ top: topPx, height: heightPx, left: 3, right: 3 }}
        className={cn(
          "absolute border rounded-md px-2 py-0.5 text-xs cursor-grab active:cursor-grabbing z-10",
          "select-none hover:z-20 hover:shadow-lg transition-shadow",
          colorClass
        )}
        title={`${job.customerName} · ${job.serviceType} · ${job.scheduledTimeStart}–${endLabel}`}
      >
        <p className="font-semibold truncate leading-tight">{job.customerName}</p>
        <p className="truncate opacity-75 leading-tight">{job.serviceType}</p>
        {heightPx > 46 && (
          <p className="truncate opacity-50 text-[10px]">
            {job.scheduledTimeStart}–{endLabel}
          </p>
        )}
      </div>
    );
  }

  // ─── Build columns ────────────────────────────────────────────────────────
  const activeTechs = technicians.filter((t) => t.status !== "off_duty");
  const columns: Array<{ id: string | null; name: string }> = [
    ...activeTechs.map((t) => ({ id: t.id, name: t.fullName })),
    { id: null, name: "Unassigned" },
  ];

  const hours = Array.from({ length: TOTAL_HOURS }, (_, i) => START_HOUR + i);

  return (
    <div className="flex flex-col h-full gap-4">
      {/* ── Page header ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Schedule</h1>
          <p className="text-sm text-muted-foreground">
            {format(selectedDate, "EEEE, MMMM d, yyyy")}
          </p>
        </div>
        <Button
          size="sm"
          onClick={() =>
            setCreateDialog({ open: true, technicianId: null, timeStart: "09:00" })
          }
        >
          <Plus className="w-4 h-4 mr-1" />
          New Job
        </Button>
      </div>

      {/* ── Conflict alert ─────────────────────────────────────────── */}
      {conflict && (
        <Alert variant="destructive">
          <AlertTriangle className="w-4 h-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>
              Double-booking conflict:{" "}
              <strong>{conflict.customerName}</strong>
              {conflict.scheduledTimeStart &&
                ` is already scheduled at ${conflict.scheduledTimeStart}`}
              . Drop the job in an empty slot or choose a different technician.
            </span>
            <Button
              size="sm"
              variant="ghost"
              className="ml-4 shrink-0"
              onClick={() => setConflict(null)}
            >
              Dismiss
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* ── Week strip ────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0"
          onClick={() => setWeekAnchor((w) => subWeeks(w, 1))}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>

        {weekDays.map((day) => {
          const count = dayJobCount(day);
          const isSelected = isSameDay(day, selectedDate);
          const isToday = isSameDay(day, new Date());
          return (
            <button
              key={day.toISOString()}
              onClick={() => {
                setSelectedDate(day);
                setWeekAnchor(day);
              }}
              className={cn(
                "flex flex-col items-center px-3 py-1.5 rounded-lg text-xs transition-colors shrink-0",
                isSelected
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted text-muted-foreground",
                isToday && !isSelected && "ring-1 ring-primary/60"
              )}
            >
              <span className="font-medium">{format(day, "EEE")}</span>
              <span className="text-base font-bold leading-snug">
                {format(day, "d")}
              </span>
              {count > 0 ? (
                <Badge
                  variant={isSelected ? "secondary" : "default"}
                  className="h-4 min-w-[16px] px-1 text-[10px] mt-0.5"
                >
                  {count}
                </Badge>
              ) : (
                <span className="h-4 mt-0.5" />
              )}
            </button>
          );
        })}

        <Button
          variant="ghost"
          size="icon"
          className="shrink-0"
          onClick={() => setWeekAnchor((w) => addWeeks(w, 1))}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="ml-2 shrink-0"
          onClick={() => {
            const today = new Date();
            setSelectedDate(today);
            setWeekAnchor(today);
          }}
        >
          Today
        </Button>
      </div>

      {/* ── Calendar grid ─────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto border rounded-lg bg-card min-h-0">
        {/* min-width ensures horizontal scroll when many techs */}
        <div
          className="flex flex-col"
          style={{ minWidth: columns.length * 160 + TIME_GUTTER_W }}
        >
          {/* Sticky column headers */}
          <div className="flex sticky top-0 z-20 bg-card border-b">
            {/* Corner */}
            <div
              className="sticky left-0 z-30 bg-card border-r shrink-0"
              style={{ width: TIME_GUTTER_W }}
            />
            {columns.map((col) => {
              const count = jobsByTech(col.id).length;
              return (
                <div
                  key={col.id ?? "__unassigned__"}
                  className="flex-1 min-w-[160px] border-r px-2 py-2 flex flex-col items-center justify-center gap-0.5"
                >
                  <span className="text-xs font-semibold truncate max-w-full text-center">
                    {col.name}
                  </span>
                  {count > 0 && (
                    <Badge variant="secondary" className="text-[10px] h-4 px-1">
                      {count} job{count !== 1 ? "s" : ""}
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>

          {/* Grid body */}
          <div className="flex">
            {/* Time gutter */}
            <div
              className="sticky left-0 z-10 bg-card border-r shrink-0"
              style={{ width: TIME_GUTTER_W, height: GRID_HEIGHT }}
            >
              {hours.map((h) => (
                <div
                  key={h}
                  style={{ height: HOUR_HEIGHT }}
                  className="flex items-start justify-end pr-2 pt-1"
                >
                  <span className="text-[11px] text-muted-foreground">
                    {format(new Date(2000, 0, 1, h), "h a")}
                  </span>
                </div>
              ))}
            </div>

            {/* Tech columns */}
            {columns.map((col) => {
              const colKey = col.id ?? "__unassigned__";
              const isDragTarget = dragOverTech === colKey;
              return (
                <div
                  key={colKey}
                  className={cn(
                    "flex-1 min-w-[160px] relative border-r cursor-pointer transition-colors",
                    isDragTarget && "bg-primary/5"
                  )}
                  style={{ height: GRID_HEIGHT }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                    setDragOverTech(colKey);
                  }}
                  onDragLeave={() => setDragOverTech(null)}
                  onDrop={(e) => handleDrop(e, col.id)}
                  onClick={(e) => handleColumnClick(e, col.id)}
                >
                  {/* Hour lines */}
                  {hours.map((h, i) => (
                    <div
                      key={h}
                      style={{ top: i * HOUR_HEIGHT }}
                      className="absolute left-0 right-0 border-t border-border/30 pointer-events-none"
                    />
                  ))}
                  {/* Half-hour lines */}
                  {hours.map((h, i) => (
                    <div
                      key={`${h}-half`}
                      style={{ top: i * HOUR_HEIGHT + HOUR_HEIGHT / 2 }}
                      className="absolute left-0 right-0 border-t border-border/10 pointer-events-none"
                    />
                  ))}

                  {/* Job cards */}
                  {jobsByTech(col.id).map((job) => renderJobCard(job))}

                  {/* Drop hint when dragging over */}
                  {isDragTarget && (
                    <div className="absolute inset-0 border-2 border-dashed border-primary/40 rounded pointer-events-none" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Create Job Dialog ─────────────────────────────────────────── */}
      <Dialog
        open={createDialog.open}
        onOpenChange={(open) => setCreateDialog((p) => ({ ...p, open }))}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Schedule New Job</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 pt-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Date</Label>
                <Input
                  value={format(selectedDate, "MMM d, yyyy")}
                  readOnly
                  className="bg-muted"
                />
              </div>
              <div className="space-y-1">
                <Label>Start Time</Label>
                <Input
                  type="time"
                  value={createDialog.timeStart}
                  onChange={(e) =>
                    setCreateDialog((p) => ({ ...p, timeStart: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Customer Name *</Label>
              <Input
                placeholder="John Smith"
                value={form.customerName}
                onChange={(e) =>
                  setForm((p) => ({ ...p, customerName: e.target.value }))
                }
              />
            </div>

            <div className="space-y-1">
              <Label>Phone *</Label>
              <Input
                placeholder="(312) 555-0100"
                value={form.customerPhone}
                onChange={(e) =>
                  setForm((p) => ({ ...p, customerPhone: e.target.value }))
                }
              />
            </div>

            <div className="space-y-1">
              <Label>Address *</Label>
              <Input
                placeholder="123 Main St, Chicago, IL"
                value={form.address}
                onChange={(e) =>
                  setForm((p) => ({ ...p, address: e.target.value }))
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Service Type</Label>
                <Select
                  value={form.serviceType}
                  onValueChange={(v) =>
                    setForm((p) => ({ ...p, serviceType: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {serviceTypes.map((st) => (
                      <SelectItem key={st} value={st}>
                        {st}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>Duration (min)</Label>
                <Input
                  type="number"
                  min={15}
                  step={15}
                  value={form.estimatedDuration}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      estimatedDuration: Math.max(15, Number(e.target.value)),
                    }))
                  }
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Assign Technician</Label>
              <Select
                value={createDialog.technicianId ?? "unassigned"}
                onValueChange={(v) =>
                  setCreateDialog((p) => ({
                    ...p,
                    technicianId: v === "unassigned" ? null : v,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {technicians.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateDialog((p) => ({ ...p, open: false }))}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateSubmit}
              disabled={createJobMutation.isPending}
            >
              {createJobMutation.isPending ? "Creating…" : "Create Job"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

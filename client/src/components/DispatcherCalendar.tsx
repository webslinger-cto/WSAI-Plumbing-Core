import { useState, useRef, useCallback, useMemo } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { useToast } from "@/hooks/use-toast";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  User,
  Wrench,
  Plus,
  Calendar as CalendarIcon,
  LayoutGrid,
  List,
  Columns3,
} from "lucide-react";
import type { Job, Technician } from "@shared/schema";
import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  addDays,
  addWeeks,
  addMonths,
  subDays,
  subWeeks,
  subMonths,
  isSameDay,
  isSameMonth,
  isToday,
  startOfDay,
  differenceInMinutes,
  setHours,
  setMinutes,
  parseISO,
  eachDayOfInterval,
  getDay,
} from "date-fns";

const HOURS = Array.from({ length: 16 }, (_, i) => i + 6);
const HOUR_HEIGHT = 64;
const SLOT_MINUTES = 30;

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500/80 border-yellow-600 text-white",
  assigned: "bg-blue-500/80 border-blue-600 text-white",
  confirmed: "bg-emerald-500/80 border-emerald-600 text-white",
  en_route: "bg-amber-500/80 border-amber-600 text-white",
  on_site: "bg-purple-500/80 border-purple-600 text-white",
  in_progress: "bg-primary/80 border-primary text-primary-foreground",
  completed: "bg-green-600/80 border-green-700 text-white",
  cancelled: "bg-muted border-muted-foreground/30 text-muted-foreground line-through",
};

const priorityDots: Record<string, string> = {
  urgent: "bg-red-500",
  high: "bg-amber-500",
  normal: "bg-blue-400",
  low: "bg-muted-foreground",
};

interface CalendarEvent {
  job: Job;
  start: Date;
  end: Date;
  title: string;
}

function parseJobToEvent(job: Job): CalendarEvent | null {
  if (!job.scheduledDate) return null;
  const date = new Date(job.scheduledDate);
  let startH = 9, startM = 0, endH = 10, endM = 0;
  if (job.scheduledTimeStart) {
    const [h, m] = job.scheduledTimeStart.split(":").map(Number);
    startH = h; startM = m || 0;
  }
  if (job.scheduledTimeEnd) {
    const [h, m] = job.scheduledTimeEnd.split(":").map(Number);
    endH = h; endM = m || 0;
  } else {
    endH = startH + 1; endM = startM;
  }
  const start = setMinutes(setHours(startOfDay(date), startH), startM);
  const end = setMinutes(setHours(startOfDay(date), endH), endM);
  return {
    job,
    start,
    end,
    title: `${job.customerName} - ${job.serviceType || "Service"}`,
  };
}

type CalendarView = "day" | "week" | "month";

interface DispatcherCalendarProps {
  jobs: Job[];
  technicians: Technician[];
  userId?: string;
}

export default function DispatcherCalendar({ jobs, technicians, userId }: DispatcherCalendarProps) {
  const { toast } = useToast();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<CalendarView>("week");
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [createSlot, setCreateSlot] = useState<{ date: Date; hour: number; minute: number } | null>(null);

  const [formData, setFormData] = useState({
    customerName: "",
    customerPhone: "",
    address: "",
    city: "Chicago",
    serviceType: "",
    description: "",
    priority: "normal",
    scheduledDate: "",
    scheduledTimeStart: "09:00",
    scheduledTimeEnd: "10:00",
    assignedTechnicianId: "",
    status: "pending",
  });

  const events = useMemo(() => {
    return jobs
      .map(parseJobToEvent)
      .filter((e): e is CalendarEvent => e !== null);
  }, [jobs]);

  const updateJobMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      return apiRequest("PATCH", `/api/jobs/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      setEventDialogOpen(false);
      setEditingJob(null);
      toast({ title: "Job Updated", description: "Schedule has been updated." });
    },
    onError: () => {
      toast({ title: "Update Failed", description: "Could not update the job.", variant: "destructive" });
    },
  });

  const createJobMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      return apiRequest("POST", "/api/jobs", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      setEventDialogOpen(false);
      setCreateSlot(null);
      toast({ title: "Job Created", description: "New job added to the calendar." });
    },
    onError: () => {
      toast({ title: "Create Failed", description: "Could not create the job.", variant: "destructive" });
    },
  });

  const openCreateDialog = useCallback((date: Date, hour: number, minute: number = 0) => {
    setEditingJob(null);
    setCreateSlot({ date, hour, minute });
    const dateStr = format(date, "yyyy-MM-dd");
    const startTime = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
    const endHour = hour + 1;
    const endTime = `${String(endHour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
    setFormData({
      customerName: "",
      customerPhone: "",
      address: "",
      city: "Chicago",
      serviceType: "",
      description: "",
      priority: "normal",
      scheduledDate: dateStr,
      scheduledTimeStart: startTime,
      scheduledTimeEnd: endTime,
      assignedTechnicianId: "",
      status: "pending",
    });
    setEventDialogOpen(true);
  }, []);

  const openEditDialog = useCallback((job: Job) => {
    setCreateSlot(null);
    setEditingJob(job);
    setFormData({
      customerName: job.customerName || "",
      customerPhone: job.customerPhone || "",
      address: job.address || "",
      city: job.city || "Chicago",
      serviceType: job.serviceType || "",
      description: job.description || "",
      priority: job.priority || "normal",
      scheduledDate: job.scheduledDate ? format(new Date(job.scheduledDate), "yyyy-MM-dd") : "",
      scheduledTimeStart: job.scheduledTimeStart || "09:00",
      scheduledTimeEnd: job.scheduledTimeEnd || "10:00",
      assignedTechnicianId: job.assignedTechnicianId || "",
      status: job.status || "pending",
    });
    setEventDialogOpen(true);
  }, []);

  const handleSave = useCallback(() => {
    if (!formData.customerName || !formData.scheduledDate) {
      toast({ title: "Missing Fields", description: "Customer name and date are required.", variant: "destructive" });
      return;
    }
    const techId = formData.assignedTechnicianId && formData.assignedTechnicianId !== "none"
      ? formData.assignedTechnicianId
      : null;
    const payload: Record<string, unknown> = {
      customerName: formData.customerName,
      customerPhone: formData.customerPhone,
      address: formData.address,
      city: formData.city,
      serviceType: formData.serviceType,
      description: formData.description,
      priority: formData.priority,
      scheduledDate: new Date(formData.scheduledDate + "T00:00:00").toISOString(),
      scheduledTimeStart: formData.scheduledTimeStart,
      scheduledTimeEnd: formData.scheduledTimeEnd,
      status: formData.status,
      assignedTechnicianId: techId,
    };
    if (editingJob) {
      updateJobMutation.mutate({ id: editingJob.id, data: payload });
    } else {
      createJobMutation.mutate(payload);
    }
  }, [formData, editingJob, updateJobMutation, createJobMutation, toast]);

  const navigatePrev = () => {
    if (view === "day") setCurrentDate(d => subDays(d, 1));
    else if (view === "week") setCurrentDate(d => subWeeks(d, 1));
    else setCurrentDate(d => subMonths(d, 1));
  };
  const navigateNext = () => {
    if (view === "day") setCurrentDate(d => addDays(d, 1));
    else if (view === "week") setCurrentDate(d => addWeeks(d, 1));
    else setCurrentDate(d => addMonths(d, 1));
  };
  const goToToday = () => setCurrentDate(new Date());

  const headerLabel = useMemo(() => {
    if (view === "day") return format(currentDate, "EEEE, MMMM d, yyyy");
    if (view === "week") {
      const start = startOfWeek(currentDate, { weekStartsOn: 0 });
      const end = endOfWeek(currentDate, { weekStartsOn: 0 });
      if (start.getMonth() === end.getMonth()) {
        return `${format(start, "MMMM d")} - ${format(end, "d, yyyy")}`;
      }
      return `${format(start, "MMM d")} - ${format(end, "MMM d, yyyy")}`;
    }
    return format(currentDate, "MMMM yyyy");
  }, [currentDate, view]);

  return (
    <div className="flex flex-col h-full" data-testid="dispatcher-calendar">
      <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={navigatePrev} data-testid="button-cal-prev">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={navigateNext} data-testid="button-cal-next">
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button variant="outline" onClick={goToToday} data-testid="button-cal-today">
            Today
          </Button>
          <h2 className="text-lg font-semibold ml-2" data-testid="text-cal-header">{headerLabel}</h2>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border">
            <Button
              variant={view === "day" ? "default" : "ghost"}
              size="sm"
              onClick={() => setView("day")}
              className="rounded-r-none"
              data-testid="button-cal-view-day"
            >
              <CalendarIcon className="w-4 h-4 mr-1" />
              Day
            </Button>
            <Button
              variant={view === "week" ? "default" : "ghost"}
              size="sm"
              onClick={() => setView("week")}
              className="rounded-none border-x"
              data-testid="button-cal-view-week"
            >
              <Columns3 className="w-4 h-4 mr-1" />
              Week
            </Button>
            <Button
              variant={view === "month" ? "default" : "ghost"}
              size="sm"
              onClick={() => setView("month")}
              className="rounded-l-none"
              data-testid="button-cal-view-month"
            >
              <LayoutGrid className="w-4 h-4 mr-1" />
              Month
            </Button>
          </div>
          <Button onClick={() => openCreateDialog(currentDate, 9)} data-testid="button-cal-new-job">
            <Plus className="w-4 h-4 mr-2" />
            New Job
          </Button>
        </div>
      </div>

      {view === "month" ? (
        <MonthView
          currentDate={currentDate}
          events={events}
          onClickDate={(d) => { setCurrentDate(d); setView("day"); }}
          onClickEvent={openEditDialog}
        />
      ) : (
        <TimeGridView
          currentDate={currentDate}
          view={view}
          events={events}
          onClickSlot={openCreateDialog}
          onClickEvent={openEditDialog}
          onDropEvent={(jobId, newDate, newStartTime, newEndTime) => {
            updateJobMutation.mutate({
              id: jobId,
              data: {
                scheduledDate: newDate.toISOString(),
                scheduledTimeStart: newStartTime,
                scheduledTimeEnd: newEndTime,
              },
            });
          }}
          technicians={technicians}
        />
      )}

      <EventDialog
        open={eventDialogOpen}
        onOpenChange={setEventDialogOpen}
        formData={formData}
        setFormData={setFormData}
        onSave={handleSave}
        isEditing={!!editingJob}
        isPending={updateJobMutation.isPending || createJobMutation.isPending}
        technicians={technicians}
        editingJob={editingJob}
      />
    </div>
  );
}

function TimeGridView({
  currentDate,
  view,
  events,
  onClickSlot,
  onClickEvent,
  onDropEvent,
  technicians,
}: {
  currentDate: Date;
  view: "day" | "week";
  events: CalendarEvent[];
  onClickSlot: (date: Date, hour: number, minute?: number) => void;
  onClickEvent: (job: Job) => void;
  onDropEvent: (jobId: string, newDate: Date, startTime: string, endTime: string) => void;
  technicians: Technician[];
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [dragState, setDragState] = useState<{
    jobId: string;
    origEvent: CalendarEvent;
    currentDayOffset: number;
    currentMinuteOffset: number;
  } | null>(null);

  const days = useMemo(() => {
    if (view === "day") return [startOfDay(currentDate)];
    const start = startOfWeek(currentDate, { weekStartsOn: 0 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [currentDate, view]);

  const eventsForDay = useCallback((day: Date) => {
    return events.filter(e => isSameDay(e.start, day));
  }, [events]);

  const getEventPosition = useCallback((event: CalendarEvent) => {
    const startMinutes = event.start.getHours() * 60 + event.start.getMinutes();
    const endMinutes = event.end.getHours() * 60 + event.end.getMinutes();
    const topOffset = startMinutes - 6 * 60;
    const duration = Math.max(endMinutes - startMinutes, 30);
    return {
      top: (topOffset / 60) * HOUR_HEIGHT,
      height: (duration / 60) * HOUR_HEIGHT,
    };
  }, []);

  const handleSlotClick = useCallback((day: Date, hour: number, e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const relY = e.clientY - rect.top;
    const minute = relY > rect.height / 2 ? 30 : 0;
    onClickSlot(day, hour, minute);
  }, [onClickSlot]);

  const handleDragStart = useCallback((e: React.DragEvent, event: CalendarEvent) => {
    e.dataTransfer.setData("text/plain", event.job.id);
    e.dataTransfer.effectAllowed = "move";
    setDragState({
      jobId: event.job.id,
      origEvent: event,
      currentDayOffset: 0,
      currentMinuteOffset: 0,
    });
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, day: Date, hour: number) => {
    e.preventDefault();
    const jobId = e.dataTransfer.getData("text/plain");
    if (!jobId || !dragState) return;
    const origEvent = dragState.origEvent;
    const durationMins = differenceInMinutes(origEvent.end, origEvent.start);
    const rect = e.currentTarget.getBoundingClientRect();
    const relY = e.clientY - rect.top;
    const minute = relY > rect.height / 2 ? 30 : 0;
    const startTime = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
    const endTotalMin = hour * 60 + minute + durationMins;
    const endH = Math.floor(endTotalMin / 60);
    const endM = endTotalMin % 60;
    const endTime = `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
    onDropEvent(jobId, startOfDay(day), startTime, endTime);
    setDragState(null);
  }, [dragState, onDropEvent]);

  const getTechName = useCallback((id: string | null | undefined) => {
    if (!id) return null;
    const tech = technicians.find(t => t.id === id);
    return tech ? tech.fullName : null;
  }, [technicians]);

  return (
    <div className="flex-1 border rounded-md overflow-hidden flex flex-col min-h-0">
      <div className="flex border-b bg-muted/30 sticky top-0 z-10">
        <div className="w-16 shrink-0 border-r" />
        {days.map(day => (
          <div
            key={day.toISOString()}
            className={`flex-1 text-center py-2 border-r last:border-r-0 ${
              isToday(day) ? "bg-primary/10" : ""
            }`}
          >
            <div className="text-xs text-muted-foreground uppercase">{format(day, "EEE")}</div>
            <div className={`text-lg font-semibold ${isToday(day) ? "text-primary" : ""}`}>
              {format(day, "d")}
            </div>
          </div>
        ))}
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="flex relative" style={{ minHeight: HOURS.length * HOUR_HEIGHT }}>
          <div className="w-16 shrink-0 border-r">
            {HOURS.map(hour => (
              <div
                key={hour}
                className="border-b text-xs text-muted-foreground flex items-start justify-end pr-2 pt-1"
                style={{ height: HOUR_HEIGHT }}
              >
                {format(setHours(new Date(), hour), "h a")}
              </div>
            ))}
          </div>
          {days.map(day => {
            const dayEvents = eventsForDay(day);
            return (
              <div key={day.toISOString()} className="flex-1 relative border-r last:border-r-0">
                {HOURS.map(hour => (
                  <div
                    key={hour}
                    className="border-b hover-elevate cursor-pointer"
                    style={{ height: HOUR_HEIGHT }}
                    onClick={(e) => handleSlotClick(day, hour, e)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, day, hour)}
                    data-testid={`slot-${format(day, "yyyy-MM-dd")}-${hour}`}
                  >
                    <div className="border-b border-dashed border-muted-foreground/10" style={{ height: HOUR_HEIGHT / 2 }} />
                  </div>
                ))}
                {dayEvents.map(event => {
                  const pos = getEventPosition(event);
                  const techName = getTechName(event.job.assignedTechnicianId);
                  const statusClass = statusColors[event.job.status] || statusColors.pending;
                  const priorityDot = priorityDots[event.job.priority || "normal"];
                  return (
                    <div
                      key={event.job.id}
                      className={`absolute left-0.5 right-0.5 rounded-md border px-1.5 py-0.5 cursor-pointer overflow-hidden transition-shadow hover:shadow-md hover:z-20 ${statusClass}`}
                      style={{ top: pos.top, height: Math.max(pos.height, 24), zIndex: 10 }}
                      draggable
                      onDragStart={(e) => handleDragStart(e, event)}
                      onClick={(e) => { e.stopPropagation(); onClickEvent(event.job); }}
                      data-testid={`event-${event.job.id}`}
                    >
                      <div className="flex items-center gap-1 min-w-0">
                        {priorityDot && <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${priorityDot}`} />}
                        <span className="text-xs font-medium truncate">{event.job.customerName}</span>
                      </div>
                      {pos.height >= 40 && (
                        <div className="text-[10px] opacity-80 truncate flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3 shrink-0" />
                          {event.job.scheduledTimeStart}
                          {event.job.scheduledTimeEnd && ` - ${event.job.scheduledTimeEnd}`}
                        </div>
                      )}
                      {pos.height >= 56 && event.job.serviceType && (
                        <div className="text-[10px] opacity-80 truncate flex items-center gap-1">
                          <Wrench className="w-3 h-3 shrink-0" />
                          {event.job.serviceType}
                        </div>
                      )}
                      {pos.height >= 72 && techName && (
                        <div className="text-[10px] opacity-80 truncate flex items-center gap-1">
                          <User className="w-3 h-3 shrink-0" />
                          {techName}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function MonthView({
  currentDate,
  events,
  onClickDate,
  onClickEvent,
}: {
  currentDate: Date;
  events: CalendarEvent[];
  onClickDate: (d: Date) => void;
  onClickEvent: (job: Job) => void;
}) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const allDays = eachDayOfInterval({ start: calStart, end: calEnd });
  const weeks: Date[][] = [];
  for (let i = 0; i < allDays.length; i += 7) {
    weeks.push(allDays.slice(i, i + 7));
  }

  const eventsForDay = (day: Date) => events.filter(e => isSameDay(e.start, day));

  return (
    <div className="flex-1 border rounded-md overflow-hidden flex flex-col">
      <div className="grid grid-cols-7 border-b bg-muted/30">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
          <div key={d} className="text-center py-2 text-xs font-medium text-muted-foreground uppercase border-r last:border-r-0">{d}</div>
        ))}
      </div>
      <div className="flex-1 grid" style={{ gridTemplateRows: `repeat(${weeks.length}, 1fr)` }}>
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 border-b last:border-b-0">
            {week.map(day => {
              const dayEvents = eventsForDay(day);
              const inMonth = isSameMonth(day, currentDate);
              return (
                <div
                  key={day.toISOString()}
                  className={`border-r last:border-r-0 p-1 min-h-[80px] cursor-pointer hover-elevate ${
                    !inMonth ? "bg-muted/20 text-muted-foreground" : ""
                  } ${isToday(day) ? "bg-primary/5" : ""}`}
                  onClick={() => onClickDate(day)}
                  data-testid={`month-cell-${format(day, "yyyy-MM-dd")}`}
                >
                  <div className={`text-sm font-medium mb-1 ${isToday(day) ? "text-primary font-bold" : ""}`}>
                    {format(day, "d")}
                  </div>
                  <div className="space-y-0.5">
                    {dayEvents.slice(0, 3).map(ev => (
                      <div
                        key={ev.job.id}
                        className={`text-[10px] px-1 py-0.5 rounded truncate cursor-pointer ${statusColors[ev.job.status] || statusColors.pending}`}
                        onClick={(e) => { e.stopPropagation(); onClickEvent(ev.job); }}
                        data-testid={`month-event-${ev.job.id}`}
                      >
                        {ev.job.scheduledTimeStart && <span className="mr-1">{ev.job.scheduledTimeStart}</span>}
                        {ev.job.customerName}
                      </div>
                    ))}
                    {dayEvents.length > 3 && (
                      <div className="text-[10px] text-muted-foreground pl-1">+{dayEvents.length - 3} more</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function EventDialog({
  open,
  onOpenChange,
  formData,
  setFormData,
  onSave,
  isEditing,
  isPending,
  technicians,
  editingJob,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  formData: {
    customerName: string;
    customerPhone: string;
    address: string;
    city: string;
    serviceType: string;
    description: string;
    priority: string;
    scheduledDate: string;
    scheduledTimeStart: string;
    scheduledTimeEnd: string;
    assignedTechnicianId: string;
    status: string;
  };
  setFormData: React.Dispatch<React.SetStateAction<typeof formData>>;
  onSave: () => void;
  isEditing: boolean;
  isPending: boolean;
  technicians: Technician[];
  editingJob: Job | null;
}) {
  const update = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg w-[95vw] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle data-testid="text-event-dialog-title">
            {isEditing ? "Edit Job" : "Schedule New Job"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="cal-customer-name">Customer Name</Label>
              <Input
                id="cal-customer-name"
                value={formData.customerName}
                onChange={e => update("customerName", e.target.value)}
                placeholder="Customer name"
                data-testid="input-cal-customer-name"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cal-customer-phone">Phone</Label>
              <Input
                id="cal-customer-phone"
                value={formData.customerPhone}
                onChange={e => update("customerPhone", e.target.value)}
                placeholder="(312) 555-0000"
                data-testid="input-cal-customer-phone"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5 col-span-2">
              <Label htmlFor="cal-address">Address</Label>
              <Input
                id="cal-address"
                value={formData.address}
                onChange={e => update("address", e.target.value)}
                placeholder="Street address"
                data-testid="input-cal-address"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cal-city">City</Label>
              <Input
                id="cal-city"
                value={formData.city}
                onChange={e => update("city", e.target.value)}
                data-testid="input-cal-city"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="cal-service">Service Type</Label>
              <Select value={formData.serviceType} onValueChange={v => update("serviceType", v)}>
                <SelectTrigger data-testid="select-cal-service">
                  <SelectValue placeholder="Select service" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Sewer Line Repair">Sewer Line Repair</SelectItem>
                  <SelectItem value="Sewer Line Replacement">Sewer Line Replacement</SelectItem>
                  <SelectItem value="Drain Cleaning">Drain Cleaning</SelectItem>
                  <SelectItem value="Camera Inspection">Camera Inspection</SelectItem>
                  <SelectItem value="Hydro Jetting">Hydro Jetting</SelectItem>
                  <SelectItem value="Emergency Service">Emergency Service</SelectItem>
                  <SelectItem value="Trenchless Repair">Trenchless Repair</SelectItem>
                  <SelectItem value="Excavation">Excavation</SelectItem>
                  <SelectItem value="Water Line">Water Line</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cal-priority">Priority</Label>
              <Select value={formData.priority} onValueChange={v => update("priority", v)}>
                <SelectTrigger data-testid="select-cal-priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="cal-date">Date</Label>
              <Input
                id="cal-date"
                type="date"
                value={formData.scheduledDate}
                onChange={e => update("scheduledDate", e.target.value)}
                data-testid="input-cal-date"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cal-start">Start Time</Label>
              <Input
                id="cal-start"
                type="time"
                value={formData.scheduledTimeStart}
                onChange={e => update("scheduledTimeStart", e.target.value)}
                data-testid="input-cal-start-time"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cal-end">End Time</Label>
              <Input
                id="cal-end"
                type="time"
                value={formData.scheduledTimeEnd}
                onChange={e => update("scheduledTimeEnd", e.target.value)}
                data-testid="input-cal-end-time"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="cal-technician">Assign Technician</Label>
              <Select value={formData.assignedTechnicianId} onValueChange={v => update("assignedTechnicianId", v)}>
                <SelectTrigger data-testid="select-cal-technician">
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {technicians.map(tech => (
                    <SelectItem key={tech.id} value={tech.id}>{tech.fullName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {isEditing && (
              <div className="space-y-1.5">
                <Label htmlFor="cal-status">Status</Label>
                <Select value={formData.status} onValueChange={v => update("status", v)}>
                  <SelectTrigger data-testid="select-cal-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="assigned">Assigned</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="en_route">En Route</SelectItem>
                    <SelectItem value="on_site">On Site</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cal-notes">Notes</Label>
            <Textarea
              id="cal-notes"
              value={formData.description}
              onChange={e => update("description", e.target.value)}
              placeholder="Job notes or description..."
              rows={3}
              data-testid="input-cal-notes"
            />
          </div>
        </div>
        <DialogFooter className="gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cal-cancel">
            Cancel
          </Button>
          <Button onClick={onSave} disabled={isPending} data-testid="button-cal-save">
            {isPending ? "Saving..." : isEditing ? "Update Job" : "Create Job"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
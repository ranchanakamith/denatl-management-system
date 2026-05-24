import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Stethoscope,
  LogOut,
  Plus,
  Trash2,
  Clock,
  CalendarDays,
  User,
  Phone,
  FileText,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  RefreshCw,
  MoveRight,
} from "lucide-react";
import { format, addDays, subDays } from "date-fns";

function getLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

type SlotStatus = "available" | "booked" | "completed" | "cancelled";

const statusColors: Record<SlotStatus, string> = {
  available: "bg-emerald-50 text-emerald-700 border-emerald-200",
  booked: "bg-amber-50 text-amber-700 border-amber-200",
  completed: "bg-slate-50 text-slate-600 border-slate-200",
  cancelled: "bg-red-50 text-red-700 border-red-200",
};

const statusLabels: Record<SlotStatus, string> = {
  available: "Available",
  booked: "Booked",
  completed: "Completed",
  cancelled: "Cancelled",
};

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [slotToDelete, setSlotToDelete] = useState<number | null>(null);
  const [bookingSlot, setBookingSlot] = useState<number | null>(null);
  const [shiftSlot, setShiftSlot] = useState<number | null>(null);

  // Form states
  const [newStartTime, setNewStartTime] = useState("09:00");
  const [newEndTime, setNewEndTime] = useState("09:30");
  const [patientName, setPatientName] = useState("");
  const [patientPhone, setPatientPhone] = useState("");
  const [patientNotes, setPatientNotes] = useState("");
  const [shiftStartTime, setShiftStartTime] = useState("");
  const [shiftEndTime, setShiftEndTime] = useState("");

  const dateStr = getLocalDateString(selectedDate);

  const utils = trpc.useUtils();

  const { data: slots = [], isLoading } = trpc.slot.list.useQuery({ date: dateStr });
  const { data: nextDailyNumber = 1 } = trpc.slot.getNextDailyNumber.useQuery({ date: dateStr });

  const createSlot = trpc.slot.create.useMutation({
    onSuccess: () => {
      utils.slot.list.invalidate({ date: dateStr });
      utils.slot.getNextDailyNumber.invalidate({ date: dateStr });
      setIsAddDialogOpen(false);
      setNewStartTime("09:00");
      setNewEndTime("09:30");
    },
  });

  const deleteSlot = trpc.slot.delete.useMutation({
    onSuccess: () => {
      utils.slot.list.invalidate({ date: dateStr });
      utils.slot.getNextDailyNumber.invalidate({ date: dateStr });
      setSlotToDelete(null);
    },
  });

  const bookSlot = trpc.slot.book.useMutation({
    onSuccess: () => {
      utils.slot.list.invalidate({ date: dateStr });
      utils.slot.getNextDailyNumber.invalidate({ date: dateStr });
      setBookingSlot(null);
      setPatientName("");
      setPatientPhone("");
      setPatientNotes("");
    },
  });

  const updateStatus = trpc.slot.updateStatus.useMutation({
    onSuccess: () => {
      utils.slot.list.invalidate({ date: dateStr });
    },
  });

  const shiftSlotMutation = trpc.slot.shift.useMutation({
    onSuccess: () => {
      utils.slot.list.invalidate({ date: dateStr });
      setShiftSlot(null);
      setShiftStartTime("");
      setShiftEndTime("");
    },
  });

  const bookedSlots = slots
    .filter((s) => s.status === "booked" || s.status === "completed")
    .sort((a, b) => (a.dailyNumber ?? 0) - (b.dailyNumber ?? 0));

  const currentPatient = bookedSlots.find((s) => s.status === "booked");
  const completedPatients = bookedSlots.filter((s) => s.status === "completed");
  const nextPatients = bookedSlots.filter(
    (s) => s.status === "booked" && s.id !== currentPatient?.id
  );

  const handleAddSlot = () => {
    createSlot.mutate({
      slotDate: dateStr,
      startTime: newStartTime,
      endTime: newEndTime,
    });
  };

  const handleBookSlot = (slotId: number) => {
    if (!patientName.trim()) return;
    bookSlot.mutate({
      id: slotId,
      patientName: patientName.trim(),
      patientPhone: patientPhone.trim() || undefined,
      notes: patientNotes.trim() || undefined,
      dailyNumber: nextDailyNumber,
    });
  };

  const handleShiftSlot = (slotId: number) => {
    if (!shiftStartTime || !shiftEndTime) return;
    shiftSlotMutation.mutate({
      id: slotId,
      newStartTime: shiftStartTime,
      newEndTime: shiftEndTime,
    });
  };

  const generateTimeOptions = () => {
    const times: string[] = [];
    for (let h = 8; h <= 20; h++) {
      for (let m = 0; m < 60; m += 15) {
        const hour = String(h).padStart(2, "0");
        const minute = String(m).padStart(2, "0");
        times.push(`${hour}:${minute}`);
      }
    }
    return times;
  };

  const timeOptions = generateTimeOptions();

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-teal-50 flex items-center justify-center">
              <Stethoscope className="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-slate-800">Dental Clinic Manager</h1>
              <p className="text-xs text-slate-500">Welcome, Dr. {user?.name || "Dentist"}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={logout}
            className="text-slate-500 hover:text-slate-700"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Date Navigation */}
        <div className="flex items-center justify-between bg-white rounded-lg p-4 shadow-sm border border-slate-200">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedDate(subDays(selectedDate, 1))}
          >
            Previous
          </Button>
          <div className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-teal-600" />
            <span className="font-medium text-slate-700">
              {format(selectedDate, "EEEE, MMMM d, yyyy")}
            </span>
            <Input
              type="date"
              value={dateStr}
              onChange={(e) => setSelectedDate(new Date(e.target.value))}
              className="w-40 ml-2"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedDate(addDays(selectedDate, 1))}
          >
            Next
          </Button>
        </div>

        {/* Now Serving & Queue Status */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Currently Serving */}
          <Card className="md:col-span-1 border-teal-200 bg-gradient-to-br from-teal-50 to-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-teal-700 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Now Serving
              </CardTitle>
            </CardHeader>
            <CardContent>
              {currentPatient ? (
                <div className="space-y-3">
                  <div className="text-center">
                    <span className="text-5xl font-bold text-teal-700">
                      #{currentPatient.dailyNumber}
                    </span>
                  </div>
                  <div className="space-y-1 text-center">
                    <p className="font-medium text-slate-800">{currentPatient.patientName}</p>
                    <p className="text-sm text-slate-500 flex items-center justify-center gap-1">
                      <Clock className="w-3 h-3" />
                      {currentPatient.startTime} - {currentPatient.endTime}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    className="w-full bg-teal-600 hover:bg-teal-700"
                    onClick={() =>
                      updateStatus.mutate({ id: currentPatient.id, status: "completed" })
                    }
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1" />
                    Mark Complete
                  </Button>
                </div>
              ) : (
                <div className="text-center py-6 text-slate-400">
                  <AlertCircle className="w-10 h-10 mx-auto mb-2" />
                  <p>No patient currently in session</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upcoming Patients */}
          <Card className="md:col-span-2 border-amber-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-amber-700 flex items-center gap-2">
                <ChevronRight className="w-4 h-4" />
                Upcoming Patients
                {nextPatients.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {nextPatients.length} waiting
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {nextPatients.length > 0 ? (
                <div className="space-y-3">
                  {nextPatients.slice(0, 3).map((patient, index) => (
                    <div
                      key={patient.id}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        index === 0
                          ? "bg-amber-50 border-amber-300"
                          : "bg-white border-slate-200"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`text-2xl font-bold ${
                            index === 0 ? "text-amber-700" : "text-slate-400"
                          }`}
                        >
                          #{patient.dailyNumber}
                        </span>
                        <div>
                          <p className="font-medium text-slate-800">{patient.patientName}</p>
                          <p className="text-xs text-slate-500">
                            {patient.startTime} - {patient.endTime}
                          </p>
                        </div>
                      </div>
                      {index === 0 && (
                        <Badge className="bg-amber-500 text-white animate-pulse">
                          You are next!
                        </Badge>
                      )}
                      {index === 1 && (
                        <Badge variant="outline" className="text-slate-500">
                          On deck
                        </Badge>
                      )}
                    </div>
                  ))}
                  {nextPatients.length > 3 && (
                    <p className="text-center text-sm text-slate-400">
                      +{nextPatients.length - 3} more patients
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-center py-6 text-slate-400">
                  <User className="w-10 h-10 mx-auto mb-2" />
                  <p>No upcoming patients</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Slot Management */}
        <Card className="border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <Clock className="w-5 h-5 text-teal-600" />
                Appointment Slots
              </CardTitle>
              <p className="text-sm text-slate-500 mt-1">
                Manage available and booked slots for {format(selectedDate, "MMM d, yyyy")}
              </p>
            </div>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-teal-600 hover:bg-teal-700">
                  <Plus className="w-4 h-4 mr-1" />
                  Add Slot
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Slot</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-1 block">
                        Start Time
                      </label>
                      <Select value={newStartTime} onValueChange={setNewStartTime}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {timeOptions.map((time) => (
                            <SelectItem key={time} value={time}>
                              {time}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-1 block">
                        End Time
                      </label>
                      <Select value={newEndTime} onValueChange={setNewEndTime}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {timeOptions.map((time) => (
                            <SelectItem key={time} value={time}>
                              {time}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button
                    className="w-full bg-teal-600 hover:bg-teal-700"
                    onClick={handleAddSlot}
                    disabled={createSlot.isPending}
                  >
                    {createSlot.isPending ? "Adding..." : "Add Slot"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-slate-400">Loading slots...</div>
            ) : slots.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <Clock className="w-10 h-10 mx-auto mb-2" />
                <p>No slots available for this date</p>
                <p className="text-sm mt-1">Click &quot;Add Slot&quot; to create one</p>
              </div>
            ) : (
              <div className="space-y-2">
                {slots
                  .sort((a, b) => a.startTime.localeCompare(b.startTime))
                  .map((slot) => (
                    <div
                      key={slot.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-white hover:shadow-sm transition-shadow"
                    >
                      <div className="flex items-center gap-4">
                        <div className="text-sm font-mono text-slate-600 min-w-[100px]">
                          {slot.startTime} - {slot.endTime}
                        </div>
                        <Badge variant="outline" className={statusColors[slot.status as SlotStatus]}>
                          {statusLabels[slot.status as SlotStatus]}
                        </Badge>
                        {slot.dailyNumber && (
                          <span className="text-sm font-bold text-teal-700">#{slot.dailyNumber}</span>
                        )}
                        {slot.patientName && (
                          <span className="text-sm text-slate-700 flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {slot.patientName}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        {/* Available slot actions */}
                        {slot.status === "available" && (
                          <>
                            <Dialog
                              open={bookingSlot === slot.id}
                              onOpenChange={(open) => {
                                if (!open) {
                                  setBookingSlot(null);
                                  setPatientName("");
                                  setPatientPhone("");
                                  setPatientNotes("");
                                }
                              }}
                            >
                              <DialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-teal-600 hover:text-teal-700 hover:bg-teal-50"
                                  onClick={() => setBookingSlot(slot.id)}
                                >
                                  <Plus className="w-4 h-4 mr-1" />
                                  Book
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Book Appointment</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4 pt-4">
                                  <div>
                                    <label className="text-sm font-medium text-slate-700 mb-1 block">
                                      Patient Name *
                                    </label>
                                    <Input
                                      placeholder="Enter patient name"
                                      value={patientName}
                                      onChange={(e) => setPatientName(e.target.value)}
                                    />
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium text-slate-700 mb-1 block">
                                      Phone Number
                                    </label>
                                    <div className="relative">
                                      <Phone className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                                      <Input
                                        className="pl-9"
                                        placeholder="Enter phone number"
                                        value={patientPhone}
                                        onChange={(e) => setPatientPhone(e.target.value)}
                                      />
                                    </div>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium text-slate-700 mb-1 block">
                                      Notes
                                    </label>
                                    <div className="relative">
                                      <FileText className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                                      <Input
                                        className="pl-9"
                                        placeholder="Any additional notes"
                                        value={patientNotes}
                                        onChange={(e) => setPatientNotes(e.target.value)}
                                      />
                                    </div>
                                  </div>
                                  <div className="bg-teal-50 p-3 rounded-lg">
                                    <p className="text-sm text-teal-700">
                                      Daily Number: <strong>#{nextDailyNumber}</strong>
                                    </p>
                                  </div>
                                  <Button
                                    className="w-full bg-teal-600 hover:bg-teal-700"
                                    onClick={() => handleBookSlot(slot.id)}
                                    disabled={!patientName.trim() || bookSlot.isPending}
                                  >
                                    {bookSlot.isPending ? "Booking..." : "Book Appointment"}
                                  </Button>
                                </div>
                              </DialogContent>
                            </Dialog>

                            <Dialog
                              open={shiftSlot === slot.id}
                              onOpenChange={(open) => {
                                if (!open) {
                                  setShiftSlot(null);
                                  setShiftStartTime("");
                                  setShiftEndTime("");
                                }
                              }}
                            >
                              <DialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                                  onClick={() => {
                                    setShiftSlot(slot.id);
                                    setShiftStartTime(slot.startTime);
                                    setShiftEndTime(slot.endTime);
                                  }}
                                >
                                  <MoveRight className="w-4 h-4 mr-1" />
                                  Shift
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Shift Slot Time</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4 pt-4">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <label className="text-sm font-medium text-slate-700 mb-1 block">
                                        New Start Time
                                      </label>
                                      <Select value={shiftStartTime} onValueChange={setShiftStartTime}>
                                        <SelectTrigger>
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {timeOptions.map((time) => (
                                            <SelectItem key={time} value={time}>
                                              {time}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <div>
                                      <label className="text-sm font-medium text-slate-700 mb-1 block">
                                        New End Time
                                      </label>
                                      <Select value={shiftEndTime} onValueChange={setShiftEndTime}>
                                        <SelectTrigger>
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {timeOptions.map((time) => (
                                            <SelectItem key={time} value={time}>
                                              {time}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  </div>
                                  <Button
                                    className="w-full bg-teal-600 hover:bg-teal-700"
                                    onClick={() => handleShiftSlot(slot.id)}
                                    disabled={shiftSlotMutation.isPending}
                                  >
                                    {shiftSlotMutation.isPending ? "Shifting..." : "Shift Slot"}
                                  </Button>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </>
                        )}

                        {/* Booked slot actions */}
                        {slot.status === "booked" && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                              onClick={() =>
                                updateStatus.mutate({ id: slot.id, status: "completed" })
                              }
                            >
                              <CheckCircle2 className="w-4 h-4 mr-1" />
                              Complete
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                              onClick={() =>
                                updateStatus.mutate({ id: slot.id, status: "available" })
                              }
                            >
                              <RefreshCw className="w-4 h-4 mr-1" />
                              Cancel
                            </Button>
                          </>
                        )}

                        {/* Delete slot */}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-slate-400 hover:text-red-600 hover:bg-red-50"
                          onClick={() => setSlotToDelete(slot.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Completed Patients Summary */}
        {completedPatients.length > 0 && (
          <Card className="border-slate-200 bg-slate-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">
                Completed Today ({completedPatients.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {completedPatients.map((patient) => (
                  <Badge
                    key={patient.id}
                    variant="outline"
                    className="bg-white text-slate-600 border-slate-200"
                  >
                    #{patient.dailyNumber} {patient.patientName}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Delete Confirmation */}
      <AlertDialog open={!!slotToDelete} onOpenChange={() => setSlotToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Slot</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this slot? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => slotToDelete && deleteSlot.mutate({ id: slotToDelete })}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

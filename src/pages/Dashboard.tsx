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
  XCircle,
  Play,
  Timer,
} from "lucide-react";
import { format, addDays, subDays } from "date-fns";

function getLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [bookingFreeRange, setBookingFreeRange] = useState<{ start: string; end: string } | null>(null);
  const [apptToDelete, setApptToDelete] = useState<number | null>(null);
  const [apptToCancel, setApptToCancel] = useState<number | null>(null);

  // Form states
  const [patientName, setPatientName] = useState("");
  const [patientPhone, setPatientPhone] = useState("");
  const [patientNotes, setPatientNotes] = useState("");
  const [bookStartTime, setBookStartTime] = useState("");
  const [bookEndTime, setBookEndTime] = useState("");

  const dateStr = getLocalDateString(selectedDate);
  const utils = trpc.useUtils();

  const { data: appointments = [], isLoading } = trpc.appointment.list.useQuery({ date: dateStr });
  const { data: freeTimeRanges = [] } = trpc.appointment.freeTime.useQuery({ date: dateStr });
  const { data: nextDailyNumber = 1 } = trpc.appointment.getNextDailyNumber.useQuery({ date: dateStr });

  const createAppt = trpc.appointment.create.useMutation({
    onSuccess: () => {
      utils.appointment.list.invalidate({ date: dateStr });
      utils.appointment.freeTime.invalidate({ date: dateStr });
      utils.appointment.getNextDailyNumber.invalidate({ date: dateStr });
      setBookingFreeRange(null);
      setPatientName("");
      setPatientPhone("");
      setPatientNotes("");
      setBookStartTime("");
      setBookEndTime("");
    },
  });

  const deleteAppt = trpc.appointment.delete.useMutation({
    onSuccess: () => {
      utils.appointment.list.invalidate({ date: dateStr });
      utils.appointment.freeTime.invalidate({ date: dateStr });
      utils.appointment.getNextDailyNumber.invalidate({ date: dateStr });
      setApptToDelete(null);
    },
  });

  const updateStatus = trpc.appointment.updateStatus.useMutation({
    onSuccess: () => {
      utils.appointment.list.invalidate({ date: dateStr });
      utils.appointment.freeTime.invalidate({ date: dateStr });
    },
  });

  // Categorize appointments
  const waitingAppointments = appointments
    .filter((a) => a.status === "waiting")
    .sort((a, b) => a.dailyNumber - b.dailyNumber);

  const inSessionAppt = appointments.find((a) => a.status === "in_session");
  const completedAppointments = appointments.filter((a) => a.status === "completed");
  const cancelledAppointments = appointments.filter((a) => a.status === "cancelled");

  const currentPatient = inSessionAppt;
  const nextPatients = waitingAppointments;

  const handleBookFromFreeTime = () => {
    if (!patientName.trim() || !bookingFreeRange) return;
    const start = bookStartTime || bookingFreeRange.start;
    const end = bookEndTime || bookingFreeRange.end;
    createAppt.mutate({
      appointmentDate: dateStr,
      startTime: start,
      endTime: end,
      patientName: patientName.trim(),
      patientPhone: patientPhone.trim() || undefined,
      notes: patientNotes.trim() || undefined,
      dailyNumber: nextDailyNumber,
    });
  };

  const generateTimeOptionsInRange = (start: string, end: string) => {
    const times: string[] = [];
    const [startH, startM] = start.split(":").map(Number);
    const [endH, endM] = end.split(":").map(Number);
    let currentMin = startH * 60 + startM;
    const endMin = endH * 60 + endM;
    while (currentMin <= endMin) {
      const h = Math.floor(currentMin / 60);
      const m = currentMin % 60;
      times.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
      currentMin += 15;
    }
    return times;
  };

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
              <p className="text-xs text-slate-500">Welcome, {user?.name || "Dr. Dentist"}</p>
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
          <Button variant="outline" size="sm" onClick={() => setSelectedDate(subDays(selectedDate, 1))}>
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
          <Button variant="outline" size="sm" onClick={() => setSelectedDate(addDays(selectedDate, 1))}>
            Next
          </Button>
        </div>

        {/* Now Serving & Upcoming */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Currently Serving */}
          <Card className="md:col-span-1 border-teal-200 bg-gradient-to-br from-teal-50 to-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-teal-700 flex items-center gap-2">
                <Play className="w-4 h-4" />
                Now Serving
              </CardTitle>
            </CardHeader>
            <CardContent>
              {currentPatient ? (
                <div className="space-y-3">
                  <div className="text-center">
                    <span className="text-5xl font-bold text-teal-700">#{currentPatient.dailyNumber}</span>
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
                    onClick={() => updateStatus.mutate({ id: currentPatient.id, status: "completed" })}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1" />
                    Mark Complete
                  </Button>
                </div>
              ) : (
                <div className="text-center py-6 text-slate-400">
                  <Timer className="w-10 h-10 mx-auto mb-2" />
                  <p>No patient in session</p>
                  {waitingAppointments.length > 0 && (
                    <Button
                      size="sm"
                      className="mt-3 bg-teal-600 hover:bg-teal-700"
                      onClick={() =>
                        updateStatus.mutate({
                          id: waitingAppointments[0].id,
                          status: "in_session",
                        })
                      }
                    >
                      <Play className="w-4 h-4 mr-1" />
                      Start #{waitingAppointments[0].dailyNumber}
                    </Button>
                  )}
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
                  <Badge variant="secondary" className="ml-2">{nextPatients.length} waiting</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {nextPatients.length > 0 ? (
                <div className="space-y-3">
                  {nextPatients.slice(0, 4).map((patient, index) => (
                    <div
                      key={patient.id}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        index === 0 ? "bg-amber-50 border-amber-300" : "bg-white border-slate-200"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`text-2xl font-bold ${index === 0 ? "text-amber-700" : "text-slate-400"}`}>
                          #{patient.dailyNumber}
                        </span>
                        <div>
                          <p className="font-medium text-slate-800">{patient.patientName}</p>
                          <p className="text-xs text-slate-500">
                            {patient.startTime} - {patient.endTime}
                            {patient.patientPhone && ` | ${patient.patientPhone}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {index === 0 && (
                          <Badge className="bg-amber-500 text-white animate-pulse">You are next!</Badge>
                        )}
                        {!currentPatient && index === 0 && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-teal-600 hover:bg-teal-50"
                            onClick={() => updateStatus.mutate({ id: patient.id, status: "in_session" })}
                          >
                            <Play className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                  {nextPatients.length > 4 && (
                    <p className="text-center text-sm text-slate-400">
                      +{nextPatients.length - 4} more patients
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

        {/* Free Time Ranges - Main Display */}
        <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-lg font-semibold text-emerald-800 flex items-center gap-2">
                <Clock className="w-5 h-5 text-emerald-600" />
                Free Time Slots
              </CardTitle>
              <p className="text-sm text-emerald-600 mt-1">
                Available time ranges for new appointments (Working hours: 8:00 AM - 5:00 PM)
              </p>
            </div>
          </CardHeader>
          <CardContent>
            {freeTimeRanges.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <AlertCircle className="w-10 h-10 mx-auto mb-2 text-amber-500" />
                <p className="font-medium text-amber-700">No free time available</p>
                <p className="text-sm mt-1">All slots are fully booked for this date</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {freeTimeRanges.map((range, index) => (
                  <Dialog
                    key={index}
                    open={bookingFreeRange?.start === range.start && bookingFreeRange?.end === range.end}
                    onOpenChange={(open) => {
                      if (!open) {
                        setBookingFreeRange(null);
                        setPatientName("");
                        setPatientPhone("");
                        setPatientNotes("");
                        setBookStartTime("");
                        setBookEndTime("");
                      }
                    }}
                  >
                    <DialogTrigger asChild>
                      <button
                        className="group flex items-center justify-between p-4 rounded-lg border-2 border-emerald-200 bg-white hover:border-emerald-400 hover:shadow-md transition-all text-left w-full"
                        onClick={() => {
                          setBookingFreeRange(range);
                          setBookStartTime(range.start);
                          setBookEndTime(range.end);
                        }}
                      >
                        <div>
                          <p className="text-lg font-semibold text-emerald-700">
                            {range.start} - {range.end}
                          </p>
                          <p className="text-xs text-emerald-500 mt-1">Click to book appointment</p>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center group-hover:bg-emerald-200 transition-colors">
                          <Plus className="w-4 h-4 text-emerald-600" />
                        </div>
                      </button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Book Appointment</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 pt-4">
                        <div className="bg-emerald-50 p-3 rounded-lg">
                          <p className="text-sm text-emerald-700">
                            Free Range: <strong>{bookingFreeRange?.start} - {bookingFreeRange?.end}</strong>
                          </p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm font-medium text-slate-700 mb-1 block">Start Time</label>
                            <Select value={bookStartTime} onValueChange={setBookStartTime}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {bookingFreeRange && generateTimeOptionsInRange(bookingFreeRange.start, bookingFreeRange.end).map((time) => (
                                  <SelectItem key={time} value={time}>{time}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-slate-700 mb-1 block">End Time</label>
                            <Select value={bookEndTime} onValueChange={setBookEndTime}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {bookingFreeRange && generateTimeOptionsInRange(bookingFreeRange.start, bookingFreeRange.end).map((time) => (
                                  <SelectItem key={time} value={time}>{time}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-slate-700 mb-1 block">Patient Name *</label>
                          <Input placeholder="Enter patient name" value={patientName} onChange={(e) => setPatientName(e.target.value)} />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-slate-700 mb-1 block">Phone Number</label>
                          <div className="relative">
                            <Phone className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                            <Input className="pl-9" placeholder="Enter phone number" value={patientPhone} onChange={(e) => setPatientPhone(e.target.value)} />
                          </div>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-slate-700 mb-1 block">Notes</label>
                          <div className="relative">
                            <FileText className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                            <Input className="pl-9" placeholder="Any additional notes" value={patientNotes} onChange={(e) => setPatientNotes(e.target.value)} />
                          </div>
                        </div>
                        <div className="bg-teal-50 p-3 rounded-lg">
                          <p className="text-sm text-teal-700">Daily Number: <strong>#{nextDailyNumber}</strong></p>
                        </div>
                        <Button
                          className="w-full bg-teal-600 hover:bg-teal-700"
                          onClick={handleBookFromFreeTime}
                          disabled={!patientName.trim() || createAppt.isPending}
                        >
                          {createAppt.isPending ? "Booking..." : "Book Appointment"}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Booked Appointments List */}
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <User className="w-5 h-5 text-teal-600" />
              Booked Appointments
              {waitingAppointments.length > 0 && (
                <Badge variant="outline" className="ml-2">{waitingAppointments.length} active</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-slate-400">Loading appointments...</div>
            ) : appointments.filter((a) => a.status !== "cancelled").length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <Clock className="w-10 h-10 mx-auto mb-2" />
                <p>No appointments for this date</p>
                <p className="text-sm mt-1">All day is free (8:00 AM - 5:00 PM)</p>
              </div>
            ) : (
              <div className="space-y-2">
                {appointments
                  .filter((a) => a.status !== "cancelled")
                  .sort((a, b) => a.startTime.localeCompare(b.startTime))
                  .map((appt) => (
                    <div
                      key={appt.id}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        appt.status === "in_session"
                          ? "border-teal-300 bg-teal-50"
                          : appt.status === "completed"
                          ? "border-slate-200 bg-slate-50"
                          : "border-slate-200 bg-white"
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <span className="text-lg font-bold text-teal-700 min-w-[40px]">#{appt.dailyNumber}</span>
                        <div className="text-sm font-mono text-slate-600 min-w-[100px]">
                          {appt.startTime} - {appt.endTime}
                        </div>
                        {appt.status === "in_session" && (
                          <Badge className="bg-teal-500 text-white">In Session</Badge>
                        )}
                        {appt.status === "completed" && (
                          <Badge variant="outline" className="text-slate-500">Completed</Badge>
                        )}
                        {appt.status === "waiting" && (
                          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Waiting</Badge>
                        )}
                        <div>
                          <p className="text-sm font-medium text-slate-800">{appt.patientName}</p>
                          {appt.patientPhone && (
                            <p className="text-xs text-slate-500">{appt.patientPhone}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        {appt.status === "waiting" && !currentPatient && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-teal-600 hover:text-teal-700 hover:bg-teal-50"
                            onClick={() => updateStatus.mutate({ id: appt.id, status: "in_session" })}
                          >
                            <Play className="w-4 h-4 mr-1" />
                            Start
                          </Button>
                        )}
                        {appt.status === "in_session" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                            onClick={() => updateStatus.mutate({ id: appt.id, status: "completed" })}
                          >
                            <CheckCircle2 className="w-4 h-4 mr-1" />
                            Complete
                          </Button>
                        )}
                        {appt.status === "waiting" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-amber-500 hover:text-amber-700 hover:bg-amber-50"
                            onClick={() => setApptToCancel(appt.id)}
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Cancel
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-slate-400 hover:text-red-600 hover:bg-red-50"
                          onClick={() => setApptToDelete(appt.id)}
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

        {/* Cancelled Appointments */}
        {cancelledAppointments.length > 0 && (
          <Card className="border-red-100 bg-red-50/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-red-600 flex items-center gap-2">
                <XCircle className="w-4 h-4" />
                Cancelled ({cancelledAppointments.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {cancelledAppointments.map((appt) => (
                  <Badge key={appt.id} variant="outline" className="bg-white text-slate-500 border-slate-200 line-through">
                    #{appt.dailyNumber} {appt.patientName} ({appt.startTime}-{appt.endTime})
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Completed Summary */}
        {completedAppointments.length > 0 && (
          <Card className="border-slate-200 bg-slate-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">
                Completed Today ({completedAppointments.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {completedAppointments.map((appt) => (
                  <Badge key={appt.id} variant="outline" className="bg-white text-slate-600 border-slate-200">
                    #{appt.dailyNumber} {appt.patientName}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Delete Confirmation */}
      <AlertDialog open={!!apptToDelete} onOpenChange={() => setApptToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Appointment</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the appointment. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => apptToDelete && deleteAppt.mutate({ id: apptToDelete })}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel Confirmation */}
      <AlertDialog open={!!apptToCancel} onOpenChange={() => setApptToCancel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Appointment</AlertDialogTitle>
            <AlertDialogDescription>
              Cancelling will free up this time slot for new bookings. The patient will be removed from the queue.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Appointment</AlertDialogCancel>
            <AlertDialogAction
              className="bg-amber-600 hover:bg-amber-700"
              onClick={() => apptToCancel && updateStatus.mutate({ id: apptToCancel, status: "cancelled" })}
            >
              Cancel Appointment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

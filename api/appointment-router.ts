import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { appointments } from "@db/schema";
import { eq, and, asc, desc } from "drizzle-orm";

// Working hours
const OPEN_TIME = "08:00";
const CLOSE_TIME = "17:00";

// Helper: time string "HH:MM" to minutes
function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

// Helper: minutes to "HH:MM"
function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

// Calculate free time ranges for a date
async function calculateFreeTime(date: string) {
  const db = getDb();
  const booked = await db
    .select()
    .from(appointments)
    .where(
      and(
        eq(appointments.appointmentDate, date),
        eq(appointments.status, "waiting")
      )
    )
    .orderBy(asc(appointments.startTime));

  const openMin = timeToMinutes(OPEN_TIME);
  const closeMin = timeToMinutes(CLOSE_TIME);

  // No bookings = entire day is free
  if (booked.length === 0) {
    return [{ start: OPEN_TIME, end: CLOSE_TIME }];
  }

  const freeRanges: { start: string; end: string }[] = [];
  let currentEnd = openMin;

  for (const appt of booked) {
    const apptStart = timeToMinutes(appt.startTime);
    const apptEnd = timeToMinutes(appt.endTime);

    // Gap before this appointment
    if (currentEnd < apptStart) {
      freeRanges.push({
        start: minutesToTime(currentEnd),
        end: minutesToTime(apptStart),
      });
    }

    // Move cursor to after this appointment
    if (apptEnd > currentEnd) {
      currentEnd = apptEnd;
    }
  }

  // Gap after last appointment until close
  if (currentEnd < closeMin) {
    freeRanges.push({
      start: minutesToTime(currentEnd),
      end: CLOSE_TIME,
    });
  }

  return freeRanges;
}

export const appointmentRouter = createRouter({
  // List booked appointments for a date
  list: publicQuery
    .input(z.object({ date: z.string() }))
    .query(async ({ input }) => {
      const db = getDb();
      const result = await db
        .select()
        .from(appointments)
        .where(eq(appointments.appointmentDate, input.date))
        .orderBy(asc(appointments.startTime));
      return result;
    }),

  // Get free time ranges for a date
  freeTime: publicQuery
    .input(z.object({ date: z.string() }))
    .query(async ({ input }) => {
      return calculateFreeTime(input.date);
    }),

  // Create a new appointment (books a free time slot)
  create: publicQuery
    .input(
      z.object({
        appointmentDate: z.string(),
        startTime: z.string(),
        endTime: z.string(),
        patientName: z.string().min(1),
        patientPhone: z.string().optional(),
        notes: z.string().optional(),
        dailyNumber: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const result = await db.insert(appointments).values({
        appointmentDate: input.appointmentDate,
        startTime: input.startTime,
        endTime: input.endTime,
        patientName: input.patientName,
        patientPhone: input.patientPhone,
        notes: input.notes,
        dailyNumber: input.dailyNumber,
        status: "waiting",
      });
      return { id: Number(result[0].insertId) };
    }),

  // Update appointment status
  updateStatus: publicQuery
    .input(
      z.object({
        id: z.number(),
        status: z.enum(["waiting", "in_session", "completed", "cancelled"]),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      await db
        .update(appointments)
        .set({ status: input.status })
        .where(eq(appointments.id, input.id));
      return { success: true };
    }),

  // Delete an appointment
  delete: publicQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.delete(appointments).where(eq(appointments.id, input.id));
      return { success: true };
    }),

  // Get next daily number for a date
  getNextDailyNumber: publicQuery
    .input(z.object({ date: z.string() }))
    .query(async ({ input }) => {
      const db = getDb();
      const result = await db
        .select()
        .from(appointments)
        .where(eq(appointments.appointmentDate, input.date))
        .orderBy(desc(appointments.dailyNumber));

      const maxNumber = result[0]?.dailyNumber ?? 0;
      return maxNumber + 1;
    }),
});

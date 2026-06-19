import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { appointments } from "@db/schema";
import { eq, and, asc, desc, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

const OPEN_TIME = "08:00";
const CLOSE_TIME = "17:00";

function timeToMinutes(time: string): number {
  if (!time || typeof time !== "string" || !time.includes(":")) return 0;
  const [h, m] = time.split(":").map(Number);
  if (isNaN(h) || isNaN(m)) return 0;
  return h * 60 + m;
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

async function calculateFreeTime(date: string) {
  try {
    const db = await getDb();

    const booked = await db
      .select()
      .from(appointments)
      .where(
        and(
          eq(appointments.appointmentDate, date),
          inArray(appointments.status, ["waiting", "in_session", "completed"])
        )
      )
      .orderBy(asc(appointments.startTime));

    const openMin = timeToMinutes(OPEN_TIME);
    const closeMin = timeToMinutes(CLOSE_TIME);

    console.log(`[FreeTime] Date: ${date}, Appointments: ${booked.length}`);

    // No appointments = full day free
    if (!booked || booked.length === 0) {
      return [{ start: OPEN_TIME, end: CLOSE_TIME }];
    }

    const freeRanges: { start: string; end: string }[] = [];
    let currentEnd = openMin;

    for (const appt of booked) {
      const apptStart = timeToMinutes(appt.startTime);
      const apptEnd = timeToMinutes(appt.endTime);

      if (isNaN(apptStart) || isNaN(apptEnd)) continue;
      if (apptEnd <= currentEnd) continue;

      if (currentEnd < apptStart) {
        const gapEnd = Math.min(apptStart, closeMin);
        if (currentEnd < gapEnd) {
          freeRanges.push({
            start: minutesToTime(currentEnd),
            end: minutesToTime(gapEnd),
          });
        }
      }

      currentEnd = Math.max(currentEnd, apptEnd);
      if (currentEnd >= closeMin) break;
    }

    if (currentEnd < closeMin) {
      freeRanges.push({
        start: minutesToTime(currentEnd),
        end: CLOSE_TIME,
      });
    }

    // Safety net: if empty but no valid blocking appointments, return full day
    if (freeRanges.length === 0) {
      const hasValidBlocking = booked.some((appt) => {
        const s = timeToMinutes(appt.startTime);
        const e = timeToMinutes(appt.endTime);
        return !isNaN(s) && !isNaN(e) && e > openMin && s < closeMin;
      });

      if (!hasValidBlocking) {
        return [{ start: OPEN_TIME, end: CLOSE_TIME }];
      }
    }

    return freeRanges;
  } catch (error) {
    console.error("[FreeTime] Error:", error);
    return [{ start: OPEN_TIME, end: CLOSE_TIME }];
  }
}

export const appointmentRouter = createRouter({
  list: publicQuery
    .input(z.object({ date: z.string() }))
    .query(async ({ input }) => {
      try {
        const db = await getDb();
        const result = await db
          .select()
          .from(appointments)
          .where(eq(appointments.appointmentDate, input.date))
          .orderBy(asc(appointments.startTime));
        return result;
      } catch (error) {
        console.error("[Appointment.list] Error:", error);
        return [];
      }
    }),

  freeTime: publicQuery
    .input(z.object({ date: z.string() }))
    .query(async ({ input }) => {
      return calculateFreeTime(input.date);
    }),

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
      const startMin = timeToMinutes(input.startTime);
      const endMin = timeToMinutes(input.endTime);

      if (startMin >= endMin) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "End time must be after start time",
        });
      }

      const db = await getDb();
      const existing = await db
        .select()
        .from(appointments)
        .where(
          and(
            eq(appointments.appointmentDate, input.appointmentDate),
            inArray(appointments.status, ["waiting", "in_session", "completed"])
          )
        );

      const hasConflict = existing.some((appt) => {
        const apptStart = timeToMinutes(appt.startTime);
        const apptEnd = timeToMinutes(appt.endTime);
        return startMin < apptEnd && endMin > apptStart;
      });

      if (hasConflict) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Time slot unavailable. It conflicts with an existing appointment.",
        });
      }

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

  updateStatus: publicQuery
    .input(
      z.object({
        id: z.number(),
        status: z.enum(["waiting", "in_session", "completed", "cancelled"]),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      await db
        .update(appointments)
        .set({ status: input.status })
        .where(eq(appointments.id, input.id));
      return { success: true };
    }),

  delete: publicQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      await db.delete(appointments).where(eq(appointments.id, input.id));
      return { success: true };
    }),

  getNextDailyNumber: publicQuery
    .input(z.object({ date: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      const result = await db
        .select()
        .from(appointments)
        .where(eq(appointments.appointmentDate, input.date))
        .orderBy(desc(appointments.dailyNumber));

      const maxNumber = result[0]?.dailyNumber ?? 0;
      return maxNumber + 1;
    }),
});

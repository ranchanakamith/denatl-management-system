import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import * as dbSchema from "@db/schema";
// Use a runtime-checked reference to the slots table to avoid TypeScript export mismatch
const slots = (dbSchema as any).slots;
import { eq, and, gte, lte, desc, asc } from "drizzle-orm";

export const slotRouter = createRouter({
  // List slots for a specific date
  list: publicQuery
    .input(
      z.object({
        date: z.string(), // YYYY-MM-DD
      })
    )
    .query(async ({ input }) => {
      const db = getDb();
      const result = await db
        .select()
        .from(slots)
        .where(eq(slots.slotDate, input.date))
        .orderBy(asc(slots.startTime));
      return result;
    }),

  // Get slots in a date range
  listRange: publicQuery
    .input(
      z.object({
        startDate: z.string(),
        endDate: z.string(),
      })
    )
    .query(async ({ input }) => {
      const db = getDb();
      const result = await db
        .select()
        .from(slots)
        .where(
          and(
            gte(slots.slotDate, input.startDate),
            lte(slots.slotDate, input.endDate)
          )
        )
        .orderBy(asc(slots.slotDate), asc(slots.startTime));
      return result;
    }),

  // Create a new slot
  create: publicQuery
    .input(
      z.object({
        slotDate: z.string(),
        startTime: z.string(),
        endTime: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const result = await db.insert(slots).values({
        slotDate: input.slotDate,
        startTime: input.startTime,
        endTime: input.endTime,
        status: "available",
      });
      return { id: Number(result[0].insertId) };
    }),

  // Book a slot with patient info
  book: publicQuery
    .input(
      z.object({
        id: z.number(),
        patientName: z.string().min(1),
        patientPhone: z.string().optional(),
        notes: z.string().optional(),
        dailyNumber: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      await db
        .update(slots)
        .set({
          status: "booked",
          patientName: input.patientName,
          patientPhone: input.patientPhone,
          notes: input.notes,
          dailyNumber: input.dailyNumber,
        })
        .where(eq(slots.id, input.id));
      return { success: true };
    }),

  // Update slot status
  updateStatus: publicQuery
    .input(
      z.object({
        id: z.number(),
        status: z.enum(["available", "booked", "completed", "cancelled"]),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const updateData: Record<string, unknown> = { status: input.status };

      // If slot becomes available again, clear patient info
      if (input.status === "available") {
        updateData.patientName = null;
        updateData.patientPhone = null;
        updateData.notes = null;
        updateData.dailyNumber = null;
      }

      await db
        .update(slots)
        .set(updateData)
        .where(eq(slots.id, input.id));
      return { success: true };
    }),

  // Delete a slot
  delete: publicQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.delete(slots).where(eq(slots.id, input.id));
      return { success: true };
    }),

  // Shift slot time
  shift: publicQuery
    .input(
      z.object({
        id: z.number(),
        newStartTime: z.string(),
        newEndTime: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      await db
        .update(slots)
        .set({
          startTime: input.newStartTime,
          endTime: input.newEndTime,
        })
        .where(eq(slots.id, input.id));
      return { success: true };
    }),

  // Get today's queue (all booked slots for today)
  todayQueue: publicQuery.query(async () => {
    const db = getDb();
    const today = new Date().toISOString().split("T")[0];
    const result = await db
      .select()
      .from(slots)
      .where(
        and(
          eq(slots.slotDate, today),
          eq(slots.status, "booked")
        )
      )
      .orderBy(asc(slots.dailyNumber));
    return result;
  }),

  // Get next daily number for a date
  getNextDailyNumber: publicQuery
    .input(z.object({ date: z.string() }))
    .query(async ({ input }) => {
      const db = getDb();
      const result = await db
        .select()
        .from(slots)
        .where(eq(slots.slotDate, input.date))
        .orderBy(desc(slots.dailyNumber));

      const maxNumber = result[0]?.dailyNumber ?? 0;
      return maxNumber + 1;
    }),
});

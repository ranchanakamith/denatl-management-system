import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { slots } from "@db/schema";
import { eq, and, gte, lte, desc, asc } from "drizzle-orm";

export const slotRouter = createRouter({
  list: publicQuery
    .input(z.object({ date: z.string() }))
    .query(async ({ input }) => {
      try {
        const db = await getDb();
        return await db
          .select()
          .from(slots)
          .where(eq(slots.slotDate, input.date))
          .orderBy(asc(slots.startTime));
      } catch (error) {
        console.error("[Slot.list] Error:", error);
        return [];
      }
    }),

  listRange: publicQuery
    .input(z.object({ startDate: z.string(), endDate: z.string() }))
    .query(async ({ input }) => {
      try {
        const db = await getDb();
        return await db
          .select()
          .from(slots)
          .where(and(gte(slots.slotDate, input.startDate), lte(slots.slotDate, input.endDate)))
          .orderBy(asc(slots.slotDate), asc(slots.startTime));
      } catch (error) {
        console.error("[Slot.listRange] Error:", error);
        return [];
      }
    }),

  create: publicQuery
    .input(z.object({ slotDate: z.string(), startTime: z.string(), endTime: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      const result = await db.insert(slots).values({
        slotDate: input.slotDate,
        startTime: input.startTime,
        endTime: input.endTime,
        status: "available",
      });
      return { id: Number(result[0].insertId) };
    }),

  book: publicQuery
    .input(z.object({
      id: z.number(),
      patientName: z.string().min(1),
      patientPhone: z.string().optional(),
      notes: z.string().optional(),
      dailyNumber: z.number(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
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

  updateStatus: publicQuery
    .input(z.object({ id: z.number(), status: z.enum(["available", "booked", "completed", "cancelled"]) }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      const updateData: Record<string, any> = { status: input.status };
      if (input.status === "available") {
        updateData.patientName = null;
        updateData.patientPhone = null;
        updateData.notes = null;
        updateData.dailyNumber = null;
      }
      await db.update(slots).set(updateData).where(eq(slots.id, input.id));
      return { success: true };
    }),

  delete: publicQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      await db.delete(slots).where(eq(slots.id, input.id));
      return { success: true };
    }),

  shift: publicQuery
    .input(z.object({ id: z.number(), newStartTime: z.string(), newEndTime: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      await db
        .update(slots)
        .set({ startTime: input.newStartTime, endTime: input.newEndTime })
        .where(eq(slots.id, input.id));
      return { success: true };
    }),

  todayQueue: publicQuery.query(async () => {
    try {
      const db = await getDb();
      const today = new Date().toISOString().split("T")[0];
      return await db
        .select()
        .from(slots)
        .where(and(eq(slots.slotDate, today), eq(slots.status, "booked")))
        .orderBy(asc(slots.dailyNumber));
    } catch (error) {
      console.error("[Slot.todayQueue] Error:", error);
      return [];
    }
  }),

  getNextDailyNumber: publicQuery
    .input(z.object({ date: z.string() }))
    .query(async ({ input }) => {
      try {
        const db = await getDb();
        const result = await db
          .select()
          .from(slots)
          .where(eq(slots.slotDate, input.date))
          .orderBy(desc(slots.dailyNumber));
        return (result[0]?.dailyNumber ?? 0) + 1;
      } catch (error) {
        console.error("[Slot.getNextDailyNumber] Error:", error);
        return 1;
      }
    }),
});

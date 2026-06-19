import { relations } from "drizzle-orm";
import { users, appointments, slots } from "./schema";

export const usersRelations = relations(users, ({ many }) => ({
  appointments: many(appointments),
}));

export const appointmentsRelations = relations(appointments, ({ one }) => ({}));
export const slotsRelations = relations(slots, ({ one }) => ({}));

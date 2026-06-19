import { initDb } from "../api/queries/connection";
import { users } from "./schema";

export async function seed() {
  try {
    const db = await initDb();
    await db.insert(users).values({
      unionId: "local-dentist",
      name: "Dr. Dentist",
      email: "dentist@clinic.com",
      role: "admin",
    }).onDuplicateKeyUpdate({ set: { name: "Dr. Dentist" } });
    console.log("Seeded successfully");
  } catch (e) {
    console.error("Seed error:", e);
  }
}

import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { env } from "../lib/env";
import * as schema from "@db/schema";

let db: ReturnType<typeof drizzle<typeof schema>> | null = null;
let connectionPromise: Promise<ReturnType<typeof drizzle<typeof schema>>> | null = null;

async function createDatabaseIfNotExists() {
  try {
    // Connect without database name to create it
    const baseUrl = env.databaseUrl.replace(/\/[^/]*$/, ""); // Remove database name
    const client = await mysql.createConnection(baseUrl);
    const dbName = env.databaseUrl.split("/").pop()?.split("?")[0] || "dental_clinic";

    await client.execute(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
    await client.execute(`USE \`${dbName}\``);
    await client.end();
    console.log(`[DB] Database '${dbName}' created/verified`);
  } catch (error) {
    console.log("[DB] Note: Could not auto-create database (may already exist)", error);
  }
}

export async function initDb() {
  if (db) return db;
  if (connectionPromise) return connectionPromise;

  connectionPromise = (async () => {
    try {
      console.log("[DB] Connecting to database...");

      // Try to create database first
      await createDatabaseIfNotExists();

      const client = await mysql.createConnection(env.databaseUrl);
      db = drizzle(client, { schema, mode: "default" });
      console.log("[DB] Connected successfully");
      return db;
    } catch (error) {
      console.error("[DB] Connection failed:", error);
      connectionPromise = null;
      throw error;
    }
  })();

  return connectionPromise;
}

// Auto-initialize if not ready instead of throwing
export async function getDb() {
  if (!db) {
    console.log("[DB] Auto-initializing...");
    await initDb();
  }
  if (!db) {
    throw new Error("Database failed to initialize");
  }
  return db;
}

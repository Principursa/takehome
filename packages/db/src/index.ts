import { drizzle } from "drizzle-orm/node-postgres";

export const db = drizzle(process.env.DATABASE_URL || "");

// Export all tables
export * from "./schema/auth";
export * from "./schema/todo";
export * from "./schema/referral";

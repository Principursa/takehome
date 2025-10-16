import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

export const db = drizzle(process.env.DATABASE_URL || "", { schema });

// Export all tables and views via barrel export
export * from "./schema";

// Re-export commonly used Drizzle utilities
export { eq, and, or, sql, desc, asc } from "drizzle-orm";

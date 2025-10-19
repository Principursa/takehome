import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { sql } from "drizzle-orm";
import { beforeAll, beforeEach, afterAll } from "bun:test";
import * as schema from "@takehome/db";

// Create an in-memory PGlite instance for tests
const client = new PGlite();
let testDb: ReturnType<typeof drizzle>;

// Initialize the database
export function initTestDb() {
	if (!testDb) {
		testDb = drizzle(client, { schema });
	}
	return testDb;
}

export function getTestDb() {
	if (!testDb) {
		return initTestDb();
	}
	return testDb;
}

export function getClient() {
	return client;
}

// Apply migrations (create tables)
export async function applyMigrations() {
	const db = getTestDb();

	// Create user table
	await db.execute(sql`
		CREATE TABLE IF NOT EXISTS "user" (
			"id" TEXT PRIMARY KEY,
			"name" TEXT NOT NULL,
			"email" TEXT UNIQUE NOT NULL,
			"email_verified" BOOLEAN DEFAULT FALSE NOT NULL,
			"image" TEXT,
			"created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
			"updated_at" TIMESTAMP DEFAULT NOW() NOT NULL,
			"referral_code" TEXT UNIQUE,
			"referrer_id" TEXT REFERENCES "user"("id") ON DELETE SET NULL,
			"referral_depth" INTEGER DEFAULT 0 NOT NULL,
			"fee_tier" NUMERIC(5, 4) DEFAULT 0.0100 NOT NULL
		)
	`);

	// Create trades table
	await db.execute(sql`
		CREATE TABLE IF NOT EXISTS "trades" (
			"id" TEXT PRIMARY KEY,
			"user_id" TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
			"volume" NUMERIC(28, 18) NOT NULL,
			"fee_amount" NUMERIC(28, 18) NOT NULL,
			"fee_tier" NUMERIC(5, 4) NOT NULL,
			"token_type" TEXT NOT NULL,
			"processed_for_commissions" BOOLEAN DEFAULT FALSE NOT NULL,
			"created_at" TIMESTAMP DEFAULT NOW() NOT NULL
		)
	`);

	// Create commissions table
	await db.execute(sql`
		CREATE TABLE IF NOT EXISTS "commissions" (
			"id" TEXT PRIMARY KEY,
			"user_id" TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
			"trade_id" TEXT NOT NULL REFERENCES "trades"("id") ON DELETE CASCADE,
			"amount" NUMERIC(28, 18) NOT NULL,
			"level" INTEGER NOT NULL,
			"token_type" TEXT NOT NULL,
			"claimed" BOOLEAN DEFAULT FALSE NOT NULL,
			"claimed_at" TIMESTAMP,
			"created_at" TIMESTAMP DEFAULT NOW() NOT NULL
		)
	`);

	// Create cashback table
	await db.execute(sql`
		CREATE TABLE IF NOT EXISTS "cashback" (
			"id" TEXT PRIMARY KEY,
			"user_id" TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
			"trade_id" TEXT NOT NULL REFERENCES "trades"("id") ON DELETE CASCADE,
			"amount" NUMERIC(28, 18) NOT NULL,
			"token_type" TEXT NOT NULL,
			"claimed" BOOLEAN DEFAULT FALSE NOT NULL,
			"claimed_at" TIMESTAMP,
			"created_at" TIMESTAMP DEFAULT NOW() NOT NULL
		)
	`);

	// Create treasury_allocation table
	await db.execute(sql`
		CREATE TABLE IF NOT EXISTS "treasury_allocation" (
			"id" TEXT PRIMARY KEY,
			"trade_id" TEXT NOT NULL REFERENCES "trades"("id") ON DELETE CASCADE,
			"amount" NUMERIC(28, 18) NOT NULL,
			"token_type" TEXT NOT NULL,
			"created_at" TIMESTAMP DEFAULT NOW() NOT NULL
		)
	`);

	// Create xp_balance table
	await db.execute(sql`
		CREATE TABLE IF NOT EXISTS "xp_balance" (
			"user_id" TEXT PRIMARY KEY REFERENCES "user"("id") ON DELETE CASCADE,
			"total_xp" NUMERIC(28, 18) DEFAULT '0' NOT NULL,
			"last_updated_at" TIMESTAMP DEFAULT NOW() NOT NULL
		)
	`);

	// Create processed_trades table
	await db.execute(sql`
		CREATE TABLE IF NOT EXISTS "processed_trades" (
			"trade_id" TEXT PRIMARY KEY,
			"processed_at" TIMESTAMP DEFAULT NOW() NOT NULL
		)
	`);
}

// Clean up database - delete all data from tables between tests
export async function cleanupDatabase() {
	const db = getTestDb();

	// Delete from tables in correct order (respecting foreign keys)
	await db.execute(sql`DELETE FROM "commissions"`);
	await db.execute(sql`DELETE FROM "cashback"`);
	await db.execute(sql`DELETE FROM "treasury_allocation"`);
	await db.execute(sql`DELETE FROM "xp_balance"`);
	await db.execute(sql`DELETE FROM "processed_trades"`);
	await db.execute(sql`DELETE FROM "trades"`);
	await db.execute(sql`DELETE FROM "user"`);
}

// Setup hooks - apply schema once before all tests
beforeAll(async () => {
	initTestDb();
	await applyMigrations();
});

afterAll(async () => {
	await client.close();
});

// Helper function to create test users
export async function createTestUser(data: {
	id: string;
	email: string;
	name?: string;
	referralCode?: string;
	referrerId?: string;
	referralDepth?: number;
}) {
	const db = getTestDb();
	const { user } = await import("@takehome/db");

	const [created] = await db
		.insert(user)
		.values({
			id: data.id,
			email: data.email,
			name: data.name || "Test User",
			emailVerified: false,
			referralCode: data.referralCode || null,
			referrerId: data.referrerId || null,
			referralDepth: data.referralDepth || 0,
			createdAt: new Date(),
			updatedAt: new Date(),
		})
		.returning();
	return created;
}

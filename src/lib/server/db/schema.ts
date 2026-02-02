import { sql } from 'drizzle-orm';
import { integer, numeric, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const options = sqliteTable('options', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	monthlyBudget: integer('monthlyBudget').notNull().default(1100),
	purchaseHistory: text('purchaseHistory').notNull().default('[]')
});

export type Options = typeof options.$inferSelect;

export const purchases = sqliteTable('purchases', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	amountBTC: numeric('amountBTC').notNull(),
	priceGBP: numeric('priceGBP').notNull(),
	date: text()
		.default(sql`CURRENT_DATE`)
		.notNull()
});

export type Purchase = typeof purchases.$inferSelect;
export type NewPurchase = typeof purchases.$inferInsert;

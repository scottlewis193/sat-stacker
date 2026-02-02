import { command, query } from '$app/server';
import { db } from '$lib/server/db';
import { purchases, type NewPurchase, type Purchase } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { desc } from 'drizzle-orm';

export const getPurchases = query(() => {
	return db.select().from(purchases).orderBy(desc(purchases.date));
});

export const updatePurchase = command('unchecked', async (record: Purchase) => {
	await db.update(purchases).set(record).where(eq(purchases.id, record.id));
});

export const deletePurchase = command('unchecked', async (id: string) => {
	await db.delete(purchases).where(eq(purchases.id, id));
});

export const addPurchase = command('unchecked', async (record: NewPurchase) => {
	return await db.insert(purchases).values(record).returning();
});

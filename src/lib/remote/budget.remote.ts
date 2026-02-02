import { query } from '$app/server';
import { db } from '$lib/server/db';
import { options } from '$lib/server/db/schema';

export const updateBudget = query('unchecked', async (budget: number) => {
	const updatedBudgetValue = await db
		.update(options)
		.set({ monthlyBudget: budget })
		.returning({ monthlyBudget: options.monthlyBudget });
	return updatedBudgetValue;
});

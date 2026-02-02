import { query } from '$app/server';
import { DCA_BANDS, getDailyBudgetFromHolders } from '$lib/server/dca';

export const getBands = query(async () => {
	return DCA_BANDS;
});

export const getDcaDecision = query(
	'unchecked',
	async (data: { currentHolderProfitPercentage: number; monthlyBudget: number }) => {
		return getDailyBudgetFromHolders(data.currentHolderProfitPercentage, data.monthlyBudget);
	}
);

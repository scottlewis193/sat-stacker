import { query } from '$app/server';
import { DCA_BANDS, getDailyBudgetFromHolders } from '$lib/server/dca';

export const getBands = query(async () => {
	return DCA_BANDS;
});

export const getDcaDecision = query(
	'unchecked',
	async (data: {
		rawHolderProfitPercentage: number;
		monthlyBudget: number;
		price: number;
		ma200: number;
	}) => {
		return getDailyBudgetFromHolders(
			data.rawHolderProfitPercentage,
			data.monthlyBudget,
			data.price,
			data.ma200
		);
	}
);

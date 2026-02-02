import { DCA_BANDS, getDailyBudgetFromHolders } from '$lib/server/dca';
import { getLatestHoldersValue } from '$lib/server/holders';
import { getOptions } from './options';

import { getBalances } from './strike';

export let data = {
	balances: [],
	options: {
		id: '',
		monthlyBudget: 0,
		purchaseHistory: ''
	},
	dcaDecision: {
		holdersInProfit: 0,
		band: DCA_BANDS[0],
		baseDailyBudget: 0,
		adjustedDailyBudget: 0,
		monthlyBudget: 0
	},
	currentHolderProfitPercentage: 0
};

export async function updateData() {
	const balances = await getBalances();
	const currentHolderProfitPercentage = await getLatestHoldersValue();
	const options = await getOptions();
	const dcaDecision = getDailyBudgetFromHolders(
		currentHolderProfitPercentage,
		options.monthlyBudget
	);
	data.currentHolderProfitPercentage = currentHolderProfitPercentage;
	data.balances = balances;
	data.options = options;
	data.dcaDecision = dcaDecision;
}

export function getLatestData() {
	return data;
}

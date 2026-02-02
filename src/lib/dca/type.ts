export type DcaDecision = {
	date: string;
	btcPrice: number;
	holdersInProfitRaw: number;
	holdersInProfitSMA7: number;
	regime: string;
	multiplier: number;
	baseDaily: number;
	normalBuy: number;
	crashOverrideBuy: number;
	finalBuy: number;
	remainingBudget: number;
};

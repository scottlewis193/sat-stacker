// src/lib/dca.ts

export type DcaBand = {
	min: number; // inclusive
	max: number; // inclusive
	multiplier: number;
	label: string;
	graphLabel: string;
	color: string;
};

export const DCA_BANDS: DcaBand[] = [
	{
		label: 'Max Buy',
		graphLabel: '0-49.99%',
		min: 0,
		max: 49.99,
		multiplier: 3.0,
		color: 'purple'
	},
	{
		label: 'Strong Buy',
		graphLabel: '50-59.99%',
		min: 50,
		max: 59.99,
		multiplier: 1.5,
		color: 'blue'
	},
	{
		label: 'Standard Buy',
		graphLabel: '60-69.99%',
		min: 60,
		max: 69.99,
		multiplier: 1.0,
		color: 'green'
	},
	{
		label: 'Reduced Buy',
		graphLabel: '70-79.99%',
		min: 70,
		max: 79.99,
		multiplier: 0.75,
		color: 'yellow'
	},
	{
		label: 'Minimal Buy',
		graphLabel: '80-89.99%',
		min: 80,
		max: 97.99,
		multiplier: 0.5,
		color: 'orange'
	},
	{ label: 'Pause', graphLabel: '98-100%', min: 98, max: 100, multiplier: 0.25, color: 'red' }
];

export type DcaDecision = {
	holdersInProfit: number;
	band: DcaBand;
	baseDailyBudget: number;
	adjustedDailyBudget: number;
	monthlyBudget: number;
};

/**
 * Convert monthly USD budget into today's USD buy amount
 * based on raw % of holders in profit (0–100).
 */
export function getDailyBudgetFromHolders(
	holdersInProfit: number,
	monthlyBudgetUSD: number
): DcaDecision {
	const baseDailyBudget = monthlyBudgetUSD / 30;

	const band =
		DCA_BANDS.find((b) => holdersInProfit >= b.min && holdersInProfit <= b.max) ??
		DCA_BANDS[DCA_BANDS.length - 1];

	const adjustedDailyBudget = round2(baseDailyBudget * band.multiplier);

	return {
		holdersInProfit,
		band,
		baseDailyBudget: round2(baseDailyBudget),
		adjustedDailyBudget,
		monthlyBudget: monthlyBudgetUSD
	};
}

function round2(n: number): number {
	return Math.round(n * 100) / 100;
}

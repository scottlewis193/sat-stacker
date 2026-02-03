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
		multiplier: 3,
		color: 'purple'
	},
	{
		label: 'Strong Buy',
		graphLabel: '50-59.99%',
		min: 50,
		max: 59.99,
		multiplier: 2,
		color: 'blue'
	},
	{
		label: 'Standard Buy',
		graphLabel: '60-69.99%',
		min: 60,
		max: 69.99,
		multiplier: 1,
		color: 'green'
	},
	{
		label: 'Reduced Buy',
		graphLabel: '70-79.99%',
		min: 70,
		max: 79.99,
		multiplier: 0.5,
		color: 'yellow'
	},
	{
		label: 'Very Reduced Buy',
		graphLabel: '80-89.99%',
		min: 80,
		max: 97.99,
		multiplier: 0.25,
		color: 'orange'
	},
	{
		label: 'Minimal Buy',
		graphLabel: '98-100%',
		min: 98,
		max: 100,
		multiplier: 0.1,
		color: 'red'
	}
];

export type DcaDecision = {
	holdersInProfit: number;
	holdersAdjusted: number;
	band: DcaBand;

	baseDailyBudget: number;
	adjustedDailyBudget: number;

	holdersMultiplier: number;
	// ma200Multiplier: number;

	monthlyBudget: number;
};

/**
 * Convert monthly USD budget into today's USD buy amount
 * based on raw % of holders in profit (0–100).
 */
export function getDailyBudgetFromHolders(
	holdersInProfit: number,
	monthlyBudgetUSD: number,
	btcPriceUSD: number,
	ma200USD: number | null
): DcaDecision {
	const baseDailyBudget = monthlyBudgetUSD / 30;

	const adjustedHolders = adjustHoldersFor200Wma(holdersInProfit, btcPriceUSD, ma200USD);

	const band =
		DCA_BANDS.find((b) => adjustedHolders >= b.min && adjustedHolders <= b.max) ??
		DCA_BANDS[DCA_BANDS.length - 1];

	const holdersMultiplier = band.multiplier;
	// const ma200Multiplier = get200WmaMultiplier(btcPriceUSD, ma200USD);

	const adjustedDailyBudget = round2(baseDailyBudget * holdersMultiplier);

	return {
		holdersInProfit,
		holdersAdjusted: adjustedHolders,
		band,
		baseDailyBudget: round2(baseDailyBudget),
		adjustedDailyBudget,
		holdersMultiplier,
		// ma200Multiplier,
		monthlyBudget: monthlyBudgetUSD
	};
}

function round2(n: number): number {
	return Math.round(n * 100) / 100;
}

function get200WmaMultiplier(price: number, ma200: number): number {
	if (!ma200) return 1;

	const distance = (price - ma200) / ma200;

	// Deep value zone
	if (distance <= -0.4) return 2;

	// Below MA
	if (distance <= -0.2) return 1.3;
	if (distance <= 0) return 1.1;

	// Slightly above MA
	if (distance <= 0.3) return 0.9;

	// Euphoric zone
	if (distance <= 0.6) return 0.7;

	return 0.5;
}

function adjustHoldersFor200Wma(
	holdersInProfit: number,
	price: number,
	ma200: number | null
): number {
	if (!ma200) return holdersInProfit;

	const distance = (price - ma200) / ma200;

	// Bias ranges (in percentage points)
	let adjustment = 0;

	if (distance <= -0.4) adjustment = -20;
	else if (distance <= -0.2) adjustment = -12;
	else if (distance <= 0) adjustment = -5;
	else if (distance <= 0.3) adjustment = +5;
	else if (distance <= 0.6) adjustment = +12;
	else adjustment = +20;

	return Math.min(100, Math.max(0, holdersInProfit + adjustment));
}

import { MONTHLY_BUDGET } from './config';

export type BudgetState = {
	month: string; // "2026-01"
	spentThisMonth: number;
	carryOver: number;
};

export function rolloverMonth(state: BudgetState, currentMonth: string): BudgetState {
	if (state.month === currentMonth) return state;

	const unused = MONTHLY_BUDGET - state.spentThisMonth;

	return {
		month: currentMonth,
		spentThisMonth: 0,
		carryOver: Math.max(0, state.carryOver + unused)
	};
}

export function multiplierFromH(H: number): number {
	if (H <= 40) return 3.0;
	if (H <= 50) return 2.0;
	if (H <= 60) return 1.0;
	if (H <= 70) return 0.7;
	if (H <= 80) return 0.4;
	return 0.2;
}

export function regimeNameFromH(H: number): string {
	if (H <= 40) return 'Extreme capitulation';
	if (H <= 50) return 'Deep value';
	if (H <= 60) return 'Fair value';
	if (H <= 70) return 'Mild overvaluation';
	if (H <= 80) return 'Euphoric';
	return 'Blow-off top';
}

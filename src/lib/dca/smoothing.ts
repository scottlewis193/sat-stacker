export function sma(values: number[], window: number): number | null {
	if (values.length < window) return null;
	const slice = values.slice(-window);
	const sum = slice.reduce((a, b) => a + b, 0);
	return sum / window;
}

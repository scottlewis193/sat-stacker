<script lang="ts">
	import { onMount, onDestroy } from 'svelte';

	// Manual Chart.js registration
	import {
		Chart,
		LineController,
		LineElement,
		PointElement,
		LinearScale,
		LogarithmicScale,
		CategoryScale,
		Title,
		Tooltip,
		Legend
	} from 'chart.js';

	let {
		chartData,
		rangeDays = 30
	}: { chartData: { time: string; price: number }[] | null; rangeDays: number | null } = $props();

	let chart: Chart | null = null;

	Chart.register(
		LineController,
		LineElement,
		PointElement,
		LinearScale,
		LogarithmicScale,
		CategoryScale,
		Title,
		Tooltip,
		Legend
	);

	let canvasEl: HTMLCanvasElement;

	// Selected time range (default: 90 days)

	let scaleType: 'linear' | 'logarithmic' = 'logarithmic';

	function linearRegression(data: number[]): { slope: number; intercept: number } {
		const n = data.length;
		if (n === 0) return { slope: 0, intercept: 0 };

		let sumX = 0,
			sumY = 0,
			sumXY = 0,
			sumXX = 0;
		for (let i = 0; i < n; i++) {
			sumX += i;
			sumY += data[i];
			sumXY += i * data[i];
			sumXX += i * i;
		}
		const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);

		// Adjust intercept to start from first y-value
		const intercept = data[0] - slope * 0; // starts exactly at first point
		return { slope, intercept };
	}

	let colors = { text: '#ffffff' };

	type PreparedPoint = {
		price: number;
		time: string;
		ts: number;
		label: string;
	};

	let prepared: PreparedPoint[] = [];

	let MA50Full: (number | null)[] = [];
	let MA100Full: (number | null)[] = [];
	let MA200Full: (number | null)[] = [];

	function prepareData(raw: { price: number; time: string }[]) {
		prepared = raw.map((p) => {
			const ts = new Date(p.time).getTime();
			return {
				price: p.price,
				time: p.time,
				ts,
				label: new Date(ts).toDateString()
			};
		});

		// Compute MAs once
		MA50Full = movingAverageFast(prepared, 350).map((p) => p.price);

		MA100Full = movingAverageFast(prepared, 700).map((p) => p.price);

		MA200Full = movingAverageFast(prepared, 1400).map((p) => p.price);
	}

	function movingAverage(
		data: { price: number; time: string }[],
		period: number
	): { price: number | null; time: string }[] {
		const result: { price: number | null; time: string }[] = data.map((item) => ({
			price: null,
			time: item.time
		}));

		for (let i = period - 1; i < data.length; i++) {
			let sum = 0;
			for (let j = i - period + 1; j <= i; j++) {
				sum += data[j].price;
			}

			result[i] = { price: sum / period, time: data[i].time };
		}

		return result;
	}

	function movingAverageFast(
		data: { price: number; time: string }[],
		period: number
	): { price: number | null; time: string }[] {
		const result = new Array(data.length);

		let sum = 0;

		for (let i = 0; i < data.length; i++) {
			sum += data[i].price;

			if (i >= period) sum -= data[i - period].price;

			if (i >= period - 1) {
				result[i] = {
					price: sum / period,
					time: data[i].time
				};
			} else {
				result[i] = {
					price: null,
					time: data[i].time
				};
			}
		}

		return result;
	}

	export function resize() {
		if (!chart) return;
		chart.resize();
	}

	let resizeTimeout: any;

	export function debouncedResize() {
		clearTimeout(resizeTimeout);
		resizeTimeout = setTimeout(() => {
			resize();
		}, 100);
	}

	async function render() {
		if (!prepared.length) return;

		const ctx = canvasEl.getContext('2d');
		if (!ctx) return;

		// Find slice start index
		let startIndex = 0;
		if (rangeDays) {
			const cutoff = Date.now() - rangeDays * 86400000;
			startIndex = prepared.findIndex((p) => p.ts > cutoff);
			if (startIndex < 0) startIndex = prepared.length;
		}

		const slice = prepared.slice(startIndex);

		// Build chart arrays in ONE pass
		const xValues = new Array(slice.length);
		const yValues = new Array(slice.length);

		for (let i = 0; i < slice.length; i++) {
			xValues[i] = slice[i].label;
			yValues[i] = slice[i].price;
		}

		const MA_50W = MA50Full.slice(startIndex);
		const MA_100W = MA100Full.slice(startIndex);
		const MA_200W = MA200Full.slice(startIndex);

		const { slope, intercept } = linearRegression(yValues);
		const trendLine = yValues.map((_, i) => intercept + slope * i);

		// ⭐ Update existing chart instead of destroying
		if (chart) {
			chart.data.labels = xValues;
			chart.data.datasets[0].data = yValues;
			chart.data.datasets[1].data = MA_50W;
			chart.data.datasets[2].data = MA_100W;
			chart.data.datasets[3].data = MA_200W;

			chart.update('none');
			return;
		}

		// ⭐ Create once
		chart = new Chart(ctx, {
			type: 'line',
			data: {
				labels: xValues,
				datasets: [
					{
						label: 'BTC Price',
						data: yValues,
						borderColor: colors.text,
						backgroundColor: colors.text + '33',
						borderWidth: 3,
						pointStyle: false,
						tension: 0.5
					},
					{
						label: '50W MA',
						data: MA_50W,
						borderColor: 'oklch(26.9% 0 0)',
						borderWidth: 3,
						pointStyle: false
					},
					{
						label: '100W MA',
						data: MA_100W,
						borderColor: 'oklch(26.9% 0 0)',
						borderWidth: 3,
						pointStyle: false
					},
					{
						label: '200W MA',
						data: MA_200W,
						borderColor: 'oklch(26.9% 0 0)',
						borderWidth: 3,
						pointStyle: false
					}
				]
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				animation: false,

				plugins: {
					legend: { display: false },

					// BIG dataset accelerator
					decimation: {
						enabled: true,
						algorithm: 'lttb',
						samples: 500
					}
				},

				scales: {
					x: { display: false },
					y: {
						display: false,
						type: scaleType
					}
				}
			}
		});
	}

	$effect(() => {
		if (!chartData) return;
		prepareData(chartData);
		render();
	});

	onMount(() => {
		colors = {
			text: getComputedStyle(document.documentElement)
				.getPropertyValue('--color-base-content')
				.trim()
		};
	});

	onDestroy(() => {
		if (chart) chart.destroy();
	});
</script>

<canvas bind:this={canvasEl}></canvas>

<script lang="ts">
	import { onMount } from 'svelte';

	let {
		initialHeight,
		minHeight,
		maxHeight,
		persistKey,
		children
	}: {
		initialHeight: number;
		minHeight: number;
		maxHeight: number;
		persistKey: string | null;
		children: any;
	} = $props();

	let container: HTMLElement | null = null;
	let resizing = false;
	let startY = 0;
	let startHeight = 0;
	let rafId: number | null = null;
	let pendingHeight: number | null = null;

	onMount(() => {
		if (!container) return;

		if (persistKey) {
			const saved = localStorage.getItem(persistKey);
			if (saved) {
				container.style.height = `${saved}px`;
				return;
			}
		}

		container.style.height = `${initialHeight}px`;
	});

	function startResize(e: PointerEvent) {
		if (!container) return;

		resizing = true;
		startY = e.clientY;
		startHeight = container.getBoundingClientRect().height;

		document.body.classList.add('select-none');
		(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
	}

	function resize(e: PointerEvent) {
		if (!resizing || !container) return;

		const delta = e.clientY - startY;
		const height = Math.min(maxHeight, Math.max(minHeight, startHeight + delta));

		container.style.height = `${height}px`;
		if (persistKey) {
			localStorage.setItem(persistKey, String(height));
		}
	}

	function endResize(e: PointerEvent) {
		resizing = false;
		document.body.classList.remove('select-none');
		(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
	}
</script>

<div bind:this={container} class="relative overflow-hidden rounded-2xl bg-base-200 card-border">
	<div class="h-full">
		{@render children()}
	</div>

	<!-- resize handle -->
	<div class="absolute right-0 bottom-0 left-0 flex justify-center pb-2">
		<button
			class="btn h-1 w-12 cursor-row-resize btn-xs btn-primary"
			aria-label="Resize panel"
			onpointerdown={startResize}
			onpointermove={resize}
			onpointerup={endResize}
			onpointercancel={endResize}
		></button>
	</div>
</div>

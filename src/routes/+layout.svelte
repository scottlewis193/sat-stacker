<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { resolve } from '$app/paths';
	import { fade } from 'svelte/transition';
	import { page } from '$app/state';

	let { children } = $props();

	let mobileMenuOpen = $state(false);

	function toggleMobileMenu() {
		mobileMenuOpen = !mobileMenuOpen;
	}

	function closeMobileMenu() {
		console.log('closeMobileMenu called');
		mobileMenuOpen = false;
	}
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>
<header class="z-1">
	<div class="navbar bg-base-100 shadow-sm">
		<div class="navbar-start">
			<a onclick={closeMobileMenu} href={resolve('/')} class="btn gap-4 text-xl btn-ghost">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="24"
					height="24"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					class="lucide lucide-square-stack-icon lucide-square-stack"
					><path d="M4 10c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h4c1.1 0 2 .9 2 2" /><path
						d="M10 16c-1.1 0-2-.9-2-2v-4c0-1.1.9-2 2-2h4c1.1 0 2 .9 2 2"
					/><rect width="8" height="8" x="14" y="14" rx="2" /></svg
				>SAT STACKER
			</a>
		</div>
		<div class="navbar-center hidden lg:flex">
			<ul class="menu menu-horizontal px-1">
				<li><a onclick={closeMobileMenu} href={resolve('/')}>Home</a></li>
				<li><a onclick={closeMobileMenu} href={resolve('/backtest')}>Backtest</a></li>
				<li>
					<a onclick={closeMobileMenu} href={resolve('/purchase-history')}>Purchase History</a>
				</li>
			</ul>
		</div>
		<div class="navbar-end">
			<button
				title="Toggle Menu"
				tabindex="0"
				onclick={toggleMobileMenu}
				class="btn btn-ghost lg:hidden"
			>
				{#if mobileMenuOpen}
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="24"
						height="24"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						class="lucide lucide-x-icon lucide-x"
						><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg
					>
				{:else}
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="24"
						height="24"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						class="lucide lucide-text-align-end-icon lucide-text-align-end"
						><path d="M21 5H3" /><path d="M21 12H9" /><path d="M21 19H7" /></svg
					>
				{/if}
			</button>
		</div>
	</div>
</header>
{#if mobileMenuOpen}
	<ul
		id="mobile-menu"
		tabindex="-1"
		class="menu z-1 float-left h-full w-full menu-xl rounded-box bg-base-100 p-2 shadow"
	>
		<li>
			<a in:fade onclick={closeMobileMenu} href={resolve('/')}>Home</a>
		</li>
		<li>
			<a in:fade={{ delay: 100 }} onclick={closeMobileMenu} href={resolve('/backtest')}>Backtest</a>
		</li>
		<li>
			<a in:fade={{ delay: 100 }} onclick={closeMobileMenu} href={resolve('/purchase-history')}
				>Purchase History</a
			>
		</li>
	</ul>
{/if}
<!-- 	class:overflow-hidden={mobileMenuOpen} -->
{#key page.url}
	<div class="flex h-[calc(100vh-4rem)] min-h-[calc(100vh-4rem)] w-full flex-col overflow-x-auto">
		<main in:fade class="w-full pt-2 pr-8 pb-2 pl-8">
			{@render children()}
		</main>
	</div>
{/key}
<footer></footer>

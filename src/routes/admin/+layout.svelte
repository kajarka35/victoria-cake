<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';

	export let data;
	const user = data.user;
	let darkMode = false;

	onMount(() => {
		const prefersDark =
			localStorage.getItem('dark') === 'true' ||
			window.matchMedia('(prefers-color-scheme: dark)').matches;
		darkMode = prefersDark;
		document.documentElement.classList.toggle('dark', darkMode);
	});

	function toggleDarkMode() {
		darkMode = !darkMode;
		document.documentElement.classList.toggle('dark', darkMode);
		localStorage.setItem('dark', String(darkMode));
	}

	async function logout() {
		document.cookie =
			'sb-access-token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=Strict';
		document.cookie =
			'sb-refresh-token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=Strict';
		goto('/login');
	}

	function goHome() {
		goto('/');
	}
</script>

<div
	class="relative flex min-h-screen flex-col overflow-hidden bg-gradient-to-br from-pink-100 via-white to-white font-[Inter,sans-serif] text-gray-900 transition-colors duration-500 md:flex-row dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 dark:text-white"
>
	<!-- Fondo decorativo estilo blur -->
	<div
		class="absolute -top-10 -left-10 h-96 w-96 animate-pulse rounded-full bg-pink-300 opacity-20 blur-3xl"
	></div>
	<div
		class="absolute right-0 bottom-0 h-72 w-72 animate-pulse rounded-full bg-purple-200 opacity-20 blur-2xl delay-300"
	></div>

	<!-- Floating Controls -->
	<div class="animate-fade-in fixed right-6 bottom-6 z-50 flex flex-col gap-3">
		<button
			on:click={toggleDarkMode}
			aria-label="Toggle theme"
			class="rounded-full bg-white/70 p-3 text-pink-600 shadow-lg backdrop-blur-md transition-all duration-300 hover:scale-110 active:scale-95 dark:bg-gray-800/70 dark:text-white"
		>
			{#if darkMode}
				🌞
			{:else}
				🌙
			{/if}
		</button>
		<button
			on:click={goHome}
			aria-label="Go home"
			class="rounded-full bg-white/70 p-3 text-pink-600 shadow-lg backdrop-blur-md transition-all duration-300 hover:scale-110 active:scale-95 md:hidden dark:bg-gray-800/70 dark:text-white"
		>
			🏠
		</button>
	</div>

	<!-- Sidebar -->
	<aside
		class="animate-fade-in z-10 w-full flex-shrink-0 space-y-10 border-b border-pink-200 bg-white/50 p-6 shadow-xl backdrop-blur-xl sm:p-8 md:w-64 md:rounded-r-2xl md:border-r md:border-b-0 dark:border-gray-700 dark:bg-gray-800/50"
	>
		<h2
			class="animate-fade-in text-4xl font-extrabold tracking-tight text-pink-600 dark:text-pink-400"
		>
			Victoria Cake
		</h2>
		<nav class="space-y-3">
			<a
				href="/"
				class="flex items-center gap-3 rounded-2xl px-4 py-2 text-base font-medium text-gray-800 transition-all duration-300 hover:scale-[1.02] hover:bg-pink-100 active:scale-95 dark:text-gray-200 dark:hover:bg-pink-900/30"
			>
				🏠 Inicio
			</a>
			<a
				href="/admin/panel"
				class="flex items-center gap-3 rounded-2xl px-4 py-2 text-base font-medium text-gray-800 transition-all duration-300 hover:scale-[1.02] hover:bg-pink-100 active:scale-95 dark:text-gray-200 dark:hover:bg-pink-900/30"
			>
				📋 Panel
			</a>
			<a
				href="/admin/cms"
				class="flex items-center gap-3 rounded-2xl px-4 py-2 text-base font-medium text-gray-800 transition-all duration-300 hover:scale-[1.02] hover:bg-pink-100 active:scale-95 dark:text-gray-200 dark:hover:bg-pink-900/30"
			>
				📝 Gestor CMS
			</a>
			<a
				href="/admin/agregar"
				class="flex items-center gap-3 rounded-2xl px-4 py-2 text-base font-medium text-gray-800 transition-all duration-300 hover:scale-[1.02] hover:bg-pink-100 active:scale-95 dark:text-gray-200 dark:hover:bg-pink-900/30"
			>
				➕ Agregar producto
			</a>

			<div
				class="pt-4 pb-1 pl-4 text-xs font-semibold tracking-wider text-gray-400 uppercase dark:text-gray-500"
			>
				Olga's Smart Kitchen
			</div>

			<a
				href="/admin/recetas"
				class="flex items-center gap-3 rounded-2xl px-4 py-2 text-base font-medium text-gray-800 transition-all duration-300 hover:scale-[1.02] hover:bg-pink-100 active:scale-95 dark:text-gray-200 dark:hover:bg-pink-900/30"
			>
				📖 Recetario
			</a>
			<a
				href="/admin/ingredientes"
				class="flex items-center gap-3 rounded-2xl px-4 py-2 text-base font-medium text-gray-800 transition-all duration-300 hover:scale-[1.02] hover:bg-pink-100 active:scale-95 dark:text-gray-200 dark:hover:bg-pink-900/30"
			>
				🧮 Insumos
			</a>
			<a
				href="/admin/compras"
				class="flex items-center gap-3 rounded-2xl px-4 py-2 text-base font-medium text-gray-800 transition-all duration-300 hover:scale-[1.02] hover:bg-pink-100 active:scale-95 dark:text-gray-200 dark:hover:bg-pink-900/30"
			>
				🛒 Compras de la semana
			</a>
		</nav>
		<div class="animate-fade-in border-t border-pink-200 pt-6 dark:border-gray-700">
			<p class="truncate text-sm text-gray-500 dark:text-gray-400">
				{user?.email ?? 'Desconocido'}
			</p>
			<button
				on:click={logout}
				class="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-red-100 to-red-200 px-4 py-2 text-red-600 transition-transform duration-300 hover:scale-[1.05] active:scale-95 dark:from-red-800/40 dark:to-red-700/30 dark:text-red-300"
			>
				🔓 Cerrar sesión
			</button>
		</div>
	</aside>

	<!-- Main Content -->
	<main class="animate-fade-in z-10 w-full flex-1 p-6 sm:p-8 md:p-12">
		<slot />
	</main>
</div>

<style>
	@keyframes fade-in {
		from {
			opacity: 0;
			transform: translateY(24px) scale(0.97);
		}
		to {
			opacity: 1;
			transform: translateY(0) scale(1);
		}
	}

	.animate-fade-in {
		animation: fade-in 0.7s ease-out both;
	}

	html {
		scroll-behavior: smooth;
		touch-action: manipulation;
	}

	@media (max-width: 768px) {
		aside {
			border-radius: 0 !important;
		}
	}
</style>

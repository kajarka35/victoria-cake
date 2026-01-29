<script lang="ts">
	import { supabase } from '$lib/supabaseClient.js';
	import { goto } from '$app/navigation';
	import InputField from '$lib/components/InputField.svelte';
	import { onMount } from 'svelte';
	import { fly } from 'svelte/transition';
	import { browser } from '$app/environment';

	let email = '';
	let password = '';
	let cargando = false;
	let errorMsg = '';
	let successMsg = '';
	let show = false;
	let showPassword = false;
	let darkMode = false;

	onMount(async () => {
		setTimeout(() => (show = true), 100);

		if (browser) {
			darkMode =
				localStorage.getItem('dark') === 'true' ||
				window.matchMedia('(prefers-color-scheme: dark)').matches;
			document.documentElement.classList.toggle('dark', darkMode);

			const { data } = await supabase.auth.getSession();
			if (data.session) goto('/admin/panel');
		}
	});

	async function login() {
		cargando = true;
		errorMsg = '';
		successMsg = '';

		if (!email.trim() || !password.trim()) {
			errorMsg = '⚠️ Completa todos los campos';
			cargando = false;
			return;
		}

		const { data, error } = await supabase.auth.signInWithPassword({ email, password });
		cargando = false;

		if (error) {
			errorMsg = '❌ Usuario o contraseña incorrectos';
		} else if (data.session?.access_token) {
			const session = data.session;
			document.cookie = `sb-access-token=${session.access_token}; Path=/; Secure; SameSite=Strict`;
			document.cookie = `sb-refresh-token=${session.refresh_token}; Path=/; Secure; SameSite=Strict`;
			successMsg = '✅ Bienvenido, redirigiendo...';
			setTimeout(() => goto('/admin/panel'), 1500);
		}
	}

	function toggleDarkMode() {
		darkMode = !darkMode;
		document.documentElement.classList.toggle('dark', darkMode);
		localStorage.setItem('dark', String(darkMode));
	}

	function goHome() {
		goto('/');
	}

	function goContact() {
		goto('/contacto');
	}
</script>

<svelte:head>
	<title>Iniciar sesión | Victoria Cake</title>
</svelte:head>

{#if show}
	<div
		class="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-pink-100 via-white to-white px-4 py-10 dark:from-gray-900 dark:via-gray-950 dark:to-gray-900"
	>
		<!-- Fondo animado -->
		<div class="pointer-events-none absolute inset-0">
			<div
				class="absolute top-10 left-[-80px] h-[300px] w-[300px] animate-pulse rounded-full bg-pink-300/30 blur-3xl"
			></div>
			<div
				class="absolute right-[-50px] bottom-10 h-[200px] w-[200px] animate-ping rounded-full bg-purple-400/20 blur-2xl"
			></div>
		</div>

		<!-- Toggle dark -->
		<button
			class="absolute top-5 right-5 rounded-full bg-white/70 p-2 text-pink-600 shadow transition hover:scale-110 dark:bg-gray-700 dark:text-white"
			on:click={toggleDarkMode}
			aria-label="Cambiar modo"
		>
			{#if darkMode}
				🌞
			{:else}
				🌙
			{/if}
		</button>

		<!-- Volver -->
		<button
			on:click={goHome}
			class="absolute top-5 left-5 flex items-center gap-2 rounded-full border border-pink-300 bg-white/70 px-4 py-2 text-sm font-semibold text-pink-600 shadow backdrop-blur-md transition-all hover:scale-105 dark:border-gray-600 dark:bg-gray-700/80 dark:text-white"
			aria-label="Volver al inicio"
		>
			← Inicio
		</button>

		<!-- Panel -->
		<div
			class="animate-slide-fade w-full max-w-md space-y-6 rounded-3xl bg-white/90 p-6 shadow-2xl backdrop-blur-md sm:p-8 dark:bg-gray-800/80"
			transition:fly={{ y: 30, duration: 500 }}
		>
			<h1 class="text-center text-3xl font-extrabold text-pink-600 sm:text-4xl dark:text-pink-400">
				Panel Admin
			</h1>
			<p class="text-center text-sm text-gray-600 dark:text-gray-300">
				Ingresa tus credenciales para continuar
			</p>

			{#if errorMsg}
				<div
					class="animate-fade-in rounded-xl border border-red-300 bg-red-50 p-3 text-center text-sm font-medium text-red-600 dark:border-red-700 dark:bg-red-900 dark:text-red-200"
				>
					{errorMsg}
				</div>
			{/if}

			{#if successMsg}
				<div
					class="animate-fade-in rounded-xl border border-green-300 bg-green-50 p-3 text-center text-sm font-medium text-green-600 dark:border-green-700 dark:bg-green-900 dark:text-green-200"
				>
					{successMsg}
				</div>
			{/if}

			<form on:submit|preventDefault={login} class="space-y-5">
				<InputField
					id="email"
					label="Correo electrónico"
					type="email"
					bind:value={email}
					placeholder="admin@victoriacake.com"
				/>

				<div class="relative">
					<InputField
						id="password"
						label="Contraseña"
						type={showPassword ? 'text' : 'password'}
						bind:value={password}
						placeholder="••••••••"
					/>
					<button
						type="button"
						class="absolute top-9 right-3 text-base text-gray-500 transition hover:scale-110 dark:text-gray-300"
						on:click={() => (showPassword = !showPassword)}
						aria-label="Mostrar u ocultar contraseña"
					>
						{showPassword ? '🙈' : '👁️'}
					</button>
				</div>

				<button
					type="submit"
					class="w-full rounded-xl bg-pink-600 py-3 font-semibold text-white transition duration-300 ease-in-out hover:bg-pink-700 focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 focus:outline-none active:scale-95 disabled:opacity-50"
					disabled={cargando}
				>
					{cargando ? 'Ingresando...' : 'Iniciar sesión'}
				</button>
			</form>
		</div>

		<!-- Botones flotantes -->
		<div class="pointer-events-auto fixed right-5 bottom-5 z-[999] flex flex-col items-end gap-3">
			<button
				on:click={goHome}
				class="rounded-full border border-pink-200 bg-white/60 p-3 text-pink-600 shadow-xl backdrop-blur-md transition-all duration-300 hover:scale-105 dark:border-pink-400 dark:bg-gray-800/60 dark:text-white"
				aria-label="Ir al catálogo"
			>
				🏠
			</button>
			<button
				on:click={goContact}
				class="rounded-full bg-pink-500/90 p-3 text-white shadow-xl backdrop-blur-md transition-all duration-300 hover:scale-105 hover:bg-pink-600"
				aria-label="Contactar"
			>
				📞
			</button>
		</div>
	</div>
{/if}

<style>
	@keyframes fade-in {
		from {
			opacity: 0;
			transform: translateY(8px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@keyframes slide-fade {
		from {
			opacity: 0;
			transform: translateY(20px) scale(0.98);
		}
		to {
			opacity: 1;
			transform: translateY(0) scale(1);
		}
	}

	.animate-fade-in {
		animation: fade-in 0.4s ease-out both;
	}

	.animate-slide-fade {
		animation: slide-fade 0.6s ease-out both;
	}

	html {
		scroll-behavior: smooth;
	}

	@media (max-width: 640px) {
		h1 {
			font-size: 1.8rem;
		}

		.p-6 {
			padding: 1.5rem !important;
		}
	}
</style>

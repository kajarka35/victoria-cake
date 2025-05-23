<script lang="ts">
	import { fly, fade } from 'svelte/transition';
	import { onMount } from 'svelte';
	import VictoriaCakeImageComponent from '$lib/components/VictoriaCakeImageComponent.svelte';

	let show = false;
	onMount(() => {
		setTimeout(() => {
			show = true;
		}, 200); // Leve delay para dramatismo
	});
</script>

<svelte:head>
	<title>Victoria Cake</title>
	<meta name="viewport" content="width=device-width, initial-scale=1.0" />
	<meta
		name="description"
		content="Pastelería artesanal - Victoria Cake. Endulza tus momentos más especiales con nuestros diseños únicos y sabores inolvidables."
	/>
</svelte:head>

{#if show}
	<div
		class="relative min-h-screen overflow-hidden bg-gradient-to-b from-pink-100 via-white to-white font-sans text-gray-900"
		transition:fade={{ duration: 700 }}
	>
		<!-- Destellos decorativos -->
		<div
			class="absolute top-0 left-0 h-96 w-96 -translate-x-1/2 -translate-y-1/2 animate-pulse rounded-full bg-pink-300 opacity-20 blur-3xl"
		></div>
		<div
			class="absolute right-0 bottom-0 h-72 w-72 translate-x-1/2 translate-y-1/2 animate-pulse rounded-full bg-yellow-200 opacity-20 blur-2xl delay-300"
		></div>

		<!-- Hero Section -->
		<section
			class="relative z-10 flex flex-col-reverse items-center justify-between gap-12 px-4 pt-16 pb-10 sm:gap-20 md:flex-row md:px-20 md:pt-24 md:pb-20"
		>
			<!-- Texto -->
			<div class="space-y-6 text-center md:w-1/2 md:text-left" in:fly={{ x: -40, duration: 600 }}>
				<h1 class="text-3xl leading-snug font-extrabold tracking-tight drop-shadow-md sm:text-5xl md:text-6xl">
					Endulza tu vida con <span class="rounded-xl bg-white/50 px-2 py-1 text-pink-500">
						Victoria Cake</span>
				</h1>
				<p class="mx-auto max-w-md text-sm text-gray-600 sm:text-base md:mx-0 md:text-lg">
					Pasteles artesanales con diseño, sabor y magia. Celebra tus momentos con dulzura y estilo.
				</p>
				<div class="flex flex-col items-center gap-3 sm:flex-row md:justify-start">
					<a
						href="/catalogo"
						class="rounded-full bg-pink-500 px-6 py-3 text-base font-semibold text-white shadow-md transition duration-300 hover:scale-105 hover:bg-pink-600 hover:shadow-lg"
					>
						🎂 Ver Catálogo
					</a>
					<a
						href="/contacto"
						class="rounded-full border-2 border-pink-500 px-6 py-3 text-base font-semibold text-pink-500 transition-all duration-300 hover:scale-105 hover:bg-pink-100"
					>
						📞 Contáctanos
					</a>
				</div>
			</div>

			<!-- Imagen -->
			<div class="relative w-full max-w-[280px] sm:max-w-sm md:max-w-md md:w-1/2" in:fly={{ x: 40, duration: 600 }}>
				<VictoriaCakeImageComponent onLoginClick={() => window.location.href = '/login'} />
			</div>
		</section>
	</div>
{/if}

<style>
	@keyframes fade-in {
		from {
			opacity: 0;
			transform: translateY(20px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.animate-fade-in {
		animation: fade-in 1s ease-out both;
	}
</style>

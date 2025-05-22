<script lang="ts">
	import { fly, fade } from 'svelte/transition';
	import { onMount } from 'svelte';

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
			class="relative z-10 flex flex-col-reverse items-center justify-between gap-16 px-6 py-24 md:flex-row md:px-24"
		>
			<!-- Texto -->
			<div class="space-y-8 text-center md:w-1/2 md:text-left" in:fly={{ x: -40, duration: 600 }}>
				<h1 class="text-5xl leading-tight font-black tracking-tight drop-shadow-md md:text-6xl">
					Endulza tu vida con <span class="rounded-xl bg-white/50 px-2 py-1 text-pink-500"
						>Victoria Cake</span
					>
				</h1>
				<p class="mx-auto max-w-md text-lg text-gray-600 md:mx-0 md:text-xl">
					Pasteles artesanales con diseño, sabor y magia. Celebra tus momentos con dulzura y estilo.
				</p>
				<div class="flex flex-col justify-center gap-4 sm:flex-row md:justify-start">
					<a
						href="/catalogo"
						class="transform rounded-full bg-pink-500 px-8 py-4 text-lg font-semibold text-white shadow-lg transition duration-300 hover:scale-105 hover:bg-pink-600 hover:shadow-2xl"
					>
						🎂 Ver Catálogo
					</a>
					<a
						href="/contacto"
						class="rounded-full border-2 border-pink-500 px-8 py-4 text-lg font-semibold text-pink-500 transition-all duration-300 hover:scale-105 hover:bg-pink-100"
					>
						📞 Contáctanos
					</a>
				</div>
			</div>

			<!-- Imagen -->
			<div class="relative md:w-1/2" in:fly={{ x: 40, duration: 600 }}>
				<div class="group relative mx-auto w-full max-w-md overflow-hidden rounded-3xl shadow-2xl">
					<img
						src="https://i.pinimg.com/originals/4c/5e/21/4c5e215b1269487111c5a5ae5b1821dd.jpg"
						alt="Pastel decorado"
						class="h-auto w-full object-cover transition-transform duration-700 group-hover:scale-105"
						loading="lazy"
					/>
					<!-- Botón oculto (se ve igual, pero es clickeable) -->
					<div
						class="absolute bottom-4 left-4 cursor-pointer rounded-full bg-white/90 px-5 py-2 text-sm font-medium text-pink-600 shadow-md backdrop-blur-md select-none"
						title="Victoria Cake"
						on:click={() => (window.location.href = '/login')}
					>
						Hecho con amor ♥
					</div>
				</div>
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

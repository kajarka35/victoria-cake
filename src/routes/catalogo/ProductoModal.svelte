<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { fly, fade } from 'svelte/transition';

	export let producto: {
		id: number;
		nombre: string;
		descripcion: string;
		precio: string;
		imagen: string;
		ingredientes?: string;
		tamano?: string;
		galeria?: string[];
	};

	const dispatch = createEventDispatcher();

	let touchStartY = 0;
	let translateY = 0;
	let modalRef: HTMLDivElement;

	function onTouchStart(e: TouchEvent) {
		if (window.innerWidth >= 768) return;
		touchStartY = e.touches[0].clientY;
	}

	function onTouchMove(e: TouchEvent) {
		if (window.innerWidth >= 768) return;
		const deltaY = e.touches[0].clientY - touchStartY;
		if (deltaY > 0) {
			translateY = deltaY;
			modalRef.style.transform = `translateY(${translateY}px)`;
		}
	}

	function onTouchEnd() {
		if (window.innerWidth >= 768) return;
		if (translateY > 80) {
			dispatch('cerrar');
		} else {
			modalRef.style.transition = 'transform 200ms ease';
			modalRef.style.transform = 'translateY(0)';
			setTimeout(() => (modalRef.style.transition = ''), 200);
		}
		translateY = 0;
	}
</script>

<div
	class="animate-blur-in fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm"
	on:click={() => dispatch('cerrar')}
	in:fade={{ duration: 200 }}
	out:fade={{ duration: 200 }}
>
	<div
		bind:this={modalRef}
		class="animate-modal relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-5 shadow-xl sm:max-w-lg sm:p-6 dark:bg-gray-800"
		on:click|stopPropagation
		on:touchstart={onTouchStart}
		on:touchmove={onTouchMove}
		on:touchend={onTouchEnd}
		in:fly={{ y: 20, duration: 300, opacity: 0.2 }}
		out:fly={{ y: 20, duration: 200, opacity: 0 }}
	>
		<button
			aria-label="Cerrar modal"
			class="close-button absolute top-4 right-4 flex h-9 w-9 items-center justify-center rounded-full text-gray-500 transition hover:bg-gray-100 hover:text-gray-700 active:scale-95 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
			on:click={() => dispatch('cerrar')}
		>
			✕
		</button>

		<h3 class="mb-4 text-center text-xl font-bold text-pink-600 sm:text-2xl dark:text-pink-400">
			{producto.nombre}
		</h3>

		<img
			src={producto.imagen}
			alt={producto.nombre}
			class="mb-4 max-h-64 w-full rounded-xl bg-white object-contain p-2 shadow-sm sm:max-h-72 dark:bg-gray-900"
		/>

		<div class="space-y-2 text-sm text-gray-700 sm:text-base dark:text-gray-300">
			<p><strong>Descripción:</strong> {producto.descripcion}</p>
			{#if producto.ingredientes}
				<p><strong>Ingredientes:</strong> {producto.ingredientes}</p>
			{/if}
			{#if producto.tamano}
				<p><strong>Tamaño:</strong> {producto.tamano}</p>
			{/if}
		</div>

		<p class="mt-5 text-center text-lg font-bold text-pink-600 sm:text-xl dark:text-pink-400">
			{producto.precio}
		</p>

		<button
			class="mt-6 w-full rounded-xl bg-pink-500 py-3 text-base font-semibold text-white shadow-md transition hover:bg-pink-600 active:scale-95 sm:text-sm"
			on:click={() => dispatch('pedirWhatsApp')}
		>
			💬 Pedir este pastel
		</button>
	</div>
</div>

<style>
	@keyframes modal {
		from {
			opacity: 0;
			transform: scale(0.95) translateY(20px);
		}
		to {
			opacity: 1;
			transform: scale(1) translateY(0);
		}
	}
	@keyframes blur-in {
		from {
			opacity: 0;
			backdrop-filter: blur(0px);
		}
		to {
			opacity: 1;
			backdrop-filter: blur(4px);
		}
	}
	@keyframes fade-in-scale {
		from {
			opacity: 0;
			transform: scale(0.8);
		}
		to {
			opacity: 1;
			transform: scale(1);
		}
	}
	.animate-modal {
		animation: modal 0.4s ease-out both;
	}
	.animate-blur-in {
		animation: blur-in 0.4s ease-out both;
	}
	.close-button {
		animation: fade-in-scale 0.3s ease-out both;
		animation-delay: 0.15s;
	}
	.overflow-y-auto::-webkit-scrollbar {
		width: 0;
		background: transparent;
	}
</style>

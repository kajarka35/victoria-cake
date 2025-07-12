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
			setTimeout(() => {
				modalRef.style.transition = '';
			}, 200);
		}
		translateY = 0;
	}
</script>

<!-- Overlay -->
<div
	class="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/40 backdrop-blur-sm animate-blur-in"
	on:click={() => dispatch('cerrar')}
	in:fade={{ duration: 200 }}
	out:fade={{ duration: 200 }}
>
	<!-- Modal -->
	<div
		bind:this={modalRef}
		class="relative w-full max-w-md sm:max-w-lg bg-white dark:bg-gray-800 shadow-xl rounded-2xl max-h-[90vh] overflow-y-auto p-5 sm:p-6 animate-modal"
		on:click|stopPropagation
		on:touchstart={onTouchStart}
		on:touchmove={onTouchMove}
		on:touchend={onTouchEnd}
		in:fly={{ y: 20, duration: 300, opacity: 0.2 }}
		out:fly={{ y: 20, duration: 200, opacity: 0 }}
	>
		<!-- Botón cerrar -->
		<button
			aria-label="Cerrar modal"
			class="absolute top-4 right-4 w-9 h-9 flex items-center justify-center rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-700 transition active:scale-95 close-button"
			on:click={() => dispatch('cerrar')}
		>
			✕
		</button>

		<h3 class="text-xl sm:text-2xl font-bold text-pink-600 dark:text-pink-400 mb-4 text-center">
			{producto.nombre}
		</h3>

		<img
			src={producto.imagen}
			alt={producto.nombre}
			class="w-full max-h-64 sm:max-h-72 object-contain rounded-xl mb-4 bg-white dark:bg-gray-900 p-2 shadow-sm"
		/>

		<div class="space-y-2 text-sm sm:text-base text-gray-700 dark:text-gray-300">
			<p><strong>Descripción:</strong> {producto.descripcion}</p>
			{#if producto.ingredientes}
				<p><strong>Ingredientes:</strong> {producto.ingredientes}</p>
			{/if}
			{#if producto.tamano}
				<p><strong>Tamaño:</strong> {producto.tamano}</p>
			{/if}
		</div>

		<p class="text-lg sm:text-xl font-bold text-pink-600 dark:text-pink-400 mt-5 text-center">
			{producto.precio}
		</p>

		<button
			class="mt-6 w-full bg-pink-500 hover:bg-pink-600 text-white py-3 rounded-xl text-base sm:text-sm font-semibold transition active:scale-95 shadow-md"
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

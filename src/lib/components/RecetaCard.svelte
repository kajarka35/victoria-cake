<script lang="ts">
	import type { Receta } from '$lib/kitchen';
	import { goto } from '$app/navigation';
	import { createEventDispatcher } from 'svelte';
	import { fade, scale } from 'svelte/transition';

	export let receta: Receta;
	export let costoTotal: number = 0;

	const dispatch = createEventDispatcher();
	let confirmando = false;

	function handleEliminar(e: MouseEvent) {
		e.stopPropagation();
		if (!confirmando) {
			confirmando = true;
			setTimeout(() => {
				if (confirmando) confirmando = false;
			}, 3000);
			return;
		}
		dispatch('eliminar', receta.id);
		confirmando = false;
	}
</script>

<article
	class="group relative flex cursor-pointer flex-col overflow-hidden rounded-3xl bg-white/70 shadow-lg backdrop-blur-lg transition duration-300 hover:-translate-y-1 hover:shadow-xl dark:bg-gray-800/60"
	on:click={() => goto(`/admin/recetas/${receta.id}`)}
	on:keypress={() => goto(`/admin/recetas/${receta.id}`)}
	role="button"
	tabindex="0"
>
	<!-- Botón Eliminar (Aparece en hover) -->
	<button
		on:click={handleEliminar}
		class="absolute top-3 right-3 z-10 flex h-8 items-center gap-1 rounded-full px-3 text-xs font-bold transition-all duration-300 {confirmando
			? 'scale-110 bg-red-500 text-white shadow-lg'
			: 'bg-white/50 text-gray-400 opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-500 dark:bg-gray-700/50 dark:text-gray-500 dark:hover:bg-red-900/40 dark:hover:text-red-400'}"
		title={confirmando ? 'Click de nuevo para confirmar' : 'Eliminar Receta'}
	>
		{#if confirmando}
			<span in:scale>¿Seguro? 🗑️</span>
		{:else}
			<span>🗑️</span>
		{/if}
	</button>
	<!-- Header Color por Categoría -->
	<div class="h-2 w-full bg-gradient-to-r from-pink-400 to-purple-500"></div>

	<div class="flex flex-1 flex-col p-5">
		<div class="mb-2 flex items-start justify-between">
			<span
				class="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700 dark:bg-purple-900/40 dark:text-purple-300"
			>
				{receta.categoria}
			</span>
			<span class="text-xs text-gray-500 dark:text-gray-400">
				{receta.porciones_base} porciones ({receta.molde})
			</span>
		</div>

		<h3
			class="mb-1 text-xl font-bold text-gray-900 transition-colors group-hover:text-pink-600 dark:text-white"
		>
			{receta.nombre}
		</h3>

		{#if receta.producto_id}
			<span class="mb-4 flex items-center gap-1 text-xs text-green-600">
				🔗 Vinculado a catálogo
			</span>
		{:else}
			<span class="mb-4 block text-xs text-gray-400"> No vinculado </span>
		{/if}

		<div class="mt-auto border-t border-gray-100 pt-4 dark:border-gray-700">
			<p class="text-xs tracking-wide text-gray-500 uppercase">Costo Producción</p>
			<p
				class="bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-2xl font-extrabold text-transparent"
			>
				${costoTotal.toLocaleString()}
			</p>
			<p class="mt-1 text-xs text-gray-400">
				${Math.round(costoTotal / receta.porciones_base).toLocaleString()} / porción
			</p>
		</div>
	</div>
</article>

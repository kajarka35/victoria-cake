<script lang="ts">
	import { goto } from '$app/navigation';
	import RecetaCard from '$lib/components/RecetaCard.svelte';
	import RecipeWizard from '$lib/components/RecipeWizard.svelte';
	import { supabase } from '$lib/supabaseClient';

	export let data;
	$: recetas = data.recetas;
	$: todosIngredientes = data.todosIngredientes;
	$: todasRecetas = data.todasRecetas;

	let mostrarWizard = false;

	function handleRecetaCreada(event: CustomEvent) {
		const nueva = event.detail;
		mostrarWizard = false;
		goto(`/admin/recetas/${nueva.id}`);
	}

	async function handleEliminarReceta(event: CustomEvent) {
		const id = event.detail;
		const { error } = await supabase.from('recetas').delete().eq('id', id);

		if (error) {
			console.error('Error eliminando receta:', error);
			alert('No se pudo eliminar la receta. Verifica si está siendo usada en producciones.');
			return;
		}

		// Actualizar UI localmente
		data.recetas = data.recetas.filter((r: any) => r.id !== id);
	}
</script>

<svelte:head>
	<title>Recetario Inteligente | Olga's Smart Kitchen</title>
</svelte:head>

<div class="space-y-8">
	<div class="flex flex-col items-center justify-between gap-4 md:flex-row">
		<div>
			<h1
				class="bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-3xl font-extrabold text-transparent dark:from-pink-400 dark:to-purple-400"
			>
				📖 Recetario Inteligente
			</h1>
			<p class="mt-1 text-gray-500 dark:text-gray-400">
				Tus fórmulas maestras con costos calculados en tiempo real.
			</p>
		</div>
		<button
			on:click={() => (mostrarWizard = true)}
			class="flex transform items-center gap-2 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 px-6 py-3 font-bold text-white shadow-lg transition hover:scale-105 hover:from-pink-600 hover:to-purple-700"
		>
			<span>✨ Crear Nueva Receta</span>
		</button>
	</div>

	<div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
		{#each recetas as receta (receta.id)}
			<RecetaCard {receta} costoTotal={receta.costoTotal} on:eliminar={handleEliminarReceta} />
		{/each}

		<!-- Card para agregar visualmente -->
		<button
			on:click={() => (mostrarWizard = true)}
			class="flex h-64 cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed border-pink-200 bg-pink-50/10 transition hover:border-pink-400 hover:bg-pink-50/50 dark:border-gray-700 dark:hover:bg-gray-800/50"
		>
			<span class="mb-2 text-4xl">➕</span>
			<span class="font-medium text-pink-500">Agregar Receta</span>
		</button>
	</div>

	{#if mostrarWizard}
		<RecipeWizard
			{todosIngredientes}
			{todasRecetas}
			on:cerrar={() => (mostrarWizard = false)}
			on:creada={handleRecetaCreada}
		/>
	{/if}
</div>

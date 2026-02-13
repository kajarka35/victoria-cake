<script lang="ts">
	import { supabase } from '$lib/supabaseClient';
	import IngredienteRow from '$lib/components/IngredienteRow.svelte';
	import type { Ingrediente } from '$lib/kitchen';

	export let data;
	let ingredientes: Ingrediente[] = data.ingredientes;
	let nuevoIngrediente: Partial<Ingrediente> | null = null;
	let filtroCategoria = 'todas';
	let busqueda = '';

	async function crearIngrediente(event: CustomEvent) {
		const datos = event.detail;
		/* eslint-disable @typescript-eslint/no-unused-vars */
		const { id, ...payload } = datos; // remove temporary ID if exists

		const { data: insertData, error } = await supabase
			.from('ingredientes')
			.insert([payload])
			.select()
			.single();

		if (error) {
			alert('Error al crear: ' + error.message);
		} else {
			ingredientes = [insertData, ...ingredientes];
			nuevoIngrediente = null;
		}
	}

	async function actualizarIngrediente(event: CustomEvent) {
		const datos = event.detail;
		const { data: updateData, error } = await supabase
			.from('ingredientes')
			.update(datos)
			.eq('id', datos.id)
			.select()
			.single();

		if (error) {
			alert('Error al actualizar: ' + error.message);
		} else {
			ingredientes = ingredientes.map((i) => (i.id === datos.id ? updateData : i));
		}
	}

	async function eliminarIngrediente(event: CustomEvent) {
		const id = event.detail;
		if (!confirm('¿Estás segura de eliminar este ingrediente?')) return;

		const { error } = await supabase.from('ingredientes').delete().eq('id', id);
		if (error) {
			alert('Error al eliminar (posiblemente esté en uso en una receta): ' + error.message);
		} else {
			ingredientes = ingredientes.filter((i) => i.id !== id);
		}
	}

	function iniciarCreacion() {
		nuevoIngrediente = {
			id: 'temp',
			nombre: '',
			unidad: 'g',
			precio: 0,
			cantidad_por_precio: 1000,
			categoria: 'general'
		};
	}

	$: ingredientesFiltrados = ingredientes.filter((i) => {
		const matchCat = filtroCategoria === 'todas' || i.categoria === filtroCategoria;
		const matchSearch = i.nombre.toLowerCase().includes(busqueda.toLowerCase());
		return matchCat && matchSearch;
	});
</script>

<svelte:head>
	<title>Gestión de Insumos | Olga's Smart Kitchen</title>
</svelte:head>

<div class="space-y-6">
	<div class="flex flex-col items-center justify-between gap-4 md:flex-row">
		<div>
			<h1 class="text-3xl font-extrabold text-pink-600 dark:text-pink-400">
				🧮 Gestión de Insumos
			</h1>
			<p class="text-gray-500 dark:text-gray-400">
				Administra los precios y presentaciones de tus ingredientes.
			</p>
		</div>
		<button
			on:click={iniciarCreacion}
			class="transform rounded-full bg-pink-500 px-4 py-2 text-white shadow-lg transition hover:scale-105 hover:bg-pink-600"
		>
			+ Nuevo Ingrediente
		</button>
	</div>

	<!-- Filtros -->
	<div
		class="flex flex-col gap-4 rounded-2xl bg-white/50 p-4 backdrop-blur-sm md:flex-row dark:bg-gray-800/50"
	>
		<input
			type="text"
			bind:value={busqueda}
			placeholder="🔍 Buscar ingrediente..."
			class="flex-1 rounded-xl border-pink-200 bg-white px-4 py-2 focus:border-pink-500 focus:ring-pink-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
		/>
		<select
			bind:value={filtroCategoria}
			class="rounded-xl border-pink-200 bg-white px-4 py-2 focus:border-pink-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
		>
			<option value="todas">Todas las categorías</option>
			<option value="harinas">Harinas</option>
			<option value="lacteos">Lácteos</option>
			<option value="grasas">Grasas</option>
			<option value="endulzantes">Endulzantes</option>
			<option value="esencias">Esencias</option>
			<option value="chocolates">Chocolates</option>
			<option value="frutas">Frutas</option>
			<option value="empaques">Empaques</option>
		</select>
	</div>

	<div
		class="overflow-x-auto rounded-2xl border border-pink-100 bg-white/80 shadow-xl backdrop-blur-md dark:border-gray-700 dark:bg-gray-800/80"
	>
		<table class="w-full text-left">
			<thead class="bg-pink-50 text-pink-700 dark:bg-gray-700/50 dark:text-pink-300">
				<tr>
					<th class="rounded-tl-2xl p-4">Nombre</th>
					<th class="p-4">Categoría</th>
					<th class="p-4">Precio</th>
					<th class="p-4">Presentación</th>
					<th class="rounded-tr-2xl p-4 text-right">Acciones</th>
				</tr>
			</thead>
			<tbody class="divide-y divide-pink-100 dark:divide-gray-700">
				{#if nuevoIngrediente}
					<IngredienteRow
						ingrediente={nuevoIngrediente}
						esNuevo={true}
						on:guardar={crearIngrediente}
						on:cancelar={() => (nuevoIngrediente = null)}
					/>
				{/if}

				{#each ingredientesFiltrados as img (img.id)}
					<IngredienteRow
						ingrediente={img}
						on:guardar={actualizarIngrediente}
						on:eliminar={eliminarIngrediente}
					/>
				{:else}
					{#if !nuevoIngrediente}
						<tr>
							<td colspan="5" class="p-8 text-center text-gray-500">
								No se encontraron ingredientes. ¡Crea uno nuevo!
							</td>
						</tr>
					{/if}
				{/each}
			</tbody>
		</table>
	</div>
</div>

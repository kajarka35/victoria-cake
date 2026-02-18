<script lang="ts">
	import { supabase } from '$lib/supabaseClient';
	import IngredienteRow from '$lib/components/IngredienteRow.svelte';
	import CategoryCreator from '$lib/components/CategoryCreator.svelte';
	import CategoryManager from '$lib/components/CategoryManager.svelte';
	import type { Ingrediente, CategoriaIngrediente } from '$lib/kitchen';

	interface IngredienteConUso extends Ingrediente {
		uso_count: number;
	}

	export let data;
	let ingredientes: IngredienteConUso[] = data.ingredientes as unknown as IngredienteConUso[];
	let categorias: CategoriaIngrediente[] = data.categorias as unknown as CategoriaIngrediente[];

	let nuevoIngrediente: Partial<IngredienteConUso> | null = null;
	let filtroCategoria = 'todas';
	let busqueda = '';

	// State for Modals
	let mostrarCreador = false;
	let mostrarManager = false;

	// Sorting
	let sortCol = 'nombre';
	let sortAsc = true;

	function ordenar(col: string) {
		if (sortCol === col) {
			sortAsc = !sortAsc;
		} else {
			sortCol = col;
			sortAsc = true;
		}
	}

	function exportarExcel() {
		const csvContent = [
			['Nombre', 'Categoría', 'Precio', 'Unidad', 'Uso en Recetas'],
			...ingredientes.map((i) => [i.nombre, i.categoria, i.precio, i.unidad, i.uso_count || 0])
		]
			.map((e) => e.join(','))
			.join('\n');

		const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.setAttribute('href', url);
		link.setAttribute('download', 'ingredientes_victoria_cake.csv');
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	}

	function abrirCreadorCategoria() {
		mostrarCreador = true;
	}

	async function recargarCategorias() {
		const { data: newCats } = await supabase
			.from('categorias_ingredientes')
			.select('*')
			.order('nombre');

		if (newCats) {
			categorias = newCats;
		}
	}

	async function guardarNuevaCategoria(event: CustomEvent) {
		const nuevaCat = event.detail; // { nombre, color, icono }

		const { data: inserted, error } = await supabase
			.from('categorias_ingredientes')
			.insert([nuevaCat])
			.select()
			.single();

		if (error) {
			alert('Error al crear categoría: ' + error.message);
		} else {
			// Update local list
			categorias = [...categorias, inserted].sort((a, b) => a.nombre.localeCompare(b.nombre));
			mostrarCreador = false;
		}
	}

	async function crearIngrediente(event: CustomEvent) {
		const datos = event.detail;
		/* eslint-disable @typescript-eslint/no-unused-vars */
		const { id, uso_count, ...payload } = datos;

		const { data: insertData, error } = await supabase
			.from('ingredientes')
			.insert([payload])
			.select()
			.single();

		if (error) {
			alert('Error al crear: ' + error.message);
		} else {
			ingredientes = [{ ...insertData, uso_count: 0 }, ...ingredientes];
			nuevoIngrediente = null;
		}
	}

	async function actualizarIngrediente(event: CustomEvent) {
		const datos = event.detail;
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const { uso_count, ...payload } = datos;

		const { data: updateData, error } = await supabase
			.from('ingredientes')
			.update(payload)
			.eq('id', datos.id)
			.select()
			.single();

		if (error) {
			alert('Error al actualizar: ' + error.message);
		} else {
			ingredientes = ingredientes.map((i) =>
				i.id === datos.id ? { ...updateData, uso_count: i.uso_count } : i
			);
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
			categoria: 'general',
			uso_count: 0
		};
	}

	$: ingredientesFiltrados = ingredientes
		.filter((i) => {
			const matchCat = filtroCategoria === 'todas' || i.categoria === filtroCategoria;
			const matchSearch = i.nombre.toLowerCase().includes(busqueda.toLowerCase());
			return matchCat && matchSearch;
		})
		.sort((a, b) => {
			let valA: any = a[sortCol as keyof IngredienteConUso] ?? '';
			let valB: any = b[sortCol as keyof IngredienteConUso] ?? '';

			if (typeof valA === 'string') valA = valA.toLowerCase();
			if (typeof valB === 'string') valB = valB.toLowerCase();

			if (valA < valB) return sortAsc ? -1 : 1;
			if (valA > valB) return sortAsc ? 1 : -1;
			return 0;
		});
</script>

<svelte:head>
	<title>Gestión de Insumos | Olga's Smart Kitchen</title>
</svelte:head>

<CategoryCreator
	bind:mostrar={mostrarCreador}
	on:guardar={guardarNuevaCategoria}
	on:cancelar={() => (mostrarCreador = false)}
/>

<CategoryManager
	bind:mostrar={mostrarManager}
	{categorias}
	on:actualizar={recargarCategorias}
	on:cerrar={() => (mostrarManager = false)}
/>

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
		<div class="flex gap-3">
			<button
				on:click={exportarExcel}
				class="flex transform items-center gap-2 rounded-full bg-green-500 px-4 py-2 text-white shadow-lg transition hover:scale-105 hover:bg-green-600"
			>
				📥 Exportar
			</button>
			<button
				on:click={iniciarCreacion}
				class="transform rounded-full bg-pink-500 px-4 py-2 text-white shadow-lg transition hover:scale-105 hover:bg-pink-600"
			>
				+ Nuevo Ingrediente
			</button>
		</div>
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
		<div class="flex w-full gap-2 md:w-auto">
			<select
				bind:value={filtroCategoria}
				class="flex-1 rounded-xl border-pink-200 bg-white px-4 py-2 focus:border-pink-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
			>
				<option value="todas">Todas las categorías</option>
				{#each categorias as cat}
					<option value={cat.nombre}>{cat.icono} {cat.nombre}</option>
				{/each}
			</select>
			<button
				on:click={() => (mostrarManager = true)}
				class="rounded-xl border border-gray-200 bg-white p-2 text-gray-500 hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300"
				title="Administrar Categorías"
			>
				⚙️
			</button>
		</div>
	</div>

	<!-- Tabla Premium -->
	<div
		class="overflow-hidden rounded-3xl border border-white/40 bg-white/30 shadow-2xl backdrop-blur-xl dark:border-gray-700 dark:bg-gray-900/40"
	>
		<div class="overflow-x-auto">
			<table class="w-full border-collapse text-left">
				<thead
					class="hidden bg-gradient-to-r from-pink-500/10 to-purple-500/10 md:table-header-group dark:from-pink-900/20 dark:to-purple-900/20"
				>
					<tr>
						<th
							class="cursor-pointer p-5 text-xs font-bold tracking-wider text-pink-600 uppercase hover:text-pink-800 dark:text-pink-400"
							on:click={() => ordenar('nombre')}
						>
							Nombre {sortCol === 'nombre' ? (sortAsc ? '▲' : '▼') : ''}
						</th>
						<th
							class="cursor-pointer p-5 text-xs font-bold tracking-wider text-pink-600 uppercase hover:text-pink-800 dark:text-pink-400"
							on:click={() => ordenar('categoria')}
						>
							Categoría {sortCol === 'categoria' ? (sortAsc ? '▲' : '▼') : ''}
						</th>
						<th
							class="cursor-pointer p-5 text-xs font-bold tracking-wider text-pink-600 uppercase hover:text-pink-800 dark:text-pink-400"
							on:click={() => ordenar('precio')}
						>
							Precio {sortCol === 'precio' ? (sortAsc ? '▲' : '▼') : ''}
						</th>
						<th
							class="cursor-pointer p-5 text-xs font-bold tracking-wider text-pink-600 uppercase hover:text-pink-800 dark:text-pink-400"
							on:click={() => ordenar('unidad')}
						>
							Presentación {sortCol === 'unidad' ? (sortAsc ? '▲' : '▼') : ''}
						</th>
						<th
							class="cursor-pointer p-5 text-xs font-bold tracking-wider text-pink-600 uppercase hover:text-pink-800 dark:text-pink-400"
							on:click={() => ordenar('uso_count')}
						>
							Impacto {sortCol === 'uso_count' ? (sortAsc ? '▲' : '▼') : ''}
						</th>
						<th
							class="p-5 text-right text-xs font-bold tracking-wider text-pink-600 uppercase dark:text-pink-400"
							>Acciones</th
						>
					</tr>
				</thead>
				<tbody class="divide-y divide-pink-50/50 dark:divide-gray-800/50">
					{#if nuevoIngrediente}
						<IngredienteRow
							ingrediente={nuevoIngrediente as Ingrediente}
							esNuevo={true}
							uso={0}
							{categorias}
							on:guardar={crearIngrediente}
							on:cancelar={() => (nuevoIngrediente = null)}
							on:crearCategoria={abrirCreadorCategoria}
						/>
					{/if}

					{#each ingredientesFiltrados as img (img.id)}
						<IngredienteRow
							ingrediente={img}
							uso={img.uso_count}
							{categorias}
							on:guardar={actualizarIngrediente}
							on:eliminar={eliminarIngrediente}
							on:crearCategoria={abrirCreadorCategoria}
						/>
					{:else}
						{#if !nuevoIngrediente}
							<tr>
								<td colspan="5" class="py-20 text-center">
									<div class="flex flex-col items-center gap-3">
										<span class="text-6xl">🍲</span>
										<p class="text-xl font-medium text-gray-500 dark:text-gray-400">
											No se encontraron ingredientes
										</p>
										<button
											on:click={iniciarCreacion}
											class="mt-2 text-sm font-bold text-pink-500 hover:text-pink-700"
										>
											Crear el primero ahora
										</button>
									</div>
								</td>
							</tr>
						{/if}
					{/each}
				</tbody>
			</table>
		</div>
	</div>
</div>

<script lang="ts">
	import { supabase } from '$lib/supabaseClient';
	import { fade, fly } from 'svelte/transition';
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/stores';
	import IngredienteRow from '$lib/components/IngredienteRow.svelte';
	import CategoryCreator from '$lib/components/CategoryCreator.svelte';
	import CategoryManager from '$lib/components/CategoryManager.svelte';
	import type { Ingrediente, CategoriaIngrediente } from '$lib/kitchen';

	interface UltimoCambio {
		variacion_pct: number;
		precio_anterior: number;
		precio_nuevo: number;
		created_at: string;
	}

	interface HistorialEntry {
		ingrediente_id: string;
		precio_anterior: number;
		precio_nuevo: number;
		variacion_pct: number;
		created_at: string;
	}

	// Inteface actualizada con recetas_ids
	interface IngredienteConUso extends Ingrediente {
		uso_count: number;
		ultimo_cambio: UltimoCambio | null;
		proveedores_precios?: any[];
		recetas_ids?: string[]; // Nuevo campo
	}

	export let data;
	let ingredientes: IngredienteConUso[] = data.ingredientes as unknown as IngredienteConUso[];
	let categorias: CategoriaIngrediente[] = data.categorias as unknown as CategoriaIngrediente[];
	let proveedores: { id: string; nombre: string; activo: boolean }[] = data.proveedores || [];
	let recetas: { id: string; nombre: string }[] = data.recetas || []; // Nuevas recetas
	let historialPrecios: HistorialEntry[] = data.historialPrecios || [];
	let tendencias: Record<string, UltimoCambio> = data.tendencias || {};

	let nuevoIngrediente: Partial<IngredienteConUso> | null = null;
	let filtroCategoria = 'todas';

	// Inicializar búsqueda desde URL si existe
	let busqueda = $page.url.searchParams.get('search') || '';

	// Filtro Recetas Multi-select
	let recetasSeleccionadas: Set<string> = new Set();
	let recetaFiltroInput = ''; // Para el select

	function toggleFiltroReceta(id: string) {
		if (id === '') return;
		if (recetasSeleccionadas.has(id)) {
			recetasSeleccionadas.delete(id);
		} else {
			recetasSeleccionadas.add(id);
		}
		recetasSeleccionadas = new Set(recetasSeleccionadas); // Reactividad
		recetaFiltroInput = ''; // Reset select
	}

	// State for Modals
	let mostrarCreador = false;
	let mostrarManager = false;

	// Historial modal
	let mostrarHistorial = false;
	let historialIngrediente: IngredienteConUso | null = null;
	let historialDelIngrediente: HistorialEntry[] = [];

	function verHistorial(event: CustomEvent<string>) {
		const ingId = event.detail;
		historialIngrediente = ingredientes.find((i) => i.id === ingId) || null;
		historialDelIngrediente = historialPrecios.filter((h) => h.ingrediente_id === ingId);
		mostrarHistorial = true;
	}

	function formatCurrency(val: number): string {
		return new Intl.NumberFormat('es-CO', {
			style: 'currency',
			currency: 'COP',
			maximumFractionDigits: 0
		}).format(val);
	}

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
		const { id, uso_count, ultimo_cambio, proveedores_precios, receta_ids, ...payload } = datos;
		// Sanitizar proveedor_id: '' → null para FK UUID
		if (payload.proveedor_id === '' || payload.proveedor_id === undefined) {
			payload.proveedor_id = null;
		}

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
		const { uso_count, ultimo_cambio, proveedores_precios, receta_ids, ...payload } = datos;
		// Sanitizar proveedor_id: '' → null para FK UUID
		if (payload.proveedor_id === '' || payload.proveedor_id === undefined) {
			payload.proveedor_id = null;
		}

		// PROTECCIÓN DE INTEGRIDAD:
		// Si el ingrediente tiene un proveedor principal, el precio/unidad lo dicta la relación N:N.
		// Ignoramos los valores que vienen del formulario (posiblemente obsoletos) para no sobrescribir la DB.
		if (proveedores_precios && proveedores_precios.some((p: any) => p.es_principal)) {
			delete payload.precio;
			delete payload.cantidad_por_precio;
			delete payload.unidad;
			delete payload.proveedor_id;
		}

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
				i.id === datos.id
					? {
							...updateData,
							uso_count: i.uso_count,
							proveedores_precios: i.proveedores_precios,
							recetas_ids: i.recetas_ids
						}
					: i
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

	// === Multi-Proveedor CRUD ===
	async function handleAgregarProveedor(event: CustomEvent) {
		const payload = event.detail;
		const { data: inserted, error } = await supabase
			.from('ingrediente_proveedores')
			.insert([payload])
			.select('*, proveedor:proveedores(id, nombre, activo)')
			.single();

		if (error) {
			alert('Error al agregar proveedor: ' + error.message);
		} else {
			// Actualizar local
			ingredientes = ingredientes.map((i) => {
				if (i.id === payload.ingrediente_id) {
					const pp = [...(i.proveedores_precios || []), inserted];
					// Si trigger sync actualizó precio, refetch
					if (payload.es_principal) {
						return {
							...i,
							proveedores_precios: pp,
							precio: payload.precio,
							cantidad_por_precio: payload.cantidad_por_precio
						};
					}
					return { ...i, proveedores_precios: pp };
				}
				return i;
			});
		}
	}

	async function handleSetPrincipal(event: CustomEvent) {
		const { id: jpId, ingrediente_id } = event.detail;

		// 1. Quitar principal de todos para este ingrediente
		await supabase
			.from('ingrediente_proveedores')
			.update({ es_principal: false })
			.eq('ingrediente_id', ingrediente_id);

		// 2. Marcar el nuevo principal
		const { error } = await supabase
			.from('ingrediente_proveedores')
			.update({ es_principal: true })
			.eq('id', jpId);

		if (error) {
			alert('Error al cambiar principal: ' + error.message);
		} else {
			// Recargar toda la data para garantizar consistencia absoluta.
			await invalidateAll();
		}
	}

	async function handleQuitarProveedor(event: CustomEvent) {
		const { id: jpId, ingrediente_id } = event.detail;
		if (!confirm('¿Quitar este proveedor del ingrediente?')) return;

		const { error } = await supabase.from('ingrediente_proveedores').delete().eq('id', jpId);

		if (error) {
			alert('Error al quitar proveedor: ' + error.message);
		} else {
			ingredientes = ingredientes.map((i) => {
				if (i.id === ingrediente_id) {
					return {
						...i,
						proveedores_precios: (i.proveedores_precios || []).filter((jp) => jp.id !== jpId)
					};
				}
				return i;
			});
		}
	}

	$: ingredientesFiltrados = ingredientes
		.filter((i) => {
			const matchCat = filtroCategoria === 'todas' || i.categoria === filtroCategoria;
			const matchSearch = i.nombre.toLowerCase().includes(busqueda.toLowerCase());

			// Lógica Filtro Recetas (OR inclusivo: si está en alguna de las seleccionadas)
			// Si no hay recetas seleccionadas, pasar todo.
			let matchReceta = true;
			if (recetasSeleccionadas.size > 0) {
				// Verifica si el ingrediente pertenece a AL MENOS UNA de las recetas seleccionadas
				const idsIngrediente = i.recetas_ids || [];
				matchReceta = [...recetasSeleccionadas].some((rId) => idsIngrediente.includes(rId));
			}

			return matchCat && matchSearch && matchReceta;
		})
		.sort((a, b) => {
			// ... (Sort igual)
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
	<div class="flex flex-col gap-4 rounded-2xl bg-white/50 p-4 backdrop-blur-sm dark:bg-gray-800/50">
		<!-- Fila 1: Buscador y Categoría -->
		<div class="flex flex-col gap-4 md:flex-row">
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

		<!-- Fila 2: Filtro por Recetas (Tags) -->
		<div class="flex flex-col gap-2">
			<div class="flex flex-wrap items-center gap-2">
				<span class="text-xs font-bold text-gray-500 uppercase">Filtrar por Receta:</span>

				<!-- Select para agregar -->
				<select
					bind:value={recetaFiltroInput}
					on:change={() => toggleFiltroReceta(recetaFiltroInput)}
					class="rounded-lg border-gray-200 bg-white py-1 pr-8 pl-2 text-xs focus:border-pink-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
				>
					<option value="">+ Agregar filtro...</option>
					{#each recetas as r}
						{#if !recetasSeleccionadas.has(r.id)}
							<option value={r.id}>{r.nombre}</option>
						{/if}
					{/each}
				</select>

				<!-- Tags seleccionados -->
				{#each [...recetasSeleccionadas] as rId}
					{@const r = recetas.find((x) => x.id === rId)}
					{#if r}
						<button
							on:click={() => toggleFiltroReceta(rId)}
							class="flex items-center gap-1 rounded-full bg-pink-100 px-2 py-0.5 text-xs font-bold text-pink-700 transition hover:bg-pink-200 dark:bg-pink-900/30 dark:text-pink-300"
						>
							🍰 {r.nombre}
							<span class="ml-1 text-pink-400 opacity-60 hover:opacity-100">✕</span>
						</button>
					{/if}
				{/each}

				{#if recetasSeleccionadas.size > 0}
					<button
						on:click={() => (recetasSeleccionadas = new Set())}
						class="text-[10px] text-gray-400 underline hover:text-pink-500"
					>
						Limpiar filtros
					</button>
				{/if}
			</div>
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
							{proveedores}
							ultimo_cambio={null}
							on:guardar={crearIngrediente}
							on:cancelar={() => (nuevoIngrediente = null)}
							on:crearCategoria={abrirCreadorCategoria}
							on:verHistorial={verHistorial}
						/>
					{/if}

					{#each ingredientesFiltrados as img (img.id)}
						<IngredienteRow
							ingrediente={img}
							uso={img.uso_count}
							{categorias}
							{proveedores}
							ultimo_cambio={img.ultimo_cambio}
							proveedores_precios={img.proveedores_precios || []}
							on:guardar={actualizarIngrediente}
							on:eliminar={eliminarIngrediente}
							on:crearCategoria={abrirCreadorCategoria}
							on:verHistorial={verHistorial}
							on:agregarProveedor={handleAgregarProveedor}
							on:setPrincipal={handleSetPrincipal}
							on:quitarProveedor={handleQuitarProveedor}
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

<!-- Modal Historial de Precios -->
{#if mostrarHistorial && historialIngrediente}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm"
		transition:fade={{ duration: 200 }}
		on:click|self={() => (mostrarHistorial = false)}
		on:keydown={(e) => e.key === 'Escape' && (mostrarHistorial = false)}
		role="dialog"
		aria-modal="true"
		aria-label="Historial de precios"
	>
		<div
			class="max-h-[80vh] w-full max-w-md space-y-4 overflow-y-auto rounded-3xl border border-white/30 bg-white/95 p-6 shadow-2xl backdrop-blur-xl dark:border-gray-600 dark:bg-gray-800/95"
			in:fly={{ y: 30, duration: 300 }}
		>
			<div class="flex items-center justify-between">
				<h2 class="text-lg font-extrabold text-pink-600 dark:text-pink-400">
					📈 Historial: {historialIngrediente.nombre}
				</h2>
				<button
					on:click={() => (mostrarHistorial = false)}
					class="rounded-lg p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700">✕</button
				>
			</div>

			<div class="rounded-xl bg-pink-50/50 p-3 text-center dark:bg-pink-900/10">
				<div class="text-2xl font-extrabold text-pink-600 dark:text-pink-400">
					{formatCurrency(historialIngrediente.precio)}
				</div>
				<div class="text-xs text-gray-500 dark:text-gray-400">Precio actual</div>
			</div>

			{#if historialDelIngrediente.length === 0}
				<p class="py-8 text-center text-gray-400">Sin cambios de precio registrados</p>
			{:else}
				<div class="space-y-3">
					{#each historialDelIngrediente as cambio, i}
						<div
							class="flex items-center gap-3 rounded-xl border border-gray-100 p-3 dark:border-gray-700"
							in:fly={{ x: -20, duration: 300, delay: i * 50 }}
						>
							<div
								class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-lg
								{cambio.variacion_pct > 0 ? 'bg-red-100 dark:bg-red-900/30' : 'bg-green-100 dark:bg-green-900/30'}"
							>
								{cambio.variacion_pct > 0 ? '📈' : '📉'}
							</div>
							<div class="flex-1">
								<div class="flex items-center gap-2">
									<span class="font-mono text-sm text-gray-400 line-through">
										{formatCurrency(cambio.precio_anterior)}
									</span>
									<span class="text-gray-400">→</span>
									<span class="font-mono text-sm font-bold text-gray-700 dark:text-gray-200">
										{formatCurrency(cambio.precio_nuevo)}
									</span>
									<span
										class="rounded-md px-1.5 py-0.5 text-[10px] font-bold
										{cambio.variacion_pct > 0
											? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
											: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'}"
									>
										{cambio.variacion_pct > 0 ? '+' : ''}{cambio.variacion_pct}%
									</span>
								</div>
								<div class="text-[10px] text-gray-400">
									{new Date(cambio.created_at).toLocaleDateString('es-CO', {
										day: 'numeric',
										month: 'short',
										year: 'numeric'
									})}
								</div>
							</div>
						</div>
					{/each}
				</div>
			{/if}

			<button
				on:click={() => (mostrarHistorial = false)}
				class="w-full rounded-xl bg-gray-100 py-2.5 text-sm font-bold text-gray-600 transition hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
			>
				Cerrar
			</button>
		</div>
	</div>
{/if}

<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { fade } from 'svelte/transition';
	import type { Ingrediente, CategoriaIngrediente } from '$lib/kitchen';

	export let ingrediente: Ingrediente;
	export let esNuevo = false;
	export let uso = 0;
	export let categorias: CategoriaIngrediente[] = [];

	const dispatch = createEventDispatcher();
	let editando = esNuevo;
	let datos = { ...ingrediente };

	// Reactive helper for badge display
	$: categoriaActual = categorias.find((c) => c.nombre === ingrediente.categoria) || {
		nombre: ingrediente.categoria,
		color: 'gray',
		icono: '📦'
	};

	// Map backend colors to Tailwind classes (Safety fallback)
	const colorMap: Record<string, string> = {
		blue: 'bg-blue-100 text-blue-700 ring-blue-500/20 dark:bg-blue-900/40 dark:text-blue-300',
		yellow:
			'bg-yellow-100 text-yellow-700 ring-yellow-500/20 dark:bg-yellow-900/40 dark:text-yellow-300',
		amber:
			'bg-orange-100 text-orange-700 ring-orange-500/20 dark:bg-orange-900/40 dark:text-orange-300',
		brown:
			'bg-amber-900/10 text-amber-800 ring-amber-500/20 dark:bg-amber-900/40 dark:text-amber-300',
		green: 'bg-green-100 text-green-700 ring-green-500/20 dark:bg-green-900/40 dark:text-green-300',
		pink: 'bg-pink-100 text-pink-700 ring-pink-500/20 dark:bg-pink-900/40 dark:text-pink-300',
		purple:
			'bg-purple-100 text-purple-700 ring-purple-500/20 dark:bg-purple-900/40 dark:text-purple-300',
		gray: 'bg-gray-100 text-gray-700 ring-gray-500/20 dark:bg-gray-800/40 dark:text-gray-300',
		red: 'bg-red-100 text-red-700 ring-red-500/20 dark:bg-red-900/40 dark:text-red-300',
		cyan: 'bg-cyan-100 text-cyan-700 ring-cyan-500/20 dark:bg-cyan-900/40 dark:text-cyan-300',
		indigo:
			'bg-indigo-100 text-indigo-700 ring-indigo-500/20 dark:bg-indigo-900/40 dark:text-indigo-300',
		slate: 'bg-slate-100 text-slate-700 ring-slate-500/20 dark:bg-slate-800/40 dark:text-slate-300'
	};

	function getColorClass(colorName: string) {
		return colorMap[colorName] || colorMap['gray'];
	}

	function guardar() {
		if (!datos.nombre || datos.precio < 0) return;
		dispatch('guardar', datos);
		editando = false;
	}

	function cancelar() {
		if (esNuevo) {
			dispatch('cancelar');
		} else {
			datos = { ...ingrediente };
			editando = false;
		}
	}

	function handleCategoryChange() {
		if (datos.categoria === 'nueva') {
			dispatch('crearCategoria');
			// Revertir selección para no quedarnos en "nueva"
			datos.categoria = ingrediente.categoria || 'general';
		}
	}
</script>

<tr
	class="group mb-4 flex flex-col rounded-2xl border border-pink-100 bg-white text-gray-700 shadow-sm transition-all duration-300 hover:bg-white/60 hover:shadow-lg md:table-row dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-300 dark:hover:bg-gray-700/60"
>
	{#if editando}
		<!-- Column 1: Nombre -->
		<td
			class="block w-full border-b border-pink-50 p-4 md:table-cell md:border-0 dark:border-gray-700"
		>
			<span class="mb-1 block text-xs font-bold text-pink-400 md:hidden">Nombre</span>
			<input
				bind:value={datos.nombre}
				class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-bold text-gray-800 outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-200 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
				placeholder="Nombre ingrediente"
			/>
		</td>

		<!-- Column 2: Categoría -->
		<td
			class="block w-full border-b border-pink-50 p-4 md:table-cell md:border-0 dark:border-gray-700"
		>
			<span class="mb-1 block text-xs font-bold text-pink-400 md:hidden">Categoría</span>
			<select
				bind:value={datos.categoria}
				on:change={handleCategoryChange}
				class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-200 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
			>
				{#each categorias as cat}
					<option value={cat.nombre}>{cat.icono} {cat.nombre}</option>
				{/each}
				<option value="nueva">+ Crear nueva...</option>
			</select>
		</td>

		<!-- Column 3: Precio -->
		<td
			class="block w-full border-b border-pink-50 p-4 md:table-cell md:border-0 dark:border-gray-700"
		>
			<span class="mb-1 block text-xs font-bold text-pink-400 md:hidden">Precio</span>
			<div
				class="flex min-w-[100px] items-center gap-1 rounded-xl border border-gray-300 bg-white px-3 py-2 focus-within:border-pink-500 focus-within:ring-2 focus-within:ring-pink-200 dark:border-gray-600 dark:bg-gray-800"
			>
				<span class="font-bold text-pink-500">$</span>
				<input
					type="number"
					bind:value={datos.precio}
					class="w-full bg-transparent text-sm font-bold outline-none dark:text-white"
				/>
			</div>
		</td>

		<!-- Column 4: Presentación & Conversión -->
		<td
			class="block w-full border-b border-pink-50 p-4 md:table-cell md:border-0 dark:border-gray-700"
		>
			<span class="mb-1 block text-xs font-bold text-pink-400 md:hidden">Presentación</span>
			<div class="flex min-w-[160px] flex-col gap-2">
				<!-- Main Unit Picker -->
				<div class="flex items-center gap-2">
					<input
						type="number"
						bind:value={datos.cantidad_por_precio}
						class="w-16 rounded-xl border border-gray-300 bg-white px-2 py-2 text-center text-sm font-medium outline-none focus:border-pink-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
					/>
					<select
						bind:value={datos.unidad}
						class="flex-1 rounded-xl border border-gray-300 bg-white px-1 py-2 text-sm font-bold outline-none focus:border-pink-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
					>
						<option value="g">g</option>
						<option value="ml">ml</option>
						<option value="unidad">ud</option>
						<option value="kg">kg</option>
						<option value="lt">lt</option>
					</select>
				</div>

				<!-- Smart Metrics Section -->
				<div
					class="rounded-xl bg-pink-50/50 p-2 ring-1 ring-pink-100 dark:bg-pink-900/10 dark:ring-pink-800/20"
				>
					<div class="grid grid-cols-2 gap-2">
						<div class="flex flex-col gap-0.5">
							<label
								for="peso_ref_{datos.id || 'new'}"
								class="text-[9px] font-bold text-pink-500 uppercase">Gramos x Ud</label
							>
							<input
								id="peso_ref_{datos.id || 'new'}"
								type="number"
								bind:value={datos.peso_referencia_g}
								placeholder="0"
								class="w-full rounded border border-pink-200 bg-white px-1.5 py-1 text-[10px] font-bold outline-none focus:border-pink-500 dark:border-pink-800 dark:bg-gray-900"
							/>
						</div>
						<div class="flex flex-col gap-0.5">
							<label
								for="merma_{datos.id || 'new'}"
								class="text-[9px] font-bold text-pink-500 uppercase">Aprov. %</label
							>
							<input
								id="merma_{datos.id || 'new'}"
								type="number"
								step="0.01"
								bind:value={datos.factor_merma}
								placeholder="1.0"
								class="w-full rounded border border-pink-200 bg-white px-1.5 py-1 text-[10px] font-bold outline-none focus:border-pink-500 dark:border-pink-800 dark:bg-gray-900"
							/>
						</div>
					</div>
				</div>
			</div>
		</td>

		<!-- Column 5: Impacto (Placeholder) -->
		<td class="hidden border-b border-pink-50 p-4 md:table-cell md:border-0 dark:border-gray-700">
			<div class="flex justify-center">
				<span
					class="rounded-lg bg-gray-50 px-2 py-1 text-xs font-bold text-gray-300 dark:bg-gray-800/50"
					>📊 {uso}</span
				>
			</div>
		</td>
		<!-- Column 6: Acciones -->
		<td class="block w-full p-4 text-right md:table-cell">
			<div class="flex justify-end gap-2">
				<button
					on:click={guardar}
					class="flex h-10 w-10 items-center justify-center rounded-xl bg-green-500 text-white shadow-lg shadow-green-200 transition hover:scale-110 active:scale-95 dark:shadow-none"
					aria-label="Guardar cambios"
					title="Guardar"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-5 w-5"
						viewBox="0 0 20 20"
						fill="currentColor"
					>
						<path
							fill-rule="evenodd"
							d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
							clip-rule="evenodd"
						/>
					</svg>
				</button>
				<button
					on:click={cancelar}
					class="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500 text-white shadow-lg shadow-rose-200 transition hover:scale-110 active:scale-95 dark:shadow-none"
					aria-label="Cancelar edición"
					title="Cancelar"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-5 w-5"
						viewBox="0 0 20 20"
						fill="currentColor"
					>
						<path
							fill-rule="evenodd"
							d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
							clip-rule="evenodd"
						/>
					</svg>
				</button>
			</div>
		</td>
	{:else}
		<td
			class="block w-full border-b border-pink-50 p-4 md:table-cell md:border-0 dark:border-gray-700"
		>
			<div class="flex w-full items-center justify-between">
				<div class="flex flex-col">
					<div
						class="flex items-center gap-2 text-lg font-bold text-gray-800 md:text-base dark:text-white"
					>
						{ingrediente.nombre}
					</div>
				</div>
				<div class="md:hidden">
					<button
						on:click={() => (editando = true)}
						class="rounded-lg p-2 text-blue-500 hover:bg-blue-50 dark:bg-gray-800 dark:text-blue-400"
						>✏️</button
					>
				</div>
			</div>
		</td>
		<td
			class="block flex w-full items-center justify-between border-b border-pink-50 p-4 md:table-cell md:border-0 dark:border-gray-700"
		>
			<span class="text-xs font-bold text-gray-400 uppercase md:hidden">Categoría</span>
			<span
				class="inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ring-1 ring-inset {getColorClass(
					categoriaActual.color
				)}"
			>
				{categoriaActual.icono}
				{categoriaActual.nombre}
			</span>
		</td>
		<td
			class="block flex w-full items-center justify-between border-b border-pink-50 p-4 md:table-cell md:border-0 dark:border-gray-700"
		>
			<span class="text-xs font-bold text-gray-400 uppercase md:hidden">Precio</span>
			<div
				class="origin-right scale-110 transform font-mono font-bold text-gray-700 md:scale-100 dark:text-gray-300"
			>
				${ingrediente.precio.toLocaleString()}
			</div>
		</td>
		<td
			class="block flex w-full items-center justify-between border-b border-pink-50 p-4 md:table-cell md:border-0 dark:border-gray-700"
		>
			<span class="text-xs font-bold text-gray-400 uppercase md:hidden">Presentación</span>
			<div class="text-right text-sm font-medium text-gray-500 dark:text-gray-400">
				<span class="inline">Aprox. </span>
				<span class="font-bold text-pink-500"
					>{ingrediente.cantidad_por_precio} {ingrediente.unidad}</span
				>

				<!-- Intelligence Indicators -->
				<div class="mt-1 flex justify-end gap-2">
					{#if ingrediente.peso_referencia_g}
						<span
							class="rounded bg-pink-100 px-1 text-[10px] font-bold text-pink-600 dark:bg-pink-900/30 dark:text-pink-300"
							title="Peso referencia">⚖️ {ingrediente.peso_referencia_g}g</span
						>
					{/if}
					{#if ingrediente.factor_merma && ingrediente.factor_merma < 1}
						<span
							class="rounded bg-amber-100 px-1 text-[10px] font-bold text-amber-600 dark:bg-amber-900/30 dark:text-amber-300"
							title="Merma activa">✂️ {Math.round(ingrediente.factor_merma * 100)}% útil</span
						>
					{/if}
				</div>
			</div>
		</td>
		<td
			class="block flex w-full items-center justify-between border-b border-pink-50 p-4 md:table-cell md:border-0 dark:border-gray-700"
		>
			<span class="text-xs font-bold text-gray-400 uppercase md:hidden">Impacto</span>
			{#if uso > 0}
				<span
					class="inline-flex items-center gap-1 rounded-md bg-pink-50 px-2 py-0.5 text-xs font-medium text-pink-700 ring-1 ring-pink-700/10 ring-inset dark:bg-pink-900/20 dark:text-pink-400"
					title="Usado en {uso} recetas"
				>
					📊 {uso}
				</span>
			{:else}
				<span class="text-xs text-gray-300">-</span>
			{/if}
		</td>
		<td class="hidden p-4 text-right md:table-cell">
			<div class="flex justify-end gap-2 opacity-0 transition-opacity group-hover:opacity-100">
				<button
					on:click={() => (editando = true)}
					class="rounded-lg p-2 text-blue-500 transition hover:scale-110 hover:bg-blue-50 dark:hover:bg-blue-900/20"
					>✏️</button
				>
				<button
					on:click={() => dispatch('eliminar', ingrediente.id)}
					class="rounded-lg p-2 text-red-500 transition hover:scale-110 hover:bg-red-50 dark:hover:bg-red-900/20"
					>🗑️</button
				>
			</div>
		</td>
	{/if}
</tr>

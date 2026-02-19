<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { fade, slide } from 'svelte/transition';
	import type { Ingrediente, CategoriaIngrediente, IngredienteProveedor } from '$lib/kitchen';

	export let ingrediente: Ingrediente;
	export let esNuevo = false;
	export let uso = 0;
	export let categorias: CategoriaIngrediente[] = [];

	// Pro V3: proveedores y tendencia
	interface ProveedorSimple {
		id: string;
		nombre: string;
		activo: boolean;
	}
	interface UltimoCambio {
		variacion_pct: number;
		precio_anterior: number;
		precio_nuevo: number;
		created_at: string;
	}
	export let proveedores: ProveedorSimple[] = [];
	export let ultimo_cambio: UltimoCambio | null = null;

	// Multi-Proveedor N:N
	export let proveedores_precios: IngredienteProveedor[] = [];

	const dispatch = createEventDispatcher();
	let editando = esNuevo;
	let datos = { ...ingrediente };

	// Estado mini-tabla proveedores
	let mostrarAgregarProv = false;
	let nuevoProvId = '';
	let nuevoPrecio = 0;
	let nuevaCantPrecio = 1000;
	let nuevaUnidad = 'g';

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
			datos.categoria = ingrediente.categoria || 'general';
		}
	}

	// Multi-proveedor: Agregar
	function agregarProveedor() {
		if (!nuevoProvId || nuevoPrecio <= 0) return;
		dispatch('agregarProveedor', {
			ingrediente_id: ingrediente.id,
			proveedor_id: nuevoProvId,
			precio: nuevoPrecio,
			cantidad_por_precio: nuevaCantPrecio,
			unidad: nuevaUnidad,
			es_principal: proveedores_precios.length === 0
		});
		mostrarAgregarProv = false;
		nuevoProvId = '';
		nuevoPrecio = 0;
		nuevaCantPrecio = 1000;
		nuevaUnidad = 'g';
	}

	function setPrincipal(jpId: string) {
		dispatch('setPrincipal', { id: jpId, ingrediente_id: ingrediente.id });
	}

	function quitarProveedor(jpId: string) {
		dispatch('quitarProveedor', { id: jpId, ingrediente_id: ingrediente.id });
	}

	function formatPrecioGramo(precio: number, cantidad: number, unidad: string): string {
		if (!precio || !cantidad) return '-';

		// Normalizar a unidad base
		let baseQty = cantidad;
		let baseUnit = unidad;

		if (unidad === 'kg') {
			baseQty = cantidad * 1000;
			baseUnit = 'g';
		} else if (unidad === 'lb') {
			baseQty = cantidad * 500;
			baseUnit = 'g';
		} else if (unidad === 'lt') {
			baseQty = cantidad * 1000;
			baseUnit = 'ml';
		}

		if (baseQty <= 0) return '-';
		const costPerUnit = precio / baseQty;

		// Formato inteligente: si es muy pequeño (<1), mostrar 100g/100ml
		if (costPerUnit < 1 && (baseUnit === 'g' || baseUnit === 'ml')) {
			return `$${(costPerUnit * 1000).toFixed(0)}/kg`; // Mostrar por Kilo para legibilidad
		}

		return `$${costPerUnit.toFixed(1)}/${baseUnit}`;
	}

	// Mejor precio disponible (para el indicador 💡)
	// Solo si es significativamente mejor (>1% diferencia) y no es el mismo
	$: mejorPrecioJp =
		proveedores_precios.length > 1
			? proveedores_precios.reduce((best, jp) => {
					const ppgBest = best.precio / (best.cantidad_por_precio || 1);
					const ppgCurrent = jp.precio / (jp.cantidad_por_precio || 1);
					return ppgCurrent < ppgBest ? jp : best;
				})
			: null;

	$: principalJp = proveedores_precios.find((jp) => jp.es_principal);

	$: hayMejorPrecio =
		mejorPrecioJp &&
		principalJp &&
		mejorPrecioJp.id !== principalJp.id &&
		mejorPrecioJp.precio / mejorPrecioJp.cantidad_por_precio <
			(principalJp.precio / principalJp.cantidad_por_precio) * 0.99;

	// Proveedores aún no asociados (para el select de agregar)
	$: proveedoresDisponibles = proveedores.filter(
		(p) => !proveedores_precios.some((jp) => jp.proveedor_id === p.id)
	);

	// Nombre del proveedor: Prioridad al principal de la junction (busco en lista global por ID por si jp.proveedor falta)
	$: proveedorDelPrincipal = principalJp
		? proveedores.find((p) => p.id === principalJp.proveedor_id)
		: null;

	$: proveedorNombre =
		proveedorDelPrincipal?.nombre ||
		principalJp?.proveedor?.nombre ||
		proveedores.find((p) => p.id === ingrediente.proveedor_id)?.nombre ||
		'';
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

		<!-- Column 3: Precio + Multi-Proveedor -->
		<td
			class="block w-full border-b border-pink-50 p-4 md:table-cell md:border-0 dark:border-gray-700"
		>
			<span class="mb-1 block text-xs font-bold text-pink-400 md:hidden">Precio & Proveedores</span>

			<!-- Precio principal (solo lectura si hay proveedores en junction) -->
			<div
				class="flex min-w-[100px] items-center gap-1 rounded-xl border border-gray-300 bg-white px-3 py-2 focus-within:border-pink-500 focus-within:ring-2 focus-within:ring-pink-200 dark:border-gray-600 dark:bg-gray-800"
			>
				<span class="font-bold text-pink-500">$</span>
				{#if proveedores_precios.length > 0}
					<span
						class="w-full text-sm font-bold text-gray-500 dark:text-gray-400"
						title="Sincronizado desde proveedor principal ⭐">{datos.precio.toLocaleString()}</span
					>
					<span class="text-[9px] text-pink-400">🔒sync</span>
				{:else}
					<input
						type="number"
						bind:value={datos.precio}
						class="w-full bg-transparent text-sm font-bold outline-none dark:text-white"
					/>
				{/if}
			</div>

			<!-- Mini-Tabla Proveedores -->
			{#if !esNuevo}
				<div
					class="mt-2 rounded-lg border border-pink-200/50 bg-pink-50/30 p-2 dark:border-gray-600 dark:bg-gray-900/30"
				>
					<div class="mb-1 flex items-center justify-between">
						<span class="text-[9px] font-bold text-pink-500 uppercase"
							>🏪 Proveedores ({proveedores_precios.length})</span
						>
						{#if proveedoresDisponibles.length > 0}
							<button
								on:click={() => (mostrarAgregarProv = !mostrarAgregarProv)}
								class="rounded-md bg-pink-100 px-2 py-0.5 text-[10px] font-bold text-pink-600 transition hover:bg-pink-200 dark:bg-pink-900/30 dark:text-pink-400"
							>
								{mostrarAgregarProv ? '✕' : '+ Agregar'}
							</button>
						{/if}
					</div>

					<!-- Lista de proveedores existentes -->
					{#each proveedores_precios as jp (jp.id)}
						<div
							class="mt-1 flex items-center gap-1.5 rounded-md px-1.5 py-1 text-[11px] transition
								{jp.es_principal
								? 'bg-amber-50 ring-1 ring-amber-300/50 dark:bg-amber-900/20 dark:ring-amber-700/30'
								: 'hover:bg-white/50 dark:hover:bg-gray-800/50'}"
							transition:slide|local={{ duration: 200 }}
						>
							<!-- Botón principal -->
							<button
								on:click={() => setPrincipal(jp.id)}
								class="flex-shrink-0 text-sm transition hover:scale-125"
								title={jp.es_principal ? 'Proveedor principal' : 'Marcar como principal'}
							>
								{jp.es_principal ? '⭐' : '☆'}
							</button>

							<!-- Info -->
							<span class="flex-1 truncate font-medium text-gray-700 dark:text-gray-300">
								{jp.proveedor?.nombre || '?'}
							</span>
							<span class="font-mono font-bold text-gray-800 dark:text-gray-200">
								${jp.precio.toLocaleString()}
							</span>
							<span class="text-gray-400">
								/{jp.cantidad_por_precio}{jp.unidad}
							</span>
							<span
								class="rounded bg-gray-100 px-1 text-[9px] font-bold text-gray-500 dark:bg-gray-700 dark:text-gray-400"
							>
								{formatPrecioGramo(jp.precio, jp.cantidad_por_precio, jp.unidad)}
							</span>

							<!-- Eliminar -->
							{#if !jp.es_principal}
								<button
									on:click={() => quitarProveedor(jp.id)}
									class="flex-shrink-0 text-red-400 transition hover:scale-125 hover:text-red-600"
									title="Quitar proveedor">🗑️</button
								>
							{/if}
						</div>
					{/each}

					<!-- Sin proveedores -->
					{#if proveedores_precios.length === 0}
						<p class="py-1 text-center text-[10px] text-gray-400">Sin proveedores asignados</p>
					{/if}

					<!-- Formulario agregar -->
					{#if mostrarAgregarProv}
						<div
							class="mt-2 rounded-lg bg-white p-2 ring-1 ring-pink-200 dark:bg-gray-800 dark:ring-gray-600"
							transition:slide|local={{ duration: 200 }}
						>
							<select
								bind:value={nuevoProvId}
								class="mb-1 w-full rounded border border-gray-200 px-2 py-1 text-[11px] dark:border-gray-600 dark:bg-gray-900 dark:text-white"
							>
								<option value="">Seleccionar proveedor...</option>
								{#each proveedoresDisponibles as prov}
									<option value={prov.id}>🏪 {prov.nombre}</option>
								{/each}
							</select>
							<div class="flex gap-1">
								<div
									class="flex items-center gap-0.5 rounded border border-gray-200 px-1 dark:border-gray-600"
								>
									<span class="text-[10px] text-pink-500">$</span>
									<input
										type="number"
										bind:value={nuevoPrecio}
										placeholder="Precio"
										class="w-14 bg-transparent py-1 text-[11px] font-bold outline-none dark:text-white"
									/>
								</div>
								<input
									type="number"
									bind:value={nuevaCantPrecio}
									class="w-12 rounded border border-gray-200 px-1 py-1 text-center text-[11px] dark:border-gray-600 dark:bg-gray-900 dark:text-white"
								/>
								<select
									bind:value={nuevaUnidad}
									class="rounded border border-gray-200 px-1 py-1 text-[11px] dark:border-gray-600 dark:bg-gray-900 dark:text-white"
								>
									<option value="g">g</option>
									<option value="ml">ml</option>
									<option value="kg">kg</option>
									<option value="unidad">ud</option>
								</select>
								<button
									on:click={agregarProveedor}
									disabled={!nuevoProvId || nuevoPrecio <= 0}
									class="rounded bg-green-500 px-2 py-1 text-[10px] font-bold text-white transition hover:bg-green-600 disabled:opacity-30"
									>✓</button
								>
							</div>
						</div>
					{/if}
				</div>
			{/if}
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
			<div class="flex items-center gap-2">
				<button
					on:click={() => dispatch('verHistorial', ingrediente.id)}
					class="origin-right scale-110 transform cursor-pointer font-mono font-bold text-gray-700 transition hover:text-pink-600 md:scale-100 dark:text-gray-300 dark:hover:text-pink-400"
					title="Click para ver historial de precios"
				>
					${ingrediente.precio.toLocaleString()}
				</button>
				{#if ultimo_cambio}
					<span
						class="rounded-md px-1.5 py-0.5 text-[10px] font-bold
						{ultimo_cambio.variacion_pct > 0
							? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
							: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'}"
						title="Último cambio: ${ultimo_cambio.precio_anterior} → ${ultimo_cambio.precio_nuevo}"
					>
						{ultimo_cambio.variacion_pct > 0 ? '↑' : '↓'}
						{Math.abs(ultimo_cambio.variacion_pct)}%
					</span>
				{/if}
			</div>
			{#if proveedorNombre}
				<div class="mt-0.5 flex items-center gap-1">
					<span class="text-[10px] text-gray-400 dark:text-gray-500">🏪 {proveedorNombre}</span>
					{#if proveedores_precios.length > 1}
						<span
							class="rounded bg-pink-100 px-1 text-[9px] font-bold text-pink-500 dark:bg-pink-900/30"
						>
							+{proveedores_precios.length - 1}
						</span>
					{/if}
				</div>
			{/if}
			{#if hayMejorPrecio && mejorPrecioJp}
				<div class="mt-0.5 text-[9px] text-green-600 dark:text-green-400">
					💡 {mejorPrecioJp.proveedor?.nombre} tiene {formatPrecioGramo(
						mejorPrecioJp.precio,
						mejorPrecioJp.cantidad_por_precio,
						mejorPrecioJp.unidad
					)}
				</div>
			{/if}
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

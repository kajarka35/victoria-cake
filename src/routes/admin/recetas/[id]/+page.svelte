<script lang="ts">
	import { supabase } from '$lib/supabaseClient';
	import {
		escalarCantidad,
		calcularCostoReceta,
		calcularPesoReceta, // New
		calcularCostoPorGramo, // New
		calcularCostoIngrediente,
		calcularCostoCIF,
		calcularUtilidad,
		calcularPrecioVenta,
		calcularPorcionesEstandar, // Amarena
		calcularFactorMolde, // Amarena
		MOLDES_AMARENA_REF, // Amarena
		formatCurrency,
		type Receta,
		type RecipeComposition,
		type Ingrediente
	} from '$lib/kitchen';
	import EscaladorSlider from '$lib/components/EscaladorSlider.svelte';
	import { fade } from 'svelte/transition';

	export let data;

	let receta = data.receta as Receta;
	// Composición combinada (Ingredientes + Sub-recetas)
	let composicion = receta.composicion || [];

	let todosIngredientes = data.todosIngredientes as Ingrediente[];
	let todasRecetas = data.todasRecetas as Receta[]; // Para selector de sub-recetas
	let productos = data.productos;

	let porcionesActuales = receta.porciones_base;
	let modoEdicion = false;

	// Estado para agregar Item
	let tipoItemAgregar: 'MATERIAL' | 'RECIPE' = 'MATERIAL';
	let nuevoItemId = '';
	let nuevaCantidad = 0;

	// Reactividad: Costos
	// Ahora pasamos la receta COMPLETA a calcularCostoReceta, que es recursiva
	// Nota: Para que sea reactivo a cambios en 'composicion', debemos asegurarnos
	// que 'receta.composicion' esté sincronizado con la variable local 'composicion'
	$: receta.composicion = composicion;
	$: costoBase = calcularCostoReceta(receta);

	$: factorEscalado = porcionesActuales / receta.porciones_base;
	$: costoEscalado = costoBase * factorEscalado;
	$: costoPorPorcion = costoEscalado / (porcionesActuales || 1);

	// --- Producción Amarena ---
	// Preferir el peso calculado sumando ingredientes (más preciso según metodología Amarena "Sumatoria mezcla")
	// Si da 0 (ej. receta nueva), usar el manual si existe.
	$: pesoCalculado = calcularPesoReceta(receta);
	$: pesoBaseReceta = pesoCalculado > 0 ? pesoCalculado : receta.rendimiento_base_g || 0;
	$: pesoTotalEscalado = pesoBaseReceta * factorEscalado;
	$: porcionesAmarena = calcularPorcionesEstandar(pesoTotalEscalado);

	// Estado Calculadora Moldes & Lotes
	let moldeObjetivoCm = 14;
	let tipoBatido: 'PONQUE' | 'SEMILIQUIDO' = 'PONQUE';
	let paxObjetivo = 0; // Para "Planificar Producción por Personas"

	function aplicarEscaladoMolde() {
		// Asumimos que el molde base de la receta es el campo "molde" (parsear número)
		// o usar un default si no está definido.
		const moldeBaseCm = parseInt(receta.molde || '14') || 14;

		const factor = calcularFactorMolde(moldeBaseCm, moldeObjetivoCm, tipoBatido);

		// Ajustar porciones actuales basado en el factor
		// Si Base = 8 porciones. Factor = 2. Nuevo = 16.
		porcionesActuales = Math.round(receta.porciones_base * factor * 10) / 10;

		alert(
			`Escalado a molde ${moldeObjetivoCm}cm (Factor: ${factor.toFixed(2)}x). Nuevo peso aprox: ${Math.round(pesoBaseReceta * factor)}g`
		);
	}

	function aplicarEscaladoPax() {
		if (!paxObjetivo || paxObjetivo <= 0) return;

		// Paso 1: Masa Total = 65g * Personas
		const masaTotalNecesaria = paxObjetivo * 65;

		// Paso 2: Multiplicador = Masa Total / Peso Base Receta
		// Nota: pesoBaseReceta ya se calcula sumando ingredientes (975.3g en ejemplo)
		const factor = masaTotalNecesaria / pesoBaseReceta;

		// Ajustamos las porciones "visuales" para que reflejen el nuevo factor
		porcionesActuales = Math.round(receta.porciones_base * factor * 10) / 10;

		alert(
			`Planificación ${paxObjetivo} Pax Amarena:\nMasa Req: ${masaTotalNecesaria}g\nMultiplicador Receta: ${factor.toFixed(2)}x`
		);
	}
	async function guardarCambiosReceta() {
		const { error } = await supabase
			.from('recetas')
			.update({
				nombre: receta.nombre,
				categoria: receta.categoria,
				porciones_base: receta.porciones_base,
				rendimiento_base_g: receta.rendimiento_base_g, // Nuevo campo V2
				molde: receta.molde,
				temperatura: receta.temperatura,
				tiempo_horneado: receta.tiempo_horneado,
				instrucciones: receta.instrucciones,
				producto_id: receta.producto_id,
				porcentaje_cif: receta.porcentaje_cif,
				porcentaje_utilidad: receta.porcentaje_utilidad,
				costo_empaque: receta.costo_empaque,
				notas: receta.notas
			})
			.eq('id', receta.id);

		if (error) alert('Error guardando: ' + error.message);
		else modoEdicion = false;
	}

	async function agregarItem() {
		if (!nuevoItemId || nuevaCantidad <= 0) return;

		let nuevoItemBase: Partial<RecipeComposition> = {
			parent_recipe_id: receta.id,
			cantidad: nuevaCantidad,
			unidad: 'g' // Por defecto
		};

		if (tipoItemAgregar === 'MATERIAL') {
			const ing = todosIngredientes.find((i) => i.id === nuevoItemId);
			if (!ing) return;
			nuevoItemBase.child_ingredient_id = nuevoItemId;
			nuevoItemBase.unidad = ing.unidad;
		} else {
			const sub = todasRecetas.find((r) => r.id === nuevoItemId);
			if (!sub) return;
			nuevoItemBase.child_recipe_id = nuevoItemId;
			// Las sub-recetas por defecto se miden en gramos (peso) o unidad (si es decoración)
			// Asumimos Gramos si tiene rendimiento_base_g
			nuevoItemBase.unidad = 'g';
		}

		// Insertar en nueva tabla V2
		const { data: nuevoRel, error } = await supabase
			.from('recipe_composition')
			.insert([nuevoItemBase])
			.select()
			.single();

		if (error) {
			alert('Error al agregar: ' + error.message);
		} else {
			// Optimistic Update
			// Necesitamos reconstruir el objeto completo para la UI
			let itemCompleto: RecipeComposition = { ...nuevoRel } as RecipeComposition;

			if (tipoItemAgregar === 'MATERIAL') {
				itemCompleto.ingrediente = todosIngredientes.find((i) => i.id === nuevoItemId);
			} else {
				itemCompleto.sub_receta = todasRecetas.find((r) => r.id === nuevoItemId);
			}

			composicion = [...composicion, itemCompleto];
			nuevoItemId = '';
			nuevaCantidad = 0;
		}
	}

	async function eliminarItem(id: string) {
		// Borrar de tabla V2
		const { error } = await supabase.from('recipe_composition').delete().eq('id', id);

		if (!error) {
			composicion = composicion.filter((i) => i.id !== id);
		} else {
			alert('Error eliminando: ' + error.message);
		}
	}
</script>

```
<svelte:head>
	<title>{receta.nombre} | Smart Kitchen V2</title>
</svelte:head>

<div class="mx-auto max-w-6xl pb-20">
	<!-- Header Hero -->
	<header
		class="relative mb-8 overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-500 to-purple-700 p-8 text-white shadow-2xl transition-all duration-500"
	>
		<div
			class="absolute top-0 right-0 translate-x-1/2 -translate-y-1/2 transform animate-pulse rounded-full bg-white p-48 opacity-5 blur-3xl"
		></div>

		<div class="relative z-10 flex flex-col justify-between gap-6 md:flex-row">
			<div class="flex-1 space-y-4">
				{#if modoEdicion}
					<input
						bind:value={receta.nombre}
						class="w-full rounded bg-white/20 px-4 py-2 text-4xl font-bold placeholder-white/50 backdrop-blur-sm"
					/>
					<div class="flex flex-wrap gap-2">
						<select
							bind:value={receta.categoria}
							class="rounded border-none bg-white/20 px-3 py-1 text-sm text-white backdrop-blur-sm"
						>
							<option value="tortas" class="text-black">Tortas</option>
							<option value="rellenos" class="text-black">Rellenos</option>
							<option value="postres" class="text-black">Postres</option>
							<option value="coberturas" class="text-black">Coberturas</option>
							<option value="bases" class="text-black">Bases</option>
						</select>
						<input
							bind:value={receta.molde}
							placeholder="Molde"
							class="w-32 rounded bg-white/20 px-3 text-sm placeholder-white/60 backdrop-blur-sm"
						/>
						<div class="flex items-center gap-1 rounded bg-white/20 px-3 text-sm">
							<span>⚖️ Rinde:</span>
							<input
								type="number"
								bind:value={receta.rendimiento_base_g}
								class="w-20 bg-transparent font-bold text-white outline-none"
								placeholder="0"
							/>
							<span>g</span>
						</div>
					</div>
				{:else}
					<h1 class="text-5xl font-extrabold tracking-tight">{receta.nombre}</h1>
					<div class="flex flex-wrap items-center gap-3 text-sm font-medium text-indigo-100">
						<span class="rounded-full border border-white/10 bg-white/20 px-3 py-1 backdrop-blur-md"
							>{receta.categoria}</span
						>
						<span class="flex items-center gap-1"
							><span class="opacity-70">📏</span> {receta.molde || 'N/A'}</span
						>
						<span class="flex items-center gap-1"
							><span class="opacity-70">⚖️</span> Rinde {receta.rendimiento_base_g || 0}g</span
						>
						{#if receta.temperatura}<span>🌡️ {receta.temperatura}°C</span>{/if}
					</div>
				{/if}
			</div>

			<!-- Costeo Box (Metodología Amarena) -->
			<div
				class="min-w-[300px] rounded-2xl border border-white/20 bg-white/10 p-6 shadow-xl backdrop-blur-md"
			>
				<p class="mb-4 text-xs font-bold tracking-widest text-indigo-200 uppercase">
					Estructura de Precio
				</p>

				<!-- Bloque de Totales -->
				<div class="space-y-1">
					<div class="flex justify-between text-sm text-indigo-100">
						<span>Costo Primo (MP):</span>
						<span>{formatCurrency(costoEscalado)}</span>
					</div>
					<div class="flex justify-between text-sm text-indigo-100">
						<span>+ CIF ({receta.porcentaje_cif || 20}%):</span>
						<span>{formatCurrency(calcularCostoCIF(costoEscalado, receta.porcentaje_cif))}</span>
					</div>
					<div class="my-1 border-t border-white/10"></div>
					<div class="flex justify-between font-bold text-white">
						<span>Costo Real ({receta.porcentaje_cif || 20}% CIF):</span>
						<span
							>{formatCurrency(
								costoEscalado + calcularCostoCIF(costoEscalado, receta.porcentaje_cif)
							)}</span
						>
					</div>
					<div class="flex justify-end text-[10px] text-indigo-300 opacity-80">
						<span
							>(Costo x Gramo: {formatCurrency(
								calcularCostoPorGramo(
									costoEscalado + calcularCostoCIF(costoEscalado, receta.porcentaje_cif),
									pesoTotalEscalado
								)
							)})</span
						>
					</div>

					<!-- Separador -->
					<div class="my-2 border-t border-white/20"></div>

					<div class="flex justify-between text-sm text-emerald-200">
						<span>+ Utilidad ({receta.porcentaje_utilidad || 30}%):</span>
						<span
							>{formatCurrency(
								calcularUtilidad(
									costoEscalado + calcularCostoCIF(costoEscalado, receta.porcentaje_cif),
									receta.porcentaje_utilidad
								)
							)}</span
						>
					</div>
					<div class="flex justify-between text-sm text-yellow-200">
						<span>+ Empaque:</span>
						<span>{formatCurrency(receta.costo_empaque || 0)}</span>
					</div>
				</div>

				<!-- Precio Final -->
				<div class="mt-4 rounded-xl bg-white/20 p-4 text-center">
					<p class="text-xs text-indigo-200 uppercase">Precio Sugerido</p>
					<p class="text-4xl font-extrabold tracking-tight text-white">
						{formatCurrency(
							calcularPrecioVenta(
								costoEscalado + calcularCostoCIF(costoEscalado, receta.porcentaje_cif),
								calcularUtilidad(
									costoEscalado + calcularCostoCIF(costoEscalado, receta.porcentaje_cif),
									receta.porcentaje_utilidad
								),
								receta.costo_empaque
							)
						)}
					</p>
				</div>

				<div class="mt-4 flex justify-between border-t border-white/20 pt-3 text-xs">
					<span class="opacity-80">Por Porción ({porcionesActuales}):</span>
					<span class="font-bold text-white">
						{formatCurrency(
							calcularPrecioVenta(
								costoEscalado + calcularCostoCIF(costoEscalado, receta.porcentaje_cif),
								calcularUtilidad(
									costoEscalado + calcularCostoCIF(costoEscalado, receta.porcentaje_cif),
									receta.porcentaje_utilidad
								),
								receta.costo_empaque
							) / (porcionesActuales || 1)
						)}
					</span>
				</div>
			</div>
		</div>
	</header>

	<div class="grid grid-cols-1 gap-8 lg:grid-cols-12">
		<!-- Columna Izquierda: Composición (8 cols) -->
		<div class="space-y-6 lg:col-span-8">
			<!-- Panel de Configuración Financiera (Solo Edición) -->
			{#if modoEdicion}
				<section
					class="rounded-3xl border border-emerald-100 bg-emerald-50/50 p-6 shadow-lg dark:border-emerald-900 dark:bg-emerald-900/20"
				>
					<h3 class="mb-4 flex items-center gap-2 font-bold text-emerald-800 dark:text-emerald-200">
						💰 Configuración Financiera
					</h3>
					<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
						<div>
							<label class="mb-1 block text-xs font-bold text-emerald-700 uppercase">
								% CIF (Gas/Luz)
							</label>
							<div class="flex items-center rounded-lg bg-white p-2 shadow-sm">
								<input
									type="number"
									bind:value={receta.porcentaje_cif}
									class="w-full border-none bg-transparent p-0 text-lg font-bold outline-none"
									placeholder="20"
								/>
								<span class="text-gray-400">%</span>
							</div>
						</div>
						<div>
							<label class="mb-1 block text-xs font-bold text-emerald-700 uppercase">
								% Utilidad Deseada
							</label>
							<div class="flex items-center rounded-lg bg-white p-2 shadow-sm">
								<input
									type="number"
									bind:value={receta.porcentaje_utilidad}
									class="w-full border-none bg-transparent p-0 text-lg font-bold outline-none"
									placeholder="30"
								/>
								<span class="text-gray-400">%</span>
							</div>
						</div>
						<div>
							<label class="mb-1 block text-xs font-bold text-emerald-700 uppercase">
								Costo Empaque
							</label>
							<div class="flex items-center rounded-lg bg-white p-2 shadow-sm">
								<span class="mr-1 text-gray-400">$</span>
								<input
									type="number"
									bind:value={receta.costo_empaque}
									class="w-full border-none bg-transparent p-0 text-lg font-bold outline-none"
									placeholder="0"
								/>
							</div>
						</div>
					</div>
				</section>
			{/if}
			<!-- Escalador Visual -->
			<section
				class="rounded-3xl border border-indigo-100 bg-white p-6 shadow-xl transition-all hover:shadow-2xl dark:border-gray-700 dark:bg-gray-800"
			>
				<EscaladorSlider
					min={1}
					max={100}
					bind:value={porcionesActuales}
					label={porcionesActuales === 1 ? 'Porción' : 'Porciones a Producir'}
				/>
			</section>

			<!-- Tabla de Composición Inteligente -->
			<section
				class="overflow-hidden rounded-3xl border border-indigo-50 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800"
			>
				<div
					class="flex items-center justify-between border-b border-indigo-50 bg-indigo-50/50 p-6 dark:border-gray-700 dark:bg-gray-700/30"
				>
					<h2 class="flex items-center gap-2 text-xl font-bold text-gray-800 dark:text-white">
						🧬 Composición (MRP)
					</h2>
					<span
						class="rounded-full border bg-white px-3 py-1 text-xs font-bold text-indigo-600 shadow-sm dark:bg-gray-800 dark:text-indigo-400"
					>
						Base: {receta.porciones_base} pax
					</span>
				</div>

				<table class="w-full text-left">
					<thead
						class="bg-gray-50 text-xs font-semibold tracking-wider text-gray-500 uppercase dark:bg-gray-700 dark:text-gray-400"
					>
						<tr>
							<th class="p-4 pl-6">Tipo</th>
							<th class="p-4">Item</th>
							<th class="p-4 text-right">Cant. Base</th>
							<th
								class="bg-indigo-50/30 p-4 text-right text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-300"
								>Requerido</th
							>
							<th class="p-4 text-right">Costo Est.</th>
							<th class="w-10 p-4"></th>
						</tr>
					</thead>
					<tbody class="divide-y divide-gray-100 dark:divide-gray-700">
						{#each composicion as item (item.id)}
							<!-- Cálculos por item -->
							{@const cantEscalada = escalarCantidad(
								item.cantidad,
								receta.porciones_base,
								porcionesActuales
							)}

							{@const esSubReceta = !!item.sub_receta}

							{@const costoUnitario = esSubReceta
								? calcularCostoReceta(item.sub_receta) / (item.sub_receta.rendimiento_base_g || 1)
								: item.ingrediente.precio / item.ingrediente.cantidad_por_precio}

							{@const costoTotalItem = cantEscalada * costoUnitario}

							<tr class="group transition hover:bg-indigo-50/10 dark:hover:bg-gray-700/30">
								<!-- Tipo -->
								<td class="p-4 pl-6">
									{#if esSubReceta}
										<span
											class="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-blue-700/10 ring-inset"
										>
											Sub-Receta
										</span>
									{:else}
										<span
											class="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-green-600/20 ring-inset"
										>
											Insumo
										</span>
									{/if}
								</td>

								<!-- Nombre -->
								<td class="p-4 font-medium text-gray-800 dark:text-gray-200">
									{#if esSubReceta}
										<a
											href="/admin/recetas/{item.child_recipe_id}"
											class="flex items-center gap-1 hover:text-blue-600 hover:underline"
										>
											{item.sub_receta?.nombre} 🔗
										</a>
									{:else}
										{item.ingrediente?.nombre}
									{/if}
								</td>

								<!-- Cantidad Base -->
								<td class="p-4 text-right text-sm text-gray-500">
									{item.cantidad}
									{item.unidad}
								</td>

								<!-- Cantidad Escalada -->
								<td
									class="bg-indigo-50/30 p-4 text-right font-bold text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-300"
								>
									{cantEscalada}
									<span class="text-xs font-normal text-indigo-500">{item.unidad}</span>
								</td>

								<!-- Costo -->
								<td class="p-4 text-right font-mono text-sm text-gray-600 dark:text-gray-400">
									{formatCurrency(costoTotalItem)}
								</td>

								<!-- Acciones -->
								<td class="p-4 text-right opacity-0 transition-opacity group-hover:opacity-100">
									{#if modoEdicion}
										<button
											on:click={() => eliminarItem(item.id)}
											class="rounded p-1 text-red-400 hover:bg-red-50 hover:text-red-600"
											title="Eliminar"
										>
											🗑️
										</button>
									{/if}
								</td>
							</tr>
						{/each}

						{#if composicion.length === 0}
							<tr>
								<td colspan="6" class="p-12 text-center text-gray-400 italic">
									Esta receta está vacía. Agrega ingredientes o sub-recetas abajo.
								</td>
							</tr>
						{/if}
					</tbody>

					<!-- Footer: Agregar Item -->
					{#if modoEdicion}
						<tfoot class="border-t-2 border-indigo-100 bg-gray-50 dark:bg-gray-700/30">
							<tr>
								<td class="p-3 pl-6">
									<div class="flex rounded-md shadow-sm" role="group">
										<button
											class="rounded-l-lg border px-3 py-1 text-xs font-medium {tipoItemAgregar ===
											'MATERIAL'
												? 'border-green-200 bg-green-100 text-green-700'
												: 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}"
											on:click={() => (tipoItemAgregar = 'MATERIAL')}
										>
											Insumo
										</button>
										<button
											class="rounded-r-lg border-t border-r border-b px-3 py-1 text-xs font-medium {tipoItemAgregar ===
											'RECIPE'
												? 'border-blue-200 bg-blue-100 text-blue-700'
												: 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}"
											on:click={() => (tipoItemAgregar = 'RECIPE')}
										>
											Sub-Receta
										</button>
									</div>
								</td>
								<td class="p-3">
									<select
										bind:value={nuevoItemId}
										class="w-full rounded border-gray-200 text-sm focus:ring-2 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-800"
									>
										<option value=""
											>Seleccionar {tipoItemAgregar === 'MATERIAL'
												? 'Ingrediente'
												: 'Receta'}...</option
										>
										{#if tipoItemAgregar === 'MATERIAL'}
											{#each todosIngredientes as ing}
												<option value={ing.id}>{ing.nombre} ({ing.unidad})</option>
											{/each}
										{:else}
											{#each todasRecetas as sub}
												<option value={sub.id}>📄 {sub.nombre}</option>
											{/each}
										{/if}
									</select>
								</td>
								<td class="p-3">
									<input
										type="number"
										bind:value={nuevaCantidad}
										placeholder="Cant"
										class="w-full rounded border-gray-200 text-sm focus:ring-2 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-800"
									/>
								</td>
								<td class="p-3 text-center text-xs text-gray-400">
									{tipoItemAgregar === 'MATERIAL' ? 'según unidad' : 'gramos'}
								</td>
								<td class="p-3 text-center" colspan="2">
									<button
										on:click={agregarItem}
										class="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-md transition hover:bg-indigo-700"
									>
										+ Agregar
									</button>
								</td>
							</tr>
						</tfoot>
					{/if}
				</table>
			</section>
		</div>

		<!-- Columna Derecha: Detalles (4 cols) -->
		<div class="space-y-6 lg:col-span-4">
			<!-- Panel de Producción (Amarena) -->
			<div
				class="rounded-3xl border border-indigo-100 bg-white p-6 shadow-xl dark:border-gray-700 dark:bg-gray-800"
			>
				<div class="mb-4 flex items-center gap-2">
					<span class="text-2xl">🏭</span>
					<h3 class="font-bold text-gray-900 dark:text-white">Motor de Producción</h3>
				</div>

				<!-- Métricas Amarena -->
				<div class="mb-6 grid grid-cols-2 gap-4 rounded-xl bg-indigo-50 p-4 dark:bg-indigo-900/20">
					<div>
						<p class="text-xs font-bold text-gray-500 uppercase">Peso Total</p>
						<p class="text-xl font-bold text-indigo-600 dark:text-indigo-400">
							{Math.round(pesoTotalEscalado)}g
						</p>
						<span class="text-xs text-indigo-300">
							🏭 Peso Total: {Math.round(pesoTotalEscalado)}g | ❌ Multiplicador: {factorEscalado.toFixed(
								2
							)}x
						</span>
					</div>
					<div>
						<p class="text-xs font-bold text-gray-500 uppercase">
							Pax Amarena ({65}g)
						</p>
						<p class="text-xl font-bold text-indigo-600 dark:text-indigo-400">
							{porcionesAmarena} <span class="text-sm font-normal">u</span>
						</p>
					</div>
				</div>

				<!-- Calculadora de Moldes -->
				<div class="space-y-3">
					<p class="text-sm font-medium text-gray-700 dark:text-gray-300">Escalar por Molde 📏</p>
					<div class="flex gap-2">
						<select
							bind:value={moldeObjetivoCm}
							class="flex-1 rounded-lg border-gray-200 text-sm dark:bg-gray-700"
						>
							{#each MOLDES_AMARENA_REF as m}
								<option value={m.cm}>Molde {m.cm}cm</option>
							{/each}
						</select>
						<select
							bind:value={tipoBatido}
							class="w-24 rounded-lg border-gray-200 text-sm dark:bg-gray-700"
						>
							<option value="PONQUE">Ponqué</option>
							<option value="SEMILIQUIDO">Líquido</option>
						</select>
					</div>
					<button
						on:click={aplicarEscaladoMolde}
						class="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white shadow transition hover:bg-indigo-700"
					>
						🔄 Escalar Receta
					</button>
					<p class="text-center text-xs text-gray-400">Basado en tabla de referencia Amarena</p>
				</div>

				<div class="my-4 border-t border-gray-100 dark:border-gray-700"></div>

				<!-- Calculadora de Pax (Lotes) -->
				<div class="space-y-3">
					<p class="text-sm font-medium text-gray-700 dark:text-gray-300">
						Planificar por Pax (65g) 👥
					</p>
					<div class="flex gap-2">
						<input
							type="number"
							bind:value={paxObjetivo}
							class="w-full rounded-lg border-gray-200 text-sm dark:bg-gray-700"
							placeholder="Ej: 100 personas"
						/>
						<button
							on:click={aplicarEscaladoPax}
							class="rounded-lg bg-pink-600 px-4 py-2 text-sm font-bold text-white shadow transition hover:bg-pink-700"
						>
							Calcular
						</button>
					</div>
					{#if paxObjetivo > 0 && factorEscalado > 0}
						<div class="rounded border border-yellow-200 bg-yellow-50 p-2 text-xs text-yellow-800">
							<span class="font-bold">📝 Orden de Producción:</span><br />
							- Masa Total:
							<strong
								>{formatCurrency(paxObjetivo * 65)
									.replace('$', '')
									.replace(',00', '')}g</strong
							><br />
							- Repetir Receta: <strong>{factorEscalado.toFixed(1)} veces</strong> (aprox {Math.ceil(
								factorEscalado
							)} bachas)
						</div>
					{/if}
					<p class="text-center text-xs text-gray-400">Aplica Fórmula: Pax × 65g ÷ Peso Receta</p>
				</div>
			</div>

			<div
				class="rounded-3xl border border-indigo-100 bg-white p-6 shadow-xl dark:border-gray-700 dark:bg-gray-800"
			>
				<div class="mb-6 flex items-center justify-between">
					<h3 class="font-bold text-gray-900 dark:text-white">⚙️ Configuración</h3>
					<button
						on:click={() => (modoEdicion ? guardarCambiosReceta() : (modoEdicion = true))}
						class="rounded-full px-4 py-2 text-sm font-bold shadow-sm transition {modoEdicion
							? 'bg-green-100 text-green-700 hover:bg-green-200'
							: 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'}"
					>
						{modoEdicion ? '💾 Guardar Cambios' : '✏️ Editar Receta'}
					</button>
				</div>

				<div class="space-y-4 text-sm">
					{#if modoEdicion}
						<div>
							<label class="mb-1 block font-medium text-gray-500">Porciones Base</label>
							<input
								type="number"
								bind:value={receta.porciones_base}
								class="w-full rounded border-gray-200 focus:ring-indigo-500 dark:bg-gray-700"
							/>
						</div>
						<div>
							<label class="mb-1 block font-medium text-gray-500">Tiempo Horneado</label>
							<input
								type="text"
								bind:value={receta.tiempo_horneado}
								class="w-full rounded border-gray-200 focus:ring-indigo-500 dark:bg-gray-700"
							/>
						</div>
						<div>
							<label class="mb-1 block font-medium text-gray-500">Temperatura (°C)</label>
							<input
								type="number"
								bind:value={receta.temperatura}
								class="w-full rounded border-gray-200 focus:ring-indigo-500 dark:bg-gray-700"
							/>
						</div>
						<div>
							<label class="mb-1 block font-medium text-gray-500">Vincular a Catálogo</label>
							<select
								bind:value={receta.producto_id}
								class="w-full rounded border-gray-200 focus:ring-indigo-500 dark:bg-gray-700"
							>
								<option value={null}>Sin vínculo</option>
								{#each productos as prod}
									<option value={prod.id}>{prod.nombre}</option>
								{/each}
							</select>
						</div>
					{:else}
						<div class="flex justify-between border-b border-gray-100 py-3 dark:border-gray-700">
							<span class="text-gray-500">Horneado</span>
							<span class="font-medium text-gray-800 dark:text-gray-200"
								>{receta.tiempo_horneado || '-'} min</span
							>
						</div>
						<div class="flex justify-between border-b border-gray-100 py-3 dark:border-gray-700">
							<span class="text-gray-500">Temperatura</span>
							<span class="font-medium text-gray-800 dark:text-gray-200"
								>{receta.temperatura ? receta.temperatura + '°C' : '-'}</span
							>
						</div>
						{#if receta.producto_id}
							<div class="py-3">
								<span class="mb-1 block text-xs font-bold tracking-wider text-green-600"
									>✓ EN CATÁLOGO</span
								>
								{#each productos as p}
									{#if p.id === receta.producto_id}<span
											class="text-lg font-bold text-gray-800 dark:text-white">{p.nombre}</span
										>{/if}
								{/each}
							</div>
						{/if}
					{/if}
				</div>
			</div>

			<div
				class="rounded-3xl border border-indigo-100 bg-white p-6 shadow-xl dark:border-gray-700 dark:bg-gray-800"
			>
				<h3 class="mb-4 font-bold text-gray-900 dark:text-white">📝 Instrucciones</h3>
				{#if modoEdicion}
					<textarea
						bind:value={receta.instrucciones}
						class="h-60 w-full rounded-xl border-gray-200 p-4 text-sm focus:ring-2 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
						placeholder="Escribe los pasos aquí..."
					></textarea>
				{:else}
					<div
						class="prose prose-indigo prose-sm dark:prose-invert custom-scrollbar max-h-80 overflow-y-auto pr-2"
					>
						<p class="leading-relaxed whitespace-pre-line text-gray-600 dark:text-gray-300">
							{receta.instrucciones || 'Sin instrucciones definidas.'}
						</p>
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>

<style>
	.custom-scrollbar::-webkit-scrollbar {
		width: 6px;
	}
	.custom-scrollbar::-webkit-scrollbar-track {
		background: #f1f1f1;
		border-radius: 10px;
	}
	.custom-scrollbar::-webkit-scrollbar-thumb {
		background: #c7c7c7;
		border-radius: 10px;
	}
	.custom-scrollbar::-webkit-scrollbar-thumb:hover {
		background: #a8a8a8;
	}
</style>

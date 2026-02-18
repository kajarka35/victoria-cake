<script lang="ts">
	import { supabase } from '$lib/supabaseClient';
	import {
		escalarCantidad,
		calcularCostoReceta,
		calcularPesoReceta, // New
		calcularPesoMasaAmarena, // New: Excluye coberturas
		calcularCostoPorGramo, // New: Excluye coberturas
		calcularCostoIngrediente,
		calcularCostoCIF,
		calcularUtilidad,
		calcularPrecioVenta,
		calcularPorcionesEstandar, // Amarena
		calcularFactorMolde, // Amarena
		MOLDES_AMARENA_REF, // Amarena
		formatCurrency,
		renderMarkdown, // Masterpiece
		parseInstruccionesMD, // Masterpiece
		type Receta,
		type RecipeComposition,
		type Ingrediente
	} from '$lib/kitchen';
	import EscaladorSlider from '$lib/components/EscaladorSlider.svelte';
	import RecipeWizard from '$lib/components/RecipeWizard.svelte';
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
	let mostrarWizard = false;

	// Reactividad: Costos
	// Ahora pasamos la receta COMPLETA a calcularCostoReceta, que es recursiva
	// Nota: Para que sea reactivo a cambios en 'composicion', debemos asegurarnos
	// que 'receta.composicion' esté sincronizado con la variable local 'composicion'
	$: receta.composicion = composicion;
	$: costoBase = calcularCostoReceta(receta);
	$: instruccionesParsed = parseInstruccionesMD(receta.instrucciones || '');

	// Masterpiece Editor Local State for Instructions
	let nuevoPasoEnDetalle = '';
	let nuevoPasoEsTipEnDetalle = false;
	let editIdxEnDetalle: number | null = null;
	let textareaRefDetalle: HTMLTextAreaElement;

	function agregarPasoDetalle() {
		if (!nuevoPasoEnDetalle.trim()) return;
		let array = [...instruccionesParsed];
		if (editIdxEnDetalle !== null) {
			array[editIdxEnDetalle] = { text: nuevoPasoEnDetalle.trim(), isTip: nuevoPasoEsTipEnDetalle };
			editIdxEnDetalle = null;
		} else {
			array = [...array, { text: nuevoPasoEnDetalle.trim(), isTip: nuevoPasoEsTipEnDetalle }];
		}
		// Sync back to markdown string
		receta.instrucciones = array
			.map((p, i) => `${i + 1}. ${p.isTip ? '> **Tip:** ' : ''}${p.text}`)
			.join('\n');

		receta.instrucciones_tipo = 'pasos'; // Forzar tipo pasos al usar este editor

		nuevoPasoEnDetalle = '';
		nuevoPasoEsTipEnDetalle = false;
		setTimeout(() => textareaRefDetalle?.focus(), 50);
	}

	function eliminarPasoDetalle(index: number) {
		let array = instruccionesParsed.filter((_, i) => i !== index);
		receta.instrucciones = array
			.map((p, i) => `${i + 1}. ${p.isTip ? '> **Tip:** ' : ''}${p.text}`)
			.join('\n');
	}

	function moverPasoDetalle(index: number, direction: 'up' | 'down') {
		let array = [...instruccionesParsed];
		const j = direction === 'up' ? index - 1 : index + 1;
		if (j < 0 || j >= array.length) return;
		[array[index], array[j]] = [array[j], array[index]];
		receta.instrucciones = array
			.map((p, i) => `${i + 1}. ${p.isTip ? '> **Tip:** ' : ''}${p.text}`)
			.join('\n');
	}

	function cargarEdicionDetalle(index: number) {
		editIdxEnDetalle = index;
		nuevoPasoEnDetalle = instruccionesParsed[index].text;
		nuevoPasoEsTipEnDetalle = instruccionesParsed[index].isTip;
		setTimeout(() => textareaRefDetalle?.focus(), 50);
	}

	$: factorEscalado = porcionesActuales / (receta.porciones_base || 1);
	$: costoEscalado = costoBase * factorEscalado;
	$: costoPorPorcion = costoEscalado / (porcionesActuales || 1);

	// --- Motor Financiero (The Ledger) ---
	$: costoPrimo = costoEscalado;
	$: costoCIF = (costoPrimo * (receta.porcentaje_cif || 0)) / 100;
	$: costoTotal = costoPrimo + costoCIF;
	$: utilidadCalculada = calcularUtilidad(costoTotal, receta.porcentaje_utilidad || 0);
	$: precioVentaSugerido = calcularPrecioVenta(
		costoTotal,
		utilidadCalculada,
		receta.costo_empaque || 0
	);
	$: margenReal = precioVentaSugerido > 0 ? (utilidadCalculada / precioVentaSugerido) * 100 : 0;
	$: roi = costoTotal > 0 ? (utilidadCalculada / costoTotal) * 100 : 0;

	// --- Producción Amarena ---
	// --- Producción Amarena ---
	// PIVOTE FUNDAMENTAL (Feb 2026): Separar "Masa" vs "Total".
	// - Pax Amarena (65g) se calcula sobre la MASA (sin rellenos/coberturas).
	// - Costo Amarena se calcula sobre TOTAL.

	// 1. Peso Físico Total (Para Costos y Transporte)
	$: pesoFisicoTotal_Base = calcularPesoReceta(receta);
	$: pesoFisicoTotal_Escalado = pesoFisicoTotal_Base * factorEscalado;

	// 2. Peso Masa Amarena (Para Planificación de Porciones)
	// Importamos la nueva función (asegurarse de importarla arriba, pero svelte kit suele manejarlo si está en el mismo archivo lib... espera, necesito importarla en el script tag)
	// Como no puedo editar el import block en este replace, asumo que ya está disponible o el usuario aceptará que falle si falta el import.
	// CORRECCIÓN: Debo añadir el import. Pero este bloque es solo lógica reactiva.
	// Usaremos la función global importada.
	$: pesoMasa_Base = calcularPesoMasaAmarena(receta);
	// Fallback: Si pesoMasa es 0 (ej. receta nueva), usar el manual si existe.
	$: pesoMasa_Base_Final = pesoMasa_Base > 0 ? pesoMasa_Base : receta.rendimiento_base_g || 0;

	$: pesoMasa_Escalado = pesoMasa_Base_Final * factorEscalado;
	$: porcionesAmarena = calcularPorcionesEstandar(pesoMasa_Escalado);

	// Variables para la UI antigua (Compatibilidad)
	$: pesoBaseReceta = pesoMasa_Base_Final; // Para que aplicarEscaladoPax use MASA
	$: pesoTotalEscalado = pesoFisicoTotal_Escalado; // Para mostrar peso real total en UI

	// Estado Calculadora Moldes & Lotes
	let moldeObjetivoCm = 14;
	let tipoBatido: 'PONQUE' | 'SEMILIQUIDO' = 'PONQUE';
	let paxObjetivo = 0; // Para "Planificar Producción por Personas"

	// --- Reactividad Bidireccional (Molde <-> Porciones) ---

	function alCambiarMolde() {
		// 1. Obtener molde base (default 14cm)
		const moldeBaseCm = parseInt(receta.molde || '14') || 14;

		// 2. Calcular Factor Amarena
		const factor = calcularFactorMolde(moldeBaseCm, moldeObjetivoCm, tipoBatido);

		// 3. Ajustar Porciones (Driver Principal)
		// Esto disparará reactivamente el cálculo de ingredientes
		porcionesActuales = Math.round(receta.porciones_base * factor * 10) / 10;
	}

	// Reactividad para Pax Objetivo (Input numérico)
	// Si el usuario escribe "50", el slider y todo se ajusta solo.
	$: if (paxObjetivo > 0) {
		const masaTotalNecesaria = paxObjetivo * 65;
		const factor = masaTotalNecesaria / pesoBaseReceta;
		// Solo actualizamos si la diferencia es significativa para evitar loops de redondeo
		const nuevasPorciones = Math.round(receta.porciones_base * factor * 10) / 10;
		if (Math.abs(nuevasPorciones - porcionesActuales) > 0.1) {
			porcionesActuales = nuevasPorciones;
		}
	}

	// Reactividad Recíproca: Si cambian las porciones (Slider), sugerir/seleccionar el molde adecuado
	// MOLDES_AMARENA_REF es una lista ordenada de menor a mayor capacidad
	$: if (pesoMasa_Escalado > 0 && MOLDES_AMARENA_REF.length > 0) {
		// Encontrar el molde que tenga CAPACIDAD >= Masa Actual * 0.95 (5% tolerancia)
		const capacidadRequerida = pesoMasa_Escalado;
		const moldeAdecuado = MOLDES_AMARENA_REF.find((m) => {
			const cap = tipoBatido === 'PONQUE' ? m.ponque_g : m.semiliquido_g;
			return cap >= capacidadRequerida * 0.95;
		});

		// Si encontramos un molde mejor y es diferente al actual, lo actualizamos.
		// Nota: Esto NO dispara 'alCambiarMolde' porque no es un evento DOM, así que es seguro.
		if (moldeAdecuado && moldeAdecuado.cm !== moldeObjetivoCm) {
			moldeObjetivoCm = moldeAdecuado.cm;
		}
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
				instrucciones_tipo: receta.instrucciones_tipo,
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
		if (!confirm('¿Seguro que quieres eliminar este ingrediente de la receta?')) return;
		// Borrar de tabla V2
		const { error } = await supabase.from('recipe_composition').delete().eq('id', id);

		if (!error) {
			composicion = composicion.filter((i) => i.id !== id);
		} else {
			alert('Error eliminando: ' + error.message);
		}
	}

	async function actualizarCantidadItem(item: RecipeComposition) {
		if (item.cantidad <= 0) return;
		const { error } = await supabase
			.from('recipe_composition')
			.update({ cantidad: item.cantidad })
			.eq('id', item.id);

		if (error) {
			alert('Error actualizando cantidad: ' + error.message);
		}
	}

	function handleActualizacionWizard(event: CustomEvent) {
		const dataActualizada = event.detail;
		// Actualizamos los campos básicos
		receta = { ...receta, ...dataActualizada };
		// Volvemos a cargar la composición completa para asegurar reactividad
		refrescarComposicion();
		mostrarWizard = false;
	}

	async function refrescarComposicion() {
		const { data: comp, error } = await supabase
			.from('recipe_composition')
			.select(
				`
				*,
				ingrediente:child_ingredient_id(*),
				sub_receta:child_recipe_id(*)
			`
			)
			.eq('parent_recipe_id', receta.id);

		if (!error) {
			composicion = comp as RecipeComposition[];
		}
	}
</script>

<svelte:head>
	<title>{receta.nombre} | Smart Kitchen V2</title>
</svelte:head>

<div class="mx-auto max-w-7xl px-4 py-8 md:px-6 lg:py-12">
	<!-- Header 3.0: Hero & Blueprint Summaries -->
	<header
		class="relative mb-10 overflow-hidden rounded-[2.5rem] bg-gray-900 p-1 shadow-2xl transition-all duration-700"
	>
		<!-- Animated Ambient Background -->
		<div
			class="absolute inset-0 bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 opacity-90"
		></div>
		<div
			class="absolute -top-24 -right-24 h-96 w-96 animate-pulse rounded-full bg-pink-500/10 blur-[100px]"
		></div>
		<div
			class="absolute -bottom-24 -left-24 h-96 w-96 animate-pulse rounded-full bg-indigo-500/10 blur-[100px]"
		></div>

		<div
			class="relative z-10 flex flex-col items-start justify-between gap-8 rounded-[2.3rem] border border-white/5 bg-white/5 p-8 backdrop-blur-3xl md:flex-row md:items-center"
		>
			<!-- Left: Title & Quick Specs -->
			<div class="flex-1 space-y-6">
				<div class="space-y-2">
					<div
						class="flex items-center gap-2 overflow-hidden text-xs font-black tracking-[0.2em] text-pink-400 uppercase"
					>
						<span class="h-px w-8 bg-pink-400/50"></span>
						<span>{receta.categoria}</span>
					</div>

					{#if modoEdicion}
						<input
							bind:value={receta.nombre}
							class="w-full border-none bg-transparent p-0 text-4xl font-black text-white placeholder-white/30 outline-none focus:ring-0 md:text-6xl"
							placeholder="Nombre de la receta..."
						/>
					{:else}
						<h1 class="text-4xl font-black tracking-tight text-white md:text-6xl">
							{receta.nombre}
						</h1>
					{/if}
				</div>

				<!-- Quick Pill Specs -->
				<div class="flex flex-wrap gap-3">
					<div
						class="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 backdrop-blur-md"
					>
						<span class="text-lg">📏</span>
						<div class="flex flex-col">
							<span class="text-[10px] font-bold tracking-wider text-gray-400 uppercase">Molde</span
							>
							{#if modoEdicion}
								<input
									bind:value={receta.molde}
									class="w-20 bg-transparent text-sm font-bold text-white outline-none"
								/>
							{:else}
								<span class="text-sm font-bold text-white">{receta.molde || 'N/A'}</span>
							{/if}
						</div>
					</div>

					<div
						class="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 backdrop-blur-md"
					>
						<span class="text-lg">⚖️</span>
						<div class="flex flex-col">
							<span class="text-[10px] font-bold tracking-wider text-gray-400 uppercase"
								>Masa Base</span
							>
							<div class="flex items-center gap-1">
								{#if modoEdicion}
									<input
										type="number"
										bind:value={receta.rendimiento_base_g}
										class="w-16 bg-transparent text-sm font-bold text-white outline-none"
									/>
								{:else}
									<span class="text-sm font-bold text-white"
										>{Math.round(pesoMasa_Base_Final || 0)}</span
									>
								{/if}
								<span class="text-[10px] text-gray-500 uppercase">g</span>
							</div>
						</div>
					</div>

					{#if receta.temperatura || modoEdicion}
						<div
							class="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 backdrop-blur-md"
						>
							<span class="text-lg">🌡️</span>
							<div class="flex flex-col">
								<span class="text-[10px] font-bold tracking-wider text-gray-400 uppercase"
									>Horno</span
								>
								<div class="flex items-center gap-1 text-sm font-bold text-white">
									{#if modoEdicion}
										<input
											type="number"
											bind:value={receta.temperatura}
											class="w-12 bg-transparent outline-none"
										/>
										<span>°C</span>
									{:else}
										<span>{receta.temperatura}°C</span>
									{/if}
								</div>
							</div>
						</div>
					{/if}

					{#if receta.tiempo_horneado || modoEdicion}
						<div
							class="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 backdrop-blur-md"
						>
							<span class="text-lg">⏲️</span>
							<div class="flex flex-col">
								<span class="text-[10px] font-bold tracking-wider text-gray-400 uppercase"
									>Tiempo</span
								>
								<div class="flex items-center gap-1 text-sm font-bold text-white">
									{#if modoEdicion}
										<input
											bind:value={receta.tiempo_horneado}
											class="w-24 bg-transparent outline-none"
										/>
									{:else}
										<span>{receta.tiempo_horneado} min</span>
									{/if}
								</div>
							</div>
						</div>
					{/if}
				</div>
			</div>

			<!-- Right: Actions & Main KPIs -->
			<div class="flex w-full flex-col gap-4 md:w-auto">
				<div class="flex flex-col items-end gap-1">
					<p class="text-[10px] font-black tracking-[0.2em] text-pink-400 uppercase">
						Precio Sugerido
					</p>
					<h2 class="text-5xl font-black tracking-tighter text-white md:text-6xl">
						{formatCurrency(precioVentaSugerido)}
					</h2>
					<p class="flex items-center gap-1 text-[10px] font-bold text-gray-400">
						<span class="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500"></span>
						Sincronizado con Amarena Metrics
					</p>
				</div>

				<div class="flex gap-2">
					<button
						on:click={() => (modoEdicion ? guardarCambiosReceta() : (modoEdicion = true))}
						class="flex w-full items-center justify-center gap-2 rounded-2xl p-4 font-bold transition-all active:scale-95 {modoEdicion
							? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-600'
							: 'border border-white/10 bg-white/10 text-white backdrop-blur-md hover:bg-white/20'}"
					>
						<span>{modoEdicion ? '💾' : '✏️'}</span>
						<span>{modoEdicion ? 'Guardar Cambios' : 'Editar Receta'}</span>
					</button>

					{#if !modoEdicion}
						<a
							href="/admin/recetas/{receta.id}/produccion"
							class="flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-pink-500 p-4 font-bold text-white shadow-lg shadow-pink-500/20 transition-all hover:bg-pink-600 active:scale-95"
							title="Modo Impresión / Cocina"
						>
							<span class="text-xl">🖨️</span>
						</a>
					{/if}
				</div>
			</div>
		</div>
	</header>

	<div class="grid grid-cols-1 gap-8 lg:grid-cols-12">
		<!-- MAIN CONTENT: Composition & Instructions -->
		<div class="space-y-8 lg:col-span-8">
			<!-- POD 1: MRP Hub (Composición) -->
			<section
				class="animate-in-up overflow-hidden rounded-[2.5rem] border border-gray-100 bg-white shadow-sm ring-1 ring-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:ring-gray-700"
			>
				<div
					class="flex items-center justify-between border-b border-gray-50 bg-gray-50/30 px-10 py-8 dark:border-gray-700 dark:bg-gray-800/50"
				>
					<div class="flex items-center gap-4">
						<div
							class="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400"
						>
							<span class="text-2xl">🧬</span>
						</div>
						<div>
							<h3 class="text-lg font-black tracking-tight text-gray-900 dark:text-white">
								MRP Hub
							</h3>
							<p class="text-[10px] font-bold tracking-widest text-gray-400 uppercase">
								Composición de Ingredientes
							</p>
						</div>
					</div>
					<div class="flex items-center gap-2">
						<span
							class="rounded-full bg-indigo-50 px-4 py-1.5 text-[10px] font-black text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-300"
						>
							Modo: {porcionesActuales} pax
						</span>
					</div>
				</div>

				<div class="overflow-x-auto">
					<table class="w-full text-left">
						<thead>
							<tr
								class="bg-gray-50/50 text-[10px] font-black tracking-widest text-gray-400 uppercase dark:bg-gray-900/20"
							>
								<th class="px-10 py-5">Tipo & Ítem</th>
								<th class="px-4 py-5 font-black text-indigo-400">Cant. Base</th>
								<th class="px-4 py-5 text-indigo-600">Requerido</th>
								<th class="px-10 py-5 text-right">Costo Est.</th>
								{#if modoEdicion}
									<th class="w-10 px-4 py-5"></th>
								{/if}
							</tr>
						</thead>
						<tbody class="divide-y divide-gray-50 dark:divide-gray-700/50">
							{#each composicion as item (item.id)}
								<tr class="group transition-colors hover:bg-gray-50/50 dark:hover:bg-gray-700/20">
									<td class="px-10 py-5">
										<div class="flex items-center gap-3">
											<div
												class="h-2 w-2 rounded-full {item.sub_receta
													? 'bg-blue-500'
													: 'bg-green-500'}"
											></div>
											<div class="flex flex-col">
												{#if item.sub_receta}
													<a
														href="/admin/recetas/{item.child_recipe_id}"
														class="text-sm font-bold text-gray-800 hover:text-indigo-600 dark:text-gray-200"
													>
														{item.sub_receta.nombre} 🔗
													</a>
												{:else}
													<span class="text-sm font-bold text-gray-800 dark:text-gray-200"
														>{item.ingrediente?.nombre}</span
													>
												{/if}
												<span
													class="text-[9px] font-black tracking-tighter text-gray-400 uppercase"
												>
													{item.sub_receta ? 'Sub-Receta' : 'Insumo'}
												</span>
											</div>
										</div>
									</td>
									<td class="px-4 py-5 text-sm text-gray-500 tabular-nums dark:text-gray-400">
										{#if modoEdicion}
											<div class="flex items-center gap-1">
												<input
													type="number"
													bind:value={item.cantidad}
													on:change={() => actualizarCantidadItem(item)}
													class="w-20 rounded-lg border-gray-200 bg-white p-1 text-center font-bold text-gray-800 focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
												/>
												<span class="text-[10px] font-bold opacity-60">{item.unidad}</span>
											</div>
										{:else}
											{item.cantidad}
											<span class="text-[10px] font-bold opacity-60">{item.unidad}</span>
										{/if}
									</td>
									<td class="px-4 py-5">
										<div
											class="inline-flex items-center gap-2 rounded-xl bg-indigo-50 px-4 py-2 text-sm font-black text-indigo-600 tabular-nums shadow-sm transition-all group-hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400"
										>
											{Math.round(item.cantidad * factorEscalado * 100) / 100}
											<span class="text-[10px] font-bold uppercase opacity-60">{item.unidad}</span>
										</div>
									</td>
									<td
										class="px-10 py-5 text-right text-sm font-black text-gray-900 tabular-nums dark:text-white"
									>
										{formatCurrency(
											item.sub_receta
												? (calcularCostoReceta(item.sub_receta) /
														(item.sub_receta.rendimiento_base_g || 1)) *
														(item.cantidad * factorEscalado)
												: item.ingrediente
													? calcularCostoIngrediente(
															item.cantidad * factorEscalado,
															item.unidad,
															item.ingrediente
														)
													: 0
										)}
									</td>
									{#if modoEdicion}
										<td class="px-4 py-5">
											<button
												on:click={() => eliminarItem(item.id)}
												class="rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
												title="Eliminar de la receta"
											>
												🗑️
											</button>
										</td>
									{/if}
								</tr>
							{/each}
						</tbody>
					</table>
				</div>

				{#if modoEdicion}
					<div class="bg-gray-50/50 p-10 dark:bg-gray-900/20">
						<button
							on:click={() => (mostrarWizard = true)}
							class="flex w-full items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-gray-200 p-8 text-sm font-black text-gray-400 transition-all hover:border-indigo-400 hover:bg-white hover:text-indigo-600 hover:shadow-xl active:scale-[0.98]"
						>
							<span class="text-xl">➕</span>
							<span>Gestionar Composición de Ingredientes</span>
						</button>
					</div>
				{/if}
			</section>

			<!-- POD 2: The Atelier (Instrucciones) -->
			<section
				class="animate-in-up overflow-hidden rounded-[2.5rem] border border-gray-100 bg-white shadow-sm ring-1 ring-gray-100 delay-150 dark:border-gray-700 dark:bg-gray-800 dark:ring-gray-700"
			>
				<div
					class="flex items-center justify-between border-b border-gray-50 bg-gray-50/30 px-10 py-8 dark:border-gray-700 dark:bg-gray-800/50"
				>
					<div class="flex items-center gap-4">
						<div
							class="flex h-12 w-12 items-center justify-center rounded-2xl bg-pink-500/10 text-pink-600 dark:bg-pink-500/20 dark:text-pink-400"
						>
							<span class="text-2xl">🎨</span>
						</div>
						<div>
							<h3 class="text-lg font-black tracking-tight text-gray-900 dark:text-white">
								The Atelier
							</h3>
							<p class="text-[10px] font-bold tracking-widest text-gray-400 uppercase">
								Guía de Preparación Maestra
							</p>
						</div>
					</div>

					<!-- Switch de Modo Inmersivo -->
					<div
						class="flex items-center gap-1 rounded-2xl bg-gray-100/50 p-1 shadow-inner backdrop-blur-md dark:bg-gray-800/40"
					>
						<button
							on:click={() => (receta.instrucciones_tipo = 'pasos')}
							class="group flex h-9 items-center gap-2 rounded-xl px-4 text-[10px] font-black tracking-tighter transition-all {receta.instrucciones_tipo !==
							'markdown'
								? 'bg-white text-pink-600 shadow-md dark:bg-gray-700 dark:text-pink-400'
								: 'text-gray-400 hover:text-gray-500'}"
						>
							<span class="transition-transform group-hover:scale-125">📋</span>
							PASOS
						</button>
						<button
							on:click={() => (receta.instrucciones_tipo = 'markdown')}
							class="group flex h-9 items-center gap-2 rounded-xl px-4 text-[10px] font-black tracking-tighter transition-all {receta.instrucciones_tipo ===
							'markdown'
								? 'bg-white text-indigo-600 shadow-md dark:bg-gray-700 dark:text-indigo-400'
								: 'text-gray-400 hover:text-gray-500'}"
						>
							<span class="transition-transform group-hover:scale-125">📝</span>
							MARKDOWN
						</button>
					</div>
				</div>

				<div class="p-10">
					{#if modoEdicion}
						<div class="space-y-8">
							<div
								class="rounded-3xl border border-indigo-100 bg-indigo-50/20 p-8 dark:border-gray-700 dark:bg-gray-900/50"
							>
								<textarea
									bind:this={textareaRefDetalle}
									bind:value={nuevoPasoEnDetalle}
									placeholder="Describe el siguiente paso con maestría..."
									class="min-h-[120px] w-full border-none bg-transparent p-0 text-lg font-medium placeholder-gray-400 focus:ring-0 dark:text-white"
								></textarea>
								<div class="mt-6 flex items-center justify-between">
									<button
										on:click={() => (nuevoPasoEsTipEnDetalle = !nuevoPasoEsTipEnDetalle)}
										class="flex items-center gap-2 rounded-full px-5 py-2.5 text-[10px] font-black transition-all active:scale-95 {nuevoPasoEsTipEnDetalle
											? 'bg-pink-500 text-white shadow-lg'
											: 'bg-gray-200 text-gray-400'}"
									>
										<span>✨</span>
										<span>CHEF TIP {nuevoPasoEsTipEnDetalle ? 'ACTIVO' : ''}</span>
									</button>
									<button
										on:click={agregarPasoDetalle}
										disabled={!nuevoPasoEnDetalle.trim()}
										class="rounded-2xl bg-gray-900 px-8 py-3 text-xs font-black text-white shadow-xl transition-all hover:scale-105 active:scale-95 disabled:opacity-30 dark:bg-pink-600"
									>
										{editIdxEnDetalle !== null ? 'Actualizar Paso' : 'Agregar a la Guía'}
									</button>
								</div>
							</div>

							<div class="space-y-4">
								{#each instruccionesParsed as paso, i}
									<div
										class="group flex items-center gap-6 rounded-3xl border border-gray-50 bg-white p-6 shadow-sm transition-all hover:border-indigo-100 hover:shadow-md dark:border-gray-700 dark:bg-gray-800 {editIdxEnDetalle ===
										i
											? 'border-transparent shadow-xl ring-2 ring-pink-500'
											: ''}"
									>
										<div
											class="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 text-xs font-black text-indigo-500 dark:bg-indigo-500/20"
										>
											{i + 1}
										</div>
										<div class="flex-1 overflow-hidden">
											<p class="truncate text-sm font-bold text-gray-700 dark:text-gray-300">
												{paso.isTip ? '✨ ' : ''}{paso.text}
											</p>
										</div>
										<div class="flex gap-2 opacity-0 transition-opacity group-hover:opacity-100">
											<button
												on:click={() => moverPasoDetalle(i, 'up')}
												disabled={i === 0}
												class="p-2 text-lg grayscale transition-all hover:grayscale-0 disabled:opacity-20"
												>⬆️</button
											>
											<button
												on:click={() => cargarEdicionDetalle(i)}
												class="p-2 text-lg grayscale transition-all hover:grayscale-0">✏️</button
											>
											<button
												on:click={() => eliminarPasoDetalle(i)}
												class="p-2 text-lg grayscale transition-all hover:grayscale-0">🗑️</button
											>
										</div>
									</div>
								{/each}
							</div>
						</div>
					{:else}
						<div class="grid grid-cols-1 gap-6">
							{#if receta.instrucciones_tipo === 'markdown'}
								<div
									class="instructions-content max-w-none translate-y-0 rounded-[2.5rem] bg-gray-50/40 p-12 shadow-inner ring-1 ring-gray-200/50 dark:bg-gray-900/30 dark:ring-gray-800/50"
								>
									{#if !receta.instrucciones}
										<div class="flex flex-col items-center py-10 opacity-20">
											<span class="mb-4 text-6xl">📭</span>
											<p class="text-xs font-black tracking-widest uppercase">Papel en blanco</p>
										</div>
									{:else}
										<div class="text-lg text-gray-700 dark:text-gray-300">
											{@html renderMarkdown(receta.instrucciones)}
										</div>
									{/if}
								</div>
							{:else}
								{#each instruccionesParsed as paso, i}
									<div
										class="group relative flex flex-col items-start gap-8 rounded-[3rem] border border-white/50 bg-white/40 p-10 shadow-xl shadow-gray-200/50 backdrop-blur-xl transition-all hover:bg-white hover:shadow-2xl sm:flex-row dark:border-gray-800/50 dark:bg-gray-900/30 dark:shadow-none dark:hover:bg-gray-800/50"
									>
										<!-- Numero Flotante Maestro -->
										<div
											class="flex h-16 w-16 shrink-0 items-center justify-center rounded-[2rem] bg-gradient-to-br from-indigo-600 to-purple-700 text-2xl font-black text-white shadow-2xl shadow-indigo-600/30 transition-transform group-hover:scale-110"
										>
											{i + 1}
										</div>

										<div class="instructions-content flex-1 pt-2">
											{#if paso.isTip}
												<div
													class="mb-6 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-pink-500 to-rose-600 px-5 py-2 text-[10px] font-black text-white uppercase shadow-lg shadow-pink-500/30"
												>
													<span class="animate-bounce">✨</span> Chef Tip Maestra
												</div>
											{/if}

											<div class="text-[1.1rem] leading-[1.8] text-gray-800 dark:text-gray-200">
												{@html renderMarkdown(paso.text)}
											</div>
										</div>

										<!-- Decoración lateral sutil -->
										<div
											class="absolute top-10 right-8 opacity-0 transition-opacity group-hover:opacity-10"
										>
											<span class="text-6xl font-black italic">#{i + 1}</span>
										</div>
									</div>
								{/each}

								{#if instruccionesParsed.length === 0}
									<div class="flex flex-col items-center justify-center py-20 opacity-30">
										<span class="mb-4 translate-y-2 text-7xl grayscale">📖</span>
										<p class="text-[10px] font-black tracking-[0.3em] text-gray-500 uppercase">
											El Atelier espera tus apuntes
										</p>
									</div>
								{/if}
							{/if}
						</div>
					{/if}
				</div>
			</section>
		</div>

		<!-- SIDEBAR: Finance & Factory -->
		<aside class="space-y-8 lg:sticky lg:top-8 lg:col-span-4 lg:h-fit">
			<!-- POD 3: The Ledger (Finanzas) -->
			<section
				class="animate-in-right overflow-hidden rounded-[2.5rem] bg-gray-900 p-1 shadow-2xl transition-all duration-700"
			>
				<div class="rounded-[2.3rem] border border-white/5 bg-white/5 p-8 backdrop-blur-3xl">
					<div class="mb-8 flex items-center justify-between">
						<div class="flex items-center gap-3">
							<div
								class="flex h-10 w-10 items-center justify-center rounded-xl bg-green-500/20 text-green-400"
							>
								<span class="text-xl">💰</span>
							</div>
							<h3 class="font-black tracking-tight text-white uppercase">The Ledger</h3>
						</div>
						<div class="text-right">
							<p class="text-[10px] font-black tracking-widest text-gray-500 uppercase">
								Pricing Strategy
							</p>
							<p class="text-xs font-bold text-green-400">ROI: {roi.toFixed(1)}%</p>
						</div>
					</div>

					<div class="space-y-6">
						<!-- Primary Metric: Sales Price -->
						<div class="rounded-3xl border border-white/5 bg-white/5 p-6">
							<p class="mb-1 text-[10px] font-black tracking-widest text-gray-500 uppercase">
								Precio Sugerido Final
							</p>
							<div class="flex items-baseline justify-between">
								<h4 class="text-3xl font-black text-white">
									{formatCurrency(precioVentaSugerido)}
								</h4>
								<span
									class="rounded-full bg-green-500/20 px-3 py-1 text-[10px] font-black text-green-400"
									>Sugerido</span
								>
							</div>
						</div>

						<!-- Financial Breakdown -->
						<div class="grid grid-cols-1 gap-4">
							<div class="flex items-center justify-between rounded-2xl bg-white/5 px-5 py-4">
								<span class="text-xs font-bold text-gray-400">Costo Primo (Insumos)</span>
								<span class="font-bold text-white">{formatCurrency(costoPrimo)}</span>
							</div>
							<div
								class="flex items-center justify-between rounded-2xl border border-white/5 bg-white/5 px-5 py-4"
							>
								<div class="flex flex-col">
									<span class="text-xs font-bold text-gray-400">Costos Fijos / CIF</span>
									<input
										type="number"
										bind:value={receta.porcentaje_cif}
										step="0.1"
										class="w-16 border-none bg-transparent p-0 text-[10px] font-black text-indigo-400 focus:ring-0"
									/>
								</div>
								<span class="font-bold text-indigo-400">+{formatCurrency(costoCIF)}</span>
							</div>
							<div
								class="flex items-center justify-between rounded-2xl bg-indigo-500/10 px-5 py-4 ring-1 ring-indigo-500/20"
							>
								<span class="text-xs font-black text-indigo-400">COGS (Costo Total)</span>
								<span class="text-lg font-black text-indigo-400">{formatCurrency(costoTotal)}</span>
							</div>
						</div>

						<!-- Margin & Profit -->
						<div class="rounded-3xl border border-pink-500/10 bg-pink-500/5 p-6">
							<div class="mb-4 flex items-center justify-between">
								<p class="text-[10px] font-black tracking-widest text-pink-500/50 uppercase">
									Margen de Utilidad
								</p>
								<div class="flex items-center gap-2">
									<input
										type="number"
										bind:value={receta.porcentaje_utilidad}
										class="w-12 border-none bg-transparent p-0 text-right text-sm font-black text-pink-500 focus:ring-0"
									/>
									<span class="text-sm font-black text-pink-500">%</span>
								</div>
							</div>
							<div class="flex items-center justify-between">
								<span class="text-xl font-black text-pink-500"
									>{formatCurrency(utilidadCalculada)}</span
								>
								<div class="text-right">
									<p class="text-[10px] leading-none font-bold text-pink-500/40">
										Neto x {porcionesActuales} Pax
									</p>
								</div>
							</div>
						</div>
					</div>

					<!-- Quick Settings -->
					<div class="mt-8 space-y-4 border-t border-white/5 pt-8">
						<div
							class="flex items-center justify-between text-[10px] font-black text-gray-500 uppercase"
						>
							<span>Costo Empaque Unitario</span>
							<div class="flex items-center gap-1">
								<span>$</span>
								<input
									type="number"
									bind:value={receta.costo_empaque}
									class="w-16 border-none bg-transparent p-0 text-right font-black text-gray-300 focus:ring-0"
								/>
							</div>
						</div>
						<button
							on:click={guardarCambiosReceta}
							class="w-full rounded-2xl bg-white py-4 text-xs font-black text-gray-900 transition-all hover:scale-[1.02] active:scale-[0.98]"
						>
							Sincronizar Finanzas
						</button>
					</div>
				</div>
			</section>

			<!-- POD 4: The Laboratory (Producción) -->
			<section
				class="animate-in-right overflow-hidden rounded-[2.5rem] border border-gray-100 bg-white p-1 shadow-sm ring-1 ring-gray-100 delay-150 dark:border-gray-700 dark:bg-gray-800 dark:ring-gray-700"
			>
				<div class="p-8">
					<div class="mb-8 flex items-center justify-between">
						<div class="flex items-center gap-3">
							<div
								class="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400"
							>
								<span class="text-xl">🧪</span>
							</div>
							<h3 class="font-black tracking-tight text-gray-900 uppercase dark:text-white">
								Laboratory
							</h3>
						</div>
					</div>

					<div class="space-y-8">
						<!-- Scaling Control -->
						<div class="space-y-4">
							<div class="flex items-center justify-between">
								<p class="text-[10px] font-black tracking-widest text-gray-400 uppercase">
									Escalado de Producción
								</p>
								<span
									class="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-600 dark:bg-gray-700 dark:text-indigo-400"
								>
									{porcionesActuales.toFixed(1)} Pax
								</span>
							</div>
							<EscaladorSlider
								bind:value={porcionesActuales}
								min={1}
								max={(receta.porciones_base || 1) * 4}
							/>
						</div>

						<!-- Technical Specs Grid -->
						<div class="grid grid-cols-2 gap-4">
							<div class="rounded-3xl bg-gray-50 p-6 dark:bg-gray-900/50">
								<p class="mb-1 text-[10px] font-black tracking-widest text-gray-400 uppercase">
									Masa Final
								</p>
								<p class="text-xl font-black text-gray-900 dark:text-white">
									{Math.round(pesoMasa_Escalado).toLocaleString('es-CO')}g
								</p>
								<p class="mt-1 text-[9px] font-bold text-indigo-500 uppercase">Ready to Pour</p>
							</div>
							<div class="rounded-3xl border border-indigo-100 p-6 dark:border-gray-700">
								<p class="mb-1 text-[10px] font-black tracking-widest text-gray-400 uppercase">
									Amarena Pax
								</p>
								<div class="flex items-baseline gap-1">
									<p class="text-xl font-black text-indigo-600 dark:text-indigo-400">
										{porcionesAmarena}
									</p>
									<span class="text-[10px] font-bold text-gray-400 uppercase">u</span>
								</div>
								<p class="mt-1 text-[9px] font-bold text-gray-400 uppercase">@ 65g/pax</p>
							</div>
						</div>

						<!-- Mold & Batch UI -->
						<div
							class="space-y-4 rounded-[2rem] border border-gray-100 bg-gray-50/50 p-6 dark:border-gray-700 dark:bg-gray-900/30"
						>
							<div class="flex gap-4">
								<div class="flex-1 space-y-1">
									<label class="ml-2 text-[9px] font-black tracking-widest text-gray-400 uppercase"
										>Dimensiones Molde</label
									>
									<select
										bind:value={moldeObjetivoCm}
										on:change={alCambiarMolde}
										class="w-full rounded-2xl border-none bg-white px-4 py-3 text-sm font-bold shadow-sm focus:ring-2 focus:ring-indigo-500 dark:bg-gray-800"
									>
										{#each MOLDES_AMARENA_REF as m}
											<option value={m.cm}>Molde {m.cm}cm</option>
										{/each}
									</select>
								</div>
								<div class="w-32 space-y-1">
									<label class="ml-2 text-[9px] font-black tracking-widest text-gray-400 uppercase"
										>Tipo Batido</label
									>
									<select
										bind:value={tipoBatido}
										on:change={alCambiarMolde}
										class="w-full rounded-2xl border-none bg-white px-4 py-3 text-sm font-bold shadow-sm focus:ring-2 focus:ring-indigo-500 dark:bg-gray-800"
									>
										<option value="PONQUE">Ponqué</option>
										<option value="SEMILIQUIDO">Líquido</option>
									</select>
								</div>
							</div>
						</div>

						<!-- Output Link -->
						<a
							href="/admin/recetas/{receta.id}/produccion"
							class="flex w-full items-center justify-center gap-3 rounded-2xl bg-gray-900 py-5 text-xs font-black text-white shadow-xl transition-all hover:scale-105 active:scale-95 dark:bg-white dark:text-gray-900"
						>
							<span>👨‍🍳</span>
							<span class="tracking-widest uppercase">Mode Cocina Master</span>
						</a>
					</div>
				</div>
			</section>
		</aside>
	</div>
</div>

{#if mostrarWizard}
	<RecipeWizard
		{todosIngredientes}
		{todasRecetas}
		isEditing={true}
		initialData={{ ...receta, composicion }}
		on:cerrar={() => (mostrarWizard = false)}
		on:actualizada={handleActualizacionWizard}
	/>
{/if}

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
	.instructions-content :global(h1) {
		font-size: 1.875rem;
		line-height: 2.25rem;
		font-weight: 900;
		margin-bottom: 1.5rem;
		letter-spacing: -0.05em;
		color: #111827; /* text-gray-900 */
	}
	:global(.dark) .instructions-content :global(h1) {
		color: #ffffff;
	}
	.instructions-content :global(h2) {
		font-size: 1.25rem;
		line-height: 1.75rem;
		font-weight: 700;
		margin-top: 2rem;
		margin-bottom: 1rem;
		border-bottom-width: 1px;
		padding-bottom: 0.5rem;
		color: #4f46e5; /* indigo-600 */
		border-color: #e0e7ff; /* indigo-100 */
	}
	:global(.dark) .instructions-content :global(h2) {
		border-color: rgba(49, 46, 129, 0.3); /* indigo-900/30 */
		color: #818cf8; /* indigo-400 */
	}
	.instructions-content :global(h3) {
		font-size: 1.125rem;
		line-height: 1.75rem;
		font-weight: 700;
		margin-top: 1.5rem;
		margin-bottom: 0.75rem;
		color: #1f2937; /* gray-800 */
	}
	:global(.dark) .instructions-content :global(h3) {
		color: #e5e7eb; /* gray-200 */
	}
	.instructions-content :global(p) {
		margin-bottom: 1rem;
		line-height: 1.625;
	}
	.instructions-content :global(ul) {
		margin-bottom: 1.5rem;
		margin-left: 0.25rem;
		list-style: none;
	}
	.instructions-content :global(ul) > :global(li) {
		position: relative;
		padding-left: 1.5rem;
	}
	.instructions-content :global(ul) > :global(li)::before {
		content: '';
		position: absolute;
		top: 0.7em;
		left: 0;
		height: 6px;
		width: 6px;
		border-radius: 9999px;
		background-color: #ec4899; /* Amarena Pink */
	}
	.instructions-content :global(ol) {
		margin-bottom: 1.5rem;
		margin-left: 0.25rem;
		list-style: none;
		counter-reset: masterpiece-counter;
	}
	.instructions-content :global(ol) > :global(li) {
		position: relative;
		padding-left: 1.8rem;
		counter-increment: masterpiece-counter;
	}
	.instructions-content :global(ol) > :global(li)::before {
		content: counter(masterpiece-counter) '.';
		position: absolute;
		left: 0;
		font-weight: 900;
		color: #6366f1; /* Maestra Indigo */
	}
	.instructions-content :global(strong) {
		font-weight: 900;
		color: #111827;
	}
	:global(.dark) .instructions-content :global(strong) {
		color: #ffffff;
	}
	.instructions-content :global(blockquote) {
		margin-top: 1.5rem;
		margin-bottom: 1.5rem;
		border-left-width: 4px;
		padding: 1rem;
		font-style: italic;
		border-top-right-radius: 1rem;
		border-bottom-right-radius: 1rem;
		border-color: #ec4899;
		background-color: rgba(253, 242, 248, 0.5); /* pink-50/50 */
	}
	:global(.dark) .instructions-content :global(blockquote) {
		background-color: rgba(236, 72, 153, 0.1); /* pink-500/10 */
	}
</style>

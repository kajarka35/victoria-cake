<script lang="ts">
	import type { Receta } from '$lib/kitchen';
	import {
		calcularFactorMolde,
		calcularCostoReceta,
		calcularUtilidad,
		calcularPrecioVenta,
		formatCurrency
	} from '$lib/kitchen';
	import { supabase } from '$lib/supabaseClient';
	import { page } from '$app/stores';
	import { fade, slide } from 'svelte/transition';
	import { onDestroy } from 'svelte';

	export let data;

	// Data inicial
	const recetaBase: Receta = data.receta;

	// Parsear Molde Inicial (string "14cm" -> number 14)
	let moldeInicial = 14;
	if (recetaBase.molde) {
		const match = recetaBase.molde.match(/(\d+)/);
		if (match) moldeInicial = parseInt(match[1]);
	}

	// Leer Query Params del Laboratory
	const urlPax = $page.url.searchParams.get('pax');
	const urlMolde = $page.url.searchParams.get('molde');
	const urlTipo = $page.url.searchParams.get('tipo');

	// Estado: usar params si existen, si no, valores base
	let moldeSeleccionado = urlMolde ? parseInt(urlMolde) : moldeInicial;
	let tipoBatido: 'PONQUE' | 'SEMILIQUIDO' = urlTipo === 'SEMILIQUIDO' ? 'SEMILIQUIDO' : 'PONQUE';
	let factorEscala = 1;
	let itemsProcesados: Set<string> = new Set();

	// Si vienen porciones del Laboratory, calcular factor por porciones
	const porcionesBase = recetaBase.porciones_base || 1;
	const porcionesActuales = urlPax ? parseFloat(urlPax) : porcionesBase;
	if (urlPax) {
		factorEscala = porcionesActuales / porcionesBase;
	} else {
		factorEscala = calcularFactorMolde(moldeInicial, moldeSeleccionado, tipoBatido);
	}

	// Opciones de Molde
	const opcionesMolde = [10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30];

	// Reactividad: solo para cambios MANUALES del select de molde
	$: if (moldeSeleccionado !== (urlMolde ? parseInt(urlMolde) : moldeInicial)) {
		factorEscala = calcularFactorMolde(moldeInicial, moldeSeleccionado, tipoBatido);
	}
	$: ingredientesEscalados = calcularIngredientes(recetaBase, factorEscala);

	// Agrupación por Categoría (Tazón)
	$: gruposCategoria = agruparPorCategoria(ingredientesEscalados);

	function agruparPorCategoria(items: ReturnType<typeof calcularIngredientes>) {
		const grupos = new Map<string, typeof items>();
		for (const item of items) {
			const cat = item.categoria || 'General';
			if (!grupos.has(cat)) grupos.set(cat, []);
			grupos.get(cat)!.push(item);
		}
		return [...grupos.entries()].map(([nombre, items]) => ({ nombre, items }));
	}

	// Barra de Progreso
	$: totalItems = ingredientesEscalados.length;
	$: completados = itemsProcesados.size;
	$: progresoPct = totalItems > 0 ? (completados / totalItems) * 100 : 0;

	// Resumen de Costos (usa calcularCostoReceta recursivo)
	const costoBaseReceta = calcularCostoReceta(recetaBase);
	$: costoPrimo = costoBaseReceta * factorEscala;
	$: costoCIF = (costoPrimo * (recetaBase.porcentaje_cif || 0)) / 100;
	$: costoTotal = costoPrimo + costoCIF;
	$: utilidadCalculada = calcularUtilidad(costoTotal, recetaBase.porcentaje_utilidad || 0);
	$: precioVentaSugerido = calcularPrecioVenta(
		costoTotal,
		utilidadCalculada,
		recetaBase.costo_empaque || 0
	);
	$: costoPorPorcion = costoTotal / (porcionesActuales || 1);

	// Responsable Editable
	let responsable = '';

	// Timer Integrado
	let timerSeconds = 0;
	let timerRunning = false;
	let timerInterval: ReturnType<typeof setInterval> | null = null;

	function parseTiempoHorneado(): number {
		if (!recetaBase.tiempo_horneado) return 0;
		const match = recetaBase.tiempo_horneado.match(/(\d+)/);
		return match ? parseInt(match[1]) * 60 : 0;
	}

	const tiempoHorneadoSeg = parseTiempoHorneado();
	let timerTotalSeconds = tiempoHorneadoSeg;

	function startTimer() {
		if (timerRunning) return;
		timerRunning = true;
		timerInterval = setInterval(() => {
			timerSeconds++;
			if (timerSeconds === timerTotalSeconds && timerTotalSeconds > 0) {
				timerRunning = false;
				if (timerInterval) clearInterval(timerInterval);
				timerInterval = null;
				if ('vibrate' in navigator) navigator.vibrate([200, 100, 200, 100, 400]);
			}
		}, 1000);
	}

	function pauseTimer() {
		timerRunning = false;
		if (timerInterval) clearInterval(timerInterval);
		timerInterval = null;
	}

	function resetTimer() {
		pauseTimer();
		timerSeconds = 0;
	}

	$: timerDisplay = formatTime(timerSeconds);
	$: timerPct = timerTotalSeconds > 0 ? Math.min((timerSeconds / timerTotalSeconds) * 100, 100) : 0;
	$: timerComplete = timerTotalSeconds > 0 && timerSeconds >= timerTotalSeconds;

	function formatTime(totalSec: number): string {
		const h = Math.floor(totalSec / 3600);
		const m = Math.floor((totalSec % 3600) / 60);
		const s = totalSec % 60;
		if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
		return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
	}

	onDestroy(() => {
		if (timerInterval) clearInterval(timerInterval);
	});

	// Sub-recetas Expandibles
	let expandedSubRecetas: Set<string> = new Set();

	function toggleSubReceta(id: string) {
		if (expandedSubRecetas.has(id)) {
			expandedSubRecetas.delete(id);
		} else {
			expandedSubRecetas.add(id);
		}
		expandedSubRecetas = expandedSubRecetas;
	}

	function getSubRecetaComposicion(nombre: string) {
		if (!recetaBase.composicion) return [];
		const comp = recetaBase.composicion.find((c) => c.sub_receta && c.sub_receta.nombre === nombre);
		if (!comp || !comp.sub_receta || !comp.sub_receta.composicion) return [];
		return comp.sub_receta.composicion;
	}

	// Aplanar la lista para mostrar "Mise en place"
	function calcularIngredientes(receta: Receta, factor: number) {
		if (!receta.composicion) return [];

		return receta.composicion.map((item) => {
			const cantidadBase = item.cantidad || 0;
			const cantidadFinal = cantidadBase * factor;

			return {
				id: item.id,
				nombre: item.ingrediente?.nombre || item.sub_receta?.nombre || 'Desconocido',
				cantidad: cantidadFinal,
				unidad: item.unidad,
				tipo: item.ingrediente ? 'Ingrediente' : 'Sub-Receta',
				categoria: item.ingrediente?.categoria || item.sub_receta?.categoria || 'General'
			};
		});
	}

	function toggleCheck(id: string) {
		if (itemsProcesados.has(id)) {
			itemsProcesados.delete(id);
		} else {
			itemsProcesados.add(id);
		}
		itemsProcesados = itemsProcesados;
	}

	function imprimir() {
		window.print();
	}

	function handleKeydown(e: KeyboardEvent, id: string) {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			toggleCheck(id);
		}
	}

	function catEmoji(cat: string): string {
		const map: Record<string, string> = {
			HARINAS: '🌾',
			ENDULZANTES: '🍯',
			GRASAS: '🧈',
			LACTEOS: '🥛',
			ESENCIAS: '🌿',
			RELLENOS: '🎂',
			COBERTURAS: '🍫',
			FRUTAS: '🍓',
			'FRUTOS SECOS': '🥜',
			HUEVOS: '🥚',
			General: '📦'
		};
		return map[cat] || '📦';
	}

	// === MEJORA 8: QR Code ===
	$: qrUrl = `https://quickchart.io/qr?text=${encodeURIComponent($page.url.href)}&size=120&margin=1`;

	// === MEJORA 10: Historial de Producción ===
	let guardando = false;
	let guardadoExitoso = false;

	async function guardarProduccion() {
		if (guardando) return;
		guardando = true;
		guardadoExitoso = false;

		const { error } = await supabase.from('produccion_historial').insert({
			receta_id: recetaBase.id,
			receta_nombre: recetaBase.nombre,
			responsable: responsable || null,
			porciones: porcionesActuales,
			molde_cm: moldeSeleccionado,
			factor_escala: factorEscala,
			costo_primo: Math.round(costoPrimo * 100) / 100,
			costo_total: Math.round(costoTotal * 100) / 100,
			precio_sugerido: Math.round(precioVentaSugerido * 100) / 100,
			notas: null
		});

		guardando = false;
		if (!error) {
			guardadoExitoso = true;
			setTimeout(() => (guardadoExitoso = false), 4000);
		}
	}
</script>

<div class="print-container min-h-screen bg-white p-8 font-sans text-gray-900">
	<!-- Header -->
	<header
		class="mb-6 flex flex-col items-start justify-between gap-4 border-b-4 border-gray-900 pb-6 md:flex-row md:items-center"
	>
		<div class="flex items-start gap-5">
			<!-- MEJORA 8: QR Code para print -->
			<img
				src={qrUrl}
				alt="QR de receta"
				class="hidden h-16 w-16 rounded border border-gray-200 print:block"
			/>
			<div>
				<h1 class="text-3xl font-extrabold tracking-tight uppercase md:text-4xl">
					{recetaBase.nombre}
				</h1>
				<p class="text-lg text-gray-500">
					Hoja de Producción · <span class="font-semibold text-pink-600"
						>{porcionesActuales} pax</span
					>
				</p>
			</div>
		</div>

		<div class="flex items-center gap-4">
			<!-- MEJORA 8: QR visible en pantalla -->
			<div class="no-print group relative">
				<img
					src={qrUrl}
					alt="QR escanea para abrir en celular"
					class="h-14 w-14 rounded-lg border-2 border-gray-200 opacity-60 transition hover:opacity-100 hover:border-pink-400"
				/>
				<span class="absolute -bottom-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-gray-900 px-2 py-0.5 text-[9px] font-bold text-white opacity-0 transition group-hover:opacity-100">
					📱 Escanear en celular
				</span>
			</div>

			<div class="no-print flex flex-col gap-1">
				<label for="molde" class="text-sm font-semibold text-gray-500 uppercase"
					>Molde Objetivo</label
				>
				<select
					id="molde"
					bind:value={moldeSeleccionado}
					class="rounded-lg border-2 border-pink-500 bg-pink-50 px-4 py-2 text-xl font-bold text-pink-700 shadow-sm focus:border-pink-600 focus:outline-none"
				>
					{#each opcionesMolde as m}
						<option value={m}>{m} cm</option>
					{/each}
				</select>
			</div>

			<div class="text-right">
				<div class="text-3xl font-black">{moldeSeleccionado} cm</div>
				<div class="text-sm font-medium text-gray-500 uppercase">Molde Final</div>
			</div>

			<button
				on:click={imprimir}
				class="no-print transform rounded-full bg-gray-900 px-6 py-3 font-bold text-white transition hover:scale-105 hover:bg-gray-800"
			>
				🖨️ Imprimir
			</button>
		</div>
	</header>

	<!-- Info Grid -->
	<section class="mb-8 grid grid-cols-2 gap-4 md:grid-cols-5 print:grid-cols-5 print:gap-2">
		<div
			class="rounded-xl border border-gray-100 bg-gray-50 p-4 print:rounded-none print:border-gray-300 print:bg-transparent print:p-2"
		>
			<span class="block text-[10px] font-bold text-gray-400 uppercase">Fecha Producción</span>
			<span class="text-sm font-semibold"
				>{new Date().toLocaleDateString('es-CO', {
					weekday: 'short',
					year: 'numeric',
					month: 'short',
					day: 'numeric'
				})}</span
			>
		</div>
		<div
			class="rounded-xl border border-gray-100 bg-gray-50 p-4 print:rounded-none print:border-gray-300 print:bg-transparent print:p-2"
		>
			<span class="block text-[10px] font-bold text-gray-400 uppercase">Rendimiento</span>
			<span class="text-lg font-black text-gray-900"
				>~{Math.round((recetaBase.rendimiento_base_g || 0) * factorEscala)} g</span
			>
		</div>
		<div
			class="rounded-xl border-2 border-red-100 bg-red-50 p-4 print:rounded-none print:border-gray-400 print:bg-transparent print:p-2"
		>
			<span class="block text-[10px] font-bold text-red-400 uppercase print:text-gray-600">🌡️ Temperatura</span>
			<span class="text-xl font-black text-red-600 print:text-black">{recetaBase.temperatura || '—'}</span>
		</div>
		<div
			class="rounded-xl border-2 border-amber-100 bg-amber-50 p-4 print:rounded-none print:border-gray-400 print:bg-transparent print:p-2"
		>
			<span class="block text-[10px] font-bold text-amber-500 uppercase print:text-gray-600">⏱️ Horneado</span>
			<span class="text-xl font-black text-amber-700 print:text-black">{recetaBase.tiempo_horneado || '—'}</span>
		</div>
		<div
			class="rounded-xl border border-gray-100 bg-gray-50 p-4 print:rounded-none print:border-gray-300 print:bg-transparent print:p-2"
		>
			<label for="responsable" class="block text-[10px] font-bold text-gray-400 uppercase"
				>Responsable</label
			>
			<input
				id="responsable"
				type="text"
				bind:value={responsable}
				placeholder="Nombre del pastelero..."
				class="mt-1 w-full border-b-2 border-gray-300 bg-transparent text-sm font-semibold text-gray-900 outline-none transition-colors placeholder:text-gray-300 focus:border-pink-500 print:border-gray-800"
			/>
		</div>
	</section>

	<!-- Timer de Horneado -->
	{#if tiempoHorneadoSeg > 0}
		<div
			class="no-print mb-8 rounded-2xl border-2 p-5 transition-colors
			{timerComplete
				? 'border-green-300 bg-green-50'
				: timerRunning
					? 'border-amber-200 bg-amber-50'
					: 'border-gray-100 bg-gray-50'}"
		>
			<div class="flex items-center justify-between gap-6">
				<div class="flex items-center gap-4">
					<span class="text-3xl">{timerComplete ? '✅' : timerRunning ? '🔥' : '⏲️'}</span>
					<div>
						<span
							class="block text-[10px] font-black tracking-wider uppercase
							{timerComplete ? 'text-green-600' : timerRunning ? 'text-amber-600' : 'text-gray-500'}"
						>
							{timerComplete
								? '¡Tiempo!'
								: timerRunning
									? 'Horneando...'
									: 'Timer · ' + recetaBase.tiempo_horneado}
						</span>
						<span
							class="text-4xl font-black tabular-nums
							{timerComplete ? 'text-green-700' : timerRunning ? 'text-amber-700' : 'text-gray-900'}"
						>
							{timerDisplay}
						</span>
						{#if timerTotalSeconds > 0}
							<span class="ml-2 text-sm text-gray-400">/ {formatTime(timerTotalSeconds)}</span>
						{/if}
					</div>
				</div>

				<div class="flex items-center gap-2">
					{#if !timerRunning && !timerComplete}
						<button
							on:click={startTimer}
							class="rounded-full bg-amber-500 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-amber-600 hover:shadow-md active:scale-95"
						>
							▶ Iniciar
						</button>
					{:else if timerRunning}
						<button
							on:click={pauseTimer}
							class="rounded-full bg-gray-700 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-gray-800 active:scale-95"
						>
							⏸ Pausar
						</button>
					{/if}
					{#if timerSeconds > 0}
						<button
							on:click={resetTimer}
							class="rounded-full border-2 border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-500 transition hover:border-gray-300 hover:text-gray-700 active:scale-95"
						>
							↺ Reset
						</button>
					{/if}
				</div>
			</div>

			{#if timerTotalSeconds > 0}
				<div class="relative mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-200">
					<div
						class="absolute inset-y-0 left-0 rounded-full transition-all duration-1000
							{timerComplete ? 'bg-green-500' : 'bg-amber-500'}"
						style="width: {timerPct}%"
					></div>
				</div>
			{/if}
		</div>
	{/if}

	<!-- Barra de Progreso Mise en Place -->
	<div class="no-print mb-8 rounded-2xl border border-gray-100 bg-gray-50 p-5">
		<div class="mb-2 flex items-center justify-between">
			<span class="text-sm font-bold tracking-wider text-gray-600 uppercase">
				{#if progresoPct >= 100}
					✅ ¡Todo Pesado!
				{:else}
					Progreso Mise en Place
				{/if}
			</span>
			<span
				class="text-sm font-black tabular-nums {progresoPct >= 100
					? 'text-green-600'
					: 'text-gray-900'}"
			>
				{completados}/{totalItems}
			</span>
		</div>
		<div class="relative h-3 w-full overflow-hidden rounded-full bg-gray-200">
			<div
				class="absolute inset-y-0 left-0 rounded-full transition-all duration-500 ease-out
					{progresoPct >= 100
					? 'bg-green-500'
					: progresoPct > 50
						? 'bg-indigo-500'
						: 'bg-pink-500'}"
				style="width: {progresoPct}%"
			></div>
		</div>
		{#if progresoPct >= 100}
			<p class="mt-2 text-center text-xs font-semibold text-green-600" transition:fade>
				🎉 Todos los ingredientes están listos. ¡A mezclar!
			</p>
		{/if}
	</div>

	<!-- Checklist Agrupada por Categoría -->
	<div class="space-y-6 print:space-y-3">
		<h2 class="mb-2 text-2xl font-bold tracking-wider text-gray-400 uppercase print:text-lg print:text-black">
			Mise en Place
		</h2>

		{#each gruposCategoria as grupo}
			<div class="overflow-hidden rounded-xl border border-gray-100 print:rounded-none print:border-gray-400">
				<!-- Header de Grupo -->
				<div class="flex items-center gap-2 border-b border-gray-100 bg-gray-50 px-5 py-3 print:bg-gray-200 print:py-1 print:px-3">
					<span class="text-lg print:text-sm">{catEmoji(grupo.nombre)}</span>
					<h3 class="text-xs font-black tracking-[0.15em] text-gray-500 uppercase print:text-black">
						{grupo.nombre}
					</h3>
					<span class="ml-auto text-xs font-medium text-gray-400"
						>{grupo.items.length} items</span
					>
				</div>

				<!-- Items del grupo -->
				<div class="divide-y divide-gray-100 print:divide-gray-300">
					{#each grupo.items as item (item.id)}
						<div>
							<!-- Fila principal -->
							<div
								role="button"
								tabindex="0"
								class="group flex cursor-pointer items-center justify-between px-5 py-4 transition-colors hover:bg-yellow-50 print:py-2 print:px-3"
								on:click={() => toggleCheck(item.id)}
								on:keydown={(e) => handleKeydown(e, item.id)}
							>
								<div class="flex items-center gap-5 print:gap-3">
									<!-- Checkbox -->
									<div
										class="flex h-10 w-10 items-center justify-center rounded-lg border-3 transition-all duration-200
											{itemsProcesados.has(item.id)
											? 'scale-110 border-green-500 bg-green-500 text-white'
											: 'border-gray-300 bg-white text-transparent group-hover:border-gray-400'}
											print:h-5 print:w-5 print:rounded print:border-2 print:border-gray-600"
									>
										<svg
											class="h-6 w-6 print:h-3 print:w-3"
											fill="none"
											viewBox="0 0 24 24"
											stroke="currentColor"
											stroke-width="4"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												d="M5 13l4 4L19 7"
											/>
										</svg>
									</div>

									<div class="flex flex-col">
										<span
											class="text-lg font-bold text-gray-900 transition-all print:text-sm
												{itemsProcesados.has(item.id)
												? 'text-gray-400 line-through'
												: ''}"
										>
											{item.nombre}
										</span>
										{#if item.tipo === 'Sub-Receta'}
											<button
												class="no-print mt-0.5 flex items-center gap-1 text-[10px] font-semibold tracking-wider text-pink-500 uppercase transition-colors hover:text-pink-700"
												on:click|stopPropagation={() => toggleSubReceta(item.id)}
											>
												<span
													class="transition-transform duration-200 {expandedSubRecetas.has(
														item.id
													)
														? 'rotate-90'
														: ''}"
												>
													▶
												</span>
												Sub-Receta · ver desglose
											</button>
											<span class="hidden text-[8px] font-semibold text-gray-500 uppercase print:inline">SUB-RECETA</span>
										{/if}
									</div>
								</div>

								<div class="text-right">
									<span
										class="block text-3xl font-black text-gray-900 tabular-nums print:text-base
											{itemsProcesados.has(item.id) ? 'text-gray-300' : ''}"
									>
										{(Math.round(item.cantidad * 100) / 100).toFixed(2)}
									</span>
									<span class="text-xs font-bold text-gray-500 uppercase"
										>{item.unidad}</span
									>
								</div>
							</div>

							<!-- Panel expandido de sub-receta -->
							{#if item.tipo === 'Sub-Receta' && expandedSubRecetas.has(item.id)}
								<div
									transition:slide|local={{ duration: 250 }}
									class="border-t border-pink-100 bg-pink-50/40 px-5 py-3"
								>
									<div class="ml-14 space-y-1.5">
										<span
											class="text-[10px] font-black tracking-wider text-pink-400 uppercase"
										>
											Ingredientes de {item.nombre}
										</span>
										{#each getSubRecetaComposicion(item.nombre) as subItem}
											<div class="flex items-center justify-between py-1">
												<span class="text-sm text-gray-700">
													{subItem.ingrediente?.nombre ||
														subItem.sub_receta?.nombre ||
														'?'}
												</span>
												<span class="text-sm font-bold text-gray-600 tabular-nums">
													{(
														Math.round(
															(subItem.cantidad || 0) * factorEscala * 100
														) / 100
													).toFixed(2)}
													<span class="text-xs font-normal text-gray-400"
														>{subItem.unidad}</span
													>
												</span>
											</div>
										{:else}
											<p class="text-xs italic text-gray-400">
												Sin composición detallada disponible
											</p>
										{/each}
									</div>
								</div>
							{/if}
						</div>
					{/each}
				</div>
			</div>
		{/each}
	</div>

	<!-- Resumen de Costos (Mini-Ledger) -->
	{#if costoPrimo > 0}
		<section
			class="mt-10 rounded-2xl border-2 border-indigo-100 bg-gradient-to-br from-indigo-50 to-white p-6 print:mt-6 print:rounded-none print:border-gray-400 print:bg-transparent print:p-3"
		>
			<h3 class="mb-4 text-xs font-black tracking-[0.2em] text-indigo-400 uppercase print:text-black">
				💰 Resumen Financiero
			</h3>
			<div class="grid grid-cols-2 gap-4 md:grid-cols-4 print:grid-cols-4 print:gap-2">
				<div>
					<span class="block text-[10px] font-bold text-gray-400 uppercase">Costo Insumos</span>
					<span class="text-lg font-black text-gray-900 print:text-sm">{formatCurrency(costoPrimo)}</span>
				</div>
				<div>
					<span class="block text-[10px] font-bold text-gray-400 uppercase"
						>COGS (+ CIF {recetaBase.porcentaje_cif || 0}%)</span
					>
					<span class="text-lg font-black text-indigo-600 print:text-sm print:text-black">{formatCurrency(costoTotal)}</span>
				</div>
				<div>
					<span class="block text-[10px] font-bold text-gray-400 uppercase">Precio Sugerido</span>
					<span class="text-lg font-black text-green-600 print:text-sm print:text-black"
						>{formatCurrency(precioVentaSugerido)}</span
					>
				</div>
				<div>
					<span class="block text-[10px] font-bold text-gray-400 uppercase">Costo / Porción</span>
					<span class="text-lg font-black text-pink-600 print:text-sm print:text-black"
						>{formatCurrency(costoPorPorcion)}</span
					>
				</div>
			</div>
		</section>
	{/if}

	<!-- === MEJORA 10: Botón Guardar Producción === -->
	<div class="no-print mt-8 flex items-center justify-center gap-4">
		<button
			on:click={guardarProduccion}
			disabled={guardando}
			class="group flex items-center gap-3 rounded-2xl border-2 px-8 py-4 text-lg font-bold transition-all active:scale-95
				{guardadoExitoso
				? 'border-green-400 bg-green-50 text-green-700'
				: 'border-indigo-200 bg-indigo-50 text-indigo-700 hover:border-indigo-400 hover:bg-indigo-100 hover:shadow-lg'}
				{guardando ? 'cursor-wait opacity-60' : ''}"
		>
			{#if guardando}
				<span class="inline-block h-5 w-5 animate-spin rounded-full border-2 border-indigo-300 border-t-indigo-700"></span>
				Guardando...
			{:else if guardadoExitoso}
				<span class="text-xl">✅</span>
				¡Producción Registrada!
			{:else}
				<span class="text-xl transition-transform group-hover:scale-110">📋</span>
				Registrar Producción
			{/if}
		</button>
	</div>

	<!-- Notas Footer -->
	<div class="mt-12 border-t-4 border-gray-200 pt-8 print:mt-6 print:border-t-2 print:pt-4">
		<h3 class="mb-4 text-sm font-bold text-gray-400 uppercase print:text-black">
			Observaciones y Control de Calidad
		</h3>
		<div
			class="h-32 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 print:h-20 print:rounded-none print:border-gray-800 print:bg-white"
		></div>
	</div>

	<!-- Print Footer -->
	<div class="hidden print:block mt-4 pt-2 border-t border-gray-300 text-center">
		<p class="text-[8px] text-gray-400">
			Victoria Cake · Smart Kitchen V2 · Generado {new Date().toLocaleDateString('es-CO')} · {recetaBase.nombre} · Molde {moldeSeleccionado}cm · {porcionesActuales} pax
		</p>
	</div>
</div>

<style>
	@media print {
		:global(aside),
		:global(.floating-controls),
		:global(nav),
		:global(header) {
			display: none !important;
		}

		:global(main) {
			margin: 0 !important;
			padding: 0 !important;
			width: 100% !important;
			max-width: none !important;
		}

		:global(body) {
			background: white !important;
			font-size: 11px !important;
		}

		.no-print {
			display: none !important;
		}

		.print-container {
			padding: 12px !important;
			color: black !important;
		}

		/* Evitar cortes de página dentro de grupos */
		.space-y-6 > div {
			break-inside: avoid;
		}

		/* Forzar colores en impresión */
		* {
			-webkit-print-color-adjust: exact !important;
			print-color-adjust: exact !important;
		}
	}
</style>

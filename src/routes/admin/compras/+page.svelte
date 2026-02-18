<script lang="ts">
	import {
		calcularExplosionMateriales,
		formatCurrency,
		type Receta,
		type Ingrediente
	} from '$lib/kitchen';
	import { fade, slide } from 'svelte/transition';
	import { onMount } from 'svelte';

	export let data;

	let todasRecetas = data.recetas as Receta[];
	let topRecetas = (data.topRecetas || []) as Receta[];

	let mapRecetas = new Map<string, Receta>();
	todasRecetas.forEach((r) => mapRecetas.set(r.id, r));

	let mapIngredientes = new Map<string, Ingrediente>();
	(data.ingredientes as Ingrediente[]).forEach((i) => mapIngredientes.set(i.id, i));

	// Estado: Selección
	let seleccion: { id: string; recetaId: string; cantidad: number }[] = [];
	let recetaSeleccionadaId = '';
	let cantidadInput = 1;

	// Estado: Lista de Compras
	interface ItemCompra {
		ingrediente: Ingrediente;
		cantidadNeta: number; // Cantidad requerida en receta
		cantidadCompra: number; // Cantidad ajustada por merma
		unidadesCompra: number; // Cantidad en unidades de compra (paquetes/latas)
		costoEstimado: number;
		checked: boolean;
	}

	let listaCompras: ItemCompra[] = [];
	let costoTotalCompra = 0;

	// Persistencia: Cargar
	let loaded = false;
	onMount(() => {
		const guardado = localStorage.getItem('mrp_plan');
		if (guardado) {
			try {
				seleccion = JSON.parse(guardado);
			} catch (e) {
				console.error('Error cargando plan', e);
			}
		}
		loaded = true;
	});

	// Persistencia: Guardar y Recalcular
	$: {
		if (loaded && typeof localStorage !== 'undefined') {
			localStorage.setItem('mrp_plan', JSON.stringify(seleccion));
		}

		// 1. Consolidar demanda
		const demandaTotal = new Map<string, number>();

		seleccion.forEach((item) => {
			const receta = mapRecetas.get(item.recetaId);
			if (receta) {
				const explosion = calcularExplosionMateriales(receta, item.cantidad, mapRecetas);
				explosion.forEach((qty, ingId) => {
					demandaTotal.set(ingId, (demandaTotal.get(ingId) || 0) + qty);
				});
			}
		});

		// 2. Generar lista con lógica inteligente (Merma + Empaque)
		const nuevaLista: ItemCompra[] = [];
		costoTotalCompra = 0;

		demandaTotal.forEach((qty, ingId) => {
			const ing = mapIngredientes.get(ingId);
			if (ing) {
				// A. Merma: Si factor_merma es 0.9 (90%), necesito Comprar = Neta / 0.9
				const factorMerma = ing.factor_merma || 1;
				const cantidadCompra = qty / factorMerma;

				// B. Costo
				// Precio es por 'cantidad_por_precio' (ej: $10.000 por 1000g)
				const costo = (cantidadCompra * ing.precio) / ing.cantidad_por_precio;

				// C. Unidades de Empaque (ej: necesito 2500g, viene en 1000g → 2.5 unidades)
				const unidadesCompra = cantidadCompra / ing.cantidad_por_precio;

				// Mantener estado checked si ya existía
				const prevItem = listaCompras.find((old) => old.ingrediente.id === ingId);

				nuevaLista.push({
					ingrediente: ing,
					cantidadNeta: qty,
					cantidadCompra: cantidadCompra,
					unidadesCompra: unidadesCompra,
					costoEstimado: costo,
					checked: prevItem ? prevItem.checked : false
				});

				costoTotalCompra += costo;
			}
		});

		// 3. Ordenar: Proveedor > Categoría > Nombre
		nuevaLista.sort((a, b) => {
			const provA = a.ingrediente.proveedor || 'Z_General';
			const provB = b.ingrediente.proveedor || 'Z_General';
			if (provA !== provB) return provA.localeCompare(provB);

			if (a.ingrediente.categoria !== b.ingrediente.categoria)
				return a.ingrediente.categoria.localeCompare(b.ingrediente.categoria);
			return a.ingrediente.nombre.localeCompare(b.ingrediente.nombre);
		});

		listaCompras = nuevaLista;
	}

	function agregarSeleccion(rId: string = '', cant: number = 0) {
		const rid = rId || recetaSeleccionadaId;
		const c = cant || cantidadInput;

		if (!rid || c <= 0) return;

		// Generar ID único para permitir misma receta n veces si se quisiera (o agrupar)
		// Aquí agrupamos si ya existe para simplificar UX
		const existente = seleccion.find((s) => s.recetaId === rid);
		if (existente) {
			existente.cantidad += c;
			seleccion = [...seleccion];
		} else {
			seleccion = [...seleccion, { id: crypto.randomUUID(), recetaId: rid, cantidad: c }];
		}

		recetaSeleccionadaId = '';
		cantidadInput = 1;
	}

	function cambiarCantidad(index: number, delta: number) {
		const item = seleccion[index];
		const nueva = item.cantidad + delta;
		if (nueva > 0) {
			item.cantidad = Math.round(nueva * 10) / 10; // Evitar decimales largos
			seleccion = [...seleccion];
		}
	}

	function eliminarSeleccion(index: number) {
		seleccion = seleccion.filter((_, i) => i !== index);
	}

	function calcularCostoReceta(rId: string): number {
		const receta = mapRecetas.get(rId);
		if (!receta) return 0;
		// Explosión unitaria
		const map = calcularExplosionMateriales(receta, 1, mapRecetas);
		let costo = 0;
		map.forEach((qty, ingId) => {
			const ing = mapIngredientes.get(ingId);
			if (ing) {
				const factorMerma = ing.factor_merma || 1;
				const qtyCompra = qty / factorMerma;
				costo += (qtyCompra * ing.precio) / ing.cantidad_por_precio;
			}
		});
		return costo;
	}

	function toggleCheck(ingId: string) {
		const item = listaCompras.find((i) => i.ingrediente.id === ingId);
		if (item) {
			item.checked = !item.checked;
			listaCompras = [...listaCompras];
		}
	}

	function limpiarPlan() {
		if (confirm('¿Borrar todo el plan de producción?')) {
			seleccion = [];
		}
	}

	function imprimir() {
		window.print();
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
			EMPAQUE: '📦',
			General: '🛒'
		};
		return map[cat] || '🛒';
	}
</script>

<svelte:head>
	<title>Compras Inteligentes | Smart Kitchen</title>
</svelte:head>

<div class="print-container mx-auto max-w-6xl pb-20">
	<!-- Header -->
	<header
		class="no-print mb-8 rounded-3xl bg-gradient-to-r from-emerald-500 to-teal-600 p-6 text-white shadow-xl md:p-8"
	>
		<div class="flex flex-col justify-between gap-4 md:flex-row md:items-center">
			<div>
				<h1 class="text-3xl font-extrabold md:text-4xl">Compras Inteligentes (MRP)</h1>
				<p class="text-emerald-100">Planifica tu producción y calcula insumos exactos.</p>
			</div>
			<div class="flex flex-col gap-3 text-right">
				<div>
					<p class="text-sm opacity-80">Presupuesto Estimado</p>
					<p class="text-3xl font-bold">{formatCurrency(costoTotalCompra)}</p>
				</div>
				<div class="flex justify-end gap-2">
					<button
						on:click={imprimir}
						class="rounded-lg bg-white/20 px-3 py-1.5 text-sm font-semibold text-white hover:bg-white/30"
					>
						🖨️ Imprimir
					</button>
					<button
						on:click={limpiarPlan}
						class="rounded-lg bg-white/20 px-3 py-1.5 text-sm font-semibold text-white hover:bg-white/30"
					>
						🗑️ Limpiar
					</button>
				</div>
			</div>
		</div>
	</header>

	<div class="grid grid-cols-1 gap-8 lg:grid-cols-12">
		<!-- Panel Izquierdo: Planificador -->
		<div class="no-print space-y-6 lg:col-span-5">
			<!-- Recetas Favoritas (Quick Add) -->
			{#if topRecetas.length > 0}
				<section>
					<h3 class="mb-2 text-xs font-bold text-gray-400 uppercase">⚡ Acceso Rápido</h3>
					<div class="flex flex-wrap gap-2">
						{#each topRecetas as r}
							<button
								on:click={() => agregarSeleccion(r.id, 1)}
								class="flex transform items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-700 transition hover:border-emerald-300 hover:bg-emerald-50 active:scale-95 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
							>
								<span>🍰</span>
								{r.nombre}
							</button>
						{/each}
					</div>
				</section>
			{/if}

			<section
				class="rounded-3xl border border-gray-100 bg-white p-6 shadow-lg dark:border-gray-700 dark:bg-gray-800"
			>
				<h2 class="mb-4 text-xl font-bold text-gray-800 dark:text-white">📅 Plan de Producción</h2>

				<!-- Formulario Agregar -->
				<div class="mb-6 space-y-3 rounded-xl bg-gray-50 p-4 dark:bg-gray-700/50">
					<div>
						<label class="mb-1 block text-xs font-bold text-gray-500 uppercase"
							>Agregar Receta</label
						>
						<select
							bind:value={recetaSeleccionadaId}
							class="w-full rounded-lg border-gray-200 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
						>
							<option value="">Seleccionar...</option>
							{#each todasRecetas as r}
								<option value={r.id}>{r.nombre}</option>
							{/each}
						</select>
					</div>
					<div class="flex gap-2">
						<div class="flex-1">
							<label class="mb-1 block text-xs font-bold text-gray-500 uppercase">Cantidad</label>
							<input
								type="number"
								bind:value={cantidadInput}
								min="0.1"
								step="0.1"
								class="w-full rounded-lg border-gray-200 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
							/>
						</div>
						<button
							on:click={() => agregarSeleccion()}
							disabled={!recetaSeleccionadaId}
							class="mt-5 rounded-lg bg-emerald-600 px-4 py-2 font-bold text-white shadow hover:bg-emerald-700 disabled:opacity-50"
						>
							+
						</button>
					</div>
				</div>

				<!-- Lista de Producción -->
				{#if seleccion.length > 0}
					<ul class="space-y-3">
						{#each seleccion as item, i}
							{@const r = mapRecetas.get(item.recetaId)}
							{@const costoBase = calcularCostoReceta(item.recetaId)}
							<li
								transition:slide|local
								class="rounded-xl border border-gray-100 bg-white p-3 shadow-sm dark:border-gray-700 dark:bg-gray-700/30"
							>
								<div class="mb-2 flex items-start justify-between">
									<span class="leading-tight font-bold text-gray-800 dark:text-gray-200"
										>{r?.nombre}</span
									>
									<button
										on:click={() => eliminarSeleccion(i)}
										class="px-1 text-red-300 hover:text-red-500"
									>
										✕
									</button>
								</div>

								<div class="flex items-center justify-between text-sm">
									<!-- Control Cantidad Inline -->
									<div class="flex items-center gap-2 rounded-lg bg-gray-50 p-1 dark:bg-gray-600">
										<button
											on:click={() => cambiarCantidad(i, -1)}
											class="flex h-6 w-6 items-center justify-center rounded bg-white font-bold text-gray-500 shadow-sm hover:text-emerald-600 dark:bg-gray-700 dark:text-gray-300"
											>‹</button
										>
										<span class="w-8 text-center font-bold tabular-nums dark:text-white"
											>{item.cantidad}</span
										>
										<button
											on:click={() => cambiarCantidad(i, 1)}
											class="flex h-6 w-6 items-center justify-center rounded bg-white font-bold text-gray-500 shadow-sm hover:text-emerald-600 dark:bg-gray-700 dark:text-gray-300"
											>›</button
										>
									</div>

									<!-- Costo Subtotal -->
									<div class="text-right">
										<div class="font-bold text-emerald-600 tabular-nums dark:text-emerald-400">
											{formatCurrency(costoBase * item.cantidad)}
										</div>
										<div class="text-[10px] text-gray-400">
											({formatCurrency(costoBase)} c/u)
										</div>
									</div>
								</div>
							</li>
						{/each}
					</ul>
				{:else}
					<div
						class="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-100 py-10 text-gray-400 dark:border-gray-700"
					>
						<span class="mb-2 text-3xl">🍽️</span>
						<p class="text-sm">Agrega recetas para comenzar</p>
					</div>
				{/if}
			</section>
		</div>

		<!-- Panel Derecho: Lista de Compras -->
		<div class="lg:col-span-7">
			<section
				class="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800"
			>
				<div
					class="flex items-center justify-between border-b border-gray-100 bg-gray-50/50 p-6 dark:border-gray-700 dark:bg-gray-700/30"
				>
					<h2 class="text-xl font-bold text-gray-800 dark:text-white">🛒 Lista de Compras</h2>
				</div>

				{#if listaCompras.length > 0}
					<div class="max-h-[800px] overflow-y-auto">
						<table class="w-full text-left text-sm">
							<thead
								class="sticky top-0 z-10 bg-gray-50 text-xs font-semibold text-gray-500 uppercase shadow-sm dark:bg-gray-700 dark:text-gray-400"
							>
								<tr>
									<th class="w-10 p-4"></th>
									<th class="p-4">Ingrediente</th>
									<th class="p-4 text-right">Cantidad</th>
									<th class="p-4 text-right">Costo</th>
								</tr>
							</thead>
							<tbody class="divide-y divide-gray-100 dark:divide-gray-700">
								{#each listaCompras as item, i}
									<!-- Separador de Categoría -->
									{#if i === 0 || item.ingrediente.categoria !== listaCompras[i - 1].ingrediente.categoria}
										<tr class="bg-indigo-50/50 dark:bg-gray-900/30">
											<td
												colspan="4"
												class="px-4 py-2 text-xs font-black tracking-widest text-indigo-400 uppercase"
											>
												<span class="mr-2 text-base">{catEmoji(item.ingrediente.categoria)}</span>
												{item.ingrediente.categoria}
											</td>
										</tr>
									{/if}

									<tr
										class="group transition hover:bg-gray-50 dark:hover:bg-gray-700/50 {item.checked
											? 'bg-gray-50 opacity-50 grayscale dark:bg-gray-800/50'
											: ''}"
									>
										<!-- Checkbox -->
										<td class="py-3 pl-4">
											<input
												type="checkbox"
												checked={item.checked}
												on:change={() => toggleCheck(item.ingrediente.id)}
												class="h-5 w-5 cursor-pointer rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
											/>
										</td>
										<!-- Ingrediente + Proveedor + Empaque -->
										<td class="p-3">
											<div
												class="font-medium text-gray-900 dark:text-gray-100 {item.checked
													? 'line-through'
													: ''}"
											>
												{item.ingrediente.nombre}
											</div>
											{#if item.ingrediente.proveedor}
												<div class="mt-0.5 flex items-center gap-2">
													<div
														class="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-bold text-gray-500 dark:bg-gray-700 dark:text-gray-400"
													>
														🏪 {item.ingrediente.proveedor}
													</div>
													{#if item.unidadesCompra >= 1.01}
														<div
															class="rounded bg-orange-50 px-1.5 py-0.5 text-[10px] font-semibold text-orange-500 dark:bg-orange-900/20"
														>
															📦 {Math.ceil(item.unidadesCompra)} un. x {item.ingrediente
																.cantidad_por_precio}
															{item.ingrediente.unidad}
														</div>
													{/if}
												</div>
											{/if}
										</td>
										<!-- Cantidad + Merma -->
										<td class="p-3 text-right">
											<div class="font-bold text-gray-800 dark:text-gray-200">
												{Math.round(item.cantidadCompra * 100) / 100}
												<span class="text-xs font-normal text-gray-500"
													>{item.ingrediente.unidad}</span
												>
											</div>
											{#if item.cantidadCompra > item.cantidadNeta * 1.01}
												<div
													class="text-[10px] font-medium text-amber-500"
													title="Incluye merma del {(1 - (item.ingrediente.factor_merma || 1)) *
														100}%"
												>
													(Neto: {Math.round(item.cantidadNeta * 100) / 100})
												</div>
											{/if}
										</td>
										<!-- Costo -->
										<td class="p-3 text-right font-mono text-gray-600 dark:text-gray-400">
											{formatCurrency(item.costoEstimado)}
										</td>
									</tr>
								{/each}
							</tbody>
							<!-- Footer Totales -->
							<tfoot
								class="border-t-2 border-gray-200 bg-gray-50 dark:border-gray-600 dark:bg-gray-800"
							>
								<tr>
									<td colspan="2" class="p-4 text-right font-bold text-gray-600 dark:text-gray-300">
										TOTALES
									</td>
									<td class="p-4 text-right font-bold text-gray-800 dark:text-white">
										{listaCompras.length} de {listaCompras.length} items <!-- Placeholder, mejor items -->
									</td>
									<td
										class="p-4 text-right text-lg font-black text-emerald-600 dark:text-emerald-400"
									>
										{formatCurrency(costoTotalCompra)}
									</td>
								</tr>
							</tfoot>
						</table>
					</div>
				{:else}
					<div class="flex flex-col items-center justify-center py-20 text-gray-400">
						<div class="mb-4 text-4xl">🧺</div>
						<p>Agrega recetas al plan para generar la lista.</p>
					</div>
				{/if}
			</section>
		</div>
	</div>
</div>

<style>
	@media print {
		.no-print {
			display: none !important;
		}
		.print-container {
			max-width: 100%;
			padding: 0;
		}
		table {
			font-size: 12px;
		}
		/* Ocultar checkbox en print y usar circulo */
		input[type='checkbox'] {
			appearance: none;
			width: 12px;
			height: 12px;
			border: 1px solid #000;
			border-radius: 50%;
		}
	}
</style>

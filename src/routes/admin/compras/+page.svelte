<script lang="ts">
	import {
		calcularExplosionMateriales,
		formatCurrency,
		type Receta,
		type Ingrediente
	} from '$lib/kitchen';
	import { fade } from 'svelte/transition';

	export let data;

	let todasRecetas = data.recetas as Receta[];
	// Reconstruir el mapa si viene serializado (aunque SvelteKit suele preservarlo si es mismo servidor, pero por seguridad)
	// En serialización de red, los Maps se pierden. Mejor reconstruirlo.
	let mapRecetas = new Map<string, Receta>();
	todasRecetas.forEach((r) => mapRecetas.set(r.id, r));

	// Mapa de ingredientes para mostrar nombres
	let mapIngredientes = new Map<string, Ingrediente>();
	(data.ingredientes as Ingrediente[]).forEach((i) => mapIngredientes.set(i.id, i));

	// Estado: Selección de recetas a cocinar
	// Estructura: array de { receta: Receta, cantidad: number (unidades/veces) }
	let seleccion: { recetaId: string; cantidad: number }[] = [];

	let recetaSeleccionadaId = '';
	let cantidadInput = 1;

	// Estado: Resultado de la lista de compras
	// { ingrediente, cantidadTotal, costoEstimado }
	let listaCompras: Array<{
		ingrediente: Ingrediente;
		cantidad: number;
		costoEstimado: number;
	}> = [];

	let costoTotalCompra = 0;

	// Reactividad: Recalcular lista cuando cambia la selección
	$: {
		// 1. Consolidar demanda (Map<IngredienteId, Cantidad>)
		const demandaTotal = new Map<string, number>();

		seleccion.forEach((item) => {
			const receta = mapRecetas.get(item.recetaId);
			if (receta) {
				// MRP Magic: Explosionar materiales
				const explosion = calcularExplosionMateriales(receta, item.cantidad, mapRecetas);

				// Sumar al total
				explosion.forEach((qty, ingId) => {
					const current = demandaTotal.get(ingId) || 0;
					demandaTotal.set(ingId, current + qty);
				});
			}
		});

		// 2. Convertir a Array para vista
		listaCompras = [];
		costoTotalCompra = 0;

		demandaTotal.forEach((qty, ingId) => {
			const ing = mapIngredientes.get(ingId);
			if (ing) {
				const costo = (qty * ing.precio) / ing.cantidad_por_precio;
				listaCompras.push({
					ingrediente: ing,
					cantidad: qty,
					costoEstimado: costo
				});
				costoTotalCompra += costo;
			}
		});

		// Ordenar por categoría y nombre
		listaCompras.sort((a, b) => {
			if (a.ingrediente.categoria !== b.ingrediente.categoria)
				return a.ingrediente.categoria.localeCompare(b.ingrediente.categoria);
			return a.ingrediente.nombre.localeCompare(b.ingrediente.nombre);
		});
	}

	function agregarSeleccion() {
		if (!recetaSeleccionadaId || cantidadInput <= 0) return;

		// Verificar si ya existe para sumar cantidad
		const existente = seleccion.find((s) => s.recetaId === recetaSeleccionadaId);
		if (existente) {
			existente.cantidad += cantidadInput;
			seleccion = [...seleccion]; // Trigger reactividad
		} else {
			seleccion = [...seleccion, { recetaId: recetaSeleccionadaId, cantidad: cantidadInput }];
		}

		recetaSeleccionadaId = '';
		cantidadInput = 1;
	}

	function eliminarSeleccion(index: number) {
		seleccion = seleccion.filter((_, i) => i !== index);
	}

	function copiarWhatsApp() {
		let texto = `🛒 *LISTA DE COMPRAS - SMART KITCHEN*\n\n`;

		// Agrupar por categoría visualmente
		let catActual = '';
		listaCompras.forEach((item) => {
			if (item.ingrediente.categoria !== catActual) {
				catActual = item.ingrediente.categoria;
				texto += `\n*${catActual.toUpperCase()}*\n`;
			}
			texto += `- ${item.ingrediente.nombre}: ${Math.round(item.cantidad * 100) / 100} ${item.ingrediente.unidad}\n`;
		});

		texto += `\n💰 *Total Estimado: ${formatCurrency(costoTotalCompra)}*`;

		navigator.clipboard.writeText(texto).then(() => alert('Copiado al portapapeles!'));
	}
</script>

<svelte:head>
	<title>Compras Inteligentes | Smart Kitchen</title>
</svelte:head>

<div class="mx-auto max-w-5xl pb-20">
	<!-- Header -->
	<header
		class="mb-8 rounded-3xl bg-gradient-to-r from-emerald-500 to-teal-600 p-8 text-white shadow-xl"
	>
		<div class="flex flex-col justify-between gap-4 md:flex-row md:items-center">
			<div>
				<h1 class="text-4xl font-extrabold">Compras Inteligentes (MRP)</h1>
				<p class="text-emerald-100">Planifica tu producción y calcula insumos exactos.</p>
			</div>
			<div class="text-right">
				<p class="text-sm opacity-80">Presupuesto Estimado</p>
				<p class="text-3xl font-bold">{formatCurrency(costoTotalCompra)}</p>
			</div>
		</div>
	</header>

	<div class="grid grid-cols-1 gap-8 lg:grid-cols-3">
		<!-- Panel Izquierdo: Planificador -->
		<div class="space-y-6 lg:col-span-1">
			<section
				class="rounded-3xl border border-gray-100 bg-white p-6 shadow-lg dark:border-gray-700 dark:bg-gray-800"
			>
				<h2 class="mb-4 text-xl font-bold text-gray-800 dark:text-white">📅 Plan de Producción</h2>

				<!-- Formulario Agregar -->
				<div class="mb-6 space-y-3 rounded-xl bg-gray-50 p-4 dark:bg-gray-700/50">
					<div>
						<label class="mb-1 block text-xs font-bold text-gray-500 uppercase"
							>Receta a Producir</label
						>
						<select
							bind:value={recetaSeleccionadaId}
							class="w-full rounded-lg border-gray-200 text-sm dark:border-gray-600 dark:bg-gray-700"
						>
							<option value="">Seleccionar...</option>
							{#each todasRecetas as r}
								<!-- Solo mostrar productos finales o componentes principales -->
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
								class="w-full rounded-lg border-gray-200 text-sm dark:border-gray-600 dark:bg-gray-700"
							/>
						</div>
						<button
							on:click={agregarSeleccion}
							disabled={!recetaSeleccionadaId}
							class="mt-5 rounded-lg bg-emerald-600 px-4 py-2 font-bold text-white shadow hover:bg-emerald-700 disabled:opacity-50"
						>
							+
						</button>
					</div>
				</div>

				<!-- Lista de Producción -->
				{#if seleccion.length > 0}
					<ul class="space-y-2">
						{#each seleccion as item, i}
							{@const r = mapRecetas.get(item.recetaId)}
							<li
								transition:fade
								class="flex items-center justify-between rounded-lg border border-gray-100 p-3 text-sm shadow-sm dark:border-gray-700 dark:bg-gray-700/30"
							>
								<div>
									<span class="font-bold text-gray-800 dark:text-gray-200">{r?.nombre}</span>
									<div class="text-xs text-gray-500">x {item.cantidad} unidades/tandas</div>
								</div>
								<button
									on:click={() => eliminarSeleccion(i)}
									class="text-red-400 hover:text-red-600"
								>
									✕
								</button>
							</li>
						{/each}
					</ul>
				{:else}
					<div class="py-8 text-center text-sm text-gray-400 italic">
						No hay recetas en el plan.
					</div>
				{/if}
			</section>
		</div>

		<!-- Panel Derecho: Lista de Compras -->
		<div class="lg:col-span-2">
			<section
				class="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800"
			>
				<div
					class="flex items-center justify-between border-b border-gray-100 bg-gray-50/50 p-6 dark:border-gray-700 dark:bg-gray-700/30"
				>
					<h2 class="text-xl font-bold text-gray-800 dark:text-white">🛒 Lista Consolidada</h2>
					<button
						on:click={copiarWhatsApp}
						class="flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-bold text-emerald-600 transition hover:bg-emerald-100 hover:text-emerald-700"
					>
						<span>📱</span> Copiar para WhatsApp
					</button>
				</div>

				{#if listaCompras.length > 0}
					<div class="max-h-[600px] overflow-y-auto">
						<table class="w-full text-left text-sm">
							<thead
								class="sticky top-0 bg-gray-50 text-xs font-semibold text-gray-500 uppercase dark:bg-gray-700 dark:text-gray-400"
							>
								<tr>
									<th class="p-4">Ingrediente</th>
									<th class="p-4">Categoría</th>
									<th class="p-4 text-right">Cantidad Total</th>
									<th class="p-4 text-right">Costo Est.</th>
								</tr>
							</thead>
							<tbody class="divide-y divide-gray-100 dark:divide-gray-700">
								{#each listaCompras as item}
									<tr class="transition hover:bg-gray-50 dark:hover:bg-gray-700/50">
										<td class="p-4 font-medium text-gray-900 dark:text-gray-100"
											>{item.ingrediente.nombre}</td
										>
										<td class="p-4 text-gray-500">
											<span
												class="inline-flex items-center rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-gray-500/10 ring-inset dark:bg-gray-700 dark:text-gray-300"
											>
												{item.ingrediente.categoria}
											</span>
										</td>
										<td class="p-4 text-right font-bold text-emerald-600 dark:text-emerald-400">
											{Math.round(item.cantidad * 100) / 100}
											<span class="ml-1 text-xs font-normal text-gray-500"
												>{item.ingrediente.unidad}</span
											>
										</td>
										<td class="p-4 text-right font-mono text-gray-600 dark:text-gray-400">
											{formatCurrency(item.costoEstimado)}
										</td>
									</tr>
								{/each}
							</tbody>
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

<script lang="ts">
	import type { Receta } from '$lib/kitchen';
	import { calcularFactorMolde } from '$lib/kitchen';

	export let data;

	// Data inicial
	const recetaBase: Receta = data.receta;

	// Parsear Molde Inicial (string "14cm" -> number 14)
	let moldeInicial = 14;
	if (recetaBase.molde) {
		const match = recetaBase.molde.match(/(\d+)/);
		if (match) moldeInicial = parseInt(match[1]);
	}

	// Estado
	let moldeSeleccionado = moldeInicial;
	let factorEscala = 1;
	let itemsProcesados: Set<string> = new Set();

	// Opciones de Molde (Estándares de pastelería)
	const opcionesMolde = [10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30];

	// Reactividad
	$: actualizarEscala(moldeSeleccionado);
	$: ingredientesEscalados = calcularIngredientes(recetaBase, factorEscala);

	function actualizarEscala(nuevoMolde: number) {
		factorEscala = calcularFactorMolde(
			moldeInicial,
			nuevoMolde,
			'PONQUE' // Default safe
		);
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
		itemsProcesados = itemsProcesados; // Trigger update
	}

	function imprimir() {
		window.print();
	}

	// Keyboard handle for accessibility
	function handleKeydown(e: KeyboardEvent, id: string) {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			toggleCheck(id);
		}
	}
</script>

<div class="print-container min-h-screen bg-white p-8 font-sans text-gray-900">
	<!-- Header -->
	<header
		class="mb-8 flex flex-col items-start justify-between gap-4 border-b-4 border-gray-900 pb-6 md:flex-row md:items-center"
	>
		<div>
			<h1 class="text-4xl font-extrabold tracking-tight uppercase">{recetaBase.nombre}</h1>
			<p class="text-xl text-gray-600">Hoja de Producción</p>
		</div>

		<div class="flex items-center gap-6">
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

	<!-- Resumen -->
	<section
		class="mb-10 grid grid-cols-3 gap-6 rounded-xl border-2 border-gray-100 bg-gray-50 p-6 print:border-gray-300 print:bg-transparent"
	>
		<div>
			<span class="block text-xs font-bold text-gray-500 uppercase">Fecha Producción</span>
			<span class="text-lg font-medium"
				>{new Date().toLocaleDateString('es-CO', {
					weekday: 'long',
					year: 'numeric',
					month: 'long',
					day: 'numeric'
				})}</span
			>
		</div>
		<div>
			<span class="block text-xs font-bold text-gray-500 uppercase">Rendimiento Estimado</span>
			<span class="text-lg font-medium"
				>~{Math.round((recetaBase.rendimiento_base_g || 0) * factorEscala)} g</span
			>
		</div>
		<div>
			<span class="block text-xs font-bold text-gray-500 uppercase">Responsable</span>
			<span class="block h-8 w-full border-b border-gray-300"></span>
		</div>
	</section>

	<!-- Checklist -->
	<div class="space-y-2">
		<h2 class="mb-6 text-2xl font-bold tracking-wider text-gray-400 uppercase">Mise en place</h2>

		<div class="divide-y divide-gray-200 border-t border-b border-gray-200">
			{#each ingredientesEscalados as item (item.id)}
				<!-- Fila Interactiva -->
				<div
					role="button"
					tabindex="0"
					class="group flex cursor-pointer items-center justify-between py-5 transition-colors hover:bg-yellow-50 print:py-3"
					on:click={() => toggleCheck(item.id)}
					on:keydown={(e) => handleKeydown(e, item.id)}
				>
					<div class="flex items-center gap-6">
						<!-- Checkbox Gigante Visual -->
						<div
							class="flex h-12 w-12 items-center justify-center rounded-xl border-4 transition-colors
                            {itemsProcesados.has(item.id)
								? 'border-green-500 bg-green-500 text-white'
								: 'border-gray-300 bg-white text-transparent group-hover:border-gray-400'}"
						>
							<svg
								class="h-8 w-8"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
								stroke-width="4"
							>
								<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
							</svg>
						</div>

						<div class="flex flex-col">
							<span
								class="text-2xl font-bold text-gray-900 {itemsProcesados.has(item.id)
									? 'text-gray-400 line-through'
									: ''}"
							>
								{item.nombre}
							</span>
							<span class="text-sm font-semibold tracking-widest text-gray-400 uppercase">
								{item.categoria}
							</span>
						</div>
					</div>

					<div class="text-right">
						<span
							class="block text-4xl font-black text-gray-900 tabular-nums {itemsProcesados.has(
								item.id
							)
								? 'text-gray-300'
								: ''}"
						>
							{#if item.unidad === 'unidad'}
								{Math.round(item.cantidad * 10) / 10}
							{:else}
								{Math.round(item.cantidad)}
							{/if}
						</span>
						<span class="text-sm font-bold text-gray-500 uppercase">{item.unidad}</span>
					</div>
				</div>
			{/each}
		</div>
	</div>

	<!-- Notas Footer -->
	<div class="mt-16 border-t-4 border-gray-200 pt-8 print:mt-8">
		<h3 class="mb-4 text-sm font-bold text-gray-400 uppercase">
			Observaciones y Control de Calidad
		</h3>
		<div
			class="h-32 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 print:border-gray-800 print:bg-white"
		></div>
	</div>
</div>

<style>
	@media print {
		/* Ocultar elementos globales del layout (Sidebar, Floating Controls) */
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
		}

		/* Ocultar botones de la propia página al imprimir */
		.no-print {
			display: none !important;
		}

		/* Asegurar contraste y tamaño para impresión */
		.print-container {
			padding: 0 !important;
			color: black !important;
		}
	}
</style>

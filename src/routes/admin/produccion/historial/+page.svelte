<script lang="ts">
	import { formatCurrency } from '$lib/kitchen';
	import { supabase } from '$lib/supabaseClient';
	import { fade, slide } from 'svelte/transition';

	export let data;

	interface RegistroProduccion {
		id: string;
		created_at: string;
		receta_id: string;
		receta_nombre: string;
		responsable: string | null;
		porciones: number;
		molde_cm: number | null;
		factor_escala: number;
		costo_primo: number | null;
		costo_total: number | null;
		precio_sugerido: number | null;
		notas: string | null;
	}

	let historial: RegistroProduccion[] = data.historial;

	// Fila expandida
	let expandedId: string | null = null;

	function toggleExpand(id: string) {
		expandedId = expandedId === id ? null : id;
	}

	// Filtros
	let filtroReceta = '';
	let filtroDesde = '';
	let filtroHasta = '';

	$: historialFiltrado = historial.filter((r) => {
		if (filtroReceta && !r.receta_nombre.toLowerCase().includes(filtroReceta.toLowerCase())) {
			return false;
		}
		if (filtroDesde && r.created_at < filtroDesde) return false;
		if (filtroHasta && r.created_at > filtroHasta + 'T23:59:59') return false;
		return true;
	});

	// Estadísticas generales
	$: totalProducciones = historialFiltrado.length;
	$: costoPromedio =
		totalProducciones > 0
			? historialFiltrado.reduce((sum, r) => sum + (r.costo_total || 0), 0) / totalProducciones
			: 0;
	$: recetasMasProducidas = contarRecetas(historialFiltrado);

	// Resumen del mes actual
	$: (() => {
		const ahora = new Date();
		const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1).toISOString();
		const delMes = historial.filter((r) => r.created_at >= inicioMes);
		produccionesMes = delMes.length;
		gastoMes = delMes.reduce((sum, r) => sum + (r.costo_total || 0), 0);
	})();
	let produccionesMes = 0;
	let gastoMes = 0;

	function contarRecetas(registros: RegistroProduccion[]) {
		const conteo = new Map<string, number>();
		for (const r of registros) {
			conteo.set(r.receta_nombre, (conteo.get(r.receta_nombre) || 0) + 1);
		}
		return [...conteo.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
	}

	function formatFechaCorta(iso: string): string {
		return new Date(iso).toLocaleDateString('es-CO', {
			day: 'numeric',
			month: 'short',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function formatFechaCompleta(iso: string): string {
		return new Date(iso).toLocaleDateString('es-CO', {
			weekday: 'long',
			day: 'numeric',
			month: 'long',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function mesActualNombre(): string {
		return new Date().toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });
	}

	// Eliminar registro
	let eliminando: string | null = null;

	async function eliminarRegistro(id: string, event: Event) {
		event.stopPropagation();
		if (!confirm('¿Eliminar este registro de producción?')) return;
		eliminando = id;
		const { error } = await supabase.from('produccion_historial').delete().eq('id', id);
		eliminando = null;
		if (!error) {
			historial = historial.filter((r) => r.id !== id);
			if (expandedId === id) expandedId = null;
		}
	}

	// Export CSV
	function exportarCSV() {
		const headers = [
			'Fecha',
			'Receta',
			'Responsable',
			'Porciones',
			'Molde (cm)',
			'Costo Primo',
			'COGS',
			'Precio Sugerido',
			'Notas'
		];
		const rows = historialFiltrado.map((r) => [
			new Date(r.created_at).toLocaleString('es-CO'),
			r.receta_nombre,
			r.responsable || '',
			r.porciones,
			r.molde_cm || '',
			r.costo_primo || '',
			r.costo_total || '',
			r.precio_sugerido || '',
			(r.notas || '').replace(/"/g, '""')
		]);

		const csv =
			'\uFEFF' +
			headers.join(',') +
			'\n' +
			rows.map((row) => row.map((v) => `"${v}"`).join(',')).join('\n');

		const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `historial_produccion_${new Date().toISOString().slice(0, 10)}.csv`;
		a.click();
		URL.revokeObjectURL(url);
	}
</script>

<svelte:head>
	<title>Historial de Producción | Smart Kitchen V2</title>
</svelte:head>

<div class="mx-auto max-w-6xl space-y-8">
	<!-- Header -->
	<div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
		<div>
			<h1 class="text-3xl font-extrabold tracking-tight text-gray-900 md:text-4xl dark:text-white">
				📋 Historial de Producción
			</h1>
			<p class="mt-1 text-gray-500 dark:text-gray-400">
				Registro de todas las producciones realizadas en cocina
			</p>
		</div>
		<div class="flex gap-2">
			{#if historialFiltrado.length > 0}
				<button
					on:click={exportarCSV}
					class="flex items-center gap-2 rounded-2xl border-2 border-green-200 bg-green-50 px-4 py-2.5 text-sm font-bold text-green-600 transition hover:bg-green-100 dark:border-green-800 dark:bg-green-900/30 dark:text-green-300"
				>
					📥 Exportar CSV
				</button>
			{/if}
			<a
				href="/admin/recetas"
				class="flex items-center gap-2 rounded-2xl border-2 border-pink-200 bg-pink-50 px-4 py-2.5 text-sm font-bold text-pink-600 transition hover:bg-pink-100 dark:border-pink-800 dark:bg-pink-900/30 dark:text-pink-300"
			>
				📖 Ir al Recetario
			</a>
		</div>
	</div>

	<!-- Stats Cards -->
	<section class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
		<div
			class="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white p-5 dark:border-indigo-900 dark:from-indigo-950/40 dark:to-gray-900"
		>
			<span class="block text-[10px] font-black tracking-wider text-indigo-400 uppercase"
				>Total Producciones</span
			>
			<span class="mt-1 block text-3xl font-black text-indigo-600 dark:text-indigo-400"
				>{totalProducciones}</span
			>
		</div>
		<div
			class="rounded-2xl border border-green-100 bg-gradient-to-br from-green-50 to-white p-5 dark:border-green-900 dark:from-green-950/40 dark:to-gray-900"
		>
			<span class="block text-[10px] font-black tracking-wider text-green-500 uppercase"
				>Costo Promedio (COGS)</span
			>
			<span class="mt-1 block text-3xl font-black text-green-600 dark:text-green-400"
				>{formatCurrency(costoPromedio)}</span
			>
		</div>
		<div
			class="rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50 to-white p-5 dark:border-amber-900 dark:from-amber-950/40 dark:to-gray-900"
		>
			<span class="block text-[10px] font-black tracking-wider text-amber-500 uppercase"
				>📅 {mesActualNombre()}</span
			>
			<span class="mt-1 block text-2xl font-black text-amber-600 dark:text-amber-400"
				>{produccionesMes} <span class="text-sm font-semibold">prod.</span></span
			>
			<span class="block text-sm font-bold text-amber-500/70"
				>{formatCurrency(gastoMes)} gastado</span
			>
		</div>
		<div
			class="rounded-2xl border border-pink-100 bg-gradient-to-br from-pink-50 to-white p-5 dark:border-pink-900 dark:from-pink-950/40 dark:to-gray-900"
		>
			<span class="block text-[10px] font-black tracking-wider text-pink-400 uppercase"
				>Top Recetas</span
			>
			<div class="mt-1 space-y-0.5">
				{#each recetasMasProducidas as [nombre, count]}
					<div class="flex items-center justify-between text-sm">
						<span class="truncate font-semibold text-gray-700 dark:text-gray-300">{nombre}</span>
						<span
							class="ml-2 shrink-0 rounded-full bg-pink-100 px-2 py-0.5 text-xs font-black text-pink-600 dark:bg-pink-900/40 dark:text-pink-300"
							>{count}×</span
						>
					</div>
				{:else}
					<p class="text-sm italic text-gray-400">Sin datos aún</p>
				{/each}
			</div>
		</div>
	</section>

	<!-- Filtros -->
	<div
		class="flex flex-wrap items-end gap-4 rounded-2xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50"
	>
		<div class="flex flex-col gap-1">
			<label for="filtro-receta" class="text-[10px] font-bold text-gray-400 uppercase"
				>Buscar Receta</label
			>
			<input
				id="filtro-receta"
				type="text"
				bind:value={filtroReceta}
				placeholder="Ej: Ponqué..."
				class="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm transition outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-100 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
			/>
		</div>
		<div class="flex flex-col gap-1">
			<label for="filtro-desde" class="text-[10px] font-bold text-gray-400 uppercase">Desde</label>
			<input
				id="filtro-desde"
				type="date"
				bind:value={filtroDesde}
				class="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm transition outline-none focus:border-pink-400 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
			/>
		</div>
		<div class="flex flex-col gap-1">
			<label for="filtro-hasta" class="text-[10px] font-bold text-gray-400 uppercase">Hasta</label>
			<input
				id="filtro-hasta"
				type="date"
				bind:value={filtroHasta}
				class="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm transition outline-none focus:border-pink-400 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
			/>
		</div>
		{#if filtroReceta || filtroDesde || filtroHasta}
			<button
				on:click={() => {
					filtroReceta = '';
					filtroDesde = '';
					filtroHasta = '';
				}}
				class="rounded-lg bg-gray-200 px-3 py-2 text-xs font-bold text-gray-600 transition hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300"
			>
				✕ Limpiar
			</button>
		{/if}
	</div>

	<!-- Tabla con filas expandibles -->
	{#if historialFiltrado.length === 0}
		<div
			class="flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-gray-200 py-16 dark:border-gray-700"
		>
			<span class="text-5xl">📭</span>
			<p class="text-lg font-semibold text-gray-400">No hay producciones registradas</p>
			<p class="text-sm text-gray-400">
				Abre una receta → Producción → <strong>Registrar Producción</strong>
			</p>
		</div>
	{:else}
		<div class="overflow-hidden rounded-2xl border border-gray-100 dark:border-gray-700">
			<table class="w-full text-left text-sm">
				<thead>
					<tr
						class="border-b border-gray-100 bg-gray-50 text-[10px] font-black tracking-wider text-gray-400 uppercase dark:border-gray-700 dark:bg-gray-800/80"
					>
						<th class="w-8 px-4 py-3"></th>
						<th class="px-4 py-3">Fecha</th>
						<th class="px-4 py-3">Receta</th>
						<th class="px-4 py-3">Responsable</th>
						<th class="px-4 py-3 text-center">Porciones</th>
						<th class="px-4 py-3 text-center">Molde</th>
						<th class="px-4 py-3 text-right">COGS</th>
						<th class="px-4 py-3 text-right">Precio Sug.</th>
						<th class="px-4 py-3 text-center">Acciones</th>
					</tr>
				</thead>
				<tbody>
					{#each historialFiltrado as r (r.id)}
						<!-- Fila principal (clickeable) -->
						<tr
							transition:fade|local
							on:click={() => toggleExpand(r.id)}
							class="cursor-pointer border-b border-gray-50 transition-colors hover:bg-pink-50/50 dark:border-gray-800 dark:hover:bg-pink-900/10 {expandedId ===
							r.id
								? 'bg-pink-50/30 dark:bg-pink-900/5'
								: ''}"
						>
							<td class="px-4 py-3 text-gray-400">
								<span
									class="inline-block transition-transform duration-200 {expandedId === r.id
										? 'rotate-90'
										: ''}"
								>
									▸
								</span>
							</td>
							<td class="px-4 py-3 text-xs whitespace-nowrap text-gray-500 dark:text-gray-400">
								{formatFechaCorta(r.created_at)}
							</td>
							<td class="px-4 py-3">
								<span class="font-bold text-gray-900 dark:text-white">
									{r.receta_nombre}
								</span>
								{#if r.notas}
									<span class="ml-1.5 text-xs" title={r.notas}>📝</span>
								{/if}
							</td>
							<td class="px-4 py-3 text-gray-600 dark:text-gray-400">
								{r.responsable || '—'}
							</td>
							<td class="px-4 py-3 text-center font-bold tabular-nums">
								{r.porciones}
							</td>
							<td class="px-4 py-3 text-center text-gray-500">
								{r.molde_cm ? r.molde_cm + ' cm' : '—'}
							</td>
							<td
								class="px-4 py-3 text-right font-bold text-indigo-600 tabular-nums dark:text-indigo-400"
							>
								{r.costo_total ? formatCurrency(r.costo_total) : '—'}
							</td>
							<td
								class="px-4 py-3 text-right font-bold text-green-600 tabular-nums dark:text-green-400"
							>
								{r.precio_sugerido ? formatCurrency(r.precio_sugerido) : '—'}
							</td>
							<td class="px-4 py-3 text-center">
								<button
									on:click={(e) => eliminarRegistro(r.id, e)}
									disabled={eliminando === r.id}
									class="rounded-lg px-2 py-1 text-xs font-medium text-red-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-40 dark:hover:bg-red-900/20"
									title="Eliminar registro"
								>
									{eliminando === r.id ? '⏳' : '🗑️'}
								</button>
							</td>
						</tr>

						<!-- Panel expandido -->
						{#if expandedId === r.id}
							<tr transition:slide|local={{ duration: 200 }}>
								<td colspan="9" class="bg-gray-50/70 px-6 py-5 dark:bg-gray-800/30">
									<div class="grid grid-cols-1 gap-6 md:grid-cols-3">
										<!-- Desglose de costos -->
										<div class="space-y-3">
											<h4 class="text-[10px] font-black tracking-wider text-gray-400 uppercase">
												💰 Desglose Financiero
											</h4>
											<div class="space-y-2 text-sm">
												<div class="flex justify-between">
													<span class="text-gray-500">Costo Primo</span>
													<span class="font-bold text-gray-700 tabular-nums dark:text-gray-300"
														>{r.costo_primo ? formatCurrency(r.costo_primo) : '—'}</span
													>
												</div>
												<div class="flex justify-between">
													<span class="text-gray-500">COGS (c/ CIF)</span>
													<span class="font-bold text-indigo-600 tabular-nums dark:text-indigo-400"
														>{r.costo_total ? formatCurrency(r.costo_total) : '—'}</span
													>
												</div>
												<div
													class="flex justify-between border-t border-gray-200 pt-2 dark:border-gray-600"
												>
													<span class="text-gray-500">Precio Sugerido</span>
													<span class="font-black text-green-600 tabular-nums dark:text-green-400"
														>{r.precio_sugerido ? formatCurrency(r.precio_sugerido) : '—'}</span
													>
												</div>
												<div class="flex justify-between">
													<span class="text-gray-500">Costo / Porción</span>
													<span class="font-bold text-gray-600 tabular-nums dark:text-gray-400"
														>{r.costo_total && r.porciones
															? formatCurrency(r.costo_total / r.porciones)
															: '—'}</span
													>
												</div>
											</div>
										</div>

										<!-- Detalles -->
										<div class="space-y-3">
											<h4 class="text-[10px] font-black tracking-wider text-gray-400 uppercase">
												📐 Detalles de Producción
											</h4>
											<div class="space-y-2 text-sm">
												<div class="flex justify-between">
													<span class="text-gray-500">Fecha completa</span>
													<span class="font-semibold text-gray-700 dark:text-gray-300"
														>{formatFechaCompleta(r.created_at)}</span
													>
												</div>
												<div class="flex justify-between">
													<span class="text-gray-500">Factor de escala</span>
													<span class="font-bold tabular-nums">{r.factor_escala.toFixed(2)}×</span>
												</div>
												<div class="flex justify-between">
													<span class="text-gray-500">Molde</span>
													<span class="font-bold">{r.molde_cm ? r.molde_cm + ' cm' : '—'}</span>
												</div>
												<div class="flex justify-between">
													<span class="text-gray-500">Porciones</span>
													<span class="font-bold">{r.porciones} pax</span>
												</div>
											</div>
										</div>

										<!-- Notas -->
										<div class="space-y-3">
											<h4 class="text-[10px] font-black tracking-wider text-gray-400 uppercase">
												📝 Observaciones
											</h4>
											{#if r.notas}
												<p
													class="rounded-xl bg-white p-3 text-sm leading-relaxed text-gray-700 italic dark:bg-gray-700/50 dark:text-gray-300"
												>
													"{r.notas}"
												</p>
											{:else}
												<p class="text-sm text-gray-400 italic">Sin observaciones</p>
											{/if}
										</div>
									</div>

									<!-- Botones de acción -->
									<div
										class="mt-5 flex flex-wrap gap-3 border-t border-gray-200 pt-4 dark:border-gray-600"
									>
										<a
											href="/admin/recetas/{r.receta_id}/produccion?molde={r.molde_cm ||
												''}&pax={r.porciones}"
											class="flex items-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-pink-600 px-5 py-2.5 text-sm font-bold text-white shadow-md transition hover:shadow-lg hover:brightness-110 active:scale-95"
										>
											🔄 Producir de Nuevo
										</a>
										<a
											href="/admin/recetas/{r.receta_id}"
											class="flex items-center gap-2 rounded-xl border-2 border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 transition hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300"
										>
											📖 Ver Receta
										</a>
									</div>
								</td>
							</tr>
						{/if}
					{/each}
				</tbody>
			</table>
		</div>

		<p class="text-center text-xs text-gray-400">
			Mostrando {historialFiltrado.length} de {historial.length} registros
		</p>
	{/if}
</div>

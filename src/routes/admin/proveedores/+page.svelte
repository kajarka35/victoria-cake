<script lang="ts">
	import { supabase } from '$lib/supabaseClient';
	import { fly, fade } from 'svelte/transition';

	interface Proveedor {
		id: string;
		nombre: string;
		telefono: string | null;
		whatsapp: string | null;
		email: string | null;
		direccion: string | null;
		dia_entrega: string | null;
		calificacion: number;
		notas: string | null;
		activo: boolean;
		created_at: string;
	}

	interface ScoreCard {
		numIngredientes: number;
		gastoEstimado: number;
		tendencia: number;
	}

	export let data;
	let proveedores: Proveedor[] = data.proveedores;
	let scores: Record<string, ScoreCard> = data.scores;

	let busqueda = '';
	let soloActivos = true;
	let mostrarModal = false;
	let editando: Proveedor | null = null;
	let guardando = false;

	// Form
	let form = resetForm();

	function resetForm() {
		return {
			nombre: '',
			telefono: '',
			whatsapp: '',
			email: '',
			direccion: '',
			dia_entrega: '',
			calificacion: 3,
			notas: '',
			activo: true
		};
	}

	function abrirCrear() {
		editando = null;
		form = resetForm();
		mostrarModal = true;
	}

	function abrirEditar(prov: Proveedor) {
		editando = prov;
		form = {
			nombre: prov.nombre || '',
			telefono: prov.telefono || '',
			whatsapp: prov.whatsapp || '',
			email: prov.email || '',
			direccion: prov.direccion || '',
			dia_entrega: prov.dia_entrega || '',
			calificacion: prov.calificacion || 3,
			notas: prov.notas || '',
			activo: prov.activo
		};
		mostrarModal = true;
	}

	async function guardar() {
		if (!form.nombre.trim()) return;
		guardando = true;

		const payload = {
			nombre: form.nombre.trim(),
			telefono: form.telefono.trim() || null,
			whatsapp: form.whatsapp.trim() || null,
			email: form.email.trim() || null,
			direccion: form.direccion.trim() || null,
			dia_entrega: form.dia_entrega.trim() || null,
			calificacion: form.calificacion,
			notas: form.notas.trim() || null,
			activo: form.activo
		};

		if (editando) {
			const { data: updated, error } = await supabase
				.from('proveedores')
				.update(payload)
				.eq('id', editando.id)
				.select()
				.single();

			if (error) {
				alert('Error al actualizar: ' + error.message);
			} else if (updated) {
				proveedores = proveedores.map((p) => (p.id === editando!.id ? updated : p));
				mostrarModal = false;
			}
		} else {
			const { data: inserted, error } = await supabase
				.from('proveedores')
				.insert([payload])
				.select()
				.single();

			if (error) {
				alert('Error al crear: ' + error.message);
			} else if (inserted) {
				proveedores = [...proveedores, inserted].sort((a, b) => a.nombre.localeCompare(b.nombre));
				scores[inserted.id] = { numIngredientes: 0, gastoEstimado: 0, tendencia: 0 };
				mostrarModal = false;
			}
		}
		guardando = false;
	}

	async function toggleActivo(prov: Proveedor) {
		const nuevoEstado = !prov.activo;

		// Validación de Integridad (Gap 3): No desactivar si es principal de alguien
		if (!nuevoEstado) {
			// Consultar si es principal de algun ingrediente activo
			const { data: dependencias, error: errDep } = await supabase
				.from('ingrediente_proveedores')
				.select('ingrediente:ingredientes(nombre)')
				.eq('proveedor_id', prov.id)
				.eq('es_principal', true);

			if (dependencias && dependencias.length > 0) {
				// @ts-ignore
				const nombres = dependencias.map((d) => d.ingrediente?.nombre || 'Desconocido').join(', ');
				alert(
					`⚠️ No puedes desactivar a "${prov.nombre}" porque es el proveedor PRINCIPAL de:\n\n${nombres}\n\nPor favor, asigna otro proveedor principal a estos ingredientes primero.`
				);
				return;
			}
		}

		const { error } = await supabase
			.from('proveedores')
			.update({ activo: nuevoEstado })
			.eq('id', prov.id);

		if (!error) {
			proveedores = proveedores.map((p) => (p.id === prov.id ? { ...p, activo: nuevoEstado } : p));
		} else {
			alert('Error al cambiar estado: ' + error.message);
		}
	}

	function abrirWhatsApp(prov: Proveedor) {
		if (!prov.whatsapp) return;
		const num = prov.whatsapp.replace(/\D/g, '');
		window.open(`https://wa.me/${num}`, '_blank');
	}

	function llamar(prov: Proveedor) {
		if (!prov.telefono) return;
		window.open(`tel:${prov.telefono}`, '_self');
	}

	function formatCurrency(val: number): string {
		return new Intl.NumberFormat('es-CO', {
			style: 'currency',
			currency: 'COP',
			maximumFractionDigits: 0
		}).format(val);
	}

	$: filtrados = proveedores
		.filter((p) => {
			if (soloActivos && !p.activo) return false;
			if (busqueda) {
				const q = busqueda.toLowerCase();
				return p.nombre.toLowerCase().includes(q) || (p.direccion || '').toLowerCase().includes(q);
			}
			return true;
		})
		.sort((a, b) => a.nombre.localeCompare(b.nombre));

	function estrellas(n: number): string {
		return '⭐'.repeat(n) + '☆'.repeat(5 - n);
	}
</script>

<svelte:head>
	<title>Proveedores | Olga's Smart Kitchen</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
		<div>
			<h1 class="text-3xl font-extrabold text-pink-600 dark:text-pink-400">
				🏪 Gestión de Proveedores
			</h1>
			<p class="text-gray-500 dark:text-gray-400">
				Administra tus proveedores y optimiza tus compras.
			</p>
		</div>
		<button
			on:click={abrirCrear}
			class="flex transform items-center gap-2 rounded-full bg-pink-500 px-5 py-2.5 font-semibold text-white shadow-lg transition hover:scale-105 hover:bg-pink-600 active:scale-95"
		>
			+ Nuevo Proveedor
		</button>
	</div>

	<!-- Filtros -->
	<div
		class="flex flex-col gap-3 rounded-2xl bg-white/50 p-4 backdrop-blur-sm sm:flex-row sm:items-center dark:bg-gray-800/50"
	>
		<input
			type="text"
			bind:value={busqueda}
			placeholder="🔍 Buscar proveedor..."
			class="flex-1 rounded-xl border-pink-200 bg-white px-4 py-2 focus:border-pink-500 focus:ring-pink-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
		/>
		<label class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
			<input
				type="checkbox"
				bind:checked={soloActivos}
				class="rounded border-pink-300 text-pink-500 focus:ring-pink-500"
			/>
			Solo activos
		</label>
	</div>

	<!-- Resumen global -->
	<div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
		<div
			class="rounded-2xl bg-white/60 p-4 text-center shadow backdrop-blur-sm dark:bg-gray-800/60"
		>
			<div class="text-2xl font-extrabold text-pink-600 dark:text-pink-400">
				{proveedores.filter((p) => p.activo).length}
			</div>
			<div class="text-xs text-gray-500 dark:text-gray-400">Activos</div>
		</div>
		<div
			class="rounded-2xl bg-white/60 p-4 text-center shadow backdrop-blur-sm dark:bg-gray-800/60"
		>
			<div class="text-2xl font-extrabold text-purple-600 dark:text-purple-400">
				{proveedores.length}
			</div>
			<div class="text-xs text-gray-500 dark:text-gray-400">Total</div>
		</div>
		<div
			class="rounded-2xl bg-white/60 p-4 text-center shadow backdrop-blur-sm dark:bg-gray-800/60"
		>
			<div class="text-2xl font-extrabold text-green-600 dark:text-green-400">
				{Object.values(scores).reduce((s, sc) => s + sc.numIngredientes, 0)}
			</div>
			<div class="text-xs text-gray-500 dark:text-gray-400">Ingredientes Asignados</div>
		</div>
		<div
			class="rounded-2xl bg-white/60 p-4 text-center shadow backdrop-blur-sm dark:bg-gray-800/60"
		>
			<div class="text-2xl font-extrabold text-amber-600 dark:text-amber-400">
				{formatCurrency(Object.values(scores).reduce((s, sc) => s + sc.gastoEstimado, 0))}
			</div>
			<div class="text-xs text-gray-500 dark:text-gray-400">Gasto Total Estimado</div>
		</div>
	</div>

	<!-- Cards de Proveedores -->
	{#if filtrados.length === 0}
		<div class="py-20 text-center">
			<span class="text-6xl">🏪</span>
			<p class="mt-4 text-xl font-medium text-gray-500 dark:text-gray-400">
				No hay proveedores {soloActivos ? 'activos' : ''}
			</p>
			<button
				on:click={abrirCrear}
				class="mt-3 text-sm font-bold text-pink-500 hover:text-pink-700"
			>
				Crear el primero ahora
			</button>
		</div>
	{:else}
		<div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
			{#each filtrados as prov, i (prov.id)}
				{@const sc = scores[prov.id] || { numIngredientes: 0, gastoEstimado: 0, tendencia: 0 }}
				<div
					class="group relative overflow-hidden rounded-3xl border border-white/40 bg-white/60 shadow-lg backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl dark:border-gray-700 dark:bg-gray-800/60"
					in:fly={{ y: 30, duration: 400, delay: i * 60 }}
				>
					<!-- Status badge -->
					<div class="absolute top-4 right-4">
						{#if prov.activo}
							<span
								class="rounded-full bg-green-100 px-2.5 py-1 text-xs font-bold text-green-700 dark:bg-green-900/40 dark:text-green-300"
							>
								Activo
							</span>
						{:else}
							<span
								class="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-500 dark:bg-gray-700 dark:text-gray-400"
							>
								Inactivo
							</span>
						{/if}
					</div>

					<!-- Header -->
					<div class="p-5 pb-3">
						<h3 class="text-lg font-extrabold text-gray-800 dark:text-white">
							{prov.nombre}
						</h3>
						<div class="mt-1 text-sm" title="Calificación: {prov.calificacion}/5">
							{estrellas(prov.calificacion)}
						</div>
						{#if prov.dia_entrega}
							<p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
								📅 {prov.dia_entrega}
							</p>
						{/if}
						{#if prov.direccion}
							<p class="mt-1 truncate text-xs text-gray-400 dark:text-gray-500">
								📍 {prov.direccion}
							</p>
						{/if}
					</div>

					<!-- Scorecard -->
					<div
						class="mx-5 grid grid-cols-3 gap-2 rounded-xl bg-gradient-to-r from-pink-50/80 to-purple-50/80 p-3 dark:from-pink-900/15 dark:to-purple-900/15"
					>
						<div class="text-center">
							<div class="text-lg font-extrabold text-pink-600 dark:text-pink-400">
								{sc.numIngredientes}
							</div>
							<div class="text-[10px] text-gray-500 dark:text-gray-400">Insumos</div>
						</div>
						<div class="text-center">
							<div class="text-lg font-extrabold text-purple-600 dark:text-purple-400">
								{formatCurrency(sc.gastoEstimado)}
							</div>
							<div class="text-[10px] text-gray-500 dark:text-gray-400">Gasto Est.</div>
						</div>
						<div class="text-center">
							<div
								class="text-lg font-extrabold {sc.tendencia > 0
									? 'text-red-500'
									: sc.tendencia < 0
										? 'text-green-500'
										: 'text-gray-400'}"
							>
								{sc.tendencia > 0 ? '↑' : sc.tendencia < 0 ? '↓' : '='}
								{Math.abs(sc.tendencia)}%
							</div>
							<div class="text-[10px] text-gray-500 dark:text-gray-400">Tendencia</div>
						</div>
					</div>

					<!-- Contacto + Acciones -->
					<div
						class="flex items-center justify-between border-t border-pink-100/50 p-4 dark:border-gray-700/50"
					>
						<div class="flex gap-2">
							{#if prov.whatsapp}
								<button
									on:click={() => abrirWhatsApp(prov)}
									class="rounded-xl bg-green-100 p-2 text-green-600 transition hover:scale-110 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400"
									title="WhatsApp"
								>
									💬
								</button>
							{/if}
							{#if prov.telefono}
								<button
									on:click={() => llamar(prov)}
									class="rounded-xl bg-blue-100 p-2 text-blue-600 transition hover:scale-110 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400"
									title="Llamar"
								>
									📞
								</button>
							{/if}
							{#if prov.email}
								<a
									href="mailto:{prov.email}"
									class="rounded-xl bg-purple-100 p-2 text-purple-600 transition hover:scale-110 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-400"
									title="Email"
								>
									📧
								</a>
							{/if}
						</div>
						<div class="flex gap-2">
							<button
								on:click={() => abrirEditar(prov)}
								class="rounded-xl bg-pink-100 p-2 text-pink-600 transition hover:scale-110 hover:bg-pink-200 dark:bg-pink-900/30 dark:text-pink-400"
								title="Editar"
							>
								✏️
							</button>
							<button
								on:click={() => toggleActivo(prov)}
								class="rounded-xl bg-gray-100 p-2 text-gray-500 transition hover:scale-110 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400"
								title={prov.activo ? 'Desactivar' : 'Activar'}
							>
								{prov.activo ? '🚫' : '✅'}
							</button>
						</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<!-- Modal Crear/Editar -->
{#if mostrarModal}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm"
		transition:fade={{ duration: 200 }}
		on:click|self={() => (mostrarModal = false)}
	>
		<div
			class="max-h-[90vh] w-full max-w-lg space-y-5 overflow-y-auto rounded-3xl border border-white/30 bg-white/90 p-6 shadow-2xl backdrop-blur-xl dark:border-gray-600 dark:bg-gray-800/95"
			in:fly={{ y: 30, duration: 300 }}
		>
			<h2 class="text-xl font-extrabold text-pink-600 dark:text-pink-400">
				{editando ? '✏️ Editar Proveedor' : '➕ Nuevo Proveedor'}
			</h2>

			<div class="space-y-4">
				<!-- Nombre -->
				<div>
					<label
						for="prov-nombre"
						class="text-xs font-bold text-gray-500 uppercase dark:text-gray-400">Nombre *</label
					>
					<input
						id="prov-nombre"
						type="text"
						bind:value={form.nombre}
						placeholder="Ej: Éxito, Makro, Mercado Local..."
						class="mt-1 w-full rounded-xl border-pink-200 bg-white px-4 py-2.5 focus:border-pink-500 focus:ring-pink-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
					/>
				</div>

				<!-- Teléfono y WhatsApp -->
				<div class="grid grid-cols-2 gap-3">
					<div>
						<label
							for="prov-tel"
							class="text-xs font-bold text-gray-500 uppercase dark:text-gray-400"
							>📞 Teléfono</label
						>
						<input
							id="prov-tel"
							type="tel"
							bind:value={form.telefono}
							placeholder="300 123 4567"
							class="mt-1 w-full rounded-xl border-pink-200 bg-white px-4 py-2.5 focus:border-pink-500 focus:ring-pink-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
						/>
					</div>
					<div>
						<label
							for="prov-wa"
							class="text-xs font-bold text-gray-500 uppercase dark:text-gray-400"
							>💬 WhatsApp</label
						>
						<input
							id="prov-wa"
							type="tel"
							bind:value={form.whatsapp}
							placeholder="573001234567"
							class="mt-1 w-full rounded-xl border-pink-200 bg-white px-4 py-2.5 focus:border-pink-500 focus:ring-pink-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
						/>
					</div>
				</div>

				<!-- Email -->
				<div>
					<label
						for="prov-email"
						class="text-xs font-bold text-gray-500 uppercase dark:text-gray-400">📧 Email</label
					>
					<input
						id="prov-email"
						type="email"
						bind:value={form.email}
						placeholder="contacto@proveedor.com"
						class="mt-1 w-full rounded-xl border-pink-200 bg-white px-4 py-2.5 focus:border-pink-500 focus:ring-pink-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
					/>
				</div>

				<!-- Dirección y Día de Entrega -->
				<div class="grid grid-cols-2 gap-3">
					<div>
						<label
							for="prov-dir"
							class="text-xs font-bold text-gray-500 uppercase dark:text-gray-400"
							>📍 Dirección</label
						>
						<input
							id="prov-dir"
							type="text"
							bind:value={form.direccion}
							placeholder="Calle X #Y-Z"
							class="mt-1 w-full rounded-xl border-pink-200 bg-white px-4 py-2.5 focus:border-pink-500 focus:ring-pink-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
						/>
					</div>
					<div>
						<label
							for="prov-dia"
							class="text-xs font-bold text-gray-500 uppercase dark:text-gray-400"
							>📅 Día Entrega</label
						>
						<input
							id="prov-dia"
							type="text"
							bind:value={form.dia_entrega}
							placeholder="Lunes, Jueves"
							class="mt-1 w-full rounded-xl border-pink-200 bg-white px-4 py-2.5 focus:border-pink-500 focus:ring-pink-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
						/>
					</div>
				</div>

				<!-- Calificación -->
				<div>
					<label class="text-xs font-bold text-gray-500 uppercase dark:text-gray-400"
						>⭐ Calificación</label
					>
					<div class="mt-2 flex gap-1">
						{#each [1, 2, 3, 4, 5] as star}
							<button
								type="button"
								on:click={() => (form.calificacion = star)}
								class="text-2xl transition hover:scale-125 {form.calificacion >= star
									? 'opacity-100'
									: 'opacity-30'}"
							>
								⭐
							</button>
						{/each}
					</div>
				</div>

				<!-- Notas -->
				<div>
					<label
						for="prov-notas"
						class="text-xs font-bold text-gray-500 uppercase dark:text-gray-400">📝 Notas</label
					>
					<textarea
						id="prov-notas"
						bind:value={form.notas}
						rows="2"
						placeholder="Observaciones sobre este proveedor..."
						class="mt-1 w-full rounded-xl border-pink-200 bg-white px-4 py-2.5 focus:border-pink-500 focus:ring-pink-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
					/>
				</div>

				<!-- Activo -->
				<label class="flex items-center gap-3">
					<input
						type="checkbox"
						bind:checked={form.activo}
						class="rounded border-pink-300 text-pink-500 focus:ring-pink-500"
					/>
					<span class="text-sm font-medium text-gray-700 dark:text-gray-300">Proveedor activo</span>
				</label>
			</div>

			<!-- Botones -->
			<div class="flex justify-end gap-3 pt-2">
				<button
					on:click={() => (mostrarModal = false)}
					class="rounded-xl border border-gray-200 px-5 py-2.5 text-gray-600 transition hover:bg-gray-100 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700"
				>
					Cancelar
				</button>
				<button
					on:click={guardar}
					disabled={guardando || !form.nombre.trim()}
					class="rounded-xl bg-gradient-to-r from-pink-500 to-purple-500 px-6 py-2.5 font-bold text-white shadow-lg transition hover:scale-105 hover:shadow-xl disabled:opacity-50 disabled:hover:scale-100"
				>
					{guardando ? '⏳ Guardando...' : editando ? '💾 Actualizar' : '✅ Crear'}
				</button>
			</div>
		</div>
	</div>
{/if}

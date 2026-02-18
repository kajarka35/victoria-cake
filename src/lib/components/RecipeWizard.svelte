<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte';
	import { fade, slide, fly, scale } from 'svelte/transition';
	import { flip } from 'svelte/animate';
	import { supabase } from '$lib/supabaseClient';
	import { MOLDES_AMARENA_REF, renderMarkdown } from '$lib/kitchen';

	const dispatch = createEventDispatcher();

	// --- Props ---
	export let todosIngredientes: any[] = [];
	export let todasRecetas: any[] = [];
	export let isEditing: boolean = false;
	export let initialData: any = null;

	// --- State ---
	let step = 1;
	let loading = false;
	let createdRecipeId: string | null = null;
	let searchTerm = '';

	// --- State ---
	let receta = initialData
		? { ...initialData }
		: {
				nombre: '',
				categoria: 'tortas',
				molde: '14cm',
				rendimiento_base_g: 1800,
				porciones_base: 8,
				temperatura: 180,
				tiempo_horneado: '45-50 min',
				porcentaje_cif: 20,
				porcentaje_utilidad: 30,
				costo_empaque: 0,
				// New Fields for Dynamic Flows
				peso_lote_g: 0,
				unidades_producidas: 0,
				tamano_venta: '',
				instrucciones: '', // Persistencia final en string Markdown
				instrucciones_tipo: 'pasos' as 'pasos' | 'markdown'
			};

	onMount(() => {
		if (isEditing && initialData) {
			createdRecipeId = initialData.id;
			// Cargar composición existente si viene en initialData
			if (initialData.composicion) {
				composicionWizard = initialData.composicion.map((item: any) => ({
					id: item.id,
					type: item.sub_receta ? 'RECIPE' : 'MATERIAL',
					nombre: item.sub_receta ? item.sub_receta.nombre : item.ingrediente?.nombre,
					cantidad: item.cantidad,
					unidad: item.unidad
				}));
			}

			// Cargar instrucciones
			if (initialData.instrucciones && initialData.instrucciones_tipo === 'pasos') {
				// Reconstruir array desde MD si es posible (básico)
				const lines = initialData.instrucciones.split('\n\n');
				instruccionesArray = lines
					.map((line: string, i: number) => {
						const isTip = line.includes('> **Tip:**');
						const text = line.replace(/^\d+\.\s+/, '').replace(/>\s+\*\*Tip:\*\*\s+/, '');
						return { id: i, text, isTip };
					})
					.filter((p: any) => p.text.trim());
			}

			// UX CRÍTICA: Al editar, saltar directo al Smart Pantry
			step = 4;
		}
	});

	let instruccionesArray: { id: number; text: string; isTip: boolean }[] = [];
	let nuevoPaso = '';
	let nuevoPasoEsTip = false;
	let editIndex: number | null = null;
	let textareaRef: HTMLTextAreaElement;

	// --- Smart Defaults ---
	const CATEGORIAS = [
		{ id: 'tortas', icon: '🎂', label: 'Torta', color: 'from-pink-500 to-rose-500' },
		{ id: 'rellenos', icon: '🥣', label: 'Relleno', color: 'from-blue-400 to-indigo-500' },
		{ id: 'coberturas', icon: '🧁', label: 'Cobertura', color: 'from-purple-400 to-fuchsia-500' },
		{ id: 'postres', icon: '🍮', label: 'Postre', color: 'from-amber-400 to-orange-500' },
		{ id: 'bases', icon: '🍪', label: 'Base/Galleta', color: 'from-stone-400 to-stone-600' }
	];

	function updateYieldFromMold(moldeStr: string) {
		const cm = parseInt(moldeStr);
		const ref = MOLDES_AMARENA_REF.find((m) => m.cm === cm);
		if (ref) {
			receta.rendimiento_base_g = ref.ponque_g;
			// Regla de Oro Amarena: 65g por porción
			receta.porciones_base = Math.floor(ref.ponque_g / 65);
		}
	}

	function selectCategory(catId: string) {
		receta.categoria = catId;
		// Smart Logic based on Category
		switch (catId) {
			case 'tortas': // FLOW: Masa / Batido
				receta.molde = '14cm';
				updateYieldFromMold('14');
				receta.temperatura = 180;
				receta.tiempo_horneado = '45-50 min';
				break;
			case 'rellenos': // FLOW: Mezcla / Lote
			case 'coberturas':
				receta.molde = 'N/A';
				receta.peso_lote_g = 500; // Default
				receta.temperatura = 0;
				receta.tiempo_horneado = 'N/A';
				break;
			case 'postres': // FLOW: Ensamble / Producto Final
				receta.molde = '14cm'; // Or custom size
				receta.tamano_venta = '14cm';
				receta.temperatura = 0;
				receta.tiempo_horneado = 'N/A'; // Usually cold
				break;
			case 'bases': // Hybrid: Masa or Unitary
				receta.molde = '14cm';
				updateYieldFromMold('14');
				receta.temperatura = 170;
				break;
		}
	}

	// --- Local State for Wizard ---
	let composicionWizard: any[] = [];
	let addingId = '';
	let tempCantidad = 0;
	let tempUnidad = 'g'; // Default unit for the item being added

	// --- Actions ---
	async function finalizar() {
		if (!receta.nombre) return alert('¡Tu obra maestra necesita un nombre!');

		loading = true;

		if (isEditing && createdRecipeId) {
			const { error } = await supabase
				.from('recetas')
				.update({
					nombre: receta.nombre,
					categoria: receta.categoria,
					molde: receta.molde,
					rendimiento_base_g: receta.rendimiento_base_g,
					porciones_base: receta.porciones_base,
					temperatura: receta.temperatura,
					tiempo_horneado: receta.tiempo_horneado,
					porcentaje_cif: receta.porcentaje_cif,
					porcentaje_utilidad: receta.porcentaje_utilidad,
					costo_empaque: receta.costo_empaque,
					unidades_producidas: receta.unidades_producidas,
					peso_lote_g: receta.peso_lote_g
				})
				.eq('id', createdRecipeId);

			loading = false;
			if (error) {
				alert('Error actualizando receta: ' + error.message);
			} else {
				step = 4; // Go to Smart Pantry
			}
		} else {
			// Insert into DB
			const { data, error } = await supabase.from('recetas').insert([receta]).select().single();

			loading = false;

			if (error) {
				alert('Error creando receta: ' + error.message);
			} else {
				// SUCCESS: Move to Phase 2 (Population)
				createdRecipeId = data.id;
				step = 4; // Go to Smart Pantry
			}
		}
	}

	async function agregarItemWizard(item: any, type: 'MATERIAL' | 'RECIPE') {
		if (!createdRecipeId || tempCantidad <= 0) return;

		loading = true;

		// 1. Verificar si ya existe en la composición (Smart Update)
		const existingIndex = composicionWizard.findIndex((c) =>
			type === 'MATERIAL'
				? c.nombre === item.nombre && c.type === 'MATERIAL'
				: c.nombre === item.nombre && c.type === 'RECIPE'
		);

		if (existingIndex !== -1) {
			// UPDATE LOGIC
			const existingItem = composicionWizard[existingIndex];
			const newCantidad = existingItem.cantidad + tempCantidad;

			// Si el backend tuviera ID único para la relación, usariamos ese.
			// Como podemos tener múltiples filas o un constraint, vamos a tratar de actualizar por ID de relación si lo tenemos,
			// o borrar e insertar si es complejo, PERO lo ideal es actualizar la fila existente.
			// Asumimos que tenemos el ID en composicionWizard (lo mapeamos en onMount).

			if (existingItem.id) {
				const { error } = await supabase
					.from('recipe_composition')
					.update({ cantidad: newCantidad })
					.eq('id', existingItem.id);

				loading = false;
				if (error) alert('Error actualizando: ' + error.message);
				else {
					composicionWizard[existingIndex].cantidad = newCantidad;
					resetInput();
				}
			} else {
				// Fallback raro (item recién agregado sin reload)
				// En teoría el insert anterior nos dio ID? No, el insert anterior no guardo el ID en el array local... BUG POTENCIAL DETECTADO.
				// Vamos a corregir el Insert abajo para guardar el ID.
				loading = false;
				alert(
					'Por favor recarga la página para editar items recién creados (Limitación Temporal).'
				);
			}
			return;
		}

		// 2. INSERT LOGIC
		const payload: any = {
			parent_recipe_id: createdRecipeId,
			cantidad: tempCantidad,
			unidad: type === 'MATERIAL' ? tempUnidad : 'g'
		};

		if (type === 'MATERIAL') {
			payload.child_ingredient_id = item.id;
		} else {
			payload.child_recipe_id = item.id;
		}

		const { data, error } = await supabase
			.from('recipe_composition')
			.insert(payload)
			.select()
			.single();

		loading = false;

		if (error) {
			alert('Error: ' + error.message);
		} else {
			composicionWizard = [
				...composicionWizard,
				{
					id: data.id, // Guardamos ID retornado para futuros updates
					type,
					nombre: item.nombre,
					cantidad: tempCantidad,
					unidad: payload.unidad
				}
			];
			resetInput();
		}
	}

	function resetInput() {
		addingId = '';
		tempCantidad = 0;
		tempUnidad = 'g'; // Reset
		searchTerm = '';
	}

	async function terminarWizard() {
		// 1. Convertir array de instrucciones a Markdown si estamos en modo pasos
		if (receta.instrucciones_tipo === 'pasos' && instruccionesArray.length > 0) {
			const md = instruccionesArray
				.map((p, i) => `${i + 1}. ${p.isTip ? '> **Tip:** ' : ''}${p.text}`)
				.join('\n\n');
			receta.instrucciones = md;
		}

		// 2. Actualizar la receta en la DB
		if (createdRecipeId) {
			const { error } = await supabase
				.from('recetas')
				.update({
					instrucciones: receta.instrucciones,
					instrucciones_tipo: receta.instrucciones_tipo
				})
				.eq('id', createdRecipeId);

			if (error) console.error('Error guardando instrucciones:', error);
		}

		if (isEditing) {
			dispatch('actualizada', { id: createdRecipeId, ...receta });
		} else {
			dispatch('creada', { id: createdRecipeId, ...receta });
		}
	}

	function agregarPaso() {
		if (!nuevoPaso.trim()) return;

		if (editIndex !== null) {
			// Update mode
			instruccionesArray[editIndex] = {
				...instruccionesArray[editIndex],
				text: nuevoPaso.trim(),
				isTip: nuevoPasoEsTip
			};
			instruccionesArray = [...instruccionesArray];
			editIndex = null;
		} else {
			// Add mode
			instruccionesArray = [
				...instruccionesArray,
				{ id: Date.now(), text: nuevoPaso.trim(), isTip: nuevoPasoEsTip }
			];
		}

		nuevoPaso = '';
		nuevoPasoEsTip = false;
		// Masterstroke: Maintain focus after adding
		setTimeout(() => textareaRef?.focus(), 50);
	}

	function cargarEdicion(index: number) {
		editIndex = index;
		nuevoPaso = instruccionesArray[index].text;
		nuevoPasoEsTip = instruccionesArray[index].isTip;

		// Masterstroke: Focus with slight delay to ensure UI response
		setTimeout(() => textareaRef?.focus(), 50);
	}

	function moverPaso(index: number, direction: 'up' | 'down') {
		const targetIndex = direction === 'up' ? index - 1 : index + 1;
		if (targetIndex < 0 || targetIndex >= instruccionesArray.length) return;

		const temp = instruccionesArray[index];
		instruccionesArray[index] = instruccionesArray[targetIndex];
		instruccionesArray[targetIndex] = temp;
		instruccionesArray = [...instruccionesArray];
	}

	function eliminarPaso(index: number) {
		instruccionesArray = instruccionesArray.filter((_, i) => i !== index);
		if (editIndex === index) editIndex = null;
	}
</script>

<div
	class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-md"
	transition:fade={{ duration: 200 }}
>
	<div
		class="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-white/20 bg-white/90 shadow-2xl backdrop-blur-xl dark:bg-gray-800/90"
		transition:fly={{ y: 20, duration: 300 }}
	>
		<!-- Header Progress -->
		<div class="relative h-2 w-full bg-gray-100 dark:bg-gray-700">
			<div
				class="absolute h-full bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-600 transition-all duration-500"
				style="width: {(step / 6) * 100}%"
			></div>
		</div>

		<!-- Close Button -->
		<button
			on:click={() => dispatch('cerrar')}
			class="absolute top-4 right-4 z-10 rounded-full bg-gray-100/50 p-2 text-gray-500 backdrop-blur-sm transition hover:bg-red-100 hover:text-red-500 dark:bg-gray-700/50 dark:text-gray-300"
		>
			✕
		</button>

		<div class="p-8">
			<!-- Step 1: Identidad -->
			{#if step === 1}
				<div
					in:fly={{ x: 20, duration: 300 }}
					out:fly={{ x: -20, duration: 200 }}
					class="space-y-10"
				>
					<div class="text-center">
						<h2
							class="animate-in fade-in slide-in-from-bottom-4 bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-4xl font-extrabold text-transparent duration-700"
						>
							¿Qué vamos a hornear hoy?
						</h2>
						<p class="mt-2 text-lg text-gray-500 dark:text-gray-400">
							Dale un nombre único a tu creación.
						</p>
					</div>

					<div class="group relative mx-auto max-w-lg">
						<input
							bind:value={receta.nombre}
							class="w-full border-b-2 border-gray-200 bg-transparent py-4 text-center text-4xl font-bold text-gray-800 placeholder-gray-300 transition-all focus:border-pink-500 focus:outline-none dark:border-gray-600 dark:text-white"
							placeholder="Ej: Red Velvet Supremo"
						/>
						<span
							class="absolute bottom-0 left-0 h-[2px] w-0 bg-pink-500 transition-all duration-300 group-focus-within:w-full"
						></span>
					</div>
					<div class="grid grid-cols-3 gap-3 sm:grid-cols-5">
						{#each CATEGORIAS as cat}
							<button
								on:click={() => selectCategory(cat.id)}
								class="group flex flex-col items-center gap-2 rounded-xl border-2 p-3 transition-all {receta.categoria ===
								cat.id
									? `border-transparent bg-gradient-to-br ${cat.color} scale-105 text-white shadow-lg`
									: 'border-gray-100 bg-white text-gray-500 hover:border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400'}"
							>
								<span class="text-2xl">{cat.icon}</span>
								<span class="text-xs font-bold">{cat.label}</span>
							</button>
						{/each}
					</div>
				</div>
			{/if}

			<!-- Step 2: Configuración (Dynamic Flows) -->
			{#if step === 2}
				<div
					in:fly={{ x: 20, duration: 300 }}
					out:fly={{ x: -20, duration: 200 }}
					class="space-y-8"
				>
					<div class="text-center">
						<h2 class="text-3xl font-extrabold text-gray-800 dark:text-white">
							Ingeniería de Receta 📏
						</h2>
						<p class="text-gray-500 dark:text-gray-400">
							{#if receta.categoria === 'rellenos' || receta.categoria === 'coberturas'}
								Define el tamaño del lote de producción.
							{:else if receta.molde === 'Unidad'}
								Define la producción por unidades.
							{:else}
								Define molde y horneo base.
							{/if}
						</p>
					</div>

					<div class="grid gap-6 md:grid-cols-2">
						<!-- Card Principal: Geometría / Rendimiento -->
						<div
							class="rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-50/80 to-white/50 p-6 shadow-xl backdrop-blur-sm dark:border-indigo-900 dark:from-indigo-900/40 dark:to-gray-800/50"
						>
							<div class="mb-4 flex items-center gap-2">
								<span class="text-2xl">📐</span>
								<h3
									class="text-sm font-bold tracking-wider text-indigo-900 uppercase dark:text-indigo-200"
								>
									{#if receta.categoria === 'rellenos' || receta.categoria === 'coberturas'}
										Lote de Producción
									{:else if receta.categoria === 'postres'}
										Formato de Venta
									{:else}
										Base Amarena
									{/if}
								</h3>
							</div>

							<div class="space-y-5">
								<!-- FLOW: BATCH (Rellenos, Coberturas) -->
								{#if receta.categoria === 'rellenos' || receta.categoria === 'coberturas'}
									<div class="group">
										<label
											class="mb-1.5 block text-xs font-bold tracking-wide text-indigo-400 uppercase transition-colors group-focus-within:text-pink-500"
											>Peso Total del Lote (g)</label
										>
										<input
											type="number"
											bind:value={receta.peso_lote_g}
											placeholder="Ej: 500"
											class="w-full rounded-xl border border-indigo-200 bg-white px-4 py-3 text-center text-xl font-bold text-gray-700 shadow-sm transition-all focus:scale-105 focus:border-pink-500 focus:ring-2 focus:ring-pink-200 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
										/>
										<p class="mt-2 text-xs text-gray-400">*Suma total de ingredientes sugerida.</p>
									</div>

									<!-- FLOW: STANDARD / UNITARY / ASSEMBLY -->
								{:else}
									<div>
										<label
											class="mb-1.5 block text-xs font-bold tracking-wide text-indigo-400 uppercase"
											>Molde / Referencia</label
										>
										<div class="relative">
											<select
												bind:value={receta.molde}
												on:change={(e) => updateYieldFromMold(e.currentTarget.value)}
												class="w-full appearance-none rounded-xl border border-indigo-200 bg-white px-4 py-3 font-medium text-gray-700 shadow-sm transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
											>
												{#if receta.categoria === 'postres'}
													<!-- Postres usan Moldes Semi-Líquidos -->
													{#each MOLDES_AMARENA_REF as m}
														<option value="{m.cm}cm">Aro {m.cm}cm (Semi-Líquido)</option>
													{/each}
												{:else}
													<!-- Tortas usan Moldes Ponqué -->
													{#each MOLDES_AMARENA_REF as m}
														<option value="{m.cm}cm">Molde {m.cm}cm (Amarena)</option>
													{/each}
												{/if}
												<option value="Unidad">Por Unidad (Cupcakes/Galletas)</option>
												<option value="N/A">Personalizado / Otro</option>
											</select>
											<span
												class="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-indigo-400"
												>▼</span
											>
										</div>
									</div>

									{#if receta.molde === 'Unidad'}
										<!-- UNITARY LOGIC -->
										<div class="group">
											<label
												class="mb-1.5 block text-xs font-bold tracking-wide text-indigo-400 uppercase transition-colors group-focus-within:text-pink-500"
												>Cantidad Producción (Unidades)</label
											>
											<input
												type="number"
												bind:value={receta.unidades_producidas}
												placeholder="Ej: 12"
												class="w-full rounded-xl border border-indigo-200 bg-white px-4 py-3 text-center text-xl font-bold text-gray-700 shadow-sm transition-all focus:scale-105 focus:border-pink-500 focus:ring-2 focus:ring-pink-200 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
											/>
										</div>
									{:else}
										<!-- STANDARD LOGIC -->
										<div class="grid grid-cols-2 gap-4">
											<div class="group">
												<label
													class="mb-1.5 block text-xs font-bold tracking-wide text-indigo-400 uppercase transition-colors group-focus-within:text-pink-500"
													>Peso (g)</label
												>
												<input
													type="number"
													bind:value={receta.rendimiento_base_g}
													on:input={() => {
														if (receta.molde !== 'N/A' && receta.molde !== 'Unidad') {
															// Recalcular porciones si cambia el peso
															receta.porciones_base = Math.floor(receta.rendimiento_base_g / 65);
														}
													}}
													class="w-full rounded-xl border border-indigo-200 bg-white px-4 py-3 text-center font-bold text-gray-700 shadow-sm transition-all focus:scale-105 focus:border-pink-500 focus:ring-2 focus:ring-pink-200 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
												/>
											</div>
											<div class="group">
												<label
													class="mb-1.5 block text-xs font-bold tracking-wide text-indigo-400 uppercase transition-colors group-focus-within:text-pink-500"
													>Porciones</label
												>
												<input
													type="number"
													bind:value={receta.porciones_base}
													class="w-full rounded-xl border border-indigo-200 bg-white px-4 py-3 text-center font-bold text-gray-700 shadow-sm transition-all focus:scale-105 focus:border-pink-500 focus:ring-2 focus:ring-pink-200 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
												/>
											</div>
										</div>
									{/if}
								{/if}
							</div>
						</div>

						<!-- Card Secundaria: Horneo (Solo si aplica) -->
						{#if receta.categoria === 'tortas' || receta.categoria === 'bases'}
							<div
								class="rounded-3xl border border-orange-100 bg-gradient-to-br from-orange-50/80 to-white/50 p-6 shadow-xl backdrop-blur-sm dark:border-orange-900 dark:from-orange-900/40 dark:to-gray-800/50"
							>
								<div class="mb-4 flex items-center gap-2">
									<span class="text-2xl">🔥</span>
									<h3
										class="text-sm font-bold tracking-wider text-orange-900 uppercase dark:text-orange-200"
									>
										Horneo
									</h3>
								</div>

								<div class="space-y-5">
									<div>
										<label
											class="mb-1.5 block text-xs font-bold tracking-wide text-orange-400 uppercase"
											>Temperatura</label
										>
										<div class="flex items-center gap-4">
											<input
												type="range"
												min="0"
												max="250"
												step="10"
												bind:value={receta.temperatura}
												class="h-2 flex-1 cursor-pointer appearance-none rounded-lg bg-orange-200 accent-orange-500 transition-all hover:h-3"
											/>
											<div
												class="flex h-12 w-16 items-center justify-center rounded-xl bg-white font-bold text-orange-600 shadow-sm ring-1 ring-orange-100 dark:bg-gray-700 dark:text-white dark:ring-gray-600"
											>
												{receta.temperatura}°
											</div>
										</div>
									</div>

									<div class="group">
										<label
											class="mb-1.5 block text-xs font-bold tracking-wide text-orange-400 uppercase transition-colors group-focus-within:text-orange-600"
											>Tiempo</label
										>
										<input
											type="text"
											bind:value={receta.tiempo_horneado}
											placeholder="Ej: 45 min"
											class="w-full rounded-xl border-none bg-white/80 px-4 py-3 shadow-sm ring-1 ring-orange-200 transition-all focus:bg-white focus:ring-2 focus:ring-orange-400 focus:outline-none dark:bg-gray-700 dark:text-white dark:ring-gray-600"
										/>
									</div>
								</div>
							</div>
						{:else}
							<!-- Placeholder para Rellenos/Postres que no ocupan Horneo -->
							<div
								class="flex flex-col items-center justify-center rounded-3xl border border-dashed border-gray-200 bg-gray-50/50 p-6 text-center dark:border-gray-700 dark:bg-gray-800/50"
							>
								<span class="text-4xl opacity-50">❄️</span>
								<p class="mt-2 text-sm text-gray-400">
									Esta categoría no requiere configuración de horneo estándar.
								</p>
							</div>
						{/if}
					</div>
				</div>
			{/if}

			<!-- Step 3: Finanzas (Premium) -->
			{#if step === 3}
				<div
					in:fly={{ x: 20, duration: 300 }}
					out:fly={{ x: -20, duration: 200 }}
					class="space-y-8"
				>
					<div class="text-center">
						<h2 class="text-3xl font-extrabold text-gray-800 dark:text-white">
							Objetivos Financieros 💰
						</h2>
						<p class="text-gray-500 dark:text-gray-400">
							Configura tus márgenes para cálculo automático.
						</p>
					</div>

					<div class="space-y-6">
						<!-- CIF -->
						<div
							class="group rounded-2xl bg-gray-50 p-4 transition-all hover:bg-white hover:shadow-md dark:bg-gray-700/30 dark:hover:bg-gray-700"
						>
							<div class="mb-3 flex justify-between px-1">
								<label for="cif-slider" class="font-bold text-gray-700 dark:text-gray-300"
									>Costos Indirectos (CIF)</label
								>
								<span
									class="rounded-full bg-pink-100 px-3 py-0.5 font-mono text-sm font-bold text-pink-600 transition-all group-hover:scale-110 dark:bg-pink-900/50 dark:text-pink-300"
									>{receta.porcentaje_cif}%</span
								>
							</div>
							<input
								id="cif-slider"
								type="range"
								min="0"
								max="100"
								bind:value={receta.porcentaje_cif}
								class="h-3 w-full cursor-pointer appearance-none rounded-full bg-gray-200 accent-pink-500 transition-all hover:bg-gray-300 dark:bg-gray-600"
							/>
							<p class="mt-2 text-xs text-gray-400">
								💡 Gas, luz, agua, desgaste. La industria sugiere 20-25%.
							</p>
						</div>

						<!-- Utilidad -->
						<div
							class="group rounded-2xl bg-gray-50 p-4 transition-all hover:bg-white hover:shadow-md dark:bg-gray-700/30 dark:hover:bg-gray-700"
						>
							<div class="mb-3 flex justify-between px-1">
								<label for="utilidad-slider" class="font-bold text-gray-700 dark:text-gray-300"
									>Margen de Utilidad</label
								>
								<span
									class="rounded-full bg-green-100 px-3 py-0.5 font-mono text-sm font-bold text-green-600 transition-all group-hover:scale-110 dark:bg-green-900/50 dark:text-green-300"
									>{receta.porcentaje_utilidad}%</span
								>
							</div>
							<input
								id="utilidad-slider"
								type="range"
								min="0"
								max="100"
								bind:value={receta.porcentaje_utilidad}
								class="h-3 w-full cursor-pointer appearance-none rounded-full bg-gray-200 accent-green-500 transition-all hover:bg-gray-300 dark:bg-gray-600"
							/>
							<p class="mt-2 text-xs text-gray-400">
								💰 Tu ganancia neta. Victoria Cake recomienda >30%.
							</p>
						</div>

						<!-- Empaque -->
						<div
							class="group rounded-2xl bg-gray-50 p-4 transition-all hover:bg-white hover:shadow-md dark:bg-gray-700/30 dark:hover:bg-gray-700"
						>
							<label
								for="costo-empaque"
								class="mb-2 block px-1 font-bold text-gray-700 dark:text-gray-300"
								>Costo Promedio Empaque</label
							>
							<div class="relative">
								<span
									class="absolute top-1/2 left-4 -translate-y-1/2 text-lg text-gray-400 transition-colors group-focus-within:text-pink-500"
									>$</span
								>
								<input
									id="costo-empaque"
									type="number"
									bind:value={receta.costo_empaque}
									class="w-full rounded-xl border-2 border-transparent bg-white py-3 pl-10 text-lg font-semibold shadow-sm ring-1 ring-gray-200 transition-all focus:border-pink-500 focus:ring-0 focus:outline-none dark:bg-gray-800 dark:text-white dark:ring-gray-600"
									placeholder="0"
								/>
							</div>
						</div>
					</div>
				</div>
			{/if}

			<!-- Step 4: Smart Pantry (Premium Glass) -->
			{#if step === 4}
				<div
					in:fly={{ x: 20, duration: 300 }}
					out:fly={{ x: -20, duration: 200 }}
					class="space-y-6"
				>
					<div class="text-center">
						<h2 class="text-3xl font-extrabold text-gray-800 dark:text-white">Smart Pantry 🥚</h2>
						<p class="text-gray-500 dark:text-gray-400">Agrega los ingredientes base de tu masa.</p>
					</div>

					<!-- Search -->
					<div class="group relative">
						<span
							class="absolute top-1/2 left-5 -translate-y-1/2 text-xl text-gray-400 transition-colors group-focus-within:text-pink-500"
							>🔍</span
						>
						<input
							bind:value={searchTerm}
							class="w-full rounded-2xl border-2 border-transparent bg-gray-100/50 py-4 pl-14 text-lg backdrop-blur-sm transition-all focus:bg-white focus:shadow-xl focus:ring-2 focus:ring-pink-200 focus:outline-none dark:bg-gray-700/50 dark:focus:bg-gray-700"
							placeholder="Buscar harina, azúcar, huevos..."
						/>
					</div>

					<!-- Grid -->
					<div
						class="custom-scrollbar grid max-h-72 grid-cols-2 gap-4 overflow-y-auto p-2 sm:grid-cols-3"
					>
						{#each todosIngredientes.filter((i) => i.nombre
								.toLowerCase()
								.includes(searchTerm.toLowerCase())) as ing}
							{#if addingId === ing.id}
								<!-- Active Input Mode (Glass Card) -->
								<div
									class="col-span-1 flex flex-col justify-between gap-3 rounded-2xl border border-pink-200 bg-gradient-to-br from-white to-pink-50/50 p-4 shadow-xl backdrop-blur-md transition-all dark:border-pink-800 dark:from-gray-800 dark:to-pink-900/20"
									in:scale={{ duration: 200, start: 0.95 }}
								>
									<div class="flex items-start justify-between">
										<span class="leading-tight font-bold text-gray-800 dark:text-gray-100"
											>{ing.nombre}</span
										>
										<span class="text-xs font-bold text-pink-500">Editando</span>
									</div>

									<div class="flex items-center gap-2">
										<div class="relative flex-1">
											<input
												type="number"
												bind:value={tempCantidad}
												placeholder="0"
												class="w-full rounded-xl border border-pink-100 bg-white/80 py-2 pr-12 pl-3 text-center font-bold text-gray-800 shadow-inner focus:border-pink-400 focus:ring-4 focus:ring-pink-100 focus:outline-none dark:bg-gray-700 dark:text-white"
												on:keydown={(e) => e.key === 'Enter' && agregarItemWizard(ing, 'MATERIAL')}
												autoFocus
											/>
											<select
												bind:value={tempUnidad}
												class="absolute top-1/2 right-2 -translate-y-1/2 rounded-lg border-none bg-gray-100 px-1 py-0.5 text-[10px] font-bold text-gray-600 focus:ring-0 dark:bg-gray-600 dark:text-gray-300"
											>
												<option value="g">g</option>
												<option value="u">u</option>
												<option value="ml">ml</option>
												<option value="lb">lb</option>
											</select>
										</div>
										<button
											on:click={() => agregarItemWizard(ing, 'MATERIAL')}
											class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-lg shadow-pink-200/50 transition-transform hover:scale-110 active:scale-95 dark:shadow-none"
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
									</div>

									{#if tempUnidad === 'u'}
										<p class="text-[10px] font-medium text-pink-600 dark:text-pink-400">
											💡 Conversión auto: {tempCantidad}u ≈ {(ing.peso_referencia_g ||
												(ing.nombre.toLowerCase().includes('huevo') ? 50 : 0)) * tempCantidad}g
										</p>
									{/if}
								</div>
							{:else}
								<!-- Inactive Mode (Glass Button) -->
								<button
									on:click={() => {
										addingId = ing.id;
										tempCantidad = 0;
									}}
									class="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-white/60 bg-white/40 p-4 text-left shadow-sm backdrop-blur-md transition-all hover:-translate-y-1 hover:border-pink-200 hover:bg-white/60 hover:shadow-lg dark:border-gray-700 dark:bg-gray-800/40 dark:hover:border-gray-600"
								>
									<div class="mb-2">
										<span
											class="block text-sm font-semibold text-gray-700 transition-colors group-hover:text-pink-600 dark:text-gray-200 dark:group-hover:text-pink-400"
											>{ing.nombre}</span
										>
									</div>
									<div class="flex w-full items-center justify-between">
										<span class="text-[10px] font-medium tracking-wide text-gray-400 uppercase"
											>Ingrediente</span
										>
										<span
											class="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-gray-400 transition-colors group-hover:bg-pink-100 group-hover:text-pink-500 dark:bg-gray-700"
										>
											<svg
												xmlns="http://www.w3.org/2000/svg"
												class="h-4 w-4"
												viewBox="0 0 20 20"
												fill="currentColor"
											>
												<path
													fill-rule="evenodd"
													d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
													clip-rule="evenodd"
												/>
											</svg>
										</span>
									</div>
								</button>
							{/if}
						{/each}
					</div>

					<!-- Added List Preview -->
					{#if composicionWizard.length > 0}
						<div class="border-t border-gray-100 pt-4 dark:border-gray-700">
							<p class="mb-3 text-xs font-bold tracking-wider text-gray-400 uppercase">
								En el bowl:
							</p>
							<div class="flex flex-wrap gap-2">
								{#each composicionWizard as item}
									<span
										class="animate-in zoom-in flex items-center gap-1 rounded-full bg-gradient-to-r from-pink-100 to-purple-100 px-3 py-1 text-xs font-bold text-pink-700 shadow-sm dark:from-pink-900/40 dark:to-purple-900/40 dark:text-pink-300"
									>
										{item.nombre}
										<span class="ml-1 rounded-full bg-white/50 px-1.5 dark:bg-black/20"
											>{item.cantidad}{item.unidad}</span
										>
									</span>
								{/each}
							</div>
						</div>
					{/if}
				</div>
			{/if}

			<!-- Step 5: Sub-Recetas (Premium Glass) -->
			{#if step === 5}
				<div
					in:fly={{ x: 20, duration: 300 }}
					out:fly={{ x: -20, duration: 200 }}
					class="space-y-6"
				>
					<div class="text-center">
						<h2 class="text-3xl font-extrabold text-gray-800 dark:text-white">
							Capas & Rellenos 🍰
						</h2>
						<p class="text-gray-500 dark:text-gray-400">
							Agrega rellenos, coberturas o bases ya listas.
						</p>
					</div>

					<!-- Search -->
					<div class="group relative">
						<span
							class="absolute top-1/2 left-5 -translate-y-1/2 text-xl text-gray-400 transition-colors group-focus-within:text-purple-500"
							>🔍</span
						>
						<input
							bind:value={searchTerm}
							class="w-full rounded-2xl border-2 border-transparent bg-gray-100/50 py-4 pl-14 text-lg backdrop-blur-sm transition-all focus:bg-white focus:shadow-xl focus:ring-2 focus:ring-purple-200 focus:outline-none dark:bg-gray-700/50 dark:focus:bg-gray-700"
							placeholder="Buscar ganache, arequipe, crema..."
						/>
					</div>

					<!-- Grid -->
					<div
						class="custom-scrollbar grid max-h-72 grid-cols-2 gap-4 overflow-y-auto p-2 sm:grid-cols-3"
					>
						{#each todasRecetas.filter((r) => r.nombre
									.toLowerCase()
									.includes(searchTerm.toLowerCase()) && r.id !== createdRecipeId) as recetaItem}
							{#if addingId === recetaItem.id}
								<!-- Active Input Mode (Glass Card) -->
								<div
									class="col-span-1 flex flex-col justify-between gap-3 rounded-2xl border border-purple-200 bg-gradient-to-br from-white to-purple-50/50 p-4 shadow-xl backdrop-blur-md transition-all dark:border-purple-800 dark:from-gray-800 dark:to-purple-900/20"
									in:scale={{ duration: 200, start: 0.95 }}
								>
									<div class="flex items-start justify-between">
										<span class="leading-tight font-bold text-gray-800 dark:text-gray-100"
											>{recetaItem.nombre}</span
										>
										<span class="text-xs font-bold text-purple-500">Editando</span>
									</div>

									<div class="flex items-center gap-2">
										<div class="relative w-full">
											<input
												type="number"
												bind:value={tempCantidad}
												placeholder="0"
												class="w-full rounded-xl border border-purple-100 bg-white/80 py-2 pr-8 pl-3 text-center font-bold text-gray-800 shadow-inner focus:border-purple-400 focus:ring-4 focus:ring-purple-100 focus:outline-none dark:bg-gray-700 dark:text-white"
												on:keydown={(e) =>
													e.key === 'Enter' && agregarItemWizard(recetaItem, 'RECIPE')}
												autoFocus
											/>
											<span
												class="absolute top-1/2 right-3 -translate-y-1/2 text-xs font-bold text-gray-400"
												>g</span
											>
										</div>
										<button
											on:click={() => agregarItemWizard(recetaItem, 'RECIPE')}
											class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-lg shadow-purple-200/50 transition-transform hover:scale-110 active:scale-95 dark:shadow-none"
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
									</div>
								</div>
							{:else}
								<!-- Inactive Mode (Glass Button) -->
								<button
									on:click={() => {
										addingId = recetaItem.id;
										tempCantidad = 0;
									}}
									class="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-white/60 bg-white/40 p-4 text-left shadow-sm backdrop-blur-md transition-all hover:-translate-y-1 hover:border-purple-200 hover:bg-white/60 hover:shadow-lg dark:border-gray-700 dark:bg-gray-800/40 dark:hover:border-gray-600"
								>
									<div class="mb-2">
										<span
											class="block text-sm font-semibold text-gray-700 transition-colors group-hover:text-purple-600 dark:text-gray-200 dark:group-hover:text-purple-400"
											>{recetaItem.nombre}</span
										>
									</div>
									<div class="flex w-full items-center justify-between">
										<span class="text-[10px] font-medium tracking-wide text-gray-400 uppercase"
											>Sub-receta</span
										>
										<span
											class="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-gray-400 transition-colors group-hover:bg-purple-100 group-hover:text-purple-500 dark:bg-gray-700"
										>
											<svg
												xmlns="http://www.w3.org/2000/svg"
												class="h-4 w-4"
												viewBox="0 0 20 20"
												fill="currentColor"
											>
												<path
													fill-rule="evenodd"
													d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
													clip-rule="evenodd"
												/>
											</svg>
										</span>
									</div>
								</button>
							{/if}
						{/each}
					</div>

					<!-- Added List Preview -->
					{#if composicionWizard.length > 0}
						<div class="border-t border-gray-100 pt-4 dark:border-gray-700">
							<p class="mb-3 text-xs font-bold tracking-wider text-gray-400 uppercase">
								En el bowl:
							</p>
							<div class="flex flex-wrap gap-2">
								{#each composicionWizard as item}
									<span
										class="animate-in zoom-in flex items-center gap-1 rounded-full bg-gradient-to-r from-purple-100 to-pink-100 px-3 py-1 text-xs font-bold text-purple-700 shadow-sm dark:from-purple-900/40 dark:to-pink-900/40 dark:text-purple-300"
									>
										{item.nombre}
										<span class="ml-1 rounded-full bg-white/50 px-1.5 dark:bg-black/20"
											>{item.cantidad}{item.unidad}</span
										>
									</span>
								{/each}
							</div>
						</div>
					{/if}
				</div>
			{/if}

			<!-- Step 6: El Secreto del Chef (Instrucciones Premium) v2 Masterpiece -->
			{#if step === 6}
				<div
					in:fly={{ x: 20, duration: 400 }}
					out:fly={{ x: -20, duration: 200 }}
					class="relative space-y-6 overflow-hidden"
				>
					<!-- Inmersive Background Animation -->
					<div
						class="pointer-events-none absolute -inset-20 z-0 translate-z-0 opacity-40 dark:opacity-20"
					>
						<div
							class="absolute top-0 right-0 h-[300px] w-[300px] animate-pulse rounded-full bg-pink-400/20 blur-[100px]"
						></div>
						<div
							class="absolute bottom-0 left-0 h-[300px] w-[300px] animate-pulse rounded-full bg-indigo-400/20 blur-[100px]"
						></div>
					</div>

					<div class="relative z-10 text-center">
						<h2
							class="bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 bg-clip-text text-3xl font-black text-transparent"
						>
							El Secreto del Chef ✍️
						</h2>
						<p class="mb-4 text-sm font-medium text-gray-400 dark:text-gray-500">
							Documenta la alquimia detrás de tu creación.
						</p>

						<!-- Switch Premium de Modo -->
						<div class="mb-6 flex justify-center">
							<div
								class="flex items-center gap-1 rounded-2xl bg-gray-100 p-1.5 shadow-inner dark:bg-gray-800"
							>
								<button
									on:click={() => (receta.instrucciones_tipo = 'pasos')}
									class="flex items-center gap-2 rounded-xl px-5 py-2 text-xs font-black transition-all {receta.instrucciones_tipo ===
									'pasos'
										? 'bg-white text-pink-600 shadow-md dark:bg-gray-700 dark:text-pink-400'
										: 'text-gray-400 hover:text-gray-600'}"
								>
									<span>📋</span> PASOS
								</button>
								<button
									on:click={() => (receta.instrucciones_tipo = 'markdown')}
									class="flex items-center gap-2 rounded-xl px-5 py-2 text-xs font-black transition-all {receta.instrucciones_tipo ===
									'markdown'
										? 'bg-white text-indigo-600 shadow-md dark:bg-gray-700 dark:text-indigo-400'
										: 'text-gray-400 hover:text-gray-600'}"
								>
									<span>📝</span> MARKDOWN
								</button>
							</div>
						</div>
					</div>

					{#if receta.instrucciones_tipo === 'pasos'}
						<!-- Editor de Pasos con Brillo Dinámico -->
						<div
							class="group relative overflow-hidden rounded-[2.5rem] border border-white/40 bg-white/60 p-1 shadow-2xl backdrop-blur-2xl transition-all hover:shadow-pink-500/10 dark:border-gray-700/50 dark:bg-gray-800/60"
						>
							<!-- Efecto de Brillo de Fondo -->
							<div
								class="absolute -top-24 -left-24 h-48 w-48 rounded-full bg-pink-500/10 blur-[60px] transition-all group-focus-within:bg-pink-500/20"
							></div>

							<div class="relative space-y-4 p-5">
								<textarea
									bind:this={textareaRef}
									bind:value={nuevoPaso}
									placeholder="Ej: Mezcla con suavidad hasta obtener una textura de nube..."
									class="h-28 w-full resize-none rounded-3xl border-none bg-gray-50/50 p-5 text-gray-700 placeholder-gray-300 shadow-inner ring-1 ring-gray-100 transition-all focus:bg-white focus:ring-2 focus:ring-pink-200 focus:outline-none dark:bg-gray-900/40 dark:text-white dark:placeholder-gray-600 dark:ring-gray-700 dark:focus:ring-pink-900/50"
								></textarea>

								<div class="flex items-center justify-between gap-4">
									<button
										on:click={() => (nuevoPasoEsTip = !nuevoPasoEsTip)}
										class="flex items-center gap-2.5 rounded-2xl px-5 py-2.5 text-xs font-black tracking-wider uppercase transition-all {nuevoPasoEsTip
											? 'bg-amber-100 text-amber-600 shadow-lg shadow-amber-200/40 dark:bg-amber-900/40 dark:text-amber-300'
											: 'bg-white/50 text-gray-400 hover:bg-white dark:bg-gray-700/50 dark:hover:bg-gray-700'}"
									>
										<span class="text-base">{nuevoPasoEsTip ? '✨' : '💡'}</span>
										{nuevoPasoEsTip ? 'Chef Tip Activo' : 'Marcar como Tip'}
									</button>

									<button
										on:click={agregarPaso}
										disabled={!nuevoPaso.trim()}
										class="relative overflow-hidden rounded-2xl bg-gray-900 px-8 py-3 font-black text-white shadow-xl transition-all hover:scale-105 active:scale-95 disabled:opacity-30 dark:bg-pink-600 {editIndex !==
										null
											? 'ring-4 ring-pink-500/30'
											: ''}"
									>
										<span class="relative z-10 flex items-center gap-2">
											<span>{editIndex !== null ? '💾' : '+'}</span>
											<span>{editIndex !== null ? 'Actualizar Paso' : 'Agregar Paso'}</span>
										</span>
										{#if editIndex !== null}
											<div
												class="absolute inset-0 animate-pulse bg-gradient-to-r from-pink-500 to-purple-600 opacity-20"
											></div>
										{/if}
									</button>
								</div>
								{#if editIndex !== null}
									<button
										on:click={() => {
											editIndex = null;
											nuevoPaso = '';
											nuevoPasoEsTip = false;
										}}
										class="mt-2 text-xs font-bold text-gray-400 underline hover:text-gray-600"
									>
										Cancelar edición
									</button>
								{/if}
							</div>
						</div>

						<!-- Lista de Pasos con Visual Premium Masterstroke -->
						<div class="custom-scrollbar max-h-[340px] space-y-4 overflow-y-auto pr-3">
							{#each instruccionesArray as paso, i (paso.id)}
								<div
									animate:flip={{ duration: 400 }}
									class="group relative flex items-start gap-5 rounded-3xl border border-white/60 bg-white/40 p-5 shadow-sm backdrop-blur-md transition-all hover:bg-white/80 hover:shadow-md dark:border-gray-700/50 dark:bg-gray-800/40 dark:hover:bg-gray-800/60 {editIndex ===
									i
										? 'animate-pulse bg-white/90 ring-2 shadow-pink-500/20 ring-pink-500 dark:bg-gray-800/80'
										: ''}"
									in:fly={{ y: 20, duration: 400, delay: i * 50 }}
									out:scale={{ duration: 200 }}
								>
									<!-- Badge de Número -->
									<div
										class="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500 to-purple-600 text-base font-black text-white shadow-lg shadow-pink-500/20"
									>
										{i + 1}
									</div>

									<div class="min-w-0 flex-1 space-y-1.5">
										{#if paso.isTip}
											<div
												class="inline-flex items-center gap-1.5 rounded-full bg-amber-100/80 px-2.5 py-0.5 text-[9px] font-black tracking-[0.1em] text-amber-600 uppercase dark:bg-amber-900/40 dark:text-amber-300"
											>
												<span class="text-xs">💡</span> Chef Secret
											</div>
										{/if}
										<div class="text-[1.1rem] leading-[1.8] text-gray-800 dark:text-gray-200">
											{@html renderMarkdown(paso.text)}
										</div>
									</div>

									<!-- Acciones de Paso -->
									<div class="flex flex-col gap-1 opacity-0 transition-all group-hover:opacity-100">
										<!-- Subir/Bajar -->
										<div class="mb-1 flex gap-1">
											<button
												on:click={() => moverPaso(i, 'up')}
												disabled={i === 0}
												aria-label="Subir paso"
												class="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-pink-500 disabled:opacity-20"
												title="Subir"
											>
												▲
											</button>
											<button
												on:click={() => moverPaso(i, 'down')}
												disabled={i === instruccionesArray.length - 1}
												aria-label="Bajar paso"
												class="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-pink-500 disabled:opacity-20"
												title="Bajar"
											>
												▼
											</button>
										</div>
										<div class="flex gap-1">
											<button
												on:click={() => cargarEdicion(i)}
												aria-label="Editar paso"
												class="rounded-xl p-2 text-gray-400 transition-all hover:bg-pink-50 hover:text-pink-600"
												title="Editar"
											>
												<svg
													xmlns="http://www.w3.org/2000/svg"
													class="h-4 w-4"
													viewBox="0 0 20 20"
													fill="currentColor"
												>
													<path
														d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"
													/>
												</svg>
											</button>
											<button
												on:click={() => eliminarPaso(i)}
												aria-label="Eliminar paso"
												class="rounded-xl p-2 text-gray-300 transition-all hover:bg-red-50 hover:text-red-500"
												title="Eliminar"
											>
												<svg
													xmlns="http://www.w3.org/2000/svg"
													class="h-5 w-5"
													viewBox="0 0 20 20"
													fill="currentColor"
												>
													<path
														fill-rule="evenodd"
														d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
														clip-rule="evenodd"
													/>
												</svg>
											</button>
										</div>
									</div>
								</div>
							{:else}
								<!-- Empty State Journal Style -->
								<div
									class="flex flex-col items-center justify-center rounded-[3rem] border-2 border-dashed border-gray-100 bg-gray-50/30 py-14 text-center dark:border-gray-800 dark:bg-gray-900/20"
								>
									<div
										class="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-xl dark:bg-gray-800"
									>
										<span class="text-5xl opacity-80">📓</span>
									</div>
									<h3 class="text-lg font-bold text-gray-300 dark:text-gray-700">
										Tu Diario de Repostería
									</h3>
									<p class="mt-2 text-xs font-medium text-gray-400/80">
										¿Olvidaste algo? Puedes saltar este paso<br />y completar el secreto después.
									</p>
								</div>
							{/each}
						</div>
					{:else}
						<!-- Editor Markdown Puro Masterpiece -->
						<div
							class="group relative overflow-hidden rounded-[2.5rem] border border-white/40 bg-white/60 p-8 shadow-2xl backdrop-blur-3xl transition-all dark:border-gray-700/50 dark:bg-gray-800/60"
						>
							<div class="mb-4 flex items-center justify-between">
								<h3 class="text-[10px] font-black tracking-[0.2em] text-indigo-500 uppercase">
									Canvas Librepensador
								</h3>
								<span class="text-[10px] font-bold text-gray-400">Soporta GFM & HTML</span>
							</div>
							<textarea
								bind:value={receta.instrucciones}
								placeholder="Escribe tus instrucciones libremente con Markdown... 
# Título 
- Lista 
> Tip Master"
								class="min-h-[400px] w-full resize-none border-none bg-transparent font-mono text-sm leading-relaxed text-gray-700 placeholder-gray-300 focus:ring-0 dark:text-gray-300 dark:placeholder-gray-600"
							></textarea>
						</div>
					{/if}
				</div>
			{/if}
		</div>

		<!-- Footer Actions -->
		<div class="flex justify-between bg-gray-50 p-6 dark:bg-gray-700/50">
			{#if step > 1}
				<button
					on:click={() => step--}
					class="rounded-xl px-6 py-3 font-medium text-gray-500 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-600"
				>
					← Atrás
				</button>
			{:else}
				<div></div>
				<!-- Spacer -->
			{/if}

			{#if step < 3}
				<button
					on:click={() => {
						if (step === 1 && !receta.nombre) return alert('Por favor, ingresa un nombre.');
						step++;
					}}
					class="rounded-xl bg-gray-900 px-8 py-3 font-bold text-white shadow-lg transition hover:bg-gray-800 hover:shadow-xl dark:bg-white dark:text-gray-900"
				>
					Siguiente →
				</button>
			{:else if step === 3}
				<button
					on:click={finalizar}
					disabled={loading}
					class="flex items-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 px-8 py-3 font-bold text-white shadow-lg transition hover:from-pink-600 hover:to-purple-700 hover:shadow-pink-500/20 disabled:opacity-50"
				>
					{#if loading}
						⏳ Creando...
					{:else}
						✨ Crear y Agregar Insumos
					{/if}
				</button>
			{:else if step === 4}
				<button
					on:click={() => (step = 5)}
					class="rounded-xl bg-gray-900 px-8 py-3 font-bold text-white shadow-lg dark:bg-white dark:text-gray-900"
				>
					Siguiente: Sub-recetas →
				</button>
			{:else if step === 5}
				<button
					on:click={() => (step = 6)}
					class="rounded-xl bg-gray-900 px-8 py-3 font-bold text-white shadow-lg transition hover:bg-gray-800 dark:bg-white dark:text-gray-900"
				>
					Siguiente: Instrucciones →
				</button>
			{:else}
				<div class="flex items-center gap-4">
					{#if instruccionesArray.length === 0}
						<button
							on:click={terminarWizard}
							class="px-6 py-3 font-bold text-gray-400 transition hover:text-gray-600 dark:hover:text-gray-200"
						>
							Omitir e Ir al Recetario
						</button>
					{/if}
					<button
						on:click={terminarWizard}
						class="rounded-xl bg-green-500 px-8 py-3 font-bold text-white shadow-lg transition-all hover:bg-green-600 active:scale-95"
					>
						🎉 Terminar {instruccionesArray.length > 0 ? '& Guardar Secreto' : ''}
					</button>
				</div>
			{/if}
		</div>
	</div>
</div>

<style>
	.custom-scrollbar::-webkit-scrollbar {
		width: 4px;
	}
	.custom-scrollbar::-webkit-scrollbar-track {
		background: transparent;
	}
	.custom-scrollbar::-webkit-scrollbar-thumb {
		background: rgba(236, 72, 153, 0.2);
		border-radius: 10px;
	}
	.custom-scrollbar::-webkit-scrollbar-thumb:hover {
		background: rgba(236, 72, 153, 0.4);
	}

	/* Micro-animations for the Masterpiece Edition */
	@keyframes shine {
		0% {
			background-position: -200% center;
		}
		100% {
			background-position: 200% center;
		}
	}

	.shine-effect {
		background: linear-gradient(
			90deg,
			rgba(255, 255, 255, 0) 0%,
			rgba(255, 255, 255, 0.3) 50%,
			rgba(255, 255, 255, 0) 100%
		);
		background-size: 200% 100%;
		animation: shine 3s infinite linear;
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
		background-color: #ec4899;
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
		color: #6366f1;
	}
	.instructions-content :global(strong) {
		font-weight: 900;
	}
	:global(.dark) .instructions-content :global(strong) {
		color: #ffffff;
	}
	.instructions-content :global(h1),
	.instructions-content :global(h2),
	.instructions-content :global(h3) {
		font-weight: 900;
		margin-bottom: 0.5rem;
	}
	:global(.dark) .instructions-content :global(h1),
	:global(.dark) .instructions-content :global(h2),
	:global(.dark) .instructions-content :global(h3) {
		color: #ffffff;
	}
	.instructions-content :global(h1) {
		font-size: 1.5rem;
		color: #111827;
	}
	.instructions-content :global(h2) {
		font-size: 1.25rem;
		color: #4f46e5;
	}
</style>

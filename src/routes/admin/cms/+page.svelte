<script lang="ts">
	import { enhance } from '$app/forms';

	// Svelte 5 Native Syntax (Runes)
	interface CmsBlock {
		id: string;
		section: string;
		key: string;
		value: string;
		type: string;
		label?: string;
	}

	let { data, form } = $props<{
		data: { grouped: Record<string, CmsBlock[]> };
		form: any;
	}>();

	let loading = $state(false);
	let activeIconPicker = $state<string | null>(null); // "blockId-index"
	let confirmDelete = $state<string | null>(null); // "blockId-index" para confirmación

	// Estado Reactivo Central
	let jsonBlocks = $state<Record<string, any[]>>({});

	// Inicialización Segura (Single Pass)
	$effect(() => {
		if (data?.grouped) {
			(Object.values(data.grouped).flat() as CmsBlock[]).forEach((block) => {
				if (block.type === 'json_list' && !jsonBlocks[block.id]) {
					try {
						jsonBlocks[block.id] = block.value ? JSON.parse(block.value) : [];
					} catch {
						jsonBlocks[block.id] = [];
					}
				}
			});
		}
	});

	// --- LÓGICA DE REACTIVIDAD (FIX "NO CAMBIA") ---
	// Usamos reasignación del array para garantizar que Svelte repinte la UI

	function addItem(blockId: string) {
		if (!jsonBlocks[blockId]) jsonBlocks[blockId] = [];
		// Spread para crear nueva referencia
		jsonBlocks[blockId] = [
			...jsonBlocks[blockId],
			{ icon: 'whatsapp', label: 'Nuevo Contacto', link: '', color: 'gray' }
		];
	}

	function removeItem(blockId: string, index: number) {
		const newArr = [...jsonBlocks[blockId]];
		newArr.splice(index, 1);
		jsonBlocks[blockId] = newArr;
	}

	function updateIcon(blockId: string, index: number, icon: string) {
		const newArr = [...jsonBlocks[blockId]];
		newArr[index] = { ...newArr[index], icon }; // Nueva referencia del item
		jsonBlocks[blockId] = newArr; // Trigger reactividad
		activeIconPicker = null;
	}

	function updateColor(blockId: string, index: number, colorId: string) {
		const newArr = [...jsonBlocks[blockId]];
		newArr[index] = { ...newArr[index], color: colorId }; // Nueva referencia del item
		jsonBlocks[blockId] = newArr; // Trigger reactividad
	}

	// --- CONFIGURACIÓN UI ---

	const sectionNames: Record<string, string> = {
		home_hero: '🏠 Página de Inicio (Hero)',
		global_contact: '📞 Contacto Global',
		home_products: '🍰 Sección Productos',
		global_seo: '🌐 Configuración SEO (Google)'
	};

	// Lista de campos Legacy a ocultar en la sección de contacto
	const LEGACY_FIELDS = [
		'whatsapp',
		'phone',
		'email',
		'facebook',
		'instagram',
		'tiktok',
		'instagram_url'
	];

	// Helper para saber si mostrar un bloque
	function shouldShowBlock(section: string, key: string) {
		// En Global Contact, ocultar si la key contiene palabras legacy (salvo que sea el json_list)
		if (section === 'global_contact') {
			if (key === 'contact_cards') return true; // El nuevo gestor
			if (LEGACY_FIELDS.some((field) => key.toLowerCase().includes(field))) return false;
		}
		return true;
	}

	// --- ASSETS EXPANDIDOS (NUEVOS ICONOS Y COLORES) ---

	const ICONS: Record<string, string> = {
		// Comunicación
		whatsapp:
			'<path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>',
		phone:
			'<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>',
		email:
			'<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>',
		messenger:
			'<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>',
		telegram: '<path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/>',

		// Redes Sociales
		instagram:
			'<rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>',
		facebook: '<path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>',
		tiktok: '<path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"/>',
		youtube:
			'<path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17"/><path d="m10 15 5-3-5-3z"/>',
		twitter:
			'<path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"/>',
		linkedin:
			'<path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/>',

		// Utilidad & Negocio
		map: '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>',
		pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
		store:
			'<path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/><path d="M22 7v3a2 2 0 0 1-2 2v0a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12v0a2 2 0 0 1-2-2V7"/>',
		motorcycle:
			'<circle cx="5.5" cy="17.5" r="3.5"/><circle cx="18.5" cy="17.5" r="3.5"/><path d="M15 6h5a1 1 0 0 1 1 1v4"/><path d="M12 9V5a1 1 0 0 0-1-1H7L4.29 7.64"/><path d="M19 14v-3h-6l-2.6 1.8"/><path d="M2.5 17.5H2"/>',
		clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
		calendar:
			'<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
		globe:
			'<circle cx="12" cy="12" r="10"/><line x1="2" x2="22" y1="12" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
		star: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
		link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>'
	};

	const COLORS = [
		{ id: 'green', hex: '#dcfce7', border: '#16a34a', label: 'Verde' },
		{ id: 'teal', hex: '#ccfbf1', border: '#0d9488', label: 'Verde Azulado' },
		{ id: 'lime', hex: '#ecfccb', border: '#65a30d', label: 'Lima' },
		{ id: 'blue', hex: '#dbeafe', border: '#2563eb', label: 'Azul' },
		{ id: 'cyan', hex: '#cffafe', border: '#0891b2', label: 'Cian' },
		{ id: 'indigo', hex: '#e0e7ff', border: '#4f46e5', label: 'Índigo' },
		{ id: 'pink', hex: '#fce7f3', border: '#db2777', label: 'Rosa' },
		{ id: 'red', hex: '#fee2e2', border: '#dc2626', label: 'Rojo' },
		{ id: 'orange', hex: '#ffedd5', border: '#ea580c', label: 'Naranja' },
		{ id: 'yellow', hex: '#fef9c3', border: '#ca8a04', label: 'Amarillo' },
		{ id: 'purple', hex: '#f3e8ff', border: '#9333ea', label: 'Morado' },
		{ id: 'slate', hex: '#f1f5f9', border: '#475569', label: 'Pizarra' },
		{ id: 'gray', hex: '#f9fafb', border: '#9ca3af', label: 'Gris' }
	];
</script>

<div class="mx-auto max-w-7xl px-6 py-8" onclick={() => (activeIconPicker = null)}>
	<div class="mb-8 flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold text-gray-800">Gestor de Contenidos</h1>
			<p class="text-gray-500">Edita textos y configuraciones de toda la web en tiempo real.</p>
		</div>
		<a href="/admin/panel" class="font-medium text-pink-600 hover:underline">← Volver al Panel</a>
	</div>

	{#if form?.success}
		<div
			class="animate-in fade-in slide-in-from-top-2 mb-6 flex items-center gap-2 rounded-lg border border-green-100 bg-green-50 p-4 text-green-700 shadow-sm"
		>
			<span class="text-xl">✅</span> <strong>¡Cambios guardados correctamente!</strong>
		</div>
	{/if}

	<form
		method="POST"
		action="?/update"
		use:enhance={() => {
			loading = true;
			return async ({ update }) => {
				await update();
				loading = false;
			};
		}}
		class="space-y-8 pb-32"
	>
		{#each Object.entries(data.grouped as Record<string, CmsBlock[]>) as [section, blocks]}
			<div
				class="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm ring-1 ring-gray-950/5"
			>
				<div class="border-b border-gray-100 bg-gray-50/80 px-6 py-4 backdrop-blur-sm">
					<h2 class="flex items-center gap-2 text-lg font-semibold text-gray-800">
						{#if section === 'home_hero'}🏠
						{:else if section === 'global_contact'}📞
						{:else if section === 'home_products'}🍰
						{:else if section === 'global_seo'}🌐
						{:else}📁{/if}
						{sectionNames[section] || section}
					</h2>
				</div>

				<div class="grid gap-8 p-6 md:grid-cols-2">
					{#each blocks as block}
						<!-- Verificar si mostrar el bloque (Limpieza UI) -->
						{#if shouldShowBlock(section, block.key)}
							<!-- Forzar orden visual: Títulos primero en Contacto -->
							<!-- (Esto es un hack visual simple: ordenamos con flex order o simplemente confiamos en el renderizado natural si el sort del DB fuera correcto. 
								 Como el DB sort puede variar, vamos a añadir un "order" style inline si es un titulo) -->

							{#if block.type === 'json_list'}
								<div
									class="order-last col-span-2 mt-6 space-y-6 rounded-2xl border border-blue-100 bg-blue-50/30 p-6 shadow-sm"
								>
									<h3 class="flex items-center gap-2 text-lg font-bold text-blue-900">
										<span class="rounded-lg bg-blue-100 p-1.5 text-blue-600">📇</span>
										{block.label || 'Lista de Contactos'}
									</h3>

									<input
										type="hidden"
										name="block_{block.id}"
										value={JSON.stringify(jsonBlocks[block.id] || [])}
									/>

									<div class="space-y-3">
										{#if jsonBlocks[block.id]}
											{#each jsonBlocks[block.id] as item, index (item)}
												{#if !item.icon}
													{(item.icon = 'whatsapp')}
												{/if}

												<div
													class="group relative flex flex-col gap-3 rounded-xl border border-gray-100 bg-white p-3 shadow-sm transition-all hover:border-pink-100 hover:shadow-md"
												>
													<!-- ABSOLUTE DELETE ACTION (Top-Right) -->
													<div class="absolute right-2 top-2 z-10">
														{#if confirmDelete === `${block.id}-${index}`}
															<div
																class="animate-in fade-in zoom-in flex items-center gap-1 rounded-full bg-red-50 p-1 shadow-sm ring-1 ring-red-100 duration-200"
															>
																<button
																	type="button"
																	class="rounded-full bg-red-500 px-3 py-1 text-[10px] font-bold text-white shadow-sm"
																	onclick={(e) => {
																		e.preventDefault();
																		e.stopPropagation();
																		removeItem(block.id, index);
																		confirmDelete = null;
																	}}
																>
																	BORRAR
																</button>
																<button
																	type="button"
																	class="flex h-6 w-6 items-center justify-center rounded-full text-gray-400 hover:bg-gray-200 hover:text-gray-600"
																	onclick={(e) => {
																		e.preventDefault();
																		e.stopPropagation();
																		confirmDelete = null;
																	}}
																>
																	✕
																</button>
															</div>
														{:else}
															<button
																type="button"
																class="flex h-7 w-7 items-center justify-center rounded-full text-gray-300 opacity-60 hover:bg-red-50 hover:text-red-500 hover:opacity-100"
																onclick={(e) => {
																	e.preventDefault();
																	e.stopPropagation();
																	confirmDelete = `${block.id}-${index}`;
																}}
																title="Eliminar"
															>
																✕
															</button>
														{/if}
													</div>

													<!-- ROW 1: Icon + Inputs -->
													<div class="flex items-start gap-3 pr-8">
														<!-- ICON PICKER -->
														<div class="relative shrink-0">
															<button
																type="button"
																class="flex h-12 w-12 items-center justify-center rounded-xl border border-gray-200 bg-gray-50 text-gray-600 shadow-sm transition-all hover:border-pink-200 hover:bg-pink-50 hover:text-pink-600"
																onclick={(e) => {
																	e.stopPropagation();
																	activeIconPicker =
																		activeIconPicker === `${block.id}-${index}`
																			? null
																			: `${block.id}-${index}`;
																}}
															>
																<svg
																	viewBox="0 0 24 24"
																	fill="none"
																	stroke="currentColor"
																	stroke-width="2"
																	stroke-linecap="round"
																	stroke-linejoin="round"
																	class="h-6 w-6"
																>
																	{@html ICONS[item.icon] || ICONS['link']}
																</svg>
															</button>

															<!-- Dropdown -->
															{#if activeIconPicker === `${block.id}-${index}`}
																<div
																	class="animate-in fade-in zoom-in-95 absolute left-0 top-14 z-50 grid w-[80vw] max-w-[280px] grid-cols-5 gap-2 rounded-2xl border border-gray-100 bg-white p-3 shadow-xl duration-200"
																	onclick={(e) => e.stopPropagation()}
																>
																	{#each Object.entries(ICONS) as [key, svg]}
																		<button
																			type="button"
																			class="flex aspect-square items-center justify-center rounded-xl p-2 transition-all hover:bg-gray-100 {item.icon ===
																			key
																				? 'bg-pink-50 text-pink-600 ring-2 ring-pink-500 ring-offset-1'
																				: 'text-gray-500'}"
																			onclick={() => updateIcon(block.id, index, key)}
																		>
																			<svg
																				viewBox="0 0 24 24"
																				fill="none"
																				stroke="currentColor"
																				stroke-width="2"
																				stroke-linecap="round"
																				stroke-linejoin="round"
																				class="h-full w-full p-0.5">{@html svg}</svg
																			>
																		</button>
																	{/each}
																</div>
															{/if}
														</div>

														<div class="grid w-full flex-1 gap-2">
															<div class="group/input relative">
																<span
																	class="absolute left-2.5 top-2.5 text-[9px] font-bold uppercase tracking-wider text-gray-400"
																	>Etiqueta</span
																>
																<input
																	type="text"
																	class="w-full rounded-lg border-gray-200 bg-gray-50/50 py-1.5 pl-16 pr-2 text-sm font-medium transition-all focus:border-pink-500 focus:bg-white focus:ring-pink-500"
																	placeholder="Nombre..."
																	bind:value={jsonBlocks[block.id][index].label}
																/>
															</div>
															<div class="group/input relative">
																<span
																	class="absolute left-2.5 top-2.5 text-[9px] font-bold uppercase tracking-wider text-gray-400"
																	>URL</span
																>
																<input
																	type="text"
																	class="w-full rounded-lg border-gray-200 bg-gray-50/50 py-1.5 pl-16 pr-2 font-mono text-xs text-gray-500 transition-all focus:border-pink-500 focus:bg-white focus:ring-pink-500"
																	placeholder="https://..."
																	bind:value={jsonBlocks[block.id][index].link}
																/>
															</div>
														</div>
													</div>

													<!-- ROW 2: Colors (Horizontal Scroll) -->
													<div class="w-full overflow-hidden">
														<div class="scrollbar-hide -mx-3 overflow-x-auto px-3 pb-1">
															<div class="flex min-w-max gap-1.5">
																{#each COLORS as color}
																	<button
																		type="button"
																		class="h-7 w-7 shrink-0 rounded-full transition-all focus:outline-none"
																		style="background-color: {color.hex}; box-shadow: {item.color ===
																		color.id
																			? `0 0 0 2px #fff, 0 0 0 3px ${color.border}`
																			: 'inset 0 0 0 1px rgba(0,0,0,0.05)'}"
																		onclick={() => updateColor(block.id, index, color.id)}
																	></button>
																{/each}
															</div>
														</div>
													</div>
												</div>
											{/each}
										{/if}
									</div>

									<div class="flex justify-center pb-2 pt-4">
										<button
											type="button"
											class="group relative flex items-center justify-center gap-3 rounded-xl border-2 border-dashed border-blue-200 bg-white/50 px-8 py-3 text-sm font-bold text-blue-600 transition-all hover:border-blue-500 hover:bg-blue-50 hover:text-blue-700 active:scale-95"
											onclick={() => addItem(block.id)}
										>
											<span
												class="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-blue-600 transition-colors group-hover:bg-blue-600 group-hover:text-white"
												>✚</span
											>
											<span>Agregar Nuevo Contacto</span>
										</button>
									</div>
								</div>
							{:else}
								<!-- STANDARD BLOCKS (Premium Style) -->
								<div class="group col-span-2 md:col-span-1">
									<div
										class="relative flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-1 shadow-sm transition-all focus-within:ring-2 focus-within:ring-pink-500/20 hover:border-pink-200"
									>
										<!-- ICON (Visual Context) -->
										<div
											class="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gray-50 text-xl shadow-sm transition-colors group-hover:bg-pink-50"
										>
											{#if block.key.includes('title')}📝
											{:else if block.key.includes('btn')}🔘
											{:else if block.key.includes('sub')}📄
											{:else if block.key.includes('seo')}🔍
											{:else if block.key.includes('url')}🔗
											{:else}✏️{/if}
										</div>

										<!-- INPUT CONTEXT -->
										<div class="relative w-full">
											<span
												class="absolute left-1 top-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400 group-focus-within:text-pink-500"
											>
												{block.label || block.key.replace(/_/g, ' ')}
											</span>

											{#if block.type === 'long_text'}
												<textarea
													name="block_{block.id}"
													rows="2"
													class="w-full resize-y bg-transparent px-1 pb-1 pt-6 text-sm font-medium text-gray-800 placeholder-gray-300 outline-none transition-all"
													value={block.value}
												></textarea>
											{:else}
												<input
													type="text"
													name="block_{block.id}"
													value={block.value}
													class="w-full bg-transparent px-1 pb-1 pt-6 text-sm font-medium text-gray-800 placeholder-gray-300 outline-none transition-all"
												/>
											{/if}
										</div>
									</div>
								</div>
							{/if}
						{/if}
						<!-- Fin filter -->
					{/each}
				</div>
			</div>
		{/each}

		<!-- FLOATING ACTION BAR MODERN -->
		<div
			class="fixed bottom-0 left-0 z-40 w-full border-t border-gray-200/50 bg-white/80 p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] backdrop-blur-md transition-all md:sticky md:bottom-6 md:w-auto md:justify-end md:rounded-full md:border-none md:bg-transparent md:p-0 md:shadow-none md:backdrop-filter-none"
		>
			<div class="mx-auto flex max-w-7xl justify-end">
				<button
					type="submit"
					disabled={loading}
					class="w-full rounded-xl bg-gradient-to-r from-pink-600 to-rose-500 px-8 py-4 font-bold text-white shadow-lg transition-all hover:scale-[1.02] hover:shadow-pink-500/25 active:scale-95 disabled:opacity-70 disabled:grayscale md:w-auto md:rounded-full md:py-3"
				>
					{loading ? '⏳ Guardando...' : '💾 Guardar Cambios'}
				</button>
			</div>
		</div>
	</form>
</div>

<style>
	:global(body) {
		background-color: #f8fafc;
	}
</style>

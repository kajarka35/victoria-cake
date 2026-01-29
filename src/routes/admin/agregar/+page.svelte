<script lang="ts">
	import { supabase } from '$lib/supabaseClient.js';
	import { goto } from '$app/navigation';
	import { tick } from 'svelte';

	let nombre = '';
	let descripcion = '';
	let precio = '';
	let imagenFile: File | null = null;
	let loading = false;
	let success = false;
	let error = '';
	let vistaPrevia: string | null = null;

	async function agregarProducto() {
		loading = true;
		error = '';
		success = false;

		try {
			if (!imagenFile) {
				error = 'Debes seleccionar una imagen.';
				return;
			}

			// Subir imagen
			const filePath = `productos/${crypto.randomUUID()}-${imagenFile.name}`;
			const { error: uploadError } = await supabase.storage
				.from('imagenes-productos')
				.upload(filePath, imagenFile);

			if (uploadError) throw uploadError;

			// Obtener URL pública
			const { data: imageUrlData } = supabase.storage
				.from('imagenes-productos')
				.getPublicUrl(filePath);

			const publicUrl = imageUrlData.publicUrl;

			// Insertar producto con imagen y path
			const { error: insertError } = await supabase.from('productos').insert([
				{
					nombre,
					descripcion,
					precio,
					imagen: publicUrl,
					imagen_path: filePath // 👈 Aquí guardas la ruta interna
				}
			]);

			if (insertError) throw insertError;

			success = true;
			await tick();
			setTimeout(() => goto('/admin/panel'), 1500);
		} catch (e) {
			error = '❌ Hubo un error al guardar. Intenta nuevamente.';
			console.error(e);
		} finally {
			loading = false;
		}
	}

	function handleFileChange(e: Event) {
		const target = e.target as HTMLInputElement;
		if (target?.files && target.files.length > 0) {
			imagenFile = target.files[0];
			vistaPrevia = URL.createObjectURL(imagenFile); // 👈 URL de vista previa
		}
	}
</script>

<section
	class="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-pink-100 via-white to-white px-4 py-20 font-[Inter] text-gray-900 transition-colors duration-500 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 dark:text-white"
>
	<!-- Decorative blurred shapes -->
	<div
		class="absolute -top-10 -left-10 h-96 w-96 animate-pulse rounded-full bg-pink-300 opacity-20 blur-3xl"
	></div>
	<div
		class="absolute right-0 bottom-0 h-72 w-72 animate-pulse rounded-full bg-purple-200 opacity-20 blur-2xl delay-300"
	></div>

	<form
		on:submit|preventDefault={agregarProducto}
		class="animate-fade-in z-10 w-full max-w-xl space-y-6 rounded-3xl bg-white/60 p-10 shadow-2xl backdrop-blur-2xl dark:bg-gray-800/50"
	>
		<h1 class="text-center text-4xl font-extrabold text-pink-600 drop-shadow-md dark:text-pink-400">
			Agregar Producto
		</h1>

		<input
			bind:value={nombre}
			required
			placeholder="Nombre del producto"
			class="w-full rounded-2xl border border-pink-200 bg-white/80 px-5 py-3 text-gray-800 placeholder-gray-500 backdrop-blur-md transition-all duration-300 focus:ring-2 focus:ring-pink-400 focus:outline-none dark:border-gray-700 dark:bg-gray-900/50 dark:text-white dark:placeholder-gray-400"
		/>

		<textarea
			bind:value={descripcion}
			required
			placeholder="Descripción"
			class="w-full rounded-2xl border border-pink-200 bg-white/80 px-5 py-3 text-gray-800 placeholder-gray-500 backdrop-blur-md transition-all duration-300 focus:ring-2 focus:ring-pink-400 focus:outline-none dark:border-gray-700 dark:bg-gray-900/50 dark:text-white dark:placeholder-gray-400"
		></textarea>

		<input
			bind:value={precio}
			required
			placeholder="Precio"
			type="number"
			step="0.01"
			class="w-full rounded-2xl border border-pink-200 bg-white/80 px-5 py-3 text-gray-800 placeholder-gray-500 backdrop-blur-md transition-all duration-300 focus:ring-2 focus:ring-pink-400 focus:outline-none dark:border-gray-700 dark:bg-gray-900/50 dark:text-white dark:placeholder-gray-400"
		/>

		<label class="block w-full">
			<span class="mb-2 block text-sm font-medium text-pink-600 dark:text-pink-400"
				>Imagen del producto</span
			>
			<input
				type="file"
				accept="image/*"
				required
				on:change={handleFileChange}
				class="w-full rounded-2xl border border-dashed border-pink-300 bg-white/80 px-5 py-3 text-gray-800 transition-all duration-300 file:mr-4 file:rounded-full file:border-0 file:bg-pink-100 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-pink-700 hover:file:bg-pink-200 dark:border-gray-700 dark:bg-gray-900/50 dark:text-white"
			/>
		</label>

		{#if vistaPrevia}
			<div class="mt-4 flex w-full flex-col items-center gap-2">
				<span class="text-sm font-semibold text-pink-600 dark:text-pink-300"
					>📸 Vista previa del producto</span
				>

				<div
					class="relative w-full max-w-sm overflow-hidden rounded-3xl border-4 border-pink-100 shadow-xl dark:border-pink-900"
				>
					<img
						src={vistaPrevia}
						alt="Vista previa"
						class="h-64 w-full rounded-2xl object-cover transition-transform duration-500 hover:scale-105 sm:h-72 md:h-80"
					/>
					<div
						class="absolute right-2 bottom-2 rounded-full bg-white/70 px-3 py-1 text-xs font-medium text-pink-600 shadow-sm backdrop-blur-sm dark:bg-gray-900/60 dark:text-pink-300"
					>
						Victoria Cake
					</div>
				</div>
			</div>
		{/if}

		{#if error}
			<div class="text-center text-sm text-red-500">{error}</div>
		{/if}
		{#if success}
			<div class="animate-fade-in text-center text-sm text-green-500">
				✅ Producto agregado correctamente
			</div>
		{/if}

		<button
			type="submit"
			class="flex w-full transform items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-pink-500 to-pink-600 py-3 font-semibold text-white shadow-lg transition-all duration-300 hover:scale-[1.03] hover:from-pink-600 hover:to-pink-700 hover:shadow-2xl disabled:opacity-50"
		>
			{#if loading}
				<span class="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"
				></span> Guardando...
			{:else}
				💾 Guardar
			{/if}
		</button>
	</form>
</section>

<style>
	@keyframes fade-in {
		from {
			opacity: 0;
			transform: translateY(24px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.animate-fade-in {
		animation: fade-in 0.8s ease-out both;
	}

	html {
		scroll-behavior: smooth;
	}
</style>

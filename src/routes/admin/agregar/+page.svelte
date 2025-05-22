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



<section class="min-h-screen bg-gradient-to-br from-pink-100 via-white to-white dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 text-gray-900 dark:text-white px-4 py-20 transition-colors duration-500 font-[Inter] flex items-center justify-center relative overflow-hidden">
  <!-- Decorative blurred shapes -->
  <div class="absolute -top-10 -left-10 w-96 h-96 bg-pink-300 rounded-full opacity-20 blur-3xl animate-pulse"></div>
  <div class="absolute bottom-0 right-0 w-72 h-72 bg-purple-200 rounded-full opacity-20 blur-2xl animate-pulse delay-300"></div>

  <form on:submit|preventDefault={agregarProducto} class="w-full max-w-xl bg-white/60 dark:bg-gray-800/50 backdrop-blur-2xl shadow-2xl rounded-3xl p-10 space-y-6 animate-fade-in z-10">
    <h1 class="text-4xl font-extrabold text-center text-pink-600 dark:text-pink-400 drop-shadow-md">Agregar Producto</h1>

    <input bind:value={nombre} required placeholder="Nombre del producto" class="w-full px-5 py-3 rounded-2xl border border-pink-200 dark:border-gray-700 bg-white/80 dark:bg-gray-900/50 backdrop-blur-md text-gray-800 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-400 transition-all duration-300" />

    <textarea bind:value={descripcion} required placeholder="Descripción" class="w-full px-5 py-3 rounded-2xl border border-pink-200 dark:border-gray-700 bg-white/80 dark:bg-gray-900/50 backdrop-blur-md text-gray-800 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-400 transition-all duration-300"></textarea>

    <input bind:value={precio} required placeholder="Precio" type="number" step="0.01" class="w-full px-5 py-3 rounded-2xl border border-pink-200 dark:border-gray-700 bg-white/80 dark:bg-gray-900/50 backdrop-blur-md text-gray-800 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-400 transition-all duration-300" />

<label class="w-full block">
  <span class="block text-sm font-medium text-pink-600 dark:text-pink-400 mb-2">Imagen del producto</span>
  <input
    type="file"
    accept="image/*"
    required
    on:change={handleFileChange}
    class="w-full px-5 py-3 rounded-2xl border border-dashed border-pink-300 dark:border-gray-700 bg-white/80 dark:bg-gray-900/50 text-gray-800 dark:text-white file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-pink-100 file:text-pink-700 hover:file:bg-pink-200 transition-all duration-300"
  />
</label>

{#if vistaPrevia}
  <div class="w-full flex flex-col items-center gap-2 mt-4">
    <span class="text-sm font-semibold text-pink-600 dark:text-pink-300">📸 Vista previa del producto</span>
    
    <div class="relative w-full max-w-sm overflow-hidden rounded-3xl shadow-xl border-4 border-pink-100 dark:border-pink-900">
      <img
        src={vistaPrevia}
        alt="Vista previa"
        class="object-cover w-full h-64 sm:h-72 md:h-80 transition-transform duration-500 hover:scale-105 rounded-2xl"
      />
      <div class="absolute bottom-2 right-2 bg-white/70 dark:bg-gray-900/60 px-3 py-1 text-xs font-medium text-pink-600 dark:text-pink-300 rounded-full backdrop-blur-sm shadow-sm">
        Victoria Cake
      </div>
    </div>
  </div>
{/if}


    {#if error}
      <div class="text-sm text-red-500 text-center">{error}</div>
    {/if}
    {#if success}
      <div class="text-sm text-green-500 text-center animate-fade-in">✅ Producto agregado correctamente</div>
    {/if}

    <button type="submit" class="w-full flex justify-center items-center gap-3 bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white font-semibold py-3 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-[1.03] disabled:opacity-50">
      {#if loading} <span class="animate-spin border-2 border-white border-t-transparent rounded-full w-5 h-5"></span> Guardando... {:else} 💾 Guardar {/if}
    </button>
  </form>
</section>

<style>
  @keyframes fade-in {
    from { opacity: 0; transform: translateY(24px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .animate-fade-in {
    animation: fade-in 0.8s ease-out both;
  }

  html {
    scroll-behavior: smooth;
  }
</style>

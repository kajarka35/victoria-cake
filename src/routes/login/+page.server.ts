import type { PageServerLoad } from './$types.js';

export const load: PageServerLoad = async () => {
	// Loop Breaker:
	// No redirigimos automáticamente desde el servidor.
	// Si el usuario llega aquí es porque necesita loguearse o su sesión expiró.
	// Permitimos que renderice el formulario de login.
	// La redirección ocurrirá post-login exitoso.
	return {};
};

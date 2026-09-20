/** ID de medición de Google Analytics 4. Solo viene de PUBLIC_GA_ID; nunca se escribe en el repositorio. */
export const GA_ID: string = import.meta.env.PUBLIC_GA_ID ?? '';

/** Sin ID no hay analítica: ni aviso de cookies, ni botón «Cookies», ni carga de nada. */
export const ANALYTICS_ENABLED: boolean = GA_ID !== '';

/** Solo se carga analítica en estos dominios (producción): ni localhost ni las URL de prueba de Pages. */
export const GA_HOSTS: string[] = ['quesuena.es', 'www.quesuena.es'];

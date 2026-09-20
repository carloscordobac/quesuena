/** ID de medición de Google Analytics 4. Vacío (PUBLIC_GA_ID=) = analítica desactivada. */
export const GA_ID: string = import.meta.env.PUBLIC_GA_ID ?? 'G-QTXWZZJHSE';

/** Solo se carga analítica en estos dominios (producción): ni localhost ni las URL de prueba de Pages. */
export const GA_HOSTS: string[] = ['quesuena.es', 'www.quesuena.es'];

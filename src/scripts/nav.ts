/*
 * Menú de la cabecera. El botón de hamburguesa empieza oculto (`hidden` en el HTML):
 * sin JavaScript, el menú queda siempre visible en la cabecera (se envuelve en varias
 * líneas si hace falta), así que la navegación nunca depende de que este script cargue.
 * Con JavaScript, el botón aparece y el menú se pliega solo en pantallas estrechas (CSS).
 */
function init(): void {
  const toggle = document.getElementById('nav-toggle') as HTMLButtonElement | null;
  const nav = document.getElementById('site-nav');
  const label = toggle?.querySelector<HTMLElement>('.nav-toggle-label');
  if (!toggle || !nav) return;

  document.body.classList.add('nav-js');
  toggle.hidden = false;

  function isOpen(): boolean {
    return nav!.hasAttribute('data-open');
  }
  function close(): void {
    nav!.removeAttribute('data-open');
    toggle!.setAttribute('aria-expanded', 'false');
    if (label) label.textContent = 'Menú';
  }
  function open(): void {
    nav!.setAttribute('data-open', '');
    toggle!.setAttribute('aria-expanded', 'true');
    if (label) label.textContent = 'Cerrar';
  }

  toggle.addEventListener('click', () => (isOpen() ? close() : open()));

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen()) {
      close();
      toggle!.focus();
    }
  });

  document.addEventListener('click', (e) => {
    if (!isOpen()) return;
    const target = e.target as Node;
    if (nav!.contains(target) || toggle!.contains(target)) return;
    close();
  });
}

init();

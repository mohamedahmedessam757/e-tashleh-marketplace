const EXTENDED_FONTS_ID = 'etashleh-fonts-extended';

export function loadExtendedFonts(): void {
  if (typeof document === 'undefined' || document.getElementById(EXTENDED_FONTS_ID)) return;

  const link = document.createElement('link');
  link.id = EXTENDED_FONTS_ID;
  link.rel = 'stylesheet';
  link.href = '/fonts-extended.css';
  document.head.appendChild(link);
}

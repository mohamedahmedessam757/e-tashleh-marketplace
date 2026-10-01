import { useEffect } from 'react';

/**
 * While enabled, keeps --app-height equal to the visible viewport (shrinks when the
 * mobile keyboard opens) and pins the document so the page itself never scrolls.
 */
export function useVisualViewportHeight(enabled: boolean): void {
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;
    const root = document.documentElement;
    const vv = window.visualViewport;
    let frame = 0;

    const apply = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const height = vv ? vv.height : window.innerHeight;
        root.style.setProperty('--app-height', `${Math.round(height)}px`);
        if (window.scrollY !== 0) window.scrollTo(0, 0);
      });
    };

    apply();
    vv?.addEventListener('resize', apply);
    vv?.addEventListener('scroll', apply);
    window.addEventListener('resize', apply);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      cancelAnimationFrame(frame);
      vv?.removeEventListener('resize', apply);
      vv?.removeEventListener('scroll', apply);
      window.removeEventListener('resize', apply);
      document.body.style.overflow = previousOverflow;
      root.style.removeProperty('--app-height');
    };
  }, [enabled]);
}

import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';

const API_URL = import.meta.env.VITE_API_URL || 'https://api.e-tashleh.net';

export interface StaticPageContent {
  slug: string;
  titleAr?: string | null;
  titleEn?: string | null;
  contentAr?: string | null;
  contentEn?: string | null;
  updatedAt?: string;
}

export function useStaticPage(slug: string) {
  const [page, setPage] = useState<StaticPageContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch(`${API_URL}/static-pages/${slug}`);
        if (!res.ok) throw new Error('Page not found');
        const data = await res.json();
        if (!cancelled) setPage(data);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    const channel = supabase
      .channel(`static_page_${slug}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'static_pages', filter: `slug=eq.${slug}` }, load)
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [slug]);

  return { page, loading, error };
}

import { createClient } from '@supabase/supabase-js';

// Supabase client initialisation. Uses Expo public env vars so it works in RN.
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

export const supabase = SUPABASE_URL && SUPABASE_ANON_KEY
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: false,
      },
    })
  : null;

// Upload a plain‑text article document for Improved Technologies.
// We use a deterministic path so we can overwrite on each save without
// storing extra columns in Postgres.
export async function uploadImprovedArticleDoc(
  articleId: number,
  lang: 'en' | 'ta',
  content: string,
): Promise<string | null> {
  if (!supabase) return null;
  if (!content.trim()) return null;

  const bucket = 'articles'; // make sure this bucket exists in Supabase Storage
  const filePath = `improved-articles/${articleId}/${lang}.txt`;

  try {
    // RN environments can be flaky with Blob/File; Uint8Array is the most portable.
    const payload: any =
      typeof TextEncoder !== 'undefined'
        ? new TextEncoder().encode(content)
        : new Blob([content], { type: 'text/plain; charset=utf-8' });

    const { error } = await supabase.storage.from(bucket).upload(filePath, payload, {
      contentType: 'text/plain; charset=utf-8',
      upsert: true,
    } as any);

    if (error) {
      console.warn(
        'Supabase uploadImprovedArticleDoc error:',
        (error as any).message || error,
      );
      return null;
    }

    return filePath;
  } catch (e: any) {
    console.warn('Supabase uploadImprovedArticleDoc failed:', e?.message || e);
    return null;
  }
}

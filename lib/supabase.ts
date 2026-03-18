import { createBrowserClient } from "@supabase/ssr";

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

function isProbablyValidUrl(url: string) {
  return /^https?:\/\//i.test(url);
}

export function isSupabaseConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY && isProbablyValidUrl(SUPABASE_URL));
}

export function getSupabaseBrowserClient() {
  if (typeof window === "undefined") return null;
  if (!isSupabaseConfigured()) return null;
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

export type QuizQuestion = {
  question: string;
  options: [string, string, string, string];
  correctIndex: 0 | 1 | 2 | 3;
};

export type QuizRow = {
  id: string;
  code: string;
  title: string | null;
  host_id: string;
  questions: QuizQuestion[];
  created_at: string;
};


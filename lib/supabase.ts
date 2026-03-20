import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type QuizQuestion = {
  question: string;
  options: [string, string, string, string];
  correctIndex: number;
};

export type QuizRow = {
  id: string;
  code: string;
  title: string;
  questions: unknown[];
  status: string;
  current_question_index: number;
  phase: string;
  phase_start_time: string | null;
  created_at: string;
  host_id?: string;
  read_seconds?: number;
  answer_seconds?: number;
};
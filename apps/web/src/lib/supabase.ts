import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type LeadInsert = {
  name: string;
  email: string;
  message: string;
  page_path?: string;
};

let client: SupabaseClient | null = null;

export function getSupabaseBrowser(): SupabaseClient | null {
  const url = import.meta.env.PUBLIC_SUPABASE_URL as string | undefined;
  const key = import.meta.env.PUBLIC_SUPABASE_ANON_KEY as string | undefined;
  if (!url || !key) return null;
  if (!client) client = createClient(url, key);
  return client;
}

export async function submitLead(lead: LeadInsert): Promise<{ ok: true } | { ok: false; error: string }> {
  const sb = getSupabaseBrowser();
  if (!sb) {
    return { ok: false, error: "Configuration Supabase manquante." };
  }

  const { error } = await sb.from("leads").insert({
    name: lead.name.trim(),
    email: lead.email.trim().toLowerCase(),
    message: lead.message.trim(),
    page_path: lead.page_path ?? "/contact",
  });

  if (error) {
    return { ok: false, error: error.message || "Envoi impossible." };
  }
  return { ok: true };
}

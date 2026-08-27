import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

/** Même pattern que apps/web/src/lib/supabase.ts — clé publique (anon),
 * jamais de secret ici. Les actions privilégiées passent par les Edge
 * Functions admin-leads / admin-generate-content, qui vérifient le JWT.
 *
 * persistSession: false — uniquement utilisé par l'admin (voir Admin.tsx).
 * Le lien vers /app-demo/admin/ est public (pied de page du site), donc la
 * session ne doit pas survivre à la fermeture de l'onglet/navigateur :
 * sans ça, un token Supabase restait indéfiniment dans le localStorage
 * (auto-refresh), et quiconque avec accès à ce navigateur entrait dans
 * l'admin sans mot de passe. */
export function getSupabase(): SupabaseClient | null {
  const url = import.meta.env.PUBLIC_SUPABASE_URL as string | undefined;
  const key = import.meta.env.PUBLIC_SUPABASE_ANON_KEY as string | undefined;
  if (!url || !key) return null;
  if (!client) client = createClient(url, key, { auth: { persistSession: false } });
  return client;
}

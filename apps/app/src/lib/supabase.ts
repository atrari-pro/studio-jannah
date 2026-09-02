import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

/** Même pattern que apps/web/src/lib/supabase.ts — clé publique (anon),
 * jamais de secret ici. Les actions privilégiées passent par les Edge
 * Functions admin-leads / admin-generate-content, qui vérifient le JWT.
 *
 * Session persistée dans sessionStorage (pas localStorage, pas
 * persistSession:false) — compromis entre les deux extrêmes :
 * - localStorage aurait fait survivre la session à la fermeture du
 *   navigateur (le lien vers /app-demo/admin/ est public, pied de page du
 *   site — trop permissif sur un poste partagé).
 * - persistSession:false (choix initial) forçait une reconnexion à chaque
 *   rechargement de page, y compris en cours de travail — pénible sans
 *   bénéfice de sécurité réel pour un usage mono-poste.
 * sessionStorage tient le compromis : connecté tant que l'onglet/le
 * navigateur reste ouvert, effacé à la fermeture. */
export function getSupabase(): SupabaseClient | null {
  const url = import.meta.env.PUBLIC_SUPABASE_URL as string | undefined;
  const key = import.meta.env.PUBLIC_SUPABASE_ANON_KEY as string | undefined;
  if (!url || !key) return null;
  if (!client) {
    client = createClient(url, key, {
      auth: { persistSession: true, storage: window.sessionStorage, autoRefreshToken: true },
    });
  }
  return client;
}

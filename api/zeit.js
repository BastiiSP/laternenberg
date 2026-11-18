// Liefert die Serverzeit, damit die Türchen-Freigabe nicht von der Uhr des Handys abhängt.
export const config = { runtime: 'edge' };

export default function handler() {
  return new Response(JSON.stringify({ now: Date.now() }), {
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store, max-age=0' },
  });
}

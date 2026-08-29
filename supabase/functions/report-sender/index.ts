// Supabase Edge Function: authenticated, server-side sender-report increment.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async request => {
  try {
    const authorization = request.headers.get('Authorization') || '';
    const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authorization } } });
    const { data: { user } } = await userClient.auth.getUser();
    const { senderValue } = await request.json();
    const sender = String(senderValue || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\s+/g, '');
    if (!user || !sender || sender.length > 160) return new Response('Unauthorized or invalid sender', { status: 400 });
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data, error } = await admin.rpc('increment_sender_report', { p_sender_value: sender });
    if (error) throw error;
    return Response.json({ senderReport: data });
  } catch (_) { return new Response('Could not save sender report', { status: 500 }); }
});

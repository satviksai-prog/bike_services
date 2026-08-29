// Supabase Edge Function: lightweight website title/text brand-impersonation check.
const BRANDS: Record<string, string> = {
  sbi: 'onlinesbi.sbi', hdfc: 'hdfcbank.com', icici: 'icicibank.com', axis: 'axisbank.com',
  kotak: 'kotak.bank.in', 'bank of baroda': 'bankofbaroda.in', pnb: 'pnbindia.in', canara: 'canarabank.com',
  'union bank': 'unionbankofindia.co.in', idfc: 'idfcfirstbank.com', amazon: 'amazon.in', flipkart: 'flipkart.com',
  paytm: 'paytm.com', phonepe: 'phonepe.com', 'google pay': 'pay.google.com', 'bharatpe': 'bharatpe.com',
  myntra: 'myntra.com', 'jio mart': 'jiomart.com'
};

const blockedHost = (host: string) => host === 'localhost' || host.endsWith('.local') ||
  /^(127\.|10\.|192\.168\.|169\.254\.|0\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host) ||
  host === '::1' || host.startsWith('fc') || host.startsWith('fd') || host.startsWith('fe80:');

Deno.serve(async request => {
  try {
    const { url } = await request.json();
    const target = new URL(url);
    if (!/^https?:$/.test(target.protocol) || blockedHost(target.hostname.toLowerCase())) return Response.json({ alerts: [] });
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    // Do not follow redirects server-side: a redirect could point to a private
    // address. The browser can show the URL result without contacting it here.
    const response = await fetch(target, { signal: controller.signal, headers: { 'User-Agent': 'CyberShieldSafetyCheck/1.0' }, redirect: 'manual' });
    clearTimeout(timeout);
    if (!response.ok) return Response.json({ alerts: [] });
    const html = (await response.text()).slice(0, 220000);
    const text = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').toLowerCase();
    const host = target.hostname.toLowerCase();
    const alerts = Object.entries(BRANDS).filter(([brand, domain]) => text.includes(brand) && host !== domain && !host.endsWith(`.${domain}`))
      .slice(0, 2).map(([brand, domain]) => ({ type: 'impersonation', message: `Impersonation Risk — this page mentions ${brand.toUpperCase()} but is not hosted on ${domain}, its official website.` }));
    return Response.json({ alerts });
  } catch (_) { return Response.json({ alerts: [] }); }
});

// No outgoing emails during development, including direct calls to this function.
const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Content-Type": "application/json" };
Deno.serve(async (req) => req.method === "OPTIONS" ? new Response(null, { headers: corsHeaders }) : new Response(JSON.stringify({ processed: 0, sent: 0, paused: true, results: [] }), { headers: corsHeaders }));

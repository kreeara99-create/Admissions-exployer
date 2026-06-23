// Netlify Edge Function — Deno runtime, no timeout
// Note: Netlify Edge Functions use context.env, NOT Deno.env or process.env

export default async (request, context) => {

  const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS, GET'
  };

  const json = (data, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { ...CORS, 'Content-Type': 'application/json' }
    });

  // Diagnostic GET — visit /api/search in browser to check status
  if (request.method === 'GET') {
    // Try every possible way to get the env var
    const fromContext = context?.env?.ANTHROPIC_API_KEY;
    const fromDeno = typeof Deno !== 'undefined' ? Deno.env.get('ANTHROPIC_API_KEY') : undefined;
    const fromProcess = typeof process !== 'undefined' ? process?.env?.ANTHROPIC_API_KEY : undefined;
    const key = fromContext || fromDeno || fromProcess;
    return json({
      status: 'edge function alive',
      hasApiKey: !!key,
      keyPrefix: key ? key.slice(0, 12) + '...' : 'NOT FOUND',
      fromContext: !!fromContext,
      fromDeno: !!fromDeno,
      fromProcess: !!fromProcess,
      time: new Date().toISOString()
    });
  }

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: CORS });
  }

  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  // Try every possible way to get the API key in Netlify Edge runtime
  const apiKey =
    context?.env?.ANTHROPIC_API_KEY ||
    (typeof Deno !== 'undefined' && Deno.env.get('ANTHROPIC_API_KEY')) ||
    (typeof process !== 'undefined' && process?.env?.ANTHROPIC_API_KEY);

  if (!apiKey) {
    return json({ error: 'ANTHROPIC_API_KEY not found. Set it in Netlify Dashboard → Site configuration → Environment variables, then redeploy.' }, 500);
  }

  let body;
  try { body = await request.json(); }
  catch (e) { return json({ error: 'Invalid request body: ' + e.message }, 400); }

  const payload = {
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 600,
    system: body.system || 'Be concise. Return HTML only.',
    messages: body.messages || []
  };

  try {
    const anthropicResp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(payload)
    });

    const rawText = await anthropicResp.text();

    if (!rawText || rawText.trim() === '') {
      return json({ error: 'Anthropic returned empty body', httpStatus: anthropicResp.status }, 502);
    }

    let parsed;
    try { parsed = JSON.parse(rawText); }
    catch (e) {
      return json({ error: 'Anthropic returned non-JSON', preview: rawText.slice(0, 300) }, 502);
    }

    return new Response(JSON.stringify(parsed), {
      status: anthropicResp.status,
      headers: { ...CORS, 'Content-Type': 'application/json' }
    });

  } catch (err) {
    return json({ error: 'Fetch to Anthropic failed: ' + err.message }, 502);
  }
};

export const config = { path: '/api/search' };

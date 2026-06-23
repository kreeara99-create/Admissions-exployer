export default async (request, context) => {

  const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS, GET'
  };

  // GET request — diagnostic ping so we can test the function is alive
  if (request.method === 'GET') {
    const apiKey = Netlify.env.get('ANTHROPIC_API_KEY');
    return new Response(JSON.stringify({
      status: 'function alive',
      hasApiKey: !!apiKey,
      keyPrefix: apiKey ? apiKey.slice(0,10)+'...' : 'NOT SET',
      node: process.version,
      time: new Date().toISOString()
    }), { status: 200, headers: { ...CORS, 'Content-Type': 'application/json' } });
  }

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: CORS });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { ...CORS, 'Content-Type': 'application/json' }
    });
  }

  const apiKey = Netlify.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY not set' }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' }
    });
  }

  let body;
  try { body = await request.json(); }
  catch (e) {
    return new Response(JSON.stringify({ error: 'Bad request body: ' + e.message }), {
      status: 400, headers: { ...CORS, 'Content-Type': 'application/json' }
    });
  }

  const payload = {
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 500,
    system: body.system || 'Be concise.',
    messages: body.messages || []
  };

  let anthropicResponse;
  try {
    anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(payload)
    });
  } catch (fetchErr) {
    return new Response(JSON.stringify({ error: 'Fetch to Anthropic failed: ' + fetchErr.message }), {
      status: 502, headers: { ...CORS, 'Content-Type': 'application/json' }
    });
  }

  // Read as text first so we never get empty-body parse errors
  const rawText = await anthropicResponse.text();

  if (!rawText || rawText.trim() === '') {
    return new Response(JSON.stringify({
      error: 'Anthropic returned empty response',
      httpStatus: anthropicResponse.status
    }), { status: 502, headers: { ...CORS, 'Content-Type': 'application/json' } });
  }

  // Validate JSON
  try { JSON.parse(rawText); }
  catch (e) {
    return new Response(JSON.stringify({
      error: 'Anthropic returned non-JSON',
      preview: rawText.slice(0, 300)
    }), { status: 502, headers: { ...CORS, 'Content-Type': 'application/json' } });
  }

  return new Response(rawText, {
    status: anthropicResponse.status,
    headers: { ...CORS, 'Content-Type': 'application/json' }
  });
};

export const config = { path: '/api/search' };

// Netlify Functions v2 — Anthropic API proxy
// Uses streaming to stay within Netlify's 10s timeout

export default async (request, context) => {

  const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

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
    return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY not set in Netlify environment variables' }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' }
    });
  }

  let body;
  try { body = await request.json(); }
  catch (e) {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400, headers: { ...CORS, 'Content-Type': 'application/json' }
    });
  }

  // Use a smaller, faster model with reduced tokens to stay within timeout
  const payload = {
    model: 'claude-haiku-4-5-20251001',   // fastest Claude model — much quicker than Sonnet
    max_tokens: 600,                        // reduced from 1000
    system: body.system || '',
    messages: body.messages || []
    // No tools — web search causes timeouts
  };

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(payload)
    });

    // Read response text first so we can diagnose if it's not valid JSON
    const text = await response.text();

    // Validate it's JSON before returning
    try { JSON.parse(text); }
    catch (e) {
      return new Response(JSON.stringify({ error: 'Anthropic returned non-JSON response', raw: text.slice(0, 200) }), {
        status: 502, headers: { ...CORS, 'Content-Type': 'application/json' }
      });
    }

    return new Response(text, {
      status: response.status,
      headers: { ...CORS, 'Content-Type': 'application/json' }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message, type: err.name }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' }
    });
  }
};

export const config = { path: '/api/search' };

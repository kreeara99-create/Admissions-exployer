// Netlify Serverless Function
// Uses process.env for environment variables (correct for Node.js runtime)

exports.handler = async function(event, context) {

  const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS, GET'
  };

  const respond = (data, status = 200) => ({
    statusCode: status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });

  // Diagnostic GET
  if (event.httpMethod === 'GET') {
    const key = process.env.ANTHROPIC_API_KEY;
    return respond({
      status: 'function alive',
      hasApiKey: !!key,
      keyPrefix: key ? key.slice(0, 12) + '...' : 'NOT SET — add in Netlify Dashboard → Environment Variables',
      runtime: 'Node.js ' + process.version,
      time: new Date().toISOString()
    });
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return respond({ error: 'Method not allowed' }, 405);
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return respond({ error: 'ANTHROPIC_API_KEY not set. Go to Netlify Dashboard → Site configuration → Environment variables and add it, then redeploy.' }, 500);
  }

  let body;
  try { body = JSON.parse(event.body); }
  catch (e) { return respond({ error: 'Invalid request body: ' + e.message }, 400); }

  const payload = {
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 500,
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
      return respond({ error: 'Anthropic returned empty body. HTTP status: ' + anthropicResp.status }, 502);
    }

    let parsed;
    try { parsed = JSON.parse(rawText); }
    catch (e) {
      return respond({ error: 'Anthropic returned non-JSON', preview: rawText.slice(0, 300) }, 502);
    }

    return {
      statusCode: anthropicResp.status,
      headers: { ...CORS, 'Content-Type': 'application/json' },
      body: JSON.stringify(parsed)
    };

  } catch (err) {
    return respond({ error: 'Fetch to Anthropic failed: ' + err.message + ' (type: ' + err.name + ')' }, 502);
  }
};

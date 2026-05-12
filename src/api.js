// Anthropic API client.
//
// WARNING about API keys in frontend code:
// Putting an Anthropic API key in a frontend bundle exposes it to anyone who
// opens browser dev tools. Anyone with the key can drain your account credits.
//
// For local development only, you can put your key in a .env file at the project root:
//   VITE_ANTHROPIC_API_KEY=sk-ant-...
//
// For any real deployment, route these calls through your own backend that
// holds the API key server-side. See README for details.

const API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY;
const MODEL = 'claude-sonnet-4-20250514';

export async function callClaude(system, messages, maxTokens = 800) {
  if (!API_KEY) {
    throw new Error(
      'Missing VITE_ANTHROPIC_API_KEY. Create a .env file at the project root with VITE_ANTHROPIC_API_KEY=sk-ant-... then restart the dev server.'
    );
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      system,
      messages
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Anthropic API error ${response.status}: ${text}`);
  }

  const data = await response.json();
  return data.content
    .filter(b => b.type === 'text')
    .map(b => b.text)
    .join('\n');
}

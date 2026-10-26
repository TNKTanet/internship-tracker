/**
 * api/update-sheet.js - Vercel Serverless Function (Node.js)
 * Forward updates to Google Apps Script Web App
 */

const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyvp_nHZScu6als1bsRqJvlZiuQ9J481X71fUX5oJXbyyao9gksHx3Rzmk-fh9bGdZJ/exec";

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  try {
    const payload = req.body;
    const resp = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await resp.text();
    return res.status(200).json({ ok: true, result });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
}

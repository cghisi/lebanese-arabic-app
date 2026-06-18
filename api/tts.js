// api/tts.js — Vercel serverless function
// Proxies Azure Speech TTS to avoid CORS restrictions in the browser

export default async function handler(req, res) {
  // Allow CORS from any origin (our own frontend)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { text, slow } = req.body;

  if (!text) {
    return res.status(400).json({ error: "Missing text" });
  }

  const AZURE_KEY = process.env.AZURE_SPEECH_KEY;
  const AZURE_REGION = process.env.AZURE_SPEECH_REGION || "eastus";
  const VOICE = "ar-LB-RamiNeural";

  if (!AZURE_KEY) {
    return res.status(500).json({ error: "Azure key not configured" });
  }

  const rate = slow ? "-30%" : "0%";
  const ssml = `<speak version='1.0' xml:lang='ar-LB'>
    <voice name='${VOICE}'>
      <prosody rate='${rate}'>${text}</prosody>
    </voice>
  </speak>`;

  try {
    const azureRes = await fetch(
      `https://${AZURE_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`,
      {
        method: "POST",
        headers: {
          "Ocp-Apim-Subscription-Key": AZURE_KEY,
          "Content-Type": "application/ssml+xml",
          "X-Microsoft-OutputFormat": "audio-24khz-48kbitrate-mono-mp3",
        },
        body: ssml,
      }
    );

    if (!azureRes.ok) {
      const errText = await azureRes.text();
      return res.status(azureRes.status).json({ error: errText });
    }

    const audioBuffer = await azureRes.arrayBuffer();

    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "public, max-age=86400"); // cache 24h
    return res.status(200).send(Buffer.from(audioBuffer));

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

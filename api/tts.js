// api/tts.js — Vercel serverless function
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
};

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  // Debug: log what we receive
  console.log("Body:", JSON.stringify(req.body));
  console.log("Key present:", !!process.env.AZURE_SPEECH_KEY);
  console.log("Region:", process.env.AZURE_SPEECH_REGION);

  const text = req.body?.text;
  const slow = req.body?.slow;

  if (!text) return res.status(400).json({ error: "Missing text", body: req.body });

  const AZURE_KEY = process.env.AZURE_SPEECH_KEY;
  const AZURE_REGION = process.env.AZURE_SPEECH_REGION || "eastus";

  if (!AZURE_KEY) return res.status(500).json({ error: "AZURE_SPEECH_KEY not set" });

  const ssml = `<speak version='1.0' xml:lang='ar-LB'><voice name='ar-LB-RamiNeural'><prosody rate='${slow ? "-30%" : "0%"}'>${text}</prosody></voice></speak>`;

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

    console.log("Azure status:", azureRes.status);

    if (!azureRes.ok) {
      const errText = await azureRes.text();
      console.error("Azure error:", errText);
      return res.status(azureRes.status).json({ error: errText });
    }

    const audioBuffer = await azureRes.arrayBuffer();
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "public, max-age=86400");
    return res.status(200).send(Buffer.from(audioBuffer));

  } catch (err) {
    console.error("Fetch error:", err.message);
    return res.status(500).json({ error: err.message });
  }
}

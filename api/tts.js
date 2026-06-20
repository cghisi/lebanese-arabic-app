// api/tts.js — Vercel serverless function
// Sends Arabic script directly to ar-LB-RamiNeural

export const config = {
  api: { bodyParser: { sizeLimit: '1mb' } },
};

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { text, slow } = req.body || {};

    console.log("text:", text);
    console.log("key:", process.env.AZURE_SPEECH_KEY ? "present" : "MISSING");

    if (!text) return res.status(400).json({ error: "Missing text" });

    const AZURE_KEY = process.env.AZURE_SPEECH_KEY;
    const AZURE_REGION = process.env.AZURE_SPEECH_REGION || "eastus";

    if (!AZURE_KEY) return res.status(500).json({ error: "AZURE_SPEECH_KEY not set" });

    const rate = slow ? "-25%" : "0%";

    // Always send Arabic script to Rami — he's a native Lebanese voice
    const ssml = `<speak version='1.0' xml:lang='ar-LB'>
      <voice name='ar-LB-RamiNeural'>
        <prosody rate='${rate}'>${text}</prosody>
      </voice>
    </speak>`;

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
      return res.status(502).json({ error: `Azure ${azureRes.status}: ${errText}` });
    }

    const audioBuffer = await azureRes.arrayBuffer();
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "public, max-age=3600");
    return res.status(200).send(Buffer.from(audioBuffer));

  } catch (err) {
    console.error("Error:", err.message);
    return res.status(500).json({ error: err.message });
  }
}

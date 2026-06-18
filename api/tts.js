// api/tts.js — Vercel serverless function
// Receives transliteration text, uses Azure ar-LB-RamiNeural
// We send the transliteration wrapped in SSML with spell-out to guide pronunciation

export const config = {
  runtime: 'nodejs18.x',
  api: { bodyParser: { sizeLimit: '1mb' } },
};

// Convert our transliteration to a simpler ASCII that Arabic TTS can approximate
// We strip diacritics and special chars, keep phonetic intent
function cleanForTTS(text) {
  return text
    .replace(/[ḥ]/g, 'h')
    .replace(/[ḍ]/g, 'd')
    .replace(/[ṭ]/g, 't')
    .replace(/[ẓ]/g, 'z')
    .replace(/[ṣ]/g, 's')
    .replace(/[ʿʾ]/g, "'")
    .replace(/[āā]/g, 'aa')
    .replace(/[īī]/g, 'ii')
    .replace(/[ūū]/g, 'uu')
    .replace(/[ē]/g, 'ee')
    .replace(/[ō]/g, 'oo')
    .replace(/[ḷ]/g, 'l')
    .replace(/[ṁ]/g, 'm')
    .replace(/[ṉ]/g, 'n')
    .replace(/[ġ]/g, 'gh')
    .replace(/[ḳ]/g, 'k')
    .replace(/[ẖ]/g, 'kh')
    .replace(/[Ā]/g, 'aa')
    .replace(/[Ī]/g, 'ii')
    .replace(/[Ū]/g, 'uu')
    .trim();
}

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

    // Detect if text is Arabic script or transliteration (latin)
    const isArabic = /[\u0600-\u06FF]/.test(text);

    let ssml;
    if (isArabic) {
      // Arabic script — send directly to Rami
      ssml = `<speak version='1.0' xml:lang='ar-LB'>
        <voice name='ar-LB-RamiNeural'>
          <prosody rate='${rate}'>${text}</prosody>
        </voice>
      </speak>`;
    } else {
      // Transliteration (latin) — clean it and use fr-FR voice to read phonetically
      // This gives a much more accurate Lebanese pronunciation guide
      const cleaned = cleanForTTS(text);
      ssml = `<speak version='1.0' xml:lang='fr-FR'>
        <voice name='fr-FR-HenriNeural'>
          <prosody rate='${rate}'>${cleaned}</prosody>
        </voice>
      </speak>`;
    }

    console.log("isArabic:", isArabic);
    console.log("SSML:", ssml);

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

export default async function handler(req, res) {
  // Allow CORS from your site
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") { res.status(200).end(); return; }
  if (req.method !== "POST") { res.status(405).json({error:"Method not allowed"}); return; }

  try {
    var body = req.body;
    var action = body.action;

    // ── CLAUDE CHAT ──
    if (action === "chat") {
      var response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.CLAUDE_KEY,
          "anthropic-version": "2023-06-01"
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 400,
          system: body.system,
          messages: body.messages
        })
      });
      var data = await response.json();
      if (!response.ok) { res.status(500).json({error: data}); return; }
      res.status(200).json({reply: data.content[0].text});
      return;
    }

    // ── ELEVENLABS VOICE ──
    if (action === "speak") {
      var response = await fetch("https://api.elevenlabs.io/v1/text-to-speech/" + process.env.ELEVEN_VOICE, {
        method: "POST",
        headers: {
          "xi-api-key": process.env.ELEVEN_KEY,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          text: body.text,
          model_id: "eleven_multilingual_v2",
          voice_settings: {stability:0.45, similarity_boost:0.80, style:0.35, use_speaker_boost:true}
        })
      });
      if (!response.ok) { res.status(500).json({error:"Voice error"}); return; }
      var audioBuffer = await response.arrayBuffer();
      res.setHeader("Content-Type", "audio/mpeg");
      res.status(200).send(Buffer.from(audioBuffer));
      return;
    }

    // ── RESEND EMAIL ──
    if (action === "email") {
      var response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": "Bearer " + process.env.RESEND_KEY,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: "Rambo <onboarding@resend.dev>",
          to: [body.email],
          subject: "Your BST VRZN Plan is ready, " + body.firstName + "!",
          html: body.html
        })
      });
      var data = await response.json();
      res.status(200).json({success: true, data: data});
      return;
    }

    res.status(400).json({error:"Unknown action"});

  } catch(e) {
    console.error("Handler error:", e);
    res.status(500).json({error: e.message});
  }
}

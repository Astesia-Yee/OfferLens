import multer from "multer";

export const config = {
  api: {
    bodyParser: false,
  },
};

const upload = multer();

// Helper to run multer middleware in Vercel
function runMiddleware(req: any, res: any, fn: any) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result: any) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve(result);
    });
  });
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    await runMiddleware(req, res, upload.single('file'));

    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: "No audio file provided" });
    }

    const userKey = req.headers.authorization?.replace('Bearer ', '');
    const apiKey = userKey || process.env.DEFAULT_ASR_KEY;

    if (!apiKey) {
      return res.status(401).json({ error: "No ASR API Key configured. Please configure it in settings." });
    }

    const formData = new FormData();
    const blob = new Blob([file.buffer], { type: file.mimetype });
    formData.append('file', blob, file.originalname || 'audio.wav');
    formData.append('model', req.body.model || 'FunAudioLLM/SenseVoiceSmall');

    const response = await fetch('https://api.siliconflow.cn/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      },
      body: formData
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(response.status).send(err);
    }

    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    console.error("ASR Error:", error);
    res.status(500).json({ error: error.message });
  }
}

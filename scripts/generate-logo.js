import { GoogleGenAI } from "@google/genai";
import fs from 'fs';
import path from 'path';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function main() {
  try {
    console.log("Generating logo...");
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { text: 'A modern, minimalist app logo for an AI interview assistant named OfferLens. The logo should combine elements of a magnifying glass, a microphone, and a spark/star (representing AI). Clean vector style, vibrant gradient colors (blue and purple), solid white background, high quality, UI/UX design, flat design, no text.' }
        ]
      },
      config: {
        imageConfig: {
          aspectRatio: "1:1",
          imageSize: "1K"
        }
      }
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        const buffer = Buffer.from(part.inlineData.data, 'base64');
        const filePath = path.join(process.cwd(), 'public', 'logo.png');
        fs.writeFileSync(filePath, buffer);
        console.log('Logo saved to public/logo.png');
        break;
      }
    }
  } catch (e) {
    console.error("Error generating logo:", e);
    process.exit(1);
  }
}

main();

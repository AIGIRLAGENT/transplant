const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const GEMINI_MODEL = 'gemini-2.5-flash-image';

export interface GenerateImageOptions {
  prompt?: string;
  baseImage: string;
}

interface GeminiPartInlineData {
  mimeType?: string;
  data: string;
}

interface GeminiPartText {
  text: string;
}

type GeminiPart = ({ inlineData: GeminiPartInlineData } | { text: string });

type GeminiCandidate = {
  content: {
    parts: GeminiPart[];
  };
};

type GeminiResponse = {
  candidates?: GeminiCandidate[];
  error?: {
    message?: string;
  };
};

const defaultPrompt = `Create a practical post-transplant preview for this patient photo.
- Preserve the person's facial features, skin tone, and lighting exactly as captured.
- Add a natural-looking, fuller hair density that matches their likely post-surgery result.
- Use a classic short, clinic-ready hairstyle with visible hairline definition and realistic texture.
- Avoid dramatic styling, facial hair changes, makeup, or accessories.
- Output should feel like a trustworthy medical simulation for a consultation deck.`;

function normalizeBase64(dataUrl: string) {
  const [, base64] = dataUrl.split(',');
  if (!base64) {
    throw new Error('Invalid image data – expected base64 data URL.');
  }
  return base64;
}

export async function generateEnhancedImage({ baseImage, prompt = defaultPrompt }: GenerateImageOptions): Promise<string> {
  const apiKey = (
    import.meta.env.VITE_GEMINI_API_KEY
    || import.meta.env.VITE_GEMINI_KEY
    || import.meta.env.VITE_HAIR_SIM_API_KEY
    || ''
  ).trim();
  if (!apiKey) {
    throw new Error('Missing Gemini API key. Set VITE_GEMINI_API_KEY in your environment.');
  }

  const requestBody = {
    contents: [
      {
        role: 'user',
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: normalizeBase64(baseImage),
            },
          },
        ],
      },
    ],
  };

  const response = await fetch(`${GEMINI_API_URL}/${GEMINI_MODEL}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    const message = error?.error?.message || response.statusText;
    throw new Error(`Gemini request failed: ${message}`);
  }

  const json = (await response.json()) as GeminiResponse;
  const parts = json.candidates?.[0]?.content?.parts;

  if (!parts || parts.length === 0) {
    throw new Error('Gemini returned no content.');
  }

  for (const part of parts) {
    if ('inlineData' in part && part.inlineData?.data) {
      const mimeType = part.inlineData.mimeType || 'image/png';
      return `data:${mimeType};base64,${part.inlineData.data}`;
    }
  }

  const firstText = parts.find((part): part is GeminiPartText => 'text' in part)?.text;
  if (firstText) {
    throw new Error(firstText);
  }

  throw new Error('Gemini did not produce an image.');
}

import path from 'path';
import { defineConfig, loadEnv, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import OpenAI from 'openai';

function imageGenerationPlugin(apiKeyFromEnv: string): Plugin {
  return {
    name: 'api-generate-image-plugin',
    configureServer(server) {
      server.middlewares.use('/api/generate-image', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        let body = '';
        req.on('data', chunk => {
          body += chunk;
        });

        req.on('end', async () => {
          try {
            const parsed = JSON.parse(body || '{}');
            const prompt = parsed.prompt;

            if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Prompt is required' }));
              return;
            }

            const apiKey = apiKeyFromEnv || process.env.OPENAI_API_KEY || process.env.Open_api_key || '';

            if (!apiKey || apiKey.includes('YOUR_API_KEY')) {
              console.error('OpenAI API key missing in backend environment');
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'OpenAI API key not configured on server' }));
              return;
            }

            const openai = new OpenAI({ apiKey });

            let response;
            try {
              response = await openai.images.generate({
                model: 'gpt-image-2',
                prompt: prompt.trim(),
                n: 1,
                size: '1024x1024',
              });
            } catch (err: any) {
              console.warn('gpt-image-2 model request issue, attempting fallback:', err?.message || err);
              try {
                response = await openai.images.generate({
                  model: 'dall-e-3',
                  prompt: prompt.trim(),
                  n: 1,
                  size: '1024x1024',
                });
              } catch (fallbackErr: any) {
                console.error('Fallback image generation failed:', fallbackErr?.message || fallbackErr);
                throw err;
              }
            }

            const item = response.data?.[0];
            let imageUrl = item?.url;
            if (!imageUrl && item?.b64_json) {
              imageUrl = `data:image/png;base64,${item.b64_json}`;
            }

            if (!imageUrl) {
              throw new Error('No image URL or base64 returned from OpenAI API');
            }

            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ image_url: imageUrl, prompt }));
          } catch (error: any) {
            console.error('Error generating image on backend:', error?.message || error);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: "I couldn't generate the image right now. Please try again." }));
          }
        });
      });
    }
  };
}

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    const openAiApiKey = env.OPENAI_API_KEY || env.Open_api_key || process.env.OPENAI_API_KEY || process.env.Open_api_key || '';

    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react(), tailwindcss(), imageGenerationPlugin(openAiApiKey)],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});


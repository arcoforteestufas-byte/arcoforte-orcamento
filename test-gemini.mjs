import { streamText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function main() {
  const google = createGoogleGenerativeAI({
    apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
  });

  try {
    const result = await streamText({
      model: google('gemini-flash-latest'),
      prompt: 'Olá'
    });
    
    console.log(Object.getOwnPropertyNames(Object.getPrototypeOf(result)));
  } catch (error) {
    console.error('ERRO:', error);
  }
}

main();

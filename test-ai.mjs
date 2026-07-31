import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText } from 'ai';

async function run() {
  const google = createGoogleGenerativeAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY });
  const result = await streamText({
    model: google('gemini-flash-latest'),
    prompt: 'hello'
  });
  
  if (result.toDataStreamResponse) {
    const res = result.toDataStreamResponse();
    console.log("Response headers:", res.headers.get('content-type'));
    const text = await res.text();
    console.log("Output (first 100 chars):", text.substring(0, 100));
  }
}
run();

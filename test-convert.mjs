import { convertToModelMessages } from 'ai';

const messages = [
    {
      "role": "user",
      "content": "teste",
      "id": "X60AnaE5d0GNtN0i"
    }
];

const uiMessages = messages.map(m => ({
  ...m,
  parts: m.parts || [{ type: 'text', text: m.content || '' }]
}));

try {
  const result = convertToModelMessages(uiMessages);
  console.log("SUCESSO:", result);
} catch (e) {
  console.error("ERRO:", e.message);
}

async function test() {
  try {
    const res = await fetch('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'user', content: 'quero saber para que serve uma estufa?' }] })
    });
    
    console.log('STATUS:', res.status);
    console.log('HEADERS:', res.headers.get('content-type'));
    
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      console.log(decoder.decode(value));
    }
  } catch (error) {
    console.error(error);
  }
}
test();

async function run() {
  const res = await fetch('http://localhost:3000/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [{ role: 'user', content: 'para que serve uma estufa?' }]
    })
  });
  console.log("STATUS:", res.status);
  const text = await res.text();
  console.log("RESPONSE BODY:", text);
}
run();

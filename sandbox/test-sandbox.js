const http = require('http');

async function request(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(`http://localhost:4000${path}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : {}
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runTest() {
  try {
    console.log("Checking health...");
    const health = await request('/health');
    console.log(health);

    console.log("\\nCreating session...");
    const session = await request('/session', 'POST');
    console.log(session);
    const sid = session.sessionId;

    console.log(`\\nNavigating to example.com with session ${sid}...`);
    const nav = await request(`/session/${sid}/navigate`, 'POST', { url: 'https://example.com' });
    console.log("Navigation result:", Object.keys(nav), "Title:", nav.title);

    console.log(`\\nExtracting data...`);
    const ext = await request(`/session/${sid}/extract`, 'POST');
    console.log("Extracted forms:", ext.forms?.length, "Links:", ext.links?.length);

    console.log(`\\nTaking screenshot...`);
    const shot = await request(`/session/${sid}/screenshot`, 'POST');
    console.log("Screenshot result:", shot);

    console.log(`\\nClosing session...`);
    const cls = await request(`/session/${sid}`, 'DELETE');
    console.log("Close result:", cls);

    console.log("\\nSandbox test passed successfully!");
  } catch (err) {
    console.error("Test failed:", err);
  }
}

runTest();

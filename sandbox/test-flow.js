const http = require('http');
const fs = require('fs');
const path = require('path');

const SANDBOX_URL = 'http://localhost:4000';

async function request(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(`${SANDBOX_URL}${path}`, {
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

async function run() {
  console.log("Starting extensive sandbox test...");

  // 1. Wikipedia Search Flow
  console.log("\\n--- Flow 1: Wikipedia Search ---");
  let session = await request('/session', 'POST');
  let sid = session.sessionId;
  console.log("Session created:", sid);

  console.log("Navigating to Wikipedia...");
  let nav = await request(`/session/${sid}/navigate`, 'POST', { url: 'https://en.wikipedia.org/wiki/Main_Page' });
  console.log("Title:", nav.title);

  console.log("Extracting forms...");
  let ext = await request(`/session/${sid}/extract`, 'POST');
  console.log(`Found ${ext.forms?.length || 0} forms.`);

  console.log("Searching for 'Artificial Intelligence'...");
  await request(`/session/${sid}/act`, 'POST', { action: 'type', selector: 'input[name="search"]', value: 'Artificial Intelligence' });
  
  // Try to submit the search form
  console.log("Clicking search button...");
  await request(`/session/${sid}/act`, 'POST', { action: 'click', selector: 'button:has(text("Search")), input[name="go"], button.cdx-search-input__end-button' });

  // Wait a bit for navigation
  await request(`/session/${sid}/act`, 'POST', { action: 'wait', value: 2000 });

  let shot1 = await request(`/session/${sid}/screenshot`, 'POST', { fullPage: false });
  console.log("Screenshot 1:", shot1.filepath);

  await request(`/session/${sid}`, 'DELETE');
  console.log("Wikipedia session closed.");


  // 2. Login Form Flow
  console.log("\\n--- Flow 2: Form Login Simulation ---");
  session = await request('/session', 'POST');
  sid = session.sessionId;

  console.log("Navigating to The Internet login page...");
  nav = await request(`/session/${sid}/navigate`, 'POST', { url: 'https://the-internet.herokuapp.com/login' });
  console.log("Title:", nav.title);

  console.log("Taking initial screenshot...");
  let shot2 = await request(`/session/${sid}/screenshot`, 'POST', { fullPage: false });
  console.log("Screenshot 2:", shot2.filepath);

  console.log("Filling in username and password...");
  await request(`/session/${sid}/act`, 'POST', { action: 'type', selector: '#username', value: 'tomsmith' });
  await request(`/session/${sid}/act`, 'POST', { action: 'type', selector: '#password', value: 'SuperSecretPassword!' });
  
  console.log("Taking screenshot before submit...");
  let shot3 = await request(`/session/${sid}/screenshot`, 'POST', { fullPage: false });
  console.log("Screenshot 3:", shot3.filepath);

  console.log("Clicking submit...");
  await request(`/session/${sid}/act`, 'POST', { action: 'click', selector: 'button[type="submit"]' });

  // Wait for login
  await request(`/session/${sid}/act`, 'POST', { action: 'wait', value: 2000 });

  console.log("Taking screenshot after submit...");
  let shot4 = await request(`/session/${sid}/screenshot`, 'POST', { fullPage: false });
  console.log("Screenshot 4:", shot4.filepath);
  
  console.log("Extracting results...");
  ext = await request(`/session/${sid}/extract`, 'POST');
  // just show the first 200 chars of text
  console.log("Page text preview:", ext.text?.substring(0, 200).replace(/\\n/g, ' '));

  await request(`/session/${sid}`, 'DELETE');
  console.log("Login session closed.");

  console.log("\\nTests complete!");
  
  // Output JSON mapping for the AI to read easily
  const resultData = {
    screenshots: [shot1.filepath, shot2.filepath, shot3.filepath, shot4.filepath]
  };
  fs.writeFileSync('test-results.json', JSON.stringify(resultData, null, 2));
}

run().catch(console.error);

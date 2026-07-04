import urllib.request
import json
import time

def chat(msg):
    url = 'https://calmant.aaaryan.space/api/debug/chat'
    data = json.dumps({'user_id': 'extensive-test', 'message': msg}).encode()
    req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'})
    try:
        res = urllib.request.urlopen(req).read().decode('utf-8')
        return json.loads(res).get('data', {}).get('reply', res)
    except Exception as e:
        return f"Error: {e}"

with open('results3.txt', 'w', encoding='utf-8') as f:
    f.write("Test 1: Reasoning...\n")
    f.write(chat("What is 2 + 2? Answer in one word.") + "\n\n")
    time.sleep(2)
    
    f.write("Test 2: Context...\n")
    f.write(chat("What did I just ask you?") + "\n\n")
    time.sleep(2)
    
    f.write("Test 3: Tools...\n")
    f.write(chat("Run a python script to calculate 5 factorial and tell me the result.") + "\n")

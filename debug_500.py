import urllib.request
import json

def evaluate(cmd):
    url = 'https://calmant.aaaryan.space/api/debug/eval'
    data = json.dumps({'command': cmd}).encode()
    req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'})
    res = urllib.request.urlopen(req).read().decode('utf-8')
    return json.loads(res)

res = evaluate(['python', '-c', 'import os, subprocess; env=os.environ.copy(); env["HERMES_PROFILE"]="user-test-user-5"; res = subprocess.run(["hermes", "config", "set", "model.provider", "openrouter"], env=env, capture_output=True, text=True); print("STDOUT:", res.stdout); print("STDERR:", res.stderr)'])
open('eval_result_2.json', 'w', encoding='utf-8').write(json.dumps(res, indent=2))

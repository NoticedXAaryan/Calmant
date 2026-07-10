const fs = require('fs');
const path = require('path');
const dir = 'src/lib/tools';
fs.readdirSync(dir).forEach(file => {
  if (file.endsWith('.ts') && file !== 'registry.ts' && file !== 'tool-manifest.ts' && file !== 'tool-runner.ts') {
    const p = path.join(dir, file);
    let content = fs.readFileSync(p, 'utf8');
    content = content.replace(/ToolContext/g, 'ToolExecutionContext');
    content = content.replace(/import \{ ToolExecutionContext \} from "\.\/registry";/g, 'import { ToolExecutionContext } from "./tool-manifest";');
    fs.writeFileSync(p, content);
  }
});
console.log("Done");

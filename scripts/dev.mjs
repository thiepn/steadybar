import { execFileSync, spawn } from 'node:child_process';
import { watch } from 'node:fs';
const build = () => { try { execFileSync(process.execPath, ['scripts/build.mjs'], { stdio: 'inherit' }); } catch { console.error('Build failed. Fix the reported error; watching for edits.'); } };
build();
const server = spawn(process.execPath, ['scripts/serve.mjs'], { stdio: 'inherit' });
let timer;
for (const path of ['src', 'public']) watch(path, { recursive: true }, () => { clearTimeout(timer); timer = setTimeout(build, 150); });
console.log('Watching source files. Reload your browser after an edit.');
process.on('SIGINT', () => { server.kill(); process.exit(0); });

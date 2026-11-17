import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {root,json} from '../lib/project.mjs';
const dist=path.join(root,'dist');await fs.mkdir(dist,{recursive:true});
const result=JSON.parse(execFileSync(process.platform==='win32'?'npm.cmd':'npm',['pack','--json','--pack-destination',dist],{cwd:root,encoding:'utf8'}));
for(const f of result[0].files){
 if(/(^|\/)(\.env[^/]*|\.auth|node_modules|projects|out)(\/|$)/.test(f.path))throw new Error(`Private/build path in archive: ${f.path}`);
 const data=await fs.readFile(path.join(root,f.path));
 if(/\/(?:Users\/anixd|home\/[^/]+)\//.test(data.toString('utf8')))throw new Error(`Machine-specific path in archive: ${f.path}`);
}
const artifact=path.join(dist,result[0].filename);
await fs.writeFile(path.join(dist,'release.json'),json({file:result[0].filename,sha256:createHash('sha256').update(await fs.readFile(artifact)).digest('hex'),files:result[0].files.map(f=>f.path)}));
console.log(artifact);

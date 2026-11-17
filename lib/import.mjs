import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import os from 'node:os';
import {readProject,json} from './project.mjs';
const run=promisify(execFile);

export async function importAsset(dir,file,{id,source,license,kind='image',...metadata}) {
  if(!/^[a-z0-9-]+$/.test(id??'')) throw new Error('Use a lowercase asset ID with digits or hyphens');
  if(!source||!license) throw new Error('Both source and license are required (use pending-review if unknown)');
  const allowed={image:['.png','.jpg','.jpeg','.webp','.svg'],video:['.mp4','.webm','.mov'],audio:['.wav','.mp3','.m4a','.ogg']};
  const ext=path.extname(file).toLowerCase();
  if(!allowed[kind]?.includes(ext)) throw new Error('Unsupported media extension');
  const p=await readProject(dir);
  if(p.assets.some(a=>a.id===id)) throw new Error('Asset ID already exists');
  const data=await fs.readFile(file);
  if(data.length>250*1024*1024) throw new Error('Asset exceeds 250MB limit');
  const relative=`assets/${id}${ext}`,dest=path.join(dir,'public',relative);
  await fs.mkdir(path.dirname(dest),{recursive:true});
  await fs.writeFile(dest,data,{flag:'wx'});
  const asset={...metadata,id,kind,path:relative,source,license,reviewed:false,sha256:createHash('sha256').update(data).digest('hex')};
  p.assets.push(asset);
  await fs.writeFile(path.join(dir,'film.json'),json(p));
  return asset;
}
export async function pencilExport(dir,file,{id,node,license='pending-review'}) {
  if(!node) throw new Error('Select an explicit OpenPencil node ID');
  if(!['.fig','.pen'].includes(path.extname(file).toLowerCase())) throw new Error('Expected a .fig or .pen design');
  const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'vh-pencil-'));
  try {
    const output=path.join(temporary,'frame.png');
    await run('openpencil',['export',path.resolve(file),'--node',node,'--format','png','--scale','2','--font-policy','strict','--output',output],{timeout:120000,maxBuffer:4*1024*1024});
    return await importAsset(dir,output,{id,source:`OpenPencil: ${path.basename(file)} / node ${node}`,license,design:{file:path.basename(file),node,sha256:createHash('sha256').update(await fs.readFile(file)).digest('hex')}});
  } catch(e) {if(e.code==='ENOENT')throw new Error('Install @open-pencil/cli to use pencil-export, or import a PNG exported from the editor');throw e;}
  finally {await fs.rm(temporary,{recursive:true,force:true});}
}

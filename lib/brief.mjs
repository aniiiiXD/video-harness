import fs from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {json,readProject} from './project.mjs';

const fields=['request','look','format','note'];
const questions={
  request:'What should this video show or accomplish?',
  look:'How should it look and feel? A reference or a few words about the pace and typography work.',
  format:'Where will people watch it, and what format should we edit for?'
};

async function records(folder) {
  try {
    const files=await fs.readdir(folder,{withFileTypes:true});
    return files.filter(file=>file.isFile()&&/^\d{12}-[a-f\d-]+\.json$/.test(file.name))
      .map(file=>file.name).sort();
  } catch(error) {
    if(error.code==='ENOENT')return [];
    throw error;
  }
}

async function briefFolder(dir) {
  await readProject(dir);
  return path.join(dir,'.harness','brief');
}

export async function readBrief(dir) {
  const folder=await briefFolder(dir);
  const history=await Promise.all((await records(folder)).map(async file=>
    JSON.parse(await fs.readFile(path.join(folder,file),'utf8'))
  ));
  const brief={request:null,look:null,format:null,note:null};
  for(const entry of history) {
    for(const key of fields) {
      if(Object.hasOwn(entry,key))brief[key]=entry[key];
    }
  }
  const unanswered=Object.entries(questions)
    .filter(([key])=>!brief[key])
    .map(([,question])=>question);
  return {...brief,questions:unanswered,history};
}

export async function updateBrief(dir,change) {
  const changes=Object.entries(change);
  if(changes.length===0)throw new Error('Supply a request, look, format or note');
  const entry={at:new Date().toISOString()};
  for(const [key,value] of changes) {
    if(!fields.includes(key))throw new Error(`Unknown brief field: ${key}`);
    if(typeof value!=='string'||!value.trim()||value.trim().length>4000) {
      throw new Error(`Brief ${key} must contain 1–4000 characters`);
    }
    entry[key]=value.trim();
  }
  const folder=await briefFolder(dir);
  await fs.mkdir(folder,{recursive:true,mode:0o700});
  const files=await records(folder);
  const last=files.at(-1);
  const sequence=String(last?Number(last.slice(0,12))+1:1).padStart(12,'0');
  const file=path.join(folder,`${sequence}-${randomUUID()}.json`);
  const temp=`${file}.tmp`;
  // Each update commits as its own file, so simultaneous CLI and MCP writes keep both changes.
  try {
    await fs.writeFile(temp,json(entry),{flag:'wx',mode:0o600});
    await fs.rename(temp,file);
  } finally {
    await fs.rm(temp,{force:true});
  }
  return readBrief(dir);
}

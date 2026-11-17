import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

export const root = fileURLToPath(new URL('../', import.meta.url));
export const types = ['title','journey','wireframe','comparison','metric','footage'];
export const json = x => JSON.stringify(x,null,2)+'\n';
export async function readProject(dir) { return JSON.parse(await fs.readFile(path.join(dir,'film.json'),'utf8')); }
export function localPath(base, relative) {
  if (typeof relative !== 'string' || !relative || relative.includes('\\') || path.isAbsolute(relative)) throw new Error('Expected a relative project path');
  const full=path.resolve(base,relative), rel=path.relative(path.resolve(base),full);
  if (rel.startsWith('..') || path.isAbsolute(rel)) throw new Error('Asset path escapes the project');
  return full;
}
export async function containedFile(base, relative) {
  const full=await fs.realpath(localPath(base,relative));
  const actualBase=await fs.realpath(base);
  const rel=path.relative(actualBase,full);
  if (rel.startsWith('..') || path.isAbsolute(rel)) throw new Error('Asset symlink escapes the project');
  if (!(await fs.stat(full)).isFile()) throw new Error('Expected a file');
  return full;
}
export async function validate(dir) {
  const p=await readProject(dir), errors=[], warnings=[];
  if(!p || typeof p!=='object' || Array.isArray(p))return {project:p,errors:['film.json must contain an object'],warnings,frames:0,seconds:0};
  const check=(ok,message)=>{if(!ok)errors.push(message);};
  check(p.version===1,'version must be 1');
  check(typeof p.name==='string' && p.name.trim().length>0,'name is required');
  check([24,25,30,60].includes(p.fps),'fps must be 24, 25, 30 or 60');
  check(p.width===1920 && p.height===1080,'This release supports 1920×1080');
  for (const key of ['background','foreground','accent']) check(/^#[a-f\d]{6}$/i.test(p.brand?.[key]??''),`brand.${key} must be a six-digit hex colour`);
  check(typeof p.brand?.fontFamily==='string' && p.brand.fontFamily.length>0,'brand.fontFamily is required');
  check(Array.isArray(p.assets),'assets must be an array');
  check(Array.isArray(p.scenes) && p.scenes.length>0,'scenes must be a nonempty array');
  if(!Array.isArray(p.assets)||!Array.isArray(p.scenes))return {project:p,errors,warnings,frames:0,seconds:0};
  const assets=new Map(), used=new Set();
  for (const a of p.assets??[]) {
    if(!a||typeof a!=='object'||Array.isArray(a)){errors.push('Each asset must be an object');continue;}
    check(/^[a-z0-9-]+$/.test(a.id??''),`Invalid asset ID: ${a.id}`);
    check(!assets.has(a.id),`Duplicate asset: ${a.id}`); assets.set(a.id,a);
    check(['image','video','audio'].includes(a.kind),`Invalid asset kind: ${a.id}`);
    check(typeof a.source==='string' && a.source.length>0,`Missing source: ${a.id}`);
    check(typeof a.license==='string' && a.license.length>0,`Missing rights record: ${a.id}`);
    if (!a.reviewed) warnings.push(`Inspect asset ${a.id} for relevance, crop and rights before delivery`);
    try {await containedFile(path.join(dir,'public'),a.path);} catch {errors.push(`Missing or unsafe asset: ${a.id}`);}
  }
  let frames=0; const ids=new Set();
  for (const s of p.scenes??[]) {
    if(!s||typeof s!=='object'||Array.isArray(s)){errors.push('Each scene must be an object');continue;}
    check(/^[a-z0-9-]+$/.test(s.id??''),`Invalid scene ID: ${s.id}`);
    check(!ids.has(s.id),`Duplicate scene: ${s.id}`); ids.add(s.id);
    check(types.includes(s.type),`Unknown scene type: ${s.type}`);
    check(Number.isFinite(s.seconds) && s.seconds>=1 && s.seconds<=30,`Scene ${s.id}: seconds must be 1–30`);
    const n=Math.round(s.seconds*p.fps); frames+=Number.isFinite(n)?n:0;
    check(typeof s.headline==='string' && s.headline.length>0 && s.headline.length<=85,`Scene ${s.id}: headline must have 1–85 characters`);
    if (s.body!==undefined)check(typeof s.body==='string'&&s.body.length<=180,`Scene ${s.id}: body must be text with at most 180 characters`);
    check(['concept','recorded','verified'].includes(s.evidence?.kind),`Scene ${s.id}: evidence kind required`);
    if (s.evidence?.kind!=='concept') check(typeof s.evidence?.source==='string'&&s.evidence.source.length>0,`Scene ${s.id}: evidence source required`);
    if (s.headline?.split(/\s+/).length/s.seconds>2.5) warnings.push(`Scene ${s.id}: headline may read too quickly`);
    if(s.type==='journey') check(Array.isArray(s.steps)&&s.steps.length>=2&&s.steps.length<=5&&s.steps.every(x=>typeof x==='string'&&x.length<=40),`Scene ${s.id}: use 2–5 short steps`);
    if(s.type==='comparison') check([s.before,s.after].every(x=>typeof x==='string'&&x.length<=110),`Scene ${s.id}: before/after text required, at most 110 characters each`);
    if(s.type==='metric') check([s.from,s.to].every(Number.isFinite)&&typeof s.unit==='string'&&s.unit.length<=12,`Scene ${s.id}: numeric from/to and short unit required`);
    if(['wireframe','footage'].includes(s.type)) check(assets.has(s.asset),`Scene ${s.id}: asset is required`);
    if(s.asset) {
      const a=assets.get(s.asset); check(Boolean(a),`Scene ${s.id}: unknown asset ${s.asset}`);
      check(a?.kind==='image'||a?.kind==='video',`Scene ${s.id}: visual asset required`);
      if(used.has(s.asset)) warnings.push(`Asset ${s.asset} is repeated; ensure this serves the story`);
      used.add(s.asset);
    }
    if(s.camera) {
      check([s.camera.from,s.camera.to].every(x=>Number.isFinite(x)&&x>=1&&x<=3),`Scene ${s.id}: camera scale must be 1–3`);
      check(Array.isArray(s.camera.focus)&&s.camera.focus.length===2&&s.camera.focus.every(x=>Number.isFinite(x)&&x>=0&&x<=1),`Scene ${s.id}: focus must be [x,y] in 0–1`);
    }
  }
  if(p.audio) check(assets.get(p.audio.asset)?.kind==='audio','audio.asset must reference an audio file');
  return {project:p,errors,warnings,frames,seconds:frames/p.fps};
}
export async function requireValid(dir) {
  const report=await validate(dir);
  if(report.errors.length) throw new Error(report.errors.join('\n'));
  return report;
}
export async function build(dir) {
  const r=await requireValid(dir); let start=0;
  const nodes=r.project.scenes.map(s=>{
    const n=Math.round(s.seconds*r.project.fps);
    const code=`      <Sequence name={${JSON.stringify(s.id)}} from={${start}} durationInFrames={${n}}><Scene scene={${JSON.stringify(s)}} project={project} /></Sequence>`;
    start+=n;return code;
  });
  await fs.mkdir(path.join(dir,'src'),{recursive:true});
  await fs.writeFile(path.join(dir,'src/timeline.generated.jsx'),`// Generated by vh build. Edit film.json or Scene.jsx; this file is regenerated.\nimport React from 'react';\nimport {AbsoluteFill,Sequence,Track} from 'remotion';\nimport {Scene,Soundtrack} from './Scene';\nexport const project=${JSON.stringify(r.project)};\nexport const durationInFrames=${r.frames};\nexport const Film=()=> <AbsoluteFill><Track name="Product journey">\n${nodes.join('\n')}\n</Track><Soundtrack project={project}/></AbsoluteFill>;\n`);
  return r;
}
export async function init(dir) {
  // Refuse any existing destination; never merge into another person's project.
  await fs.mkdir(dir,{recursive:false});
  await fs.cp(path.join(root,'templates/journey'),dir,{recursive:true});
  await fs.mkdir(path.join(dir,'.agents/skills'),{recursive:true});
  await fs.cp(path.join(root,'skills'),path.join(dir,'.agents/skills'),{recursive:true});
  await fs.writeFile(path.join(dir,'.gitignore'),'node_modules/\nout/\n.env\n.env.*\n.auth/\n');
  await build(dir);
}
export async function storyboard(dir) {
  const r=await requireValid(dir);let frame=0;
  const rows=r.project.scenes.map(s=>{const from=frame; frame+=Math.round(s.seconds*r.project.fps);return {...s,fromFrame:from,toFrame:frame-1};});
  const out=path.join(dir,'out');await fs.mkdir(out,{recursive:true});
  await fs.writeFile(path.join(out,'storyboard.json'),json(rows));
  await fs.writeFile(path.join(out,'storyboard.md'),`# ${r.project.name}\n\nGenerated from film.json. ${r.seconds}s at ${r.project.fps}fps.\n\n`+rows.map(s=>`## ${s.id} · ${(s.fromFrame/r.project.fps).toFixed(2)}s\n\n${s.headline}\n\n${s.body??''}\n\nDevice: ${s.type}. Evidence: ${s.evidence.kind}. Asset: ${s.asset??'drawn component'}.\n`).join('\n'));
  return rows;
}

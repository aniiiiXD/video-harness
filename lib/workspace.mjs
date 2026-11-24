import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {init,readProject,validate,build,storyboard,json,containedFile} from './project.mjs';
import {importAsset,pencilExport} from './import.mjs';
import {readBrief,updateBrief} from './brief.mjs';
import {SmallestAdapter} from '../adapters/smallest.mjs';

const digest=value=>createHash('sha256').update(typeof value==='string'||Buffer.isBuffer(value)?value:JSON.stringify(value)).digest('hex');
export const slug=value=>{if(typeof value!=='string'||! /^[a-z0-9][a-z0-9-]{0,79}$/.test(value))throw new Error('Use 1–80 lowercase letters, digits or hyphens');return value;};
async function atomic(file,value){const temp=`${file}.${randomUUID()}.tmp`;try{await fs.writeFile(temp,json(value),{mode:0o600});await fs.rename(temp,file);}finally{await fs.rm(temp,{force:true});}}

export class Workspace {
  constructor(directory,{providers=[new SmallestAdapter()]}={}){
    this.directory=path.resolve(directory);this.providers=new Map(providers.map(p=>[p.id,p]));this.locks=new Map();
  }
  async ready(){await fs.mkdir(this.directory,{recursive:true,mode:0o700});this.directory=await fs.realpath(this.directory);return this;}
  async locked(id,fn){
    const prior=this.locks.get(id)??Promise.resolve();
    const next=prior.catch(()=>{}).then(fn);this.locks.set(id,next);
    try{return await next;}finally{if(this.locks.get(id)===next)this.locks.delete(id);}
  }
  async project(id){
    const dir=path.join(this.directory,slug(id));
    if((await fs.realpath(dir))!==dir)throw new Error('Project symlinks are not supported');
    for(const relative of ['film.json','src','src/timeline.generated.jsx','public','public/assets','.harness','.harness/brief','.harness/speech','.harness/jobs','out','out/film.mp4']){
      try{const stat=await fs.lstat(path.join(dir,relative));if(stat.isSymbolicLink())throw new Error('Project system paths must not be symlinks');}catch(e){if(e.code!=='ENOENT')throw e;}
    }
    return dir;
  }
  async create(id){return this.locked(slug(id),async()=>{await init(path.join(this.directory,id));return this.read(id);});}
  async brief(id){return readBrief(await this.project(id));}
  async saveBrief(id,change){return updateBrief(await this.project(id),change);}
  async read(id){const dir=await this.project(id),manifest=await readProject(dir),report=await validate(dir,manifest);return {projectId:id,revision:digest(manifest),manifest,validation:{errors:report.errors,warnings:report.warnings,frames:report.frames,seconds:report.seconds}};}
  async update(id,manifest,revision){return this.locked(id,async()=>{
    const current=await this.read(id);if(current.revision!==revision)throw new Error('Project changed: read it again before updating');
    const dir=await this.project(id),r=await validate(dir,manifest);if(r.errors.length)throw new Error(r.errors.join('\n'));
    if(manifest.scenes.length>200||manifest.assets.length>500)throw new Error('Project exceeds this server’s scene or asset limit');
    await atomic(path.join(dir,'film.json'),manifest);await build(dir);return this.read(id);
  });}
  async compile(id,mode='build'){return this.locked(id,async()=>{const dir=await this.project(id);return mode==='storyboard'?storyboard(dir):this.readAfterBuild(id,dir);});}
  async readAfterBuild(id,dir){await build(dir);return this.read(id);}
  async importFile(id,relative,options){return this.locked(id,async()=>{const dir=await this.project(id),file=await containedFile(dir,relative);const asset=await importAsset(dir,file,options);return {asset,revision:(await this.read(id)).revision};});}
  async exportDesign(id,relative,options){return this.locked(id,async()=>{const dir=await this.project(id),file=await containedFile(dir,relative);return pencilExport(dir,file,options);});}
  provider(id){const p=this.providers.get(id);if(!p)throw new Error(`Unknown TTS provider: ${id}`);return p;}
  capabilities(){return {tts:[...this.providers.values()].map(p=>({id:p.id,configured:p.configured()})),music:{suno:'Optional host adapter; not connected by this MCP server'},render:'Setup and MP4 jobs on the host; one worker at a time'};}
  async speechPlan(id,{provider='smallest',assetId,...input}){return this.locked(id,async()=>{
    slug(assetId);const dir=await this.project(id),p=await readProject(dir);
    if(p.assets.some(a=>a.id===assetId))throw new Error('Asset ID already exists');
    const request=this.provider(provider).prepare(input),plan={projectId:id,provider,assetId,request};
    const planId=digest(plan),folder=path.join(dir,'.harness/speech');await fs.mkdir(folder,{recursive:true,mode:0o700});
    const record={planId,...plan,characters:request.text.length,requiresApproval:true};
    try{await fs.writeFile(path.join(folder,`${planId}.plan.json`),json(record),{flag:'wx',mode:0o600});}catch(e){if(e.code!=='EEXIST')throw e;}
    return record;
  });}
  async speechFiles(id,planId){
    if(!/^[a-f0-9]{64}$/.test(planId))throw new Error('Invalid speech plan ID');
    const dir=await this.project(id),folder=path.join(dir,'.harness/speech');
    const file=await containedFile(dir,`.harness/speech/${planId}.plan.json`);
    const plan=JSON.parse(await fs.readFile(file,'utf8'));
    if(plan.projectId!==id||digest({projectId:id,provider:plan.provider,assetId:plan.assetId,request:plan.request})!==planId)throw new Error('Speech plan integrity check failed');
    return {dir,plan,claim:path.join(folder,`${planId}.claim`),receipt:path.join(folder,`${planId}.receipt.json`),audio:path.join(folder,`${planId}.wav`)};
  }
  async speechStatus(id,planId){const f=await this.speechFiles(id,planId);try{return JSON.parse(await fs.readFile(f.receipt,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;try{await fs.access(f.claim);return {planId,state:'unknown',message:'Submission was claimed. Inspect the provider account; this server will not resubmit.'};}catch{return {planId,state:'prepared'};}}}
  async generateSpeech(id,planId,approved){
    if(approved!==true)throw new Error('Approve the exact narration plan before generation');
    return this.locked(id,async()=>{
      const f=await this.speechFiles(id,planId),status=await this.speechStatus(id,planId);
      if(status.state==='complete')return status;
      if(status.state==='audio-saved')return this.finishSpeech(f,status);
      if(status.state!=='prepared')throw new Error('This plan has already been submitted. Check its receipt; it will not be billed again automatically.');
      const provider=this.provider(f.plan.provider);if(!provider.configured())throw new Error('TTS provider is not configured on this server');
      if((await readProject(f.dir)).assets.some(a=>a.id===f.plan.assetId))throw new Error('Asset ID already exists');
      // An exclusive durable claim precedes the network call. A crash does not make it retryable.
      await fs.writeFile(f.claim,new Date().toISOString(),{flag:'wx',mode:0o600});
      await atomic(f.receipt,{planId,state:'submitted',submittedAt:new Date().toISOString()});
      let audio;
      try{audio=await provider.synthesize(f.plan.request);}
      catch(e){await atomic(f.receipt,{planId,state:'unknown',message:e.message});throw e;}
      await fs.writeFile(f.audio,audio.data,{flag:'wx',mode:0o600});
      const saved={planId,state:'audio-saved',durationSeconds:audio.durationSeconds,sha256:digest(audio.data)};
      // Keep the audio even if importing fails; a subsequent execution resumes locally.
      await atomic(f.receipt,saved);return this.finishSpeech(f,saved);
    });
  }
  async finishSpeech(f,status){
    const p=await readProject(f.dir);let asset=p.assets.find(a=>a.id===f.plan.assetId);
    if(asset&&asset.speech?.planId!==f.plan.planId)throw new Error('Asset ID was occupied while speech was generated');
    if(!asset)asset=await importAsset(f.dir,f.audio,{id:f.plan.assetId,kind:'audio',source:`${f.plan.provider} TTS / ${f.plan.request.model}`,license:'Provider terms and account rights — review before publishing',speech:{planId:f.plan.planId,provider:f.plan.provider,model:f.plan.request.model,voiceId:f.plan.request.voice_id,durationSeconds:status.durationSeconds}});
    const done={...status,state:'complete',asset,message:'Audio imported. Add a narration cue after listening; music remains separate.'};await atomic(f.receipt,done);return done;
  }
}

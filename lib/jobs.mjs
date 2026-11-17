import fs from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {spawn} from 'node:child_process';
import {root,containedFile,json} from './project.mjs';

async function run(kind,dir,log){
  const handle=await fs.open(log,'a',0o600);
  // Provider credentials are not needed by npm or the renderer.
  const env=Object.fromEntries(['PATH','HOME','USERPROFILE','TMPDIR','TEMP','TMP','SystemRoot','LANG'].filter(k=>process.env[k]).map(k=>[k,process.env[k]]));
  try {await new Promise((resolve,reject)=>{
    const child=spawn(process.execPath,[path.join(root,'bin/vh.mjs'),kind,dir],{env,stdio:['ignore',handle.fd,handle.fd],shell:false});
    child.once('error',reject);child.once('exit',(code,signal)=>code===0?resolve():reject(new Error(`Worker exited ${code??signal}`)));
  });}finally{await handle.close();}
}
export class Jobs {
  constructor(workspace,{runner=run}={}){this.workspace=workspace;this.runner=runner;this.active=null;}
  async start(projectId,kind,approved){
    if(approved!==true)throw new Error('Explicitly authorize host setup/render work');
    if(!['setup','render'].includes(kind))throw new Error('Unsupported job kind');
    if(this.active)throw new Error('This server already has a setup/render job running');
    const jobId=randomUUID();this.active=jobId;
    try {
      const dir=await this.workspace.project(projectId),folder=path.join(dir,'.harness/jobs');await fs.mkdir(folder,{recursive:true,mode:0o700});
      const record={jobId,projectId,kind,state:'queued',createdAt:new Date().toISOString()},file=path.join(folder,`${jobId}.json`),log=path.join(folder,`${jobId}.log`);
      const save=async()=>{const temp=`${file}.tmp`;await fs.writeFile(temp,json(record),{mode:0o600});await fs.rename(temp,file);};
      await save();
      // Serialize timeline mutation with this job, but return immediately to the MCP caller.
      void this.workspace.locked(projectId,async()=>{
        try {record.state='running';await save();await this.runner(kind,dir,log);record.state='complete';if(kind==='render')record.output='out/film.mp4';}
        catch(e){record.state='failed';record.message=e.message;}
        finally {record.finishedAt=new Date().toISOString();try{await save();}finally{this.active=null;}}
      }).catch(()=>{this.active=null;});
      return {...record};
    }catch(e){this.active=null;throw e;}
  }
  async status(projectId,jobId){
    if(!/^[a-f0-9-]{36}$/.test(jobId))throw new Error('Invalid job ID');
    const dir=await this.workspace.project(projectId),file=await containedFile(dir,`.harness/jobs/${jobId}.json`);
    const record=JSON.parse(await fs.readFile(file,'utf8'));
    if(['queued','running'].includes(record.state)&&this.active!==jobId)return {...record,state:'unknown',message:'Server restarted; inspect the host before submitting another job.'};
    return record;
  }
}

import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {InMemoryTransport} from '@modelcontextprotocol/sdk/inMemory.js';
import {StreamableHTTPClientTransport} from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';
import {Workspace} from '../lib/workspace.mjs';
import {createServer,createHttpApp} from '../lib/mcp.mjs';
import {SmallestAdapter,wavDuration} from '../adapters/smallest.mjs';
import {Jobs} from '../lib/jobs.mjs';
import {root} from '../lib/project.mjs';

function wav(seconds=1){const data=Buffer.alloc(44+24000*2*seconds);data.write('RIFF');data.writeUInt32LE(data.length-8,4);data.write('WAVEfmt ',8);data.writeUInt32LE(16,16);data.writeUInt16LE(1,20);data.writeUInt16LE(1,22);data.writeUInt32LE(24000,24);data.writeUInt32LE(48000,28);data.writeUInt16LE(2,32);data.writeUInt16LE(16,34);data.write('data',36);data.writeUInt32LE(data.length-44,40);return data;}
async function fixture(t,options){const dir=await fs.mkdtemp(path.join(os.tmpdir(),'vh-mcp-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));return new Workspace(dir,options).ready();}
const decode=result=>JSON.parse(result.content[0].text);
const exec=promisify(execFile);

test('MCP client discovers tools, reads skills and revises a film with conflict protection',async t=>{
 const w=await fixture(t),server=createServer(w),client=new Client({name:'test-agent',version:'1'});
 const [a,b]=InMemoryTransport.createLinkedPair();await server.connect(a);await client.connect(b);t.after(()=>client.close());
 const tools=(await client.listTools()).tools.map(x=>x.name);for(const name of ['project_create','tts_prepare','render_start','design_export','fonts_search','font_fetch','review_frame'])assert.ok(tools.includes(name));
 assert.equal((await client.listResources()).resources.length,6);
 assert.match((await client.readResource({uri:'video-harness://skills/journey-director'})).contents[0].text,/journey/i);
 assert.match((await client.readResource({uri:'video-harness://skills/talking-head-edit'})).contents[0].text,/behind the face/i);
 assert.match((await client.readResource({uri:'video-harness://skills/motion-typography'})).contents[0].text,/tracking/);
 const prompt=await client.getPrompt({name:'direct-film',arguments:{brief:'Make a product walkthrough.'}});
 assert.match(prompt.messages[0].content.text,/review_frame/);
 const fonts=decode(await client.callTool({name:'fonts_search',arguments:{query:'quiet editorial',role:'display'}}));
 assert.equal(fonts.results[0].family,'Instrument Serif');
 const created=decode(await client.callTool({name:'project_create',arguments:{projectId:'relay'}}));
 assert.equal(created.validation.frames,930);created.manifest.name='A second brand';
 const changed=await client.callTool({name:'project_update',arguments:{projectId:'relay',revision:created.revision,manifest:created.manifest}});assert.ok(!changed.isError);
 const stale=await client.callTool({name:'project_update',arguments:{projectId:'relay',revision:created.revision,manifest:created.manifest}});assert.equal(stale.isError,true);assert.match(decode(stale).error,/changed/);
 const latest=await w.read('relay');latest.manifest.scenes[0].headline=42;
 await assert.rejects(w.update('relay',latest.manifest,latest.revision),/headline/);
 assert.equal((await w.read('relay')).manifest.scenes[0].headline,created.manifest.scenes[0].headline);
 await assert.rejects(w.read('../escape'));
});

test('MCP and CLI give the reviewer frames from the rendered film',async t=>{
 try {
   await exec('ffmpeg',['-version']);
   await exec('ffprobe',['-version']);
 } catch(error) {
   if(error.code!=='ENOENT')throw error;
   t.skip('FFmpeg is optional and unavailable on this host');
   return;
 }

 const w=await fixture(t),server=createServer(w),client=new Client({name:'review-agent',version:'1'});
 const [a,b]=InMemoryTransport.createLinkedPair();
 await server.connect(a);
 await client.connect(b);
 t.after(()=>client.close());
 const projectId='review-film';
 await w.create(projectId);
 const call=atSeconds=>client.callTool({name:'review_frame',arguments:{projectId,atSeconds}});
 const missing=await call(0.25);
 assert.equal(missing.isError,true);
 assert.match(decode(missing).error,/Render the film first/);

 const dir=await w.project(projectId);
 const out=path.join(dir,'out');
 await fs.mkdir(out,{recursive:true});
 await exec('ffmpeg',['-v','error','-nostdin','-f','lavfi','-i','testsrc2=size=64x48:rate=24:duration=2',
   '-c:v','mpeg4',path.join(out,'film.mp4')]);

 const first=await call(0.25);
 assert.equal(decode(first).atSeconds,0.25);
 assert.equal(first.content[1].type,'image');
 assert.equal(first.content[1].mimeType,'image/jpeg');
 const jpeg=Buffer.from(first.content[1].data,'base64');
 assert.equal(jpeg.readUInt16BE(0),0xffd8);
 const later=await call(1.25);
 assert.notDeepEqual(Buffer.from(later.content[1].data,'base64'),jpeg);
 const closing=await call(1.999);
 assert.equal(closing.content[1].mimeType,'image/jpeg');
 const pastEnd=await call(3);
 assert.equal(pastEnd.isError,true);
 assert.match(decode(pastEnd).error,/No frame at 3s/);

 const imageFile=path.join(out,'frame.jpg');
 await exec(process.execPath,[path.join(root,'bin/vh.mjs'),'review-frame',dir,'--at','0.25','--out',imageFile]);
 assert.deepEqual(await fs.readFile(imageFile),jpeg);
});

test('CLI and MCP carry the same creative brief across sessions and concurrent edits',async t=>{
 const w=await fixture(t),server=createServer(w),client=new Client({name:'brief-agent',version:'1'});
 const [a,b]=InMemoryTransport.createLinkedPair();
 await server.connect(a);
 await client.connect(b);
 t.after(()=>client.close());
 const projectId='new-reel';
 const created=await w.create(projectId);
 const call=(name,arguments_)=>client.callTool({name,arguments:{projectId,...arguments_}});
 const cli=async(...args)=>JSON.parse((await exec(process.execPath,[
  path.join(root,'bin/vh.mjs'),'brief',path.join(w.directory,projectId),...args
 ])).stdout);

 assert.equal(decode(await call('project_brief_read')).questions.length,3);
 const request=await cli('--request','Make a Reel from the original recording');
 assert.equal(request.questions.length,2);
 const [,direction]=await Promise.all([
  cli('--note','Opening scene is ready for review'),
  call('project_brief_update',{look:'Punchy with titles behind the speaker',format:'9:16 Reel'})
 ]);
 assert.ok(!direction.isError);
 const resumed=await cli();
 assert.equal(resumed.request,request.request);
 assert.equal(resumed.look,'Punchy with titles behind the speaker');
 assert.equal(resumed.format,'9:16 Reel');
 assert.equal(resumed.note,'Opening scene is ready for review');
 assert.equal(resumed.history.length,3);
 assert.deepEqual(resumed.questions,[]);
 assert.deepEqual(decode(await call('project_brief_read')),resumed);
 assert.equal((await call('project_brief_update',{})).isError,true);
 assert.equal((await w.read(projectId)).revision,created.revision);
});

test('Smallest adapter uses Pro voice catalog and authenticates synthesis without exposing secrets',async()=>{
 const calls=[],key='synthetic-test-credential';const adapter=new SmallestAdapter({apiKey:key,fetcher:async(url,options)=>{calls.push({url,options});return url.endsWith('get_voices')?Response.json({voices:[{voiceId:'meher'}]}):new Response(wav());}});
 const voices=await adapter.listVoices();assert.equal(voices.catalog.voices[0].voiceId,'meher');assert.match(calls[0].url,/lightning-v3.1-pro\/get_voices$/);
 const speech=await adapter.synthesize(adapter.prepare({text:'Own your intelligence.',voiceId:'meher'}));assert.equal(speech.durationSeconds,1);
 assert.equal(calls[1].url,'https://api.smallest.ai/waves/v1/tts');assert.equal(calls[1].options.headers.Authorization,`Bearer ${key}`);
 const body=JSON.parse(calls[1].options.body);assert.equal(body.model,'lightning_v3.1_pro');assert.equal(body.output_format,'wav');assert.equal(body.language,'en');
 const bad=new SmallestAdapter({apiKey:key,fetcher:async()=>new Response(key,{status:401})});await assert.rejects(bad.listVoices(),e=>!e.message.includes(key)&&e.message.includes('401'));
 assert.throws(()=>wavDuration(Buffer.from('not audio')),/WAV/);
});

test('speech requires approval and survives repeated calls and server restarts without repeat generation',async t=>{
 let calls=0;const adapter=new SmallestAdapter({apiKey:'synthetic',fetcher:async()=>{calls++;return new Response(wav(2));}});
 const w=await fixture(t,{providers:[adapter]});await w.create('film');
 const plan=await w.speechPlan('film',{assetId:'voice-intro',text:'Own your intelligence.',voiceId:'meher'});assert.equal(calls,0);
 await assert.rejects(w.generateSpeech('film',plan.planId,false),/Approve/);
 const [first,second]=await Promise.all([w.generateSpeech('film',plan.planId,true),w.generateSpeech('film',plan.planId,true)]);assert.equal(first.state,'complete');assert.equal(second.asset.id,'voice-intro');assert.equal(calls,1);
 const restarted=await new Workspace(w.directory,{providers:[adapter]}).ready();assert.equal((await restarted.generateSpeech('film',plan.planId,true)).state,'complete');assert.equal(calls,1);
 const current=await w.read('film');assert.equal(current.manifest.assets.filter(a=>a.id==='voice-intro').length,1);assert.equal(first.asset.speech.durationSeconds,2);
 current.manifest.narration=[{asset:'voice-intro',startSeconds:0,durationSeconds:2}];await w.update('film',current.manifest,current.revision);
 const later=await w.read('film');later.manifest.narration[0].startSeconds=30;await assert.rejects(w.update('film',later.manifest,later.revision),/beyond the film/);
});

test('lost provider response is not retried and errors do not persist a secret',async t=>{
 let calls=0;const key='synthetic-secret';const adapter=new SmallestAdapter({apiKey:key,fetcher:async()=>{calls++;throw new Error(key);}});
 const w=await fixture(t,{providers:[adapter]});await w.create('film');const plan=await w.speechPlan('film',{assetId:'voice',text:'Hello.',voiceId:'meher'});
 await assert.rejects(w.generateSpeech('film',plan.planId,true),/outcome may be unknown/);
 const restarted=await new Workspace(w.directory,{providers:[adapter]}).ready();await assert.rejects(restarted.generateSpeech('film',plan.planId,true),/already been submitted/);assert.equal(calls,1);
 assert.equal((await restarted.speechStatus('film',plan.planId)).state,'unknown');
 const files=await fs.readdir(path.join(w.directory,'film/.harness/speech'));for(const file of files)assert.equal((await fs.readFile(path.join(w.directory,'film/.harness/speech',file),'utf8')).includes(key),false);
});

test('HTTP MCP requires bearer auth, rejects hostile origins and works with an official client',async t=>{
 const w=await fixture(t),token='a'.repeat(40),app=createHttpApp(w,{token});
 const listener=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s));});t.after(()=>new Promise(resolve=>{listener.closeAllConnections();listener.close(resolve);}));
 const url=`http://127.0.0.1:${listener.address().port}`;
 assert.equal((await fetch(url+'/health')).status,401);
 assert.equal((await fetch(url+'/health',{headers:{Authorization:`Bearer ${token}`,Origin:'https://untrusted.example'}})).status,403);
 assert.equal((await fetch(url+'/health',{headers:{Authorization:`Bearer ${token}`}})).status,200);
 const client=new Client({name:'remote-agent',version:'1'});await client.connect(new StreamableHTTPClientTransport(new URL(url+'/mcp'),{requestInit:{headers:{Authorization:`Bearer ${token}`}}}));t.after(()=>client.close());
 assert.equal(decode(await client.callTool({name:'project_create',arguments:{projectId:'remote-film'}})).validation.seconds,31);
 assert.ok((await client.listTools()).tools.length>=16);
 assert.throws(()=>createHttpApp(w,{token,host:'0.0.0.0'}),/ALLOWED_HOSTS/);
});

test('render jobs serialize host work, report completion and require authorization',async t=>{
 const w=await fixture(t);await w.create('film');let finish;const jobs=new Jobs(w,{runner:()=>new Promise(resolve=>{finish=resolve;})});
 await assert.rejects(jobs.start('film','render',false),/authorize/);const job=await jobs.start('film','render',true);
 await assert.rejects(jobs.start('film','setup',true),/already/);
 for(let i=0;i<100&&!finish;i++)await new Promise(r=>setTimeout(r,5));assert.ok(finish);finish();
 for(let i=0;i<100&&jobs.active;i++)await new Promise(r=>setTimeout(r,5));assert.equal((await jobs.status('film',job.jobId)).state,'complete');
 assert.equal((await jobs.status('film',job.jobId)).output,'out/film.mp4');
});

test('stdio executable connects without contaminating the MCP stream',async t=>{
 const w=await fixture(t),client=new Client({name:'stdio-agent',version:'1'});
 const transport=new StdioClientTransport({command:process.execPath,args:[path.join(root,'bin/vh.mjs'),'mcp','--workspace',w.directory],stderr:'pipe'});
 await client.connect(transport);t.after(()=>client.close());
 assert.equal((await client.listResources()).resources.length,6);
 assert.equal(decode(await client.callTool({name:'project_create',arguments:{projectId:'stdio-film'}})).validation.seconds,31);
});

test('workspace rejects project symlinks and imports outside the project',async t=>{
 const w=await fixture(t);await w.create('film');
 await fs.symlink(path.join(w.directory,'film'),path.join(w.directory,'alias'));
 await assert.rejects(w.read('alias'),/symlink/);
 await fs.writeFile(path.join(w.directory,'outside.svg'),'<svg/>');
 await assert.rejects(w.importFile('film','../outside.svg',{id:'outside',source:'fixture',license:'MIT'}),/escapes/);
});

test('saved paid audio can resume import after a server restart without a provider retry',async t=>{
 let calls=0;const adapter=new SmallestAdapter({apiKey:'synthetic',fetcher:async()=>{calls++;return new Response(wav());}});
 const w=await fixture(t,{providers:[adapter]});await w.create('film');const plan=await w.speechPlan('film',{assetId:'voice',text:'Hello.',voiceId:'meher'});
 w.finishSpeech=async()=>{throw new Error('Simulated import failure');};
 await assert.rejects(w.generateSpeech('film',plan.planId,true),/import failure/);
 assert.equal((await w.speechStatus('film',plan.planId)).state,'audio-saved');
 const restarted=await new Workspace(w.directory,{providers:[adapter]}).ready();
 assert.equal((await restarted.generateSpeech('film',plan.planId,true)).state,'complete');assert.equal(calls,1);
});

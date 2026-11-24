import fs from 'node:fs/promises';
import path from 'node:path';
import {timingSafeEqual} from 'node:crypto';
import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {StdioServerTransport} from '@modelcontextprotocol/sdk/server/stdio.js';
import {StreamableHTTPServerTransport} from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import {createMcpExpressApp} from '@modelcontextprotocol/sdk/server/express.js';
import {z} from 'zod';
import {Workspace} from './workspace.mjs';
import {root,containedFile} from './project.mjs';
import {fontRoles} from './fonts.mjs';
import {fetchCatalogFont,findFonts} from './font-catalog.mjs';
import {searchImages,fetchImage} from './images.mjs';
import {Jobs} from './jobs.mjs';
import {readReviewFrame} from './review.mjs';

const id=z.string().regex(/^[a-z0-9][a-z0-9-]{0,79}$/);
const project={projectId:id};
const plan={...project,planId:z.string().regex(/^[a-f0-9]{64}$/)};
const briefText=z.string().trim().min(1).max(4000).optional();
const skills=['journey-director','image-sourcing','openpencil-to-film','motion-review','talking-head-edit','motion-typography'];
const text=value=>({content:[{type:'text',text:JSON.stringify(value,null,2)}]});
export function createServer(workspace) {
  workspace.jobs??=new Jobs(workspace);
  const server=new McpServer({name:'video-harness',version:'0.3.0'},{instructions:'Make editable product films from a brief, brand and assets. Read the journey-director resource first. Keep concept footage distinct from evidence. Prepare narration before requesting approval; never infer spending approval from provider configuration. This server is a shared trusted workspace, not an isolated account per caller.'});
  const tool=(name,description,inputSchema,fn,readOnly=false,annotations={})=>server.registerTool(name,{description,inputSchema,annotations:{readOnlyHint:readOnly,destructiveHint:!readOnly,openWorldHint:true,...annotations}},async args=>{try{return text(await fn(args));}catch(e){return {...text({error:e.message}),isError:true};}});
  tool('capabilities','Inspect configured adapters and supported operations.',{},()=>workspace.capabilities(),true);
  tool('project_create','Create a new editable film with synthetic starter scenes. Does not render or generate audio.',project,({projectId})=>workspace.create(projectId));
  tool('project_read','Read manifest, revision and validation findings.',project,({projectId})=>workspace.read(projectId),true);
  tool('project_brief_read','Resume a project by reading saved requests, creative direction, notes and suggested intake questions.',project,({projectId})=>workspace.brief(projectId),true);
  tool('project_brief_update','Record a request, creative direction, delivery format or progress note in the project brief. Keeps earlier entries and the current timeline.',{...project,request:briefText,look:briefText,format:briefText,note:briefText},({projectId,...change})=>workspace.saveBrief(projectId,change),false,{destructiveHint:false,openWorldHint:false});
  tool('project_update','Replace the timeline manifest after reading its revision. Validates before saving; preserves custom scene source.',{...project,revision:z.string().length(64),manifest:z.record(z.string(),z.unknown())},({projectId,manifest,revision})=>workspace.update(projectId,manifest,revision));
  tool('project_storyboard','Generate a frame-aligned storyboard from the current project.',project,({projectId})=>workspace.compile(projectId,'storyboard'));
  tool('project_build','Compile the current manifest into editable Remotion sequences. No render or provider call.',project,({projectId})=>workspace.compile(projectId));
  tool('asset_import','Import a project-relative file staged on the server. Font imports can assign a typography role and weight.',{
    ...project,
    file:z.string().min(1).max(300),
    assetId:id,
    kind:z.enum(['image','video','audio','font']),
    source:z.string().min(1).max(2000),
    license:z.string().min(1).max(2000),
    role:z.enum(fontRoles).optional(),
    weight:z.union([z.number().int().min(1).max(1000),z.string().min(1).max(12)]).optional()
  },({projectId,file,assetId,...options})=>workspace.importFile(projectId,file,{id:assetId,...options}));
  tool('design_export','Export an explicit OpenPencil node from a project-relative .fig/.pen file. Requires the host OpenPencil CLI.',{...project,file:z.string().min(1).max(300),node:z.string().min(1).max(100),assetId:id,license:z.string().min(1).max(2000)},({projectId,file,assetId,...options})=>workspace.exportDesign(projectId,file,{id:assetId,...options}));
  tool('images_search','Find stock image candidates with source and rights metadata. Does not download.',{query:z.string().min(1).max(200),provider:z.enum(['commons','pexels']).default('commons')},({query,provider})=>searchImages(query,{provider}),true);
  tool('image_fetch','Download one selected search candidate. Inspect it and its rights before marking reviewed.',{...project,catalog:z.record(z.string(),z.unknown()),index:z.number().int().min(1).max(12),assetId:id},({projectId,catalog,index,assetId})=>workspace.locked(projectId,async()=>fetchImage(await workspace.project(projectId),catalog,index,assetId)));
  tool('fonts_search','Search curated fonts by mood, role and video use. Set provider to google for live Google Fonts discovery by category or script.',{
    query:z.string().max(240).default(''),provider:z.enum(['catalog','google']).default('catalog'),
    role:z.enum(fontRoles).optional(),category:z.string().max(200).optional(),language:z.string().max(80).optional(),
    limit:z.number().int().min(1).max(100).optional()
  },({query,...options})=>findFonts(query,options),true);
  tool('font_fetch','Import one curated font with its pinned SIL OFL notice. Optionally assign it to a project text role.',{
    ...project,fontId:id,assetId:id.optional(),role:z.enum(fontRoles).optional()
  },({projectId,fontId,assetId,role})=>workspace.locked(projectId,
    async()=>fetchCatalogFont(await workspace.project(projectId),fontId,{id:assetId,role})
  ),false,{destructiveHint:false});
  tool('tts_voices','List live voices from a configured TTS provider. Does not synthesize speech.',{provider:z.string().default('smallest')},({provider})=>workspace.provider(provider).listVoices(),true);
  tool('tts_prepare','Save an exact narration plan: text, voice, model and speed. Returns a plan ID for approval. No synthesis or charge.',{...project,provider:z.string().default('smallest'),assetId:id,text:z.string().min(1).max(8000),voiceId:z.string().min(1).max(100),language:z.string().default('en'),speed:z.number().min(.5).max(2).default(1)},({projectId,...input})=>workspace.speechPlan(projectId,input));
  tool('tts_generate','Send a prepared narration plan to its provider. This may incur charges. Set approved:true only when the user authorized this exact generation. Persisted claims prevent automatic repeat billing.',{...plan,approved:z.boolean()},({projectId,planId,approved})=>workspace.generateSpeech(projectId,planId,approved));
  tool('tts_status','Read a persisted speech receipt without generating or retrying.',plan,({projectId,planId})=>workspace.speechStatus(projectId,planId),true);
  tool('render_start','Start host setup (downloads renderer dependencies) or a full MP4 render. Returns a job ID immediately. Requires explicit authorization; one worker at a time.',{...project,kind:z.enum(['setup','render']),approved:z.boolean()},({projectId,kind,approved})=>workspace.jobs.start(projectId,kind,approved));
  tool('render_status','Read a render/setup job without repeating it.',{...project,jobId:z.string().uuid()},({projectId,jobId})=>workspace.jobs.status(projectId,jobId),true);
  server.registerTool('review_frame',{
    description:'Get a JPEG frame from out/film.mp4 at a playback time in seconds. Requires FFmpeg on the host.',
    inputSchema:{...project,atSeconds:z.number().nonnegative()},
    annotations:{readOnlyHint:true,destructiveHint:false,openWorldHint:false}
  },async({projectId,atSeconds})=>{
    try {
      const image=await workspace.locked(projectId,async()=>readReviewFrame(await workspace.project(projectId),atSeconds));
      return {content:[
        ...text({projectId,atSeconds,source:'out/film.mp4'}).content,
        {type:'image',mimeType:'image/jpeg',data:image.toString('base64')}
      ]};
    } catch(error) {
      return {...text({error:error.message}),isError:true};
    }
  });
  for(const skill of skills){
    const uri=`video-harness://skills/${skill}`;
    server.registerResource(skill,uri,{mimeType:'text/markdown',description:`Portable ${skill} instructions`},async()=>({contents:[{uri,mimeType:'text/markdown',text:await fs.readFile(path.join(root,'skills',skill,'SKILL.md'),'utf8')}]}));
  }
  server.registerPrompt('direct-film',{description:'Make or revise an editable film from a brief, product repository or site.',argsSchema:{brief:z.string()}},async({brief})=>({messages:[{role:'user',content:{type:'text',text:`${await fs.readFile(path.join(root,'skills/journey-director/SKILL.md'),'utf8')}\n\nLatest request:\n${brief}\n\nUse project_brief_read and project_brief_update to carry direction forward. Read the manifest before editing and share the storyboard. Respect the existing authorization for any generation.\n\nRead video-harness://skills/motion-review to review the cut. Use review_frame on an exported MP4 to inspect titles, cuts, peak zoom and result holds. Fix any visible defects, inspect the revised export, and report which frames and playback checks you reviewed.`}}]}));
  return server;
}

export async function serveStdio(directory){const workspace=await new Workspace(directory).ready(),server=createServer(workspace);await server.connect(new StdioServerTransport());return server;}
function matchesToken(actual,expected){const a=Buffer.from(actual??''),b=Buffer.from(`Bearer ${expected}`);return a.length===b.length&&timingSafeEqual(a,b);}
export function createHttpApp(workspace,{token,host='127.0.0.1',allowedHosts,allowedOrigins=[]}={}){
  if(typeof token!=='string'||token.length<32)throw new Error('Set VIDEO_HARNESS_TOKEN to a random token of at least 32 characters');
  if(!['127.0.0.1','localhost','::1'].includes(host)&&!allowedHosts?.length)throw new Error('Non-loopback binding requires VIDEO_HARNESS_ALLOWED_HOSTS');
  const app=createMcpExpressApp({host,allowedHosts});
  app.disable('x-powered-by');
  app.use((req,res,next)=>{
    res.set('Cache-Control','no-store');
    if(req.headers.origin&&!allowedOrigins.includes(req.headers.origin))return res.status(403).json({error:'Origin not allowed'});
    if(!matchesToken(req.headers.authorization,token))return res.status(401).json({error:'Bearer authentication required'});
    next();
  });
  app.get('/health',(_req,res)=>res.json({status:'ok',service:'video-harness',version:'0.3.0'}));
  app.get('/projects/:projectId/film.mp4',async(req,res)=>{
    try{const dir=await workspace.project(req.params.projectId),file=await containedFile(dir,'out/film.mp4');res.type('video/mp4').sendFile(file);}
    catch{res.status(404).json({error:'Render not found'});}
  });
  app.post('/mcp',async(req,res)=>{
    const server=createServer(workspace),transport=new StreamableHTTPServerTransport({sessionIdGenerator:undefined,enableJsonResponse:true});
    res.on('close',()=>{void server.close();});
    try{await server.connect(transport);await transport.handleRequest(req,res,req.body);}
    catch{if(!res.headersSent)res.status(500).json({jsonrpc:'2.0',error:{code:-32603,message:'MCP request failed'},id:null});}
  });
  app.all('/mcp',(_req,res)=>res.status(405).set('Allow','POST').end());
  app.use((err,_req,res,_next)=>{res.status(err.status===413?413:400).json({error:'Invalid or oversized request'});});
  return app;
}
export async function serveHttp(directory,{port=8787,host='127.0.0.1',token=process.env.VIDEO_HARNESS_TOKEN,allowedHosts=process.env.VIDEO_HARNESS_ALLOWED_HOSTS?.split(',').map(x=>x.trim()),allowedOrigins=process.env.VIDEO_HARNESS_ALLOWED_ORIGINS?.split(',').map(x=>x.trim())??[]}={}){
  if(!Number.isInteger(port)||port<1||port>65535)throw new Error('Port must be 1–65535');
  const workspace=await new Workspace(directory).ready();
  const app=createHttpApp(workspace,{token,host,allowedHosts,allowedOrigins});
  return new Promise((resolve,reject)=>{const listener=app.listen(port,host,()=>{console.error(`Video Harness MCP listening at http://${host}:${port}/mcp`);resolve(listener);});listener.once('error',reject);});
}

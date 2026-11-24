#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {init,build,validate,requireValid,storyboard,json,root} from '../lib/project.mjs';
import {importAsset,pencilExport} from '../lib/import.mjs';
import {searchImages,fetchImage} from '../lib/images.mjs';
import {readBrief,updateBrief} from '../lib/brief.mjs';
import {fetchCatalogFont,findFonts} from '../lib/font-catalog.mjs';
import {readReviewFrame} from '../lib/review.mjs';

const help=`Video Harness 0.3 — agent-assisted product journey films

vh init <new-folder>                         Create example, renderer and local skills
vh brief <project>                           Read saved direction, open questions and edit history
vh brief <project> [--request <text>] [--look <text>] [--format <text>] [--note <text>]
                                            Save creative direction or pick up an existing edit
vh validate <project>                        Check timeline, assets and evidence records
vh storyboard <project>                      Write out/storyboard.md and .json
vh build <project>                           Compile film.json into editable scene nodes
vh setup <project>                           Install pinned renderer dependencies
vh preview <project>                         Build and start local Remotion Studio
vh render <project>                          Explicitly export out/film.mp4
vh review-frame <project> --at <seconds> --out <image.jpg>
                                            Extract a frame from the export with FFmpeg
vh import <project> <file> --id <id> --source <text> --license <text> [--kind image|video|audio|font]
                                            Fonts can set --role display|body|face-title|caption and --weight <value>
vh pencil-export <project> <design.fig> --node <id> --id <asset-id> [--license <text>]
vh images <query> --out <results.json> [--provider commons|pexels]
vh fetch-image <project> <results.json> --index <n> --id <asset-id>
vh fonts [query] [--role display|body|face-title|caption] [--limit <n>]
vh fonts [family-query] --provider google [--category <id>] [--language <tag>] [--limit <n>]
vh fetch-font <project> <catalog-id> [--role <role>] [--id <asset-id>]
vh skills <folder>                           Copy skills to a NEW destination folder
vh doctor                                   Check Node, OpenPencil and Codex availability
vh mcp --workspace <folder>                  MCP over stdio for compatible agents
vh serve --workspace <folder> [--port 8787] [--host 127.0.0.1]
                                            Authenticated Streamable HTTP MCP

Image search returns candidates; fetch-image explicitly downloads one. Inspect it
before setting reviewed:true. Suno is optional and never called by these commands.
Renderer: Node 22+, npm; OpenPencil CLI needed only for pencil-export.
`;
const input=process.argv.slice(2), command=input.shift(), positional=[],options={};
for(let i=0;i<input.length;i++) {
  if(input[i].startsWith('--')) {
    const key=input[i].slice(2);if(!input[i+1]||input[i+1].startsWith('--'))throw new Error(`Missing value for --${key}`);
    options[key]=input[++i];
  }else positional.push(input[i]);
}
const directory=()=>{if(!positional[0])throw new Error('Project directory required');return path.resolve(positional[0]);};
const run=(exe,args,cwd)=>new Promise((resolve,reject)=>{
  const child=spawn(exe,args,{cwd,stdio:'inherit',shell:false});
  const forward=()=>child.kill('SIGINT');process.once('SIGINT',forward);
  child.once('error',e=>{process.removeListener('SIGINT',forward);reject(e);});
  child.once('exit',(code,signal)=>{process.removeListener('SIGINT',forward);code===0?resolve():reject(new Error(`${exe} exited ${code??signal}`));});
});
async function main(){
  switch(command){
    case 'mcp':case 'serve':{
      const {serveStdio,serveHttp}=await import('../lib/mcp.mjs');
      const workspace=options.workspace??process.env.VIDEO_HARNESS_WORKSPACE;
      if(!workspace)throw new Error('--workspace or VIDEO_HARNESS_WORKSPACE is required');
      if(command==='mcp')await serveStdio(workspace);
      else await serveHttp(workspace,{port:options.port?Number(options.port):8787,host:options.host??'127.0.0.1'});
      break;
    }
    case undefined:case 'help':case '--help': console.log(help);return;
    case 'init':await init(directory());console.log(`Created ${directory()}\nNext: vh setup "${directory()}" then vh preview "${directory()}"`);break;
    case 'brief':{
      const dir=directory();
      if(positional.length!==1)throw new Error('Usage: vh brief <project> [--request <text>] [--look <text>] [--format <text>] [--note <text>]');
      console.log(json(Object.keys(options).length?await updateBrief(dir,options):await readBrief(dir)));
      break;
    }
    case 'validate':{const r=await validate(directory());console.log(json({errors:r.errors,warnings:r.warnings,frames:r.frames,seconds:r.seconds}));if(r.errors.length)process.exitCode=1;break;}
    case 'build':{const r=await build(directory());console.log(`Built ${r.project.scenes.length} scenes / ${r.seconds}s`);break;}
    case 'storyboard':await storyboard(directory());console.log('Wrote out/storyboard.md and out/storyboard.json');break;
    case 'review-frame':{
      if(!options.out)throw new Error('--out is required');
      const atSeconds=Number(options.at);
      const image=await readReviewFrame(directory(),atSeconds);
      await fs.writeFile(path.resolve(options.out),image,{flag:'wx'});
      console.log(`Saved frame at ${atSeconds}s to ${options.out}`);
      break;
    }
    case 'import':console.log(json(await importAsset(directory(),positional[1],options)));break;
    case 'pencil-export':console.log(json(await pencilExport(directory(),positional[1],options)));break;
    case 'images':{
      if(!options.out)throw new Error('--out is required');
      const results=await searchImages(positional.join(' '),{provider:options.provider});
      await fs.writeFile(path.resolve(options.out),json(results),{flag:'wx'});
      console.log(`Saved ${results.results.length} candidates to ${options.out}; inspect source/license and preview before use`);
      if(results.provider==='pexels')console.log('Photos provided by Pexels: https://www.pexels.com — photographer/source links in results');break;
    }
    case 'fetch-image':{
      const catalog=JSON.parse(await fs.readFile(positional[1],'utf8'));
      console.log(json(await fetchImage(directory(),catalog,Number(options.index),options.id)));break;
    }
    case 'fonts':{
      const {provider,role,category,language,limit}=options;
      console.log(json(await findFonts(positional.join(' '),{provider,role,category,language,limit})));
      break;
    }
    case 'fetch-font':console.log(json(await fetchCatalogFont(directory(),positional[1],{id:options.id,role:options.role})));break;
    case 'skills':await fs.mkdir(directory());await fs.cp(path.join(root,'skills'),directory(),{recursive:true});console.log('Skills copied');break;
    case 'setup':await requireValid(directory());await run(process.platform==='win32'?'npm.cmd':'npm',['install'],directory());break;
    case 'preview':case 'render':{
      await build(directory());
      const exe=path.join(directory(),'node_modules/@remotion/cli/remotion-cli.js');
      try{await fs.access(exe);}catch{throw new Error('Run vh setup <project> first');}
      if(command==='render')await fs.mkdir(path.join(directory(),'out'),{recursive:true});
      await run(process.execPath,[exe,...(command==='preview'?['studio','src/index.jsx','--no-open']:['render','src/index.jsx','Journey','out/film.mp4','--codec','h264'])],directory());break;
    }
    case 'doctor':{
      console.log(`Node ${process.version} (${Number(process.versions.node.split('.')[0])>=22?'OK':'requires 22+'})`);
      for(const tool of ['npm','openpencil','codex']){try{await run(tool,['--version']);}catch{console.log(`${tool}: not available (OpenPencil and Codex are optional)`);}}
      break;
    }
    default:throw new Error(`Unknown command: ${command}. Run vh help.`);
  }
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});

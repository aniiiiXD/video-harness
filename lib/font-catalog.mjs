import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {importAsset} from './import.mjs';
import {readProject} from './project.mjs';
import {fontRoles} from './fonts.mjs';
import catalog from './font-catalog.json' with {type:'json'};

const rawBase=`https://raw.githubusercontent.com/google/fonts/${catalog.revision}`;
const treeBase=`https://github.com/google/fonts/tree/${catalog.revision}`;
const googleEndpoint='https://design.googleapis.com/mcp';
const ignoredWords=new Set(['font','fonts','typeface','typefaces','for','a','the','with','and']);
const shortLanguages={en:'en_Latn',hi:'hi_Deva',ja:'ja_Jpan'};
const fontById=new Map(catalog.fonts.map(font=>[font.id,font]));
const normalize=value=>value.toLowerCase().normalize('NFKD').replace(/\p{M}/gu,'');
const hash=data=>createHash('sha256').update(data).digest('hex');

export function fontSources(font) {
  const folder=path.posix.dirname(font.file);
  return {
    source:`${treeBase}/${folder}`,
    fontUrl:`${rawBase}/${font.file.split('/').map(encodeURIComponent).join('/')}`,
    licenseUrl:`${rawBase}/${folder}/OFL.txt`
  };
}

function terms(query) {
  return (normalize(query).match(/[\p{L}\p{N}]+/gu)??[])
    .filter(word=>!ignoredWords.has(word))
    .map(word=>/^subtitles?$/.test(word)?'caption':word);
}

function curatedSearch(query,{role,limit}) {
  if(role&&!fontRoles.includes(role))throw new Error(`Use a font role of ${fontRoles.join(', ')}`);
  const words=terms(query);
  const matches=[];
  for(const font of catalog.fonts) {
    if(role&&!font.roles.includes(role))continue;
    const family=normalize(font.family);
    const tags=normalize(font.keywords.join(' '));
    const details=normalize([
      font.style,font.group,font.character,font.use,font.direction,font.sampleWeight,...font.roles
    ].join(' '));
    if(!words.every(word=>family.includes(word)||tags.includes(word)||details.includes(word)))continue;
    const rank=words.reduce((score,word)=>score+(family.includes(word)?4:tags.includes(word)?2:1),0);
    matches.push({font,rank});
  }
  matches.sort((a,b)=>b.rank-a.rank);
  return {
    provider:'catalog',query,role,total:matches.length,
    results:matches.slice(0,limit).map(({font})=>({
      ...font,...fontSources(font),license:'SIL OFL 1.1'
    }))
  };
}

async function googleSearch(query,{category,language,limit},fetcher) {
  const args={platform:'PLATFORM_WEB'};
  if(category)args.categories=[category];
  if(language) {
    const tag=Object.hasOwn(shortLanguages,language)?shortLanguages[language]:language.replace(/-([A-Za-z]{4})$/,'_$1');
    args.languages=[tag];
  }
  const response=await fetcher(googleEndpoint,{
    method:'POST',
    headers:{'content-type':'application/json',accept:'application/json, text/event-stream'},
    body:JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'search_fonts',arguments:args}}),
    signal:AbortSignal.timeout(15000),redirect:'error'
  });
  if(!response.ok)throw new Error(`Google Design MCP returned HTTP ${response.status}`);
  const body=(await response.text()).trim();
  const payload=body.startsWith('{')?body:body.match(/^data:\s*(\{.*\})\s*$/m)?.[1];
  if(!payload)throw new Error('Google Design MCP returned an unreadable response');
  const packet=JSON.parse(payload);
  if(packet.error)throw new Error(packet.error.message);
  const value=packet.result?.structuredContent??JSON.parse(packet.result?.content?.[0]?.text??'{}');
  if(value.errorHelp)throw new Error(value.errorHelp.split('\n')[0]);
  if(!Array.isArray(value.fontFamilies))throw new Error('Google Design MCP returned no font list');
  const queryTerms=terms(query);
  const matches=value.fontFamilies.filter(name=>queryTerms.every(word=>normalize(name).includes(word)));
  return {
    provider:'google',query,category,language,total:matches.length,
    results:matches.slice(0,limit).map(family=>({
      family,source:`https://fonts.google.com/specimen/${encodeURIComponent(family).replace(/%20/g,'+')}`
    }))
  };
}

export async function findFonts(query='',{
  provider='catalog',role,category,language,limit=provider==='catalog'?catalog.fonts.length:20,fetcher=fetch
}={}) {
  const count=Number(limit);
  if(!Number.isInteger(count)||count<1||count>100)throw new Error('Font result limit must be between 1 and 100');
  if(provider==='catalog') {
    if(category||language)throw new Error('--category and --language apply to the Google provider');
    return curatedSearch(query,{role,limit:count});
  }
  if(provider==='google') {
    if(role)throw new Error('--role applies to the curated catalog');
    return googleSearch(query,{category,language,limit:count},fetcher);
  }
  throw new Error('Use catalog or google as the font provider');
}

export function verifyFontFiles(font,binary,license) {
  if(hash(binary)!==font.sha256||hash(license)!==font.licenseSha256) {
    throw new Error(`Font or license checksum did not match for ${font.family}`);
  }
}

export async function downloadFontFiles(font,fetcher=fetch) {
  const {fontUrl,licenseUrl}=fontSources(font);
  const read=async url=>{
    const response=await fetcher(url,{signal:AbortSignal.timeout(20000),redirect:'error'});
    if(!response.ok)throw new Error(`Could not download ${font.family} (HTTP ${response.status})`);
    return Buffer.from(await response.arrayBuffer());
  };
  const [binary,license]=await Promise.all([read(fontUrl),read(licenseUrl)]);
  verifyFontFiles(font,binary,license);
  return {binary,license};
}

export async function fetchCatalogFont(dir,fontId,{id=fontId,role,fetcher=fetch}={}) {
  const font=fontById.get(fontId);
  if(!font)throw new Error('Unknown catalog font ID. Run vh fonts to find a face.');
  if(!/^[a-z0-9][a-z0-9-]{0,79}$/.test(id))throw new Error('Use 1–80 lowercase letters, digits or hyphens for the asset ID');
  if(role&&!fontRoles.includes(role))throw new Error(`Use a font role of ${fontRoles.join(', ')}`);
  const project=await readProject(dir);
  if(project.assets.some(asset=>asset.id===id))throw new Error(`Asset ID already exists: ${id}`);
  const {binary,license}=await downloadFontFiles(font,fetcher);
  const {source,licenseUrl}=fontSources(font);
  const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'vh-font-'));
  const file=path.join(temporary,`${id}.ttf`);
  const licensePath=`assets/${id}-OFL.txt`;
  const linkedLicense=path.join(dir,'public',licensePath);
  try {
    await fs.writeFile(file,binary);
    await fs.mkdir(path.dirname(linkedLicense),{recursive:true});
    await fs.writeFile(linkedLicense,license,{flag:'wx'});
    try {
      return await importAsset(dir,file,{
        id,role,kind:'font',weight:font.weight,source,license:'SIL OFL 1.1',
        licensePath,licenseUrl,fontFamily:font.family,sampleWeight:font.sampleWeight
      });
    } catch(error) {
      await fs.rm(linkedLicense,{force:true});
      throw error;
    }
  } finally {
    await fs.rm(temporary,{recursive:true,force:true});
  }
}

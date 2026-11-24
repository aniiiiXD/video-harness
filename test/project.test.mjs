import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {init,build,validate,readProject,storyboard,json,localPath} from '../lib/project.mjs';
import {importAsset} from '../lib/import.mjs';
import {searchImages,fetchImage} from '../lib/images.mjs';
async function fixture(t){const temp=await fs.mkdtemp(path.join(os.tmpdir(),'vh-test-'));t.after(()=>fs.rm(temp,{recursive:true,force:true}));const dir=path.join(temp,'film');await init(dir);return {temp,dir};}
test('new project builds a complete gapless timeline and installs project-local skills',async t=>{
 const {dir}=await fixture(t);const r=await validate(dir);assert.deepEqual(r.errors,[]);assert.equal(r.frames,930);
 const rows=await storyboard(dir);assert.equal(rows[0].fromFrame,0);assert.equal(rows.at(-1).toFrame,929);
 for(let i=1;i<rows.length;i++)assert.equal(rows[i].fromFrame,rows[i-1].toFrame+1);
 await fs.access(path.join(dir,'.agents/skills/openpencil-to-film/SKILL.md'));
 await fs.access(path.join(dir,'.agents/skills/talking-head-edit/scripts/render_face_titles.py'));
 await fs.writeFile(path.join(dir,'src/Scene.jsx'),'user edit');await build(dir);
 assert.equal(await fs.readFile(path.join(dir,'src/Scene.jsx'),'utf8'),'user edit');
 await assert.rejects(init(dir),/EEXIST/);
});
test('validation catches broken claims, unknown assets, duplicate scenes and invalid timing',async t=>{
 const {dir}=await fixture(t),p=await readProject(dir);p.scenes[0].seconds=-2;p.scenes[0].evidence={kind:'verified'};p.scenes[1].id=p.scenes[0].id;p.scenes[2].asset='missing';
 await fs.writeFile(path.join(dir,'film.json'),json(p));const r=await validate(dir);
 for(const message of ['seconds','evidence source','Duplicate scene','unknown asset'])assert.ok(r.errors.some(x=>x.includes(message)));
 await assert.rejects(build(dir));
});
test('portrait timelines preserve composition dimensions and frame counts',async t=>{
 const {dir}=await fixture(t),p=await readProject(dir);
 p.width=1080;
 p.height=1920;
 await fs.writeFile(path.join(dir,'film.json'),json(p));
 const built=await build(dir);
 assert.equal(built.frames,930);
 assert.match(await fs.readFile(path.join(dir,'src/timeline.generated.jsx'),'utf8'),/"width":1080,"height":1920/);
});
test('paths and symlinks cannot expose assets outside the project',async t=>{
 const {dir,temp}=await fixture(t);assert.throws(()=>localPath(dir,'../private'));
 await fs.writeFile(path.join(temp,'private.txt'),'private');await fs.symlink(path.join(temp,'private.txt'),path.join(dir,'public/assets/link.svg'));
 const p=await readProject(dir);p.assets[0].path='assets/link.svg';await fs.writeFile(path.join(dir,'film.json'),json(p));
 assert.ok((await validate(dir)).errors.some(x=>x.includes('unsafe asset')));
});
test('asset import copies content and records provenance without modifying original',async t=>{
 const {dir,temp}=await fixture(t);const original=path.join(temp,'screen.svg');await fs.writeFile(original,'<svg/>');
 const a=await importAsset(dir,original,{id:'screen',source:'Test design',license:'MIT'});
 assert.equal(a.reviewed,false);assert.equal(a.sha256.length,64);assert.equal(await fs.readFile(original,'utf8'),'<svg/>');
 await assert.rejects(importAsset(dir,original,{id:'screen',source:'Test',license:'MIT'}),/already exists/);
});
test('font imports assign a role and title styles validate the font and timing',async t=>{
 const {dir,temp}=await fixture(t);
 const source=path.join(temp,'display.woff2');
 await fs.writeFile(source,'font fixture');
 const options={id:'display-face',kind:'font',source:'Fixture',license:'Fixture'};
 await assert.rejects(importAsset(dir,source,{...options,role:'caption'}),/\.ttf or \.otf/);
 const font=await importAsset(dir,source,{...options,role:'display',weight:'100 900'});
 assert.equal(font.weight,'100 900');
 const project=await readProject(dir);
 assert.equal(project.brand.fonts.display,font.id);
 project.scenes[0].typography={
  font:font.id,box:[.1,.2,.75],size:.15,lineHeight:.95,weight:800,
  entrance:{kind:'mask',start:.25,duration:.4}
 };
 await fs.writeFile(path.join(dir,'film.json'),json(project));
 assert.deepEqual((await build(dir)).errors,[]);
 await fs.access(path.join(dir,'src','typography.js'));

 project.brand.fonts.caption=font.id;
 project.scenes[0].typography.box=[.4,.2,.75];
 project.scenes[0].typography.entrance.duration=5;
 const {errors}=await validate(dir,project);
 for(const condition of [/caption role/,/box must give/,/duration must fit/]){
  assert.ok(errors.some(message=>condition.test(message)));
 }
});
test('image search retains attribution and excludes unsupported formats',async()=>{
 const fetcher=async()=>({ok:true,json:async()=>({query:{pages:{one:{title:'Solar array',imageinfo:[{mime:'image/jpeg',url:'https://upload.wikimedia.org/test.jpg',descriptionurl:'https://commons.wikimedia.org/wiki/File:Test.jpg',width:2400,height:1600,extmetadata:{Artist:{value:'<a>Example Author</a>'},LicenseShortName:{value:'CC BY 4.0'}}}]},two:{title:'Not an image',imageinfo:[{mime:'application/pdf'}]}}}})});
 const c=await searchImages('solar',{fetcher});assert.equal(c.results.length,1);assert.equal(c.results[0].author,'Example Author');assert.equal(c.results[0].license,'CC BY 4.0');
});
test('image downloads reject non-provider URLs before network access',async()=>{
 let requested=false;await assert.rejects(fetchImage('/tmp',{provider:'commons',results:[{download:'https://localhost/secret'}]},1,'x',{fetcher:()=>{requested=true;}}),/provider host/);assert.equal(requested,false);
});
test('malformed manifests report errors instead of crashing validation',async t=>{
 const {dir}=await fixture(t);
 for(const p of [null,{version:1,assets:{},scenes:[]},{version:1,assets:[null],scenes:[null]}]){
  await fs.writeFile(path.join(dir,'film.json'),json(p));assert.ok((await validate(dir)).errors.length>0);
 }
});
test('successful image download imports provenance and a rate limit leaves no asset',async t=>{
 const {dir}=await fixture(t);
 const catalog={provider:'commons',results:[{download:'https://upload.wikimedia.org/a.jpg',source:'https://commons.wikimedia.org/wiki/File:A.jpg',license:'CC BY 4.0',author:'Example'}]};
 const fetcher=async()=>new Response(new Uint8Array([255,216,255,217]),{status:200,headers:{'content-type':'image/jpeg'}});
 const asset=await fetchImage(dir,catalog,1,'download-check',{fetcher});assert.equal(asset.author,'Example');assert.equal(asset.reviewed,false);
 await assert.rejects(fetchImage(dir,catalog,1,'rate-limited',{fetcher:async()=>new Response('',{status:429})}),/rate limit/);
 assert.equal((await readProject(dir)).assets.some(a=>a.id==='rate-limited'),false);
});

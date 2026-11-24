import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fetchCatalogFont,findFonts} from '../lib/font-catalog.mjs';
import {init,readProject} from '../lib/project.mjs';

test('the font catalog covers 30 families and filters by story and text role',async()=>{
  const all=await findFonts();
  assert.equal(all.results.length,30);
  assert.equal(new Set(all.results.map(font=>font.family)).size,30);
  assert.ok(all.results.every(font=>font.direction&&font.sample&&font.licenseUrl));
  const quiet=await findFonts('fonts for quiet editorial',{role:'display'});
  assert.equal(quiet.results[0].id,'instrument-serif');
  const captions=await findFonts('Hindi subtitles',{role:'caption'});
  assert.deepEqual(captions.results.map(font=>font.id),['noto-sans-devanagari']);
});

test('live font discovery sends only a structured search to Google Design MCP',async()=>{
  const result=await findFonts('Inter',{
    provider:'google',category:'/Expressive/Calm',language:'en',limit:3,
    fetcher:async(url,options)=>{
      assert.equal(url,'https://design.googleapis.com/mcp');
      const {params}=JSON.parse(options.body);
      assert.equal(params.name,'search_fonts');
      assert.deepEqual(params.arguments,{
        platform:'PLATFORM_WEB',categories:['/Expressive/Calm'],languages:['en_Latn']
      });
      return Response.json({result:{content:[{text:JSON.stringify({fontFamilies:['Lato','Inter']})}]}});
    }
  });
  assert.deepEqual(result.results.map(font=>font.family),['Inter']);
});

test('a font checksum failure leaves the project untouched',async t=>{
  const temp=await fs.mkdtemp(path.join(os.tmpdir(),'vh-font-catalog-'));
  t.after(()=>fs.rm(temp,{recursive:true,force:true}));
  const dir=path.join(temp,'film');
  await init(dir);
  const before=await readProject(dir);
  await assert.rejects(fetchCatalogFont(dir,'instrument-serif',{
    role:'display',fetcher:async()=>new Response('different bytes')
  }),/checksum/);
  assert.deepEqual(await readProject(dir),before);
  await assert.rejects(fs.access(path.join(dir,'public','assets','instrument-serif-OFL.txt')));
});

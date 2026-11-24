import fs from 'node:fs/promises';
import path from 'node:path';
import {root} from '../lib/project.mjs';
import {downloadFontFiles,findFonts,verifyFontFiles} from '../lib/font-catalog.mjs';

const output=path.resolve(process.argv[2]??path.join(root,'out','font-library'));
const cache=process.argv[3];
const directory=path.join(output,'fonts');
const {results:fonts}=await findFonts();
await fs.mkdir(directory,{recursive:true});

async function stage(font) {
  const name=`${font.id}.ttf`;
  const notice=`${font.id}-OFL.txt`;
  if(cache) {
    const [binary,license]=await Promise.all([
      fs.readFile(path.join(cache,name)),fs.readFile(path.join(cache,notice))
    ]);
    verifyFontFiles(font,binary,license);
    await Promise.all([
      fs.writeFile(path.join(directory,name),binary),fs.writeFile(path.join(directory,notice),license)
    ]);
    return;
  }
  const {binary,license}=await downloadFontFiles(font);
  await Promise.all([
    fs.writeFile(path.join(directory,name),binary),fs.writeFile(path.join(directory,notice),license)
  ]);
}

for(let start=0;start<fonts.length;start+=5) {
  await Promise.all(fonts.slice(start,start+5).map(stage));
}

const faces=fonts.map(font=>
  `@font-face{font-family:"${font.id}";src:url("fonts/${font.id}.ttf") format("truetype");font-weight:${font.weight};font-display:swap;}`
).join('\n');
const data=fonts.map(({id,family,group,style,character,use,direction,roles,keywords,sample,sampleWeight,source})=>({
  id,family,group,style,character,use,direction,roles,keywords,sample,sampleWeight,source
}));
const template=await fs.readFile(path.join(root,'templates','font-library','index.html'),'utf8');
const page=template.replace('/* FONT FACES */',faces).replace('__FONT_LIBRARY__',JSON.stringify(data).replace(/</g,'\\u003c'));
await fs.writeFile(path.join(output,'index.html'),page);
console.log(`Wrote ${fonts.length} verified type specimens to ${path.join(output,'index.html')}`);

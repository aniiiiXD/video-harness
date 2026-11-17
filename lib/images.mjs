import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {importAsset} from './import.mjs';

const plain=s=>String(s??'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
export async function searchImages(query,{provider='commons',fetcher=fetch}={}) {
  if(typeof query!=='string'||!query.trim())throw new Error('An image search query is required');
  let url,headers={'User-Agent':'VideoHarness/0.2 (local image research; https://www.mediawiki.org/wiki/API:Etiquette)'};
  if(provider==='pexels') {
    if(!process.env.PEXELS_API_KEY)throw new Error('Set PEXELS_API_KEY locally to use Pexels');
    url=new URL('https://api.pexels.com/v1/search');url.search=new URLSearchParams({query,per_page:'12',orientation:'landscape'});
    headers.Authorization=process.env.PEXELS_API_KEY;
  } else if(provider==='commons') {
    url=new URL('https://commons.wikimedia.org/w/api.php');
    url.search=new URLSearchParams({action:'query',format:'json',generator:'search',gsrsearch:query,gsrnamespace:'6',gsrlimit:'12',prop:'imageinfo',iiprop:'url|size|mime|extmetadata',iiurlwidth:'1920'});
  } else throw new Error('Use commons or pexels');
  const response=await fetcher(url,{headers,signal:AbortSignal.timeout(20000)});
  if(!response.ok)throw new Error(`Image provider returned HTTP ${response.status}`);
  const data=await response.json();
  if(data.error)throw new Error(`Image provider error: ${data.error.code??'unknown'}`);
  const results=provider==='pexels'?(data.photos??[]).map(p=>({title:p.alt,author:p.photographer,source:p.url,download:p.src?.large2x,width:p.width,height:p.height,mime:'image/jpeg',license:'Pexels license — review usage',licenseUrl:'https://www.pexels.com/license/'})):
    Object.values(data.query?.pages??{}).flatMap(p=>{
      const i=p.imageinfo?.[0];if(!i||!['image/jpeg','image/png','image/webp'].includes(i.mime))return [];
      const m=i.extmetadata??{};
      return [{title:p.title,author:plain(m.Artist?.value),source:i.descriptionurl,download:i.thumburl??i.url,width:i.thumbwidth??i.width,height:i.thumbheight??i.height,mime:i.mime,license:plain(m.LicenseShortName?.value)||'pending-review',licenseUrl:m.LicenseUrl?.value??'',attribution:plain(m.Attribution?.value),restrictions:plain(m.Restrictions?.value)}];
    });
  return {provider,query,searchedAt:new Date().toISOString(),results};
}
export async function fetchImage(dir,catalog,index,id,{fetcher=fetch}={}) {
  const item=catalog.results?.[index-1];
  if(!item)throw new Error('Choose a 1-based result index');
  const url=new URL(item.download);
  const hosts={commons:'upload.wikimedia.org',pexels:'images.pexels.com'};
  if(url.protocol!=='https:'||url.hostname!==hosts[catalog.provider]||url.port||url.username||url.password)throw new Error('Download must use the selected image provider host');
  const response=await fetcher(url,{redirect:'error',signal:AbortSignal.timeout(30000),headers:{'User-Agent':'VideoHarness/0.2 (local image research)'}});
  if(response.status===429)throw new Error('Image provider rate limit (HTTP 429). Wait before retrying or use another source; no file imported.');
  if(!response.ok)throw new Error(`Image download returned HTTP ${response.status}`);
  const ext={'image/jpeg':'.jpg','image/png':'.png','image/webp':'.webp'}[response.headers.get('content-type')?.split(';')[0]];
  if(!ext)throw new Error('Unsupported image response');
  const chunks=[];let bytes=0;
  for await(const chunk of response.body){bytes+=chunk.length;if(bytes>30*1024*1024)throw new Error('Image exceeds 30MB');chunks.push(chunk);}
  const temp=await fs.mkdtemp(path.join(os.tmpdir(),'vh-image-'));
  try {
    const file=path.join(temp,`image${ext}`);await fs.writeFile(file,Buffer.concat(chunks));
    return await importAsset(dir,file,{id,source:item.source,license:item.license,author:item.author,licenseUrl:item.licenseUrl,attribution:item.attribution??'',restrictions:item.restrictions??''});
  }finally{await fs.rm(temp,{recursive:true,force:true});}
}

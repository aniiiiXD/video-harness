import {cancelRender,continueRender,delayRender,staticFile} from 'remotion';

const family=id=>`vh-font-${id}`;

export function fontFamily(brand,role,override) {
  const id=override??brand.fonts?.[role];
  return id?`"${family(id)}", ${brand.fontFamily}`:brand.fontFamily;
}

export function loadProjectFonts(project) {
  const ids=new Set([
    project.brand.fonts?.display,
    project.brand.fonts?.body,
    ...project.scenes.map(scene=>scene.typography?.font)
  ].filter(Boolean));
  if(!ids.size)return;

  const handle=delayRender('Loading project typography');
  Promise.all([...ids].map(async id=>{
    const asset=project.assets.find(item=>item.id===id);
    const source=`url(${JSON.stringify(staticFile(asset.path))})`;
    const font=new FontFace(family(id),source,{weight:String(asset.weight??400)});
    await font.load();
    document.fonts.add(font);
  })).then(()=>continueRender(handle)).catch(cancelRender);
}

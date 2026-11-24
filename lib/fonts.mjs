export const fontRoles=['display','body','face-title','caption'];
export const fontExtensions=['.ttf','.otf','.woff','.woff2'];

export function supportsFontRole(role,extension) {
  if(role==='face-title'||role==='caption')return extension==='.ttf'||extension==='.otf';
  return fontExtensions.includes(extension);
}

export function parseFontWeight(value) {
  const weight=['string','number'].includes(typeof value)?String(value).trim().split(/\s+/):[];
  if(!weight.length||weight.length>2||weight.some(part=>!/^\d{1,4}$/.test(part)||Number(part)<1||Number(part)>1000)
    ||(weight.length===2&&Number(weight[0])>Number(weight[1]))) {
    throw new Error('Use a font weight from 1–1000 or an increasing range such as "100 900"');
  }
  return weight.map(Number).join(' ');
}

export function checkSceneTypography(scene,assets,check) {
  const style=scene.typography;
  if(style===undefined)return;
  const field=(ok,message)=>check(ok,`Scene ${scene.id}: typography ${message}`);
  if(!style||typeof style!=='object'||Array.isArray(style)) {
    field(false,'must be an object');
    return;
  }
  if(style.font!==undefined)field(assets.get(style.font)?.kind==='font','font must reference a font asset');
  if(style.box!==undefined) {
    const box=style.box;
    const valid=Array.isArray(box)&&box.length===3&&box.every(Number.isFinite)
      &&box[0]>=0&&box[1]>=0&&box[1]<1&&box[2]>0&&box[0]+box[2]<=1;
    field(valid,'box must give [left, top, width] as fractions inside the frame');
  }
  if(style.align!==undefined)field(['left','center','right'].includes(style.align),'align must be left, center or right');
  if(style.size!==undefined)field(Number.isFinite(style.size)&&style.size>0&&style.size<=1,'size must be a fraction of frame height in (0, 1]');
  if(style.weight!==undefined)field(Number.isInteger(style.weight)&&style.weight>=1&&style.weight<=1000,'weight must be an integer from 1–1000');
  if(style.tracking!==undefined)field(Number.isFinite(style.tracking),'tracking must be a finite number in em');
  if(style.lineHeight!==undefined)field(Number.isFinite(style.lineHeight)&&style.lineHeight>0,'lineHeight must be positive');
  if(style.entrance!==undefined) {
    const entrance=style.entrance;
    if(!entrance||!['cut','fade','mask'].includes(entrance.kind)) {
      field(false,'entrance kind must be cut, fade or mask');
      return;
    }
    const start=entrance.start??0;
    field(Number.isFinite(start)&&start>=0&&start<scene.seconds,'entrance start must be inside the scene');
    if(entrance.kind!=='cut') {
      const duration=entrance.duration??.4;
      field(Number.isFinite(duration)&&duration>0&&start+duration<=scene.seconds,'entrance duration must fit inside the scene');
    }
  }
}

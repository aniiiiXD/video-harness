import React from 'react';
import {Easing,Interactive,interpolate,useCurrentFrame,useVideoConfig} from 'remotion';
import {fontFamily} from './typography';

export function Title({scene,brand}) {
  const frame=useCurrentFrame();
  const {height,fps}=useVideoConfig();
  const style=scene.typography;
  const [left,top,width]=style.box??[.1,.27,.8];
  const entrance=style.entrance??{kind:'cut'};
  const start=(entrance.start??0)*fps;
  const isMask=entrance.kind==='mask';
  const amount=entrance.kind==='cut'
    ?Number(frame>=start)
    :interpolate(frame,[start,start+(entrance.duration??.4)*fps],[0,1],{
      easing:Easing.bezier(.2,1,.32,1),extrapolateLeft:'clamp',extrapolateRight:'clamp'
    });

  return (
    <Interactive.Div name="Scene statement" style={{
      position:'absolute',left:`${left*100}%`,top:`${top*100}%`,width:`${width*100}%`,
      color:brand.foreground,textAlign:style.align??'left',fontFamily:fontFamily(brand,'body'),
      opacity:isMask?Number(amount>0):amount,overflow:isMask&&amount<1?'hidden':'visible'
    }}>
      <div style={{transform:isMask&&amount<1?`translateY(${(1-amount)*100}%)`:undefined}}>
        <h1 style={{
          fontFamily:fontFamily(brand,'display',style.font),
          fontSize:height*(style.size??.1),fontWeight:style.weight??700,margin:0,
          letterSpacing:`${style.tracking??-.025}em`,lineHeight:style.lineHeight??1,
          whiteSpace:'pre-line',overflowWrap:'break-word'
        }}>{scene.headline}</h1>
        {scene.body&&<p style={{fontSize:height*.027,lineHeight:1.35,margin:`${height*.022}px 0 0`}}>{scene.body}</p>}
      </div>
    </Interactive.Div>
  );
}

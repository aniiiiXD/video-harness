import React from 'react';
import {AbsoluteFill,CanvasImage,Interactive,Sequence,staticFile,useCurrentFrame,useVideoConfig,interpolate,Easing} from 'remotion';
import {Video,Audio} from '@remotion/media';
import {Title} from './Title';
import {fontFamily} from './typography';

const ease=Easing.bezier(.16,1,.3,1);
const progress=(f,start,length)=>interpolate(f,[start,start+length],[0,1],{extrapolateLeft:'clamp',extrapolateRight:'clamp',easing:ease});
const textStyle={fontWeight:700,letterSpacing:'-0.055em',lineHeight:1.02,margin:0};

function Heading({scene,brand,center=false}) {
  const f=useCurrentFrame(),{fps}=useVideoConfig();
  if(scene.typography)return <Title scene={scene} brand={brand}/>;
  return <Interactive.Div name="Scene statement" style={{position:'absolute',left:center?180:120,top:center?310:125,width:center?1560:1680,textAlign:center?'center':'left',color:brand.foreground,opacity:interpolate(f,[0,.23*fps],[0,1],{extrapolateLeft:'clamp',extrapolateRight:'clamp'}),translate:interpolate(f,[0,.6*fps],['0px 48px','0px 0px'],{easing:ease,extrapolateLeft:'clamp',extrapolateRight:'clamp'})}}>
    <h1 style={{...textStyle,fontFamily:fontFamily(brand,'display'),fontSize:center?126:86,maxWidth:'100%',overflowWrap:'break-word',whiteSpace:'pre-line'}}>{scene.headline}</h1>
    {scene.body&&<p style={{fontSize:29,lineHeight:1.5,fontWeight:400,letterSpacing:'-.015em',marginTop:30,maxWidth:center?1300:1500,marginLeft:center?'auto':0,marginRight:center?'auto':0}}>{scene.body}</p>}
  </Interactive.Div>;
}

function Journey({scene,brand}) {
  const f=useCurrentFrame(),{fps}=useVideoConfig(),count=scene.steps.length;
  const x=i=>210+i*1500/(count-1), y=565;
  const p=progress(f,.8*fps,(scene.seconds-1.7)*fps);
  return <><Heading scene={scene} brand={brand}/>
    <svg width="1920" height="1080" style={{position:'absolute'}}>
      <path d={`M210 ${y}H1710`} stroke={brand.foreground} strokeOpacity=".14" strokeWidth="3"/>
      <path d={`M210 ${y}H${210+1500*p}`} stroke={brand.accent} strokeWidth="5"/>
      {scene.steps.map((step,i)=>{const entered=progress(f,(.5+i*.24)*fps,.45*fps),active=p>=i/(count-1);return <g key={i} opacity={entered} transform={`translate(${x(i)},${y+38*(1-entered)})`}>
        <circle r={66} fill={active?brand.accent:brand.background} stroke={brand.accent} strokeWidth="3"/>
        <text textAnchor="middle" dominantBaseline="central" fontSize="38" fill={active?'white':brand.foreground}>{i+1}</text>
        <text y="140" textAnchor="middle" fontSize={count===5?27:32} fill={brand.foreground}>{step}</text>
        {active&&<circle r="84" fill="none" stroke={brand.accent} strokeOpacity=".22"/>}
      </g>;})}
      <circle cx={210+1500*p} cy={y} r="10" fill={brand.foreground}/>
    </svg>
    <div style={{position:'absolute',left:120,bottom:150,fontSize:23,letterSpacing:'.15em',color:brand.accent}}>{Math.min(count,1+Math.floor(p*(count-1)))} / {count} STATES</div>
  </>;
}

function Media({scene,project}) {
  const f=useCurrentFrame(),{fps}=useVideoConfig(),brand=project.brand;
  const asset=project.assets.find(a=>a.id===scene.asset);
  const cam=scene.camera??{from:1,to:1.15,focus:[.5,.5]};
  const p=progress(f,.6*fps,Math.min(1.6,scene.seconds*.4)*fps);
  const scale=Math.exp(Math.log(cam.from)+(Math.log(cam.to)-Math.log(cam.from))*p);
  const full=scene.type==='footage';
  const style={width:'100%',height:'100%',objectFit:full?'cover':'contain'};
  return <>
    <div style={{position:'absolute',left:full?0:160,top:full?0:350,width:full?1920:1600,height:full?1080:590,overflow:'hidden',borderRadius:full?0:18,background:brand.background,boxShadow:full?'none':'0 24px 80px #14274a1a'}}>
      <div style={{width:'100%',height:'100%',transform:`scale(${scale})`,transformOrigin:`${cam.focus[0]*100}% ${cam.focus[1]*100}%`}}>
        {asset.kind==='video'?<Video src={staticFile(asset.path)} muted objectFit={full?'cover':'contain'} style={{width:'100%',height:'100%'}}/>:<CanvasImage src={staticFile(asset.path)} style={style}/>}
      </div>
      {full&&<AbsoluteFill style={{background:'linear-gradient(180deg,rgba(0,0,0,.68),transparent 70%)'}}/>}
    </div>
    <Heading scene={scene} brand={full?{...brand,foreground:'#FFFFFF'}:brand}/>
    {!full&&<div style={{position:'absolute',right:160,bottom:96,fontSize:18,color:brand.foreground,opacity:.65}}>SCREEN DETAIL / {asset.id}</div>}
  </>;
}

function Comparison({scene,brand}) {
  const f=useCurrentFrame(),{fps}=useVideoConfig(),p=progress(f,.9*fps,.7*fps);
  return <><Heading scene={scene} brand={brand}/>
    <div style={{position:'absolute',left:120,top:390,width:680,opacity:1-p*.52,transform:`translateX(${-p*30}px)`}}>
      <div style={{fontSize:20,letterSpacing:'.16em',marginBottom:34}}>BEFORE</div>
      <p style={{...textStyle,fontSize:65,lineHeight:1.14}}>{scene.before}</p>
    </div>
    <svg width="1920" height="1080" style={{position:'absolute'}}><path d="M880 555H1020M990 525L1020 555L990 585" fill="none" stroke={brand.accent} strokeWidth="6" strokeDasharray="230" strokeDashoffset={230*(1-p)}/></svg>
    <div style={{position:'absolute',left:1100,top:390,width:700,opacity:p,transform:`translateX(${45*(1-p)}px)`}}>
      <div style={{fontSize:20,letterSpacing:'.16em',marginBottom:34,color:brand.accent}}>AFTER</div>
      <p style={{...textStyle,fontSize:65,lineHeight:1.14}}>{scene.after}</p>
    </div>
  </>;
}

function Metric({scene,brand}) {
  const f=useCurrentFrame(),{fps}=useVideoConfig(),p=progress(f,.6*fps,1.3*fps);
  return <><Heading scene={scene} brand={brand}/>
    <div style={{position:'absolute',top:365,left:120,width:1680,textAlign:'center',color:brand.accent,fontSize:245,fontWeight:700,letterSpacing:'-.07em'}}>{(scene.from+(scene.to-scene.from)*p).toFixed(1)}<span style={{fontSize:75,letterSpacing:'-.04em',marginLeft:12}}>{scene.unit}</span></div>
    <div style={{position:'absolute',left:420,top:720,height:4,width:1080,background:brand.foreground,opacity:.13}}/>
    <div style={{position:'absolute',left:420,top:720,height:4,width:1080*p,background:brand.accent}}/>
  </>;
}

export function Soundtrack({project}) {
  const asset=project.assets.find(a=>a.id===project.audio?.asset);
  return <>
    {asset&&<Audio src={staticFile(asset.path)} volume={.65}/>}
    {(project.narration??[]).map((cue,i)=>{
      const voice=project.assets.find(a=>a.id===cue.asset);
      return <Sequence key={i} name={`Narration ${cue.asset}`} from={Math.round(cue.startSeconds*project.fps)} durationInFrames={Math.ceil(cue.durationSeconds*project.fps)}>
        <Audio src={staticFile(voice.path)} volume={cue.volume??1}/>
      </Sequence>;
    })}
  </>;
}

export function Scene({scene,project}) {
  const brand=project.brand,f=useCurrentFrame(),{fps}=useVideoConfig();
  if(scene.type==='title'&&scene.typography) {
    return <AbsoluteFill style={{background:brand.background}}><Title scene={scene} brand={brand}/></AbsoluteFill>;
  }
  const full=scene.type==='footage';
  const disclosure=scene.evidence.kind==='concept'?'Illustrative product concept':`${scene.evidence.kind==='recorded'?'Recorded example':'Source-backed claim'} · ${scene.evidence.source}`;
  return <AbsoluteFill style={{background:brand.background,color:brand.foreground,fontFamily:fontFamily(brand,'body'),overflow:'hidden'}}>
    <AbsoluteFill style={{background:`radial-gradient(ellipse at 80% 85%,${brand.accent}12,transparent 65%)`}}/>
    {scene.type==='title'&&<><div style={{position:'absolute',left:850,top:150,width:220,height:7,background:brand.accent,transform:`scaleX(${progress(f,0,.5*fps)})`}}/><Heading scene={scene} brand={brand} center/><div style={{position:'absolute',left:840,top:790,width:240,height:110,opacity:.35}}><svg width="240" height="110"><circle cx="75" cy="55" r="42" fill="none" stroke={brand.accent} strokeWidth="2"/><circle cx={125+20*progress(f,0,1.5*fps)} cy="55" r="42" fill="none" stroke={brand.accent} strokeWidth="2"/></svg></div></>}
    {scene.type==='journey'&&<Journey scene={scene} brand={brand}/>}
    {['wireframe','footage'].includes(scene.type)&&<Media scene={scene} project={project}/>}
    {scene.type==='comparison'&&<Comparison scene={scene} brand={brand}/>}
    {scene.type==='metric'&&<Metric scene={scene} brand={brand}/>}
    <div style={{position:'absolute',left:120,top:54,fontSize:20,fontWeight:700,letterSpacing:'.02em',color:full?'white':brand.foreground}}>{project.name.split(' — ')[0]}</div>
    <div style={{position:'absolute',left:120,bottom:44,width:1680,fontSize:18,lineHeight:1.3,color:full?'white':brand.foreground,opacity:.65}}>{disclosure}</div>
  </AbsoluteFill>;
}

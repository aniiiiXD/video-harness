// The host owns storage, consent and idempotency. This adapter only speaks TTS.
const base='https://api.smallest.ai';
export const defaultModel='lightning_v3.1_pro';
export function speechRequest(input) {
  const text=typeof input.text==='string'?input.text.trim():null;
  if(typeof text!=='string'||!text.length||text.length>8000)throw new Error('Speech text must contain 1–8000 characters');
  if(typeof input.voiceId!=='string'||! /^[a-zA-Z0-9_-]{1,100}$/.test(input.voiceId))throw new Error('Choose an explicit voiceId from the voice catalog');
  const model=input.model??defaultModel;
  if(model!==defaultModel)throw new Error('This adapter currently supports lightning_v3.1_pro');
  const speed=input.speed??1;
  if(!Number.isFinite(speed)||speed<.5||speed>2)throw new Error('Speech speed must be 0.5–2');
  const language=input.language??'en';
  if(!/^(auto|[a-z]{2})$/.test(language))throw new Error('Use a two-letter language code or auto');
  return {text,voice_id:input.voiceId,model,speed,language,sample_rate:24000,output_format:'wav'};
}
export async function limitedBody(response,limit) {
  const parts=[];let size=0;
  if(!response.body)throw new Error('Provider returned an empty response');
  const reader=response.body.getReader();
  try {for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>limit){await reader.cancel();throw new Error('Provider response exceeds size limit');}parts.push(Buffer.from(value));}}
  finally {reader.releaseLock();}
  return Buffer.concat(parts);
}
export function wavDuration(data) {
  if(data.length<44||data.toString('ascii',0,4)!=='RIFF'||data.toString('ascii',8,12)!=='WAVE')throw new Error('Provider did not return a WAV file');
  let byteRate=0,dataSize=0;
  for(let at=12;at+8<=data.length;){
    const name=data.toString('ascii',at,at+4),size=data.readUInt32LE(at+4),end=at+8+size;
    if(end>data.length)throw new Error('Truncated WAV response');
    if(name==='fmt '&&size>=16)byteRate=data.readUInt32LE(at+16);
    if(name==='data')dataSize+=size;
    at=end+(size%2);
  }
  if(!byteRate||!dataSize)throw new Error('WAV response has no playable audio');
  return dataSize/byteRate;
}
export class SmallestAdapter {
  constructor({apiKey=process.env.SMALLEST_API_KEY,fetcher=fetch}={}){this.apiKey=apiKey;this.fetcher=fetcher;this.id='smallest';}
  configured(){return Boolean(this.apiKey);}
  prepare(input){return speechRequest(input);}
  async request(route,options={}) {
    if(!this.configured())throw new Error('Set SMALLEST_API_KEY on the server to use Smallest.ai');
    let response;
    try {response=await this.fetcher(base+route,{...options,redirect:'error',signal:AbortSignal.timeout(120000),headers:{Authorization:`Bearer ${this.apiKey}`,'Content-Type':'application/json',...options.headers}});}
    catch {throw new Error('Smallest.ai request failed; generation outcome may be unknown. No automatic retry was made.');}
    if(!response.ok){await response.body?.cancel();throw new Error(`Smallest.ai returned HTTP ${response.status}. No automatic retry was made.`);}
    return response;
  }
  async listVoices(){
    const response=await this.request('/waves/v1/lightning-v3.1-pro/get_voices');
    const catalog=JSON.parse((await limitedBody(response,2*1024*1024)).toString('utf8'));
    return {provider:this.id,model:defaultModel,catalog};
  }
  async synthesize(request){
    // Revalidate stored parameters, including output format, before dispatch.
    const body=this.prepare({text:request.text,voiceId:request.voice_id,model:request.model,speed:request.speed,language:request.language});
    const response=await this.request('/waves/v1/tts',{method:'POST',headers:{Accept:'audio/wav'},body:JSON.stringify(body)});
    const data=await limitedBody(response,64*1024*1024);
    return {data,extension:'.wav',durationSeconds:wavDuration(data),provider:this.id,model:body.model};
  }
}

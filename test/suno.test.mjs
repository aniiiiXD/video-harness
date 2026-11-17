import {test} from 'node:test';
import assert from 'node:assert/strict';
import {SunoAdapter} from '../adapters/suno.mjs';

function fixture({fail=false}={}) {
  let calls=0;
  const schema={type:'object',properties:{description:{type:'string'}},required:['description']};
  const client={
    listTools:async ({cursor}={}) => cursor ? {tools:[{name:'test_create_audio',inputSchema:schema}]} : {tools:[],nextCursor:'page2'},
    callTool:async () => { calls++; if(fail) throw new Error('network'); return {content:[{type:'text',text:'job accepted'}]}; }
  };
  return {adapter:new SunoAdapter(client),client,schema,calls:()=>calls};
}
const request={toolName:'test_create_audio',args:{description:'Warm synth and strings'},purpose:'One soundtrack candidate'};

test('preparation is read-only, paginated, and approval is required',async()=>{
  const f=fixture(); const plan=await f.adapter.prepare(request);
  assert.equal(f.calls(),0);
  await assert.rejects(f.adapter.execute(plan.id),/Approve/);
  assert.equal(f.calls(),0);
  await f.adapter.execute(plan.id,{approved:true});
  assert.equal(f.calls(),1);
});
test('lost response cannot cause an automatic duplicate purchase',async()=>{
  const f=fixture({fail:true}); const plan=await f.adapter.prepare(request);
  await assert.rejects(f.adapter.execute(plan.id,{approved:true}),/outcome unknown/);
  await f.adapter.prepare(request);
  await assert.rejects(f.adapter.execute(plan.id,{approved:true}),/already submitted/);
  assert.equal(f.calls(),1); assert.equal(f.adapter.status(plan.id),'unknown');
});
test('changed provider schema invalidates reviewed operation',async()=>{
  const f=fixture(); const plan=await f.adapter.prepare(request);
  f.schema.required.push('new_field');
  await assert.rejects(f.adapter.execute(plan.id,{approved:true}),/schema changed/);
  assert.equal(f.calls(),0);
});
test('unknown tools are never called and returned plans cannot mutate stored arguments',async()=>{
  const f=fixture(); await assert.rejects(f.adapter.prepare({...request,toolName:'invented'}),/does not advertise/);
  const plan=await f.adapter.prepare(request); plan.args.description='mutated';
  f.client.callTool=async params=>{assert.equal(params.arguments.description,request.args.description);return {isError:true,content:[]};};
  const result=await f.adapter.execute(plan.id,{approved:true});
  assert.equal(result.state,'provider-error');
});

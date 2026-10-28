import {test} from 'node:test';
import assert from 'node:assert/strict';
test('different books and preferences survive stale pages and closing flushes',async()=>{
 const area=new Map<string,string>();
 Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:(k:string)=>area.get(k)??null,setItem:(k:string,v:string)=>area.set(k,v)}});
 const position={chapterId:'one',chapterIndex:0,sectionId:'one',paragraph:'sample',offset:12,ratio:.6};
 area.set('worlds-reader:v1',JSON.stringify({positions:{legacy:position},preferences:{fontSize:24,lineHeight:2,font:'sans'}}));
 const load=(name:string)=>import(new URL('../src/storage.ts?'+name,import.meta.url).href);
 try{
  const a=await load('a'),b=await load('b');a.getPreferences();b.getPreferences();
  a.savePosition('A',position);b.savePosition('B',{...position,ratio:.2});
  a.savePreferences({fontSize:26,lineHeight:2,font:'serif'});
  b.savePosition('B',{...position,ratio:.3});
  const reopened=await load('reopened');
  assert.equal(reopened.getPosition('A').ratio,.6);assert.equal(reopened.getPosition('B').ratio,.3);
  assert.equal(reopened.getPosition('legacy').ratio,.6);
  assert.equal(reopened.getPreferences().fontSize,26);
  assert.ok(area.get('worlds-reader:v1')?.includes('legacy'));
 }finally{delete (globalThis as {localStorage?:unknown}).localStorage;}
});

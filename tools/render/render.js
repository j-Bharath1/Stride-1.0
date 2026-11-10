const {chromium}=require('/opt/npm-tools/node_modules/playwright');
const fs=require('fs'), path=require('path');
(async()=>{
 const OUT='exout'; fs.rmSync(OUT,{recursive:true,force:true}); fs.mkdirSync(OUT,{recursive:true});
 const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
 const p=await b.newPage({viewport:{width:900,height:900}}); const errs=[];
 p.on('pageerror',e=>errs.push(e.message));
 await p.goto('file://'+process.cwd()+'/shot.html'); await p.waitForTimeout(800);
 const list=await p.evaluate(()=>window.LIST);
 const jobs=[]; list.forEach(x=>{ for(let f=0;f<x.frames;f++) jobs.push([x.id,f]); });
 console.log('exercises:',list.length,'frames:',jobs.length);
 let n=0;
 for (let i=0;i<jobs.length;i+=10){
   const batch=jobs.slice(i,i+10);
   const urls=await p.evaluate(bs=>bs.map(([id,f])=>window.shot(id,f,800,800)), batch);
   batch.forEach(([id,f],k)=>{ fs.writeFileSync(path.join(OUT,`${id}-${f}.png`), Buffer.from(urls[k].split(',')[1],'base64')); n++; });
   if(i%50===0) process.stdout.write('.');
 }
 console.log('\nwrote',n,'images'); console.log(errs.join('\n')||'no errors');
 await b.close();
})();

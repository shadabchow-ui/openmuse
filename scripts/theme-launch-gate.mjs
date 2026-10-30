import{readFileSync,readdirSync,statSync,mkdirSync,writeFileSync}from"node:fs";
import{resolve,join}from"node:path";import{pathToFileURL}from"node:url";
export function color(value){
 if(/^#[0-9a-f]{6}$/i.test(value))return[1,3,5].map(i=>parseInt(value.slice(i,i+2),16));
 const m=/^rgba?\(([^)]+)\)$/.exec(value??"");if(!m)return null;
 const v=m[1].split(",").map(Number);return v.length>=3&&v.every(Number.isFinite)?v:null;
}
export function compositeBackground(chain){
 let result=[255,255,255];for(const value of chain){const c=color(value);if(c){const a=c[3]??1;result=c.slice(0,3).map((v,i)=>v*a+result[i]*(1-a));}}return result;
}
export function contrast(a,b){
 const lum=c=>c.slice(0,3).map(x=>{x/=255;return x<=0.04045?x/12.92:((x+0.055)/1.055)**2.4;}).reduce((n,x,i)=>n+x*[0.2126,0.7152,0.0722][i],0);
 const x=lum(a),y=lum(b);return(Math.max(x,y)+.05)/(Math.min(x,y)+.05);
}
export function verdict(measurement){
 if(!measurement.text.length||measurement.unknown||!measurement.themeApplied||measurement.longAnimations.length)return"FAIL";
 if(measurement.text.some(p=>!Number.isFinite(p.ratio)||p.ratio<4.5)||measurement.focus.some(p=>!p.visible||p.ratio<3))return"FAIL";
 return"PASS";
}
/** Actual rendered viewport measurements; no synthetic DOM or contrast result is substituted. */
export async function measurePage(page,expectedBackground){
 const raw=await page.evaluate(()=>{
  const rgb=s=>{const m=/^rgba?\(([^)]+)\)$/.exec(s);return m?m[1].split(",").map(Number):null;};
  const blend=(top,base)=>{const a=top[3]??1;return top.slice(0,3).map((v,i)=>v*a+base[i]*(1-a));};
  const background=e=>{const chain=[];for(let n=e;n;n=n.parentElement)chain.push(n);let c=[255,255,255];for(const n of chain.reverse()){const v=rgb(getComputedStyle(n).backgroundColor);if(v)c=blend(v,c);}return c;};
  const visible=e=>{if(!e)return false;const r=e.getBoundingClientRect(),s=getComputedStyle(e);return r.width>0&&r.height>0&&r.bottom>0&&r.right>0&&r.top<innerHeight&&r.left<innerWidth&&s.visibility!=="hidden"&&s.display!=="none"&&s.opacity!=="0"&&!e.closest('[aria-hidden="true"]');};
  const rows=[],walk=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let n,unknown=0;
  while(n=walk.nextNode()){const e=n.parentElement;if(!n.textContent.trim()||!visible(e)||["SCRIPT","STYLE"].includes(e.tagName))continue;
   const style=getComputedStyle(e),fg=rgb(style.color),bg=background(e);if(!fg||style.backgroundImage!=="none"){unknown++;continue;}
   rows.push({element:e.tagName,text:n.textContent.trim().slice(0,120),foreground:blend(fg,bg),background:bg});}
  const backgrounds=[...document.querySelectorAll("*")].filter(visible).map(e=>rgb(getComputedStyle(e).backgroundColor)).filter(Boolean);
  const controls=[...document.querySelectorAll('button,a[href],input,textarea,select,[tabindex]')].filter(e=>visible(e)&&e.tabIndex>=0&&!e.disabled&&e.getAttribute("aria-disabled")!=="true").length;
  const longAnimations=document.getAnimations().filter(a=>a.playState==="running"&&Number(a.effect?.getComputedTiming().duration)>200).map(a=>({duration:a.effect.getComputedTiming().duration}));
  return{text:rows,backgrounds,controls,unknown,longAnimations};
 });
 const text=raw.text.map(r=>({...r,ratio:contrast(r.foreground,r.background)})),focus=[],seen=new Set();
 await page.evaluate(()=>document.activeElement?.blur());
 for(let i=0;i<Math.min(raw.controls+2,130);i++){
  await page.keyboard.press("Tab");
  const row=await page.evaluate(()=>{
   const e=document.activeElement;if(!e||e===document.body)return null;
   const s=getComputedStyle(e),r=e.getBoundingClientRect(),backgroundChain=[];for(let n=e;n;n=n.parentElement)backgroundChain.unshift(getComputedStyle(n).backgroundColor);return{backgroundChain,id:[...document.querySelectorAll("*")].indexOf(e),element:e.tagName,label:e.getAttribute("aria-label")||e.textContent?.trim().slice(0,80),outline:s.outlineColor,outlineWidth:parseFloat(s.outlineWidth),outlineStyle:s.outlineStyle,background:s.backgroundColor,shadow:s.boxShadow,visibleRect:r.width>0&&r.height>0};});
  if(!row||seen.has(row.id))continue;seen.add(row.id);
  const fg=color(row.outline),bg=compositeBackground(row.backgroundChain);const ratio=fg?contrast(fg.slice(0,3).map((v,i)=>v*(fg[3]??1)+bg[i]*(1-(fg[3]??1))),bg):0;
  focus.push({...row,ratio,visible:row.visibleRect&&row.outlineWidth>0&&row.outlineStyle!=="none"&&ratio>=3});
 }
 const expected=color(expectedBackground),themeApplied=!!expected&&raw.backgrounds.some(c=>c.slice(0,3).every((v,i)=>Math.abs(v-expected[i])<1));
 return{text,focus,unknown:raw.unknown+(raw.controls>128?1:0),longAnimations:raw.longAnimations,themeApplied,scope:"visible viewport, empty/fixture state; physical displays/assistive technology/other browsers NOT_RUN"};
}
export function literalScan(root){
 const files=[],walk=d=>{if(!statSync(d).isDirectory())return;for(const n of readdirSync(d)){const p=join(d,n),s=statSync(p);if(s.isDirectory())walk(p);else if(/\.(tsx|css)$/.test(n))files.push(p);}};
 for(const p of["apps/mobile/src","apps/mobile/dist/web"])walk(join(root,p));
 return files.map(p=>({file:p.slice(root.length+1),literalColors:(readFileSync(p,"utf8").match(/#[0-9a-f]{3,8}\b|rgba?\(/gi)||[]).length}));
}
async function main(){
 const a=process.argv.slice(2),arg=(n,d)=>{const i=a.indexOf(n);return i<0?d:a[i+1];},origin=arg("--origin"),out=resolve(arg("--out","theme-gate-output")),driver=arg("--driver");
 const u=new URL(origin);if(!["127.0.0.1","localhost"].includes(u.hostname)||u.protocol!=="http:")throw Error("local fixture HTTP origin required");
 if(!driver)throw Error("explicit existing browser driver module required; no dependency is installed");
 const{chromium}=await import(pathToFileURL(resolve(driver)).href),themes=await import(pathToFileURL(resolve("apps/mobile/src/theme/theme.ts")).href),t=themes.lightTheme?themes:themes.default;
 const surfaces=["chat","activity","ideas","goals","apps","threads","settings","mail","calendar","browser","files","robot"],cells=[],mutations=[];
 mkdirSync(out,{recursive:true});let server,browser;
 try{
  server=await chromium.launchServer({chromiumSandbox:true,timeout:45000});const launchArgs=server.process().spawnargs;
  if(launchArgs.some(a=>a==="--no-sandbox"||a.startsWith("--no-sandbox=")||a==="--disable-setuid-sandbox"))throw Error("unsafe browser arguments");
  browser=await chromium.connect(server.wsEndpoint());
  for(const width of[1280,390])for(const variant of["light","dark","system-light","system-dark"]){
   const scheme=variant.endsWith("dark")?"dark":"light",choice=variant.startsWith("system")?"system":variant,context=await browser.newContext({viewport:{width,height:900},colorScheme:scheme,reducedMotion:"reduce"});
   await context.addInitScript(choice=>localStorage.setItem("appearance.choice.v1",choice),choice);
   await context.route("**/*",r=>new URL(r.request().url()).origin===u.origin?r.continue():r.abort());
   for(const surface of surfaces){
    const cell={surface,variant,width,status:"NOT_RUN",reason:null};let page;
    try{
     if(surface==="robot"){cell.reason="native-only Robot route absent from external-auth web navigation";cells.push(cell);continue;}
     page=await context.newPage();await page.goto(origin+"/muse",{waitUntil:"domcontentloaded"});await page.getByRole("textbox",{name:"Message OpenMuse"}).waitFor({timeout:15000});
     if(surface==="threads")await page.getByRole("button",{name:"Open conversations and menu",exact:true}).click();
     else if(surface==="settings"||["mail","calendar","browser","files"].includes(surface)){
      await page.getByRole("button",{name:"Apps",exact:true}).click();
      const label={settings:"Personality & memory",mail:"Mail",calendar:"Calendar",browser:"Agent computer",files:"Files"}[surface];
      await page.getByText(label,{exact:true}).first().click({timeout:5000});
     }else if(surface!=="chat")await page.getByRole("button",{name:surface[0].toUpperCase()+surface.slice(1),exact:true}).click();
     await page.waitForTimeout(150);
     const measurement=await measurePage(page,t[scheme==="dark"?"darkTheme":"lightTheme"].background);
     Object.assign(cell,{status:verdict(measurement),measurement,screenshot:surface+"-"+variant+"-"+width+".png"});
     await page.screenshot({path:join(out,cell.screenshot),fullPage:true});
    }catch(error){cell.reason=String(error.message).split("\n")[0];}
    finally{await page?.close();}cells.push(cell);
   }
   await context.close();
  }
  const context=await browser.newContext({viewport:{width:1280,height:900},colorScheme:"dark",reducedMotion:"reduce"});
  await context.addInitScript(()=>localStorage.setItem("appearance.choice.v1","dark"));await context.route("**/*",r=>new URL(r.request().url()).origin===u.origin?r.continue():r.abort());
  const page=await context.newPage();await page.goto(origin+"/muse");await page.getByRole("textbox",{name:"Message OpenMuse"}).waitFor();
  await page.addStyleTag({content:"*{color:rgb(150,150,150)!important;background-color:rgb(151,151,151)!important}"});const low=await measurePage(page,t.darkTheme.background);mutations.push({name:"forced-low-contrast",failedAsExpected:low.text.some(p=>p.ratio<4.5)});
  await page.evaluate(()=>localStorage.setItem("appearance.choice.v1","light"));await page.reload();await page.getByRole("textbox",{name:"Message OpenMuse"}).waitFor();const wrong=await measurePage(page,t.darkTheme.background);mutations.push({name:"dark-selection-removed",failedAsExpected:!wrong.themeApplied});await context.close();
  const counts=Object.fromEntries(["PASS","FAIL","NOT_RUN"].map(s=>[s,cells.filter(c=>c.status===s).length])),result={environment:"local sandboxed browser; in-memory gateway fixtures, not a real consumer backend",sourcePin:"c03b183044295ee9c1005dfb3c86845f087bf5f0",browser:browser.version(),launchArgs,cells,counts,literalColors:literalScan(process.cwd()),mutations,composite:counts.FAIL||counts.NOT_RUN?"FAIL":"PASS",independentReview:"PENDING",nativeDevice:"NOT_RUN"};
  writeFileSync(join(out,"RESULTS.json"),JSON.stringify(result,null,2)+"\n");console.log(JSON.stringify({counts,mutations,composite:result.composite}));if(result.composite!=="PASS"||mutations.some(m=>!m.failedAsExpected))process.exitCode=1;
 }finally{await browser?.close();await server?.close();}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)await main();

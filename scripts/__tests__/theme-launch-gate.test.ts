import assert from"node:assert/strict";import{test}from"node:test";import{execFileSync}from"node:child_process";
import{isAllowed,identicalAcceptedEntry,requireAcceptedAncestor,ACCEPTED_SOURCE_BASELINE,deniedImports}from"../check-patch-surface.mjs";
for(const p of["scripts/theme-launch-gate.mjs","scripts/__tests__/theme-launch-gate.test.ts","docs/theme-launch-gate/RESULTS.md"])test("exact gate path admitted: "+p,()=>assert.equal(isAllowed(p),true));
for(const p of["scripts/arbitrary.mjs","scripts/__tests__/other.test.ts","docs/theme-launch-gate/another.md","apps/server/src/escape.ts"])test("unrelated path remains denied: "+p,()=>assert.equal(isAllowed(p),false));
test("accepted snapshot pins exact mode/type/blob/path, not a writable directory",()=>{
 const p="apps/mobile/app.json",before=execFileSync("git",["ls-tree",ACCEPTED_SOURCE_BASELINE,"--",p],{encoding:"utf8"}),now=execFileSync("git",["ls-tree","HEAD","--",p],{encoding:"utf8"});
 assert.equal(identicalAcceptedEntry(before,now),true);
 assert.equal(identicalAcceptedEntry(before,now.replace("100644","100755")),false);
 assert.equal(identicalAcceptedEntry(before,now.replace("100644 blob","120000 blob")),false);
 assert.equal(identicalAcceptedEntry(before,now.replace(/blob [0-9a-f]+/,"blob "+"0".repeat(40))),false);
 assert.equal(identicalAcceptedEntry("",now),false);assert.equal(identicalAcceptedEntry(undefined,now),false);
});
test("missing or nonancestor baseline fails closed",()=>{
 requireAcceptedAncestor(true,true);assert.throws(()=>requireAcceptedAncestor(false,false));assert.throws(()=>requireAcceptedAncestor(true,false));
 assert.equal(ACCEPTED_SOURCE_BASELINE,"c03b183044295ee9c1005dfb3c86845f087bf5f0");
});
test("whole-source import deny policy retained",()=>assert.equal(deniedImports([{path:"fixture.ts",text:'import x from "next-themes"'}]).length,1));
import{color,contrast,verdict}from"../theme-launch-gate.mjs";
test("computed-color math uses WCAG linear luminance",()=>{assert.equal(contrast([0,0,0],[255,255,255]),21);assert.equal(contrast([150,150,150],[150,150,150]),1);assert.deepEqual(color("#ff0000"),[255,0,0]);assert.deepEqual(color("rgb(1, 2, 3)"),[1,2,3]);});
test("missing measurements, low contrast, wrong theme and long motion never pass",()=>{
 const good={text:[{ratio:7}],focus:[{visible:true,ratio:4}],unknown:0,themeApplied:true,longAnimations:[]};assert.equal(verdict(good),"PASS");
 for(const bad of[{...good,text:[]},{...good,text:[{ratio:1}]},{...good,themeApplied:false},{...good,unknown:1},{...good,longAnimations:[{}]},{...good,focus:[{visible:false,ratio:0}]}])assert.equal(verdict(bad),"FAIL");
});

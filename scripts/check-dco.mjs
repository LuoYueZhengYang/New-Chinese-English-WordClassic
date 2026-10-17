import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

export function hasAuthorSignoff({name,email,message}){
  if(!name||!email||typeof message!=='string')return false;
  const expectedName=name.trim().replace(/\s+/g,' ');
  return message.split(/\r?\n/).some(line=>{
    const match=/^Signed-off-by:\s*(.+?)\s*<([^<>\s]+@[^<>\s]+)>\s*$/i.exec(line);
    return match&&match[1].trim().replace(/\s+/g,' ')===expectedName&&match[2].toLowerCase()===email.toLowerCase();
  });
}

export function checkDco(base,head){
  if(!/^[a-f0-9]{40}$/i.test(base??'')||!/^[a-f0-9]{40}$/i.test(head??''))throw new Error('Pass full base and head commit SHAs.');
  const git=args=>execFileSync('git',args,{encoding:'utf8',windowsHide:true,stdio:['ignore','pipe','pipe']}).trimEnd();
  for(const ref of [base,head])git(['cat-file','-e',`${ref}^{commit}`]);
  const commits=git(['rev-list','--reverse',`${base}..${head}`]).split('\n').filter(Boolean);
  const failed=[];
  for(const sha of commits){
    const [name,email,...body]=git(['show','-s','--format=%an%x00%ae%x00%B',sha]).split('\0');
    if(!hasAuthorSignoff({name,email,message:body.join('\0')}))failed.push(sha);
  }
  if(failed.length)throw new Error('Missing author-matching DCO Signed-off-by on: '+failed.map(s=>s.slice(0,12)).join(', ')+'. See CONTRIBUTING.md; sign only after personally confirming DCO conditions.');
  return{commits:commits.length,authorMatchingSignoffs:true,rightsVerified:false};
}

if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){
  try{console.log(JSON.stringify(checkDco(process.argv[2]??process.env.BASE_SHA,process.argv[3]??process.env.HEAD_SHA)));}
  catch(error){console.error(error.message);process.exitCode=1;}
}

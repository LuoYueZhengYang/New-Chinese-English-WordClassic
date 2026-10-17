import test from 'node:test';
import assert from 'node:assert/strict';
import {hasAuthorSignoff,checkDco} from '../scripts/check-dco.mjs';
const identity={name:'Example Contributor',email:['example','users.noreply.github.com'].join('@')};
const signoff=`Signed-off-by: ${identity.name} <${identity.email}>`;

test('DCO checks an explicit matching author declaration',()=>{
  assert.equal(hasAuthorSignoff({...identity,message:'Original contribution\n\n'+signoff}),true);
  assert.equal(hasAuthorSignoff({...identity,message:'Original contribution only'}),false);
});
test('DCO supports CRLF and email case without accepting another signer',()=>{
  assert.equal(hasAuthorSignoff({...identity,message:'Change\r\n\r\n'+signoff.replace(identity.email,identity.email.toUpperCase())}),true);
  assert.equal(hasAuthorSignoff({...identity,message:signoff.replace(identity.name,'Different Contributor')}),false);
  assert.equal(hasAuthorSignoff({...identity,message:signoff.replace(identity.email,'different@example.invalid')}),false);
});
test('DCO checks actual trailers rather than prose mentions',()=>{
  assert.equal(hasAuthorSignoff({...identity,message:'Please add '+signoff}),false);
  assert.equal(hasAuthorSignoff({...identity,message:'Signed-off-by: incomplete'}),false);
});
test('DCO range accepts full commit IDs only',()=>{
  assert.throws(()=>checkDco('--all','HEAD'),/full base and head/);
  assert.throws(()=>checkDco('abc','def'),/full base and head/);
});

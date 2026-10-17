import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadCorpus, validateCorpus } from './validate.mjs';
import { loadLexiconV02, validateLexiconV02 } from './validate-lexicon-v02.mjs';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const data = loadCorpus(root);
validateCorpus(data);
const lexicon = loadLexiconV02(root);
validateLexiconV02(lexicon);
const esc = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const table = (head, rows) => `<div class="table-wrap"><table><thead><tr>${head.map(x => `<th>${esc(x)}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr>${row.map(cell => `<td>${esc(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
const content = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>New Chinese English WordClassic</title><style>
*{box-sizing:border-box}body{margin:0;background:#f4f3ec;color:#25372e;font:16px/1.8 system-ui,"Microsoft YaHei",sans-serif}main{max-width:1100px;margin:auto;padding:40px 24px 64px}header,section{background:#fffefa;border:1px solid #dedfd4;border-radius:12px;padding:28px;margin:0 0 24px}h1{font-size:clamp(25px,4vw,38px);line-height:1.3;margin:8px 0 16px}h2{font-size:23px}a{color:#23664b}.tag{font-size:13px;color:#576c5c}.stats{display:flex;flex-wrap:wrap;gap:12px;margin-top:18px}.stat{background:#edf2e6;border-radius:8px;padding:10px 16px}.table-wrap{overflow:auto}table{width:100%;border-collapse:collapse;text-align:left}th,td{padding:10px 12px;border-bottom:1px solid #e4e5dc;vertical-align:top}th{color:#42614c}td:last-child{font-family:Georgia,system-ui,serif}nav{display:flex;gap:18px;flex-wrap:wrap}.muted{color:#68746a;font-size:14px}.notice{border-left:4px solid #5b805d;padding-left:16px}@media(max-width:600px){main{padding:18px 10px}header,section{padding:20px 16px}th,td{padding:8px}h2{font-size:21px}}
</style></head><body><main><header><div class="tag">王正阳（笔名）发起 · 公开协作草案 0.1.0</div><h1>New Chinese English WordClassic</h1><p>保留英语基础词原有读音，以中文词义组合为参考，探索更容易理解和推导的表达。</p><p class="notice">知识的进步，依靠人类共同的智慧。约5000个基础单位是长期建设目标；本页展示当前小规模实验，不是现行标准英语教材。</p><div class="stats"><span class="stat">${data.roots.entries.length} 基础词</span><span class="stat">${data.compounds.entries.length} 组合词</span><span class="stat">${data.numbers.entries.length} 数字条目</span><span class="stat">${data.sentences.entries.length} 原创句子</span></div><nav><a href="#roots">基础词</a><a href="#compounds">组合词</a><a href="#numbers">0—99</a><a href="#sentences">60句</a><a href="../docs/MANIFESTO.zh-CN.md">发起人宣言</a></nav></header><section id="roots"><h2>基础词</h2><p class="muted">沿用原英语读音；口音与音标方案待讨论。</p>${table(['中文基础义','WordClassic'], data.roots.entries.map(x => [x.zh, x.wc]))}</section><section id="compounds"><h2>组合词</h2>${table(['中文','拆分','WordClassic'], data.compounds.entries.map(x => [x.zh, x.components.join(' + '), x.wc]))}</section><section id="numbers"><h2>0—99 数字表</h2>${table(['数值','中文','WordClassic'], data.numbers.entries.map(x => [x.value, x.zh, x.wc]))}</section><section id="sentences"><h2>60句原创试行表达</h2><p class="muted">句式是提案；欢迎报告时间、否定、数量、关系和读音方面的歧义。</p>${table(['编号','中文','WordClassic'], data.sentences.entries.map(x => [x.id, x.zh, x.wc]))}</section><section><h2>参与建设</h2><p>外部贡献通过 Pull Request 提交，维护者审核后合并。原创文本与数据采用 CC BY-SA 4.0，代码采用 MIT；提交贡献须附 DCO 签署，维护者审核后合并。第三方材料不自动纳入项目许可。</p><p><a href="../CONTRIBUTING.md">贡献指南</a> · <a href="../docs/SPEC.md">规则规范</a> · <a href="../docs/ACKNOWLEDGEMENTS.md">历史启发与素材说明</a></p></section></main></body></html>`;
fs.mkdirSync(path.join(root, 'public'), { recursive: true });
const current = content
  .replace('公开协作草案 0.1.0', '词库试行 0.2.0-trial · 初始数据保留')
  .replace(`${data.roots.entries.length} 基础词`, `${lexicon.entries.length} 新版基础单位`)
  .replace(`${data.compounds.entries.length} 组合词`, `${lexicon.compounds.length} 新版组合词`)
  .replace('<section id="roots">', `<section id="v02"><h2>0.2 新版试行词库</h2><p>组合优先，固定主选义。奶 milk 与牛奶 cattlemilk 分开；dried 保留现成词形，不引入通用词尾变形。尚无独立学习者效果或语料覆盖率结论。</p><p><a href="../docs/SPEC-v02.md">新版规则与迁移说明</a> · <a href="../data/lexicon-v02.json">完整数据</a></p>${table(['中文主选义','WordClassic'],lexicon.entries.map(x=>[x.zh,x.wc]))}<h2>14个登记组合</h2>${table(['中文','组成','WordClassic'],lexicon.compounds.map(x=>[x.zh,x.components.join(' + '),x.wc]))}</section><section id="roots">`)
  .replace('<a href="#roots">基础词</a>', '<a href="#v02">新版词库</a><a href="#roots">初始词库</a>')
  .replace('<h2>基础词</h2>', '<h2>0.1 初始72词（版本对照）</h2>')
  .replace('<h2>60句原创试行表达</h2>', '<h2>0.1 原创60句（保留旧义）</h2><p class="muted">本节仍按初始版本解读：旧句中的 milk 指牛奶；新版特指牛奶时改用 cattlemilk。</p>');
fs.writeFileSync(path.join(root, 'public', 'index.html'), current, 'utf8');
console.log('Built public/index.html using versioned project lexicons and original sentences. Only original project data is built.');

const categoryMetrics=[
  ['市场规模','可服务买家与需求发生量'],
  ['实际成交','同类商品的订单与成交额'],
  ['头部空间','独立头部卖家的经营表现'],
  ['增长趋势','同口径订单与新卖家变化'],
  ['竞争剩余机会','差异化与自助替代'],
  ['获客可达','目标买家发现、咨询和成交路径'],
  ['单位经济性','实收减去制作、返工与获客成本'],
  ['长期需求','是否持续产生新的买家'],
];
const categoryBundles=[
  ['婚恋 AI 定制',['02-01','02-02','02-03']],
  ['宠物个性化内容',['04-01','04-02']],
  ['儿童个性化内容',['04-03','04-05']],
  ['商家 AI 商品内容',['06-01','06-02','06-03','06-04']],
  ['节庆与人生节点',['03-01','03-02','03-03','03-05']],
  ['本地小店营销内容',['22-02']],
];
let categoryActiveZone='all';
const categoryAuditById=Object.fromEntries((window.CATEGORY_AUDIT_101?.audits||[]).map(x=>[x.categoryId,x]));

function verifiedCategoryScores(categoryId){
  const rows=(window.CATEGORY_OBSERVATIONS||[]).filter(x=>x['类目ID']===categoryId&&x['核验状态']==='已核实');
  const result={};
  for(const [name] of categoryMetrics){
    const matches=rows.filter(x=>x['指标']===name);
    if(matches.length!==1)continue;
    const x=matches[0];
    if(x['评分0到5']==='')continue;
    const score=Number(x['评分0到5']);
    if(!Number.isInteger(score)||score<0||score>5)continue;
    if(!x['原始观测']||!x['统计起日']||!x['统计止日']||!x['核验日期']||!x['评分规则ID']||!x['复核人']||!/^https?:\/\//.test(x['来源URL']||''))continue;
    if(!window.CATEGORY_RUBRICS?.[x['评分规则ID']]?.metrics?.[name])continue;
    result[name]=x;
  }
  return result;
}
function categoryQualified(scores){
  return Object.keys(scores).length>=6&&['实际成交','获客可达','单位经济性'].every(x=>scores[x]);
}
function categoryPosition(categoryId,xMetric,yMetric){
  const scores=verifiedCategoryScores(categoryId);
  if(!categoryQualified(scores)||!scores[xMetric]||!scores[yMetric])return null;
  const x=Number(scores[xMetric]['评分0到5'])>=4?'H':'L';
  const y=Number(scores[yMetric]['评分0到5'])>=4?'H':'L';
  return y+x;
}
function categorySources(c){
  return [...category013.sources,...(window.CATEGORY_FOLLOWUP?.sources||[])].filter(s=>(s['关联细分类目']||'').split('/').includes(c['细分类目']));
}
function openCategoryProfile(c){
  if(!c)return;
  const scores=verifiedCategoryScores(c['中类ID']);
  const sources=categorySources(c);
  const audit=categoryAuditById[c['中类ID']];
  const children=category013.products.filter(x=>x.categoryId===c['中类ID']).map(x=>items.find(y=>y.id===x.id)).filter(Boolean);
  const metricCards=categoryMetrics.map(([name,meaning])=>{
    const row=scores[name];
    return `<div class="category-metric"><span>${esc(name)}</span><strong>${row?esc(row['评分0到5'])+' / 5':'待核实'}</strong><small>${esc(meaning)}</small>${row?`<a href="${esc(row['来源URL'])}" target="_blank" rel="noopener">原始证据 ↗</a>`:''}</div>`;
  }).join('');
  const sourceCards=sources.map(s=>`<div class="category-source"><span>${esc(s['证据ID'])} · ${esc(s['证据类型'])}${s['原帖时间']||s['公开时间']?' · '+esc(s['原帖时间']||s['公开时间']):''}</span><a href="${esc(s['来源URL'])}" target="_blank" rel="noopener">${esc(s['可确认的内容'])} ↗</a><small>限制：${esc(s['明确限制'])}</small></div>`).join('');
  const auditCard=audit?`<div class="category-audit grade-${esc(audit.evidenceGrade)}"><div><b>${esc(audit.evidenceGrade)}</b><span>${esc(audit.evidenceLabel)} · ${esc(audit.checkedAt)}</span></div>${audit.representative?`<a href="${esc(audit.representative.url)}" target="_blank" rel="noopener">${esc(audit.representative.title)} ↗</a><p>${esc(audit.representative.summary)}</p>`:''}<small>检索：${esc(audit.query)}。限制：${esc(audit.limitation)}</small><details><summary>查看本类前 ${audit.topResults.length} 条结果</summary>${audit.topResults.map(x=>`<a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.title)} <i>${esc(x.date||'')}</i></a>`).join('')}</details></div>`:'<p class="category-empty">尚无全量公开调查记录。</p>';
  const childCards=children.map(x=>{
    const r=screening012.products[x.id];
    return `<button class="category-child" data-product-id="${esc(x.id)}"><strong>${esc(x.name)}</strong><span>${esc(r?.eligibility||'待核')} · ${esc(r?.buyer||'买家待拆')}</span></button>`;
  }).join('');
  detail(`013 · ${c['中类ID']} · ${c['调研顺序']}`,c['细分类目'],
    `<div class="category-profile-lead"><strong>${esc(c['具体项目数'])} 项具体商品 · ${esc(c['C轻B初筛适配'])} 项符合012规则初筛</strong><span>${esc(c['调研理由'])}</span><small>资格数量是商品初筛，不是类目成交或市场份额。</small></div>`+
    `<div class="category-profile-heading"><strong>全量公开调查</strong><span>${audit?esc(audit.evidenceGrade+' · '+audit.evidenceLabel):'未完成'}</span></div>${auditCard}`+
    `<div class="category-profile-heading"><strong>八项经营指标</strong><span>${Object.keys(scores).length} / 8 已核实</span></div><div class="category-metrics">${metricCards}</div>`+
    `<div class="category-profile-heading"><strong>公开线索与反证</strong><span>${sources.length} 条 · 不计作订单</span></div>${sourceCards||'<p class="category-empty">本批没有能直接关联这个类目的新来源；旧商品来源可在项目详情查看。</p>'}`+
    `<div class="category-profile-heading"><strong>商品组合</strong><span>点击直接看项目</span></div><div class="category-children">${childCards}</div>`);
  $('#detail-layer').classList.add('is-category');
  document.querySelectorAll('.category-child').forEach(b=>b.onclick=()=>{
    const item=items.find(x=>x.id===b.dataset.productId);if(!item)return;
    openProduct(item);
    const back=document.createElement('button');back.className='quad-back';back.textContent='← 返回类目档案';back.onclick=()=>openCategoryProfile(c);
    $('#detail-body').prepend(back);
  });
}
function openCategoryBundle(bundle){
  const [label,ids]=bundle,cs=ids.map(id=>categoryById[id]).filter(Boolean);
  const productCount=cs.reduce((n,c)=>n+c['具体项目数'],0);
  detail('经营方向组合 · 示意，未排名',label,
    `<div class="category-profile-lead"><strong>${cs.length} 个研究类目 · ${productCount} 项商品</strong><span>这是可组合经营的方向示例，不是已经证明可行的业务。</span><small>跨类目卖家、订单和成交额需要按主成交类目去重。</small></div>`+
    `<div class="category-children">${cs.map(c=>`<button class="category-child" data-category-id="${esc(c['中类ID'])}"><strong>${esc(c['细分类目'])}</strong><span>${esc(c['具体项目数'])} 项商品 · ${esc(c['调研顺序'])}</span></button>`).join('')}</div>`);
  $('#detail-layer').classList.add('is-category');
  document.querySelectorAll('.category-child').forEach(b=>b.onclick=()=>openCategoryProfile(categoryById[b.dataset.categoryId]));
}
function openCategoryMethod(){
  detail('013 · 正式比较门槛','评分与证据如何进入象限',
    `<p class="method-intro">101个类目均已完成公开平台首轮调查。B／C／D／E只表示本轮找到的最高公开线索类型，坐标只展示达到正式证据门槛的结果。</p>`+
    `<div class="fact">首轮分级：B 明确买方委托但未付款；C 未经审计的购买或经营自述；D 接单或挂牌供给；E 案例、教程、模板或相邻线索。它们都不会自动转换为0–5分。</div>`+
    `<div class="category-metrics">${categoryMetrics.map(([n,d])=>`<div class="category-metric"><span>${esc(n)}</span><small>${esc(d)}</small></div>`).join('')}</div>`+
    `<div class="fact">正式定位至少需要 6 / 8 项可追溯评分，其中必须有实际成交、获客可达和单位经济性；所选两轴也须已核实。每项要记录原始观测、统计周期、来源和核验日期。Q1次数只作辅助，不作为自动排名。</div>`+
    `<p class="mini">0–5分的逐指标阈值尚未批准，当前没有启用任何评分规则。013 Excel 的单图公式可能在仅填两个分数时显示 Q1；本网页采用完整比较门槛。市场、类目、商品不继承彼此的销售额或评分。</p>`);
  $('#detail-layer').classList.add('is-category');
}
function renderCategoryBoard(){
  const level=$('#category-level').value,xMetric=$('#category-axis-x').value,yMetric=$('#category-axis-y').value;
  const marketFilter=$('#category-market-filter').value,priorityFilter=level==='category'?$('#category-priority-filter').value:'all';
  const term=$('#category-search').value.trim().toLowerCase();
  let rows=[];
  if(level==='category')rows=category013.categories.map(c=>({id:c['中类ID'],name:c['细分类目'],market:c['一级市场'],priority:c['调研顺序'],count:c['具体项目数'],category:c}));
  if(level==='market')rows=category013.markets.map(m=>({id:m.market_id,name:m['一级市场'],market:m['一级市场'],count:m['细分方向数'],marketRow:m}));
  if(level==='product')rows=category013.products.map(p=>{
    const item=items.find(x=>x.id===p.id),c=categoryById[p.categoryId];
    return {id:p.id,name:item?.name||p.id,market:c['一级市场'],priority:c['调研顺序'],count:0,item};
  });
  const prioritySelect=$('#category-priority-filter');
  if(level!=='category')prioritySelect.value='all';
  prioritySelect.disabled=level!=='category';
  const positions=rows.map(r=>level==='category'?categoryPosition(r.id,xMetric,yMetric):null);
  const positioned=positions.filter(Boolean).length;
  const qualified=level==='category'?rows.filter(r=>categoryQualified(verifiedCategoryScores(r.id))).length:0;
  if($('#category-audited'))$('#category-audited').textContent=`${window.CATEGORY_AUDIT_101?.auditedCount||0} / ${window.CATEGORY_AUDIT_101?.categoryCount||101}`;
  $('#category-ready').textContent=`${qualified} / ${rows.length}`;
  $('#category-pool-title').textContent=`${rows.length-positioned} 个${{category:'类目',market:'市场',product:'商品'}[level]}未进入当前坐标`;
  $('#category-pool-sub').textContent=level==='category'?'全部101类参与研究；筛选只改变查看范围':'跨层不继承分数；此层尚无独立的正式评分';
  $('#category-matrix-empty').textContent=positioned?'点击象限查看已定位的类目':'尚无达到正式比较门槛的'+{category:'类目',market:'市场',product:'商品'}[level];
  $('#category-matrix-empty').hidden=positioned>0;
  for(const cell of document.querySelectorAll('#category-matrix button[data-zone]')){
    const n=positions.filter(q=>q===cell.dataset.zone).length;
    cell.querySelector('strong').textContent=n;
    cell.classList.toggle('has-data',n>0);
    cell.classList.toggle('selected',categoryActiveZone===cell.dataset.zone);
  }
  const filtered=rows.filter((r,i)=>
    (marketFilter==='all'||r.market===marketFilter)&&
    (priorityFilter==='all'||r.priority===priorityFilter)&&
    (!term||(r.name+' '+r.market+' '+r.id+(r.category?' '+category013.products.filter(p=>p.categoryId===r.id).map(p=>items.find(x=>x.id===p.id)?.name).join(' '):'')).toLowerCase().includes(term))&&
    (categoryActiveZone==='all'||positions[i]===categoryActiveZone)
  );
  const list=$('#category-pool-list');list.replaceChildren();
  for(const r of filtered){
    const button=document.createElement('button');button.className='category-pool-card';
    const audit=level==='category'?categoryAuditById[r.id]:null;
    const caption=level==='category'?`${r.count} 项商品 · ${audit?audit.evidenceGrade+'类线索':'未调查'}`:level==='market'?`${r.count} 个类目`:`${r.id} · ${r.market}`;
    button.innerHTML=`<span>${esc(r.id)}</span><strong>${esc(r.name)}</strong><small>${esc(caption)}</small><i>→</i>`;
    button.onclick=()=>level==='category'?openCategoryProfile(r.category):level==='market'?path(markets.find(m=>marketLabel(m)===r.market)):r.item&&openProduct(r.item);
    list.append(button);
  }
  if(!filtered.length){const empty=document.createElement('div');empty.className='category-empty';empty.textContent=categoryActiveZone!=='all'?'这一格暂无达到正式门槛的项目。点击同一象限返回全部研究池。':'没有符合当前筛选的项目。';list.append(empty)}
}

for(const id of ['#category-axis-x','#category-axis-y']){
  const select=$(id);categoryMetrics.forEach(([name])=>select.add(new Option(name,name)));
  select.value=id.endsWith('-x')?'实际成交':'市场规模';
  select.onchange=renderCategoryBoard;
}
const marketFilter=$('#category-market-filter');marketFilter.add(new Option('全部市场','all'));
category013.markets.forEach(m=>marketFilter.add(new Option(m['一级市场'],m['一级市场'])));
['#category-level','#category-market-filter','#category-priority-filter','#category-search'].forEach(id=>$(id).addEventListener(id==='#category-search'?'input':'change',()=>{categoryActiveZone='all';renderCategoryBoard()}));
document.querySelectorAll('#category-matrix button[data-zone]').forEach(b=>b.onclick=()=>{categoryActiveZone=categoryActiveZone===b.dataset.zone?'all':b.dataset.zone;renderCategoryBoard()});
$('#category-method').onclick=openCategoryMethod;
const bundleList=$('#category-bundle-list');
categoryBundles.forEach(bundle=>{const b=document.createElement('button');b.textContent=bundle[0]+' ↗';b.onclick=()=>openCategoryBundle(bundle);bundleList.append(b)});
const testQueue=$('#test-queue-list');
Object.entries(screening012.tests).forEach(([id,test])=>{
  const item=items.find(x=>x.id===id),category=categoryById[id.slice(0,5)];
  if(!item||!category)return;
  const button=document.createElement('button');button.className='test-queue-card';
  button.innerHTML=`<span>${esc(category['细分类目'])} · 四天待测</span><strong>${esc(item.name)}</strong><small>${esc(test['固定样单'])}</small><i>查看方案 ↗</i>`;
  button.onclick=()=>openProduct(item);
  testQueue.append(button);
});
$('#test-method').onclick=()=>{
  detail('012 → 013 · 实验记录','四天测试如何更新类目判断',
    '<p>每个样单固定买家、规格、报价与渠道；逐日记录曝光、有效询价 Q、接受报价的意向 I、实际付款、制作工时和总成本。</p><div class="fact">Q：明确用途、期限与交付范围，并主动询问价格或下单方式。I：接受某一具体报价且愿下单。口头兴趣、意向金和完整付款分别记录。</div><p>商品测试结果先写回商品档案；同一订单按主成交类目归属，再判断能否支持类目级经营结论。四天无 Q 只能说明当前样片、渠道、报价组合尚未取得咨询，不能推断整个类目没有需求。</p>');
  $('#detail-layer').classList.add('is-category');
};

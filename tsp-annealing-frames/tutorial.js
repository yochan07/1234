(() => {
  'use strict';
  const M=window.SATutorial, $=id=>document.getElementById(id);
  const state={part:1,indices:{1:0,2:0},probe:160};
  const sceneLists={1:M.scenes(1),2:M.scenes(2)};
  const colors={current:'#4c7eab',candidate:'#7b68b0',selected:'#d9943e',improved:'#2b895d','worse-accepted':'#d08c3a',rejected:'#c76459',shared:'#acbda8'};
  let selectionTimer=null,selectionInterval=null,renderVersion=0,metalT=0;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const fmt=n=>n.toLocaleString('ko-KR',{minimumFractionDigits:1,maximumFractionDigits:1});
  const percent=p=>p<=0?'0%':p>=1?'100%':p<.00001?'< 0.001%':p>.99999?'> 99.999%':`${(p*100).toFixed(p<.001?3:1)}%`;
  const key=(a,b)=>a<b?`${a}-${b}`:`${b}-${a}`;
  const edges=route=>route.map((id,i)=>({a:id,b:route[(i+1)%route.length],key:key(id,route[(i+1)%route.length])}));
  const short=id=>M.places[id].short;
  function currentScene(){return sceneLists[state.part][state.indices[state.part]];}
  function currentRound(scene){return scene.round===undefined?null:(state.part===1?M.part1:M.part2)[scene.round];}
  function cancelSelection(){clearTimeout(selectionTimer);clearInterval(selectionInterval);selectionTimer=null;selectionInterval=null;}
  function svgLine(a,b,color,width=3,dash='',extra=''){
    const p=M.point(a),q=M.point(b);
    return `<path class="path-line ${extra}" d="M${p.x},${p.y} L${q.x},${q.y}" stroke="${color}" stroke-width="${width}" ${dash?`stroke-dasharray="${dash}"`:''}/>`;
  }
  function legend(items){$('mapLegend').innerHTML=items.map(([color,text,dashed])=>`<span class="legend-item"><i class="legend-line ${dashed?'dashed':''}" style="border-color:${color}"></i>${text}</span>`).join('');}
  function renderMap(scene,round,temporary=null){
    const svg=$('campusMap');
    svg.setAttribute('viewBox',innerWidth<=780?'100 0 560 620':'0 0 740 620');
    let route=round?round.before:(state.part===1?M.initial:M.part1.at(-1).after);
    if(scene.kind==='part1-summary')route=M.part1.at(-1).after;
    if(['analogy','part2-summary'].includes(scene.kind))route=M.part2.at(-1).after;
    let paths='',items=[],highlights=[];
    const selectedKinds=['pick','reverse','compare','probability','decision'];
    const compared=round&&['reverse','compare','probability','decision'].includes(scene.kind);
    const numberedRoute=round?(scene.kind==='decision'?round.after:compared?round.candidate:round.before):route;
    const numberingLabel=round?(scene.kind==='decision'?'판정 후 경로':compared?'후보 경로 B':'현재 경로 A'):'현재 경로';
    $('visitOrderNote').textContent=`점 안의 숫자 1~${M.places.length}은 ${numberingLabel}의 방문 순서입니다. 출발점 1로 돌아오면 한 바퀴가 끝납니다.`;
    if(scene.kind!=='intro'){
      if(compared){
        const before=edges(round.before),candidate=edges(round.candidate);
        const beforeKeys=new Set(before.map(e=>e.key)),candidateKeys=new Set(candidate.map(e=>e.key));
        const isResult=scene.kind==='decision',color=isResult?colors[round.outcome]:colors.candidate;
        before.filter(e=>candidateKeys.has(e.key)).forEach(e=>paths+=svgLine(e.a,e.b,colors.shared,2.5));
        before.filter(e=>!candidateKeys.has(e.key)).forEach(e=>paths+=svgLine(e.a,e.b,colors.current,3.2,'7 6'));
        candidate.filter(e=>!beforeKeys.has(e.key)).forEach(e=>paths+=svgLine(e.a,e.b,color,4,isResult&&round.outcome==='rejected'?'6 6':'',isResult?'':'new-connection'));
        items=[[colors.shared,'공통 구간'],[colors.current,'기존 연결',true],[color,isResult?(round.outcome==='rejected'?'기각한 후보 연결':round.outcome==='worse-accepted'?'더 길지만 채택한 연결':'채택한 연결'):'후보의 새로운 연결',isResult&&round.outcome==='rejected']];
      }else{
        edges(route).forEach(e=>paths+=svgLine(e.a,e.b,colors.current,2.8));
        items=[[colors.current,'현재 방문 경로']];
      }
    }
    if(round&&selectedKinds.includes(scene.kind)){
      highlights=temporary||round.selected;
      if(scene.kind==='pick'&&!temporary){for(let i=round.a;i<round.b;i++)paths+=svgLine(round.before[i],round.before[i+1],colors.selected,5);items.push([colors.selected,'뒤집을 구간']);}
    }
    svg.classList.toggle('selecting',scene.kind==='pick');
    const labels=M.places.map((place,id)=>{
      const p=M.point(id),[lx,ly,anchor]=place.label,leadX=anchor==='end'?lx+9:lx-9;
      return `<path class="location-leader" d="M${p.x},${p.y} L${leadX},${ly-4}"/><text class="location-label" x="${lx}" y="${ly}" text-anchor="${anchor}">${place.name}</text>`;
    }).join('');
    const dots=M.places.map((place,id)=>{
      const p=M.point(id),chosen=highlights.includes(id),start=id===numberedRoute[0],visitNumber=numberedRoute.indexOf(id)+1;
      return `<g data-place="${id}" aria-label="${place.name}, ${visitNumber}번째 방문">${chosen?`<circle class="chosen-ring" cx="${p.x}" cy="${p.y}" r="18"/>`:''}<circle class="place-dot" cx="${p.x}" cy="${p.y}" r="11" fill="${chosen?colors.selected:start?'#c48f48':'#32634c'}"/><text class="place-number" x="${p.x}" y="${p.y}">${visitNumber}</text></g>`;
    }).join('');
    svg.innerHTML=`<title>식당 ${M.places.length}곳의 상대 배치와 ${numberingLabel}의 방문 순서</title><path class="campus-shape" d="M345 34 Q295 45 291 111 L288 227 Q228 298 240 365 Q294 410 285 464 L285 552 Q300 585 333 570 Q365 548 364 486 L405 372 Q440 307 478 234 L483 155 Q438 101 410 52 Z"/><path class="campus-road" d="M343 49 Q366 169 355 242 Q320 310 322 399 Q326 487 315 552"/>${paths}${labels}${dots}`;
    legend(items.length?items:[[colors.shared,`사진의 상대 위치를 옮긴 식당 ${M.places.length}곳`]]);
  }
  function orderRow(label,order,round,reversed=false,selected=true){
    return `<div class="order-row"><span class="order-label">${label}</span>${[...order,order[0]].map((id,i)=>`${i?'<span class="order-arrow">→</span>':''}<span class="place-chip ${selected&&round&&i>=round.a&&i<=round.b?(reversed?'reversed':'selected'):''}"><b class="chip-number">${i%order.length+1}</b>${short(id)}</span>`).join('')}</div>`;
  }
  function renderOrder(scene,round){
    if(round){const showingCandidate=['reverse','compare','probability','decision'].includes(scene.kind);$('routeOrder').innerHTML=orderRow('현재',round.before,round,false,scene.kind!=='decision')+(showingCandidate?orderRow('후보',round.candidate,round,true):'')+(scene.kind==='decision'?orderRow('결과',round.after,round,false,false):'');}
    else{const route=scene.kind==='part1-summary'?M.part1.at(-1).after:['analogy','part2-summary'].includes(scene.kind)?M.part2.at(-1).after:state.part===1?M.initial:M.part1.at(-1).after;$('routeOrder').innerHTML=orderRow(scene.kind==='intro'?'방문할 곳':'순서',route,null);}
  }
  function renderMetrics(round){
    $('distanceMetrics').hidden=false;
    $('distanceMetrics').innerHTML=`<div class="metric"><span>현재 경로 A</span><strong>${fmt(round.beforeLength)}</strong><small>도식 거리</small></div><div class="metric"><span>후보 경로 B</span><strong>${fmt(round.candidateLength)}</strong><small>도식 거리</small></div><div class="metric delta"><span>Δ = 후보 − 현재</span><strong style="color:${round.delta>0?colors.rejected:colors.improved}">${round.delta>0?'+':''}${fmt(round.delta)} · ${round.delta>0?'더 깁니다':'더 짧습니다'}</strong></div>`;
  }
  function probabilityMarkup(p,detail){
    const yes=percent(p).replace('<','&lt;'),no=percent(1-p).replace('<','&lt;');
    return `<div class="probability-heading"><span>이번 후보의 채택·기각 확률</span></div><div class="probability-gate" role="img" aria-label="채택 ${percent(p)}, 기각 ${percent(1-p)}"><i class="probability-yes" style="width:${p*100}%"></i><i class="probability-no" style="width:${(1-p)*100}%"></i></div><div class="probability-labels"><span class="yes-label">● 채택 <strong>${yes}</strong></span><span class="no-label">● 기각 <strong>${no}</strong></span></div><p class="probability-detail">${detail}</p>`;
  }
  function showProbability(round,decision=false){
    $('probabilityVisual').hidden=false;
    const improved=round.delta<=0;
    const detail=improved?'짧은 후보는 온도와 관계없이 채택 확률 100%, 기각 확률 0%입니다.':`채택 확률 = exp(−${fmt(round.delta)} / ${round.temperature.toFixed(2)})<br>기각 확률 = 1 − 채택 확률<br>${decision?(round.outcome==='worse-accepted'?'이번 예시에서는 긴 후보를 채택했습니다.':'이번 예시에서는 긴 후보를 기각했습니다.'):'파란색이 클수록 채택될 가능성이, 빨간색이 클수록 기각될 가능성이 높습니다.'} 확률에 따른 실제 선택은 무작위입니다.`;
    $('probabilityVisual').innerHTML=probabilityMarkup(round.probability,detail);
  }
  function temperatureChart(t){
    const values=Array.from({length:8},(_,i)=>160*Math.pow(.65,i));
    const x=i=>36+i/7*345,y=T=>120-T/160*101;
    const path=values.map((T,i)=>`${i?'L':'M'}${x(i)},${y(T)}`).join(' '),T=160*Math.pow(.65,t);
    $('temperatureChart').innerHTML=`<path d="M36 17 V120 H384" stroke="#ccd9c5" fill="none"/><path d="${path}" fill="none" stroke="#cb955d" stroke-width="2.5"/><circle cx="${x(t)}" cy="${y(T)}" r="5" fill="#b77338" stroke="white" stroke-width="2"/><g fill="#8d9c84" font-size="10" font-family="system-ui"><text x="4" y="22">160</text><text x="17" y="123">0</text><text x="32" y="142">0</text><text x="372" y="142">7 → t</text><text x="${Math.min(315,x(t)+8)}" y="${Math.max(16,y(T)-9)}">t = ${t.toFixed(t%1?1:0)}</text></g>`;
    $('temperatureValue').textContent=`T = ${T.toFixed(2)}`;
    const referenceDelta=M.referenceDelta;
    $('coolingProbabilityHistory').innerHTML=`<p class="history-title">같은 길이 증가 Δ=${referenceDelta}인 긴 후보라면</p>${[0,1,2,7].map(time=>{const probability=Math.exp(-referenceDelta/(160*Math.pow(.65,time)));return `<div class="history-row ${Math.abs(time-t)<.05?'active':''}"><span>t=${time}</span><div class="history-track" role="img" aria-label="t=${time}, 채택 ${percent(probability)}, 기각 ${percent(1-probability)}"><i style="width:${probability*100}%"></i><b style="width:${(1-probability)*100}%"></b></div><span>${percent(probability).replace('<','&lt;')}</span></div>`;}).join('')}<p class="tiny">파랑: 채택 · 빨강: 기각 · 오른쪽 숫자: 채택 확률</p>`;
    metalT=Math.max(0,Math.min(7,t));
    $('metalPhase').textContent=t<2?'고온 · 활발한 운동':t<5?'냉각 · 정렬하는 중':'저온 · 규칙적인 배열';
  }
  function notice(html,type=''){const el=$('selectionNotice');el.hidden=false;el.innerHTML=html;el.className=`selection-notice ${type}`;}
  function renderIntro(scene){
    const kind=scene.kind;$('roundCount').textContent='';
    if(kind==='intro'){
      $('stagePill').textContent='01 · 문제 살펴보기';$('coachTitle').textContent='식당 9곳을 한 번씩 방문한다면?';
      $('coachCopy').innerHTML='<p>수의대부터 301동까지, 식당 9곳을 모두 들른 뒤 출발점으로 돌아오려고 합니다.</p><p>점 안의 숫자는 건물 번호가 아니라 <strong>방문 순서</strong>입니다. 1번에서 시작해 9번까지 방문하고, 다시 1번으로 돌아옵니다.</p><p>우리가 찾는 것은 <strong>모두 방문하는 짧은 순환 경로</strong>입니다. 이것이 외판원 문제입니다.</p>';
      notice('먼저 점의 위치를 살펴보세요. 다음 장면에서 임의의 방문 순서를 하나 연결합니다.');
    }else if(kind==='route-intro'){
      $('stagePill').textContent='01 · 출발할 경로';$('coachTitle').textContent='일단 임의의 순서로 연결해 봅니다.';
      $('coachCopy').innerHTML='<p>처음부터 가장 짧은 순서를 알아내기는 어렵습니다. 그래서 시작 경로 A를 임의로 정한 뒤 조금씩 바꾸어 봅니다.</p><p>이제 <strong>현재 순서에서 두 위치를 무작위로 뽑고, 그 사이 순서를 뒤집는 방법</strong>을 네 번 따라가겠습니다.</p>';
      notice('1부에서는 후보 만드는 법에 집중합니다. 더 짧으면 채택하고, 더 길면 기각하는 규칙부터 연습합니다.');
    }else if(kind==='temperature-intro'){
      $('stagePill').textContent='02 · 온도 함수';$('coachTitle').textContent='더 긴 경로도 받아들인다면?';
      $('coachCopy').innerHTML='<p>계속 짧아지는 방향만 고집하면, 한 번 길어져야 더 좋은 순서로 넘어갈 수 있는 곳에서 탐색이 멈출 수 있습니다.</p><p>담금질은 <strong>온도가 높을 때 더 긴 후보도 확률적으로 받아들여</strong> 탐색 범위를 넓힙니다. t가 커지면 온도를 낮춥니다.</p>';
      $('extraContent').innerHTML='<div class="formula">T(t) = 160 × 0.65<sup>t</sup></div><p class="key-line">다음 네 장면은 t=0, 1, 2, 7의 상황입니다. 마지막은 충분히 시간이 흘러 온도가 낮아진 시점으로 넘어갑니다.</p><div class="outcome-list"><div><b>1</b>짧은 후보를 채택</div><div><b>2</b>온도가 높아 긴 후보도 채택</div><div><b>3</b>바뀐 순서에서 더 짧은 후보를 채택</div><div><b>4</b>시간이 흘러 긴 후보를 기각</div></div>';
    }else if(kind==='probability-intro'){
      $('stagePill').textContent='02 · 채택 확률';$('coachTitle').textContent='온도만 바꾸면 확률은 어떻게 달라질까요?';
      $('coachCopy').innerHTML='<p>긴 후보의 거리 증가량을 Δ라고 하면, <strong>채택 확률 = exp(−Δ / T)</strong>, <strong>기각 확률 = 1 − 채택 확률</strong>입니다.</p><p>막대 전체가 100%입니다. <strong>파란색은 채택 확률, 빨간색은 기각 확률</strong>을 나타냅니다. 아래 온도를 낮춰 두 색의 비율을 비교해 보세요.</p>';
      $('extraContent').innerHTML='<label class="probe-label" for="temperatureProbe">온도 직접 바꾸기 <output id="probeOutput">160</output></label><input id="temperatureProbe" class="probe-slider" type="range" min="8" max="160" value="160"><p class="key-line">같은 Δ라면 온도가 낮을수록 p가 작아집니다. 실제 탐색에서는 Δ도 매번 달라집니다.</p>';
      const update=()=>{state.probe=+$('temperatureProbe').value;$('probeOutput').textContent=state.probe;const p=Math.exp(-M.referenceDelta/state.probe);$('probabilityVisual').hidden=false;$('probabilityVisual').innerHTML=probabilityMarkup(p,'길이 증가량 Δ=40을 고정했습니다. 온도가 낮아질수록 파란색이 줄고 빨간색이 늘어납니다. 같은 확률에서도 실제 채택 여부는 무작위로 달라질 수 있습니다.');temperatureChart(Math.min(7,Math.log(state.probe/160)/Math.log(.65)));};
      $('temperatureProbe').value=state.probe;$('temperatureProbe').addEventListener('input',update);update();
    }else if(kind==='part1-summary'){
      $('stagePill').textContent='01 · 배운 내용';$('coachTitle').textContent='후보 만들기와 선택은 별개의 일입니다.';
      $('coachCopy').innerHTML='<p><strong>두 위치를 무작위로 뽑는 순간에는 후보가 좋아질지 모릅니다.</strong> 뒤집어 본 다음 전체 길이를 계산해서 판단합니다.</p><p>후보를 채택하면 B가 새 현재 경로가 됩니다. 기각하면 A에서 다음 후보를 만듭니다.</p>';
      $('extraContent').innerHTML='<div class="outcome-list"><div><b>① 추출</b>방문 순서의 두 위치를 뽑기</div><div><b>② 뒤집기</b>두 위치 사이 구간 전체를 역순으로</div><div><b>③ 판단</b>거리 비교 후 현재 경로 갱신 또는 유지</div></div>';
    }else if(kind==='analogy'){
      $('stagePill').textContent='02 · 담금질의 비유';$('coachTitle').textContent='이 과정이 담금질 알고리즘, SA입니다.';
      $('coachCopy').innerHTML='<p>금속을 가열하면 원자들이 활발하게 움직입니다. 천천히 냉각하면 더 안정적인 배열을 이루는 과정을 조합 최적화에 빗댄 것이 <strong>모의 담금질(Simulated Annealing)</strong>입니다.</p>';
      $('extraContent').innerHTML='<div class="analogy-grid"><div><strong>금속에서</strong>원자의 배열<br>배열의 에너지<br>온도와 냉각</div><div><strong>경로 탐색에서</strong>식당의 방문 순서<br>전체 경로 길이<br>긴 후보의 채택 확률</div></div><p class="key-line">원자 그림은 원리 설명용입니다. 결정이 정돈되는 모습이 수학적인 최적해의 발견을 보장하지는 않습니다. T는 실제 섭씨 온도가 아닙니다.</p><p class="source-note">개념의 출처: <a href="https://doi.org/10.1126/science.220.4598.671" target="_blank" rel="noopener">Kirkpatrick 외, 1983 ↗</a></p>';
    }else{
      $('stagePill').textContent='02 · 이제 직접';$('coachTitle').textContent='다음은 여러분의 실험입니다.';
      $('coachCopy').innerHTML='<p><strong>짧은 후보 채택 → 긴 후보도 채택 → 새로운 배열에서 더 짧은 후보 채택 → 저온에서 긴 후보 기각</strong>의 네 장면을 확인했습니다.</p><p>고온에서 잠시 긴 경로를 받아들여 탐색 범위를 넓히고, 시간이 지나면 긴 경로를 채택할 가능성을 줄이는 것이 핵심입니다.</p><p>3부에서는 <strong>도시 수, 온도, 냉각률</strong>을 직접 바꿔 실험해 보세요.</p>';
      notice('초기 온도를 높이면 어떤 일이 생길까요? 냉각을 천천히 하면 최선의 경로는 얼마나 달라질까요?','is-result');
    }
  }
  function renderRound(scene,round){
    const kind=scene.kind,pickNames=round.selected.map(id=>M.places[id].name);
    $('roundCount').textContent=`예시 ${scene.round+1} / ${(state.part===1?M.part1:M.part2).length}${state.part===2?` · t=${round.t}`:''}`;
    if(kind==='pick'){
      $('stagePill').textContent='① 두 위치 추출';$('coachTitle').textContent='이번에는 어느 구간을 뒤집을까요?';
      $('coachCopy').innerHTML='<p>현재 방문 순서에서 출발점을 제외한 <strong>서로 다른 두 위치</strong>를 무작위로 고릅니다. 점의 위치는 움직이지 않습니다.</p><p>이웃한 자리 두 개만 맞바꾸는 방법이 아닙니다. 뽑힌 두 위치 사이의 방문 순서 전체가 바뀝니다.</p>';
      notice(`<strong>${pickNames[0]}</strong>과 <strong>${pickNames[1]}</strong>의 방문 위치가 추출됐습니다. 노란 구간이 뒤집을 부분입니다.`);
    }else if(kind==='reverse'){
      $('stagePill').textContent='② 구간 뒤집기';$('coachTitle').textContent='중간의 방문 순서를 통째로 뒤집습니다.';
      $('coachCopy').innerHTML=`<p><strong>${pickNames[0]}</strong>에서 <strong>${pickNames[1]}</strong>까지의 방문 순서를 역순으로 바꿨습니다.</p><p>보라색은 후보 B에 새로 생긴 연결, 파란 점선은 기존 연결입니다. 나머지 공통 구간은 옅게 표시합니다.</p>`;
      notice('아래 순서표에서 노란 구간과 보라 구간을 비교해 보세요. 아직 채택 여부를 정한 것은 아닙니다.');
    }else if(kind==='compare'){
      $('stagePill').textContent='③ 길이 비교';$('coachTitle').textContent='후보가 정말 짧아졌을까요?';
      $('coachCopy').innerHTML='<p>현재 경로 A와 후보 B의 전체 길이를 계산합니다. 마지막 식당에서 출발 식당으로 돌아오는 구간도 포함합니다.</p><p><strong>Δ = 후보 길이 − 현재 길이</strong>이므로, Δ가 음수면 짧아지고 양수면 길어집니다.</p>';
      renderMetrics(round);notice('1부의 연습 규칙: 더 짧은 후보는 채택하고, 더 긴 후보는 기각합니다.');
    }else if(kind==='probability'){
      $('stagePill').textContent='③ 확률 확인';$('coachTitle').textContent=round.delta<=0?'짧은 후보는 파란색이 100%입니다.':scene.round===1?'온도가 높아 채택 확률이 높습니다.':'시간이 흘러 기각 확률이 높아졌습니다.';
      $('coachCopy').innerHTML=round.delta<=0?'<p>온도에 관계없이 더 짧은 후보는 항상 채택합니다. 막대는 <strong>파란색 100%, 빨간색 0%</strong>입니다.</p>':`<p>${scene.round===3?'충분히 시간이 흐른 t=7의 상황입니다. ':''}현재 온도는 <strong>T = ${round.temperature.toFixed(2)}</strong>입니다. 거리 증가량 Δ와 이 온도로 채택·기각 확률을 계산합니다.</p><p>${scene.round===1?'이번 후보는 증가한 길이가 작고 온도도 높아, 파란색 채택 비율이 큽니다.':'온도가 낮아져 파란색 채택 비율은 매우 작고, 빨간색 기각 비율이 큽니다.'} 실제 선택은 이 확률에 따라 무작위로 이뤄집니다.</p>`;
      renderMetrics(round);showProbability(round,false);
    }else{
      $('stagePill').textContent='④ 채택 또는 기각';const result=round.outcome;
      $('coachTitle').textContent=result==='improved'?'더 짧아졌습니다. 채택합니다.':result==='worse-accepted'?'더 길지만 이번에는 채택합니다.':'이 후보는 기각합니다.';
      $('coachCopy').innerHTML=result==='improved'?`<p>후보가 <strong>${fmt(-round.delta)}</strong>만큼 짧아졌습니다. 후보 B가 새로운 현재 경로가 됩니다.</p>`:result==='worse-accepted'?`<p>후보가 <strong>${fmt(round.delta)}</strong>만큼 길어졌지만, 이번에는 확률적으로 채택했습니다.</p><p>후보 B에서 다음 탐색을 이어갑니다. 지금까지의 최고 기록은 따로 보관합니다.</p>`:`<p>후보는 <strong>${fmt(round.delta)}</strong>만큼 더 깁니다. ${state.part===1?'1부의 연습 규칙에 따라 기각합니다.':'이번에는 이 후보를 기각합니다.'}</p><p>기존 경로 A를 유지하고, 다음 반복에서 새로운 후보를 만듭니다.</p>`;
      if(state.part===2){
        if(scene.round===0){$('coachTitle').textContent='1. 더 짧은 후보를 채택합니다.';}
        else if(scene.round===1){$('coachTitle').textContent='2. 더 길지만 이번에는 채택합니다.';$('coachCopy').innerHTML=`<p>후보는 <strong>${fmt(round.delta)}</strong>만큼 길지만, 채택 확률이 <strong>${percent(round.probability)}</strong>로 높습니다.</p><p>이번 학습 예시에서는 이 긴 후보를 받아들입니다. 현재 경로를 잠시 늘리는 대신, 새로운 방문 순서에서 다음 후보를 찾아봅니다.</p>`;}
        else if(scene.round===2){$('coachTitle').textContent='3. 바뀐 순서에서 더 짧은 후보를 찾았습니다.';$('coachCopy').innerHTML=`<p>앞 장면에서 긴 경로를 받아들인 뒤 그 순서를 다시 바꾸니, 이번 후보는 <strong>${fmt(-round.delta)}</strong>만큼 짧아졌습니다.</p><p>잠깐 늘어난 길이를 만회하고, 긴 경로를 받아들이기 전보다도 <strong>${fmt(M.detour.beforeLength-M.detour.afterLength)}</strong>만큼 더 짧아져 채택합니다.</p>`;$('extraContent').innerHTML=`<div class="outcome-list"><div>긴 후보를 받아들이기 전: <b>${fmt(M.detour.beforeLength)}</b></div><div>받아들인 뒤, 이번 짧은 후보: <b>${fmt(M.detour.afterLength)}</b></div></div><p class="key-line">이 예시에서 긴 후보를 거절한 상태로 같은 구간만 뒤집었다면 길이는 ${fmt(M.detour.withoutDetourLength)}입니다. 우회를 통해 새로운 배열을 탐색한 효과를 보여주는 한 사례입니다.</p>`;}
        else{$('coachTitle').textContent='4. 긴 후보를 기각하고 현재 경로로 마칩니다.';$('coachCopy').innerHTML=`<p>시간이 충분히 흘러 <strong>T = ${round.temperature.toFixed(2)}</strong>로 낮아졌습니다. 이 긴 후보의 채택 확률은 매우 작고, 기각 확률은 거의 100%입니다.</p><p>이번에는 긴 후보를 기각하고, 현재의 짧은 경로를 이번 학습의 최종 경로로 유지합니다. 길이는 <strong>${fmt(round.beforeLength)}</strong>입니다.</p>`;}
      }
      renderMetrics(round);if(state.part===2)showProbability(round,true);
      notice(result==='rejected'?'A → A · 경로를 유지합니다. 빨간 점선 연결은 사용하지 않습니다.':`A → B · ${result==='worse-accepted'?'주황색':'초록색'} 연결이 채택되어 새로운 경로가 됩니다.`,`is-result ${result}`);
    }
  }
  function animateSelection(scene,round){
    if(reduced.matches)return;
    const version=renderVersion;let tick=0;$('nextStep').disabled=true;
    notice('방문 순서에서 두 위치를 무작위로 추출하는 중…');
    selectionInterval=setInterval(()=>{tick++;const count=M.places.length-1,i=1+(tick*7)%count;let j=1+(tick*3+4)%count;if(i===j)j=1+j%count;renderMap(scene,round,[round.before[i],round.before[j]]);},100);
    selectionTimer=setTimeout(()=>{if(version!==renderVersion)return;cancelSelection();renderMap(scene,round);notice(`<strong>${M.places[round.selected[0]].name}</strong>과 <strong>${M.places[round.selected[1]].name}</strong>의 방문 위치가 추출됐습니다. 두 위치 사이의 노란 구간을 뒤집습니다.`);$('nextStep').disabled=false;},1250);
  }
  function render(){
    cancelSelection();renderVersion++;
    document.querySelectorAll('.part-tab[data-part]').forEach(button=>{const active=+button.dataset.part===state.part;button.classList.toggle('active',active);if(active)button.setAttribute('aria-current','step');else button.removeAttribute('aria-current');});
    $('lessonLabel').textContent=`PART 0${state.part} / 03`;
    $('tutorialView').hidden=state.part===3;$('labView').hidden=state.part!==3;
    if(state.part===3){loadLab();return;}
    const scene=currentScene(),round=currentRound(scene),index=state.indices[state.part],total=sceneLists[state.part].length;
    $('progressText').textContent=`장면 ${index+1} / ${total}`;$('progressFill').style.width=`${(index+1)/total*100}%`;
    $('heatVisuals').hidden=state.part!==2;
    ['selectionNotice','distanceMetrics','probabilityVisual'].forEach(id=>{$(id).hidden=true;$(id).innerHTML='';});$('extraContent').innerHTML='';$('nextStep').disabled=false;
    if(state.part===2)temperatureChart(round?round.t:['analogy','part2-summary'].includes(scene.kind)?7:0);
    round?renderRound(scene,round):renderIntro(scene);
    $('sceneState').textContent=scene.kind==='intro'?'장소 살펴보기':round?(scene.kind==='pick'?'두 위치 추출':scene.kind==='decision'?(round.outcome==='rejected'?'A 유지':'B 채택'):'A와 후보 B 비교'):'현재 방문 순서';
    renderMap(scene,round);renderOrder(scene,round);
    const count=(state.part===1?M.part1:M.part2).length;
    $('roundNav').innerHTML=Array.from({length:count},(_,i)=>`<button type="button" data-round="${i}" class="${scene.round===i?'active':scene.round!==undefined&&scene.round>i?'done':''}" aria-label="예시 ${i+1}로 이동">${i+1}</button>`).join('');
    $('roundNav').querySelectorAll('button').forEach(button=>button.addEventListener('click',()=>{state.indices[state.part]=sceneLists[state.part].findIndex(s=>s.round===+button.dataset.round&&s.kind==='pick');render();}));
    $('previousStep').disabled=state.part===1&&index===0;
    const next=sceneLists[state.part][index+1];
    $('nextStep').textContent=index===total-1?(state.part===1?'2부 · 온도와 확률 배우기 →':'3부 · 직접 실험하기 →'):next?.kind==='pick'?'다음 · 두 위치 추출 →':next?.kind==='reverse'?'다음 · 구간 뒤집기 →':next?.kind==='decision'?'다음 · 판정 확인 →':'다음 →';
    if(scene.kind==='pick')animateSelection(scene,round);
    document.body.dataset.lessonPart=state.part;document.body.dataset.lessonScene=scene.kind;document.body.dataset.lessonRound=scene.round===undefined?'':scene.round;
  }
  function next(){if(state.part===3||$('nextStep').disabled)return;const list=sceneLists[state.part];if(state.indices[state.part]===list.length-1){state.part++;if(state.part===2)state.indices[2]=0;render();window.scrollTo({top:0,behavior:reduced.matches?'instant':'smooth'});}else{state.indices[state.part]++;render();}}
  function previous(){if(state.part===3)return;if(state.indices[state.part]>0)state.indices[state.part]--;else if(state.part===2){state.part=1;state.indices[1]=sceneLists[1].length-1;}render();}
  let labLoaded=false,labObserver=null;
  function loadLab(){if(labLoaded)return;labLoaded=true;const frame=$('labFrame');frame.addEventListener('load',()=>{try{const resize=()=>{const height=frame.contentDocument.body.scrollHeight;frame.style.height=`${height+30}px`;};resize();labObserver=new ResizeObserver(resize);labObserver.observe(frame.contentDocument.body);}catch{frame.style.height='1800px';}});frame.src='lab.html?v=20261103-2';}
  function drawMetal(time){
    const canvas=$('metalCanvas'),ctx=canvas.getContext('2d');
    if(state.part===2){const box=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);if(box.width>0){if(canvas.width!==Math.round(box.width*dpr)||canvas.height!==Math.round(box.height*dpr)){canvas.width=Math.round(box.width*dpr);canvas.height=Math.round(box.height*dpr);}ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,box.width,box.height);const p=metalT/7,heat=1-p,points=[];for(let i=0;i<35;i++){const gx=17+(i%7)*(box.width-34)/6,gy=19+Math.floor(i/7)*(box.height-38)/4,freeX=12+((i*67+23)%211)/211*(box.width-24),freeY=12+((i*43+17)%109)/109*(box.height-24),motion=reduced.matches?0:Math.sin(time/310+i*2)*7*heat;points.push({x:freeX*heat+gx*p+motion,y:freeY*heat+gy*p+Math.cos(time/340+i)*5*heat});}if(p>.5){ctx.strokeStyle=`rgba(90,139,83,${(p-.5)*.6})`;ctx.lineWidth=1;points.forEach((a,i)=>{[i%7<6?i+1:-1,i+7].forEach(j=>{if(j>=0&&j<points.length){ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(points[j].x,points[j].y);ctx.stroke();}});});}points.forEach(point=>{ctx.beginPath();ctx.arc(point.x,point.y,3,0,Math.PI*2);ctx.fillStyle=p>.6?'#65965d':'#d29b63';ctx.fill();});}}
    requestAnimationFrame(drawMetal);
  }
  document.querySelectorAll('.part-tab[data-part]').forEach(button=>button.addEventListener('click',()=>{state.part=+button.dataset.part;render();}));
  $('nextStep').addEventListener('click',next);$('previousStep').addEventListener('click',previous);
  $('restartPart').addEventListener('click',()=>{state.indices[state.part]=0;render();});
  document.addEventListener('keydown',event=>{if(['INPUT','SELECT','TEXTAREA'].includes(event.target.tagName))return;if(event.key==='ArrowRight'&&state.part!==3){event.preventDefault();next();}if(event.key==='ArrowLeft'&&state.part!==3){event.preventDefault();previous();}});
  window.addEventListener('resize',()=>{if(state.part!==3){const scene=currentScene();renderMap(scene,currentRound(scene));}});
  // Read-only state is useful for lesson progress and automated accessibility checks.
  window.SATutorialView={getState:()=>({part:state.part,index:state.part===3?0:state.indices[state.part],scene:state.part===3?null:currentScene()})};
  render();requestAnimationFrame(drawMetal);
})();

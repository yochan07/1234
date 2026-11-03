(() => {
  'use strict';
  const M=window.SATutorial, $=id=>document.getElementById(id);
  const state={part:1,indices:{1:0,2:0},probe:160};
  const sceneLists={1:M.scenes(1),2:M.scenes(2)};
  const colors={current:'#4c7eab',candidate:'#7b68b0',selected:'#d9943e',improved:'#2b895d','worse-accepted':'#d08c3a',rejected:'#c76459',shared:'#acbda8'};
  let selectionTimer=null,selectionInterval=null,renderVersion=0,metalT=0;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const fmt=n=>n.toLocaleString('ko-KR',{minimumFractionDigits:1,maximumFractionDigits:1});
  const percent=p=>p>0&&p<.00001?'< 0.001%':`${(p*100).toFixed(p<.01?3:1)}%`;
  const numeric=p=>p>0&&p<.0001?p.toExponential(2):p.toFixed(3);
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
    const selectedKinds=['pick','reverse','compare','draw','decision'];
    const compared=round&&['reverse','compare','draw','decision'].includes(scene.kind);
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
      const p=M.point(id),chosen=highlights.includes(id),start=id===route[0];
      return `<g data-place="${id}">${chosen?`<circle class="chosen-ring" cx="${p.x}" cy="${p.y}" r="18"/>`:''}<circle class="place-dot" cx="${p.x}" cy="${p.y}" r="11" fill="${chosen?colors.selected:start?'#c48f48':'#32634c'}"/><text class="place-number" x="${p.x}" y="${p.y}">${id+1}</text></g>`;
    }).join('');
    svg.innerHTML=`<title>식당 11곳의 상대 배치와 ${compared?'기존 및 후보 연결':'현재 방문 순서'}</title><path class="campus-shape" d="M345 34 Q295 45 291 111 L288 227 Q228 298 240 365 Q294 410 285 464 L285 552 Q300 585 333 570 Q365 548 364 486 L405 372 Q440 307 478 234 L483 155 Q438 101 410 52 Z"/><path class="campus-road" d="M343 49 Q366 169 355 242 Q320 310 322 399 Q326 487 315 552"/>${paths}${labels}${dots}`;
    legend(items.length?items:[[colors.shared,'사진의 상대 위치를 옮긴 식당 11곳']]);
  }
  function orderRow(label,order,round,reversed=false,selected=true){
    return `<div class="order-row"><span class="order-label">${label}</span>${[...order,order[0]].map((id,i)=>`${i?'<span class="order-arrow">→</span>':''}<span class="place-chip ${selected&&round&&i>=round.a&&i<=round.b?(reversed?'reversed':'selected'):''}">${short(id)}</span>`).join('')}</div>`;
  }
  function renderOrder(scene,round){
    if(round){const showingCandidate=['reverse','compare','draw','decision'].includes(scene.kind);$('routeOrder').innerHTML=orderRow('현재',round.before,round,false,scene.kind!=='decision')+(showingCandidate?orderRow('후보',round.candidate,round,true):'')+(scene.kind==='decision'?orderRow('결과',round.after,round,false,false):'');}
    else{const route=scene.kind==='part1-summary'?M.part1.at(-1).after:['analogy','part2-summary'].includes(scene.kind)?M.part2.at(-1).after:state.part===1?M.initial:M.part1.at(-1).after;$('routeOrder').innerHTML=orderRow(scene.kind==='intro'?'방문할 곳':'순서',route,null);}
  }
  function renderMetrics(round){
    $('distanceMetrics').hidden=false;
    $('distanceMetrics').innerHTML=`<div class="metric"><span>현재 경로 A</span><strong>${fmt(round.beforeLength)}</strong><small>도식 거리</small></div><div class="metric"><span>후보 경로 B</span><strong>${fmt(round.candidateLength)}</strong><small>도식 거리</small></div><div class="metric delta"><span>Δ = 후보 − 현재</span><strong style="color:${round.delta>0?colors.rejected:colors.improved}">${round.delta>0?'+':''}${fmt(round.delta)} · ${round.delta>0?'더 깁니다':'더 짧습니다'}</strong></div>`;
  }
  function probabilityMarkup(p,r,detail){
    return `<div class="probability-heading"><span>이번 후보의 채택 확률 p</span><strong>${percent(p).replace('<','&lt;')}</strong></div><div class="probability-gate"><i class="probability-yes" style="width:${p*100}%"></i>${r===null?'':`<i class="probability-marker" style="left:${r*100}%" aria-label="추첨값 ${r.toFixed(3)}"></i>`}</div><div class="probability-scale"><span>0 · 초록: 채택 구간</span><span>빨강: 기각 구간 · 1</span></div><p class="probability-detail">${detail}</p>`;
  }
  function showProbability(round,decision=false){
    $('probabilityVisual').hidden=false;
    const improved=round.delta<=0,r=improved?null:round.r;
    const detail=improved?'더 짧은 후보는 p = 1입니다. 무작위 추첨 없이 항상 채택합니다.':`p = exp(−${fmt(round.delta)} / ${round.temperature.toFixed(2)})<br>추첨값 r = <strong>${r.toFixed(3)}</strong> ${decision?`${r<round.probability?'&lt;':'≥'} p = ${numeric(round.probability)} → <strong>${r<round.probability?'채택':'기각'}</strong>`:'· 검은 표시가 초록 안이면 채택, 빨강 안이면 기각합니다.'}`;
    $('probabilityVisual').innerHTML=probabilityMarkup(round.probability,r,detail);
  }
  function temperatureChart(t){
    const values=Array.from({length:8},(_,i)=>160*Math.pow(.65,i));
    const x=i=>36+i/7*345,y=T=>120-T/160*101;
    const path=values.map((T,i)=>`${i?'L':'M'}${x(i)},${y(T)}`).join(' '),T=160*Math.pow(.65,t);
    $('temperatureChart').innerHTML=`<path d="M36 17 V120 H384" stroke="#ccd9c5" fill="none"/><path d="${path}" fill="none" stroke="#cb955d" stroke-width="2.5"/><circle cx="${x(t)}" cy="${y(T)}" r="5" fill="#b77338" stroke="white" stroke-width="2"/><g fill="#8d9c84" font-size="10" font-family="system-ui"><text x="4" y="22">160</text><text x="17" y="123">0</text><text x="32" y="142">0</text><text x="372" y="142">7 → t</text><text x="${Math.min(315,x(t)+8)}" y="${Math.max(16,y(T)-9)}">t = ${t.toFixed(t%1?1:0)}</text></g>`;
    $('temperatureValue').textContent=`T = ${T.toFixed(2)}`;
    metalT=Math.max(0,Math.min(7,t));
    $('metalPhase').textContent=t<2?'고온 · 활발한 운동':t<5?'냉각 · 정렬하는 중':'저온 · 규칙적인 배열';
  }
  function notice(html,type=''){const el=$('selectionNotice');el.hidden=false;el.innerHTML=html;el.className=`selection-notice ${type}`;}
  function renderIntro(scene){
    const kind=scene.kind;$('roundCount').textContent='';
    if(kind==='intro'){
      $('stagePill').textContent='01 · 문제 살펴보기';$('coachTitle').textContent='식당 11곳을 한 번씩 방문한다면?';
      $('coachCopy').innerHTML='<p>수의대부터 301동까지, 식당 11곳을 모두 들른 뒤 출발점으로 돌아오려고 합니다.</p><p>어느 식당을 먼저 갈지에 따라 전체 길이가 달라집니다. 우리가 찾는 것은 <strong>모두 방문하는 짧은 순환 경로</strong>입니다. 이것이 외판원 문제입니다.</p>';
      notice('먼저 점의 위치를 살펴보세요. 다음 장면에서 임의의 방문 순서를 하나 연결합니다.');
    }else if(kind==='route-intro'){
      $('stagePill').textContent='01 · 출발할 경로';$('coachTitle').textContent='일단 임의의 순서로 연결해 봅니다.';
      $('coachCopy').innerHTML='<p>처음부터 가장 짧은 순서를 알아내기는 어렵습니다. 그래서 시작 경로 A를 임의로 정한 뒤 조금씩 바꾸어 봅니다.</p><p>이제 <strong>현재 순서에서 두 위치를 무작위로 뽑고, 그 사이 순서를 뒤집는 방법</strong>을 네 번 따라가겠습니다.</p>';
      notice('1부에서는 후보 만드는 법에 집중합니다. 더 짧으면 채택하고, 더 길면 기각하는 규칙부터 연습합니다.');
    }else if(kind==='temperature-intro'){
      $('stagePill').textContent='02 · 온도 함수';$('coachTitle').textContent='더 긴 경로도 받아들인다면?';
      $('coachCopy').innerHTML='<p>계속 짧아지는 방향만 고집하면, 한 번 길어져야 더 좋은 순서로 넘어갈 수 있는 곳에서 탐색이 멈출 수 있습니다.</p><p>담금질은 <strong>온도가 높을 때 더 긴 후보도 확률적으로 받아들여</strong> 탐색 범위를 넓힙니다. t가 커지면 온도를 낮춥니다.</p>';
      $('extraContent').innerHTML='<div class="formula">T(t) = 160 × 0.65<sup>t</sup></div><p class="key-line">다음 8개 예시에서는 t가 0부터 7까지 증가합니다. 160과 0.65는 설명을 위해 정한 초기 온도와 냉각률입니다.</p>';
    }else if(kind==='probability-intro'){
      $('stagePill').textContent='02 · 채택 확률';$('coachTitle').textContent='온도만 바꾸면 확률은 어떻게 달라질까요?';
      $('coachCopy').innerHTML='<p>긴 후보의 거리 증가량을 Δ라고 하면, 채택 확률은 <strong>p = exp(−Δ / T)</strong>입니다.</p><p>아래에서는 <strong>Δ = 100, 추첨값 r = 0.40</strong>을 고정했습니다. 온도를 내려 초록색 채택 구간이 줄어드는 것을 살펴보세요.</p>';
      $('extraContent').innerHTML='<label class="probe-label" for="temperatureProbe">온도 직접 바꾸기 <output id="probeOutput">160</output></label><input id="temperatureProbe" class="probe-slider" type="range" min="8" max="160" value="160"><p class="key-line">같은 Δ라면 온도가 낮을수록 p가 작아집니다. 실제 탐색에서는 Δ도 매번 달라집니다.</p>';
      const update=()=>{state.probe=+$('temperatureProbe').value;$('probeOutput').textContent=state.probe;const p=Math.exp(-100/state.probe);$('probabilityVisual').hidden=false;$('probabilityVisual').innerHTML=probabilityMarkup(p,.4,`고정한 추첨값 r = 0.40 ${.4<p?'&lt;':'≥'} p = ${numeric(p)} → <strong>${.4<p?'채택':'기각'}</strong>`);temperatureChart(Math.min(7,Math.log(state.probe/160)/Math.log(.65)));};
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
      $('coachCopy').innerHTML='<p>지금까지 긴 후보의 확률 채택 2번, 짧은 후보의 채택 3번, 긴 후보의 기각 3번을 확인했습니다.</p><p>3부에서는 <strong>도시 수, 온도, 냉각률</strong>을 직접 바꿔 보세요. 모든 후보를 하나씩 관찰하거나 대표 프레임으로 빠르게 되짚을 수 있습니다.</p>';
      notice('초기 온도를 높이면 어떤 일이 생길까요? 냉각을 천천히 하면 최선의 경로는 얼마나 달라질까요?','is-result');
    }
  }
  function renderRound(scene,round){
    const kind=scene.kind,pickNames=round.selected.map(id=>M.places[id].name);
    $('roundCount').textContent=`예시 ${scene.round+1} / ${state.part===1?4:8}${state.part===2?` · t=${round.t}`:''}`;
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
    }else if(kind==='draw'){
      $('stagePill').textContent='③ 확률로 판단';$('coachTitle').textContent=round.delta<=0?'더 짧으므로 추첨할 필요가 없습니다.':'긴 후보를 받아들일지 추첨합니다.';
      $('coachCopy').innerHTML=round.delta<=0?'<p>온도에 관계없이 더 짧은 후보는 항상 채택합니다. 채택 확률 p는 100%입니다.</p>':`<p>현재 온도는 <strong>T = ${round.temperature.toFixed(2)}</strong>입니다. 거리 증가량 Δ와 이 온도로 채택 확률을 계산합니다.</p><p>0~1 사이 추첨값 r을 하나 뽑습니다. <strong>r &lt; p이면 채택</strong>하고, r ≥ p이면 기각합니다.</p>`;
      renderMetrics(round);showProbability(round,false);
    }else{
      $('stagePill').textContent='④ 채택 또는 기각';const result=round.outcome;
      $('coachTitle').textContent=result==='improved'?'더 짧아졌습니다. 채택합니다.':result==='worse-accepted'?'더 길지만 이번에는 채택합니다.':'이 후보는 기각합니다.';
      $('coachCopy').innerHTML=result==='improved'?`<p>후보가 <strong>${fmt(-round.delta)}</strong>만큼 짧아졌습니다. 후보 B가 새로운 현재 경로가 됩니다.</p>`:result==='worse-accepted'?`<p>후보가 <strong>${fmt(round.delta)}</strong>만큼 길어졌지만, 추첨값이 채택 확률보다 작았습니다.</p><p>이번에는 후보 B를 받아들입니다. 탐색 중 길이가 잠시 늘어날 수 있지만, 지금까지의 최고 기록은 따로 보관합니다.</p>`:`<p>후보는 <strong>${fmt(round.delta)}</strong>만큼 더 깁니다. ${state.part===1?'1부의 연습 규칙에 따라 기각합니다.':'추첨값도 채택 구간 밖에 놓였으므로 기각합니다.'}</p><p>기존 경로 A를 유지하고, 다음 반복에서 새로운 후보를 만듭니다.</p>`;
      renderMetrics(round);if(state.part===2)showProbability(round,true);
      notice(result==='rejected'?'A → A · 경로를 유지합니다. 빨간 점선 연결은 사용하지 않습니다.':`A → B · ${result==='worse-accepted'?'주황색':'초록색'} 연결이 채택되어 새로운 경로가 됩니다.`,`is-result ${result}`);
    }
  }
  function animateSelection(scene,round){
    if(reduced.matches)return;
    const version=renderVersion;let tick=0;$('nextStep').disabled=true;
    notice('방문 순서에서 두 위치를 무작위로 추출하는 중…');
    selectionInterval=setInterval(()=>{tick++;const i=1+(tick*7)%10;let j=1+(tick*3+4)%10;if(i===j)j=1+j%10;renderMap(scene,round,[round.before[i],round.before[j]]);},100);
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
    const count=state.part===1?4:8;
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
  function loadLab(){if(labLoaded)return;labLoaded=true;const frame=$('labFrame');frame.addEventListener('load',()=>{try{const resize=()=>{const height=frame.contentDocument.body.scrollHeight;frame.style.height=`${height+30}px`;};resize();labObserver=new ResizeObserver(resize);labObserver.observe(frame.contentDocument.body);}catch{frame.style.height='1800px';}});frame.src='lab.html';}
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

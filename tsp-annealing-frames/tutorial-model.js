/* Tutorial coordinates are sampled from the supplied illustration, not GPS. */
(() => {
  'use strict';
  const places = [
    {name:'수의대 식당',short:'수의대',x:215,y:73,label:[235,49,'end']},
    {name:'동원관 식당',short:'동원관',x:187,y:124,label:[230,123,'end']},
    {name:'220동 식당',short:'220동',x:230,y:132,label:[510,138,'start']},
    {name:'예술계 식당',short:'예술계',x:209,y:178,label:[225,199,'end']},
    {name:'학생회관 식당',short:'학생회관',x:176,y:228,label:[215,291,'end']},
    {name:'두레미담',short:'두레미담',x:150,y:256,label:[180,337,'end']},
    {name:'아워홈 식당',short:'아워홈',x:275,y:180,label:[530,249,'start']},
    {name:'919동 식당',short:'919동',x:292,y:167,label:[550,194,'start']},
    {name:'301동 식당',short:'301동',x:203,y:394,label:[490,547,'start']}
  ];
  const initial = [0,2,7,8,1,5,6,3,4];
  // Teaching examples selected from seeded random runs (15 and 579).
  // Sampling stays internal; the learner sees acceptance/rejection proportions.
  const plan1 = [{a:2,b:5},{a:3,b:7},{a:5,b:8},{a:6,b:8}];
  const plan2 = [
    {a:2,b:6,t:0,sample:.48206917591489346},
    {a:2,b:6,t:1,sample:.54571486383011325},
    {a:3,b:8,t:2,sample:.60951929288428242},
    {a:7,b:8,t:7,sample:.50097845937170948}
  ];
  const length = order => order.reduce((sum,id,i) => {
    const a=places[id], b=places[order[(i+1)%order.length]];
    return sum + Math.hypot(a.x-b.x,a.y-b.y);
  },0);
  function reverse(order,a,b) {
    const candidate=order.slice();
    candidate.splice(a,b-a+1,...candidate.slice(a,b+1).reverse());
    return candidate;
  }
  function buildRounds(start,plan,warmup) {
    let order=start.slice();
    return plan.map((entry,index) => {
      const t=entry.t??index;
      const before=order.slice(), candidate=reverse(before,entry.a,entry.b);
      const beforeLength=length(before), candidateLength=length(candidate);
      const delta=candidateLength-beforeLength, temperature=warmup?0:160*Math.pow(.65,t);
      const probability=delta<=0?1:(warmup?0:Math.exp(-delta/temperature));
      const outcome=delta<=0?'improved':(!warmup&&entry.sample<probability?'worse-accepted':'rejected');
      order=outcome==='rejected'?before.slice():candidate.slice();
      return {...entry,t,before,candidate,after:order.slice(),beforeLength,candidateLength,
        delta,temperature,probability,outcome,warmup,selected:[before[entry.a],before[entry.b]]};
    });
  }
  const part1=buildRounds(initial,plan1,true);
  const part2=buildRounds(part1[part1.length-1].after,plan2,false);
  const detour={beforeLength:part2[1].beforeLength,afterLength:part2[2].candidateLength,
    withoutDetourLength:length(reverse(part2[1].before,part2[2].a,part2[2].b))};
  function scenes(part) {
    const result=part===1?[{kind:'intro'},{kind:'route-intro'}]:[{kind:'temperature-intro'},{kind:'probability-intro'}];
    const stages=part===1?['pick','reverse','compare','decision']:['pick','reverse','probability','decision'];
    (part===1?part1:part2).forEach((round,i) => stages.forEach(kind=>result.push({kind,round:i})));
    result.push({kind:part===1?'part1-summary':'analogy'});
    if(part===2)result.push({kind:'part2-summary'});
    return result;
  }
  window.SATutorial=Object.freeze({places,initial,part1,part2,detour,length,reverse,scenes,
    point:id=>({x:360+(places[id].x-220)*1.5,y:60+(places[id].y-73)*1.5})});
})();

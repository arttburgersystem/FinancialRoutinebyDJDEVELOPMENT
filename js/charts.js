// ── SVG CHARTS ────────────────────────────────────────────────────────────────
var SVG_NS='http://www.w3.org/2000/svg';
function svgEl(tag,attrs,children){
  var e=document.createElementNS(SVG_NS,tag);
  if(attrs)Object.keys(attrs).forEach(function(k){e.setAttribute(k,String(attrs[k]));});
  if(children){if(!Array.isArray(children))children=[children];children.forEach(function(c){if(c)e.appendChild(c);});}
  return e;
}
function svgText(x,y,txt,attrs){
  var t=svgEl('text',Object.assign({x:x,y:y,'font-family':'-apple-system,sans-serif','font-size':9,fill:'var(--text3)'},attrs));
  t.textContent=String(txt);return t;
}
function fmtShort(v){
  v=Number(v)||0;
  if(v>=1000000)return'R$'+(v/1000000).toFixed(1)+'M';
  if(v>=1000)return'R$'+(v/1000).toFixed(0)+'k';
  return'R$'+Math.round(v);
}

// Grouped bar chart — items=[{label, values:[{value,color}]}]
function renderGroupedBarChart(items,opts){
  opts=opts||{};
  var W=opts.width||480,H=opts.height||130;
  var pad={t:10,r:8,b:26,l:44};
  var cW=W-pad.l-pad.r,cH=H-pad.t-pad.b;
  var allVals=[];items.forEach(function(d){(d.values||[]).forEach(function(v){allVals.push(v.value||0);});});
  var maxV=opts.maxVal||Math.max.apply(null,allVals.concat([1]));
  var gCount=items.length>0?(items[0].values||[]).length:1;

  var wrap=document.createElement('div');
  wrap.style.cssText='width:100%;overflow:hidden;';
  var svg=svgEl('svg',{viewBox:'0 0 '+W+' '+H,width:'100%',height:H,'preserveAspectRatio':'none'});

  // Grid
  [0.25,0.5,0.75,1].forEach(function(p){
    var y=pad.t+cH-p*cH;
    svg.appendChild(svgEl('line',{x1:pad.l,y1:y,x2:pad.l+cW,y2:y,stroke:'var(--border)','stroke-width':0.5}));
    svg.appendChild(svgText(pad.l-4,y+3,fmtShort(maxV*p),{'text-anchor':'end'}));
  });
  svg.appendChild(svgEl('line',{x1:pad.l,y1:pad.t+cH,x2:pad.l+cW,y2:pad.t+cH,stroke:'var(--border2)','stroke-width':1}));

  var slotW=cW/Math.max(items.length,1);
  var barW=Math.max(4,Math.min((slotW*0.7)/Math.max(gCount,1),22));
  var gap=2;

  items.forEach(function(item,i){
    var slotX=pad.l+i*slotW;
    var totalBW=gCount*barW+(gCount-1)*gap;
    var startX=slotX+(slotW-totalBW)/2;
    (item.values||[]).forEach(function(v,j){
      var bh=maxV>0?Math.max(0,(v.value||0)/maxV*cH):0;
      var x=startX+j*(barW+gap);
      var y=pad.t+cH-bh;
      svg.appendChild(svgEl('rect',{x:x,y:y,width:barW,height:Math.max(0,bh),fill:v.color||'var(--gold)',rx:2,ry:2,opacity:v.dim?0.3:1}));
    });
    var lt=svgText(slotX+slotW/2,pad.t+cH+16,item.label,{'text-anchor':'middle'});
    svg.appendChild(lt);
  });
  wrap.appendChild(svg);return wrap;
}

// Simple bar chart — items=[{label,value,color?,dim?}]
function renderBarChart(items,opts){
  opts=opts||{};
  var W=opts.width||480,H=opts.height||120;
  var pad={t:10,r:8,b:26,l:44};
  var cW=W-pad.l-pad.r,cH=H-pad.t-pad.b;
  var maxV=opts.maxVal||Math.max.apply(null,(items||[]).map(function(d){return d.value||0;}).concat([1]));

  var wrap=document.createElement('div');wrap.style.cssText='width:100%;overflow:hidden;';
  var svg=svgEl('svg',{viewBox:'0 0 '+W+' '+H,width:'100%',height:H,'preserveAspectRatio':'none'});

  [0.5,1].forEach(function(p){
    var y=pad.t+cH-p*cH;
    svg.appendChild(svgEl('line',{x1:pad.l,y1:y,x2:pad.l+cW,y2:y,stroke:'var(--border)','stroke-width':0.5}));
    svg.appendChild(svgText(pad.l-4,y+3,fmtShort(maxV*p),{'text-anchor':'end'}));
  });
  svg.appendChild(svgEl('line',{x1:pad.l,y1:pad.t+cH,x2:pad.l+cW,y2:pad.t+cH,stroke:'var(--border2)','stroke-width':1}));

  var n=Math.max(items.length,1);
  var slotW=cW/n;
  var barW=Math.max(6,Math.min(slotW*0.6,32));

  (items||[]).forEach(function(item,i){
    var bh=maxV>0?Math.max(0,(item.value||0)/maxV*cH):0;
    var x=pad.l+i*slotW+(slotW-barW)/2;
    var y=pad.t+cH-bh;
    svg.appendChild(svgEl('rect',{x:x,y:y,width:barW,height:Math.max(0,bh),fill:item.color||'var(--gold)',rx:2,opacity:item.dim?0.3:1}));
    svg.appendChild(svgText(x+barW/2,pad.t+cH+16,item.label,{'text-anchor':'middle'}));
  });
  wrap.appendChild(svg);return wrap;
}

// Line chart — series=[{label,data:[{x,y}],color}]
function renderLineChart(series,opts){
  opts=opts||{};
  var W=opts.width||480,H=opts.height||110;
  var pad={t:10,r:8,b:24,l:44};
  var cW=W-pad.l-pad.r,cH=H-pad.t-pad.b;
  var allY=[];(series||[]).forEach(function(s){(s.data||[]).forEach(function(d){allY.push(d.y||0);});});
  var minY=Math.min.apply(null,allY.concat([0]));
  var maxY=Math.max.apply(null,allY.concat([1]));
  var range=maxY-minY||1;

  var wrap=document.createElement('div');wrap.style.cssText='width:100%;overflow:hidden;';
  var svg=svgEl('svg',{viewBox:'0 0 '+W+' '+H,width:'100%',height:H,'preserveAspectRatio':'none'});

  [0,0.5,1].forEach(function(p){
    var y=pad.t+cH-p*cH;
    svg.appendChild(svgEl('line',{x1:pad.l,y1:y,x2:pad.l+cW,y2:y,stroke:'var(--border)','stroke-width':p===0?1:0.5}));
    svg.appendChild(svgText(pad.l-4,y+3,fmtShort(minY+range*p),{'text-anchor':'end'}));
  });

  (series||[]).forEach(function(s){
    var n=(s.data||[]).length;if(n<2)return;
    var color=s.color||'var(--gold)';
    function px(i){return pad.l+(i/(n-1))*cW;}
    function py(v){return pad.t+cH-((v-minY)/range)*cH;}
    var pts=s.data.map(function(p,i){return px(i).toFixed(1)+','+py(p.y).toFixed(1);}).join(' ');
    var pFirst=s.data[0],pLast=s.data[n-1];
    var polyPts=pts+' '+px(n-1).toFixed(1)+','+(pad.t+cH)+' '+pad.l.toFixed(1)+','+(pad.t+cH);
    svg.appendChild(svgEl('polygon',{points:polyPts,fill:color,opacity:0.07}));
    svg.appendChild(svgEl('polyline',{points:pts,fill:'none',stroke:color,'stroke-width':2,'stroke-linejoin':'round','stroke-linecap':'round'}));
    s.data.forEach(function(p,i){svg.appendChild(svgEl('circle',{cx:px(i),cy:py(p.y),r:3,fill:color}));});
  });

  if(series[0]&&series[0].data){
    var n=series[0].data.length;
    series[0].data.forEach(function(p,i){
      if(n<=13||i%Math.ceil(n/12)===0){
        svg.appendChild(svgText(pad.l+(i/(Math.max(n-1,1)))*cW,pad.t+cH+15,p.x,{'text-anchor':'middle'}));
      }
    });
  }
  wrap.appendChild(svg);return wrap;
}

import { el, svg } from './dom.js';
import { calendarScale, practiceTimeScale } from '../domain/chart-data.js';
import { duration, formatDate } from '../domain/utils.js';
export function lineChart(points:{date:string;bpm:number}[],label='Best clean BPM over time'):HTMLElement{
  if(!points.length)return el('div',{class:'chart-empty'},'Record a clean attempt to begin your tempo progression.');
  const width=680,height=220,pad={top:20,right:26,bottom:34,left:46},values=points.map(p=>p.bpm);
  const min=Math.max(0,Math.min(...values)-10),max=Math.max(...values)+10;
  const calendar=calendarScale(points.map(p=>p.date));
  const x=(i:number)=>pad.left+calendar.fractions[i]!*(width-pad.left-pad.right);
  const y=(bpm:number)=>height-pad.bottom-(bpm-min)/(max-min)*(height-pad.top-pad.bottom);
  const chart=svg('svg',{viewBox:`0 0 ${width} ${height}`,role:'img','aria-label':label,class:'line-chart'});
  chart.append(svg('title',{},label),svg('desc',{},points.map(p=>`${p.date}: ${p.bpm} BPM`).join('; ')));
  for(let i=0;i<4;i++){
    const value=Math.round(min+(max-min)*i/3),yy=y(value);
    chart.append(svg('line',{x1:pad.left,x2:width-pad.right,y1:yy,y2:yy,stroke:'var(--border)','stroke-dasharray':'3 5'}),svg('text',{x:pad.left-10,y:yy+4,'text-anchor':'end',fill:'var(--muted)','font-size':11},String(value)));
  }
  chart.append(svg('polyline',{points:points.map((p,i)=>`${x(i)},${y(p.bpm)}`).join(' '),fill:'none',stroke:'var(--accent-text)','stroke-width':2.5,'stroke-linejoin':'round'}));
  points.forEach((p,i)=>chart.append(svg('circle',{cx:x(i),cy:y(p.bpm),r:4,fill:'var(--accent-text)'},svg('title',{},`${formatDate(p.date)} · ${p.bpm} BPM`))));
  for(const i of new Set([0,points.length-1]))chart.append(svg('text',{x:x(i),y:height-8,'text-anchor':'middle',fill:'var(--muted)','font-size':11},formatDate(points[i]!.date)));
  return el('figure',{class:'chart'},chart,el('figcaption',{class:'muted small'},'Each point is the best clean tempo reached by that date. Clean and effortless attempts only.'));
}
export function dayChart(points:{date:string;seconds:number}[]):HTMLElement{
  if(!points.length)return el('div',{class:'chart-empty'},'Your daily practice will appear here after a session.');
  const width=680,height=180,pad=30,plot=width-2*pad;
  const {peak,ceiling}=practiceTimeScale(points),calendar=calendarScale(points.map(p=>p.date));
  const chart=svg('svg',{viewBox:`0 0 ${width} ${height}`,role:'img','aria-label':'Active practice minutes by day'});
  chart.append(svg('title',{},'Active practice minutes by day'));
  const gap=plot/calendar.days,barWidth=Math.min(28,gap*.65);
  points.forEach((p,i)=>{
    const h=(p.seconds/ceiling)*(height-45),x=pad+gap/2+calendar.fractions[i]!*(plot-gap)-barWidth/2;
    chart.append(svg('rect',{x,y:height-25-h,width:barWidth,height:Math.max(1,h),rx:2,fill:'var(--accent-text)'},svg('title',{},`${p.date}: ${duration(p.seconds)} of active practice`)));
  });
  chart.append(svg('line',{x1:pad,x2:width-pad,y1:height-24,y2:height-24,stroke:'var(--border)'}),svg('text',{x:pad,y:12,fill:'var(--muted)','font-size':11},`Daily peak: ${duration(peak)}`));
  for(const i of new Set([0,points.length-1]))chart.append(svg('text',{
    x:points.length===1?width/2:i===0?pad:width-pad,y:height-5,
    'text-anchor':points.length===1?'middle':i===0?'start':'end',fill:'var(--muted)','font-size':11,
  },formatDate(points[i]!.date)));
  return el('figure',{class:'chart'},chart,el('figcaption',{class:'muted small'},'Actual active time. Pauses and count-in are excluded.'));
}

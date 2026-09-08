import { el, svg } from './dom.js';
import { calendarScale, practiceTimeScale } from '../domain/chart-data.js';
import { duration, formatDate } from '../domain/utils.js';

const renderers = new WeakMap<HTMLElement, (width: number) => SVGElement>();
function figure(render: (width: number) => SVGElement, caption: string): HTMLElement {
  const node = el('figure', { class: 'chart' }, render(480), el('figcaption', { class: 'muted small' }, caption));
  renderers.set(node, render);
  return node;
}
/** Recalculate the coordinate system, not scaled-down text, on container resize.
 * The route owns and disconnects this observer; no detached chart listeners remain. */
export function observeCharts(root: HTMLElement): () => void {
  const widths = new WeakMap<HTMLElement, number>();
  const update = (node: HTMLElement, size: number) => {
    const width = Math.max(240, Math.round(size));
    if (widths.get(node) === width) return;
    const render = renderers.get(node);
    if (render) { widths.set(node, width); node.querySelector('svg')?.replaceWith(render(width)); }
  };
  const charts = [...root.querySelectorAll<HTMLElement>('figure.chart')];
  charts.forEach(node => update(node, node.clientWidth));
  if (typeof ResizeObserver === 'undefined') return () => {};
  // Defer SVG writes until the next frame: changing observed layout during the
  // observer callback can trigger ResizeObserver loops, particularly in WebKit.
  const pending = new Map<HTMLElement, number>();
  let frame: number | undefined;
  let disposed = false;
  const flush = () => {
    frame = undefined;
    if (disposed) return;
    pending.forEach((size, node) => update(node, size));
    pending.clear();
  };
  const observer = new ResizeObserver(entries => {
    if (disposed) return;
    for (const entry of entries) {
      const node = entry.target as HTMLElement;
      if (widths.get(node) !== Math.max(240, Math.round(entry.contentRect.width))) {
        pending.set(node, entry.contentRect.width);
      }
    }
    if (pending.size && frame === undefined) frame = requestAnimationFrame(flush);
  });
  charts.forEach(node => observer.observe(node));
  return () => {
    disposed = true;
    observer.disconnect();
    if (frame !== undefined) cancelAnimationFrame(frame);
    pending.clear();
  };
}
export function lineChart(points: {date:string;bpm:number}[], label = 'Best clean BPM over time'): HTMLElement {
  if (!points.length) return el('div', {class:'chart-empty'}, 'Record a clean attempt to begin your tempo progression.');
  let lowest = Infinity, highest = 0;
  for (const point of points) { lowest = Math.min(lowest, point.bpm); highest = Math.max(highest, point.bpm); }
  const min = Math.max(0, lowest - 10), max = highest + 10, calendar = calendarScale(points.map(p => p.date));
  return figure(width => {
    const height = 210, pad = {top:20,right:18,bottom:30,left:38};
    const x = (i:number) => pad.left + calendar.fractions[i]! * (width - pad.left - pad.right);
    const y = (bpm:number) => height - pad.bottom - (bpm-min)/(max-min) * (height-pad.top-pad.bottom);
    const chart = svg('svg', {viewBox:`0 0 ${width} ${height}`,role:'img','aria-label':label,class:'line-chart'});
    chart.append(svg('title',{},label),svg('desc',{},points.map(p=>`${p.date}: ${p.bpm} BPM`).join('; ')));
    for(let i=0;i<4;i++) {
      const value=Math.round(min+(max-min)*i/3),yy=y(value);
      chart.append(svg('line',{x1:pad.left,x2:width-pad.right,y1:yy,y2:yy,stroke:'var(--border)'}),svg('text',{x:pad.left-8,y:yy+4,'text-anchor':'end',fill:'var(--muted)','font-size':12},String(value)));
    }
    chart.append(svg('polyline',{points:points.map((p,i)=>`${x(i)},${y(p.bpm)}`).join(' '),fill:'none',stroke:'var(--chart-ink)','stroke-width':2,'stroke-linejoin':'round'}));
    // Dense histories retain the exact polyline; markers are only useful when distinct.
    if(points.length<width/8)points.forEach((p,i)=>chart.append(svg('circle',{cx:x(i),cy:y(p.bpm),r:3,fill:'var(--chart-ink)'},svg('title',{},`${formatDate(p.date)} · ${p.bpm} BPM`))));
    for(const i of new Set([0,points.length-1]))chart.append(svg('text',{x:x(i),y:height-6,'text-anchor':points.length===1?'middle':i===0?'start':'end',fill:'var(--muted)','font-size':12},formatDate(points[i]!.date)));
    return chart;
  },'Best clean tempo by date. Clean and effortless attempts only.');
}
export function dayChart(points:{date:string;seconds:number}[]):HTMLElement {
  if(!points.length)return el('div',{class:'chart-empty'},'Your daily practice will appear here after a session.');
  const {peak,ceiling}=practiceTimeScale(points),calendar=calendarScale(points.map(p=>p.date));
  return figure(width=>{
    const height=180,pad=12,plot=width-2*pad;
    const chart=svg('svg',{viewBox:`0 0 ${width} ${height}`,role:'img','aria-label':'Active practice minutes by day'});
    chart.append(svg('title',{},'Active practice minutes by day'));
    const gap=plot/calendar.days,barWidth=Math.min(24,gap*.65);
    points.forEach((p,i)=>{
      const h=(p.seconds/ceiling)*(height-48),x=pad+gap/2+calendar.fractions[i]!*(plot-gap)-barWidth/2;
      chart.append(svg('rect',{x,y:height-28-h,width:barWidth,height:Math.max(1,h),fill:'var(--chart-ink)'},svg('title',{},`${p.date}: ${duration(p.seconds)} of active practice`)));
    });
    chart.append(svg('line',{x1:pad,x2:width-pad,y1:height-27,y2:height-27,stroke:'var(--border)'}),svg('text',{x:pad,y:12,fill:'var(--muted)','font-size':12},`Daily peak: ${duration(peak)}`));
    for(const i of new Set([0,points.length-1]))chart.append(svg('text',{x:points.length===1?width/2:i===0?pad:width-pad,y:height-5,'text-anchor':points.length===1?'middle':i===0?'start':'end',fill:'var(--muted)','font-size':12},formatDate(points[i]!.date)));
    return chart;
  },'Actual active time. Pauses and count-in are excluded.');
}

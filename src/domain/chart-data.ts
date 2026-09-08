/** Calendar-only chart coordinates: gaps between practice dates remain visible. */
export function calendarScale(dates:string[]):{fractions:number[];days:number} {
  if(!dates.length)return {fractions:[],days:0};
  const ordinals=dates.map(date=>{
    const [year,month,day]=date.split('-').map(Number);
    // UTC is used only as an ordinal for an already-local date key, never for grouping sessions.
    return Date.UTC(year!,month!-1,day!)/86400000;
  });
  const first=ordinals.reduce((a,b)=>Math.min(a,b)),last=ordinals.reduce((a,b)=>Math.max(a,b)),span=last-first;
  return {fractions:ordinals.map(day=>span?(day-first)/span:.5),days:span+1};
}
export function practiceTimeScale(points:{seconds:number}[]):{peak:number;ceiling:number} {
  const peak=points.reduce((max,p)=>Math.max(max,p.seconds),0);
  return {peak,ceiling:Math.max(60,peak)};
}

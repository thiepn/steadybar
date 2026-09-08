import { svg } from './dom.js';
export type IconName='today'|'play'|'pause'|'pulse'|'library'|'routine'|'song'|'setlist'|'goal'|'progress'|'history'|'settings'|'search'|'plus'|'arrow'|'close'|'check'|'download'|'upload'|'sun'|'moon'|'more'|'focus'|'exit'|'volume'|'muted'|'edit'|'trash'|'up'|'down'|'grip'|'note'|'restart'|'skip'|'help'|'offline';
const paths:Record<IconName,string>={
 today:'M4 5h16v16H4z M7 3v4 M17 3v4 M4 10h16 M8 14h3 M8 17h6',
 play:'M8 4l12 8-12 8z',pause:'M8 4v16 M16 4v16',pulse:'M3 12h4l3-8 4 16 3-8h4',
 library:'M4 4h4v16H4z M11 4h3v16h-3z M17 5l3-1 3 16-3 1z',
 routine:'M8 6h13 M8 12h13 M8 18h13 M3 6h1 M3 12h1 M3 18h1',song:'M9 18V5l11-2v13 M9 8l11-2 M9 18c0 2-6 3-6 0s6-3 6 0 M20 16c0 2-6 3-6 0s6-3 6 0',
 setlist:'M4 3h12v18H4z M8 7h4 M8 11h4 M8 15h4 M19 7h2v12h-2',
 goal:'M20 12a8 8 0 1 1-8-8 M16 12a4 4 0 1 1-4-4 M12 12l9-9 M17 3h4v4',
 progress:'M4 20V4 M4 20h17 M8 15l4-5 4 2 5-7',history:'M3 10a9 9 0 1 1 1 7 M3 4v6h6 M12 7v6l4 2',
 settings:'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M12 2v3 M12 19v3 M2 12h3 M19 12h3 M5 5l2 2 M17 17l2 2 M19 5l-2 2 M7 17l-2 2',
 search:'M10.5 3a7.5 7.5 0 1 0 0 15 7.5 7.5 0 0 0 0-15 M16 16l5 5',plus:'M12 5v14 M5 12h14',arrow:'M5 12h14 M14 6l6 6-6 6',close:'M6 6l12 12 M18 6L6 18',check:'M5 12l4 4L19 6',
 download:'M12 3v12 M7 10l5 5 5-5 M4 17v4h16v-4',upload:'M12 16V4 M7 9l5-5 5 5 M4 17v4h16v-4',
 sun:'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M12 2v2 M12 20v2 M2 12h2 M20 12h2 M5 5l1 1 M18 18l1 1 M19 5l-1 1 M6 18l-1 1',
 moon:'M20 14A9 9 0 0 1 10 3a9 9 0 1 0 10 11',more:'M5 11v2 M12 11v2 M19 11v2',focus:'M3 9V3h6 M15 3h6v6 M21 15v6h-6 M9 21H3v-6',exit:'M8 3H3v18h5 M10 12h11 M16 7l5 5-5 5',
 volume:'M3 9h4l5-5v16l-5-5H3z M16 8a6 6 0 0 1 0 8 M19 5a10 10 0 0 1 0 14',muted:'M3 9h4l5-5v16l-5-5H3z M16 9l6 6 M22 9l-6 6',edit:'M4 16l-1 5 5-1L21 7l-5-5z M14 4l6 6',trash:'M3 6h18 M9 6V3h6v3 M6 6l1 15h10l1-15 M10 10v7 M14 10v7',
 up:'M6 15l6-6 6 6',down:'M6 9l6 6 6-6',grip:'M8 5v1 M16 5v1 M8 11v1 M16 11v1 M8 17v1 M16 17v1',note:'M4 3h16v14l-4 4H4z M8 7h8 M8 11h8 M8 15h4',restart:'M3 10a9 9 0 1 1 1 7 M3 4v6h6',skip:'M5 5l10 7-10 7z M19 5v14',help:'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18 M9 9a3 3 0 0 1 6 0c0 2-3 2-3 5 M12 17v1',offline:'M4 12l5 5L20 6',
};
export function icon(name:IconName,size=19):SVGSVGElement{return svg('svg',{viewBox:'0 0 24 24',width:size,height:size,fill:'none',stroke:'currentColor','stroke-width':1.7,'stroke-linecap':'round','stroke-linejoin':'round','aria-hidden':'true'},svg('path',{d:paths[name]}));}
export function brandMark():SVGSVGElement{return svg('svg',{viewBox:'0 0 32 32',width:32,height:32,'aria-hidden':'true'},svg('rect',{width:32,height:32,rx:7,fill:'var(--brand-bg)'}),svg('path',{d:'M8 18v-4 M13 22V10 M19 20v-8 M24 17v-2',stroke:'var(--brand-ink)','stroke-width':2.5,'stroke-linecap':'round'}));}

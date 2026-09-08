import type { RoutineBlock } from '../domain/models.js';
import { ordered, reorder } from '../domain/utils.js';
import { el } from './dom.js';
import { badge, button, iconButton, notify } from './components.js';
import { editBlock, trainerDialog } from './editors.js';
import { icon } from './icons.js';
export function blockList(blocks:RoutineBlock[],onChange:(blocks:RoutineBlock[])=>Promise<unknown>,onStart?:(block:RoutineBlock)=>Promise<unknown>):HTMLElement{
  const list=el('div',{class:'block-list'});let dragging=-1;
  const change=async(next:RoutineBlock[])=>{await onChange(ordered(next));};
  blocks.forEach((block,index)=>{
    const title=el('div',{class:'block-title'},el('strong',{},block.title),el('div',{class:'block-subtitle'},badge(block.type.replaceAll('-',' ')),block.tempoTrainer?badge(`${block.tempoTrainer.mode} trainer`,'accent'):null,block.notes?el('span',{class:'muted small truncate',title:block.notes},block.notes):null));
    const minutes=el('input',{type:'number',value:block.targetSeconds/60,min:1/60,max:1440,step:'any',class:'inline-number','aria-label':`${block.title} duration in minutes`});
    const bpm=el('input',{type:'number',value:block.bpm,min:20,max:300,step:1,class:'inline-number','aria-label':`${block.title} BPM`});
    const updateInput=async(field:'targetSeconds'|'bpm',value:number,control:HTMLInputElement)=>{
      if(!control.reportValidity())return;
      try{await change(blocks.map(b=>b.id===block.id?{...b,[field]:value,...(field==='targetSeconds'&&b.tempoTrainer?.mode==='endurance'?{tempoTrainer:{...b.tempoTrainer,seconds:value}}:{})}:b));}catch(error){notify(error instanceof Error?error.message:'The block could not be saved.','error');}
    };
    minutes.addEventListener('change',()=>{void updateInput('targetSeconds',Math.round(Number(minutes.value)*60),minutes);});
    bpm.addEventListener('change',()=>{void updateInput('bpm',Number(bpm.value),bpm);});
    const up=iconButton(`Move ${block.title} up`,'up',()=>change(reorder(blocks,index,index-1)));up.disabled=index===0;
    const down=iconButton(`Move ${block.title} down`,'down',()=>change(reorder(blocks,index,index+1)));down.disabled=index===blocks.length-1;
    const row=el('div',{class:'block-row','data-block-id':block.id},
      el('div',{class:'block-index'},el('span',{},String(index+1).padStart(2,'0')),el('span',{class:'drag-handle',draggable:true,title:'Drag to reorder','aria-hidden':'true',onDragstart:(event:DragEvent)=>{dragging=index;event.dataTransfer?.setData('text/plain',block.id);row.classList.add('dragging');},onDragend:()=>row.classList.remove('dragging')},icon('grip',16))),title,
      el('div',{class:'block-numbers'},el('label',{},minutes,el('span',{},'min')),el('label',{},bpm,el('span',{},'BPM'))),
      el('div',{class:'block-actions'},onStart?iconButton(`Practice ${block.title}`,'play',()=>onStart(block)):null,
        iconButton(`Edit ${block.title}`,'edit',()=>editBlock(block,async updated=>change(blocks.map(b=>b.id===block.id?updated:b)))),
        iconButton(`Tempo trainer for ${block.title}`,'progress',()=>trainerDialog(block.tempoTrainer,async config=>change(blocks.map(b=>b.id===block.id?{...b,tempoTrainer:config,...(config.mode==='endurance'?{targetSeconds:config.seconds}:{})}:b)),block.bpm)),
        up,down,iconButton(`Remove ${block.title}`,'close',()=>change(blocks.filter(b=>b.id!==block.id)))));
    row.addEventListener('dragover',event=>{event.preventDefault();if(event.dataTransfer)event.dataTransfer.dropEffect='move';});
    row.addEventListener('drop',event=>{event.preventDefault();if(dragging>=0)void change(reorder(blocks,dragging,index)).catch(error=>notify(error instanceof Error?error.message:'Reordering could not be saved.','error'));dragging=-1;});
    list.append(row);
  });
  list.append(el('div',{class:'block-add'},button('Add block',()=>editBlock(undefined,async block=>change([...blocks,block])),'ghost','plus')));
  return list;
}

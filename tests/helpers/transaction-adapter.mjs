/**
 * Deterministic request/transaction test double for this repository's database layer.
 * Implements ONLY the API surface exercised here, not the IndexedDB specification.
 * Serializes transactions and stages changes until commit; errors discard staged data.
 * This establishes application rollback/await behavior, NOT browser storage durability.
 */
export function transactionAdapter(storeNames){
  const state={tables:new Map(storeNames.map(name=>[name,new Map()])),queue:[],active:false,
    holdCommit:false,held:[],failCommit:undefined,failWriteAt:0,writes:0,completed:0,aborted:0,requests:0};
  const database={
    transaction(names,mode='readonly'){
      const tx=new Transaction(Array.isArray(names)?names:[names],mode);state.queue.push(tx);pump();return tx;
    },
    close(){},onversionchange:null,
  };
  function pump(){
    if(state.active||!state.queue.length)return;
    state.active=true;const tx=state.queue.shift();
    setImmediate(()=>{tx.view=structuredClone(state.tables);tx.started=true;tx.step();});
  }
  class Transaction{
    constructor(names,mode){this.names=names;this.mode=mode;this.operations=[];this.started=false;this.finished=false;this.error=null;this.scheduled=false;}
    objectStore(name){
      if(!this.names.includes(name))throw new DOMException('Store is outside transaction scope','NotFoundError');
      const op=fn=>this.request(()=>fn(this.view.get(name)));
      const write=fn=>op(table=>{
        if(this.mode!=='readwrite')throw new DOMException('Read-only transaction','ReadOnlyError');
        state.writes++;
        if(state.failWriteAt && state.writes===state.failWriteAt)throw new DOMException('Injected write failure','QuotaExceededError');
        return fn(table);
      });
      return {
        get:id=>op(table=>structuredClone(table.get(id))),getAll:()=>op(table=>structuredClone([...table.values()])),
        put:row=>write(table=>{table.set(row.id,structuredClone(row));return row.id;}),
        add:row=>write(table=>{if(table.has(row.id))throw new DOMException('Duplicate ID','ConstraintError');table.set(row.id,structuredClone(row));return row.id;}),
        delete:id=>write(table=>{table.delete(id);}),clear:()=>write(table=>{table.clear();}),
        index:key=>({count:value=>op(table=>[...table.values()].filter(row=>row[key]===value).length)}),
      };
    }
    request(fn){
      if(this.finished)throw new DOMException('Transaction has finished','TransactionInactiveError');
      const req={result:undefined,error:null};this.operations.push({req,fn});
      if(this.started)this.schedule();return req;
    }
    schedule(){if(!this.scheduled&&!this.finished){this.scheduled=true;setImmediate(()=>{this.scheduled=false;this.step();});}}
    step(){
      if(this.finished)return;
      const operation=this.operations.shift();
      if(operation){
        try{operation.req.result=operation.fn();state.requests++;operation.req.onsuccess?.({target:operation.req});}
        catch(error){operation.req.error=error;operation.req.onerror?.({target:operation.req});this.error=error;this.abort();return;}
        // Promise continuations may enqueue more requests before the commit task.
        this.schedule();return;
      }
      if(state.holdCommit&&this.mode==='readwrite'){if(!state.held.includes(this))state.held.push(this);return;}
      this.commit();
    }
    commit(){
      if(this.finished)return;
      if(this.mode==='readwrite'&&state.failCommit){this.error=state.failCommit;state.failCommit=undefined;this.abort();return;}
      if(this.mode==='readwrite')for(const name of this.names)state.tables.set(name,this.view.get(name));
      this.finished=true;state.completed++;this.oncomplete?.({target:this});state.active=false;pump();
    }
    abort(){
      if(this.finished)throw new DOMException('Transaction already finished','InvalidStateError');
      this.finished=true;state.aborted++;setImmediate(()=>{this.onabort?.({target:this});state.active=false;pump();});
    }
  }
  return {
    state,
    factory:{open(){const req={result:database,error:null};setImmediate(()=>req.onsuccess?.({target:req}));return req;}},
    reset(){if(state.active||state.queue.length)throw new Error('Tests must await pending transactions before resetting the adapter.');state.tables=new Map(storeNames.map(n=>[n,new Map()]));state.holdCommit=false;state.held=[];state.failCommit=undefined;state.failWriteAt=0;state.writes=0;state.completed=0;state.aborted=0;state.requests=0;},
    releaseCommits(){state.holdCommit=false;const held=state.held.splice(0);for(const tx of held)tx.commit();},
  };
}

import { validateAggregateProfile } from '@fly-eye/graph-core';

const clamp=(value,min=0,max=1)=>Math.max(min,Math.min(max,value));

export class EscapeRuntime{
  constructor(profile,options={}){
    validateAggregateProfile(profile);
    this.profile=profile;
    this.ticksPerStep=options.ticksPerStep??5;
    this.decay=options.decay??0.52;
    this.coupling=options.coupling??0.11;
    this.loomDrive=options.loomDrive??0.60;
    this.groups=profile.nodes.map(node=>node.id);
    this.reset();
  }

  reset(){
    this.state=Object.fromEntries(this.groups.map(id=>[id,0]));
    return this.readout();
  }

  coefficient(edge){
    const meanNet=(edge.positiveWeight-edge.negativeWeight)/Math.max(1,edge.edgeCount);
    return Math.tanh(meanNet/18);
  }

  step({looming=0}={}){
    const input=Math.pow(clamp(looming),0.82);
    let state={...this.state};
    for(let tick=0;tick<this.ticksPerStep;tick++){
      const drive=Object.fromEntries(this.groups.map(id=>[id,0]));
      for(const edge of this.profile.edges){
        drive[edge.target]+=state[edge.source]*this.coefficient(edge);
      }
      const next={};
      for(const id of this.groups){
        const external=id==='loom'?input*this.loomDrive:0;
        next[id]=clamp(state[id]*this.decay+drive[id]*this.coupling+external);
      }
      state=next;
    }
    this.state=state;
    return this.readout();
  }

  readout(){
    const s=this.state;
    const lc4=clamp(s.loom||0);
    const dnLeft=clamp(s.turnL||0);
    const dnRight=clamp(s.turnR||0);
    const flightLeft=clamp(s.flightL||0);
    const flightRight=clamp(s.flightR||0);
    const flight=clamp((flightLeft+flightRight)*0.5);
    const escapeDn=clamp((dnLeft+dnRight)*0.5);
    const network=clamp((lc4+dnLeft+dnRight+flightLeft+flightRight)/5);
    const rawEscape=lc4*0.45+escapeDn*0.25+flight*0.30;
    const escape=clamp((rawEscape-0.08)/0.50);
    return {
      profile:this.profile.profile,
      loom:lc4,
      lc4,
      dnLeft,dnRight,flightLeft,flightRight,flight,escapeDn,network,escape,
      state:{...s}
    };
  }
}

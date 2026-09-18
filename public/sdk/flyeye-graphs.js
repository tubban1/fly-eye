export async function loadFlyEyeProfile(url='/data/escape-fast-v1.json'){
  const response=await fetch(url);
  if(!response.ok) throw new Error('FlyEye profile load failed: '+response.status);
  const profile=await response.json();
  validateFlyEyeProfile(profile);
  return profile;
}

export function validateFlyEyeProfile(profile){
  if(!profile || profile.profile!=='flyeye.escape-fast.v1') throw new Error('Unsupported FlyEye profile');
  if(!Array.isArray(profile.nodes)||!Array.isArray(profile.edges)) throw new Error('Invalid FlyEye profile shape');
  const ids=new Set(profile.nodes.map(n=>n.id));
  for(const edge of profile.edges){
    if(!ids.has(edge.source)||!ids.has(edge.target)) throw new Error('Edge references unknown node');
    if(!Number.isFinite(edge.edgeCount)||edge.edgeCount<1) throw new Error('Invalid edgeCount');
    if(!Number.isFinite(edge.positiveWeight)||!Number.isFinite(edge.negativeWeight)) throw new Error('Invalid signed weights');
  }
  return true;
}

const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));

export class EscapeRuntime{
  constructor(profile,options={}){
    validateFlyEyeProfile(profile);
    this.profile=profile;
    this.ticksPerStep=options.ticksPerStep??5;
    this.decay=options.decay??.52;
    this.coupling=options.coupling??.11;
    this.loomDrive=options.loomDrive??.60;
    this.groups=profile.nodes.map(n=>n.id);
    this.state={};
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
    const input=Math.pow(clamp(looming),.82);
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
    const dnLeft=clamp(s.turnL||0);
    const dnRight=clamp(s.turnR||0);
    const flightLeft=clamp(s.flightL||0);
    const flightRight=clamp(s.flightR||0);
    const flight=clamp((flightLeft+flightRight)*.5);
    const escapeDn=clamp((dnLeft+dnRight)*.5);
    const network=clamp(((s.loom||0)+dnLeft+dnRight+flightLeft+flightRight)/5);
    const rawEscape=(s.loom||0)*.45+escapeDn*.25+flight*.30;
    const escape=clamp((rawEscape-.08)/.50);

    const lc4=clamp(s.loom||0);
    return {
      profile:this.profile.profile,
      loom:lc4,
      lc4,
      dnLeft,dnRight,flightLeft,flightRight,flight,escapeDn,network,escape,
      state:{...s}
    };
  }
}

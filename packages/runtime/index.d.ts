export interface EscapeRuntimeOptions {
  ticksPerStep?:number;
  decay?:number;
  coupling?:number;
  loomDrive?:number;
}
export interface EscapeReadout {
  profile:string;
  loom:number;
  lc4:number;
  dnLeft:number;
  dnRight:number;
  flightLeft:number;
  flightRight:number;
  flight:number;
  escapeDn:number;
  network:number;
  escape:number;
  state:Record<string,number>;
}
export declare class EscapeRuntime {
  constructor(profile:any,options?:EscapeRuntimeOptions);
  reset():EscapeReadout;
  step(input?:{looming?:number}):EscapeReadout;
  readout():EscapeReadout;
}

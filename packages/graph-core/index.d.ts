export interface FlyGraph {
  format: 'FLYGRAPH';
  version: number;
  neuronCount: number;
  edgeCount: number;
  rowOffsets: Uint32Array;
  presynapticIndices: Uint32Array;
  weights: Float64Array;
}
export interface FlyEyeGroup { id:string; label?:string; indices:number[]; count?:number }
export interface NeuronManifest {
  profile:string;
  kind?:string;
  neuronCount:number;
  edgeCount:number;
  graphBytes?:number;
  graphHash?:string;
  bodyIds?:string[];
  originalIndices?:number[];
  groups:FlyEyeGroup[];
  [key:string]:unknown;
}
export interface LoadedNeuronGraph { manifest:NeuronManifest; graph:FlyGraph }

export declare function parseFlyGraph(buffer:ArrayBuffer|ArrayBufferView):FlyGraph;
export declare function validateNeuronManifest(manifest:NeuronManifest):true;
export declare function validateAggregateProfile(profile:unknown):true;
export declare function loadJson(url:string,fetchImpl?:typeof fetch):Promise<any>;
export declare function loadNeuronGraph(manifestUrl:string,graphUrl:string,fetchImpl?:typeof fetch):Promise<LoadedNeuronGraph>;
export declare function groupById(manifest:NeuronManifest,id:string):FlyEyeGroup|null;
export declare function bodyIdAt(manifest:NeuronManifest,index:number):string|null;
export declare function originalIndexAt(manifest:NeuronManifest,index:number):number|null;
export declare function incomingEdges(graph:FlyGraph,target:number):Array<{source:number;target:number;weight:number}>;
export declare function buildOutgoing(graph:FlyGraph):{offsets:Uint32Array;targets:Uint32Array;weights:Float64Array};

export interface FlyEyeNode {
  id: 'loom' | 'turnL' | 'turnR' | 'flightL' | 'flightR' | string;
  label: string;
  neuronCount: number;
}

export interface FlyEyeEdge {
  source: string;
  target: string;
  edgeCount: number;
  positiveWeight: number;
  negativeWeight: number;
}

export interface FlyEyeEscapeProfile {
  schemaVersion: number;
  profile: 'flyeye.escape-fast.v1';
  kind: 'aggregate-connectome' | string;
  dataset: string;
  source: {
    repository: string;
    commit: string;
    graphHash: string;
  };
  attribution: string;
  scientificBoundary: string;
  nodes: FlyEyeNode[];
  edges: FlyEyeEdge[];
}

export interface EscapeReadout {
  profile: string;
  loom: number;
  dnLeft: number;
  dnRight: number;
  flightLeft: number;
  flightRight: number;
  flight: number;
  escapeDn: number;
  network: number;
  escape: number;
  state: Record<string, number>;
}

export declare function loadFlyEyeProfile(url?: string): Promise<FlyEyeEscapeProfile>;
export declare function validateFlyEyeProfile(profile: FlyEyeEscapeProfile): true;

export declare class EscapeRuntime {
  constructor(profile: FlyEyeEscapeProfile, options?: {
    ticksPerStep?: number;
    decay?: number;
    coupling?: number;
    loomDrive?: number;
  });
  reset(): EscapeReadout;
  step(input?: { looming?: number }): EscapeReadout;
  readout(): EscapeReadout;
}

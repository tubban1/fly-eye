import type { LoadedNeuronGraph } from '@flyeye/graph-core';

export declare const PROFILE_ID: 'flyeye.escape-neuron.v1';
export declare const DEFAULT_MANIFEST_URL: string;
export declare const DEFAULT_GRAPH_URL: string;

export declare function loadEscapeNeuronV1(options?: {
  manifestUrl?: string;
  graphUrl?: string;
  fetch?: typeof fetch;
}): Promise<LoadedNeuronGraph>;

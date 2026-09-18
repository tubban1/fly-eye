import type { LoadedNeuronGraph } from '@flyeye/graph-core';

export declare const PROFILE_ID: 'flyeye.escape-neuron.v1';

export declare function getEscapeNeuronV1AssetUrls(): {
  manifest: URL;
  graph: URL;
  report: URL;
};

export declare function loadEscapeNeuronV1(options?: {
  manifestUrl?: string | URL;
  graphUrl?: string | URL;
  fetch?: typeof fetch;
}): Promise<LoadedNeuronGraph>;

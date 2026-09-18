import { loadNeuronGraph } from '@flyeye/graph-core';

export const PROFILE_ID='flyeye.escape-neuron.v1';
export const DEFAULT_MANIFEST_URL='/data/escape-neuron-v1/manifest.json';
export const DEFAULT_GRAPH_URL='/data/escape-neuron-v1/graph.bin';

export async function loadEscapeNeuronV1(options={}){
  const manifestUrl=options.manifestUrl||DEFAULT_MANIFEST_URL;
  const graphUrl=options.graphUrl||DEFAULT_GRAPH_URL;
  const loaded=await loadNeuronGraph(manifestUrl,graphUrl,options.fetch);
  if(loaded.manifest.profile!==PROFILE_ID){
    throw new Error('Unexpected profile: '+loaded.manifest.profile);
  }
  return loaded;
}

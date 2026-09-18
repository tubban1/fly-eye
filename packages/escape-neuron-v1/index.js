import {
  loadNeuronGraph,
  parseFlyGraph,
  validateNeuronManifest
} from '@fly-eye/graph-core';

export const PROFILE_ID='flyeye.escape-neuron.v1';

export function getEscapeNeuronV1AssetUrls(){
  return {
    manifest:new URL('./data/manifest.json',import.meta.url),
    graph:new URL('./data/graph.bin',import.meta.url),
    report:new URL('./data/report.json',import.meta.url)
  };
}

async function loadFileAssets(urls){
  const { readFile }=await import('node:fs/promises');
  const manifest=JSON.parse(await readFile(urls.manifest,'utf8'));
  validateNeuronManifest(manifest);
  const bytes=await readFile(urls.graph);
  const graph=parseFlyGraph(bytes);
  if(graph.neuronCount!==manifest.neuronCount||graph.edgeCount!==manifest.edgeCount){
    throw new Error('Manifest/graph count mismatch');
  }
  return {manifest,graph};
}

export async function loadEscapeNeuronV1(options={}){
  if(options.manifestUrl||options.graphUrl){
    const manifestUrl=options.manifestUrl||'/data/escape-neuron-v1/manifest.json';
    const graphUrl=options.graphUrl||'/data/escape-neuron-v1/graph.bin';
    const loaded=await loadNeuronGraph(manifestUrl,graphUrl,options.fetch);
    if(loaded.manifest.profile!==PROFILE_ID) throw new Error('Unexpected profile: '+loaded.manifest.profile);
    return loaded;
  }

  const urls=getEscapeNeuronV1AssetUrls();
  const loaded=urls.manifest.protocol==='file:'
    ? await loadFileAssets(urls)
    : await loadNeuronGraph(urls.manifest,urls.graph,options.fetch);

  if(loaded.manifest.profile!==PROFILE_ID) throw new Error('Unexpected profile: '+loaded.manifest.profile);
  return loaded;
}

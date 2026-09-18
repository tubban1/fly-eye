import fs from 'node:fs';
import path from 'node:path';

const out=process.argv[2]||'dist/huggingface/escape-neuron-v1';
fs.rmSync(out,{recursive:true,force:true});
fs.mkdirSync(out,{recursive:true});

const copies=[
  ['public/data/escape-neuron-v1/graph.bin','graph.bin'],
  ['public/data/escape-neuron-v1/manifest.json','manifest.json'],
  ['public/data/escape-neuron-v1/report.json','report.json'],
  ['public/data/escape-fast-v1.json','escape-fast-v1.json'],
  ['publish/huggingface/README.md','README.md'],
  ['CITATION.cff','CITATION.cff'],
  ['DATA_LICENSE.md','DATA_LICENSE.md']
];

for(const [source,target] of copies){
  if(!fs.existsSync(source)) throw new Error('Missing '+source);
  fs.copyFileSync(source,path.join(out,target));
}

console.log('Prepared Hugging Face dataset at '+out);

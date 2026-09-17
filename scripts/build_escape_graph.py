#!/usr/bin/env python3
import argparse, hashlib, json, struct
from pathlib import Path
from collections import deque, defaultdict

MAGIC=b"FLYGRAPH"
HEADER=20

def load_graph(path):
    data=Path(path).read_bytes()
    if data[:8]!=MAGIC: raise ValueError("bad magic")
    version,n,e=struct.unpack_from("<III",data,8)
    if version!=1: raise ValueError(f"unsupported version {version}")
    off=20
    rows=list(struct.unpack_from(f"<{n+1}I",data,off)); off+=4*(n+1)
    pres=list(struct.unpack_from(f"<{e}I",data,off)); off+=4*e
    weights=list(struct.unpack_from(f"<{e}d",data,off))
    return n,e,rows,pres,weights

def groups_by_id(manifest):
    return {g["id"]: g.get("indices",[]) for g in manifest.get("groups",[])}

def build_outgoing(n, rows, pres, weights):
    out=[[] for _ in range(n)]
    for target in range(n):
        for j in range(rows[target],rows[target+1]):
            out[pres[j]].append((target,weights[j]))
    return out

def bfs_forward(seeds,out,max_hops):
    dist={int(x):0 for x in seeds}
    q=deque(dist)
    while q:
        u=q.popleft(); d=dist[u]
        if d>=max_hops: continue
        for v,_ in out[u]:
            if v not in dist:
                dist[v]=d+1; q.append(v)
    return dist

def bfs_reverse(targets,rows,pres,max_hops):
    dist={int(x):0 for x in targets}
    q=deque(dist)
    while q:
        v=q.popleft(); d=dist[v]
        if d>=max_hops: continue
        for j in range(rows[v],rows[v+1]):
            u=pres[j]
            if u not in dist:
                dist[u]=d+1; q.append(u)
    return dist

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--graph",required=True)
    ap.add_argument("--manifest",required=True)
    ap.add_argument("--out-dir",required=True)
    ap.add_argument("--max-hops",type=int,default=3)
    ap.add_argument("--top-dn",type=int,default=32)
    args=ap.parse_args()

    manifest=json.loads(Path(args.manifest).read_text())
    n,e,rows,pres,weights=load_graph(args.graph)
    groups=groups_by_id(manifest)
    loom=list(map(int,groups.get("loom",[])))
    dn=set(map(int,manifest.get("motor",{}).get("dnL",[])+manifest.get("motor",{}).get("dnR",[])))
    flight=set(map(int,groups.get("flightL",[])+groups.get("flightR",[])))
    if not loom: raise ValueError("manifest has no loom/LC4 group")

    out=build_outgoing(n,rows,pres,weights)

    dn_score=defaultdict(float)
    for u in loom:
        for v,w in out[u]:
            if v in dn and w>0: dn_score[v]+=w
    ranked=[v for v,_ in sorted(dn_score.items(),key=lambda kv:(-kv[1],kv[0]))[:args.top_dn]]
    targets=set(ranked)|flight
    if not targets: raise ValueError("no escape targets found")

    fd=bfs_forward(loom,out,args.max_hops)
    rd=bfs_reverse(targets,rows,pres,args.max_hops)

    selected=set(loom)|targets
    for v,d1 in fd.items():
        d2=rd.get(v)
        if d2 is not None and d1+d2<=args.max_hops:
            selected.add(v)

    old=sorted(selected)
    remap={v:i for i,v in enumerate(old)}
    new_rows=[0]
    new_pres=[]
    new_weights=[]
    for target_old in old:
        pairs=[]
        for j in range(rows[target_old],rows[target_old+1]):
            src=pres[j]
            if src in remap:
                pairs.append((remap[src],weights[j]))
        pairs.sort(key=lambda x:x[0])
        for src,w in pairs:
            new_pres.append(src); new_weights.append(w)
        new_rows.append(len(new_pres))

    out_dir=Path(args.out_dir); out_dir.mkdir(parents=True,exist_ok=True)
    buf=bytearray()
    buf+=MAGIC
    buf+=struct.pack("<III",1,len(old),len(new_pres))
    buf+=struct.pack(f"<{len(new_rows)}I",*new_rows)
    if new_pres: buf+=struct.pack(f"<{len(new_pres)}I",*new_pres)
    if new_weights: buf+=struct.pack(f"<{len(new_weights)}d",*new_weights)
    graph_path=out_dir/"graph.bin"
    graph_path.write_bytes(buf)

    def remap_list(xs):
        return [remap[int(x)] for x in xs if int(x) in remap]

    new_groups=[]
    for g in manifest.get("groups",[]):
        idx=remap_list(g.get("indices",[]))
        if idx:
            ng={k:v for k,v in g.items() if k!="indices"}
            ng["indices"]=idx; ng["count"]=len(idx)
            new_groups.append(ng)

    new_motor={}
    for k,xs in manifest.get("motor",{}).items():
        if isinstance(xs,list):
            new_motor[k]=remap_list(xs)

    source_hash=hashlib.sha256(Path(args.graph).read_bytes()).hexdigest()
    graph_hash=hashlib.sha256(buf).hexdigest()
    out_manifest={
        "schemaVersion":1,
        "dataset":"MaleCNS v1.0",
        "profile":"escape-v1",
        "purpose":"LC4 looming-to-descending-neuron escape corridor",
        "neuronCount":len(old),
        "edgeCount":len(new_pres),
        "graphBytes":len(buf),
        "graphSha256":graph_hash,
        "sourceGraphSha256":source_hash,
        "sourceNeuronCount":n,
        "sourceEdgeCount":e,
        "sourceUpstreamCommit":"bff49a376f0844c918eb7f2be83e95f2699b0d14",
        "selection":{
            "seedGroup":"loom",
            "maxHops":args.max_hops,
            "topDirectPositiveDnTargets":args.top_dn,
            "includeFlightGroups":True,
            "rule":"nodes on any seed-to-target path with forwardDistance + reverseDistance <= maxHops"
        },
        "groups":new_groups,
        "motor":new_motor,
        "sourceIndexByLocalIndex":old,
        "sourceBodyIdByLocalIndex":[manifest.get("bodyIds",[])[i] if i < len(manifest.get("bodyIds",[])) else None for i in old],
        "attribution":manifest.get("attribution","Janelia FlyEM MaleCNS"),
        "license":"CC BY 4.0 for underlying MaleCNS data; retain source attribution"
    }
    (out_dir/"manifest.json").write_text(json.dumps(out_manifest,indent=2))
    print(json.dumps({
        "neurons":len(old),
        "edges":len(new_pres),
        "bytes":len(buf),
        "MiB":round(len(buf)/1048576,3),
        "escapeTargets":len(ranked),
        "sha256":graph_hash
    },indent=2))

if __name__=="__main__":
    main()

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any
import json
import struct
import urllib.request

MAGIC = b"FLYGRAPH"


@dataclass(frozen=True)
class FlyGraph:
    version: int
    neuron_count: int
    edge_count: int
    row_offsets: tuple[int, ...]
    presynaptic_indices: tuple[int, ...]
    weights: tuple[float, ...]


def _read_bytes(source: str | Path) -> bytes:
    text = str(source)
    if text.startswith(("http://", "https://")):
        with urllib.request.urlopen(text) as response:
            return response.read()
    return Path(source).read_bytes()


def load_profile(source: str | Path) -> dict[str, Any]:
    return json.loads(_read_bytes(source).decode("utf-8"))


def load_flygraph(source: str | Path) -> FlyGraph:
    data = _read_bytes(source)
    if data[:8] != MAGIC:
        raise ValueError("invalid FLYGRAPH magic")
    version, n, e = struct.unpack_from("<III", data, 8)
    if version != 1:
        raise ValueError(f"unsupported FLYGRAPH version {version}")
    offset = 20
    rows = struct.unpack_from(f"<{n + 1}I", data, offset)
    offset += 4 * (n + 1)
    presyn = struct.unpack_from(f"<{e}I", data, offset)
    offset += 4 * e
    weights = struct.unpack_from(f"<{e}d", data, offset)
    expected = offset + 8 * e
    if expected != len(data):
        raise ValueError(f"byte length mismatch: {len(data)} != {expected}")
    return FlyGraph(version, n, e, rows, presyn, weights)


def load_neuron_profile(manifest_source: str | Path, graph_source: str | Path):
    manifest = load_profile(manifest_source)
    graph = load_flygraph(graph_source)
    if manifest.get("neuronCount") != graph.neuron_count:
        raise ValueError("manifest/graph neuron count mismatch")
    if manifest.get("edgeCount") != graph.edge_count:
        raise ValueError("manifest/graph edge count mismatch")
    return manifest, graph


def incoming_edges(graph: FlyGraph, target: int) -> list[tuple[int, int, float]]:
    if target < 0 or target >= graph.neuron_count:
        raise IndexError(target)
    return [
        (graph.presynaptic_indices[i], target, graph.weights[i])
        for i in range(graph.row_offsets[target], graph.row_offsets[target + 1])
    ]


def build_outgoing(graph: FlyGraph) -> list[list[tuple[int, float]]]:
    outgoing: list[list[tuple[int, float]]] = [[] for _ in range(graph.neuron_count)]
    for target in range(graph.neuron_count):
        for i in range(graph.row_offsets[target], graph.row_offsets[target + 1]):
            outgoing[graph.presynaptic_indices[i]].append((target, graph.weights[i]))
    return outgoing


def to_networkx(graph: FlyGraph, manifest: dict[str, Any] | None = None):
    try:
        import networkx as nx
    except ImportError as exc:
        raise RuntimeError("Install flyeye-graphs[networkx] to use to_networkx()") from exc

    g = nx.DiGraph()
    body_ids = (manifest or {}).get("bodyIds") or []
    for index in range(graph.neuron_count):
        attrs = {"index": index}
        if index < len(body_ids):
            attrs["body_id"] = str(body_ids[index])
        g.add_node(index, **attrs)

    for target in range(graph.neuron_count):
        for source, _, weight in incoming_edges(graph, target):
            g.add_edge(source, target, weight=weight)

    return g

# flyeye-graphs (Python)

Python access to FlyEye aggregate and neuron-level graph assets.

\`\`\`python
from flyeye_graphs import load_neuron_profile, to_networkx

manifest, graph = load_neuron_profile(
    "manifest.json",
    "graph.bin",
)

print(graph.neuron_count, graph.edge_count)
G = to_networkx(graph, manifest)
\`\`\`

The core package uses only the Python standard library. NetworkX support is optional.

import json
import struct
import tempfile
import unittest
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from flyeye_graphs import load_flygraph, load_neuron_profile, incoming_edges, build_outgoing


def graph_bytes():
    n = 3
    rows = [0, 0, 1, 2]
    presyn = [0, 1]
    weights = [1000.0, 500.0]
    data = bytearray()
    data += b"FLYGRAPH"
    data += struct.pack("<III", 1, n, len(presyn))
    data += struct.pack("<4I", *rows)
    data += struct.pack("<2I", *presyn)
    data += struct.pack("<2d", *weights)
    return bytes(data)


class FlyEyePythonSdkTests(unittest.TestCase):
    def test_load_and_edges(self):
        with tempfile.TemporaryDirectory() as tmp:
            tmp = Path(tmp)
            graph_path = tmp / "graph.bin"
            manifest_path = tmp / "manifest.json"
            graph_path.write_bytes(graph_bytes())
            manifest_path.write_text(json.dumps({
                "profile": "flyeye.test.v1",
                "neuronCount": 3,
                "edgeCount": 2,
                "bodyIds": ["1", "2", "3"],
                "groups": [{"id": "loom", "indices": [0]}],
            }))

            manifest, graph = load_neuron_profile(manifest_path, graph_path)
            self.assertEqual(graph.neuron_count, 3)
            self.assertEqual(graph.edge_count, 2)
            self.assertEqual(incoming_edges(graph, 1), [(0, 1, 1000.0)])
            outgoing = build_outgoing(graph)
            self.assertEqual(outgoing[0], [(1, 1000.0)])
            self.assertEqual(manifest["profile"], "flyeye.test.v1")


if __name__ == "__main__":
    unittest.main()

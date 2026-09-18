# FlyEye Launch Campaign

Canonical public links:

- Live demo: https://fly.fde.fan
- GitHub: https://github.com/tubban1/fly-eye
- Release: https://github.com/tubban1/fly-eye/releases/tag/v0.5.0-alpha.9
- Dataset: https://huggingface.co/datasets/Tubban/flyeye-escape-neuron-v1
- PyPI: https://pypi.org/project/flyeye-graphs/0.1.0/
- npm scope: https://www.npmjs.com/search?q=%40fly-eye

## Positioning

**One-line:** FlyEye is a developer kit for turning real Drosophila connectome-derived wiring into runnable neural circuits.

**Demo hook:** Let a fly brain see your world.

**Scientific boundary:** The wiring is connectome-derived. Camera encoding and neural dynamics are modeled; FlyEye is not a complete biological fly-brain simulation.

## Launch order

1. GitHub / live demo foundation
2. Hacker News
3. r/neuroscience, r/compneuro, r/bioinformatics, and developer communities where self-promotion rules allow
4. X
5. LinkedIn
6. Hugging Face dataset discussion / community
7. Chinese developer and science communities

Use the live demo for broad audiences and GitHub for developers/researchers.

## Show HN

**Title**

Show HN: FlyEye – Run a real fly connectome-derived escape circuit in your browser

**Post**

I built FlyEye, a browser experiment and developer kit that connects real-world camera input to a compact neural circuit derived from the Drosophila MaleCNS connectome.

The public neuron-level graph currently contains 3,376 neurons and 78,797 signed edges. The browser experience turns camera-derived looming/approach signals into modeled LC4 input and propagates activity through the selected connectome-derived escape circuit.

The wiring is real connectome-derived data; the camera encoder and neural dynamics are models. This is not a claim of biologically exact vision or a complete fly-brain simulation.

I also packaged the reusable pieces so they can be used outside the demo:
- five npm packages under @fly-eye
- a Python SDK on PyPI
- the compact graph + manifest/report on Hugging Face
- versioned release assets and checksums on GitHub

Demo: https://fly.fde.fan
GitHub: https://github.com/tubban1/fly-eye

I’d especially value feedback on the graph format, runtime API, scientific boundary wording, and what connectome-derived circuit would be most useful to expose next.

## X

A fly brain can now see your world.

I just released FlyEye: an open developer kit + browser experiment built on real Drosophila connectome-derived wiring.

3,376 neurons.
78,797 signed edges.
Runnable in the browser.
Reusable from npm + PyPI.
Dataset on Hugging Face.

The wiring is connectome-derived; perception + neural dynamics are explicitly modeled.

Try it → https://fly.fde.fan
Code → https://github.com/tubban1/fly-eye

#connectomics #neuroscience #opensource #webdev

## LinkedIn

I’ve released FlyEye, an open-source browser experiment and developer kit for turning real Drosophila connectome-derived wiring into runnable neural circuits.

The current public escape-circuit dataset contains 3,376 neurons and 78,797 signed edges. In the browser demo, real-world camera motion and looming are converted into modeled neural input, then propagated through a compact MaleCNS-derived circuit.

A key design goal was to keep the scientific boundary explicit: the wiring is connectome-derived, while camera encoding and neural dynamics are models. FlyEye does not claim to reproduce a complete living fly brain.

The project is now available as:
- JavaScript/TypeScript packages on npm
- Python tooling on PyPI
- a public dataset on Hugging Face
- versioned assets and checksums on GitHub Releases

Live demo: https://fly.fde.fan
GitHub: https://github.com/tubban1/fly-eye

I’m particularly interested in feedback from people working in connectomics, computational neuroscience, graph tooling, browser simulation, and scientific visualization.

## Reddit

**Suggested title**

I built an open browser demo that runs a 3,376-neuron Drosophila connectome-derived escape circuit

**Body**

I’ve been working on FlyEye, an open-source browser experiment + developer kit around a compact Drosophila MaleCNS-derived escape circuit.

The public graph contains 3,376 neurons and 78,797 signed edges. The demo uses camera-derived looming/approach signals as modeled input and then propagates activity through the selected connectome-derived wiring.

Important boundary: I’m not presenting this as a biologically exact retina or a complete fly-brain simulation. The wiring is connectome-derived; the perception encoder and neural dynamics are modeled.

The reusable pieces are published through npm, PyPI, Hugging Face and GitHub Releases.

Demo: https://fly.fde.fan
Source: https://github.com/tubban1/fly-eye

I’d appreciate technical/scientific criticism, especially around what would make this more useful as a reusable connectome developer tool rather than just a demo.

## Hugging Face discussion

**Title**

FlyEye escape-neuron-v1: 3,376-neuron / 78,797-edge compact MaleCNS-derived graph

**Body**

We have published the first FlyEye compact neuron-level dataset together with the browser/runtime developer kit.

Dataset:
https://huggingface.co/datasets/Tubban/flyeye-escape-neuron-v1

It contains a 3,376-neuron / 78,797 signed-edge compact graph, manifest, report, aggregate fast profile, citation metadata and licensing information.

The graph is intended for reproducible browser/Python experiments and tooling. FlyEye explicitly separates connectome-derived wiring from modeled perception and neural dynamics.

Demo:
https://fly.fde.fan

Repository:
https://github.com/tubban1/fly-eye

Feedback on schema, provenance, graph ergonomics, and useful downstream tasks is welcome.

## Chinese launch post

**标题**

我把真实果蝇连接组的一段神经回路做成了可以直接运行的开源 Developer Kit

**正文**

FlyEye 正式开放。

它不是“随机生成一堆神经元动画”，而是把真实 Drosophila MaleCNS 连接组中筛选出的神经连接，整理成可以在浏览器、JavaScript 和 Python 中直接使用的开发工具。

目前公开的 neuron-level graph 包含：

- 3,376 个神经元
- 78,797 条 signed edges
- npm 5 个开发包
- PyPI Python SDK
- Hugging Face dataset
- GitHub Release + checksums

在线 Demo 会把摄像头中的接近 / looming 信号转换成模型输入，注入 LC4，再沿选定的真实 connectome-derived wiring 传播。

需要特别说明：真实的是连接结构；摄像头编码和神经动力学是模型。它不是完整果蝇大脑的生物学复刻。

在线体验：
https://fly.fde.fan

GitHub：
https://github.com/tubban1/fly-eye

如果你做计算神经科学、connectomics、图计算、WebGPU/Web simulation 或科学可视化，我非常希望听到你的建议。

# Contributing to Legocraft

Legocraft is an open-source browser-based 3D brick-building sandbox. Contributions that improve the builder, developer experience, documentation, testing, performance, and WebXR behavior are welcome.

## Ways to contribute

You can contribute in several ways:

- test the live builder and report reproducible interaction or compatibility problems
- add or improve brick shapes and generated geometry
- create and validate preset structures
- improve desktop, touch, selection, camera, export, or WebXR behavior
- add focused automated tests
- improve documentation and contributor examples
- propose non-code spatial or interaction concepts that fit the current builder

### Non-code proposals

Designers and technical artists may open an issue with a concept before implementation. Useful proposals can include sketches, diagrams, reference layouts, preset specifications, interaction flows, accessibility observations, or clearly described construction challenges.

A proposal should explain:

- what should change or be added
- how it fits the existing Legocraft builder
- what the user should be able to do
- any constraints or edge cases that matter

If an accepted proposal is implemented by someone else, the original proposal should be referenced in the implementation issue or pull request so the contribution remains attributable.

## Useful contribution areas

- new brick types and custom geometry
- new preset structures
- desktop and touch interaction improvements
- WebXR controller compatibility
- Meta Quest testing and performance work
- editing tools and selection workflows
- export improvements
- automated tests
- documentation

For a map of the codebase and common extension paths, see [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md). For current hardware validation work, see [`docs/QUEST_QA.md`](docs/QUEST_QA.md).

## Development setup

Clone the repository and install dependencies:

```bash
git clone https://github.com/Joenasriani/legocraft.git
cd legocraft
npm install
```

Start the development server:

```bash
npm run dev
```

## Before opening a pull request

Run:

```bash
npm run test
npm run lint
npm run build
```

Please keep pull requests focused and describe:

- what changed
- why it changed
- how it was tested
- any browser or WebXR limitations

## WebXR and Quest changes

Do not claim Meta Quest compatibility unless the change was tested on real hardware.

When contributing Quest-specific work, include the tested device, Quest OS version, Quest Browser version, and the result. The current QA matrix is in `docs/QUEST_QA.md`.

## Issues

Use GitHub Issues for reproducible bugs, focused feature requests, and hardware compatibility findings.

For bugs, include the browser/device, steps to reproduce, expected behavior, and actual behavior.

## License

By contributing, you agree that your contributions will be licensed under the MIT License used by this repository.

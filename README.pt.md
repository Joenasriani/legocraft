# Legocraft

<p align="center">
[English](README.md) · [Français](README.fr.md) · [Español](README.es.md) · [Português](README.pt.md) · [العربية](README.ar.md) · [简体中文](README.zh-CN.md) · [日本語](README.ja.md) · [हिन्दी](README.hi.md) · [한국어](README.ko.md)
</p>

<p align="center">
  <img src="docs/screenshots/Brick%20XR%20Builder%20App%20Showcase.png" alt="Legocraft browser 3D brick-building sandbox showcase" width="100%">
</p>

[![CI](https://github.com/Joenasriani/legocraft/actions/workflows/ci.yml/badge.svg)](https://github.com/Joenasriani/legocraft/actions/workflows/ci.yml)

Sandbox 3D de construção com blocos para navegador, desenvolvido com React Three Fiber, Three.js e WebXR.

Construa e edite estruturas digitais de blocos no navegador com controles de desktop ou toque, salve e reabra projetos, exporte criações e experimente o mesmo ambiente de trabalho em WebXR.

> **Status do projeto:** Experimental. As interações em desktop e toque estão implementadas. A funcionalidade WebXR está presente, mas a validação em hardware Meta Quest real ainda não foi concluída. Consulte `docs/QUEST_QA.md`.

## Experimente

Aplicação ao vivo: https://legocraftvr.vercel.app/

## Para desenvolvedores

Legocraft também é um exemplo inspecionável de um sistema de construção 3D no navegador: posicionamento com encaixe em grade, geometria de blocos gerada, seleção de objetos conectados, persistência local, exportação GLB e interação experimental com controladores WebXR coexistem na mesma base de código React Three Fiber.

- [Explorar a arquitetura](docs/ARCHITECTURE.md)
- [Contribuir](CONTRIBUTING.md)
- [Revisar a matriz QA WebXR / Quest](docs/QUEST_QA.md)

## Recursos

- Posicionar, mover, girar, recolorir e excluir blocos em uma grade 3D com encaixe
- Vários tamanhos de blocos retangulares, além de formas redondas, cones, domos, inclinações, curvas, cunhas, triângulos e arcos
- Seleção individual, múltipla e por grupo conectado
- Copiar/colar, desfazer e refazer
- Presets integrados: Cavalo, Ovelha, Carro, Estrada, Montanha, Árvore, Cabana, Poço, Pinheiro e Castelo
- Persistência local no navegador
- Salvar e importar dados do projeto como `.json`
- Exportar a estrutura atual como `.glb`
- Exportar capturas como `.png`
- Interação desktop e touch
- Modos de câmera órbita, pan e zoom
- Atalhos de teclado para salvar, copiar/colar, excluir e editar
- Restauração automática de construções salvas localmente ao iniciar
- Modo WebXR experimental com controladores, háptica, locomoção, snap turn e menus VR

## Executar localmente

### Requisitos

- Node.js 22 recomendado
- npm
- Um navegador com suporte a WebGL

### Instalar

```bash
git clone https://github.com/Joenasriani/legocraft.git
cd legocraft
npm install
```

### Iniciar o servidor de desenvolvimento

```bash
npm run dev
```

O servidor de desenvolvimento Vite está configurado para a porta `3000`.

Uma primeira execução bem-sucedida deve carregar o ambiente de construção 3D no navegador e permitir posicionar e manipular blocos.

### Verificar o projeto

```bash
npm run test
npm run lint
npm run build
```

Esses comandos são definidos em `package.json` e verificados pelo GitHub Actions com Node.js 22.

## Arquivos do projeto e exportação

- Salvar/importar projeto `.json`
- Exportação 3D `.glb`
- Capturas `.png`
- Persistência local automática no navegador

A captura de tela é best-effort e pode depender do comportamento WebGL do navegador.

## Verificação e compatibilidade

O GitHub Actions verifica atualmente o repositório com Node.js 22 usando:

- `npm ci`
- `npm run test`
- `npm run lint`
- `npm run build`

Status atual de compatibilidade:

| Ambiente | Status |
| --- | --- |
| Build de produção | Verificado pelo CI |
| Testes automatizados | Verificados pelo CI |
| Verificação TypeScript | Verificada pelo CI |
| Interação em navegador desktop | Implementada; sem matriz formal entre navegadores |
| Interação touch | Implementada; sem matriz formal de dispositivos |
| WebXR | Experimental |
| Hardware Meta Quest | Ainda não testado em hardware real |

## Status do WebXR

A interação WebXR está implementada, incluindo entrada de controladores, feedback háptico, menus VR, controles de locomoção e snap turn.

Testes em hardware Meta Quest real **ainda não** foram concluídos, então compatibilidade e desempenho específicos para Quest devem ser tratados como experimentais, não garantidos.

Consulte [`docs/QUEST_QA.md`](docs/QUEST_QA.md) para a matriz QA de hardware atual.

## Construir sobre o Legocraft

Qualquer ideia é bem-vinda se puder produzir uma melhoria real, experimento, recurso, design, ferramenta, ganho de desempenho, ganho de acessibilidade ou extensão útil.

O jogo atual é o ponto de partida, não o limite.

Formas concretas de explorar ou ampliar o projeto:

- **Jogue:** experimente o construtor atual e identifique uma interação ou fluxo que valha melhorar.
- **Explore o código:** use [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) para encontrar o subsistema relevante.
- **Adicione um bloco:** amplie as definições de blocos e a geometria gerada.
- **Crie um preset:** adicione e valide uma estrutura reutilizável usando o sistema atual de presets.
- **Melhore a interação:** trabalhe em desktop, touch, seleção, edição ou câmera.
- **Teste WebXR:** execute o procedimento QA do Quest e relate resultados de hardware reais.
- **Melhore XR:** trabalhe em compatibilidade de controladores, locomoção, háptica, UI VR ou desempenho.
- **Melhore a confiabilidade:** adicione testes focados para posicionamento, seleção, presets ou lógica compartilhada.
- **Abra uma issue:** discuta mudanças maiores ou limitações reproduzíveis antes de implementar.
- **Envie uma pull request:** mantenha a alteração focada e execute os comandos CI existentes.

Legocraft é open source sob licença MIT. Você pode fazer fork, modificar, ampliar e redistribuir conforme os termos de [`LICENSE`](LICENSE). Consulte [`CONTRIBUTING.md`](CONTRIBUTING.md) para o fluxo de contribuição.

### Pontos de entrada atuais para contribuição

- [Validação e extensão WebXR / Meta Quest](https://github.com/Joenasriani/legocraft/issues/1)
- [Mover a validação de presets para cobertura automatizada com Vitest](https://github.com/Joenasriani/legocraft/issues/2)
- [Expandir cobertura automatizada das regras de posicionamento e seleção](https://github.com/Joenasriani/legocraft/issues/3)

### Contribuições criativas e espaciais

Nem toda contribuição útil exige código. Designers e artistas técnicos podem propor, por meio de uma issue no GitHub, estruturas preset, composições espaciais, novos conceitos de formas, fluxos de interação, desafios de construção ou melhorias de acessibilidade. Esboços, diagramas, layouts de referência e notas claras de comportamento são úteis quando descrevem algo compatível com o construtor existente.

Contribuições aceitas recebem crédito pelo histórico do Git e pelo registro de pull requests; autores de propostas devem ser referenciados na discussão de implementação quando outra pessoa transformar um conceito aceito em código.

### Fronteira WebXR / Quest

Legocraft já inclui interação WebXR experimental, entrada de controladores, locomoção, háptica, menus VR e fluxos de construção específicos de XR. A validação em hardware Meta Quest real continua em aberto. A camada XR é documentada e intencionalmente extensível para desenvolvedores que queiram testá-la, melhorá-la, otimizá-la ou levá-la adiante.

## Stack

- React
- TypeScript
- Three.js
- React Three Fiber
- `@react-three/drei`
- `@react-three/xr`
- Zustand
- Vite
- Vitest

**Criado por Joe Nasr** — Experiências interativas, 3D e WebXR.

https://joe-nasr-signals.vercel.app/

# Legocraft

<p align="center">
  <a href="README.md">English</a> ·
  <a href="README.fr.md">Français</a> ·
  <a href="README.es.md">Español</a> ·
  <a href="README.pt.md">Português</a> ·
  <a href="README.ar.md">عربي</a> ·
  <a href="README.zh-CN.md">简体中文</a> ·
  <a href="README.ja.md">日本語</a> ·
  <a href="README.hi.md">हिन्दी</a> ·
  <a href="README.ko.md">한국어</a>
</p>

<p align="center">
  <img src="docs/screenshots/Brick%20XR%20Builder%20App%20Showcase.png" alt="Legocraft browser 3D brick-building sandbox showcase" width="100%">
</p>

[![CI](https://github.com/Joenasriani/legocraft/actions/workflows/ci.yml/badge.svg)](https://github.com/Joenasriani/legocraft/actions/workflows/ci.yml)

React Three Fiber, Three.js, WebXR로 만든 오픈소스 브라우저 기반 3D 브릭 빌딩 샌드박스입니다.

데스크톱 또는 터치 조작으로 브라우저에서 디지털 브릭 구조물을 만들고 편집하며, 프로젝트를 저장하고 다시 불러오고, 결과물을 내보내고, 같은 작업 공간을 WebXR에서 실험할 수 있습니다.

> **프로젝트 상태:** 실험적입니다. 데스크톱과 터치 상호작용은 구현되어 있습니다. WebXR 기능도 존재하지만 실제 Meta Quest 하드웨어 QA는 아직 완료되지 않았습니다. `docs/QUEST_QA.md`를 참고하세요.

## 체험하기

라이브 애플리케이션: https://legocraftvr.vercel.app/

## 개발자를 위해

Legocraft는 브라우저 기반 3D 제작 시스템을 직접 살펴볼 수 있는 예제이기도 합니다. 그리드 스냅 배치, 생성형 브릭 지오메트리, 연결 오브젝트 선택, 로컬 영속성, GLB 내보내기, 실험적 WebXR 컨트롤러 상호작용이 하나의 React Three Fiber 코드베이스 안에 있습니다.

- [아키텍처 살펴보기](docs/ARCHITECTURE.md)
- [기여하기](CONTRIBUTING.md)
- [WebXR / Quest QA 매트릭스 보기](docs/QUEST_QA.md)

## 기능

- 스냅되는 3D 빌딩 그리드에서 브릭 배치, 이동, 회전, 색상 변경, 삭제
- 다양한 직사각형 브릭 크기와 라운드, 콘, 돔, 슬로프, 커브, 웨지, 삼각형, 아치 형태
- 단일, 다중 오브젝트, 연결 그룹 선택
- 복사/붙여넣기, 실행 취소, 다시 실행
- 기본 프리셋: Horse, Sheep, Car, Road, Mountain, Tree, Cabin, Water Well, Pine Tree, Castle
- 브라우저 로컬 영속성
- `.json` 프로젝트 저장 및 불러오기
- 현재 구조를 `.glb`로 내보내기
- `.png` 스크린샷 내보내기
- 데스크톱 및 터치 상호작용
- Orbit, Pan, Zoom 카메라 모드
- 저장, 복사/붙여넣기, 삭제, 편집을 위한 키보드 단축키
- 시작 시 로컬 저장 빌드 자동 복원
- 컨트롤러, 햅틱, 이동, Snap Turn, VR 메뉴를 포함한 실험적 WebXR 모드

## 로컬 실행

### 요구 사항

- Node.js 22 권장
- npm
- WebGL을 지원하는 브라우저

### 설치

```bash
git clone https://github.com/Joenasriani/legocraft.git
cd legocraft
npm install
```

### 개발 서버 시작

```bash
npm run dev
```

Vite 개발 서버는 포트 `3000`으로 설정되어 있습니다.

정상적으로 실행되면 브라우저에서 3D 빌딩 작업 공간이 열리고 브릭을 배치하고 조작할 수 있어야 합니다.

### 프로젝트 검증

```bash
npm run test
npm run lint
npm run build
```

이 명령들은 `package.json`에 정의되어 있으며 Node.js 22 환경의 GitHub Actions에서 검증됩니다.

## 프로젝트 파일 및 내보내기

- `.json` 프로젝트 저장/불러오기
- `.glb` 3D 내보내기
- `.png` 스크린샷
- 브라우저 자동 로컬 영속성

스크린샷 캡처는 best-effort이며 브라우저 WebGL 동작에 따라 달라질 수 있습니다.

## 검증 및 호환성

GitHub Actions는 현재 Node.js 22에서 다음을 실행합니다.

- `npm ci`
- `npm run test`
- `npm run lint`
- `npm run build`

현재 호환 상태:

| 환경 | 상태 |
| --- | --- |
| 프로덕션 빌드 | CI 검증 완료 |
| 자동화 테스트 | CI 검증 완료 |
| TypeScript 검사 | CI 검증 완료 |
| 데스크톱 브라우저 상호작용 | 구현됨; 공식 크로스 브라우저 매트릭스는 아직 없음 |
| 터치 상호작용 | 구현됨; 공식 기기 매트릭스는 아직 없음 |
| WebXR | 실험적 |
| Meta Quest 하드웨어 | 실제 하드웨어에서 아직 테스트하지 않음 |

## WebXR 상태

컨트롤러 입력, 햅틱 피드백, VR 메뉴, 이동 제어, Snap Turn을 포함한 WebXR 상호작용이 구현되어 있습니다.

실제 Meta Quest 하드웨어 테스트는 **아직** 완료되지 않았으므로 Quest 전용 호환성과 성능은 보장된 것이 아니라 실험적인 것으로 간주해야 합니다.

현재 하드웨어 QA 매트릭스는 [`docs/QUEST_QA.md`](docs/QUEST_QA.md)를 참고하세요.

## Legocraft 확장하기

실질적인 개선, 실험, 기능, 디자인, 도구, 성능 향상, 접근성 향상 또는 유용한 확장으로 이어질 수 있는 아이디어라면 무엇이든 환영합니다.

현재 게임은 출발점이지 한계가 아닙니다.

구체적인 참여 방법:

- **플레이:** 현재 빌더를 사용해 보고 개선할 가치가 있는 상호작용이나 워크플로를 찾습니다.
- **코드 탐색:** [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)에서 관련 서브시스템을 찾습니다.
- **브릭 추가:** 브릭 정의와 생성 지오메트리를 확장합니다.
- **프리셋 제작:** 기존 프리셋 시스템으로 재사용 가능한 구조를 추가하고 검증합니다.
- **상호작용 개선:** 데스크톱, 터치, 선택, 편집, 카메라 동작을 개선합니다.
- **WebXR 테스트:** Quest QA 절차를 실행하고 실제 하드웨어 결과를 보고합니다.
- **XR 개선:** 컨트롤러 호환성, 이동, 햅틱, VR UI 또는 성능을 개선합니다.
- **신뢰성 개선:** 배치, 선택, 프리셋 또는 공유 도메인 로직에 대한 집중 테스트를 추가합니다.
- **Issue 열기:** 큰 변경이나 재현 가능한 제약 사항을 구현 전에 논의합니다.
- **Pull Request 제출:** 변경 범위를 집중시키고 기존 CI 명령을 실행합니다.

Legocraft는 MIT License 기반 오픈소스입니다. [`LICENSE`](LICENSE) 조건에 따라 fork, 수정, 확장, 재배포할 수 있습니다. 기여 흐름은 [`CONTRIBUTING.md`](CONTRIBUTING.md)를 참고하세요.

### 현재 기여 진입점

- [WebXR / Meta Quest 하드웨어 검증 및 확장](https://github.com/Joenasriani/legocraft/issues/1)
- [프리셋 검증을 자동화된 Vitest 커버리지로 이동](https://github.com/Joenasriani/legocraft/issues/2)
- [배치 및 선택 규칙 자동화 테스트 확대](https://github.com/Joenasriani/legocraft/issues/3)

### 크리에이티브 및 공간 기여

유용한 기여라고 해서 모두 코딩이 필요한 것은 아닙니다. 디자이너와 테크니컬 아티스트는 GitHub Issue를 통해 프리셋 구조, 공간 구성, 새로운 형태 아이디어, 상호작용 흐름, 건축 과제 또는 접근성 개선을 제안할 수 있습니다. 기존 빌더와 호환되는 내용을 설명한다면 명확한 스케치, 다이어그램, 참고 레이아웃, 동작 노트가 유용합니다.

채택된 기여는 Git 기록과 Pull Request 기록을 통해 크레딧됩니다. 채택된 아이디어를 다른 사람이 코드로 구현할 경우 구현 논의에서 원 제안자를 참조해야 합니다.

### WebXR / Quest 프런티어

Legocraft에는 이미 실험적 WebXR 상호작용, 컨트롤러 입력, 이동, 햅틱, VR 메뉴, XR 전용 빌딩 워크플로가 포함되어 있습니다. 실제 Meta Quest 하드웨어 검증은 아직 열려 있습니다. XR 레이어는 문서화되어 있으며 개발자가 테스트, 개선, 최적화하거나 더 확장할 수 있도록 의도적으로 확장 가능하게 설계되어 있습니다.

## 스택

- React
- TypeScript
- Three.js
- React Three Fiber
- `@react-three/drei`
- `@react-three/xr`
- Zustand
- Vite
- Vitest

**Joe Nasr 제작** — 인터랙티브 경험, 3D 및 WebXR.

https://joe-nasr-signals.vercel.app/

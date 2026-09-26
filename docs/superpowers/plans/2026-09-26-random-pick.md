# Random Pick 웹사이트 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 숫자 범위를 조정해 알파벳과 정수를 동시에 뽑는 TypeScript 웹사이트를 GitHub Pages에 게시한다.

**Architecture:** Vite 정적 사이트다. 범위 검증과 난수 생성은 `src/picker.ts`에, DOM 상태와 애니메이션은 `src/main.ts`에 둔다. GitHub Actions가 검사 후 빌드 결과를 Pages에 배포한다.

**Tech Stack:** TypeScript, Vite, Vitest, jsdom, CSS, GitHub Actions/Pages, npm

**Spec:** `docs/superpowers/specs/2026-09-26-random-pick-design.md`

## Global Constraints

- 기본 숫자 범위는 `1`~`100`; 알파벳은 `A`~`Z`다.
- 두 범위 입력은 안전한 정수, `min <= max`, `max - min + 1`도 안전한 정수여야 한다. 0과 음수를 허용한다.
- 버튼 하나가 두 슬롯을 함께 추첨한다. 애니메이션은 약 1.5초이며 움직임 줄이기 설정에서는 생략한다.
- 좁은 화면과 키보드 사용을 지원하고, 오류와 최종 결과를 보조 기술에 알린다.
- Vite `base`는 `/random-pick/`; Pages 배포 소스는 GitHub Actions다.

## Review Focus

- 공백이나 소수 입력은 숫자로 묵인되지 않고 오류가 표시된다. Task 1의 검증 테스트와 Task 2의 폼 테스트에서 확인한다.
- 두 경계값이 같으면 그 숫자만 나온다. Task 1 테스트에서 확인한다.
- 범위 너비가 안전 정수를 넘으면 추첨이 막힌다. Task 1 테스트에서 확인한다.
- 회전 중 빠른 재클릭은 두 번째 추첨을 시작하지 않는다. Task 2 테스트에서 확인한다.
- 움직임 줄이기 환경에서는 회전 없이 최종 값과 안내가 즉시 나온다. Task 2 테스트에서 확인한다.

---

### Task 1: 프로젝트 기반과 추첨 로직

**Files:**
- Create: `package.json`, `package-lock.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `.gitignore`
- Create: `src/picker.ts`, `src/picker.test.ts`

**Interfaces:**
- Produces: `type Range = { min: number; max: number }`
- Produces: `type RangeValidation = { ok: true; range: Range } | { ok: false; field: 'min' | 'max' | 'range'; message: string }`
- Produces: `validateRange(minText: string, maxText: string): RangeValidation`
- Produces: `pickInteger(min: number, max: number, sample53?: () => bigint): number` and `pickLetter(sample53?: () => bigint): string`

- [ ] **Step 1: Add package scripts and test tooling, then write failing tests** for the following assertions:

  ```ts
  expect(validateRange('1', '100')).toEqual({ ok: true, range: { min: 1, max: 100 } })
  expect(validateRange('-2', '2')).toEqual({ ok: true, range: { min: -2, max: 2 } })
  expect(validateRange('', '10')).toMatchObject({ ok: false, field: 'min' })
  expect(validateRange('1.5', '10')).toMatchObject({ ok: false, field: 'min' })
  expect(validateRange('10', '1')).toMatchObject({ ok: false, field: 'range' })
  expect(validateRange('9007199254740992', '9007199254740992')).toMatchObject({ ok: false })
  expect(validateRange('-9007199254740991', '9007199254740991')).toMatchObject({ ok: false, field: 'range' })
  expect(pickInteger(1, 100, () => 0n)).toBe(1)
  expect(pickInteger(1, 100, () => 99n)).toBe(100)
  expect(pickInteger(-2, 2, () => 4n)).toBe(2)
  expect(pickInteger(7, 7, () => 0n)).toBe(7)
  expect(pickLetter(() => 0n)).toBe('A')
  expect(pickLetter(() => 25n)).toBe('Z')
  ```

  Also assert that for width 10 a sampler yielding `2n ** 53n - 1n` then `0n` is called twice and returns the lower bound.
- [ ] **Step 2: Run `npm test -- --run src/picker.test.ts`** and verify the missing picker causes failure.
- [ ] **Step 3: Implement `src/picker.ts`.** Strictly parse integer text. Use `crypto.getRandomValues` to sample 53 random bits; rejection sampling maps it without bias to any safe integer span. The optional sampler makes boundary tests deterministic.
- [ ] **Step 4: Run `npm test -- --run src/picker.test.ts` and `npm run typecheck`** and verify success.
- [ ] **Step 5: Commit** the self-contained project foundation and picker.

### Task 2: 화면, 입력 흐름, 슬롯 애니메이션

**Files:**
- Create: `src/app.ts`, `src/app.test.ts`, `src/main.ts`, `src/style.css`
- Modify: `index.html`

**Interfaces:**
- Consumes: Task 1's `validateRange`, `pickInteger`, `pickLetter`.
- Produces: `mountPickerApp(root: HTMLElement): void` from `src/app.ts`; `src/main.ts` only imports CSS and mounts the app.

- [ ] **Step 1: Write failing jsdom tests** with `vi.useFakeTimers()` and picker mocks. Assert initial outputs are `?`, inputs are `1`/`100`, invalid blank input shows an error and does not call `pickInteger`, submitting a valid range disables all controls, a second submit leaves the pick call count unchanged, advancing 1500 ms shows both final results and re-enables controls, and mocked `matchMedia('(prefers-reduced-motion: reduce)')` shows both results with no timers.
- [ ] **Step 2: Run `npm test -- --run src/app.test.ts`** and verify the missing app causes failure.
- [ ] **Step 3: Implement markup and state in `src/app.ts`, entry in `src/main.ts`, and responsive layout in `src/style.css`.** Use a form submit handler so Enter works, labeled number inputs, visible errors, clear focus styles, and a live region updated only for errors/final results. Lock both inputs and button while spinning; update visual slots at a short interval and stop them together after about 1.5 seconds. Avoid timers for reduced motion.
- [ ] **Step 4: Run `npm test -- --run src/app.test.ts`, `npm run typecheck`, and `npm run build`** and verify success. Inspect desktop and narrow layout in a browser if available.
- [ ] **Step 5: Commit** the usable website.

### Task 3: Pages 배포와 사용 안내

**Files:**
- Create: `.github/workflows/deploy.yml`, `README.md`
- Modify: `vite.config.ts`

**Interfaces:**
- Consumes: Task 2's `npm run typecheck`, `npm test -- --run`, and `npm run build`.
- Produces: a GitHub Pages deployment on changes to `main`.

- [ ] **Step 1: Add a workflow** that checks out code, installs Node 22 dependencies with `npm ci`, runs typecheck/tests/build, uploads `dist`, and deploys it with Pages permissions and the `github-pages` environment. Set Vite `base` to `/random-pick/`.
- [ ] **Step 2: Document local commands, range rules, and Pages source configuration in `README.md`.**
- [ ] **Step 3: Run `npm ci`, `npm run typecheck`, `npm test -- --run`, `npm run build`, and inspect `dist/index.html` asset paths** for `/random-pick/`.
- [ ] **Step 4: Commit** deployment setup and documentation. Push to `origin/main`, configure Pages source as GitHub Actions, and verify workflow plus live URL when repository access permits.

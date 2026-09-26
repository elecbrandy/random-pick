# 알파벳 범위와 세션 추첨 기록 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 조정 가능한 알파벳 범위, 최신순 추첨 기록, 같은 탭 세션에서의 조합 중복 방지를 추가한다.

**Architecture:** `src/picker.ts`가 현재 범위의 미사용 조합에서 균등 추첨한다. `src/history.ts`가 `sessionStorage` 복원·저장과 오류 대응을 담당한다. `src/app.ts`는 네 범위 입력, 슬롯, 기록 목록, 소진 상태를 연결한다.

**Tech Stack:** 기존 TypeScript, Vite, Vitest/jsdom, CSS, GitHub Pages 워크플로 유지

**Spec:** `docs/superpowers/specs/2026-09-26-alphabet-range-history-design.md`

## Global Constraints

- 알파벳 범위는 A~Z의 양끝 포함, 기본 `A`~`Z`; 숫자 범위 기본 `1`~`100`과 기존 안전 정수 규칙을 유지한다.
- 확정된 **조합 전체**만 재등장하지 않는다. 범위를 바꿨다가 되돌려도 제외한다.
- 가능한 조합을 전부 메모리에 생성하지 않는다. `bigint`로 총 조합 수를 계산한다.
- 기록은 최신순 전체 목록과 총 개수다. 같은 탭 새로고침 후 복원하며 범위 입력은 기본값, 슬롯은 마지막 결과를 표시한다.
- 저장소 실패 시 현재 페이지에서는 기록을 유지하고 새로고침 시 사라질 수 있음을 알린다.
- 기존 움직임 줄이기, 키보드, 좁은 화면, `/random-pick/` 배포 경로를 유지한다.

## Review Focus

- 알파벳 시작이 끝보다 뒤면 추첨을 막고 이유를 표시한다. Task 1/3 테스트.
- 현재 범위 밖의 과거 조합은 현재 가능한 개수를 줄이지 않지만, 다시 범위에 들어오면 제외된다. Task 1/3 테스트.
- 마지막 남은 조합을 확정한 뒤 버튼을 비활성화하고 범위 변경 시 다시 활성화한다. Task 3 테스트.
- 손상되거나 중복된 저장 값은 유효한 고유 조합으로 정리된다. Task 2 테스트.
- 저장소 읽기·쓰기 예외에서도 추첨은 계속되고 데이터 보존 한계를 알려준다. Task 2/3 테스트.

---

### Task 1: 범위 검증과 미사용 조합 추첨

**Files:**
- Modify: `src/picker.ts`, `src/picker.test.ts`

**Interfaces:**
- Produces: `type Draw = { letter: string; number: number }`
- Produces: `type LetterRange = { start: string; end: string }`
- Produces: `validateLetterRange(start: string, end: string): { ok: true; range: LetterRange } | { ok: false; message: string }`
- Produces: `remainingCombinationCount(letters: LetterRange, numbers: Range, used: readonly Draw[]): bigint`
- Produces: `pickAvailablePair(letters: LetterRange, numbers: Range, used: readonly Draw[], sample64?: () => bigint): Draw | null`
- Keeps existing `validateRange`, `pickInteger`, `pickLetter` interfaces for animation.

- [ ] **Step 1: Write failing tests** for the named boundaries and ranking behavior. Include these assertions, plus invalid non-A–Z endpoints, duplicate history, zero-sample-call exhaustion, and a wide range total greater than `Number.MAX_SAFE_INTEGER`:

  ```ts
  expect(validateLetterRange('A', 'Z')).toMatchObject({ ok: true })
  expect(validateLetterRange('A', 'A')).toMatchObject({ ok: true })
  expect(validateLetterRange('Z', 'A')).toMatchObject({ ok: false })
  expect(remainingCombinationCount({ start: 'A', end: 'B' }, { min: 1, max: 2 }, [])).toBe(4n)
  expect(remainingCombinationCount({ start: 'A', end: 'B' }, { min: 1, max: 2 }, [{ letter: 'A', number: 1 }])).toBe(3n)
  expect(remainingCombinationCount({ start: 'A', end: 'A' }, { min: 1, max: 1 }, [{ letter: 'A', number: 1 }])).toBe(0n)
  expect(pickAvailablePair({ start: 'A', end: 'A' }, { min: 1, max: 2 }, [{ letter: 'A', number: 1 }], () => 0n)).toEqual({ letter: 'A', number: 2 })
  ```
- [ ] **Step 2: Run `npm test -- --run src/picker.test.ts`** to see the new tests fail before implementation.
- [ ] **Step 3: Implement the interfaces above.** Compute `width = BigInt(max) - BigInt(min) + 1n`, total as width × letter count. Map each in-range used pair to a unique grid index, sort indices, choose an unbiased rank in `[0, remaining)` using a 64-bit `crypto.getRandomValues` sample with rejection, skip used indices, and decode the resulting grid index. No full combination list.
- [ ] **Step 4: Run `npm test -- --run src/picker.test.ts` and `npm run typecheck`**; both pass.

### Task 2: 탭 세션 기록 저장소

**Files:**
- Create: `src/history.ts`, `src/history.test.ts`

**Interfaces:**
- Consumes: Task 1's `Draw`.
- Produces: `type HistoryStore = { readonly entries: readonly Draw[]; readonly persistent: boolean; add(draw: Draw): void }`
- Produces: `createHistoryStore(storageProvider?: () => Storage): HistoryStore`; default provider reads `window.sessionStorage`.
- Storage key: `random-pick-history-v1`.

- [ ] **Step 1: Write failing tests** for empty storage, preserving chronological order across a new store instance, sanitizing malformed JSON/items and duplicate pairs, getter/read exceptions, and write exceptions. Assert `entries` begins as `[]`; after `add({ letter: 'A', number: 1 })` a new store using the same fake Storage reads exactly that item; a second identical item in stored JSON collapses to one; write failure leaves the added item in `entries` and sets `persistent` to `false`.
- [ ] **Step 2: Run `npm test -- --run src/history.test.ts`** to see failure before implementation.
- [ ] **Step 3: Implement `createHistoryStore`.** Accept only A~Z and safe integer numbers from stored arrays, keep the first occurrence of each pair, return copies from `entries`, and catch storage access/read/write errors. `add` appends one new pair to memory and attempts to persist the whole ordered history.
- [ ] **Step 4: Run `npm test -- --run src/history.test.ts` and `npm run typecheck`**; both pass.

### Task 3: 범위 입력, 기록 UI, 소진 상태

**Files:**
- Modify: `src/app.ts`, `src/app.test.ts`, `src/style.css`, `README.md`

**Interfaces:**
- Consumes: Tasks 1–2 functions and types.
- Keeps: `mountPickerApp(root: HTMLElement): void`.

- [ ] **Step 1: Write failing DOM tests** for default A~Z controls, reversed alphabet range error, first result appended to newest-first history, a second draw avoiding the first pair, reload restoring history/latest slots with default ranges, a one-pair range becoming exhausted and disabling the button, range changes making a new pair available while old pair stays excluded, storage failure notice, and reduced-motion immediate finalization. Use IDs `letter-start`/`letter-end` and selectors `[data-history-list]`, `[data-history-count]`, `[data-exhausted]` in the tests. For example, set both letters to `A` and numbers to `1`/`1`, submit in reduced-motion mode, then assert the history has one `A · 1` item, count `1`, and submit button is disabled; after changing max to `2`, assert the button is enabled and the next result is `A · 2`.
- [ ] **Step 2: Run `npm test -- --run src/app.test.ts`** to see new behavior fail before implementation.
- [ ] **Step 3: Add alphabet start/end selects, history count/list/empty state, and an exhaustion message.** Validate all four inputs; during animation lock all controls and add only the final pair to history. Recompute available count on range changes and completion. Show the last restored pair in both slots. Keep the dedicated live region for final result/errors and use a scrollable list with sensible mobile layout. Document session and range behavior in README.
- [ ] **Step 4: Run `npm run typecheck`, `npm test -- --run`, and `npm run build`**; all pass. Inspect built `dist/index.html` for `/random-pick/assets/` URLs and check `git diff --check`.
- [ ] **Step 5: After root review, commit and push to `main`; verify GitHub Actions and the Pages URL when repository Pages is enabled.**

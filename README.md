# Random Pick

알파벳 `A`~`Z` 중 한 글자와 지정한 닫힌 숫자 범위의 정수 하나를 함께 뽑는 정적 웹사이트입니다.

## Local development

```bash
npm install
npm run dev
```

검사와 빌드는 다음 명령으로 실행합니다.

```bash
npm run typecheck
npm test -- --run
npm run build
```

## Range rules

- 기본 범위는 `1`부터 `100`까지입니다.
- 최솟값과 최댓값은 안전한 정수여야 합니다. 앞뒤 공백, 부호(`+`, `-`), 앞의 `0`은 허용하며 `0`과 음수도 쓸 수 있습니다.
- 최솟값은 최댓값보다 작거나 같아야 하며, 포함된 정수의 개수도 안전한 정수 범위여야 합니다.

## GitHub Pages

`main` 브랜치에 변경 사항을 올리면 GitHub Actions가 검사, 테스트, 빌드 후 `dist`를 Pages에 배포합니다. 저장소 **Settings → Pages**에서 배포 원본을 **GitHub Actions**로 설정하세요. 사이트 주소는 `https://elecbrandy.github.io/random-pick/`입니다.

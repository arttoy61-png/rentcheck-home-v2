# Rent Check Home V2

Rent Check의 홈과 독립 도구 페이지를 제공하는 GitHub Pages용 정적 사이트입니다.

현재 V2 안에서 바로 이용할 수 있는 도구:

- 재개발 분담금·총투입금 계산기: `calc/`
- 청년 매입임대·안심주택 가점 계산기: `tools/youth-score/`
- 월세·전세 적정 확인: `tools/rent-check/`
- 아파트 단지 시세 지도: `tools/apartment/`

네 도구의 계산·판정·데이터 조회 로직은 읽기 전용 원본 `arttoy61-png/rent-check`에서 복제했습니다. V2 공통 상단 내비게이션과 `Noto Sans KR` 400/700 타이포그래피는 `tools/tool-common.js`, `tools/tool-shell.css`에서만 관리합니다.

새 도구 추가 규칙과 원본 출처는 `tools/README.md`, `tools/source-manifest.json`을 참고하세요.

검증:

```bash
node tools/verify-tools.mjs
```

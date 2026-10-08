# Source Archive

> 위치: `docs/source/archive/`  
> 목적: 초기 기획서, 통합 원본 Spec, 이전 버전 문서 등 **역사적 Source**를 보관한다.

이 폴더의 문서는 기본적으로 구현 Source of Truth가 아니다.

---

## 1. Archive에 보관하는 것

예:

```text
초기 통합 Feature Spec
분할 전 Master Spec
이전 Architecture 초안
이전 API 초안
과거 의사결정 기록
```

현재 구현 기준 문서가 별도로 존재하는 경우
Archive 원본보다 현재 문서를 우선한다.

---

## 2. Read-only

Archive 문서는 역사 보존 목적이므로
일반 구현 작업 중 직접 수정하지 않는다.

수정이 필요한 경우:

```text
현재 authoritative 문서를 수정
```

한다.

---

## 3. Source of Truth

문서 충돌은:

```text
docs/SOURCE_OF_TRUTH.md
```

의 Concern별 우선순위를 따른다.

Archive 문서는 그 자체로 현재 Requirement를 덮어쓰지 않는다.

---

## 4. Promotion

Archive에만 있는 내용이 다시 현재 Requirement가 되어야 한다면:

```text
1. 현재 Feature/Domain/Architecture 문서에 명시적으로 반영
2. 필요 시 ADR 작성
3. 관련 API/테스트 갱신
```

한다.

Archive 문서를 직접 가리켜 구현하지 않는다.

---

## 5. 금지

```text
Archive 문서를 최신 Spec처럼 취급
과거 Counseling Ownership을 현재 Ownership보다 우선
Archive의 오래된 API Path를 현재 Contract로 자동 채택
Archive Mockup을 현재 Visual Source로 자동 채택
```

---

## 6. 핵심 원칙

```text
Archive = 역사적 근거
Current docs = 현재 구현 기준

과거 문서를 보존하되,
현재 Source of Truth와 혼동하지 않는다.
```

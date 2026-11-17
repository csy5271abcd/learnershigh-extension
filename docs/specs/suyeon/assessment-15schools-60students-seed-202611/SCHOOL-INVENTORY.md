# 학교 목록 (15개교 시연 대상)

> 15개교는 60개교 평가계획서 조사 코퍼스(`assessment-technical-research-20261112/SCHOOL-INVENTORY.md`) 중 시연용으로 고른 일부다. 60개교 전체 데이터와 혼동하지 않는다.
> **학교 = 학생 소속 정보**, **지점 = 학원 관리 권한 단위**다. 시연에서는 지점마다 5개교 학생을 배정했을 뿐 학교와 지점은 같은 개념이 아니다.
> 지역은 폴더 묶음 이름(예: `jeonbug·jeonnam·gyeongbug·gyeongnam·jeju`)만 있어 시·도를 확정하지 않았다.

| # | 학교 | 시연 학교 ID | 유형 | 원본 폴더 | 시연 지점 | 합성 학생 |
|---|---|---|---|---|---|---|
| 1 | 운정고등학교 | `sch_demo_unjeong` | 일반고 | `general-high-school/gyeong-gi/unjeong` | 러너스하이 시연 A지점 | 4 |
| 2 | 문현고등학교 | `sch_demo_munhyeon` | 일반고 | `general-high-school/busan·daegu·daejeon·gwangju·ulsan/munhyeon` | 러너스하이 시연 A지점 | 4 |
| 3 | 호서고등학교 | `sch_demo_hoseo` | 일반고 | `general-high-school/sejong·gang-won·chungbug·chungnam/hoseo` | 러너스하이 시연 A지점 | 4 |
| 4 | 인천하늘고등학교 | `sch_demo_haneul` | 자사고 | `autonomous-private-high-school/haneul` | 러너스하이 시연 A지점 | 4 |
| 5 | 세화고등학교 | `sch_demo_sehwa` | 자사고 | `autonomous-private-high-school/sehwa` | 러너스하이 시연 A지점 | 4 |
| 6 | 대신고등학교 | `sch_demo_daeshin` | 일반고 | `general-high-school/seoul/daeshin` | 러너스하이 시연 B지점 | 4 |
| 7 | 한림고등학교 | `sch_demo_hanlim` | 일반고 | `general-high-school/jeonbug·jeonnam·gyeongbug·gyeongnam·jeju/hanlim` | 러너스하이 시연 B지점 | 4 |
| 8 | 진양고등학교 | `sch_demo_jinyang` | 일반고 | `general-high-school/jeonbug·jeonnam·gyeongbug·gyeongnam·jeju/jinyang` | 러너스하이 시연 B지점 | 4 |
| 9 | 삼각산고등학교 | `sch_demo_samgaksan` | 일반고 | `general-high-school/seoul/samgaksan` | 러너스하이 시연 B지점 | 4 |
| 10 | 가좌고등학교 | `sch_demo_gajwa` | 일반고 | `general-high-school/incheon/gajwa` | 러너스하이 시연 B지점 | 4 |
| 11 | 충무고등학교 | `sch_demo_chungmu` | 일반고 | `general-high-school/jeonbug·jeonnam·gyeongbug·gyeongnam·jeju/chungmu` | 러너스하이 시연 C지점 | 4 |
| 12 | 광명고등학교 | `sch_demo_gwangmyeong` | 일반고 | `general-high-school/gyeong-gi/gwangmyeong` | 러너스하이 시연 C지점 | 4 |
| 13 | 세종고등학교 | `sch_demo_sejong` | 일반고 | `general-high-school/gyeong-gi/sejong` | 러너스하이 시연 C지점 | 4 |
| 14 | 한솔고등학교 | `sch_demo_hansol` | 일반고 | `general-high-school/gyeong-gi/hansol` | 러너스하이 시연 C지점 | 4 |
| 15 | 제주고등학교 | `sch_demo_jeju` | 일반고 | `general-high-school/jeonbug·jeonnam·gyeongbug·gyeongnam·jeju/jeju` | 러너스하이 시연 C지점 | 4 |

- 시연 학교 ID(`sch_demo_*`)는 개발용 명단 안에서만 쓰는 ID다. 기존 Mock 학교(`school_001` 예시고등학교)는 바꾸지 않았다.
- 평가계획서 공식 데이터 등록(Plan 운영)은 이번 범위가 아니다. 시연 학교에는 평가계획서 운영 권한·슬롯이 없다(`findSlot`은 기존 `school_001`만).

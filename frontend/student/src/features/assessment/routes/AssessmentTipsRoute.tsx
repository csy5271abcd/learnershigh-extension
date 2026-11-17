import { useNavigate, useSearchParams } from 'react-router'
import enrichmentStyles from '../components/enrichment/enrichment.module.css'
import { MockDataNotice } from '../components/MockDataNotice.tsx'
import { TipsBrowser, type TipActionTarget } from '../components/tips/TipsBrowser.tsx'
import styles from '../components/tips/tips.module.css'
import { findTip, tips, type TipAction } from '../model/tipsContent.ts'
import { enrichmentPath, mockExamMaterialsPath, resourcesPath, schoolAssessmentsPath } from './paths.ts'

// 수행평가 꿀팁 화면 (screen-map S14, student §8, Mockup SA-TIPS-01~06).
// Mockup은 수행평가 상세의 Modal이고, 이 화면은 좌측 메뉴 "수행평가 꿀팁"용으로 같은 TipsBrowser를 쓴다 (화면 Mockup 없음).
// 선택한 팁은 `?tip=TIP03`으로 URL에 둬서 다른 화면에 다녀와도 유지된다. 특정 과제 문맥이 없으므로
// 노트는 과제 목록으로, 주제명 추천은 상세에서만 열 수 있다고 안내한다.
export function AssessmentTipsRoute() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const selected = findTip(searchParams.get('tip')) ?? tips[0]

  const resolveAction = (action: TipAction): TipActionTarget => {
    switch (action) {
      case 'TOPIC_SUGGESTION':
        return { reason: '주제명 추천은 수행평가 상세 화면에서 과제를 고른 뒤 열 수 있어요. 추천 실행은 AI 기능이 연결되는 단계(Stage 3)에서 제공돼요.' }
      case 'NOTE':
        return { run: () => navigate(schoolAssessmentsPath) }
      case 'RESOURCES':
        return { run: () => navigate(resourcesPath) }
      case 'ENRICHMENT':
        return { run: () => navigate(enrichmentPath) }
      case 'MOCK_EXAM':
        return { run: () => navigate(mockExamMaterialsPath) }
    }
  }

  return (
    <main className={enrichmentStyles.page}>
      <div className={enrichmentStyles.mainArea}>
        <div className={`${enrichmentStyles.content} ${styles.pageArea}`}>
          <header className={enrichmentStyles.header}>
            <h1 className={enrichmentStyles.title}>수행평가 꿀팁</h1>
            <p className={enrichmentStyles.subtitle}>
              순서 없이 필요한 팁만 골라 보세요. 학교의 공식 채점 기준이나 세특 내용을 보장하는 안내가 아니에요.
            </p>
          </header>
          <div className={styles.pageBrowser}>
            <TipsBrowser
              selectedTipId={selected.tipId}
              onSelect={(tipId) => setSearchParams({ tip: tipId }, { replace: true, preventScrollReset: true })}
              resolveAction={resolveAction}
            />
          </div>
          <p className={styles.intro}>"탐구 노트 열기"는 학교 수행평가 목록으로 이동해요. 과제를 고르면 그 과제의 노트가 열려요.</p>
          <div className={enrichmentStyles.notices}>
            <MockDataNotice />
          </div>
        </div>
      </div>
    </main>
  )
}

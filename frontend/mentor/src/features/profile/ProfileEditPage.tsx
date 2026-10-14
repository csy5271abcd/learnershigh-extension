import { useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { mentorApi } from '../../api/mentorApi.ts'
import type { MentorProfile, MentorProfileUpdateRequest } from '../../api/types.ts'
import { profilePath } from '../../app/paths.ts'
import { TextAreaField } from '../../components/FormFields.tsx'
import { ErrorState, LoadingState } from '../../components/PageState.tsx'
import { PageTitle } from '../../components/PageTitle.tsx'
import { TagInput } from '../../components/TagInput.tsx'
import { useToast } from '../../components/toastContext.ts'
import ui from '../../components/ui.module.css'
import { errorMessage } from '../../lib/format.ts'
import { useSessionDraft } from '../../lib/useSessionDraft.ts'
import { primeResource, useResource } from '../../lib/useResource.ts'
import styles from './ProfileEditPage.module.css'

export function ProfileEditPage() {
  const { state, reload } = useResource('profile', () => mentorApi.getProfile())

  return (
    <div className={ui.page}>
      {state.status === 'loading' && <LoadingState label="프로필을 불러오는 중이에요." rows={2} />}
      {(state.status === 'error' || state.status === 'notFound') && (
        <ErrorState title="프로필을 불러오지 못했어요." error={state.status === 'error' ? state.error : null} onRetry={reload} />
      )}
      {state.status === 'success' && <ProfileForm profile={state.data} />}
    </div>
  )
}

type ProfileDraft = Required<MentorProfileUpdateRequest>

/**
 * PATCH /api/mentor/profile: 공개 Profile Field만 고친다. (api-contract §27-2)
 * 이름 / 대학 / 학과 / 전형 / 인증은 인증 대상이라 여기서 바꾸지 않는다. 수정 가능 Field 목록은 Open Decision이다.
 * Student 관리 권한 / 기관 정보 / 상담 설정은 다루지 않는다.
 */
function ProfileForm({ profile }: { profile: MentorProfile }) {
  const navigate = useNavigate()
  const toast = useToast()
  const draft = useSessionDraft<ProfileDraft>('profile', () => ({
    highSchoolContext: profile.highSchoolContext,
    representativeExperience: profile.representativeExperience,
    tags: [...profile.tags],
  }))
  const [errors, setErrors] = useState<{ highSchoolContext?: string; representativeExperience?: string }>({})
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<unknown>(null)
  const inFlight = useRef(false)

  const save = async () => {
    if (inFlight.current) return
    const nextErrors = {
      highSchoolContext: draft.value.highSchoolContext.trim() ? undefined : '고교 Context를 입력해 주세요.',
      representativeExperience: draft.value.representativeExperience.trim() ? undefined : '대표 경험을 입력해 주세요.',
    }
    setErrors(nextErrors)
    if (nextErrors.highSchoolContext || nextErrors.representativeExperience) return

    inFlight.current = true
    setSaving(true)
    setSaveError(null)
    try {
      const saved = await mentorApi.updateProfile(draft.value)
      draft.discard()
      primeResource('profile', saved)
      toast('프로필을 저장했어요.')
      navigate(profilePath, { replace: true })
    } catch (error) {
      setSaveError(error)
    } finally {
      inFlight.current = false
      setSaving(false)
    }
  }

  return (
    <form
      className={`${ui.form} ${styles.form}`}
      aria-labelledby="profile-edit-title"
      onSubmit={(event) => {
        event.preventDefault()
        void save()
      }}
    >
      <div id="profile-edit-title">
        <PageTitle>프로필 수정</PageTitle>
      </div>

      <section className={ui.panel} aria-labelledby="verified-info-title">
        <h2 id="verified-info-title" className={ui.panelTitle}>
          인증된 정보
        </h2>
        <dl className={ui.facts}>
          <dt>이름</dt>
          <dd>{profile.name}</dd>
          <dt>대학 · 학과</dt>
          <dd>
            {profile.university} {profile.major}
          </dd>
          <dt>전형</dt>
          <dd>{profile.admissionType}</dd>
          <dt>인증</dt>
          <dd>{profile.verified ? '재학 인증' : '인증 전'}</dd>
        </dl>
        <p className={`${ui.help} ${styles.note}`}>인증된 정보는 이 화면에서 바꿀 수 없어요.</p>
      </section>

      <TextAreaField
        label="고교 Context"
        rows={2}
        value={draft.value.highSchoolContext}
        onChange={(event) => draft.update((value) => ({ ...value, highSchoolContext: event.target.value }))}
        error={errors.highSchoolContext}
        help="예: 일반고 · 내신 1.3 · 생명과학I·화학I 3년 1등급"
      />
      <TextAreaField
        label="대표 경험"
        rows={3}
        value={draft.value.representativeExperience}
        onChange={(event) => draft.update((value) => ({ ...value, representativeExperience: event.target.value }))}
        error={errors.representativeExperience}
      />
      <TagInput tags={draft.value.tags} onChange={(tags) => draft.update((value) => ({ ...value, tags }))} />

      {saveError !== null && (
        <div className={`${ui.alert} ${ui.alertError}`} role="alert">
          <span>{errorMessage(saveError, '저장하지 못했어요.')} 입력한 내용은 그대로 있어요.</span>
        </div>
      )}

      <div className={ui.actionBar}>
        <button
          type="button"
          className={`${ui.button} ${ui.ghost}`}
          onClick={() => {
            draft.discard()
            navigate(profilePath)
          }}
        >
          취소
        </button>
        <button type="submit" className={`${ui.button} ${ui.primary}`} disabled={saving} aria-busy={saving}>
          {saving ? '저장 중…' : saveError !== null ? '다시 저장' : '저장'}
        </button>
      </div>
    </form>
  )
}

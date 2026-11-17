// A25: 과목 선택 목록에는 과목명만 보인다. 내부 subjectId는 값(value)·저장·API에만 쓴다.
// 같은 슬롯(학년·학기 동일)에 이름이 같은 과목이 둘 이상이면 코드 대신 '같은 이름 n번째'로 구분한다.
export function subjectOptionLabel(items: readonly { subjectId: string; name: string }[], item: { subjectId: string; name: string }): string {
  const same = items.filter((other) => other.name === item.name)
  if (same.length < 2) return item.name
  return `${item.name} (같은 이름 ${same.findIndex((other) => other.subjectId === item.subjectId) + 1}번째)`
}

/** 저장은 끝났고 새 데이터를 기다리는(또는 다시 불러오지 못한) 동안 보여줄 안내. */
export function savedNotice(stale: boolean): string {
  return stale
    ? '저장했습니다. 최신 상태를 불러오지 못했습니다. 위의 다시 시도를 눌러주세요.'
    : '저장했습니다. 최신 상태를 불러오는 중…'
}

/** 이 오류는 화면의 기준일 / 상태가 오래되어 생길 수 있으므로 상세를 다시 불러온다. */
export function needsReload(code: string): boolean {
  return code === 'INVALID_RECHECK_DATE' || code === 'CONCURRENT_MODIFICATION' || code === 'RECHECK_NOT_DUE'
}

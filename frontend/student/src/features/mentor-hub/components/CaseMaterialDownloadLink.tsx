import { caseMaterialName } from '../model/caseMaterials.ts'
import type { CaseMaterial, CaseOriginalFile } from '../model/types.ts'

interface CaseMaterialDownloadLinkProps {
  material: CaseMaterial & { original: CaseOriginalFile }
  className: string
}

// Activity Case 원본 파일 다운로드 (과정 자료 / 결과물 공통).
// 같은 Origin의 원본 파일이라 Native download를 쓴다. 파일 이름은 Fixture의 값만 쓴다. (사용자 입력으로 만들지 않는다)
export function CaseMaterialDownloadLink({ material, className }: CaseMaterialDownloadLinkProps) {
  const fileName = caseMaterialName(material)
  return (
    <a
      className={className}
      href={material.original.url}
      download={fileName}
      type={material.original.mimeType}
      aria-label={`${fileName} 다운로드`}
    >
      다운로드
    </a>
  )
}

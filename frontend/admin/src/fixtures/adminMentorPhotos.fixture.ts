import mentorMan01 from '../../../student/assets/mentor-man/mentor-man-01.png'
import mentorMan02 from '../../../student/assets/mentor-man/mentor-man-02.png'
import mentorMan03 from '../../../student/assets/mentor-man/mentor-man-03.png'
import mentorMan04 from '../../../student/assets/mentor-man/mentor-man-04.png'
import mentorMan05 from '../../../student/assets/mentor-man/mentor-man-05.png'
import mentorMan06 from '../../../student/assets/mentor-man/mentor-man-06.png'
import mentorMan07 from '../../../student/assets/mentor-man/mentor-man-07.png'
import mentorMan08 from '../../../student/assets/mentor-man/mentor-man-08.png'
import mentorWoman01 from '../../../student/assets/mentor-woman/mentor-woman-01.png'
import mentorWoman02 from '../../../student/assets/mentor-woman/mentor-woman-02.png'
import mentorWoman03 from '../../../student/assets/mentor-woman/mentor-woman-03.png'
import mentorWoman04 from '../../../student/assets/mentor-woman/mentor-woman-04.png'
import mentorWoman05 from '../../../student/assets/mentor-woman/mentor-woman-05.png'
import mentorWoman06 from '../../../student/assets/mentor-woman/mentor-woman-06.png'
import mentorWoman07 from '../../../student/assets/mentor-woman/mentor-woman-07.png'
import mentorWoman08 from '../../../student/assets/mentor-woman/mentor-woman-08.png'
import mentorWoman09 from '../../../student/assets/mentor-woman/mentor-woman-09.png'
import mentorWoman10 from '../../../student/assets/mentor-woman/mentor-woman-10.png'
import mentorWoman11 from '../../../student/assets/mentor-woman/mentor-woman-11.png'
import mentorWoman12 from '../../../student/assets/mentor-woman/mentor-woman-12.png'
import mentorWoman13 from '../../../student/assets/mentor-woman/mentor-woman-13.png'
import mentorWoman14 from '../../../student/assets/mentor-woman/mentor-woman-14.png'
import mentorWoman15 from '../../../student/assets/mentor-woman/mentor-woman-15.png'

/*
 * Mentor Profile 사진 (Student Mentor Hub mentors.fixture.ts profileImageUrl과 같은 mentorId → 같은 파일).
 * - 사진 파일은 Student Surface asset(frontend/student/assets/mentor-*)을 그 자리에서 참조한다. 복사 · 수정하지 않는다. (약 63MB를 복제하지 않기 위해)
 *   두 Surface가 실제로 같이 쓰게 되었으므로 frontend/shared 승격은 별도 Shared 변경으로 검토한다. (Gap)
 * - Student에도 사진이 없는 Mentor(서예원 fixture-mentor-24)는 없음(null) → 이름 첫 글자 중립 Placeholder (Student MentorAvatar와 같은 대체)
 * - 화면 확인용 Visual Mapping이다. 새 사진을 만들지 않았다.
 */
export const mentorPhotoFixture: Readonly<Record<string, string | null>> = {
  'fixture-mentor-01': mentorWoman01,
  'fixture-mentor-02': mentorWoman08,
  'fixture-mentor-03': mentorWoman11,
  'fixture-mentor-04': mentorWoman04,
  'fixture-mentor-05': mentorWoman03,
  'fixture-mentor-06': mentorMan02,
  'fixture-mentor-07': mentorMan08,
  'fixture-mentor-08': mentorMan05,
  'fixture-mentor-09': mentorWoman09,
  'fixture-mentor-10': mentorWoman14,
  'fixture-mentor-11': mentorWoman06,
  'fixture-mentor-12': mentorWoman02,
  'fixture-mentor-13': mentorMan01,
  'fixture-mentor-14': mentorWoman05,
  'fixture-mentor-15': mentorWoman07,
  'fixture-mentor-16': mentorWoman10,
  'fixture-mentor-17': mentorWoman12,
  'fixture-mentor-18': mentorMan03,
  'fixture-mentor-19': mentorMan04,
  'fixture-mentor-20': mentorMan06,
  'fixture-mentor-21': mentorWoman13,
  'fixture-mentor-22': mentorMan07,
  'fixture-mentor-23': mentorWoman15,
  'fixture-mentor-24': null,
}

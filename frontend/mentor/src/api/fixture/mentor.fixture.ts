// 현재 로그인한 Mentor Fixture. 실제 인물이 아니다. (모든 인물 가상)
//
// TEMPORARY FIXTURE DUPLICATION:
// Student Mentor Hub의 Canonical Mentor `fixture-mentor-01` 한지수
// (frontend/student/src/features/mentor-hub/fixtures/mentors.fixture.ts, mentorProfile.fixture.ts)와 같은 Mentor다.
// Workspace 경계를 넘어 import하지 않으려고 공개 Profile 값을 그대로 옮겨 적었다. (domain.md §57)
// frontend/shared 또는 Backend Seed가 생기면 한 곳으로 합친다. 값을 바꿀 때는 Student Fixture와 함께 바꾼다.

import profileImage from '../../assets/mentors/fixture-mentor-01.webp'
import type { MentorProfile } from '../types.ts'

export const currentMentorFixture: MentorProfile = {
  mentorId: 'fixture-mentor-01',
  name: '한지수',
  university: '이화여대',
  major: '생명과학과',
  admissionType: '학생부교과',
  highSchoolContext: '일반고 · 내신 1.3 · 생명과학I·화학I 3년 1등급',
  representativeExperience: '내신 1.3 유지, 교내 생명과학 탐구대회 금상, 교외 · 대학 연계 실험캠프',
  verified: true,
  tags: ['내신', '교과전형', '교내대회', '생명과학'],
  // Student Mentor Hub와 같은 사진(mentor-woman-01)을 192px로 줄인 사본 (TEMPORARY ASSET DUPLICATION)
  profileImageUrl: profileImage,
}

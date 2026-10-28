import { request } from './apiClient.ts'
import type {
  Branch,
  CareBoard,
  CareCase,
  CareEvent,
  CareSettings,
  CareSettingsValues,
  DecisionInput,
  NoteChannel,
  OpenCaseInput,
  StudentCareDetail,
  StudentHistory,
} from '../model/types.ts'

// api-contract.md §65
const BASE = '/api/admin/student-care'

const query = (branchId: string) => `branchId=${encodeURIComponent(branchId)}`

export const studentCareApi = {
  branches: () => request<{ items: Branch[] }>(`${BASE}/branches`).then((response) => response.items),

  board: (branchId: string) => request<CareBoard>(`${BASE}/board?${query(branchId)}`),

  detail: (branchId: string, studentId: string) =>
    request<StudentCareDetail>(`${BASE}/students/${encodeURIComponent(studentId)}?${query(branchId)}`),

  history: (branchId: string, studentId: string) =>
    request<StudentHistory>(`${BASE}/students/${encodeURIComponent(studentId)}/history?${query(branchId)}`),

  openCase: (input: OpenCaseInput) =>
    request<CareCase>(`${BASE}/cases`, { method: 'POST', body: JSON.stringify(input) }),

  decide: (branchId: string, caseId: string, input: DecisionInput) =>
    request<CareCase>(`${BASE}/cases/${encodeURIComponent(caseId)}/decisions?${query(branchId)}`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  addNote: (branchId: string, caseId: string, channel: NoteChannel, content: string) =>
    request<CareEvent>(`${BASE}/cases/${encodeURIComponent(caseId)}/notes?${query(branchId)}`, {
      method: 'POST',
      body: JSON.stringify({ channel, content }),
    }),

  settings: (branchId: string) => request<CareSettings>(`${BASE}/settings?${query(branchId)}`),

  updateSettings: (branchId: string, values: CareSettingsValues) =>
    request<CareSettings>(`${BASE}/settings?${query(branchId)}`, { method: 'PUT', body: JSON.stringify(values) }),
}

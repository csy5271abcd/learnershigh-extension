export const mark = (state:string) => ['present','submitted'].includes(state)?'✓':['absent','missing'].includes(state)?'×':state==='excluded'?'·':'?'

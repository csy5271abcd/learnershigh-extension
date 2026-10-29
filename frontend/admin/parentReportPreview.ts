import type {Plugin} from 'vite'

/** Local demo only. The report token stays in server configuration, outside JS bundles. */
export function parentReportPreview(reportUrl: string | undefined): Plugin {
  return {
    name: 'local-parent-report-preview',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__preview/parent-report', (request, response) => {
        if (request.method !== 'GET' && request.method !== 'HEAD') {
          response.writeHead(405, {Allow: 'GET, HEAD'}).end()
          return
        }
        let target: URL
        try {
          target = new URL(reportUrl ?? '')
          if (target.protocol !== 'http:' || !['localhost', '127.0.0.1'].includes(target.hostname)
            || target.port !== '8080' || target.pathname !== '/util/daily_report.php'
            || !target.searchParams.get('token') || target.username || target.password) throw new Error('Invalid local preview')
        } catch {
          response.writeHead(503, {'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'})
            .end('학부모 리포트 미리보기 주소를 설정해 주세요.')
          return
        }
        response.writeHead(302, {Location:target.toString(),'Cache-Control':'no-store','Referrer-Policy':'no-referrer'}).end()
      })
    },
  }
}

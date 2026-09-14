import type { ReactElement, ReactNode } from 'react'

export function PreviewContainer({ children }: { children: ReactNode }): ReactElement {
  return <div className="archive-preview-container rounded-3xl p-3">{children}</div>
}

export function DownloadBtnContainer({ children }: { children: ReactNode }): ReactElement {
  return <div className="archive-download-bar sticky right-0 bottom-0 left-0 z-10 rounded-b-3xl p-3">{children}</div>
}

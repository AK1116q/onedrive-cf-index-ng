import type { OdFileObject } from '../../types'
import { FC } from 'react'

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

import { getFileIcon } from '../../utils/getFileIcon'
import { formatModifiedDateTime, humanFileSize } from '../../utils/fileDetails'

import DownloadButtonGroup from '../DownloadBtnGtoup'
import { DownloadBtnContainer, PreviewContainer } from './Containers'

const DefaultPreview: FC<{ file: OdFileObject }> = ({ file }) => {
  const hashes = [
    ['Quick XOR', file.file.hashes?.quickXorHash ?? '不可用'],
    ['SHA1', file.file.hashes?.sha1Hash ?? '不可用'],
    ['SHA256', file.file.hashes?.sha256Hash ?? '不可用'],
  ]

  return (
    <div>
      <PreviewContainer>
        <div className="archive-file-preview gap-6 px-4 py-4 md:grid md:grid-cols-[minmax(10rem,14rem)_1fr] md:px-6 md:py-6">
          <div className="archive-file-preview-card text-center">
            <div className="archive-file-preview-icon mx-auto flex items-center justify-center rounded-3xl">
              <FontAwesomeIcon icon={getFileIcon(file.name, { video: Boolean(file.video) })} />
            </div>
            <div className="mt-5 line-clamp-4 text-sm leading-relaxed font-bold [overflow-wrap:anywhere]">
              {file.name}
            </div>
          </div>

          <div className="archive-file-details mt-5 min-w-0 md:mt-0">
            <div className="archive-file-detail-grid">
              <div className="archive-file-detail">
                <div className="archive-file-detail-label">{'修改时间'}</div>
                <div className="archive-file-detail-value">{formatModifiedDateTime(file.lastModifiedDateTime)}</div>
              </div>

              <div className="archive-file-detail">
                <div className="archive-file-detail-label">{'文件大小'}</div>
                <div className="archive-file-detail-value">{humanFileSize(file.size)}</div>
              </div>

              <div className="archive-file-detail archive-file-detail--wide">
                <div className="archive-file-detail-label">{'MIME 类型'}</div>
                <div className="archive-file-detail-value">{file.file?.mimeType ?? '不可用'}</div>
              </div>
            </div>

            <div className="mt-5">
              <div className="archive-file-detail-label mb-2">{'文件校验值'}</div>
              <div className="archive-hash-list">
                {hashes.map(([label, value]) => (
                  <div key={label} className="archive-hash-row">
                    <div className="archive-hash-label">{label}</div>
                    <div className="archive-hash-value">{value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </PreviewContainer>
      <DownloadBtnContainer>
        <DownloadButtonGroup />
      </DownloadBtnContainer>
    </div>
  )
}

export default DefaultPreview

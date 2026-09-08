import Image from 'next/image'

type ErrorDetails = {
  title: string
  message: string
  action: string
}

const stringifyError = (errorMsg: unknown) => {
  if (typeof errorMsg === 'string') return errorMsg
  try {
    return JSON.stringify(errorMsg)
  } catch {
    return 'Unknown error'
  }
}

const getErrorDetails = (errorMsg: unknown): ErrorDetails => {
  const rawMessage = stringifyError(errorMsg)
  const lowerMessage = rawMessage.toLowerCase()

  if (lowerMessage.includes('no access token') || lowerMessage.includes('invalid_grant')) {
    return {
      title: '需要重新授权 OneDrive',
      message: rawMessage,
      action: 'OneDrive 登录凭据缺失或已过期。请从管理页面重新完成 OneDrive 授权。',
    }
  }

  if (lowerMessage.includes('password required')) {
    return {
      title: '需要访问密码',
      message: rawMessage,
      action: '这个文件夹已启用密码保护。请输入文件夹密码后继续访问。',
    }
  }

  if (lowerMessage.includes('itemnotfound') || lowerMessage.includes('not found') || lowerMessage.includes('404')) {
    return {
      title: '文件或文件夹不存在',
      message: rawMessage,
      action: '这个内容可能已被移动、删除、重命名，或者还没有同步到 OneDrive。',
    }
  }

  if (lowerMessage.includes('too many requests') || lowerMessage.includes('timeout') || lowerMessage.includes('network')) {
    return {
      title: 'OneDrive 请求失败',
      message: rawMessage,
      action: '这通常是临时问题。可以刷新页面，或稍等片刻让缓存恢复。',
    }
  }

  return {
    title: '出了点问题',
    message: rawMessage,
    action: '先刷新页面试试。如果持续失败，请检查 OneDrive 授权、Cloudflare KV 和最近的部署日志。',
  }
}

const FourOhFour: React.FC<{ errorMsg: unknown }> = ({ errorMsg }) => {
  const errorDetails = getErrorDetails(errorMsg)

  return (
    <div className="my-12">
      <div className="mx-auto w-1/3">
        <Image src="/images/fabulous-rip-2.png" alt="404" width={912} height={912} priority />
      </div>
      <div className="mx-auto mt-6 max-w-xl text-gray-500">
        <div className="mb-3 text-xl font-bold text-gray-700 dark:text-gray-200">
          {errorDetails.title}
        </div>
        <div className="mb-4 text-sm text-gray-600 dark:text-gray-300">{errorDetails.action}</div>
        <div className="mb-4 overflow-hidden break-all rounded border border-gray-400/20 bg-gray-50 p-2 font-mono text-xs dark:bg-gray-800">
          {errorDetails.message}
        </div>
        <div className="text-sm">
          需要更多细节？按{' '}
          <kbd className="rounded border border-gray-400/20 bg-gray-100 px-1 font-mono text-xs dark:bg-gray-800">
            F12
          </kbd>{' '}
          打开开发者工具，或查看 GitHub Actions / Cloudflare Pages 日志。上游问题反馈：{' '}
          <a
            className="text-blue-600 hover:text-blue-700 hover:underline"
            href="https://github.com/lyc8503/onedrive-cf-index-ng/issues"
            target="_blank"
            rel="noopener noreferrer"
          >
            onedrive-cf-index-ng issues
          </a>
          .
        </div>
      </div>
    </div>
  )
}

export default FourOhFour

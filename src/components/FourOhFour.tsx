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
      title: 'OneDrive authorization required',
      message: rawMessage,
      action: 'The OneDrive login token is missing or expired. Re-run the OneDrive OAuth setup from the admin page.',
    }
  }

  if (lowerMessage.includes('password required')) {
    return {
      title: 'Password required',
      message: rawMessage,
      action: 'This folder is protected. Enter the folder password to continue.',
    }
  }

  if (lowerMessage.includes('itemnotfound') || lowerMessage.includes('not found') || lowerMessage.includes('404')) {
    return {
      title: 'File or folder not found',
      message: rawMessage,
      action: 'The file may have been moved, deleted, renamed, or not synced to OneDrive yet.',
    }
  }

  if (lowerMessage.includes('too many requests') || lowerMessage.includes('timeout') || lowerMessage.includes('network')) {
    return {
      title: 'OneDrive request failed',
      message: rawMessage,
      action: 'This is usually temporary. Refresh the page, or wait a moment for the cache to recover.',
    }
  }

  return {
    title: 'Something went wrong',
    message: rawMessage,
    action: 'Refresh the page first. If it keeps failing, check OneDrive authorization, Cloudflare KV, and recent deployment logs.',
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
          Need more details? Press{' '}
          <kbd className="rounded border border-gray-400/20 bg-gray-100 px-1 font-mono text-xs dark:bg-gray-800">
            F12
          </kbd>{' '}
          and open devtools, or check the GitHub Actions / Cloudflare Pages logs. Upstream issue tracker:{' '}
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

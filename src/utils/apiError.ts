type ApiErrorOptions = {
  fallbackStatus?: number
  publicMessage?: string
  headers?: HeadersInit
}

export const getApiErrorStatus = (error: any, fallbackStatus = 500) =>
  error?.response?.status ?? error?.response?.code ?? error?.status ?? fallbackStatus

export const getApiErrorBody = (error: any, publicMessage = 'Internal server error.') => ({
  error: error?.response?.data ?? error?.message ?? publicMessage,
})

export const apiErrorResponse = (error: any, options: ApiErrorOptions = {}) =>
  new Response(JSON.stringify(getApiErrorBody(error, options.publicMessage)), {
    status: getApiErrorStatus(error, options.fallbackStatus),
    headers: options.headers,
  })

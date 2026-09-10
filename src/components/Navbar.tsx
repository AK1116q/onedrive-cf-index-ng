import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { IconName } from '@fortawesome/fontawesome-svg-core'
import { Dialog, DialogBackdrop, Transition } from '@headlessui/react'
import toast, { Toaster } from 'react-hot-toast'

import Link from 'next/link'
import { useRouter } from 'next/router'
import { Fragment, useEffect, useState } from 'react'

import siteConfig from '../../config/site.config'

const Navbar = () => {
  const router = useRouter()

  const [tokenPresent, setTokenPresent] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    const storedToken = () => {
      for (const r of siteConfig.protectedRoutes) {
        if (localStorage.hasOwnProperty(r)) {
          return true
        }
      }
      return false
    }
    setTokenPresent(storedToken())
  }, [])

  const clearTokens = () => {
    setIsOpen(false)

    siteConfig.protectedRoutes.forEach(r => {
      localStorage.removeItem(r)
    })

    toast.success('已清除所有访问凭据')
    setTimeout(() => {
      router.reload()
    }, 1000)
  }

  return (
    <div className="site-navbar sticky top-0 z-[100] border-b border-white/15 backdrop-blur-xl">
      <Toaster />

      <div className="mx-auto flex w-full items-center justify-between space-x-4 px-4 py-1">
        <Link href="/" passHref className="py-2 font-bold text-pink-950 hover:opacity-70 md:p-2 dark:text-pink-950">
          {siteConfig.title}
        </Link>

        <div className="flex items-center space-x-4 text-gray-700">
          {siteConfig.links.length !== 0 &&
            siteConfig.links.map((l: { name: string; link: string }) => (
              <a
                key={l.name}
                href={l.link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-2 text-pink-950 hover:opacity-70 dark:text-pink-950"
              >
                <FontAwesomeIcon icon={['fab', l.name.toLowerCase() as IconName]} />
                <span className="hidden text-sm font-medium md:inline-block">{l.name}</span>
              </a>
            ))}

          {siteConfig.email && (
            <a
              href={siteConfig.email}
              className="flex items-center space-x-2 text-pink-950 hover:opacity-70 dark:text-pink-950"
            >
              <FontAwesomeIcon icon={['far', 'envelope']} />
              <span className="hidden text-sm font-medium md:inline-block">{'邮箱'}</span>
            </a>
          )}

          {tokenPresent && (
            <button
              className="flex items-center space-x-2 text-pink-950 hover:opacity-70 dark:text-pink-950"
              onClick={() => setIsOpen(true)}
            >
              <span className="hidden text-sm font-medium md:inline-block">{'退出'}</span>
              <FontAwesomeIcon icon="sign-out-alt" />
            </button>
          )}
        </div>
      </div>

      <Transition appear show={isOpen} as={Fragment}>
        <Dialog as="div" className="fixed inset-0 z-10 overflow-y-auto" open={isOpen} onClose={() => setIsOpen(false)}>
          <div className="min-h-screen px-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-100"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="ease-in duration-50"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <DialogBackdrop className="fixed inset-0 bg-gray-50 dark:bg-gray-800" />
            </Transition.Child>

            {/* This element is to trick the browser into centering the modal contents. */}
            <span className="inline-block h-screen align-middle" aria-hidden="true">
              &#8203;
            </span>
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-100"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-50"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <div className="my-8 inline-block w-full max-w-md transform overflow-hidden rounded-lg bg-white p-6 text-left align-middle transition-all dark:bg-gray-900">
                <Dialog.Title className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  {'清除所有访问凭据？'}
                </Dialog.Title>
                <div className="mt-2">
                  <p className="text-sm text-gray-500">
                    {'这些凭据用于进入受密码保护的文件夹。清除后，下次访问需要重新输入密码。'}
                  </p>
                </div>

                <div className="mt-4 max-h-32 overflow-y-scroll font-mono text-sm dark:text-gray-100">
                  {siteConfig.protectedRoutes.map((r, i) => (
                    <div key={i} className="flex items-center space-x-1">
                      <FontAwesomeIcon icon="key" />
                      <span className="truncate">{r}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-8 flex items-center justify-end">
                  <button
                    className="mr-3 inline-flex items-center justify-center space-x-2 rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-400 focus:ring focus:ring-blue-300 focus:outline-none"
                    onClick={() => setIsOpen(false)}
                  >
                    {'取消'}
                  </button>
                  <button
                    className="inline-flex items-center justify-center space-x-2 rounded bg-red-500 px-4 py-2 text-white hover:bg-red-400 focus:ring focus:ring-red-300 focus:outline-none"
                    onClick={() => clearTokens()}
                  >
                    <FontAwesomeIcon icon={['far', 'trash-alt']} />
                    <span>{'全部清除'}</span>
                  </button>
                </div>
              </div>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition>
    </div>
  )
}

export default Navbar

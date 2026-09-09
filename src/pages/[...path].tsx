import Head from 'next/head'
import { useRouter } from 'next/router'

import siteConfig from '../../config/site.config'
import Navbar from '../components/Navbar'
import FileListing from '../components/FileListing'
import Footer from '../components/Footer'
import Breadcrumb from '../components/Breadcrumb'
import SwitchLayout from '../components/SwitchLayout'

export default function Folders() {
  const { query } = useRouter()

  return (
    <div className="site-shell flex min-h-screen flex-col items-center justify-center">
      <Head>
        <title>{siteConfig.title}</title>
      </Head>

      <main className="site-main flex w-full flex-1 flex-col">
        <Navbar />
        <div className="archive-content mx-auto w-full max-w-[92rem] py-4 sm:p-4">
          <nav className="mb-4 flex items-center justify-between space-x-3 px-4 sm:px-0 sm:pl-1">
            <Breadcrumb query={query} />
            <SwitchLayout />
          </nav>
          <FileListing query={query} />
        </div>
      </main>

      <Footer />
    </div>
  )
}

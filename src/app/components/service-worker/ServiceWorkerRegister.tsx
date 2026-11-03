'use client'

import { useEffect } from 'react'

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    if (process.env.NODE_ENV !== 'production') {
      const cleanupDevelopmentServiceWorker = async () => {
        const serviceWorkerUrl = new URL('/sw.js', window.location.origin).href
        const registrations = await navigator.serviceWorker.getRegistrations()
        const appRegistrations = registrations.filter((registration) =>
          [
            registration.active,
            registration.waiting,
            registration.installing,
          ].some((worker) => worker?.scriptURL === serviceWorkerUrl),
        )

        await Promise.all(
          appRegistrations.map((registration) => registration.unregister()),
        )

        const cacheNames = await caches.keys()
        await Promise.all(
          cacheNames
            .filter(
              (cacheName) =>
                cacheName === 'tailwind-admin-cache-v1' ||
                cacheName.startsWith('skala-prioritas-static-'),
            )
            .map((cacheName) => caches.delete(cacheName)),
        )
      }

      void cleanupDevelopmentServiceWorker().catch((error: unknown) => {
        console.error('Development service worker cleanup failed:', error)
      })
      return
    }

    let disposed = false
    let refreshing = false
    const reloadOnControllerChange = () => {
      if (disposed || refreshing) return
      refreshing = true
      window.location.reload()
    }

    navigator.serviceWorker.addEventListener(
      'controllerchange',
      reloadOnControllerChange,
    )

    void navigator.serviceWorker
      .register('/sw.js', { updateViaCache: 'none' })
      .then(async (registration) => {
        await registration.update()
      })
      .catch((error: unknown) => {
        console.error('Service worker update failed:', error)
      })

    return () => {
      disposed = true
      navigator.serviceWorker.removeEventListener(
        'controllerchange',
        reloadOnControllerChange,
      )
    }
  }, [])

  return null
}

'use client'

import { LayoutGrid, ListTodo, BarChart3, Settings2Icon, Mail } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'

export default function Sidebar() {
  const pathname = usePathname()
  const { user } = useAuth()

  const isBotnoiEmployee = user?.email?.endsWith('@botnoigroup.com') ?? false

  const navigation = [
    {
      section: 'Planning',
      items: [
        { name: 'Projects', icon: LayoutGrid, href: '/' },
        { name: 'Teams', icon: ListTodo, href: '/teams' },
        { name: 'Reports', icon: BarChart3, href: '/reports' },
        { name: 'Settings', icon: Settings2Icon, href: '/settings' },
      ],
    },
  ]

  return (
    <aside className="w-64 bg-white border-r border-gray-200 p-4 overflow-y-auto flex-shrink-0 flex flex-col">
      <nav className="space-y-1 flex-1">
        {navigation.map((section) => (
          <div key={section.section}>
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 mt-6 first:mt-0">
              {section.section}
            </div>
            {section.items.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center space-x-3 px-3 py-2 rounded-md transition-colors ${isActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-50'
                    }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className={isActive ? 'font-medium' : ''}>{item.name}</span>
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Invite button — only for Botnoi employees */}
      {isBotnoiEmployee && (
        <div className="pt-4 border-t border-gray-100 mt-4">
          <Link
            href="/invite"
            className={`flex items-center space-x-3 px-3 py-2 rounded-md transition-colors ${pathname === '/invite'
                ? 'bg-blue-50 text-blue-700'
                : 'text-blue-600 hover:bg-blue-50'
              }`}
          >
            <Mail className="w-5 h-5" />
            <span className={pathname === '/invite' ? 'font-medium' : ''}>Send Invitation</span>
          </Link>
        </div>
      )}
    </aside>
  )
}

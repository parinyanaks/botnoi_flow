'use client'

import { LayoutGrid, ListTodo, BarChart3, Settings2Icon } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Sidebar() {
  const pathname = usePathname()

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
    <aside className="w-64 bg-white border-r border-gray-200 p-4 overflow-y-auto flex-shrink-0">
      <nav className="space-y-1">
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
                  className={`flex items-center space-x-3 px-3 py-2 rounded-md transition-colors ${
                    isActive
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
    </aside>
  )
}

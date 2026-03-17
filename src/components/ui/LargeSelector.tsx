'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Check, ChevronDown, Search, X } from 'lucide-react'

interface Option {
  id: string
  name: string
}

interface LargeSelectorProps {
  label: string
  options: Option[]
  value: string
  onChange: (id: string, name: string) => void
  placeholder?: string
  disabled?: boolean
}

export function LargeSelector({ label, options, value, onChange, placeholder = '選んでください', disabled }: LargeSelectorProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const selected = options.find(o => o.id === value)
  const filtered = options.filter(o => o.name.includes(search))

  return (
    <>
      {/* トリガー */}
      <button
        type="button"
        onClick={() => !disabled && setOpen(true)}
        disabled={disabled}
        className={cn(
          'w-full min-h-[56px] flex items-center justify-between px-4 rounded-xl border-2 text-left transition-colors',
          disabled ? 'bg-gray-50 border-gray-200 opacity-50 cursor-not-allowed' :
          value ? 'border-blue-600 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'
        )}
      >
        <div>
          <p className="text-xs text-gray-500 mb-0.5">{label}</p>
          <p className={cn('text-base font-medium', value ? 'text-gray-900' : 'text-gray-400')}>
            {selected?.name ?? placeholder}
          </p>
        </div>
        <ChevronDown className={cn('h-5 w-5 flex-shrink-0', value ? 'text-blue-600' : 'text-gray-400')} />
      </button>

      {/* オーバーレイ */}
      {open && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end md:justify-center md:items-center" onClick={() => setOpen(false)}>
          <div
            className="bg-white w-full md:w-[480px] md:rounded-2xl rounded-t-2xl shadow-2xl max-h-[70vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* ヘッダー */}
            <div className="flex items-center justify-between p-4 border-b">
              <p className="text-lg font-bold text-gray-900">{label}を選んでください</p>
              <button onClick={() => setOpen(false)} className="p-2 rounded-full hover:bg-gray-100">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            {/* 検索 */}
            {options.length > 5 && (
              <div className="px-4 py-3 border-b">
                <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-2">
                  <Search className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <input
                    type="text"
                    placeholder="キーワードで検索"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="bg-transparent flex-1 text-base outline-none text-gray-900 placeholder:text-gray-400"
                    autoFocus
                  />
                </div>
              </div>
            )}

            {/* 選択肢リスト */}
            <div className="overflow-y-auto flex-1">
              {filtered.length === 0 ? (
                <p className="text-center text-gray-500 py-8">見つかりません</p>
              ) : (
                filtered.map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => { onChange(opt.id, opt.name); setOpen(false); setSearch('') }}
                    className={cn(
                      'w-full flex items-center justify-between px-4 py-4 text-left border-b last:border-0 min-h-[56px] hover:bg-gray-50 active:bg-gray-100',
                      opt.id === value && 'bg-blue-50'
                    )}
                  >
                    <span className="text-base font-medium text-gray-900">{opt.name}</span>
                    {opt.id === value && <Check className="h-5 w-5 text-blue-600 flex-shrink-0" />}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'
import { projectService } from '@/services/api'
import type { Project } from '@/services/api'
import { supabase } from '@/lib/supabaseClient'
import { Mail, Users, Eye, CheckCircle, AlertCircle, ChevronDown, X } from 'lucide-react'

export default function InvitePage() {
    const { user, isLoading: authLoading, isAuthenticated } = useAuth()
    const router = useRouter()

    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [role, setRole] = useState<'member' | 'guest'>('member')
    const [projects, setProjects] = useState<Project[]>([])
    const [selectedProjectIds, setSelectedProjectIds] = useState<number[]>([])
    const [isLoadingProjects, setIsLoadingProjects] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [success, setSuccess] = useState(false)
    const [error, setError] = useState('')

    // Only Botnoi employees can access this page
    const isBotnoiEmployee = user?.email?.endsWith('@botnoigroup.com') ?? false

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.replace('/login')
            return
        }
        if (!authLoading && isAuthenticated && !isBotnoiEmployee) {
            router.replace('/')
        }
    }, [authLoading, isAuthenticated, isBotnoiEmployee, router])

    useEffect(() => {
        if (role === 'guest') {
            setIsLoadingProjects(true)
            projectService.getProjects()
                .then(setProjects)
                .catch(() => setProjects([]))
                .finally(() => setIsLoadingProjects(false))
        }
    }, [role])

    const toggleProject = (id: number) => {
        setSelectedProjectIds((prev) =>
            prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
        )
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')

        if (role === 'guest' && selectedProjectIds.length === 0) {
            setError('กรุณาเลือก Project อย่างน้อย 1 Project สำหรับ Guest')
            return
        }

        setIsSubmitting(true)

        try {
            // Get fresh token from Supabase session (not stale localStorage value)
            const { data: sessionData } = await supabase.auth.getSession()
            const token = sessionData?.session?.access_token
            if (!token) {
                throw new Error('ไม่พบ session กรุณาเข้าสู่ระบบใหม่')
            }
            const res = await fetch('/api/invite/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    name,
                    email,
                    role,
                    projectIds: role === 'guest' ? selectedProjectIds : undefined,
                }),
            })

            const data = await res.json()
            if (!res.ok) {
                throw new Error(data.error || 'Failed to send invitation')
            }

            setSuccess(true)
            setName('')
            setEmail('')
            setRole('member')
            setSelectedProjectIds([])
        } catch (err: any) {
            setError(err.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่')
        } finally {
            setIsSubmitting(false)
        }
    }

    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-start justify-center px-4 py-12">
            <div className="w-full max-w-lg">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl shadow-lg mb-4">
                        <Mail className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900">ส่ง Invitation</h1>
                    <p className="text-gray-500 mt-2">เชิญสมาชิกเข้าร่วม Botnoi Flow</p>
                </div>

                {/* Success State */}
                {success && (
                    <div className="mb-6 p-5 bg-green-50 border border-green-200 rounded-2xl flex items-start gap-3">
                        <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="font-semibold text-green-800">ส่ง Invitation สำเร็จ! ✅</p>
                            <p className="text-sm text-green-700 mt-1">
                                อีเมล์ถูกส่งไปที่ <strong>{email || 'ผู้รับ'}</strong> แล้ว Link จะหมดอายุใน 24 ชั่วโมง
                            </p>
                            <button
                                onClick={() => { setSuccess(false); setEmail('') }}
                                className="mt-3 text-sm text-green-700 underline hover:text-green-900"
                            >
                                ส่ง Invitation อีกครั้ง
                            </button>
                        </div>
                    </div>
                )}

                {/* Form Card */}
                {!success && (
                    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
                        {error && (
                            <div className="mb-5 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                                <p className="text-sm text-red-700">{error}</p>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-5">
                            {/* Name */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    ชื่อ-นามสกุล <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required
                                    placeholder="เช่น สมชาย ใจดี"
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                />
                            </div>

                            {/* Email */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Email <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    placeholder="example@email.com"
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                />
                            </div>

                            {/* Role Selector */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-3">
                                    Role <span className="text-red-500">*</span>
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    {/* Member */}
                                    <button
                                        type="button"
                                        onClick={() => { setRole('member'); setSelectedProjectIds([]) }}
                                        className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${role === 'member'
                                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                                            : 'border-gray-200 hover:border-gray-300 text-gray-600'
                                            }`}
                                    >
                                        <Users className="w-6 h-6" />
                                        <div className="text-center">
                                            <p className="font-semibold text-sm">Member</p>
                                            <p className="text-xs opacity-75 mt-0.5">แก้ไข card ได้</p>
                                        </div>
                                        {role === 'member' && (
                                            <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                                                <CheckCircle className="w-4 h-4 text-white" />
                                            </div>
                                        )}
                                    </button>

                                    {/* Guest */}
                                    <button
                                        type="button"
                                        onClick={() => setRole('guest')}
                                        className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${role === 'guest'
                                            ? 'border-purple-500 bg-purple-50 text-purple-700'
                                            : 'border-gray-200 hover:border-gray-300 text-gray-600'
                                            }`}
                                    >
                                        <Eye className="w-6 h-6" />
                                        <div className="text-center">
                                            <p className="font-semibold text-sm">Guest</p>
                                            <p className="text-xs opacity-75 mt-0.5">ดูได้อย่างเดียว</p>
                                        </div>
                                        {role === 'guest' && (
                                            <div className="w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center">
                                                <CheckCircle className="w-4 h-4 text-white" />
                                            </div>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Project Selector (Guest only) */}
                            {role === 'guest' && (
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        เลือก Project ที่ Guest เข้าถึงได้ <span className="text-red-500">*</span>
                                    </label>
                                    {isLoadingProjects ? (
                                        <div className="flex items-center gap-2 p-4 text-gray-500 text-sm">
                                            <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
                                            กำลังโหลด Projects...
                                        </div>
                                    ) : (
                                        <div className="border border-gray-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                                            {projects.length === 0 ? (
                                                <p className="p-4 text-sm text-gray-500 text-center">ไม่พบ Projects</p>
                                            ) : (
                                                projects.map((project) => {
                                                    const isSelected = selectedProjectIds.includes(project.id)
                                                    return (
                                                        <button
                                                            key={project.id}
                                                            type="button"
                                                            onClick={() => toggleProject(project.id)}
                                                            className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-b border-gray-100 last:border-0 ${isSelected ? 'bg-purple-50' : 'hover:bg-gray-50'
                                                                }`}
                                                        >
                                                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${isSelected ? 'border-purple-500 bg-purple-500' : 'border-gray-300'
                                                                }`}>
                                                                {isSelected && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                                                            </div>
                                                            <span className={`text-sm font-medium ${isSelected ? 'text-purple-700' : 'text-gray-700'}`}>
                                                                {project.name}
                                                            </span>
                                                            {project.prefix && (
                                                                <span className="ml-auto text-xs text-gray-400 font-mono">{project.prefix}</span>
                                                            )}
                                                        </button>
                                                    )
                                                })
                                            )}
                                        </div>
                                    )}
                                    {selectedProjectIds.length > 0 && (
                                        <p className="mt-2 text-xs text-purple-600 font-medium">
                                            เลือกแล้ว {selectedProjectIds.length} Project
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* Info Banner */}
                            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                                <p className="text-xs text-amber-700">
                                    <span className="font-semibold">⏰ Link หมดอายุใน 24 ชั่วโมง</span> —
                                    อีเมล์จะถูกส่งหาผู้รับโดยอัตโนมัติ ผู้รับคลิก link แล้วตั้ง Password ได้เลย
                                </p>
                            </div>

                            {/* Submit */}
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm"
                            >
                                {isSubmitting ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                        กำลังส่ง...
                                    </>
                                ) : (
                                    <>
                                        <Mail className="w-5 h-5" />
                                        ส่ง Invitation Email
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                )}

                {/* Back link */}
                <p className="text-center mt-6 text-sm text-gray-500">
                    <button onClick={() => router.back()} className="hover:text-gray-700 underline">
                        ← กลับไปหน้าที่แล้ว
                    </button>
                </p>
            </div>
        </div>
    )
}

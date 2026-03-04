'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { CheckCircle, AlertCircle, Eye, EyeOff, Lock, Users } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'

function AcceptInviteContent() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const token = searchParams.get('token')

    const [inviteInfo, setInviteInfo] = useState<{
        name: string
        email: string
        role: 'member' | 'guest'
        projectIds: number[]
    } | null>(null)
    const [fetchError, setFetchError] = useState('')
    const [isFetching, setIsFetching] = useState(true)

    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirm, setShowConfirm] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [submitError, setSubmitError] = useState('')
    const [success, setSuccess] = useState(false)

    // Fetch invitation info
    useEffect(() => {
        if (!token) {
            setFetchError('ไม่พบ Invitation link กรุณาตรวจสอบ link อีกครั้ง')
            setIsFetching(false)
            return
        }

        fetch(`/api/invite/accept?token=${token}`)
            .then((r) => r.json())
            .then((data) => {
                if (data.error) {
                    setFetchError(data.error)
                } else {
                    setInviteInfo(data)
                }
            })
            .catch(() => setFetchError('ไม่สามารถโหลดข้อมูล Invitation ได้'))
            .finally(() => setIsFetching(false))
    }, [token])

    const isPasswordValid = password.length >= 6
    const isPasswordMatch = password === confirmPassword
    const canSubmit = isPasswordValid && isPasswordMatch && !isSubmitting

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSubmitError('')

        if (!isPasswordValid) {
            setSubmitError('Password ต้องมีอย่างน้อย 6 ตัวอักษร')
            return
        }
        if (!isPasswordMatch) {
            setSubmitError('Password ไม่ตรงกัน')
            return
        }

        setIsSubmitting(true)
        try {
            // Step 1: Call API to create user account
            const res = await fetch('/api/invite/accept', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, password }),
            })
            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error || 'เกิดข้อผิดพลาด')
            }

            // Step 2: Sign out any existing session (e.g. the inviter's session)
            await supabase.auth.signOut()
            localStorage.removeItem('authToken')
            document.cookie = 'authToken=; path=/; max-age=0'

            // Step 3: Sign in as the NEW user via Supabase SDK
            const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
                email: inviteInfo!.email,
                password,
            })

            if (signInError || !signInData.session) {
                // Account was created but sign-in failed — redirect to login
                setSuccess(true)
                setTimeout(() => router.replace('/login'), 2000)
                return
            }

            // Step 4: Store the NEW user's token
            const newToken = signInData.session.access_token
            localStorage.setItem('authToken', newToken)
            document.cookie = `authToken=${newToken}; path=/; max-age=${60 * 60 * 24 * 7}`

            setSuccess(true)
            setTimeout(() => router.replace('/'), 2000)
        } catch (err: any) {
            setSubmitError(err.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่')
        } finally {
            setIsSubmitting(false)
        }
    }

    // Loading state
    if (isFetching) {
        return (
            <div className="flex flex-col items-center justify-center gap-3 py-12">
                <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                <p className="text-gray-500 text-sm">กำลังตรวจสอบ Invitation...</p>
            </div>
        )
    }

    // Error state (expired/invalid/already used)
    if (fetchError) {
        return (
            <div className="text-center py-8">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-2xl mb-4">
                    <AlertCircle className="w-8 h-8 text-red-500" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">ไม่สามารถใช้ Link นี้ได้</h2>
                <p className="text-gray-500 text-sm max-w-xs mx-auto">{fetchError}</p>
                <p className="mt-4 text-sm text-gray-400">กรุณาติดต่อพี่เลี้ยงเพื่อขอ Invitation link ใหม่</p>
            </div>
        )
    }

    // Success state
    if (success) {
        return (
            <div className="text-center py-8">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-2xl mb-4">
                    <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">ยินดีต้อนรับ! 🎉</h2>
                <p className="text-gray-500 text-sm">
                    บัญชีของคุณถูกสร้างแล้ว กำลังพาไปยังหน้าหลัก...
                </p>
                <div className="mt-4 w-8 h-8 border-4 border-green-200 border-t-green-500 rounded-full animate-spin mx-auto" />
            </div>
        )
    }

    // Main form
    return (
        <>
            {/* Invitation Info Banner */}
            {inviteInfo && (
                <div className={`mb-6 p-4 rounded-xl border ${inviteInfo.role === 'member'
                    ? 'bg-blue-50 border-blue-200'
                    : 'bg-purple-50 border-purple-200'
                    }`}>
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${inviteInfo.role === 'member' ? 'bg-blue-100' : 'bg-purple-100'
                            }`}>
                            {inviteInfo.role === 'member'
                                ? <Users className="w-5 h-5 text-blue-600" />
                                : <Eye className="w-5 h-5 text-purple-600" />
                            }
                        </div>
                        <div>
                            <p className="font-semibold text-gray-900 text-sm">สวัสดี, {inviteInfo.name}!</p>
                            <p className={`text-xs font-medium ${inviteInfo.role === 'member' ? 'text-blue-600' : 'text-purple-600'
                                }`}>
                                Role: {inviteInfo.role === 'member' ? '✏️ Member (แก้ไขการ์ดได้)' : '👁 Guest (ดูได้อย่างเดียว)'}
                            </p>
                        </div>
                    </div>
                    <p className="mt-2 text-xs text-gray-500">Email: {inviteInfo.email}</p>
                </div>
            )}

            {submitError && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700">{submitError}</p>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Password */}
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                        ตั้ง Password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                        <input
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            minLength={6}
                            placeholder="อย่างน้อย 6 ตัวอักษร"
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all pr-11"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                    </div>
                    {password.length > 0 && (
                        <p className={`text-xs mt-1 ${isPasswordValid ? 'text-green-600' : 'text-red-500'}`}>
                            {isPasswordValid ? '✓ Password ยาวพอ' : 'ต้องการอย่างน้อย 6 ตัวอักษร'}
                        </p>
                    )}
                </div>

                {/* Confirm Password */}
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                        ยืนยัน Password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                        <input
                            type={showConfirm ? 'text' : 'password'}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            minLength={6}
                            placeholder="พิมพ์ Password อีกครั้ง"
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all pr-11"
                        />
                        <button
                            type="button"
                            onClick={() => setShowConfirm(!showConfirm)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                            {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                    </div>
                    {confirmPassword.length > 0 && (
                        <p className={`text-xs mt-1 ${isPasswordMatch ? 'text-green-600' : 'text-red-500'}`}>
                            {isPasswordMatch ? '✓ Password ตรงกัน' : 'Password ไม่ตรงกัน'}
                        </p>
                    )}
                </div>

                <button
                    type="submit"
                    disabled={!canSubmit}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm mt-2"
                >
                    {isSubmitting ? (
                        <>
                            <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                            กำลังสร้างบัญชี...
                        </>
                    ) : (
                        <>
                            <Lock className="w-5 h-5" />
                            ยืนยัน & เข้าร่วม Botnoi Flow
                        </>
                    )}
                </button>
            </form>
        </>
    )
}

export default function AcceptInvitePage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-start justify-center px-4 py-12">
            <div className="w-full max-w-md">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-blue-600 mb-1">Botnoi Flow</h1>
                    <p className="text-gray-500 text-sm">ตั้ง Password เพื่อเริ่มใช้งาน</p>
                </div>

                <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
                    <Suspense fallback={
                        <div className="flex items-center justify-center py-10">
                            <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                        </div>
                    }>
                        <AcceptInviteContent />
                    </Suspense>
                </div>
            </div>
        </div>
    )
}

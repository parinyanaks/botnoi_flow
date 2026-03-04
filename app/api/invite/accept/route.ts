import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Admin client bypasses RLS for invitations table
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
})

// GET: Fetch invitation info from token (for rendering the accept page)
export async function GET(req: NextRequest) {
    try {
        const token = req.nextUrl.searchParams.get('token')
        if (!token) {
            return NextResponse.json({ error: 'Missing token' }, { status: 400 })
        }

        const { data: invitation, error } = await supabaseAdmin
            .from('invitations')
            .select('id, recipient_name, recipient_email, role, project_ids, expires_at, accepted_at')
            .eq('token', token)
            .maybeSingle()

        if (error || !invitation) {
            return NextResponse.json({ error: 'Invalid or expired invitation link' }, { status: 404 })
        }

        // Check expiry
        if (new Date(invitation.expires_at) < new Date()) {
            return NextResponse.json({ error: 'Invitation link has expired (24-hour limit)' }, { status: 410 })
        }

        // Check already accepted
        if (invitation.accepted_at) {
            return NextResponse.json({ error: 'This invitation has already been used' }, { status: 409 })
        }

        return NextResponse.json({
            name: invitation.recipient_name,
            email: invitation.recipient_email,
            role: invitation.role,
            projectIds: invitation.project_ids ?? [],
        })
    } catch (err: any) {
        console.error('[invite/accept GET]', err)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

// POST: Accept invitation — register user via Supabase Admin, mark accepted
export async function POST(req: NextRequest) {
    try {
        const { token, password } = await req.json()
        if (!token || !password) {
            return NextResponse.json({ error: 'Missing token or password' }, { status: 400 })
        }

        // Fetch invitation using admin client (bypasses RLS)
        const { data: invitation, error: fetchError } = await supabaseAdmin
            .from('invitations')
            .select('*')
            .eq('token', token)
            .maybeSingle()

        if (fetchError || !invitation) {
            return NextResponse.json({ error: 'Invalid invitation' }, { status: 404 })
        }
        if (new Date(invitation.expires_at) < new Date()) {
            return NextResponse.json({ error: 'Invitation link has expired' }, { status: 410 })
        }
        if (invitation.accepted_at) {
            return NextResponse.json({ error: 'Invitation already used' }, { status: 409 })
        }

        // Use service role key to create user (bypasses email confirmation)
        if (!supabaseServiceKey) {
            return NextResponse.json(
                { error: 'Server misconfiguration: SUPABASE_SERVICE_ROLE_KEY not set' },
                { status: 500 }
            )
        }

        const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
            auth: { autoRefreshToken: false, persistSession: false },
        })

        // Create the user in auth.users
        const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
            email: invitation.recipient_email,
            password,
            email_confirm: true,
            user_metadata: {
                name: invitation.recipient_name,
                role: invitation.role,
                project_ids: invitation.project_ids ?? [],
            },
        })

        let userId: string | undefined = newUser?.user?.id

        if (createError) {
            if (!createError.message.toLowerCase().includes('already registered')) {
                console.error('[invite/accept POST] createUser error:', createError)
                return NextResponse.json({ error: createError.message }, { status: 400 })
            }

            // User already exists — find them and UPDATE their metadata with new project_ids
            const { data: existingUsers } = await adminClient.auth.admin.listUsers()
            const existingUser = existingUsers?.users?.find((u: any) => u.email === invitation.recipient_email)
            if (existingUser) {
                userId = existingUser.id
                // Merge old project_ids with new ones
                const oldProjectIds: number[] = Array.isArray(existingUser.user_metadata?.project_ids)
                    ? existingUser.user_metadata.project_ids
                    : []
                const newProjectIds: number[] = Array.isArray(invitation.project_ids)
                    ? invitation.project_ids
                    : []
                const mergedProjectIds = Array.from(new Set([...oldProjectIds, ...newProjectIds]))

                await adminClient.auth.admin.updateUserById(existingUser.id, {
                    user_metadata: {
                        ...existingUser.user_metadata,
                        name: invitation.recipient_name,
                        role: invitation.role,
                        project_ids: mergedProjectIds,
                    },
                })
                console.log('[invite/accept] Updated existing user metadata with project_ids:', mergedProjectIds)
            }
        }

        // Create/update the profile in profiles table
        if (userId) {
            const projectIds = invitation.project_ids ?? []
            const profilePayload: any = {
                id: userId,
                full_name: invitation.recipient_name,
                email: invitation.recipient_email,
                role: invitation.role,
            }
            if (invitation.role === 'guest' && projectIds.length > 0) {
                profilePayload.invited_project_id = projectIds[0]
            }
            if (invitation.inviter_email) {
                const { data: inviterUsers } = await adminClient.auth.admin.listUsers()
                const inviter = inviterUsers?.users?.find((u: any) => u.email === invitation.inviter_email)
                if (inviter) {
                    profilePayload.invited_by = inviter.id
                }
            }

            const { error: profileError } = await supabaseAdmin
                .from('profiles')
                .upsert(profilePayload, { onConflict: 'id' })

            if (profileError) {
                console.error('[invite/accept POST] Profile upsert error:', profileError)
            }
        }

        // Mark the invitation as accepted
        await supabaseAdmin
            .from('invitations')
            .update({ accepted_at: new Date().toISOString(), used: true })
            .eq('id', invitation.id)

        // Sign in to get a session token for the frontend
        const anonClient = createClient(supabaseUrl, supabaseAnonKey)
        const { data: signInData, error: signInError } = await anonClient.auth.signInWithPassword({
            email: invitation.recipient_email,
            password,
        })

        if (signInError || !signInData.session) {
            return NextResponse.json({ error: 'Account created. Please log in manually.' }, { status: 200 })
        }

        return NextResponse.json({
            success: true,
            token: signInData.session.access_token,
            user: {
                email: invitation.recipient_email,
                name: invitation.recipient_name,
                role: invitation.role,
            },
        })
    } catch (err: any) {
        console.error('[invite/accept POST]', err)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, XCircle, UserPlus } from 'lucide-react';

interface InvitationData {
  id: string;
  email: string;
  role: 'staff' | 'viewer';
  shop_id: string;
  expires_at: string;
  shops: {
    name: string;
  };
}

export default function AcceptInvitePage() {
  const params = useParams();
  const router = useRouter();
  const { user, refreshProfile } = useAuth();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const token = params.token as string;

  // Load invitation details
  useEffect(() => {
    async function loadInvitation() {
      try {
        const { data, error } = await supabase
          .from('shop_invitations')
          .select(`
            id,
            email,
            role,
            shop_id,
            expires_at,
            accepted_at,
            shops (
              name
            )
          `)
          .eq('token', token)
          .single();

        if (error || !data) {
          setError('Invalid invitation link');
          setLoading(false);
          return;
        }

        if (data.accepted_at) {
          setError('This invitation has already been used');
          setLoading(false);
          return;
        }

        if (new Date(data.expires_at) < new Date()) {
          setError('This invitation has expired');
          setLoading(false);
          return;
        }

        setInvitation(data as unknown as InvitationData);
        setLoading(false);
      } catch (err) {
        setError('Failed to load invitation');
        setLoading(false);
      }
    }

    if (token) {
      loadInvitation();
    }
  }, [token, supabase]);

  // Accept invitation
  async function handleAccept() {
    if (!user || !invitation) return;

    setAccepting(true);

    try {
      const { data, error } = await supabase.rpc('accept_invitation', {
        p_token: token,
        p_user_id: user.id,
      });

      if (error) throw error;

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to accept invitation');
      }

      setSuccess(true);

      // Refresh profile to get new shop
      await refreshProfile();

      // Redirect to dashboard after short delay
      setTimeout(() => {
        router.push('/');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to accept invitation');
    } finally {
      setAccepting(false);
    }
  }

  // Not logged in - redirect to register with invite context
  if (!loading && !user && invitation) {
    return (
      <div className="min-h-screen animated-gradient flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-bg rounded-2xl shadow-2xl border border-border-muted p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-primary/20 flex items-center justify-center">
            <UserPlus size={32} className="text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-text mb-2">You're Invited!</h1>
          <p className="text-text-muted mb-6">
            You've been invited to join <span className="font-semibold text-text">{invitation.shops.name}</span> as a {invitation.role}.
          </p>
          <p className="text-sm text-text-muted mb-6">
            Create an account or sign in to accept this invitation.
          </p>
          <div className="space-y-3">
            <Button
              onClick={() => router.push(`/register?invite=${token}&email=${encodeURIComponent(invitation.email)}`)}
              className="w-full bg-primary hover:bg-primary/90"
            >
              Create Account
            </Button>
            <Button
              onClick={() => router.push(`/login?invite=${token}`)}
              variant="outline"
              className="w-full"
            >
              Sign In
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen animated-gradient flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen animated-gradient flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-bg rounded-2xl shadow-2xl border border-border-muted p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-danger/20 flex items-center justify-center">
            <XCircle size={32} className="text-danger" />
          </div>
          <h1 className="text-2xl font-bold text-text mb-2">Invalid Invitation</h1>
          <p className="text-text-muted mb-6">{error}</p>
          <Button onClick={() => router.push('/login')} className="bg-primary hover:bg-primary/90">
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen animated-gradient flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-bg rounded-2xl shadow-2xl border border-border-muted p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-success/20 flex items-center justify-center">
            <CheckCircle size={32} className="text-success" />
          </div>
          <h1 className="text-2xl font-bold text-text mb-2">Welcome to the Team!</h1>
          <p className="text-text-muted mb-2">
            You've joined <span className="font-semibold text-text">{invitation?.shops.name}</span>
          </p>
          <p className="text-sm text-text-muted">Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  // Logged in - show accept button
  return (
    <div className="min-h-screen animated-gradient flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-bg rounded-2xl shadow-2xl border border-border-muted p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-primary/20 flex items-center justify-center">
          <UserPlus size={32} className="text-primary" />
        </div>
        <h1 className="text-2xl font-bold text-text mb-2">Join {invitation?.shops.name}</h1>
        <p className="text-text-muted mb-6">
          You've been invited to join as a <span className="font-semibold text-primary">{invitation?.role}</span>.
        </p>

        {user?.email?.toLowerCase() !== invitation?.email.toLowerCase() && (
          <div className="mb-6 p-3 rounded-lg bg-danger/10 border border-danger/30 text-sm text-danger">
            <strong>Email Mismatch:</strong> This invite was sent to {invitation?.email}, but you're signed in as {user?.email}.
            Please log out and sign in with the correct email address to accept this invitation.
          </div>
        )}

        <Button
          onClick={handleAccept}
          disabled={accepting || user?.email?.toLowerCase() !== invitation?.email.toLowerCase()}
          className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {accepting ? (
            <>
              <Loader2 size={16} className="animate-spin mr-2" />
              Joining...
            </>
          ) : (
            'Accept Invitation'
          )}
        </Button>
      </div>
    </div>
  );
}

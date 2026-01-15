'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Settings, User, Building2, Palette, Bell, Lock, Save,
  Loader2, Check, AlertCircle, Eye, EyeOff, Moon, Sun, AlertTriangle,
  Users, Mail, Trash2, Copy, UserPlus, Calendar, Link, ExternalLink
} from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { getShopSettingsMigrationSQL } from '@/lib/supabase/migrations';

// Get supabase client ONCE outside component to prevent re-creation on renders
const supabase = createClient();

type SettingsTab = 'profile' | 'business' | 'preferences' | 'notifications' | 'security' | 'team' | 'booking';

interface Invitation {
  id: string;
  email: string;
  role: 'staff' | 'viewer';
  token: string;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
}

interface TeamMember {
  id: string;
  full_name: string | null;
  email: string | null;
  role: 'owner' | 'staff' | 'viewer';
}

export default function SettingsPage() {
  const { user, profile, shop, refreshProfile, isOwner, loading: authLoading } = useAuth();
  const { toast } = useToast();

  // Page state
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [pageLoading, setPageLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null); // Track which section is saving
  const [migrationNeeded, setMigrationNeeded] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  // Form states - initialized empty, filled when data loads
  const [profileForm, setProfileForm] = useState({ full_name: '', email: '' });
  const [businessForm, setBusinessForm] = useState({ name: '', email: '', phone: '', address: '' });
  const [preferencesForm, setPreferencesForm] = useState({ tax_rate: '0', currency: 'USD' });
  const [notificationsForm, setNotificationsForm] = useState({ email_notifications: true, low_stock_threshold: '10' });
  const [passwordForm, setPasswordForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false });

  // Team state
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'staff' as 'staff' | 'viewer' });
  const [inviteLoading, setInviteLoading] = useState(false);

  // Booking state
  const [bookingForm, setBookingForm] = useState({
    slug: '',
    booking_enabled: false,
  });

  // Initialize data with timeout
  useEffect(() => {
    const timeout = setTimeout(() => {
      // Only show timeout toast if still loading AND user is authenticated
      if (pageLoading && user) {
        setPageLoading(false);
        toast({
          variant: "destructive",
          title: "Loading timeout",
          description: "Some data may not have loaded. Try refreshing.",
        });
      }
    }, 5000); // 5 second timeout

    if (profile && shop) {
      // Profile form
      setProfileForm({
        full_name: profile.full_name || '',
        email: profile.email || user?.email || '',
      });

      // Business form
      setBusinessForm({
        name: shop.name || '',
        email: shop.email || '',
        phone: shop.phone || '',
        address: shop.address || '',
      });

      // Check if new columns exist by checking if tax_rate is defined
      const hasNewColumns = shop.tax_rate !== undefined;
      setMigrationNeeded(!hasNewColumns);

      // Preferences - use string for easier input handling
      setPreferencesForm({
        tax_rate: String(shop.tax_rate ?? 0),
        currency: shop.currency || 'USD',
      });

      // Notifications
      setNotificationsForm({
        email_notifications: shop.email_notifications ?? true,
        low_stock_threshold: String(shop.low_stock_threshold ?? 10),
      });

      // Theme from localStorage
      const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
      if (savedTheme) setTheme(savedTheme);

      // Booking
      setBookingForm({
        slug: shop.slug || '',
        booking_enabled: shop.booking_enabled ?? false,
      });

      setPageLoading(false);
      clearTimeout(timeout);
    } else if (profile && !shop) {
      // Profile loaded but no shop - still show page
      setProfileForm({
        full_name: profile.full_name || '',
        email: profile.email || user?.email || '',
      });
      setPageLoading(false);
      clearTimeout(timeout);
    }

    return () => clearTimeout(timeout);
  }, [profile, shop, user]);

  // Save handlers with proper loading states
  const handleSaveProfile = useCallback(async () => {
    if (!profile) return;
    setSaving('profile');

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: profileForm.full_name, updated_at: new Date().toISOString() })
        .eq('id', profile.id);

      if (error) throw error;

      await refreshProfile();
      toast({ title: "Saved!", description: "Profile updated" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message || "Failed to save" });
    } finally {
      setSaving(null);
    }
  }, [profile, profileForm, supabase, refreshProfile, toast]);

  const handleSaveBusiness = useCallback(async () => {
    if (!shop || !isOwner) return;
    setSaving('business');

    try {
      const { error } = await supabase
        .from('shops')
        .update({
          name: businessForm.name,
          email: businessForm.email,
          phone: businessForm.phone,
          address: businessForm.address,
          updated_at: new Date().toISOString(),
        })
        .eq('id', shop.id);

      if (error) throw error;

      await refreshProfile();
      toast({ title: "Saved!", description: "Business info updated" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message || "Failed to save" });
    } finally {
      setSaving(null);
    }
  }, [shop, isOwner, businessForm, supabase, refreshProfile, toast]);

  const handleSavePreferences = useCallback(async () => {
    if (!shop || !isOwner) return;
    setSaving('preferences');

    // Always save theme locally first
    localStorage.setItem('theme', theme);
    document.documentElement.classList.remove('dark', 'light');
    document.documentElement.classList.add(theme);

    try {
      const taxRate = parseFloat(preferencesForm.tax_rate) || 0;

      const { error } = await supabase
        .from('shops')
        .update({
          tax_rate: taxRate,
          currency: preferencesForm.currency,
          updated_at: new Date().toISOString(),
        })
        .eq('id', shop.id);

      if (error) {
        // Column doesn't exist - show migration message
        if (error.message?.includes('column') || error.code === '42703') {
          setMigrationNeeded(true);
          toast({
            title: "Theme Saved!",
            description: "Run database migration to enable tax settings.",
          });
        } else {
          throw error;
        }
      } else {
        setMigrationNeeded(false);
        await refreshProfile();
        toast({ title: "Saved!", description: "Preferences updated" });
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message || "Failed to save" });
    } finally {
      setSaving(null);
    }
  }, [shop, isOwner, theme, preferencesForm, supabase, refreshProfile, toast]);

  const handleSaveNotifications = useCallback(async () => {
    if (!shop || !isOwner) return;
    setSaving('notifications');

    try {
      const threshold = parseInt(notificationsForm.low_stock_threshold) || 10;

      const { error } = await supabase
        .from('shops')
        .update({
          email_notifications: notificationsForm.email_notifications,
          low_stock_threshold: threshold,
          updated_at: new Date().toISOString(),
        })
        .eq('id', shop.id);

      if (error) {
        if (error.message?.includes('column') || error.code === '42703') {
          setMigrationNeeded(true);
          toast({
            variant: "destructive",
            title: "Migration Required",
            description: "Run the database migration first.",
          });
        } else {
          throw error;
        }
      } else {
        await refreshProfile();
        toast({ title: "Saved!", description: "Notification settings updated" });
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message || "Failed to save" });
    } finally {
      setSaving(null);
    }
  }, [shop, isOwner, notificationsForm, supabase, refreshProfile, toast]);

  const handleChangePassword = useCallback(async () => {
    if (!passwordForm.new_password || passwordForm.new_password !== passwordForm.confirm_password) {
      toast({ variant: "destructive", title: "Error", description: "Passwords don't match" });
      return;
    }
    if (passwordForm.new_password.length < 8) {
      toast({ variant: "destructive", title: "Error", description: "Password must be at least 8 characters" });
      return;
    }

    setSaving('security');

    try {
      const { error } = await supabase.auth.updateUser({ password: passwordForm.new_password });
      if (error) throw error;

      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
      toast({ title: "Success!", description: "Password changed" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message || "Failed to change password" });
    } finally {
      setSaving(null);
    }
  }, [passwordForm, supabase, toast]);

  // Load team members and invitations
  const loadTeamData = useCallback(async () => {
    if (!shop?.id || !isOwner) return;

    try {
      // Load team members (profiles with this shop_id)
      const { data: members } = await supabase
        .from('profiles')
        .select('id, full_name, email, role')
        .eq('shop_id', shop.id);

      if (members) setTeamMembers(members);

      // Load pending invitations
      const { data: invites } = await supabase
        .from('shop_invitations')
        .select('*')
        .eq('shop_id', shop.id)
        .is('accepted_at', null)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (invites) setInvitations(invites);
    } catch (error) {
      console.error('Error loading team data:', error);
    }
  }, [shop?.id, isOwner, supabase]);

  // Load team data when tab changes to team
  useEffect(() => {
    if (activeTab === 'team' && isOwner) {
      loadTeamData();
    }
  }, [activeTab, isOwner, loadTeamData]);

  // Send invitation
  const handleSendInvite = useCallback(async () => {
    if (!shop?.id || !user?.id || !inviteForm.email) return;

    setInviteLoading(true);

    try {
      // Check if email already invited or is a member
      const existingMember = teamMembers.find(m => m.email?.toLowerCase() === inviteForm.email.toLowerCase());
      if (existingMember) {
        toast({ variant: "destructive", title: "Error", description: "This person is already a team member" });
        setInviteLoading(false);
        return;
      }

      const existingInvite = invitations.find(i => i.email.toLowerCase() === inviteForm.email.toLowerCase());
      if (existingInvite) {
        toast({ variant: "destructive", title: "Error", description: "An invitation was already sent to this email" });
        setInviteLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('shop_invitations')
        .insert({
          shop_id: shop.id,
          email: inviteForm.email.toLowerCase(),
          role: inviteForm.role,
          invited_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Generate invite link
      const inviteLink = `${window.location.origin}/invite/${data.token}`;

      // Copy to clipboard
      await navigator.clipboard.writeText(inviteLink);

      toast({
        title: "Invitation created!",
        description: "Invite link copied to clipboard. Share it with your team member.",
      });

      setInviteForm({ email: '', role: 'staff' });
      loadTeamData();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message || "Failed to send invitation" });
    } finally {
      setInviteLoading(false);
    }
  }, [shop?.id, user?.id, inviteForm, teamMembers, invitations, supabase, toast, loadTeamData]);

  // Delete invitation
  const handleDeleteInvite = useCallback(async (inviteId: string) => {
    try {
      const { error } = await supabase
        .from('shop_invitations')
        .delete()
        .eq('id', inviteId);

      if (error) throw error;

      toast({ title: "Invitation deleted" });
      loadTeamData();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  }, [supabase, toast, loadTeamData]);

  // Copy invite link
  const copyInviteLink = useCallback(async (token: string) => {
    const link = `${window.location.origin}/invite/${token}`;
    await navigator.clipboard.writeText(link);
    toast({ title: "Link copied!" });
  }, [toast]);

  // Save booking settings
  const handleSaveBooking = useCallback(async () => {
    if (!shop || !isOwner) return;
    setSaving('booking');

    try {
      // Generate slug from shop name if not set
      let slug = bookingForm.slug.trim();
      if (!slug && bookingForm.booking_enabled) {
        slug = shop.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '');
      }

      const { error } = await supabase
        .from('shops')
        .update({
          slug: slug || null,
          booking_enabled: bookingForm.booking_enabled,
          updated_at: new Date().toISOString(),
        })
        .eq('id', shop.id);

      if (error) throw error;

      setBookingForm(prev => ({ ...prev, slug }));
      await refreshProfile();
      toast({ title: "Saved!", description: "Booking settings updated" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message || "Failed to save" });
    } finally {
      setSaving(null);
    }
  }, [shop, isOwner, bookingForm, supabase, refreshProfile, toast]);

  // Tab config
  const tabs = [
    { id: 'profile' as const, label: 'Profile', icon: User },
    { id: 'business' as const, label: 'Business', icon: Building2, ownerOnly: true },
    { id: 'booking' as const, label: 'Booking', icon: Calendar, ownerOnly: true },
    { id: 'preferences' as const, label: 'Preferences', icon: Palette, ownerOnly: true },
    { id: 'notifications' as const, label: 'Notifications', icon: Bell, ownerOnly: true },
    { id: 'team' as const, label: 'Team', icon: Users, ownerOnly: true },
    { id: 'security' as const, label: 'Security', icon: Lock },
  ];

  const visibleTabs = tabs.filter(tab => !tab.ownerOnly || isOwner);

  // Early return while auth is loading
  if (authLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-text-muted">Loading...</div>
        </div>
      </DashboardLayout>
    );
  }

  // Loading state
  // Only show timeout toast if still loading AND user is authenticated
      if (pageLoading && user) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-text flex items-center gap-3">
            <Settings className="text-primary" size={28} />
            Settings
          </h1>
          <p className="text-text-muted mt-1">Manage your account and business settings</p>
        </div>

        {/* Migration Warning */}
        {migrationNeeded && isOwner && (
          <div className="mb-6 p-4 rounded-lg bg-warning/10 border border-warning/30">
            <div className="flex items-start gap-3">
              <AlertTriangle className="text-warning flex-shrink-0 mt-0.5" size={20} />
              <div className="flex-1">
                <h3 className="font-semibold text-warning">Database Migration Required</h3>
                <p className="text-sm text-text-muted mt-1">
                  Run this SQL in your Supabase dashboard to enable tax and notification settings:
                </p>
                <pre className="mt-2 p-3 rounded bg-bg text-xs text-text overflow-x-auto">
                  {getShopSettingsMigrationSQL()}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* Tabs + Content */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar Tabs */}
          <div className="lg:w-48 flex-shrink-0">
            <nav className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
              {visibleTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-primary text-primary-foreground'
                      : 'text-text-muted hover:bg-bg-light hover:text-text'
                  }`}
                >
                  <tab.icon size={18} />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1">
            <div className="bg-bg border border-border-muted rounded-lg p-6">
              {/* Profile Tab */}
              {activeTab === 'profile' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-semibold text-text">Profile Information</h2>
                    <p className="text-sm text-text-muted">Update your personal details</p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="full_name">Full Name</Label>
                      <Input
                        id="full_name"
                        value={profileForm.full_name}
                        onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
                        className="mt-1.5 bg-bg-light border-border-muted text-text"
                      />
                    </div>

                    <div>
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        value={profileForm.email}
                        disabled
                        className="mt-1.5 bg-bg-light border-border-muted text-text-muted cursor-not-allowed"
                      />
                      <p className="text-xs text-text-muted mt-1">Contact support to change email</p>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-border-muted">
                    <Button onClick={handleSaveProfile} disabled={saving === 'profile'} className="bg-primary hover:bg-primary/90">
                      {saving === 'profile' ? <Loader2 size={16} className="animate-spin mr-2" /> : <Save size={16} className="mr-2" />}
                      Save Changes
                    </Button>
                  </div>
                </div>
              )}

              {/* Business Tab */}
              {activeTab === 'business' && isOwner && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-semibold text-text">Business Information</h2>
                    <p className="text-sm text-text-muted">Manage your shop details</p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="business_name">Business Name</Label>
                      <Input
                        id="business_name"
                        value={businessForm.name}
                        onChange={(e) => setBusinessForm({ ...businessForm, name: e.target.value })}
                        className="mt-1.5 bg-bg-light border-border-muted text-text"
                      />
                    </div>

                    <div>
                      <Label htmlFor="business_email">Business Email</Label>
                      <Input
                        id="business_email"
                        type="email"
                        value={businessForm.email}
                        onChange={(e) => setBusinessForm({ ...businessForm, email: e.target.value })}
                        className="mt-1.5 bg-bg-light border-border-muted text-text"
                      />
                    </div>

                    <div>
                      <Label htmlFor="business_phone">Phone Number</Label>
                      <Input
                        id="business_phone"
                        value={businessForm.phone}
                        onChange={(e) => setBusinessForm({ ...businessForm, phone: e.target.value })}
                        className="mt-1.5 bg-bg-light border-border-muted text-text"
                      />
                    </div>

                    <div>
                      <Label htmlFor="business_address">Address</Label>
                      <Input
                        id="business_address"
                        value={businessForm.address}
                        onChange={(e) => setBusinessForm({ ...businessForm, address: e.target.value })}
                        className="mt-1.5 bg-bg-light border-border-muted text-text"
                      />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-border-muted">
                    <Button onClick={handleSaveBusiness} disabled={saving === 'business'} className="bg-primary hover:bg-primary/90">
                      {saving === 'business' ? <Loader2 size={16} className="animate-spin mr-2" /> : <Save size={16} className="mr-2" />}
                      Save Changes
                    </Button>
                  </div>
                </div>
              )}

              {/* Booking Tab */}
              {activeTab === 'booking' && isOwner && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-semibold text-text">Online Booking</h2>
                    <p className="text-sm text-text-muted">Let customers book appointments online</p>
                  </div>

                  <div className="space-y-6">
                    {/* Enable/Disable Booking */}
                    <div className="flex items-center justify-between p-4 rounded-lg bg-bg-light border border-border-muted">
                      <div>
                        <p className="font-medium text-text">Enable Online Booking</p>
                        <p className="text-sm text-text-muted">Allow customers to book through your booking page</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setBookingForm({
                          ...bookingForm,
                          booking_enabled: !bookingForm.booking_enabled
                        })}
                        className={`relative w-12 h-6 rounded-full transition-colors ${
                          bookingForm.booking_enabled ? 'bg-primary' : 'bg-border-muted'
                        }`}
                      >
                        <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                          bookingForm.booking_enabled ? 'translate-x-6' : 'translate-x-0'
                        }`} />
                      </button>
                    </div>

                    {/* Booking URL */}
                    <div>
                      <Label htmlFor="booking_slug">Booking URL</Label>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-text-muted text-sm">{typeof window !== 'undefined' ? window.location.origin : ''}/book/</span>
                        <Input
                          id="booking_slug"
                          value={bookingForm.slug}
                          onChange={(e) => setBookingForm({
                            ...bookingForm,
                            slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')
                          })}
                          placeholder="your-shop-name"
                          className="flex-1 bg-bg-light border-border-muted text-text"
                        />
                      </div>
                      <p className="text-xs text-text-muted mt-1">
                        Only lowercase letters, numbers, and hyphens allowed
                      </p>
                    </div>

                    {/* Preview Link */}
                    {bookingForm.booking_enabled && bookingForm.slug && (
                      <div className="p-4 rounded-lg bg-success/10 border border-success/30">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Link size={18} className="text-success" />
                            <span className="text-sm font-medium text-success">Your booking page is live!</span>
                          </div>
                          <a
                            href={`/book/${bookingForm.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-sm text-success hover:underline"
                          >
                            Open page <ExternalLink size={14} />
                          </a>
                        </div>
                        <p className="text-xs text-text-muted mt-2">
                          Share this link with your customers: {typeof window !== 'undefined' ? window.location.origin : ''}/book/{bookingForm.slug}
                        </p>
                      </div>
                    )}

                    {/* Info about booking features */}
                    <div className="p-4 rounded-lg bg-info/10 border border-info/30">
                      <h4 className="font-medium text-info mb-2">Booking Features</h4>
                      <ul className="text-sm text-text-muted space-y-1">
                        <li>• Customers can select service type, date, and time</li>
                        <li>• Automatic SMS confirmation sent to customers</li>
                        <li>• New customers are added to your customer database</li>
                        <li>• Bookings create work orders automatically</li>
                      </ul>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-border-muted">
                    <Button onClick={handleSaveBooking} disabled={saving === 'booking'} className="bg-primary hover:bg-primary/90">
                      {saving === 'booking' ? <Loader2 size={16} className="animate-spin mr-2" /> : <Save size={16} className="mr-2" />}
                      Save Changes
                    </Button>
                  </div>
                </div>
              )}

              {/* Preferences Tab */}
              {activeTab === 'preferences' && isOwner && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-semibold text-text">Preferences</h2>
                    <p className="text-sm text-text-muted">Customize your experience</p>
                  </div>

                  <div className="space-y-6">
                    {/* Theme */}
                    <div>
                      <Label>Theme</Label>
                      <div className="flex gap-2 mt-1.5">
                        <button
                          type="button"
                          onClick={() => setTheme('light')}
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                            theme === 'light'
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-bg-light border-border-muted text-text-muted hover:border-primary'
                          }`}
                        >
                          <Sun size={16} />
                          Light
                        </button>
                        <button
                          type="button"
                          onClick={() => setTheme('dark')}
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                            theme === 'dark'
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-bg-light border-border-muted text-text-muted hover:border-primary'
                          }`}
                        >
                          <Moon size={16} />
                          Dark
                        </button>
                      </div>
                    </div>

                    {/* Tax Rate - Simple text input */}
                    <div>
                      <Label htmlFor="tax_rate">Sales Tax Rate</Label>
                      <div className="flex items-center gap-2 mt-1.5">
                        <Input
                          id="tax_rate"
                          type="text"
                          inputMode="decimal"
                          value={preferencesForm.tax_rate}
                          onChange={(e) => setPreferencesForm({ ...preferencesForm, tax_rate: e.target.value })}
                          onBlur={(e) => {
                            const val = parseFloat(e.target.value);
                            if (!isNaN(val) && val >= 0 && val <= 100) {
                              setPreferencesForm({ ...preferencesForm, tax_rate: val.toFixed(1) });
                            }
                          }}
                          className="w-24 bg-bg-light border-border-muted text-text text-center"
                          placeholder="0.0"
                        />
                        <span className="text-text-muted">%</span>
                      </div>
                    </div>

                    {/* Currency */}
                    <div>
                      <Label htmlFor="currency">Currency</Label>
                      <select
                        id="currency"
                        value={preferencesForm.currency}
                        onChange={(e) => setPreferencesForm({ ...preferencesForm, currency: e.target.value })}
                        className="mt-1.5 w-full px-3 py-2 rounded-lg bg-bg-light border border-border-muted text-text"
                      >
                        <option value="USD">USD ($)</option>
                        <option value="EUR">EUR (€)</option>
                        <option value="GBP">GBP (£)</option>
                        <option value="CAD">CAD ($)</option>
                        <option value="MXN">MXN ($)</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-border-muted">
                    <Button onClick={handleSavePreferences} disabled={saving === 'preferences'} className="bg-primary hover:bg-primary/90">
                      {saving === 'preferences' ? <Loader2 size={16} className="animate-spin mr-2" /> : <Save size={16} className="mr-2" />}
                      Save Changes
                    </Button>
                  </div>
                </div>
              )}

              {/* Notifications Tab */}
              {activeTab === 'notifications' && isOwner && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-semibold text-text">Notifications</h2>
                    <p className="text-sm text-text-muted">Configure how you receive alerts</p>
                  </div>

                  {/* Inventory Alerts Section */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium text-text-muted uppercase tracking-wide">Inventory Alerts</h3>

                    {/* Low Stock Alert Toggle */}
                    <div className="flex items-center justify-between p-4 rounded-lg bg-bg-light border border-border-muted">
                      <div>
                        <p className="font-medium text-text">Low Stock Alerts</p>
                        <p className="text-sm text-text-muted">Get notified when items fall below threshold</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setNotificationsForm({
                          ...notificationsForm,
                          email_notifications: !notificationsForm.email_notifications
                        })}
                        className={`relative w-12 h-6 rounded-full transition-colors ${
                          notificationsForm.email_notifications ? 'bg-primary' : 'bg-border-muted'
                        }`}
                      >
                        <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                          notificationsForm.email_notifications ? 'translate-x-6' : 'translate-x-0'
                        }`} />
                      </button>
                    </div>

                    {/* Minimum Stock Level */}
                    <div className="pl-4 border-l-2 border-border-muted">
                      <Label htmlFor="low_stock">Minimum stock level</Label>
                      <div className="flex items-center gap-2 mt-1.5">
                        <Input
                          id="low_stock"
                          type="text"
                          inputMode="numeric"
                          value={notificationsForm.low_stock_threshold}
                          onChange={(e) => setNotificationsForm({ ...notificationsForm, low_stock_threshold: e.target.value })}
                          onBlur={(e) => {
                            const val = parseInt(e.target.value);
                            if (!isNaN(val) && val >= 1) {
                              setNotificationsForm({ ...notificationsForm, low_stock_threshold: String(val) });
                            }
                          }}
                          className="w-24 bg-bg-light border-border-muted text-text text-center"
                          placeholder="10"
                        />
                        <span className="text-text-muted">units</span>
                      </div>
                    </div>
                  </div>

                  {/* Delivery Methods Section */}
                  <div className="space-y-4 pt-4 border-t border-border-muted">
                    <h3 className="text-sm font-medium text-text-muted uppercase tracking-wide">Delivery Methods</h3>

                    {/* In-App - Always enabled */}
                    <div className="flex items-center justify-between p-4 rounded-lg bg-bg-light border border-border-muted">
                      <div>
                        <p className="font-medium text-text">In-App Notifications</p>
                        <p className="text-sm text-text-muted">See alerts in the bell icon</p>
                      </div>
                      <div className="relative w-12 h-6 rounded-full bg-primary cursor-not-allowed">
                        <span className="absolute top-1 left-1 w-4 h-4 rounded-full bg-white translate-x-6" />
                      </div>
                    </div>

                    {/* Email - Coming soon */}
                    <div className="flex items-center justify-between p-4 rounded-lg bg-bg-light border border-border-muted opacity-60">
                      <div>
                        <p className="font-medium text-text">Email Notifications</p>
                        <p className="text-sm text-text-muted">Coming soon</p>
                      </div>
                      <div className="relative w-12 h-6 rounded-full bg-border-muted cursor-not-allowed">
                        <span className="absolute top-1 left-1 w-4 h-4 rounded-full bg-white translate-x-0" />
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-border-muted">
                    <Button onClick={handleSaveNotifications} disabled={saving === 'notifications'} className="bg-primary hover:bg-primary/90">
                      {saving === 'notifications' ? <Loader2 size={16} className="animate-spin mr-2" /> : <Save size={16} className="mr-2" />}
                      Save Changes
                    </Button>
                  </div>
                </div>
              )}

              {/* Team Tab */}
              {activeTab === 'team' && isOwner && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-semibold text-text">Team Management</h2>
                    <p className="text-sm text-text-muted">Invite staff members to your shop</p>
                  </div>

                  {/* Invite Form */}
                  <div className="p-4 rounded-lg bg-bg-light border border-border-muted">
                    <h3 className="font-medium text-text mb-4 flex items-center gap-2">
                      <UserPlus size={18} />
                      Send Invitation
                    </h3>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="flex-1">
                        <Input
                          type="email"
                          placeholder="Email address"
                          value={inviteForm.email}
                          onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                          className="bg-bg border-border-muted text-text"
                        />
                      </div>
                      <select
                        value={inviteForm.role}
                        onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value as 'staff' | 'viewer' })}
                        className="px-3 py-2 rounded-lg bg-bg border border-border-muted text-text"
                      >
                        <option value="staff">Staff (can edit)</option>
                        <option value="viewer">Viewer (read-only)</option>
                      </select>
                      <Button
                        onClick={handleSendInvite}
                        disabled={inviteLoading || !inviteForm.email}
                        className="bg-primary hover:bg-primary/90"
                      >
                        {inviteLoading ? <Loader2 size={16} className="animate-spin mr-2" /> : <Mail size={16} className="mr-2" />}
                        Send Invite
                      </Button>
                    </div>
                    <p className="text-xs text-text-muted mt-2">
                      They'll receive a link to join your shop. Invite expires in 7 days.
                    </p>
                  </div>

                  {/* Current Team Members */}
                  <div>
                    <h3 className="font-medium text-text mb-3">Team Members ({teamMembers.length})</h3>
                    <div className="space-y-2">
                      {teamMembers.map((member) => (
                        <div
                          key={member.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-bg-light border border-border-muted"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-primary to-secondary flex items-center justify-center">
                              <User size={18} className="text-white" />
                            </div>
                            <div>
                              <p className="font-medium text-text">{member.full_name || member.email || 'Unknown'}</p>
                              <p className="text-sm text-text-muted">{member.email}</p>
                            </div>
                          </div>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            member.role === 'owner'
                              ? 'bg-primary/20 text-primary'
                              : member.role === 'staff'
                              ? 'bg-info/20 text-info'
                              : 'bg-warning/20 text-warning'
                          }`}>
                            {member.role}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Pending Invitations */}
                  {invitations.length > 0 && (
                    <div>
                      <h3 className="font-medium text-text mb-3">Pending Invitations ({invitations.length})</h3>
                      <div className="space-y-2">
                        {invitations.map((invite) => (
                          <div
                            key={invite.id}
                            className="flex items-center justify-between p-3 rounded-lg bg-bg-light border border-warning/30"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-warning/20 flex items-center justify-center">
                                <Mail size={18} className="text-warning" />
                              </div>
                              <div>
                                <p className="font-medium text-text">{invite.email}</p>
                                <p className="text-xs text-text-muted">
                                  Expires {new Date(invite.expires_at).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-1 text-xs font-medium rounded-full bg-info/20 text-info">
                                {invite.role}
                              </span>
                              <button
                                onClick={() => copyInviteLink(invite.token)}
                                className="p-2 rounded-lg text-text-muted hover:bg-bg hover:text-text transition-colors"
                                title="Copy invite link"
                              >
                                <Copy size={16} />
                              </button>
                              <button
                                onClick={() => handleDeleteInvite(invite.id)}
                                className="p-2 rounded-lg text-text-muted hover:bg-danger/20 hover:text-danger transition-colors"
                                title="Delete invitation"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Security Tab */}
              {activeTab === 'security' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-semibold text-text">Security</h2>
                    <p className="text-sm text-text-muted">Change your password</p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="current_password">Current Password</Label>
                      <div className="relative mt-1.5">
                        <Input
                          id="current_password"
                          type={showPasswords.current ? 'text' : 'password'}
                          value={passwordForm.current_password}
                          onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
                          className="bg-bg-light border-border-muted text-text pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text"
                        >
                          {showPasswords.current ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="new_password">New Password</Label>
                      <div className="relative mt-1.5">
                        <Input
                          id="new_password"
                          type={showPasswords.new ? 'text' : 'password'}
                          value={passwordForm.new_password}
                          onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                          className="bg-bg-light border-border-muted text-text pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text"
                        >
                          {showPasswords.new ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                      <p className="text-xs text-text-muted mt-1">Minimum 8 characters</p>
                    </div>

                    <div>
                      <Label htmlFor="confirm_password">Confirm New Password</Label>
                      <div className="relative mt-1.5">
                        <Input
                          id="confirm_password"
                          type={showPasswords.confirm ? 'text' : 'password'}
                          value={passwordForm.confirm_password}
                          onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
                          className="bg-bg-light border-border-muted text-text pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text"
                        >
                          {showPasswords.confirm ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    {passwordForm.new_password && passwordForm.confirm_password && (
                      <div className={`flex items-center gap-2 text-sm ${
                        passwordForm.new_password === passwordForm.confirm_password ? 'text-success' : 'text-danger'
                      }`}>
                        {passwordForm.new_password === passwordForm.confirm_password ? (
                          <><Check size={14} /> Passwords match</>
                        ) : (
                          <><AlertCircle size={14} /> Passwords don't match</>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="pt-4 border-t border-border-muted">
                    <Button
                      onClick={handleChangePassword}
                      disabled={saving === 'security' || !passwordForm.new_password || passwordForm.new_password !== passwordForm.confirm_password}
                      className="bg-primary hover:bg-primary/90"
                    >
                      {saving === 'security' ? <Loader2 size={16} className="animate-spin mr-2" /> : <Lock size={16} className="mr-2" />}
                      Change Password
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

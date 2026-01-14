'use client';

import { useTheme } from '@/contexts/ThemeContext';
import {
  Sun, Moon, Search, Bell,
  Users, Package, ClipboardList, TrendingUp, Home, LogOut, User, Menu, X, Settings, Trash2
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { SwipeableNotification, type LowStockItem } from '@/components/shared/notifications/SwipeableNotification';

// Get supabase client ONCE outside component to prevent re-creation on renders
const supabase = createClient();

interface DashboardLayoutProps {
  children: React.ReactNode;
}

interface SearchResult {
  id: string;
  name: string;
  type: 'customer' | 'tire';
  subtitle?: string;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, profile, shop, needsOnboarding, loading: authLoading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const pathname = usePathname();
  const router = useRouter();
  const [globalSearch, setGlobalSearch] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([]);
  const [dismissedNotifications, setDismissedNotifications] = useState<Set<string>>(new Set());
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);
  // supabase client is already created at line 15 outside component - removed duplicate

  const navItems = [
    { href: '/', label: 'Overview', icon: Home },
    { href: '/customers', label: 'Customers', icon: Users },
    { href: '/inventory', label: 'Inventory', icon: Package },
    { href: '/work-orders', label: 'Work Orders', icon: ClipboardList },
    { href: '/analytics', label: 'Analytics', icon: TrendingUp },
  ];

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  // Load dismissed notifications from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('dismissedNotifications');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setDismissedNotifications(new Set(parsed));
      } catch {
        // Invalid data, ignore
      }
    }
  }, []);

  // Save dismissed notifications to localStorage
  const saveDismissed = (newSet: Set<string>) => {
    setDismissedNotifications(newSet);
    localStorage.setItem('dismissedNotifications', JSON.stringify([...newSet]));
  };

  // Dismiss a single notification
  const dismissNotification = (itemId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSet = new Set(dismissedNotifications);
    newSet.add(itemId);
    saveDismissed(newSet);
  };

  // Clear all notifications
  const clearAllNotifications = () => {
    const newSet = new Set(dismissedNotifications);
    lowStockItems.forEach(item => newSet.add(item.id));
    saveDismissed(newSet);
  };

  // Get visible (non-dismissed) low stock items
  const visibleLowStockItems = lowStockItems.filter(item => !dismissedNotifications.has(item.id));

  // Fetch low stock items
  useEffect(() => {
    async function fetchLowStock() {
      if (!profile?.shop_id) return;

      // Get threshold from shop settings
      const threshold = shop?.low_stock_threshold ?? 5;

      try {
        const { data, error } = await supabase
          .from('inventory')
          .select('id, brand, model, size, quantity')
          .eq('shop_id', profile.shop_id)
          .lt('quantity', threshold)
          .order('quantity', { ascending: true });

        if (error) {
          // Silently fail if no access (e.g., RLS blocking without auth)
          // This prevents console spam for apps without auth enabled
          if (error.code !== 'PGRST301') {
            console.error('Error fetching low stock items:', error);
          }
          setLowStockItems([]);
          return;
        }
        setLowStockItems(data || []);
      } catch (error) {
        // Fail gracefully - just set empty array
        setLowStockItems([]);
      }
    }
    fetchLowStock();

    // Refresh every 30 seconds
    const interval = setInterval(fetchLowStock, 30000);
    return () => clearInterval(interval);
  }, [profile?.shop_id, shop?.low_stock_threshold, supabase]);

  // Handle logout
  async function handleLogout() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Logout failed:', error);
      }
      // CRITICAL FIX: Only push, middleware handles the redirect
      router.push('/login');
    } catch (err) {
      console.error('Logout failed:', err);
      // Ensure navigation even on error
      router.push('/login');
    }
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close mobile menu when route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Redirect to onboarding if needed (only for owners who haven't completed it)
  useEffect(() => {
    // Wait for auth to finish loading before checking onboarding
    if (!authLoading && needsOnboarding && pathname !== '/onboarding') {
      router.push('/onboarding');
    }
  }, [authLoading, needsOnboarding, pathname, router]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [mobileMenuOpen]);

  // Prevent body scroll when notifications are open on mobile
  useEffect(() => {
    if (showNotifications) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showNotifications]);

  // Search for customers and tires as user types
  useEffect(() => {
    const searchData = async () => {
      if (!globalSearch.trim() || !profile?.shop_id) {
        setSearchResults([]);
        setShowDropdown(false);
        return;
      }

      try {
        const searchLower = globalSearch.toLowerCase();

        // Search customers
        const { data: customers } = await supabase
          .from('customers')
          .select('id, name, email, phone')
          .eq('shop_id', profile.shop_id)
          .or(`name.ilike.%${globalSearch}%,email.ilike.%${globalSearch}%,phone.ilike.%${globalSearch}%`)
          .limit(5);

        // Search inventory
        const { data: tires } = await supabase
          .from('inventory')
          .select('id, brand, model, size')
          .eq('shop_id', profile.shop_id)
          .or(`brand.ilike.%${globalSearch}%,model.ilike.%${globalSearch}%,size.ilike.%${globalSearch}%`)
          .limit(5);

        const results: SearchResult[] = [];

        // Add customers to results
        if (customers) {
          customers.forEach((customer) => {
            results.push({
              id: customer.id,
              name: customer.name,
              type: 'customer',
              subtitle: customer.email || customer.phone,
            });
          });
        }

        // Add tires to results
        if (tires) {
          tires.forEach((tire) => {
            results.push({
              id: tire.id,
              name: `${tire.brand} ${tire.model}`,
              type: 'tire',
              subtitle: tire.size,
            });
          });
        }

        setSearchResults(results);
        setShowDropdown(results.length > 0);
      } catch (error) {
        console.error('Search error:', error);
      }
    };

    const debounceTimer = setTimeout(searchData, 300);
    return () => clearTimeout(debounceTimer);
  }, [globalSearch, profile?.shop_id, supabase]);

  const handleGlobalSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchResults.length > 0) {
      handleResultClick(searchResults[0]);
    }
  };

  const handleResultClick = (result: SearchResult) => {
    if (result.type === 'customer') {
      router.push(`/customers/${result.id}`);
    } else {
      router.push(`/inventory?search=${encodeURIComponent(result.name)}`);
    }
    setGlobalSearch('');
    setShowDropdown(false);
    setSearchResults([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < searchResults.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault();
      handleResultClick(searchResults[selectedIndex]);
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  };

  return (
    <div className="min-h-screen animated-gradient relative">
      {/* Film grain overlay */}
      <div className="fixed inset-0 film-grain pointer-events-none z-0"></div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        ></div>
      )}

      {/* Sidebar */}
      <aside className={`fixed left-0 top-0 h-full w-64 bg-bg border-r border-border-muted z-50 shadow-2xl transition-transform duration-300 lg:translate-x-0 ${
        mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="p-6">
          <div className="flex items-center gap-2 mb-8">
            <div className="w-8 h-8 bg-bg-light rounded-lg flex items-center justify-center">
              <span className="text-text-muted font-bold">BBT</span>
            </div>
            <span className="font-bold text-xl text-text">Big Boy Tires</span>
            {/* Close button for mobile */}
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="ml-auto lg:hidden p-2 rounded-lg text-text hover:bg-primary/10 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <nav className="space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                    active
                      ? 'bg-primary/20 text-primary shadow-lg border border-primary/30'
                      : 'text-text-muted hover:bg-primary/10 hover:shadow-lg hover:-translate-x-1'
                  }`}
                >
                  <Icon size={20} />
                  <span className={active ? 'font-medium' : ''}>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <div className="lg:ml-64">
        {/* Header */}
        <header className="bg-bg border-b border-border-muted px-4 lg:px-8 py-4 sticky top-0 z-30 shadow-lg">
          <div className="flex items-center justify-between gap-3">
            {/* Hamburger button for mobile */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-lg text-text hover:bg-primary/10 transition-colors flex-shrink-0"
            >
              <Menu size={24} />
            </button>

            {/* Search Bar - visible on medium screens and up */}
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <div ref={searchRef} className="relative flex-1 max-w-md hidden md:block">
                <form onSubmit={handleGlobalSearch} className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={20} />
                  <input
                    type="text"
                    placeholder="Search customers, tires..."
                    value={globalSearch}
                    onChange={(e) => setGlobalSearch(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-border-muted bg-bg-light text-text focus:outline-none focus:ring-2 focus:ring-highlight focus:border-transparent"
                  />
                </form>

                {/* Search Dropdown */}
                {showDropdown && searchResults.length > 0 && (
                  <div className="absolute top-full mt-2 w-full bg-bg-light rounded-lg shadow-xl border border-border-muted max-h-96 overflow-y-auto z-50 p-1">
                    {searchResults.map((result, index) => (
                      <button
                        key={`${result.type}-${result.id}`}
                        onClick={() => handleResultClick(result)}
                        className={`w-full text-left px-4 py-3 rounded-md hover:bg-primary/20 transition-colors flex items-center gap-3 ${
                          index === selectedIndex ? 'bg-primary/20' : ''
                        } ${
                          index !== searchResults.length - 1 ? 'mb-1' : ''
                        }`}
                      >
                        <div
                          className={`p-2 rounded-lg ${
                            result.type === 'customer'
                              ? 'bg-info/20'
                              : 'bg-success/20'
                          }`}
                        >
                          {result.type === 'customer' ? (
                            <Users size={18} className="text-info" />
                          ) : (
                            <Package size={18} className="text-success" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-text truncate">{result.name}</div>
                          {result.subtitle && (
                            <div className="text-sm text-text-muted truncate">
                              {result.subtitle}
                            </div>
                          )}
                        </div>
                        <div className="text-xs px-2 py-1 rounded bg-bg border border-border-muted text-text-muted">
                          {result.type === 'customer' ? 'Customer' : 'Tire'}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right side buttons - flex-shrink-0 to prevent collapsing */}
            <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
              {/* Shop Name */}
              {shop && (
                <div className="hidden sm:block text-sm text-text-muted border-r border-border-muted pr-4">
                  {shop.name}
                </div>
              )}
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg text-text-muted hover:bg-bg-light transition-colors flex-shrink-0"
              >
                {theme === 'dark' ? (
                  <Sun size={20} className="text-secondary" />
                ) : (
                  <Moon size={20} />
                )}
              </button>
              {/* Notifications */}
              <div className="relative flex-shrink-0" ref={notificationRef}>
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="p-2 rounded-lg text-text-muted hover:bg-bg-light relative transition-colors"
                >
                  <Bell size={20} />
                  {visibleLowStockItems.some(item => item.quantity === 0) ? (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-danger rounded-full animate-pulse"></span>
                  ) : visibleLowStockItems.length > 0 ? (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-warning rounded-full animate-pulse"></span>
                  ) : null}
                </button>

                {/* Notifications Dropdown */}
                {showNotifications && (
                  <div
                    className="fixed sm:absolute right-2 sm:right-0 left-2 sm:left-auto top-16 sm:top-auto sm:mt-3 w-auto sm:w-[480px] bg-bg border border-border-muted rounded-2xl shadow-2xl z-[100] max-h-[calc(100vh-5rem)] sm:max-h-[700px] overflow-hidden flex flex-col animate-in fade-in slide-in-from-top-2 duration-300"
                    onTouchMove={(e) => e.stopPropagation()}
                  >
                    {/* Header */}
                    <div className="px-6 py-5 border-b border-border-muted">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-xl bg-info/10">
                            <Bell size={20} className="text-info" />
                          </div>
                          <h3 className="font-semibold text-lg text-text">Notifications</h3>
                        </div>
                        <div className="flex items-center gap-2">
                          {visibleLowStockItems.length > 0 && (
                            <>
                              <span className="px-3 py-1 text-xs font-semibold bg-danger text-danger-foreground rounded-full">
                                {visibleLowStockItems.length}
                              </span>
                              <button
                                onClick={clearAllNotifications}
                                className="p-2 rounded-lg text-text-muted hover:bg-bg-light hover:text-danger transition-colors"
                                title="Clear all"
                              >
                                <Trash2 size={16} />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Notifications List */}
                    <div className="overflow-y-auto flex-1 p-3">
                      {visibleLowStockItems.length === 0 ? (
                        <div className="px-6 py-16 text-center">
                          <p className="text-sm text-text-muted">
                            No notifications
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {visibleLowStockItems.map((item, index) => (
                            <SwipeableNotification
                              key={item.id}
                              item={item}
                              index={index}
                              onDismiss={(id) => {
                                const newSet = new Set(dismissedNotifications);
                                newSet.add(id);
                                saveDismissed(newSet);
                              }}
                              onClick={() => {
                                router.push('/inventory');
                                setShowNotifications(false);
                              }}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* User Menu */}
              <div className="relative pl-4 border-l border-border-muted" ref={userMenuRef}>
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 p-2 rounded-lg text-text-muted hover:bg-bg-light transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-primary to-secondary flex items-center justify-center">
                    <User size={18} className="text-white" />
                  </div>
                  <span className="font-medium text-text hidden sm:inline">
                    {profile?.full_name || user?.email?.split('@')[0] || shop?.name || 'User'}
                  </span>
                </button>

                {/* Dropdown Menu */}
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-64 bg-bg rounded-lg shadow-lg border border-border-muted py-2 z-50">
                    <div className="px-4 py-3 border-b border-border-muted">
                      <p className="text-sm font-medium text-text">Signed in as</p>
                      <p className="text-sm text-text-muted truncate">{user?.email || 'No email'}</p>
                    </div>
                    <Link
                      href="/settings"
                      onClick={() => setShowUserMenu(false)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-bg-light transition-colors text-text"
                    >
                      <Settings size={18} />
                      <span className="font-medium">Settings</span>
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-bg-light transition-colors text-danger"
                    >
                      <LogOut size={18} />
                      <span className="font-medium">Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

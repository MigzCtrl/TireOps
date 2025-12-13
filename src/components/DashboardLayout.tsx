'use client';

import { useTheme } from '@/contexts/ThemeContext';
import {
  Sun, Moon, Search, Bell,
  Users, Package, ClipboardList, TrendingUp, Home, LogOut, User
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';

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
  const { theme, toggleTheme } = useTheme();
  const pathname = usePathname();
  const router = useRouter();
  const [globalSearch, setGlobalSearch] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

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

  // Get current user
  useEffect(() => {
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser();
      setUserEmail(user?.email || null);
    }
    getUser();
  }, []);

  // Handle logout
  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
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
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search for customers and tires as user types
  useEffect(() => {
    const searchData = async () => {
      if (!globalSearch.trim()) {
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
          .or(`name.ilike.%${globalSearch}%,email.ilike.%${globalSearch}%,phone.ilike.%${globalSearch}%`)
          .limit(5);

        // Search inventory
        const { data: tires } = await supabase
          .from('inventory')
          .select('id, brand, model, size')
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
  }, [globalSearch, supabase]);

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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 z-10">
        <div className="p-6">
          <div className="flex items-center gap-2 mb-8">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">TS</span>
            </div>
            <span className="font-bold text-xl dark:text-white">TireShop</span>
          </div>

          <nav className="space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    active
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-300'
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
      <div className="ml-64">
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-8 py-4 sticky top-0 z-20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 flex-1">
              <div ref={searchRef} className="relative flex-1 max-w-md">
                <form onSubmit={handleGlobalSearch} className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    placeholder="Search customers, tires..."
                    value={globalSearch}
                    onChange={(e) => setGlobalSearch(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </form>

                {/* Search Dropdown */}
                {showDropdown && searchResults.length > 0 && (
                  <div className="absolute top-full mt-2 w-full bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 max-h-96 overflow-y-auto z-50">
                    {searchResults.map((result, index) => (
                      <button
                        key={`${result.type}-${result.id}`}
                        onClick={() => handleResultClick(result)}
                        className={`w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-3 ${
                          index === selectedIndex ? 'bg-gray-100 dark:bg-gray-700' : ''
                        } ${index === 0 ? 'rounded-t-lg' : ''} ${
                          index === searchResults.length - 1 ? 'rounded-b-lg' : 'border-b border-gray-200 dark:border-gray-700'
                        }`}
                      >
                        <div
                          className={`p-2 rounded-lg ${
                            result.type === 'customer'
                              ? 'bg-blue-100 dark:bg-blue-900/20'
                              : 'bg-green-100 dark:bg-green-900/20'
                          }`}
                        >
                          {result.type === 'customer' ? (
                            <Users size={18} className="text-blue-600 dark:text-blue-400" />
                          ) : (
                            <Package size={18} className="text-green-600 dark:text-green-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium dark:text-white truncate">{result.name}</div>
                          {result.subtitle && (
                            <div className="text-sm text-gray-600 dark:text-gray-400 truncate">
                              {result.subtitle}
                            </div>
                          )}
                        </div>
                        <div className="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                          {result.type === 'customer' ? 'Customer' : 'Tire'}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                {theme === 'dark' ? (
                  <Sun size={20} className="text-yellow-500" />
                ) : (
                  <Moon size={20} />
                )}
              </button>
              <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 relative transition-colors">
                <Bell size={20} className="dark:text-gray-300" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>

              {/* User Menu */}
              <div className="relative pl-4 border-l border-gray-200 dark:border-gray-700" ref={userMenuRef}>
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                    <User size={18} className="text-white" />
                  </div>
                  <span className="font-medium dark:text-white">
                    {userEmail ? userEmail.split('@')[0] : 'Admin'}
                  </span>
                </button>

                {/* Dropdown Menu */}
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-50">
                    <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                      <p className="text-sm font-medium dark:text-white">Signed in as</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400 truncate">{userEmail}</p>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-red-600 dark:text-red-400"
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
        <main className="p-8">{children}</main>
      </div>
    </div>
  );
}

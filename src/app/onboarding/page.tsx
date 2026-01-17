'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2, User, Users, ClipboardList, Check, ChevronRight, ChevronLeft,
  ArrowRight, Loader2, Phone, Mail, MapPin, Wrench, Calendar, Upload, RefreshCw,
  Sparkles, Image, FileText, Pencil, Trash2, Plus, Minus, Clock, Package, Search, Info,
  DollarSign, Settings2, Car, Hash
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import DateTimePicker from '@/components/DateTimePicker';
import { FileSpreadsheet, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { createCustomerAction } from '@/app/actions/customers';
import TireSelector, { Tire, SelectedTire } from '@/components/TireSelector';
import { ShopService, DEFAULT_SERVICES } from '@/types/database';
import { useFeatureGate } from '@/hooks/useFeatureGate';
import { UpgradePrompt } from '@/components/UpgradePrompt';
import { Lock } from 'lucide-react';

const supabase = createClient();

// Service types for work orders
const SERVICE_TYPES = [
  'Tire Installation',
  'Tire Rotation',
  'Tire Repair',
  'Wheel Alignment',
  'Tire Balance',
] as const;

interface OnboardingData {
  // Shop profile
  shopName: string;
  shopEmail: string;
  shopPhone: string;
  shopAddress: string;
  ownerName: string;
  // First customer
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  // First work order
  serviceType: string;
  scheduledDate: string;
  scheduledTime: string;
  notes: string;
}

export default function OnboardingPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, profile, shop, loading: authLoading, refreshProfile } = useAuth();

  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdCustomerId, setCreatedCustomerId] = useState<string | null>(null);
  const [importedCustomers, setImportedCustomers] = useState<{ id: string; name: string; phone: string | null; email: string | null }[]>([]);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [showImportTip, setShowImportTip] = useState(false);
  const [tires, setTires] = useState<Tire[]>([]);
  const [selectedTires, setSelectedTires] = useState<SelectedTire[]>([]);
  const [loadingInventory, setLoadingInventory] = useState(false);
  const [services, setServices] = useState<ShopService[]>([]);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [servicesInitialized, setServicesInitialized] = useState(false);

  // Customer import state
  const [customerImportOpen, setCustomerImportOpen] = useState(false);
  const [customerImportFile, setCustomerImportFile] = useState<File | null>(null);
  const [customerImporting, setCustomerImporting] = useState(false);
  const [customerAnalyzing, setCustomerAnalyzing] = useState(false);
  const [customerImportData, setCustomerImportData] = useState<{
    name: string;
    phone: string;
    email: string;
    vehicle?: {
      year: number | null;
      make: string;
      model: string;
      trim: string;
      tire_size: string;
      plate: string;
      vin: string;
    };
  }[]>([]);
  const [customerImportError, setCustomerImportError] = useState<string | null>(null);
  const [customerImportMethod, setCustomerImportMethod] = useState<'csv' | 'excel' | 'ai' | null>(null);
  const [customerEditingIndex, setCustomerEditingIndex] = useState<number | null>(null);

  // Inventory import state
  const [inventoryImportOpen, setInventoryImportOpen] = useState(false);
  const [inventoryImportFile, setInventoryImportFile] = useState<File | null>(null);
  const [inventoryImporting, setInventoryImporting] = useState(false);
  const [inventoryAnalyzing, setInventoryAnalyzing] = useState(false);
  const [inventoryImportData, setInventoryImportData] = useState<{ brand: string; model: string; size: string; quantity: number; price: number }[]>([]);
  const [inventoryImportError, setInventoryImportError] = useState<string | null>(null);
  const [inventoryImportMethod, setInventoryImportMethod] = useState<'csv' | 'excel' | 'ai' | null>(null);
  const [inventoryEditingIndex, setInventoryEditingIndex] = useState<number | null>(null);
  const [showDuplicateChoice, setShowDuplicateChoice] = useState(false);
  const [duplicateSizes, setDuplicateSizes] = useState<string[]>([]);

  // Manual vehicle entry state
  const [showVehicleForm, setShowVehicleForm] = useState(false);
  const [manualVehicle, setManualVehicle] = useState({
    vin: '',
    year: '',
    make: '',
    model: '',
    trim: '',
    tire_size: '',
    plate: '',
  });
  const [vinLoading, setVinLoading] = useState(false);
  const [vinError, setVinError] = useState<string | null>(null);

  // Feature gating
  const { hasFeature, currentTier } = useFeatureGate();
  const canUseImport = hasFeature('ai_import');
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);

  const [formData, setFormData] = useState<OnboardingData>({
    shopName: '',
    shopEmail: '',
    shopPhone: '',
    shopAddress: '',
    ownerName: '',
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    serviceType: 'Tire Installation',
    scheduledDate: new Date().toISOString().split('T')[0],
    scheduledTime: '09:00',
    notes: '',
  });

  // Pre-fill form data when shop/profile loads
  useEffect(() => {
    if (shop) {
      setFormData(prev => ({
        ...prev,
        shopName: shop.name || prev.shopName,
        shopEmail: shop.email || prev.shopEmail,
        shopPhone: shop.phone || prev.shopPhone,
        shopAddress: shop.address || prev.shopAddress,
      }));
    }
    if (profile) {
      setFormData(prev => ({
        ...prev,
        ownerName: profile.full_name || prev.ownerName,
      }));
    }
  }, [shop, profile]);

  // Redirect if already completed onboarding
  useEffect(() => {
    if (!authLoading && shop?.onboarding_completed) {
      router.push('/');
    }
  }, [authLoading, shop, router]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [authLoading, user, router]);

  // Load inventory when customer is created and we're on step 3 (Work Order)
  useEffect(() => {
    async function loadInventory() {
      if (!shop?.id || !createdCustomerId || currentStep !== 3) return;

      setLoadingInventory(true);
      try {
        const { data, error } = await supabase
          .from('inventory')
          .select('id, brand, model, size, price, quantity')
          .eq('shop_id', shop.id)
          .order('brand');

        if (error) throw error;
        setTires(data || []);
      } catch (error) {
        console.error('Error loading inventory:', error);
      } finally {
        setLoadingInventory(false);
      }
    }

    loadInventory();
  }, [shop?.id, createdCustomerId, currentStep]);

  // Load/initialize services when on step 1 (Services & Pricing)
  useEffect(() => {
    async function loadServices() {
      if (!shop?.id || currentStep !== 1 || servicesInitialized) return;

      setServicesLoading(true);
      try {
        // Try to fetch existing services
        const response = await fetch('/api/services');
        const data = await response.json();

        if (data.services && data.services.length > 0) {
          setServices(data.services);
          setServicesInitialized(true);
        } else {
          // No services exist - initialize with defaults
          const initResponse = await fetch('/api/services', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'initialize' }),
          });
          const initData = await initResponse.json();

          if (initData.services) {
            setServices(initData.services);
            setServicesInitialized(true);
          }
        }
      } catch (error) {
        console.error('Error loading services:', error);
        // Even on error, set initialized to allow user to proceed
        setServicesInitialized(true);
      } finally {
        setServicesLoading(false);
      }
    }

    loadServices();
  }, [shop?.id, currentStep, servicesInitialized]);

  // Normalize name for comparison (lowercase, trim, remove extra spaces)
  function normalizeNameForMatch(name: string): string {
    return name.toLowerCase().trim().replace(/\s+/g, ' ');
  }

  // Calculate similarity between two strings (0-1, where 1 is identical)
  function stringSimilarity(str1: string, str2: string): number {
    const s1 = str1.toLowerCase();
    const s2 = str2.toLowerCase();
    if (s1 === s2) return 1;
    if (s1.length === 0 || s2.length === 0) return 0;

    // Simple character-based similarity
    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;

    let matches = 0;
    for (let i = 0; i < shorter.length; i++) {
      if (longer.includes(shorter[i])) matches++;
    }

    // Also check if one contains the other
    if (longer.includes(shorter) || shorter.includes(longer)) {
      return 0.9;
    }

    // Levenshtein-lite: count matching characters in order
    let i = 0, j = 0, orderedMatches = 0;
    while (i < s1.length && j < s2.length) {
      if (s1[i] === s2[j]) {
        orderedMatches++;
        i++;
        j++;
      } else if (s1.length > s2.length) {
        i++;
      } else {
        j++;
      }
    }

    const charSim = matches / longer.length;
    const orderSim = orderedMatches / shorter.length;
    return (charSim + orderSim) / 2;
  }

  // Normalize phone for comparison (digits only)
  function normalizePhone(phone: string): string {
    return phone.replace(/\D/g, '');
  }

  // Normalize email for comparison
  function normalizeEmail(email: string): string {
    return email.toLowerCase().trim();
  }

  // Find best matching customer using multiple signals (phone > email > name)
  function findBestMatch(
    newCustomer: { name: string; phone: string; email: string },
    existingData: { name: string; phone: string; email: string }[]
  ): { index: number; confidence: 'phone' | 'email' | 'name'; similarity: number } | null {
    const newPhone = normalizePhone(newCustomer.phone);
    const newEmail = normalizeEmail(newCustomer.email);
    const newName = normalizeNameForMatch(newCustomer.name);

    // 1. PHONE MATCH (highest confidence) - if phones match, same person
    if (newPhone.length >= 7) {
      for (let i = 0; i < existingData.length; i++) {
        const existingPhone = normalizePhone(existingData[i].phone);
        if (existingPhone.length >= 7 && existingPhone === newPhone) {
          return { index: i, confidence: 'phone', similarity: 1 };
        }
        // Also check if one contains the other (partial match for 7+ digits)
        if (existingPhone.length >= 7 && (existingPhone.includes(newPhone) || newPhone.includes(existingPhone))) {
          return { index: i, confidence: 'phone', similarity: 0.95 };
        }
      }
    }

    // 2. EMAIL MATCH (high confidence)
    if (newEmail && newEmail.includes('@')) {
      for (let i = 0; i < existingData.length; i++) {
        const existingEmail = normalizeEmail(existingData[i].email);
        if (existingEmail && existingEmail === newEmail) {
          return { index: i, confidence: 'email', similarity: 1 };
        }
      }
    }

    // 3. NAME MATCH (fuzzy, lower confidence)
    let bestNameMatch: { index: number; similarity: number } | null = null;
    for (let i = 0; i < existingData.length; i++) {
      const existingNorm = normalizeNameForMatch(existingData[i].name);
      const similarity = stringSimilarity(newName, existingNorm);

      // Threshold: 0.65 similarity for names (slightly lower to catch OCR variations)
      if (similarity >= 0.65 && (!bestNameMatch || similarity > bestNameMatch.similarity)) {
        bestNameMatch = { index: i, similarity };
      }
    }

    if (bestNameMatch) {
      return { index: bestNameMatch.index, confidence: 'name', similarity: bestNameMatch.similarity };
    }

    return null;
  }

  // Handle customer file selection - sends to API for smart analysis
  async function handleCustomerFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Store existing data for merge
    const existingData = [...customerImportData];
    const isReupload = existingData.length > 0;

    setCustomerImportFile(file);
    setCustomerImportError(null);
    if (!isReupload) {
      setCustomerImportData([]);
    }
    setCustomerImportMethod(null);
    setCustomerEditingIndex(null);
    setCustomerAnalyzing(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'customers');

      const response = await fetch('/api/import/analyze', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to analyze file');
      }

      if (result.data && result.data.length > 0) {
        if (isReupload) {
          // SMART MERGE MODE: Use phone/email/name to match and merge intelligently
          const mergedData = [...existingData];
          const usedIndices = new Set<number>();

          for (const newCustomer of result.data) {
            // Skip placeholder names
            const lowerName = newCustomer.name.toLowerCase().trim();
            if (lowerName === 'customer name' || lowerName === 'name' || lowerName.length < 2) {
              continue;
            }

            // Find best match using phone > email > name priority
            const match = findBestMatch(newCustomer, mergedData);

            if (match && !usedIndices.has(match.index)) {
              const existing = mergedData[match.index];

              // Smart merge logic based on match confidence
              let mergedName = existing.name;
              let mergedPhone = existing.phone || newCustomer.phone || '';
              let mergedEmail = existing.email || newCustomer.email || '';

              // If matched by phone/email (high confidence), consider updating name
              // if new name looks more complete or correct
              if (match.confidence === 'phone' || match.confidence === 'email') {
                // Prefer name with space (First Last) over single word
                const existingHasSpace = existing.name.includes(' ');
                const newHasSpace = newCustomer.name.includes(' ');

                if (!existingHasSpace && newHasSpace) {
                  mergedName = newCustomer.name; // New name is more complete
                } else if (existingHasSpace && newHasSpace) {
                  // Both have spaces - prefer longer/more complete looking one
                  // But don't change if they're similar (OCR variation)
                  const similarity = stringSimilarity(
                    normalizeNameForMatch(existing.name),
                    normalizeNameForMatch(newCustomer.name)
                  );
                  if (similarity < 0.8 && newCustomer.name.length > existing.name.length) {
                    mergedName = newCustomer.name;
                  }
                }
              }

              // Always fill in missing phone/email
              if (!existing.phone && newCustomer.phone) {
                mergedPhone = newCustomer.phone;
              }
              if (!existing.email && newCustomer.email) {
                mergedEmail = newCustomer.email;
              }

              mergedData[match.index] = {
                name: mergedName,
                phone: mergedPhone,
                email: mergedEmail,
              };
              usedIndices.add(match.index);
            } else {
              // No match - add as new customer if it looks legitimate
              const hasSpace = newCustomer.name.includes(' ');
              const isLongEnough = newCustomer.name.length >= 4;
              const hasContactInfo = newCustomer.phone || newCustomer.email;

              if (hasSpace || isLongEnough || hasContactInfo) {
                mergedData.push(newCustomer);
              }
            }
          }

          setCustomerImportData(mergedData);
          setCustomerImportMethod('ai');
        } else {
          // Fresh upload - filter out placeholder names
          const filteredData = result.data.filter((c: { name: string }) => {
            const lowerName = c.name.toLowerCase().trim();
            return lowerName !== 'customer name' && lowerName !== 'name' && lowerName.length >= 2;
          });
          setCustomerImportData(filteredData);
          setCustomerImportMethod(result.method);
        }
      } else if (!isReupload) {
        setCustomerImportError('No customer data found in file. Try a different file or format.');
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to analyze file';
      setCustomerImportError(errorMessage);
    } finally {
      setCustomerAnalyzing(false);
    }
  }

  // Update a customer row in the import data
  function updateCustomerImportRow(index: number, field: 'name' | 'phone' | 'email', value: string) {
    setCustomerImportData(prev => prev.map((row, i) =>
      i === index ? { ...row, [field]: value } : row
    ));
  }

  // Delete a customer row from import data
  function deleteCustomerImportRow(index: number) {
    setCustomerImportData(prev => prev.filter((_, i) => i !== index));
  }

  // Add a new empty customer row
  function addCustomerImportRow() {
    setCustomerImportData(prev => [...prev, { name: '', phone: '', email: '' }]);
    setCustomerEditingIndex(customerImportData.length);
  }

  // Handle inventory file selection - sends to API for smart analysis
  async function handleInventoryFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setInventoryImportFile(file);
    setInventoryImportError(null);
    setInventoryImportData([]);
    setInventoryImportMethod(null);
    setInventoryEditingIndex(null);
    setInventoryAnalyzing(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'inventory');

      const response = await fetch('/api/import/analyze', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to analyze file');
      }

      if (result.data && result.data.length > 0) {
        // Store ALL extracted data for review/editing
        setInventoryImportData(result.data);
        setInventoryImportMethod(result.method);
      } else {
        setInventoryImportError('No inventory data found in file. Try a different file or format.');
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to analyze file';
      setInventoryImportError(errorMessage);
    } finally {
      setInventoryAnalyzing(false);
    }
  }

  // Update an inventory row in the import data
  function updateInventoryImportRow(index: number, field: 'brand' | 'model' | 'size' | 'quantity' | 'price', value: string | number) {
    setInventoryImportData(prev => prev.map((row, i) =>
      i === index ? { ...row, [field]: value } : row
    ));
  }

  // Delete an inventory row from import data
  function deleteInventoryImportRow(index: number) {
    setInventoryImportData(prev => prev.filter((_, i) => i !== index));
  }

  // Add a new empty inventory row
  function addInventoryImportRow() {
    setInventoryImportData(prev => [...prev, { brand: '', model: '', size: '', quantity: 0, price: 0 }]);
    setInventoryEditingIndex(inventoryImportData.length);
  }

  // Import customers - uses the reviewed/edited data directly
  // Clean phone number - extract digits only, validate
  function cleanPhoneForImport(phone: string): string {
    if (!phone) return '';
    // Remove placeholder text
    const lower = phone.toLowerCase();
    if (lower.includes('phone') || lower.includes('number') || lower.includes('optional')) {
      return '';
    }
    // Extract digits only
    const digits = phone.replace(/\D/g, '');
    // Must have at least 7 digits to be valid
    if (digits.length < 7) return '';
    // Remove leading 1 for 11-digit US numbers
    if (digits.length === 11 && digits.startsWith('1')) {
      return digits.slice(1);
    }
    return digits;
  }

  // Clean email - validate format
  function cleanEmailForImport(email: string): string {
    if (!email) return '';
    // Remove placeholder text
    const lower = email.toLowerCase();
    if (lower.includes('optional') || lower.includes('email')) {
      return '';
    }
    // Basic email validation
    const trimmed = email.trim().toLowerCase();
    if (trimmed.includes('@') && trimmed.includes('.')) {
      return trimmed;
    }
    return '';
  }

  async function handleCustomerImport() {
    if (!shop?.id || customerImportData.length === 0) return;

    // Filter out empty rows and keep track of vehicles
    const validCustomersWithVehicles = customerImportData
      .filter(c => c.name.trim() && c.name.toLowerCase() !== 'customer name')
      .map(c => ({
        name: c.name.trim(),
        phone: cleanPhoneForImport(c.phone),
        email: cleanEmailForImport(c.email),
        vehicle: c.vehicle, // Keep vehicle data
      }));

    if (validCustomersWithVehicles.length === 0) {
      setCustomerImportError('No valid customers to import. Each customer needs at least a name.');
      return;
    }

    setCustomerImporting(true);
    setCustomerImportError(null);

    try {
      // Insert customers and get back the created records
      console.log('[Customer Import] Attempting to insert:', validCustomersWithVehicles.length, 'customers');

      // Prepare customers for insert (without vehicle data)
      const customersToInsert = validCustomersWithVehicles.map(c => ({
        shop_id: shop.id,
        name: String(c.name || '').trim(),
        phone: String(c.phone || ''),
        email: String(c.email || ''),
      }));

      const { data: insertedCustomers, error } = await supabase
        .from('customers')
        .insert(customersToInsert)
        .select('id, name, phone, email');

      if (error) {
        console.error('[Customer Import] Supabase error:', error);
        throw new Error(`${error.message}${error.code ? ` (${error.code})` : ''}`);
      }

      // Now insert vehicles for customers that have vehicle data
      if (insertedCustomers && insertedCustomers.length > 0) {
        const vehiclesToInsert: {
          shop_id: string;
          customer_id: string;
          year: number | null;
          make: string | null;
          model: string | null;
          trim: string | null;
          tire_size: string | null;
          plate: string | null;
          vin: string | null;
        }[] = [];

        // Match inserted customers back to original data by name to get vehicle info
        for (let i = 0; i < insertedCustomers.length; i++) {
          const customer = insertedCustomers[i];
          const originalData = validCustomersWithVehicles[i];

          if (originalData?.vehicle && (originalData.vehicle.make || originalData.vehicle.model || originalData.vehicle.tire_size)) {
            vehiclesToInsert.push({
              shop_id: shop.id,
              customer_id: customer.id,
              year: originalData.vehicle.year || null,
              make: originalData.vehicle.make || null,
              model: originalData.vehicle.model || null,
              trim: originalData.vehicle.trim || null,
              tire_size: originalData.vehicle.tire_size || null,
              plate: originalData.vehicle.plate || null,
              vin: originalData.vehicle.vin || null,
            });
          }
        }

        // Insert vehicles if any
        if (vehiclesToInsert.length > 0) {
          console.log('[Customer Import] Inserting', vehiclesToInsert.length, 'vehicles');
          const { error: vehicleError } = await supabase
            .from('vehicles')
            .insert(vehiclesToInsert);

          if (vehicleError) {
            console.error('[Customer Import] Vehicle insert error:', vehicleError);
            // Don't fail the whole import, just log it
          }
        }

        setImportedCustomers(insertedCustomers);
      }

      const vehicleCount = validCustomersWithVehicles.filter(c => c.vehicle?.make || c.vehicle?.model).length;
      toast({
        title: 'Import Successful!',
        description: `${validCustomersWithVehicles.length} customers${vehicleCount > 0 ? ` and ${vehicleCount} vehicles` : ''} imported.`,
      });

      setCustomerImportOpen(false);
      setCustomerImportFile(null);
      setCustomerImportData([]);
      setCustomerImportMethod(null);
      setCustomerEditingIndex(null);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to import customers';
      setCustomerImportError(errorMessage);
    } finally {
      setCustomerImporting(false);
    }
  }

  // Check for duplicate brand+size combinations in existing inventory
  async function checkForDuplicates() {
    if (!shop?.id || inventoryImportData.length === 0) return false;

    const validItems = inventoryImportData.filter(i => i.brand.trim() && i.size.trim());
    if (validItems.length === 0) return false;

    // Get existing inventory brand+size combinations
    const { data: existing } = await supabase
      .from('inventory')
      .select('brand, size')
      .eq('shop_id', shop.id);

    // Create keys from brand+size (normalized)
    const normalizeKey = (brand: string, size: string) =>
      `${brand.toLowerCase().trim()}|${size.toLowerCase().replace(/\s/g, '')}`;

    const existingKeys = new Set((existing || []).map(e => normalizeKey(e.brand, e.size)));
    const importKeys = validItems.map(i => normalizeKey(i.brand, i.size));
    const duplicates = validItems.filter(i => existingKeys.has(normalizeKey(i.brand, i.size)));

    if (duplicates.length > 0) {
      // Get unique duplicate brand+size for display
      const uniqueDuplicates = [...new Set(duplicates.map(d => `${d.brand} ${d.size}`))];
      setDuplicateSizes(uniqueDuplicates);
      return true;
    }
    return false;
  }

  // Import inventory - uses the reviewed/edited data directly
  async function handleInventoryImport(mode: 'check' | 'merge' | 'add' = 'check') {
    if (!shop?.id || inventoryImportData.length === 0) return;

    // Filter out empty rows
    const validItems = inventoryImportData.filter(i => i.brand.trim() && i.size.trim());
    if (validItems.length === 0) {
      setInventoryImportError('No valid items to import. Each item needs at least a brand and size.');
      return;
    }

    // If checking, look for duplicates first
    if (mode === 'check') {
      const hasDuplicates = await checkForDuplicates();
      if (hasDuplicates) {
        setShowDuplicateChoice(true);
        return;
      }
      // No duplicates, proceed with add
      mode = 'add';
    }

    setShowDuplicateChoice(false);
    setInventoryImporting(true);
    setInventoryImportError(null);

    try {
      if (mode === 'merge') {
        // Get existing inventory to match against (by brand+size)
        const { data: existing } = await supabase
          .from('inventory')
          .select('id, brand, size, quantity')
          .eq('shop_id', shop.id);

        // Create key from brand+size (normalized)
        const normalizeKey = (brand: string, size: string) =>
          `${brand.toLowerCase().trim()}|${size.toLowerCase().replace(/\s/g, '')}`;

        const existingMap = new Map((existing || []).map(e => [
          normalizeKey(e.brand, e.size),
          e
        ]));

        const toUpdate: { id: string; quantity: number; price: number }[] = [];
        const toInsert: typeof validItems = [];

        for (const item of validItems) {
          const key = normalizeKey(item.brand, item.size);
          const existingItem = existingMap.get(key);

          if (existingItem) {
            // Update existing: add quantity, update price if provided
            toUpdate.push({
              id: existingItem.id,
              quantity: existingItem.quantity + (item.quantity || 0),
              price: item.price || 0,
            });
          } else {
            toInsert.push(item);
          }
        }

        // Update existing items
        for (const update of toUpdate) {
          await supabase
            .from('inventory')
            .update({ quantity: update.quantity, price: update.price })
            .eq('id', update.id);
        }

        // Insert new items
        if (toInsert.length > 0) {
          await supabase.from('inventory').insert(
            toInsert.map(i => ({
              shop_id: shop.id,
              brand: i.brand.trim(),
              model: i.model?.trim() || '',
              size: i.size.trim(),
              quantity: i.quantity || 0,
              price: i.price || 0,
            }))
          );
        }

        toast({
          title: 'Import Successful!',
          description: `Updated ${toUpdate.length} existing, added ${toInsert.length} new`,
        });
      } else {
        // Add all as new
        const { error } = await supabase.from('inventory').insert(
          validItems.map(i => ({
            shop_id: shop.id,
            brand: i.brand.trim(),
            model: i.model?.trim() || '',
            size: i.size.trim(),
            quantity: i.quantity || 0,
            price: i.price || 0,
          }))
        );

        if (error) throw error;

        toast({
          title: 'Import Successful!',
          description: `${validItems.length} inventory items added`,
        });
      }

      // Refresh the tires list
      const { data } = await supabase
        .from('inventory')
        .select('id, brand, model, size, price, quantity')
        .eq('shop_id', shop.id)
        .order('brand');
      setTires(data || []);

      setInventoryImportOpen(false);
      setInventoryImportFile(null);
      setInventoryImportData([]);
      setInventoryImportMethod(null);
      setInventoryEditingIndex(null);
      setDuplicateSizes([]);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to import inventory';
      setInventoryImportError(errorMessage);
    } finally {
      setInventoryImporting(false);
    }
  }

  const steps = [
    {
      id: 'shop-profile',
      title: 'Shop Profile',
      description: 'Set up your tire shop details so customers know who you are.',
      icon: <Building2 size={24} />,
      optional: false,
    },
    {
      id: 'services-pricing',
      title: 'Services & Pricing',
      description: 'Set your service prices. You can always change these later in Settings.',
      icon: <DollarSign size={24} />,
      optional: false,
    },
    {
      id: 'first-customer',
      title: 'Add a Customer',
      description: 'Add your first customer to get started with your customer database.',
      icon: <Users size={24} />,
      optional: true,
    },
    {
      id: 'first-workorder',
      title: 'Create Work Order',
      description: 'Schedule your first appointment to see how work orders work.',
      icon: <ClipboardList size={24} />,
      optional: true,
    },
  ];

  const updateFormData = (field: keyof OnboardingData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Validation for each step
  const isStepValid = (stepIndex: number): boolean => {
    switch (stepIndex) {
      case 0: // Shop Profile
        return formData.shopName.trim().length > 0;
      case 1: // Services & Pricing
        return servicesInitialized; // Just need services to be loaded
      case 2: // Customer (optional but if filling, need name + phone)
        if (!formData.customerName.trim()) return true; // Skip is valid
        return formData.customerName.trim().length > 0 && formData.customerPhone.trim().length > 0;
      case 3: // Work Order (optional)
        return true;
      default:
        return true;
    }
  };

  // Update service price in state and API
  const handleServicePriceUpdate = async (serviceId: string, newPrice: number) => {
    // Update local state optimistically
    setServices(prev => prev.map(s =>
      s.id === serviceId ? { ...s, price: newPrice } : s
    ));

    // Update in database
    try {
      await fetch('/api/services', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: serviceId, price: newPrice }),
      });
    } catch (error) {
      console.error('Error updating service price:', error);
    }
  };

  // Toggle service active state
  const handleServiceToggle = async (serviceId: string, isActive: boolean) => {
    setServices(prev => prev.map(s =>
      s.id === serviceId ? { ...s, is_active: isActive } : s
    ));

    try {
      await fetch('/api/services', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: serviceId, is_active: isActive }),
      });
    } catch (error) {
      console.error('Error toggling service:', error);
    }
  };

  const handleSaveShopProfile = async () => {
    if (!shop) return false;

    try {
      const { error } = await supabase
        .from('shops')
        .update({
          name: formData.shopName.trim(),
          email: formData.shopEmail.trim() || null,
          phone: formData.shopPhone.trim() || null,
          address: formData.shopAddress.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', shop.id);

      if (error) throw error;

      // Also update owner name if changed
      if (profile && formData.ownerName.trim()) {
        await supabase
          .from('profiles')
          .update({
            full_name: formData.ownerName.trim(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', profile.id);
      }

      return true;
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to save shop profile',
      });
      return false;
    }
  };

  // Decode VIN using NHTSA API (free, no auth required)
  const decodeVIN = async (vin: string) => {
    if (vin.length !== 17) {
      setVinError('VIN must be exactly 17 characters');
      return;
    }

    setVinLoading(true);
    setVinError(null);

    try {
      const response = await fetch(
        `https://vpic.nhtsa.dot.gov/api/vehicles/decodevin/${vin}?format=json`
      );
      const data = await response.json();

      if (data.Results) {
        const getValue = (variableId: number) => {
          const result = data.Results.find((r: { VariableId: number; Value: string }) => r.VariableId === variableId);
          return result?.Value || '';
        };

        // Extract vehicle info from NHTSA response
        const year = getValue(29); // Model Year
        const make = getValue(26); // Make
        const model = getValue(28); // Model
        const trim = getValue(38); // Trim

        if (!make && !model) {
          setVinError('Could not decode VIN. Please check and try again.');
          return;
        }

        setManualVehicle(prev => ({
          ...prev,
          vin,
          year: year || prev.year,
          make: make || prev.make,
          model: model || prev.model,
          trim: trim || prev.trim,
        }));

        toast({
          title: 'VIN Decoded',
          description: `${year} ${make} ${model}`.trim(),
        });
      }
    } catch {
      setVinError('Failed to decode VIN. Please enter vehicle info manually.');
    } finally {
      setVinLoading(false);
    }
  };

  const handleCreateCustomer = async () => {
    // Skip if customer was already imported (createdCustomerId is set)
    if (createdCustomerId) return true;

    // Skip if no customer name entered
    if (!formData.customerName.trim()) return true;

    try {
      const result = await createCustomerAction({
        name: formData.customerName.trim(),
        phone: formData.customerPhone.trim(),
        email: formData.customerEmail.trim() || '',
        address: '',
        tire_size: manualVehicle.tire_size || '',
        notes: '',
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to create customer');
      }

      const customerId = result.data?.id;
      if (customerId) {
        setCreatedCustomerId(customerId);

        // Also create vehicle if vehicle info was entered
        const hasVehicleData = manualVehicle.make || manualVehicle.model || manualVehicle.tire_size || manualVehicle.vin;
        if (hasVehicleData && shop?.id) {
          try {
            await supabase.from('vehicles').insert({
              shop_id: shop.id,
              customer_id: customerId,
              year: manualVehicle.year ? parseInt(manualVehicle.year) : null,
              make: manualVehicle.make || null,
              model: manualVehicle.model || null,
              trim: manualVehicle.trim || null,
              tire_size: manualVehicle.tire_size || null,
              plate: manualVehicle.plate || null,
              vin: manualVehicle.vin || null,
            });
          } catch (vehicleError) {
            console.error('Failed to create vehicle:', vehicleError);
            // Don't fail customer creation if vehicle fails
          }
        }
      }
      return true;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create customer';
      toast({
        variant: 'destructive',
        title: 'Error',
        description: errorMessage,
      });
      return false;
    }
  };

  const handleCreateWorkOrder = async () => {
    // Only create if we have a customer
    if (!createdCustomerId) return true;

    try {
      // Calculate total from selected tires
      const subtotal = selectedTires.reduce(
        (sum, st) => sum + st.tire.price * st.quantity,
        0
      );
      const taxRate = shop?.tax_rate ? parseFloat(String(shop.tax_rate)) / 100 : 0;
      const totalAmount = subtotal * (1 + taxRate);

      // Create the work order
      const { data: workOrder, error } = await supabase
        .from('work_orders')
        .insert({
          shop_id: shop!.id,
          customer_id: createdCustomerId,
          service_type: formData.serviceType,
          scheduled_date: formData.scheduledDate,
          scheduled_time: formData.scheduledTime || null,
          notes: formData.notes.trim() || null,
          status: 'pending',
          total_amount: selectedTires.length > 0 ? totalAmount : null,
        })
        .select('id')
        .single();

      if (error) throw error;

      // Create work_order_items if tires were selected
      if (selectedTires.length > 0 && workOrder) {
        const workOrderItems = selectedTires.map((st) => ({
          work_order_id: workOrder.id,
          tire_id: st.tire.id,
          quantity: st.quantity,
          unit_price: st.tire.price,
          subtotal: st.tire.price * st.quantity,
        }));

        const { error: itemsError } = await supabase
          .from('work_order_items')
          .insert(workOrderItems);

        if (itemsError) {
          console.error('Error creating work order items:', itemsError);
          // Don't fail the whole operation, just log
        }

        // Update inventory quantities
        for (const st of selectedTires) {
          await supabase
            .from('inventory')
            .update({ quantity: st.tire.quantity - st.quantity })
            .eq('id', st.tire.id);
        }
      }

      return true;
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to create work order',
      });
      return false;
    }
  };

  const handleCompleteOnboarding = async () => {
    if (!shop) return;

    try {
      // Link Stripe subscription if there's a pending checkout session
      const pendingCheckoutSession = localStorage.getItem('pendingCheckoutSession');
      const pendingTier = localStorage.getItem('pendingTier');
      if (pendingCheckoutSession) {
        try {
          const response = await fetch('/api/stripe/link-subscription', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              checkoutSessionId: pendingCheckoutSession,
              shopId: shop.id,
              tier: pendingTier || 'pro',
            }),
          });

          // Mark session as used to prevent reuse
          try {
            await fetch('/api/stripe/mark-session-used', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                sessionId: pendingCheckoutSession,
                shopId: shop.id,
                tier: localStorage.getItem('pendingTier') || 'pro',
              }),
            });
          } catch (markError) {
            console.warn('Failed to mark session as used:', markError);
          }

          // Clear pending session regardless of result (user already paid)
          localStorage.removeItem('pendingCheckoutSession');
          localStorage.removeItem('pendingTier');

          if (!response.ok) {
            // Log but don't block onboarding - subscription can be linked later
            console.warn('Subscription linking deferred - database may need schema update');
          }
        } catch (linkError) {
          // Don't block onboarding if linking fails
          console.warn('Subscription linking deferred:', linkError);

          // Still try to mark session as used
          try {
            await fetch('/api/stripe/mark-session-used', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                sessionId: pendingCheckoutSession,
                shopId: shop.id,
                tier: localStorage.getItem('pendingTier') || 'pro',
              }),
            });
          } catch (markError) {
            console.warn('Failed to mark session as used:', markError);
          }

          localStorage.removeItem('pendingCheckoutSession');
          localStorage.removeItem('pendingTier');
        }
      }

      const { error } = await supabase
        .from('shops')
        .update({
          onboarding_completed: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', shop.id);

      if (error) throw error;

      await refreshProfile();

      toast({
        title: 'Setup Complete!',
        description: 'Welcome to TireOps. Your shop is ready to go!',
      });

      router.push('/');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to complete onboarding',
      });
    }
  };

  const handleNext = async () => {
    setIsSubmitting(true);

    try {
      // Save current step data
      switch (currentStep) {
        case 0: // Shop Profile
          const shopSaved = await handleSaveShopProfile();
          if (!shopSaved) {
            setIsSubmitting(false);
            return;
          }
          break;
        case 1: // Services & Pricing
          // Prices are saved on change, nothing special needed
          break;
        case 2: // Customer
          const customerCreated = await handleCreateCustomer();
          if (!customerCreated) {
            setIsSubmitting(false);
            return;
          }
          break;
        case 3: // Work Order
          const workOrderCreated = await handleCreateWorkOrder();
          if (!workOrderCreated) {
            setIsSubmitting(false);
            return;
          }
          // Final step - complete onboarding
          await handleCompleteOnboarding();
          setIsSubmitting(false);
          return;
      }

      // Move to next step
      setCurrentStep(prev => prev + 1);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = async () => {
    if (currentStep === steps.length - 1) {
      // Final step - complete onboarding
      setIsSubmitting(true);
      await handleCompleteOnboarding();
      setIsSubmitting(false);
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  // Show loading while auth is loading or checking onboarding status
  if (authLoading || !profile) {
    return (
      <div className="min-h-screen bg-bg-dark flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Don't render if already completed (redirect will happen)
  if (shop?.onboarding_completed) {
    return (
      <div className="min-h-screen bg-bg-dark flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const isLastStep = currentStep === steps.length - 1;
  const canProceed = isStepValid(currentStep);

  return (
    <div className="h-screen bg-gradient-to-br from-bg-dark via-bg-dark to-bg flex flex-col overflow-hidden">
      {/* Compact Header */}
      <header className="bg-bg/80 backdrop-blur-sm border-b border-border-muted px-4 py-3 flex-shrink-0">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
              <Wrench className="text-white" size={16} />
            </div>
            <div>
              <h1 className="text-sm font-bold text-text">Welcome to TireOps</h1>
            </div>
          </div>

          {/* Progress Steps - Compact */}
          <div className="flex items-center gap-1">
            {steps.map((step, index) => (
              <button
                key={step.id}
                onClick={() => index < currentStep && setCurrentStep(index)}
                disabled={index > currentStep}
                className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md transition-all ${
                  index === currentStep
                    ? 'bg-primary/15 text-primary'
                    : index < currentStep
                    ? 'text-success hover:bg-success/10'
                    : 'text-text-muted'
                }`}
              >
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  index < currentStep ? 'bg-success text-white' : index === currentStep ? 'bg-primary text-white' : 'bg-bg-light text-text-muted'
                }`}>
                  {index < currentStep ? <Check size={10} /> : index + 1}
                </div>
                <span className="text-xs font-medium hidden md:inline">{step.title}</span>
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Step Content */}
      <main className="flex-1 px-4 py-4 overflow-y-auto">
        <div className="max-w-xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {/* Compact Step Header */}
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  {steps[currentStep].icon}
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-bold text-text">{steps[currentStep].title}</h2>
                  <p className="text-xs text-text-muted">{steps[currentStep].description}</p>
                </div>
                {steps[currentStep].optional && (
                  <span className="text-[10px] px-2 py-1 rounded-full bg-bg-light text-text-muted">Optional</span>
                )}
              </div>

              {/* Step Form */}
              <div className="bg-bg rounded-xl border border-border-muted p-4 shadow-sm">
                {/* Step 0: Shop Profile */}
                {currentStep === 0 && (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="shopName" className="text-sm font-medium text-text">Shop Name <span className="text-danger">*</span></Label>
                      <Input id="shopName" value={formData.shopName} onChange={(e) => updateFormData('shopName', e.target.value)} placeholder="e.g. Premier Tire & Auto" className="mt-1.5 h-10" autoComplete="off" data-lpignore="true" data-form-type="other" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="ownerName" className="text-sm font-medium text-text">Your Name</Label>
                        <div className="relative mt-1.5">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={14} />
                          <Input id="ownerName" value={formData.ownerName} onChange={(e) => updateFormData('ownerName', e.target.value)} placeholder="John Smith" className="pl-9 h-10" />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="shopPhone" className="text-sm font-medium text-text">Phone</Label>
                        <div className="relative mt-1.5">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={14} />
                          <Input id="shopPhone" type="tel" value={formData.shopPhone} onChange={(e) => updateFormData('shopPhone', e.target.value)} placeholder="(555) 123-4567" className="pl-9 h-10" />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="shopEmail" className="text-sm font-medium text-text">Email</Label>
                        <div className="relative mt-1.5">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={14} />
                          <Input id="shopEmail" type="email" value={formData.shopEmail} onChange={(e) => updateFormData('shopEmail', e.target.value)} placeholder="shop@example.com" className="pl-9 h-10" />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="shopAddress" className="text-sm font-medium text-text">Address</Label>
                        <div className="relative mt-1.5">
                          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={14} />
                          <Input id="shopAddress" value={formData.shopAddress} onChange={(e) => updateFormData('shopAddress', e.target.value)} placeholder="123 Main St" className="pl-9 h-10" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 1: Services & Pricing */}
                {currentStep === 1 && (
                  <div className="space-y-4">
                    {servicesLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="animate-spin text-primary" size={24} />
                        <span className="ml-2 text-sm text-text-muted">Loading services...</span>
                      </div>
                    ) : (
                      <>
                        {/* Info banner */}
                        <div className="flex items-start gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
                          <Settings2 className="text-primary flex-shrink-0 mt-0.5" size={16} />
                          <div className="text-sm">
                            <p className="text-text font-medium">Set your service prices</p>
                            <p className="text-text-muted text-xs mt-0.5">These will be used when creating work orders. You can edit them anytime in Settings.</p>
                          </div>
                        </div>

                        {/* Services list by category */}
                        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                          {(['installation', 'maintenance', 'repair', 'tpms', 'fees', 'protection'] as const).map(category => {
                            const categoryServices = services.filter(s => s.category === category);
                            if (categoryServices.length === 0) return null;

                            const categoryLabels: Record<string, { label: string; icon: React.ReactNode }> = {
                              installation: { label: 'Installation', icon: <Wrench size={14} /> },
                              maintenance: { label: 'Maintenance', icon: <RefreshCw size={14} /> },
                              repair: { label: 'Repair', icon: <Wrench size={14} /> },
                              tpms: { label: 'TPMS', icon: <Settings2 size={14} /> },
                              fees: { label: 'Fees', icon: <DollarSign size={14} /> },
                              protection: { label: 'Protection', icon: <Package size={14} /> },
                            };

                            const { label: categoryLabel, icon: categoryIcon } = categoryLabels[category] || { label: category, icon: null };

                            return (
                              <div key={category} className="rounded-lg border border-border-muted overflow-hidden">
                                <div className="flex items-center gap-2 px-3 py-2 bg-bg-light border-b border-border-muted">
                                  <span className="text-text-muted">{categoryIcon}</span>
                                  <span className="text-xs font-semibold text-text uppercase tracking-wide">{categoryLabel}</span>
                                </div>
                                <div className="divide-y divide-border-muted/50">
                                  {categoryServices.map(service => (
                                    <div
                                      key={service.id}
                                      className={`flex items-center justify-between px-3 py-2.5 ${!service.is_active ? 'opacity-50' : ''}`}
                                    >
                                      <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <button
                                          onClick={() => handleServiceToggle(service.id, !service.is_active)}
                                          className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition-colors ${
                                            service.is_active
                                              ? 'bg-primary text-white'
                                              : 'bg-bg-light border border-border-muted'
                                          }`}
                                        >
                                          {service.is_active && <Check size={10} />}
                                        </button>
                                        <div className="min-w-0">
                                          <p className="text-sm font-medium text-text truncate">{service.name}</p>
                                          <p className="text-[10px] text-text-muted">
                                            {service.price_type === 'per_tire' ? 'per tire' : service.price_type === 'flat' ? 'flat rate' : 'per unit'}
                                            {service.is_taxable && ' · taxable'}
                                          </p>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <button
                                          type="button"
                                          onClick={() => handleServicePriceUpdate(service.id, Math.max(0, (service.price || 0) - 5))}
                                          className="w-6 h-6 rounded flex items-center justify-center bg-bg-light border border-border-muted text-text-muted hover:bg-danger/20 hover:text-danger hover:border-danger/30 transition-colors"
                                        >
                                          <Minus size={12} />
                                        </button>
                                        <div className="relative">
                                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-text-muted text-sm">$</span>
                                          <input
                                            type="text"
                                            inputMode="decimal"
                                            value={service.price.toFixed(2)}
                                            onChange={(e) => {
                                              const val = e.target.value.replace(/[^0-9.]/g, '');
                                              const num = parseFloat(val);
                                              if (!isNaN(num)) handleServicePriceUpdate(service.id, num);
                                            }}
                                            onBlur={(e) => {
                                              const num = parseFloat(e.target.value) || 0;
                                              handleServicePriceUpdate(service.id, Math.max(0, num));
                                            }}
                                            className="w-20 h-8 pl-5 pr-2 text-right text-sm font-medium rounded border border-border-muted bg-bg-light text-text focus:outline-none focus:ring-1 focus:ring-primary"
                                          />
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() => handleServicePriceUpdate(service.id, (service.price || 0) + 5)}
                                          className="w-6 h-6 rounded flex items-center justify-center bg-bg-light border border-border-muted text-text-muted hover:bg-success/20 hover:text-success hover:border-success/30 transition-colors"
                                        >
                                          <Plus size={12} />
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Summary */}
                        <div className="flex items-center justify-between pt-2 text-xs text-text-muted">
                          <span>{services.filter(s => s.is_active).length} active services</span>
                          <span>You can add more services later in Settings</span>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Step 2: Add a Customer */}
                {currentStep === 2 && (
                  <div className="space-y-4">
                    {/* Import option */}
                    <div className="flex items-center justify-between p-3 rounded-lg bg-info/5 border border-info/20">
                      <div className="flex items-center gap-2">
                        <Upload className="text-info" size={16} />
                        <span className="text-sm text-text">Have existing customers?</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Pro tip with tooltip */}
                        <div
                          className="relative"
                          onMouseEnter={() => setShowImportTip(true)}
                          onMouseLeave={() => setShowImportTip(false)}
                        >
                          <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-warning/10 text-warning text-[10px] font-medium cursor-help">
                            <Info size={10} />
                            <span>Import newer records first</span>
                          </div>
                        </div>
                        <button
                          onClick={() => canUseImport ? setCustomerImportOpen(true) : setShowUpgradePrompt(true)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                            canUseImport ? 'bg-info text-white hover:bg-info/90' : 'bg-bg-light text-text-muted'
                          }`}
                        >
                          {canUseImport ? <Upload size={12} /> : <Lock size={12} />}
                          {canUseImport ? 'Import' : 'Pro'}
                        </button>
                      </div>
                    </div>

                    {/* Imported customers selector with search */}
                    {importedCustomers.length > 0 && (
                      <div className="rounded-xl bg-gradient-to-br from-success/5 to-success/10 border border-success/20 overflow-hidden">
                        <div className="flex items-center justify-between px-3 py-2 border-b border-success/10">
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded-full bg-success/20 flex items-center justify-center">
                              <Check className="text-success" size={12} />
                            </div>
                            <span className="text-xs font-semibold text-text">{importedCustomers.length} customers imported</span>
                          </div>
                        </div>
                        <div className="p-2">
                          {/* Search input */}
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" size={14} />
                            <input
                              type="text"
                              value={customerSearchQuery}
                              onChange={(e) => setCustomerSearchQuery(e.target.value)}
                              placeholder="Search by name or phone..."
                              className="w-full h-10 pl-9 pr-8 rounded-lg border border-border-muted bg-bg-light text-sm text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                            />
                            {customerSearchQuery && (
                              <button
                                onClick={() => setCustomerSearchQuery('')}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-full text-text-muted hover:text-text hover:bg-bg-light transition-all"
                              >
                                <X size={12} />
                              </button>
                            )}
                          </div>
                          {/* Filtered customer list */}
                          <div className="mt-2 max-h-40 overflow-y-auto rounded-lg bg-bg-light border border-border-muted divide-y divide-border-muted/30">
                            {importedCustomers
                              .filter(c => {
                                if (!customerSearchQuery) return true;
                                const query = customerSearchQuery.toLowerCase();
                                return (
                                  c.name?.toLowerCase().includes(query) ||
                                  c.phone?.toLowerCase().includes(query) ||
                                  c.email?.toLowerCase().includes(query)
                                );
                              })
                              .map((customer, idx) => (
                                <button
                                  key={customer.id}
                                  onClick={() => {
                                    setCreatedCustomerId(customer.id);
                                    setFormData(prev => ({ ...prev, customerName: customer.name || '', customerPhone: customer.phone || '', customerEmail: customer.email || '' }));
                                  }}
                                  className={`w-full px-3 py-2 text-left text-sm transition-all duration-150 flex items-center justify-between ${
                                    createdCustomerId === customer.id
                                      ? 'bg-primary/10'
                                      : 'hover:bg-bg/50'
                                  }`}
                                >
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <span className={`font-medium truncate ${createdCustomerId === customer.id ? 'text-primary' : 'text-text'}`}>
                                      {customer.name}
                                    </span>
                                    {customer.phone && (
                                      <>
                                        <span className="text-text-muted/50">·</span>
                                        <span className="text-text-muted text-xs whitespace-nowrap">{customer.phone}</span>
                                      </>
                                    )}
                                  </div>
                                  {createdCustomerId === customer.id && (
                                    <Check size={14} className="text-primary flex-shrink-0 ml-2" />
                                  )}
                                </button>
                              ))}
                            {importedCustomers.filter(c => {
                              if (!customerSearchQuery) return true;
                              const query = customerSearchQuery.toLowerCase();
                              return c.name?.toLowerCase().includes(query) || c.phone?.toLowerCase().includes(query) || c.email?.toLowerCase().includes(query);
                            }).length === 0 && (
                              <div className="px-3 py-4 text-sm text-text-muted text-center">
                                <Search size={16} className="mx-auto mb-1 opacity-50" />
                                No customers match "{customerSearchQuery}"
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Or divider - only show when imported customers exist */}
                    {importedCustomers.length > 0 && (
                      <div className="relative flex items-center justify-center py-3">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t border-dashed border-border-muted/60"></div>
                        </div>
                        <div className="relative flex items-center gap-2 px-4 bg-bg rounded-full border border-border-muted/40 py-1.5 shadow-sm">
                          <div className="w-1 h-1 rounded-full bg-primary/60"></div>
                          <span className="text-[11px] font-medium text-text-muted uppercase tracking-wider">or enter manually</span>
                          <div className="w-1 h-1 rounded-full bg-primary/60"></div>
                        </div>
                      </div>
                    )}

                    {/* Manual entry form */}
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="customerName" className="text-sm font-medium text-text">Customer Name</Label>
                        <div className="relative mt-1.5">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={14} />
                          <Input id="customerName" value={formData.customerName} onChange={(e) => updateFormData('customerName', e.target.value)} placeholder="John Smith" className="pl-9 h-10" autoComplete="off" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label htmlFor="customerPhone" className="text-sm font-medium text-text">Phone</Label>
                          <div className="relative mt-1.5">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={14} />
                            <Input id="customerPhone" type="tel" value={formData.customerPhone} onChange={(e) => updateFormData('customerPhone', e.target.value)} placeholder="(555) 123-4567" className="pl-9 h-10" autoComplete="off" />
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="customerEmail" className="text-sm font-medium text-text">Email</Label>
                          <div className="relative mt-1.5">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={14} />
                            <Input id="customerEmail" type="email" value={formData.customerEmail} onChange={(e) => updateFormData('customerEmail', e.target.value)} placeholder="john@email.com" className="pl-9 h-10" autoComplete="off" />
                          </div>
                        </div>
                      </div>

                      {/* Add Vehicle Section */}
                      <div className="pt-2">
                        {!showVehicleForm ? (
                          <button
                            type="button"
                            onClick={() => setShowVehicleForm(true)}
                            className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors"
                          >
                            <Car size={14} />
                            <span>Add Vehicle</span>
                            <Plus size={12} />
                          </button>
                        ) : (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="space-y-3 p-3 rounded-lg bg-bg-light border border-border-muted"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Car size={14} className="text-primary" />
                                <span className="text-sm font-medium text-text">Vehicle Info</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setShowVehicleForm(false);
                                  setManualVehicle({ vin: '', year: '', make: '', model: '', trim: '', tire_size: '', plate: '' });
                                  setVinError(null);
                                }}
                                className="p-1 rounded hover:bg-danger/10 text-text-muted hover:text-danger transition-colors"
                              >
                                <X size={14} />
                              </button>
                            </div>

                            {/* VIN Lookup */}
                            <div>
                              <Label className="text-xs font-medium text-text-muted">VIN (auto-fills vehicle info)</Label>
                              <div className="flex gap-2 mt-1">
                                <div className="relative flex-1">
                                  <Hash className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" size={12} />
                                  <Input
                                    value={manualVehicle.vin}
                                    onChange={(e) => setManualVehicle(prev => ({ ...prev, vin: e.target.value.toUpperCase() }))}
                                    placeholder="Enter 17-character VIN"
                                    className="pl-8 h-9 text-sm font-mono uppercase"
                                    maxLength={17}
                                  />
                                </div>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => decodeVIN(manualVehicle.vin)}
                                  disabled={vinLoading || manualVehicle.vin.length !== 17}
                                  className="h-9 px-3"
                                >
                                  {vinLoading ? <Loader2 size={14} className="animate-spin" /> : 'Decode'}
                                </Button>
                              </div>
                              {vinError && (
                                <p className="text-xs text-danger mt-1">{vinError}</p>
                              )}
                            </div>

                            {/* Year / Make / Model */}
                            <div className="grid grid-cols-3 gap-2">
                              <div>
                                <Label className="text-xs font-medium text-text-muted">Year</Label>
                                <Input
                                  value={manualVehicle.year}
                                  onChange={(e) => setManualVehicle(prev => ({ ...prev, year: e.target.value }))}
                                  placeholder="2024"
                                  className="mt-1 h-9 text-sm"
                                  maxLength={4}
                                />
                              </div>
                              <div>
                                <Label className="text-xs font-medium text-text-muted">Make</Label>
                                <Input
                                  value={manualVehicle.make}
                                  onChange={(e) => setManualVehicle(prev => ({ ...prev, make: e.target.value }))}
                                  placeholder="Honda"
                                  className="mt-1 h-9 text-sm"
                                />
                              </div>
                              <div>
                                <Label className="text-xs font-medium text-text-muted">Model</Label>
                                <Input
                                  value={manualVehicle.model}
                                  onChange={(e) => setManualVehicle(prev => ({ ...prev, model: e.target.value }))}
                                  placeholder="Accord"
                                  className="mt-1 h-9 text-sm"
                                />
                              </div>
                            </div>

                            {/* Tire Size / Plate */}
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <Label className="text-xs font-medium text-text-muted">Tire Size</Label>
                                <Input
                                  value={manualVehicle.tire_size}
                                  onChange={(e) => setManualVehicle(prev => ({ ...prev, tire_size: e.target.value.toUpperCase() }))}
                                  placeholder="225/45R17"
                                  className="mt-1 h-9 text-sm font-mono"
                                />
                              </div>
                              <div>
                                <Label className="text-xs font-medium text-text-muted">License Plate</Label>
                                <Input
                                  value={manualVehicle.plate}
                                  onChange={(e) => setManualVehicle(prev => ({ ...prev, plate: e.target.value.toUpperCase() }))}
                                  placeholder="ABC1234"
                                  className="mt-1 h-9 text-sm font-mono uppercase"
                                />
                              </div>
                            </div>

                            {/* Vehicle preview */}
                            {(manualVehicle.year || manualVehicle.make || manualVehicle.model) && (
                              <div className="flex items-center gap-2 pt-1">
                                <Check size={12} className="text-success" />
                                <span className="text-xs text-text-muted">
                                  {[manualVehicle.year, manualVehicle.make, manualVehicle.model].filter(Boolean).join(' ')}
                                  {manualVehicle.tire_size && ` • ${manualVehicle.tire_size}`}
                                </span>
                              </div>
                            )}
                          </motion.div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 3: First Work Order */}
                {currentStep === 3 && (
                  <div className="space-y-4">
                    {!createdCustomerId ? (
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-warning/10 border border-warning/20">
                        <ClipboardList className="text-warning" size={18} />
                        <div>
                          <p className="text-sm font-medium text-text">No Customer Added</p>
                          <p className="text-xs text-text-muted">Click "Skip & Finish" to complete setup</p>
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* Success banner */}
                        <div className="flex items-center gap-2 p-2 rounded-lg bg-success/10 border border-success/20">
                          <Check className="text-success" size={14} />
                          <span className="text-sm text-text">Work order for <strong>{formData.customerName}</strong></span>
                        </div>

                        {/* Service Type + Date/Time row */}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-sm font-medium text-text">Service Type</Label>
                            <Select value={formData.serviceType} onValueChange={(value) => updateFormData('serviceType', value)}>
                              <SelectTrigger className="mt-1.5 h-10"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {SERVICE_TYPES.map((type) => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <DateTimePicker
                            date={formData.scheduledDate}
                            time={formData.scheduledTime}
                            onDateChange={(date) => updateFormData('scheduledDate', date)}
                            onTimeChange={(time) => updateFormData('scheduledTime', time)}
                            label="Appointment"
                          />
                        </div>

                        {/* Tire Selection - only for Tire Installation */}
                        {formData.serviceType === 'Tire Installation' && (
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <Label className="text-sm font-medium text-text">Tires</Label>
                              <div className="flex items-center gap-1">
                                <button type="button" onClick={() => canUseImport ? setInventoryImportOpen(true) : setShowUpgradePrompt(true)}
                                  className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${canUseImport ? 'bg-info/10 text-info' : 'bg-bg-light text-text-muted'}`}>
                                  {canUseImport ? <Upload size={10} /> : <Lock size={10} />}
                                  {canUseImport ? 'Import' : 'Pro'}
                                </button>
                                <button type="button" onClick={async () => {
                                  if (!shop?.id) return;
                                  setLoadingInventory(true);
                                  const { data } = await supabase.from('inventory').select('id, brand, model, size, price, quantity').eq('shop_id', shop.id).order('brand');
                                  setTires(data || []);
                                  setLoadingInventory(false);
                                }} disabled={loadingInventory} className="flex items-center gap-1 px-2 py-1 rounded bg-bg-light text-text-muted text-xs font-medium hover:text-text disabled:opacity-50">
                                  <RefreshCw size={10} className={loadingInventory ? 'animate-spin' : ''} />
                                </button>
                              </div>
                            </div>
                            {loadingInventory ? (
                              <div className="flex items-center justify-center py-4 text-text-muted text-sm">
                                <Loader2 className="animate-spin mr-2" size={14} />Loading...
                              </div>
                            ) : tires.length === 0 ? (
                              <div className="p-3 rounded-lg bg-bg-light border border-border-muted text-center">
                                <p className="text-xs text-text-muted">No inventory. Import tires or continue without.</p>
                              </div>
                            ) : (
                              <TireSelector
                                tires={tires}
                                selectedTires={selectedTires}
                                onTiresChange={setSelectedTires}
                                onTirePriceUpdate={(tireId, newPrice) => {
                                  setTires(prev => prev.map(t => t.id === tireId ? { ...t, price: newPrice } : t));
                                }}
                                onStockError={(msg) => toast({ variant: 'destructive', title: 'Stock Error', description: msg })}
                              />
                            )}
                          </div>
                        )}

                        {/* Notes */}
                        <div>
                          <Label htmlFor="notes" className="text-sm font-medium text-text">Notes</Label>
                          <textarea id="notes" value={formData.notes} onChange={(e) => updateFormData('notes', e.target.value)} placeholder="Optional notes..." rows={2}
                            className="w-full mt-1.5 px-3 py-2 text-sm rounded-lg border border-border-muted bg-bg text-text placeholder:text-text-muted resize-none" />
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-4">
            <button
              onClick={handleBack}
              disabled={currentStep === 0 || isSubmitting}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                currentStep === 0 || isSubmitting ? 'text-text-muted cursor-not-allowed' : 'text-text hover:bg-bg-light'
              }`}
            >
              <ChevronLeft size={16} />Back
            </button>
            <div className="flex items-center gap-2">
              {steps[currentStep].optional && (
                <button onClick={handleSkip} disabled={isSubmitting} className="px-3 py-2 rounded-lg text-sm font-medium text-text-muted hover:bg-bg-light hover:text-text transition-all disabled:opacity-50">
                  {isLastStep ? 'Skip & Finish' : 'Skip'}
                </button>
              )}
              <Button onClick={handleNext} disabled={!canProceed || isSubmitting} className="h-10 px-5">
                {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin mr-1.5" />Saving...</> : isLastStep ? <>Finish<ArrowRight size={16} className="ml-1.5" /></> : <>Continue<ChevronRight size={16} className="ml-1.5" /></>}
              </Button>
            </div>
          </div>
        </div>
      </main>

      {/* Customer Import Dialog */}
      <Dialog open={customerImportOpen} onOpenChange={setCustomerImportOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="text-primary" size={20} />
              Import Customers
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs">
                <Sparkles size={12} />
                AI-Powered
              </span>
            </DialogTitle>
            <DialogDescription>
              {customerImportData.length > 0
                ? 'Review and edit the extracted data below. Fix any errors before importing.'
                : 'Upload any file with customer data — photos, spreadsheets, PDFs, or handwritten lists.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
            {/* Drop zone - smaller when data exists */}
            {customerImportData.length === 0 && (
              <label
                className={`relative flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
                  customerAnalyzing
                    ? 'border-primary bg-primary/5 cursor-wait'
                    : customerImportFile
                    ? 'border-success bg-success/5'
                    : 'border-border-muted bg-bg-light hover:bg-bg hover:border-primary/50'
                }`}
              >
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls,.pdf,.txt,.jpg,.jpeg,.png,.heic,.webp,image/*,text/plain"
                  onChange={handleCustomerFileSelect}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  disabled={customerAnalyzing}
                />
                {customerAnalyzing ? (
                  <div className="flex flex-col items-center">
                    <div className="relative">
                      <Loader2 className="text-primary mb-2 animate-spin" size={32} />
                      <Sparkles className="absolute -top-1 -right-1 text-primary animate-pulse" size={14} />
                    </div>
                    <span className="text-sm font-medium text-text">AI is analyzing your file...</span>
                    <span className="text-xs text-text-muted mt-1">This may take a moment for images</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <Upload className="text-text-muted mb-2" size={32} />
                    <span className="text-sm font-medium text-text">Drop any file here</span>
                    <span className="text-xs text-text-muted mt-1">or click to browse</span>
                  </div>
                )}
              </label>
            )}

            {/* Error message */}
            {customerImportError && (
              <div className="p-3 rounded-lg bg-danger/10 border border-danger/20">
                <p className="text-sm text-danger">{customerImportError}</p>
              </div>
            )}

            {/* Editable data table */}
            {customerImportData.length > 0 && (
              <div className="flex-1 flex flex-col min-h-0">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {customerImportMethod === 'ai' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs">
                        <Sparkles size={12} />
                        AI Extracted
                      </span>
                    )}
                    <span className="text-xs text-text-muted">
                      {customerImportData.length} customers found • Click to edit
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={addCustomerImportRow}
                      className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-bg-light hover:bg-highlight text-text-muted hover:text-text transition-colors"
                    >
                      <Plus size={12} />
                      Add Row
                    </button>
                    <label className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                      customerAnalyzing
                        ? 'bg-primary/10 text-primary cursor-wait'
                        : 'bg-bg-light hover:bg-highlight text-text-muted hover:text-text cursor-pointer'
                    }`}>
                      {customerAnalyzing ? (
                        <>
                          <Loader2 size={12} className="animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <RefreshCw size={12} />
                          Re-upload
                        </>
                      )}
                      <input
                        type="file"
                        accept=".csv,.xlsx,.xls,.pdf,.txt,.jpg,.jpeg,.png,.heic,.webp,image/*,text/plain"
                        onChange={handleCustomerFileSelect}
                        className="hidden"
                        disabled={customerAnalyzing}
                      />
                    </label>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto rounded-lg border border-border-muted relative">
                  {/* Loading overlay during re-upload */}
                  {customerAnalyzing && (
                    <div className="absolute inset-0 bg-bg/70 backdrop-blur-[1px] z-20 flex items-center justify-center">
                      <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-bg border border-border-muted shadow-lg">
                        <Loader2 size={16} className="animate-spin text-primary" />
                        <span className="text-sm text-text">Merging data...</span>
                      </div>
                    </div>
                  )}
                  <table className="w-full text-sm">
                    <thead className="bg-bg-light sticky top-0 z-10">
                      <tr>
                        <th className="px-3 py-2 text-left text-text-muted font-medium">Name * / Vehicle</th>
                        <th className="px-3 py-2 text-left text-text-muted font-medium w-1/4">Phone</th>
                        <th className="px-3 py-2 text-left text-text-muted font-medium w-1/4">Email</th>
                        <th className="px-3 py-2 text-center text-text-muted font-medium w-12"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {customerImportData.map((row, i) => (
                        <tr key={i} className="border-t border-border-muted hover:bg-bg-light/50 group">
                          <td className="px-1 py-1">
                            <input
                              type="text"
                              value={row.name}
                              onChange={(e) => updateCustomerImportRow(i, 'name', e.target.value)}
                              placeholder="Customer name"
                              className="w-full px-2 py-1.5 bg-transparent border border-transparent hover:border-border-muted focus:border-primary focus:bg-bg rounded text-text text-sm outline-none transition-colors"
                            />
                            {row.vehicle && (row.vehicle.make || row.vehicle.model || row.vehicle.tire_size) && (
                              <div className="flex items-center gap-1.5 px-2 py-0.5 mt-0.5">
                                <Wrench size={10} className="text-primary flex-shrink-0" />
                                <span className="text-[10px] text-text-muted truncate">
                                  {[
                                    row.vehicle.year,
                                    row.vehicle.make,
                                    row.vehicle.model,
                                    row.vehicle.tire_size && `• ${row.vehicle.tire_size}`
                                  ].filter(Boolean).join(' ')}
                                </span>
                              </div>
                            )}
                          </td>
                          <td className="px-1 py-1">
                            <input
                              type="tel"
                              value={row.phone}
                              onChange={(e) => updateCustomerImportRow(i, 'phone', e.target.value)}
                              placeholder="Phone number"
                              className="w-full px-2 py-1.5 bg-transparent border border-transparent hover:border-border-muted focus:border-primary focus:bg-bg rounded text-text text-sm outline-none transition-colors"
                            />
                          </td>
                          <td className="px-1 py-1">
                            <input
                              type="email"
                              value={row.email}
                              onChange={(e) => updateCustomerImportRow(i, 'email', e.target.value)}
                              placeholder="Email (optional)"
                              className="w-full px-2 py-1.5 bg-transparent border border-transparent hover:border-border-muted focus:border-primary focus:bg-bg rounded text-text text-sm outline-none transition-colors"
                            />
                          </td>
                          <td className="px-1 py-1 text-center">
                            <button
                              onClick={() => deleteCustomerImportRow(i)}
                              className="p-1.5 rounded text-text-muted hover:text-danger hover:bg-danger/10 opacity-0 group-hover:opacity-100 transition-all"
                              title="Remove row"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <p className="text-xs text-text-muted mt-2">
                  <Pencil size={10} className="inline mr-1" />
                  Click any cell to edit. Names are required. Empty rows will be skipped.
                </p>
              </div>
            )}

            {/* Format hint - only show when no data */}
            {customerImportData.length === 0 && !customerAnalyzing && (
              <div className="p-3 rounded-lg bg-bg-light border border-border-muted">
                <p className="text-xs font-medium text-text mb-2">Supported formats:</p>
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-bg text-xs text-text-muted">
                    <Image size={12} /> Photos
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-bg text-xs text-text-muted">
                    <FileSpreadsheet size={12} /> Excel
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-bg text-xs text-text-muted">
                    <FileText size={12} /> PDF
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-bg text-xs text-text-muted">
                    <FileSpreadsheet size={12} /> CSV
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-bg text-xs text-text-muted">
                    <FileText size={12} /> TXT
                  </span>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-muted">
              <Button
                variant="outline"
                onClick={() => {
                  setCustomerImportOpen(false);
                  setCustomerImportFile(null);
                  setCustomerImportData([]);
                  setCustomerImportError(null);
                  setCustomerImportMethod(null);
                  setCustomerEditingIndex(null);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCustomerImport}
                disabled={customerImporting || customerAnalyzing || customerImportData.length === 0}
              >
                {customerImporting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Confirm & Import ({customerImportData.filter(c => c.name.trim()).length})
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Inventory Import Dialog */}
      <Dialog open={inventoryImportOpen} onOpenChange={setInventoryImportOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="text-primary" size={20} />
              Import Inventory
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs">
                <Sparkles size={12} />
                AI-Powered
              </span>
            </DialogTitle>
            <DialogDescription>
              {inventoryImportData.length > 0
                ? 'Review and edit the extracted data below. Fix any errors before importing.'
                : 'Upload any file with your tire inventory — photos, spreadsheets, or handwritten lists.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
            {/* Drop zone - only show when no data */}
            {inventoryImportData.length === 0 && (
              <label
                className={`relative flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
                  inventoryAnalyzing
                    ? 'border-primary bg-primary/5 cursor-wait'
                    : 'border-border-muted bg-bg-light hover:bg-bg hover:border-primary/50'
                }`}
              >
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls,.pdf,.txt,.jpg,.jpeg,.png,.heic,.webp,image/*,text/plain"
                  onChange={handleInventoryFileSelect}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  disabled={inventoryAnalyzing}
                />
                {inventoryAnalyzing ? (
                  <div className="flex flex-col items-center">
                    <div className="relative">
                      <Loader2 className="text-primary mb-2 animate-spin" size={32} />
                      <Sparkles className="absolute -top-1 -right-1 text-primary animate-pulse" size={14} />
                    </div>
                    <span className="text-sm font-medium text-text">AI is analyzing your file...</span>
                    <span className="text-xs text-text-muted mt-1">Detecting tires, brands, and prices</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <Upload className="text-text-muted mb-2" size={32} />
                    <span className="text-sm font-medium text-text">Drop any file here</span>
                    <span className="text-xs text-text-muted mt-1">or click to browse</span>
                  </div>
                )}
              </label>
            )}

            {/* Error message */}
            {inventoryImportError && (
              <div className="p-3 rounded-lg bg-danger/10 border border-danger/20">
                <p className="text-sm text-danger">{inventoryImportError}</p>
              </div>
            )}

            {/* Editable data table */}
            {inventoryImportData.length > 0 && (
              <div className="flex-1 flex flex-col min-h-0">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {inventoryImportMethod === 'ai' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs">
                        <Sparkles size={12} />
                        AI Extracted
                      </span>
                    )}
                    <span className="text-xs text-text-muted">
                      {inventoryImportData.length} items found • Click to edit
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={addInventoryImportRow}
                      className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-bg-light hover:bg-highlight text-text-muted hover:text-text transition-colors"
                    >
                      <Plus size={12} />
                      Add Row
                    </button>
                    <label className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-bg-light hover:bg-highlight text-text-muted hover:text-text transition-colors cursor-pointer">
                      <RefreshCw size={12} />
                      Re-upload
                      <input
                        type="file"
                        accept=".csv,.xlsx,.xls,.pdf,.txt,.jpg,.jpeg,.png,.heic,.webp,image/*,text/plain"
                        onChange={handleInventoryFileSelect}
                        className="hidden"
                        disabled={inventoryAnalyzing}
                      />
                    </label>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto rounded-lg border border-border-muted">
                  <table className="w-full text-sm">
                    <thead className="bg-bg-light sticky top-0 z-10">
                      <tr>
                        <th className="px-3 py-2 text-left text-text-muted font-medium">Brand *</th>
                        <th className="px-3 py-2 text-left text-text-muted font-medium">Model</th>
                        <th className="px-3 py-2 text-left text-text-muted font-medium">Size *</th>
                        <th className="px-3 py-2 text-right text-text-muted font-medium w-20">Qty</th>
                        <th className="px-3 py-2 text-right text-text-muted font-medium w-24">Price</th>
                        <th className="px-3 py-2 text-center text-text-muted font-medium w-12"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {inventoryImportData.map((row, i) => (
                        <tr key={i} className="border-t border-border-muted hover:bg-bg-light/50 group">
                          <td className="px-1 py-1">
                            <input
                              type="text"
                              value={row.brand}
                              onChange={(e) => updateInventoryImportRow(i, 'brand', e.target.value)}
                              placeholder="Brand"
                              className="w-full px-2 py-1.5 bg-transparent border border-transparent hover:border-border-muted focus:border-primary focus:bg-bg rounded text-text text-sm outline-none transition-colors"
                            />
                          </td>
                          <td className="px-1 py-1">
                            <input
                              type="text"
                              value={row.model}
                              onChange={(e) => updateInventoryImportRow(i, 'model', e.target.value)}
                              placeholder="Model"
                              className="w-full px-2 py-1.5 bg-transparent border border-transparent hover:border-border-muted focus:border-primary focus:bg-bg rounded text-text text-sm outline-none transition-colors"
                            />
                          </td>
                          <td className="px-1 py-1">
                            <input
                              type="text"
                              value={row.size}
                              onChange={(e) => updateInventoryImportRow(i, 'size', e.target.value)}
                              placeholder="e.g. 225/45R17"
                              className="w-full px-2 py-1.5 bg-transparent border border-transparent hover:border-border-muted focus:border-primary focus:bg-bg rounded text-text text-sm outline-none transition-colors"
                            />
                          </td>
                          <td className="px-1 py-1">
                            <input
                              type="number"
                              min="0"
                              value={row.quantity}
                              onChange={(e) => updateInventoryImportRow(i, 'quantity', parseInt(e.target.value) || 0)}
                              placeholder="0"
                              className="w-full px-2 py-1.5 bg-transparent border border-transparent hover:border-border-muted focus:border-primary focus:bg-bg rounded text-text text-sm outline-none transition-colors text-right"
                            />
                          </td>
                          <td className="px-1 py-1">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={row.price}
                              onChange={(e) => updateInventoryImportRow(i, 'price', parseFloat(e.target.value) || 0)}
                              placeholder="0.00"
                              className="w-full px-2 py-1.5 bg-transparent border border-transparent hover:border-border-muted focus:border-primary focus:bg-bg rounded text-text text-sm outline-none transition-colors text-right"
                            />
                          </td>
                          <td className="px-1 py-1 text-center">
                            <button
                              onClick={() => deleteInventoryImportRow(i)}
                              className="p-1.5 rounded text-text-muted hover:text-danger hover:bg-danger/10 opacity-0 group-hover:opacity-100 transition-all"
                              title="Remove row"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <p className="text-xs text-text-muted mt-2">
                  <Pencil size={10} className="inline mr-1" />
                  Click any cell to edit. Brand and Size are required. Empty rows will be skipped.
                </p>
              </div>
            )}

            {/* Format hint - only show when no data */}
            {inventoryImportData.length === 0 && !inventoryAnalyzing && (
              <div className="p-3 rounded-lg bg-bg-light border border-border-muted">
                <p className="text-xs font-medium text-text mb-2">Supported formats:</p>
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-bg text-xs text-text-muted">
                    <Image size={12} /> Photos
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-bg text-xs text-text-muted">
                    <FileSpreadsheet size={12} /> Excel
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-bg text-xs text-text-muted">
                    <FileText size={12} /> PDF
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-bg text-xs text-text-muted">
                    <FileSpreadsheet size={12} /> CSV
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-bg text-xs text-text-muted">
                    <FileText size={12} /> TXT
                  </span>
                </div>
              </div>
            )}

            {/* Duplicate Choice */}
            {showDuplicateChoice && (
              <div className="p-4 rounded-lg bg-warning/10 border border-warning/30">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-warning/20">
                    <RefreshCw className="text-warning" size={18} />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-text mb-1">Duplicate sizes detected</h4>
                    <p className="text-sm text-text-muted mb-3">
                      {duplicateSizes.length} size{duplicateSizes.length > 1 ? 's' : ''} already exist in your inventory.
                      How would you like to handle them?
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleInventoryImport('merge')}
                        disabled={inventoryImporting}
                        className="bg-success hover:bg-success/90"
                      >
                        {inventoryImporting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Check size={14} className="mr-1" />}
                        Update Existing
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleInventoryImport('add')}
                        disabled={inventoryImporting}
                      >
                        <Plus size={14} className="mr-1" />
                        Add as New
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setShowDuplicateChoice(false)}
                        disabled={inventoryImporting}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            {!showDuplicateChoice && (
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-muted">
                <Button
                  variant="outline"
                  onClick={() => {
                    setInventoryImportOpen(false);
                    setInventoryImportFile(null);
                    setInventoryImportData([]);
                    setInventoryImportError(null);
                    setInventoryImportMethod(null);
                    setInventoryEditingIndex(null);
                    setShowDuplicateChoice(false);
                    setDuplicateSizes([]);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => handleInventoryImport('check')}
                  disabled={inventoryImporting || inventoryAnalyzing || inventoryImportData.length === 0}
                >
                  {inventoryImporting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Confirm & Import ({inventoryImportData.filter(i => i.brand.trim() && i.size.trim()).length})
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Upgrade Prompt for locked features */}
      <UpgradePrompt
        open={showUpgradePrompt}
        onOpenChange={setShowUpgradePrompt}
        feature="ai_import"
      />

      {/* Import Tip Tooltip - rendered outside overflow containers */}
      <AnimatePresence>
        {showImportTip && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 w-80 p-4 rounded-xl bg-bg border border-border-muted shadow-2xl pointer-events-none"
            style={{ zIndex: 99999 }}
          >
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                <Sparkles size={14} className="text-primary" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-text mb-1">Pro tip for best results</h4>
                <p className="text-xs text-text-muted leading-relaxed">
                  Import your most recent documents first. When the same customer appears across multiple uploads, our AI cross-references the data to improve accuracy and automatically fill in missing details.
                </p>
              </div>
            </div>
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 bg-bg border-l border-t border-border-muted"></div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

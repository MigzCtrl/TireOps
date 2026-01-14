'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2, User, Users, ClipboardList, Check, ChevronRight, ChevronLeft,
  ArrowRight, Loader2, Phone, Mail, MapPin, Wrench
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import DateTimePicker from '@/components/DateTimePicker';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { createCustomerAction } from '@/app/actions/customers';

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

  const steps = [
    {
      id: 'shop-profile',
      title: 'Shop Profile',
      description: 'Set up your tire shop details so customers know who you are.',
      icon: <Building2 size={24} />,
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
      case 1: // Customer (optional but if filling, need name + phone)
        if (!formData.customerName.trim()) return true; // Skip is valid
        return formData.customerName.trim().length > 0 && formData.customerPhone.trim().length > 0;
      case 2: // Work Order (optional)
        return true;
      default:
        return true;
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

  const handleCreateCustomer = async () => {
    if (!formData.customerName.trim()) return true; // Skip if empty

    try {
      const result = await createCustomerAction({
        name: formData.customerName.trim(),
        phone: formData.customerPhone.trim(),
        email: formData.customerEmail.trim() || '',
        address: '',
        tire_size: '',
        notes: '',
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to create customer');
      }

      if (result.data?.id) {
        setCreatedCustomerId(result.data.id);
      }
      return true;
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to create customer',
      });
      return false;
    }
  };

  const handleCreateWorkOrder = async () => {
    // Only create if we have a customer
    if (!createdCustomerId) return true;

    try {
      const { error } = await supabase.from('work_orders').insert({
        shop_id: shop!.id,
        customer_id: createdCustomerId,
        service_type: formData.serviceType,
        scheduled_date: formData.scheduledDate,
        scheduled_time: formData.scheduledTime || null,
        notes: formData.notes.trim() || null,
        status: 'pending',
      });

      if (error) throw error;
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
        case 0:
          const shopSaved = await handleSaveShopProfile();
          if (!shopSaved) {
            setIsSubmitting(false);
            return;
          }
          break;
        case 1:
          const customerCreated = await handleCreateCustomer();
          if (!customerCreated) {
            setIsSubmitting(false);
            return;
          }
          break;
        case 2:
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
    <div className="min-h-screen bg-bg-dark flex flex-col">
      {/* Header with progress */}
      <header className="bg-bg border-b border-border-muted px-4 lg:px-8 py-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-bg-light rounded-lg flex items-center justify-center">
              <span className="text-text-muted font-bold">BBT</span>
            </div>
            <span className="font-bold text-xl text-text">TireOps Setup</span>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center flex-shrink-0">
                <button
                  onClick={() => index < currentStep && setCurrentStep(index)}
                  disabled={index > currentStep}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                    index === currentStep
                      ? 'bg-primary/20 text-primary border border-primary/30'
                      : index < currentStep
                      ? 'bg-success/20 text-success cursor-pointer hover:bg-success/30'
                      : 'bg-bg-light text-text-muted'
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium ${
                      index < currentStep
                        ? 'bg-success text-white'
                        : index === currentStep
                        ? 'bg-primary text-white'
                        : 'bg-border-muted text-text-muted'
                    }`}
                  >
                    {index < currentStep ? <Check size={14} /> : index + 1}
                  </div>
                  <span className="hidden sm:inline text-sm font-medium whitespace-nowrap">
                    {step.title}
                  </span>
                </button>
                {index < steps.length - 1 && (
                  <ChevronRight size={20} className="text-text-muted mx-1 hidden sm:block flex-shrink-0" />
                )}
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* Step Content */}
      <main className="flex-1 p-4 lg:p-8">
        <div className="max-w-2xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {/* Step Header */}
              <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-3 rounded-xl bg-primary/10 text-primary">
                    {steps[currentStep].icon}
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-text">
                      {steps[currentStep].title}
                    </h1>
                    {steps[currentStep].optional && (
                      <span className="text-xs px-2 py-0.5 rounded bg-bg-light text-text-muted ml-2">
                        Optional
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-text-muted">{steps[currentStep].description}</p>
              </div>

              {/* Step Form */}
              <div className="bg-bg rounded-xl border border-border-muted p-6 mb-6">
                {/* Step 0: Shop Profile */}
                {currentStep === 0 && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <Label htmlFor="shopName" className="text-text">
                          Shop Name <span className="text-danger">*</span>
                        </Label>
                        <Input
                          id="shopName"
                          value={formData.shopName}
                          onChange={(e) => updateFormData('shopName', e.target.value)}
                          placeholder="Big Boy Tires"
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label htmlFor="ownerName" className="text-text">
                          Your Name
                        </Label>
                        <div className="relative mt-1">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
                          <Input
                            id="ownerName"
                            value={formData.ownerName}
                            onChange={(e) => updateFormData('ownerName', e.target.value)}
                            placeholder="John Smith"
                            className="pl-10"
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="shopPhone" className="text-text">
                          Phone Number
                        </Label>
                        <div className="relative mt-1">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
                          <Input
                            id="shopPhone"
                            type="tel"
                            value={formData.shopPhone}
                            onChange={(e) => updateFormData('shopPhone', e.target.value)}
                            placeholder="(555) 123-4567"
                            className="pl-10"
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="shopEmail" className="text-text">
                          Email Address
                        </Label>
                        <div className="relative mt-1">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
                          <Input
                            id="shopEmail"
                            type="email"
                            value={formData.shopEmail}
                            onChange={(e) => updateFormData('shopEmail', e.target.value)}
                            placeholder="shop@example.com"
                            className="pl-10"
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="shopAddress" className="text-text">
                          Address
                        </Label>
                        <div className="relative mt-1">
                          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
                          <Input
                            id="shopAddress"
                            value={formData.shopAddress}
                            onChange={(e) => updateFormData('shopAddress', e.target.value)}
                            placeholder="123 Main St, City, State"
                            className="pl-10"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 1: First Customer */}
                {currentStep === 1 && (
                  <div className="space-y-6">
                    <div className="p-4 bg-info/10 rounded-lg border border-info/20 mb-4">
                      <p className="text-sm text-info">
                        Add your first customer to test out the system. You can skip this and add customers later.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <Label htmlFor="customerName" className="text-text">
                          Customer Name
                        </Label>
                        <div className="relative mt-1">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
                          <Input
                            id="customerName"
                            value={formData.customerName}
                            onChange={(e) => updateFormData('customerName', e.target.value)}
                            placeholder="Jane Doe"
                            className="pl-10"
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="customerPhone" className="text-text">
                          Phone Number
                        </Label>
                        <div className="relative mt-1">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
                          <Input
                            id="customerPhone"
                            type="tel"
                            value={formData.customerPhone}
                            onChange={(e) => updateFormData('customerPhone', e.target.value)}
                            placeholder="(555) 987-6543"
                            className="pl-10"
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="customerEmail" className="text-text">
                          Email (Optional)
                        </Label>
                        <div className="relative mt-1">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
                          <Input
                            id="customerEmail"
                            type="email"
                            value={formData.customerEmail}
                            onChange={(e) => updateFormData('customerEmail', e.target.value)}
                            placeholder="jane@example.com"
                            className="pl-10"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 2: First Work Order */}
                {currentStep === 2 && (
                  <div className="space-y-6">
                    {!createdCustomerId ? (
                      <div className="p-4 bg-warning/10 rounded-lg border border-warning/20">
                        <p className="text-sm text-warning">
                          No customer was added in the previous step. You can skip this step and create work orders later from the dashboard.
                        </p>
                      </div>
                    ) : (
                      <>
                        <div className="p-4 bg-success/10 rounded-lg border border-success/20 mb-4">
                          <p className="text-sm text-success">
                            Great! Now schedule an appointment for {formData.customerName || 'your customer'}.
                          </p>
                        </div>

                        <div className="space-y-4">
                          <div>
                            <Label className="text-text">Service Type</Label>
                            <Select
                              value={formData.serviceType}
                              onValueChange={(value) => updateFormData('serviceType', value)}
                            >
                              <SelectTrigger className="mt-1">
                                <SelectValue placeholder="Select service type" />
                              </SelectTrigger>
                              <SelectContent>
                                {SERVICE_TYPES.map((type) => (
                                  <SelectItem key={type} value={type}>
                                    {type}
                                  </SelectItem>
                                ))}
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

                          <div>
                            <Label htmlFor="notes" className="text-text">
                              Notes (Optional)
                            </Label>
                            <textarea
                              id="notes"
                              value={formData.notes}
                              onChange={(e) => updateFormData('notes', e.target.value)}
                              placeholder="Any special instructions or notes..."
                              rows={3}
                              className="w-full mt-1 px-4 py-2 rounded-lg border border-border-muted bg-bg-light text-text focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                            />
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <button
              onClick={handleBack}
              disabled={currentStep === 0 || isSubmitting}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                currentStep === 0 || isSubmitting
                  ? 'text-text-muted cursor-not-allowed'
                  : 'text-text hover:bg-bg-light'
              }`}
            >
              <ChevronLeft size={20} />
              Back
            </button>

            <div className="flex items-center gap-3">
              {steps[currentStep].optional && (
                <button
                  onClick={handleSkip}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-lg font-medium text-text-muted hover:bg-bg-light transition-all disabled:opacity-50"
                >
                  {isLastStep ? 'Skip & Finish' : 'Skip'}
                </button>
              )}
              <Button
                onClick={handleNext}
                disabled={!canProceed || isSubmitting}
                className="flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : isLastStep ? (
                  <>
                    Complete Setup
                    <ArrowRight size={20} />
                  </>
                ) : (
                  <>
                    Continue
                    <ChevronRight size={20} />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

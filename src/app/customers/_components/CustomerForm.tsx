'use client';

import { useState } from 'react';
import { Car, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  COMMON_MAKES,
  getYearOptions,
  getModelsForMakeYear,
  getTireSizeRecommendation,
  filterMakes,
  filterModels
} from '@/lib/vehicle-lookup';

interface CustomerFormData {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address: string;
}

interface VehicleFormData {
  year: string;
  make: string;
  model: string;
  trim: string;
  tire_size: string;
}

interface CustomerFormProps {
  formData: CustomerFormData;
  onFormDataChange: (data: CustomerFormData) => void;
  vehicleData: VehicleFormData;
  onVehicleDataChange: (data: VehicleFormData) => void;
  showVehicleSection: boolean;
  onToggleVehicleSection: () => void;
  isEditing: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}

export function CustomerForm({
  formData,
  onFormDataChange,
  vehicleData,
  onVehicleDataChange,
  showVehicleSection,
  onToggleVehicleSection,
  isEditing,
  onSubmit,
  onCancel,
}: CustomerFormProps) {
  const [makeSuggestions, setMakeSuggestions] = useState<string[]>([]);
  const [modelSuggestions, setModelSuggestions] = useState<string[]>([]);
  const [showMakeSuggestions, setShowMakeSuggestions] = useState(false);
  const [showModelSuggestions, setShowModelSuggestions] = useState(false);
  const [tireSizeRecommendation, setTireSizeRecommendation] = useState<{ primary: string; alternatives: string[] } | null>(null);
  const [loadingModels, setLoadingModels] = useState(false);
  const yearOptions = getYearOptions();

  function handleMakeChange(value: string) {
    onVehicleDataChange({ ...vehicleData, make: value, model: '' });
    setMakeSuggestions(filterMakes(COMMON_MAKES, value));
    setShowMakeSuggestions(value.length > 0);
    setModelSuggestions([]);
    setTireSizeRecommendation(null);
  }

  function handleMakeSelect(make: string) {
    onVehicleDataChange({ ...vehicleData, make, model: '' });
    setShowMakeSuggestions(false);
    setModelSuggestions([]);
    // Load models for this make
    if (vehicleData.year) {
      loadModelsForMake(make, parseInt(vehicleData.year));
    }
  }

  async function loadModelsForMake(make: string, year?: number) {
    if (!make) return;
    setLoadingModels(true);
    try {
      const models = year
        ? await getModelsForMakeYear(make, year)
        : [];
      setModelSuggestions(models);
    } catch (error) {
      console.error('Error loading models:', error);
      setModelSuggestions([]);
    } finally {
      setLoadingModels(false);
    }
  }

  function handleModelChange(value: string) {
    onVehicleDataChange({ ...vehicleData, model: value });
    setShowModelSuggestions(value.length > 0 && modelSuggestions.length > 0);

    // Update tire size recommendation
    if (vehicleData.make && value) {
      const recommendation = getTireSizeRecommendation(vehicleData.make, value);
      setTireSizeRecommendation(recommendation);
      // Auto-fill the primary recommendation
      onVehicleDataChange({ ...vehicleData, model: value, tire_size: recommendation.primary });
    }
  }

  function handleModelSelect(model: string) {
    onVehicleDataChange({ ...vehicleData, model });
    setShowModelSuggestions(false);

    // Get tire recommendation
    if (vehicleData.make) {
      const recommendation = getTireSizeRecommendation(vehicleData.make, model);
      setTireSizeRecommendation(recommendation);
      onVehicleDataChange({ ...vehicleData, model, tire_size: recommendation.primary });
    }
  }

  function handleYearChange(year: string) {
    onVehicleDataChange({ ...vehicleData, year, model: '' });
    setTireSizeRecommendation(null);

    // Load models for make+year combo
    if (vehicleData.make && year) {
      loadModelsForMake(vehicleData.make, parseInt(year));
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6 pt-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="first_name">First Name *</Label>
          <Input
            id="first_name"
            type="text"
            required
            value={formData.first_name}
            onChange={(e) => onFormDataChange({ ...formData, first_name: e.target.value })}
            placeholder="John"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="last_name">Last Name *</Label>
          <Input
            id="last_name"
            type="text"
            required
            value={formData.last_name}
            onChange={(e) => onFormDataChange({ ...formData, last_name: e.target.value })}
            placeholder="Doe"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Phone *</Label>
          <Input
            id="phone"
            type="tel"
            required
            value={formData.phone}
            onChange={(e) => onFormDataChange({ ...formData, phone: e.target.value })}
            placeholder="(555) 123-4567"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => onFormDataChange({ ...formData, email: e.target.value })}
            placeholder="john@example.com"
          />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="address">Address</Label>
          <Input
            id="address"
            type="text"
            value={formData.address}
            onChange={(e) => onFormDataChange({ ...formData, address: e.target.value })}
            placeholder="123 Main St"
          />
        </div>
      </div>

      {/* Vehicle Section - Only show when adding new customer */}
      {!isEditing && (
        <div className="border-t border-border-muted pt-4">
          <button
            type="button"
            onClick={onToggleVehicleSection}
            className="flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
          >
            <Car size={18} />
            {showVehicleSection ? 'Hide Vehicle Info' : 'Add Vehicle Info (Optional)'}
            {showVehicleSection && vehicleData.make && (
              <span className="text-xs bg-success/20 text-success px-2 py-0.5 rounded-full">
                {vehicleData.year} {vehicleData.make} {vehicleData.model} {vehicleData.trim}
              </span>
            )}
          </button>

          {showVehicleSection && (
            <div className="mt-4 p-4 bg-bg-light rounded-lg border border-border-muted space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Car size={18} className="text-orange-400" />
                <span className="font-medium text-text">Vehicle Information</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {/* Year Select */}
                <div className="space-y-2">
                  <Label htmlFor="vehicle_year">Year</Label>
                  <Select
                    value={vehicleData.year}
                    onValueChange={handleYearChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Year" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {yearOptions.map(year => (
                        <SelectItem key={year} value={year.toString()}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Make Input with Suggestions */}
                <div className="space-y-2 relative">
                  <Label htmlFor="vehicle_make">Make</Label>
                  <Input
                    id="vehicle_make"
                    type="text"
                    placeholder="Toyota, Ford..."
                    value={vehicleData.make}
                    onChange={(e) => handleMakeChange(e.target.value)}
                    onFocus={() => setShowMakeSuggestions(vehicleData.make.length > 0 || makeSuggestions.length > 0)}
                    onBlur={() => setTimeout(() => setShowMakeSuggestions(false), 200)}
                    autoComplete="off"
                  />
                  {showMakeSuggestions && makeSuggestions.length > 0 && (
                    <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-bg border border-border-muted rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {makeSuggestions.map(make => (
                        <button
                          key={make}
                          type="button"
                          className="w-full px-3 py-2 text-left text-sm hover:bg-bg-light text-text"
                          onMouseDown={() => handleMakeSelect(make)}
                        >
                          {make}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Model Input with Suggestions */}
                <div className="space-y-2 relative">
                  <Label htmlFor="vehicle_model">
                    Model
                    {loadingModels && <Loader2 size={14} className="inline ml-2 animate-spin" />}
                  </Label>
                  <Input
                    id="vehicle_model"
                    type="text"
                    placeholder="Camry, F-150..."
                    value={vehicleData.model}
                    onChange={(e) => handleModelChange(e.target.value)}
                    onFocus={() => setShowModelSuggestions(modelSuggestions.length > 0)}
                    onBlur={() => setTimeout(() => setShowModelSuggestions(false), 200)}
                    autoComplete="off"
                  />
                  {showModelSuggestions && modelSuggestions.length > 0 && (
                    <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-bg border border-border-muted rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {filterModels(modelSuggestions, vehicleData.model).map(model => (
                        <button
                          key={model}
                          type="button"
                          className="w-full px-3 py-2 text-left text-sm hover:bg-bg-light text-text"
                          onMouseDown={() => handleModelSelect(model)}
                        >
                          {model}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Trim Input */}
                <div className="space-y-2">
                  <Label htmlFor="vehicle_trim">Trim</Label>
                  <Input
                    id="vehicle_trim"
                    type="text"
                    placeholder="SE, XLE, Sport..."
                    value={vehicleData.trim}
                    onChange={(e) => onVehicleDataChange({ ...vehicleData, trim: e.target.value })}
                    autoComplete="off"
                  />
                </div>
              </div>

              {/* Tire Size Section */}
              <div className="mt-4 p-3 bg-bg rounded-lg border border-border-muted">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-text">Tire Size</span>
                  {vehicleData.tire_size && (
                    <span className="text-xs bg-success/20 text-success px-2 py-0.5 rounded-full">
                      {vehicleData.tire_size}
                    </span>
                  )}
                </div>

                {/* Custom Tire Size Input */}
                <div className="mb-3">
                  <Label htmlFor="custom_tire_size" className="text-xs text-text-muted">Enter tire size manually</Label>
                  <Input
                    id="custom_tire_size"
                    type="text"
                    placeholder="e.g. 225/45R17"
                    value={vehicleData.tire_size}
                    onChange={(e) => onVehicleDataChange({ ...vehicleData, tire_size: e.target.value })}
                    className="mt-1"
                  />
                </div>

                {/* Recommended Sizes (if available) */}
                {tireSizeRecommendation && (
                  <div className="pt-3 border-t border-border-muted">
                    <p className="text-xs text-text-muted mb-2">Or select a recommended size:</p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => onVehicleDataChange({ ...vehicleData, tire_size: tireSizeRecommendation.primary })}
                        className={`px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors ${
                          vehicleData.tire_size === tireSizeRecommendation.primary
                            ? 'bg-success text-white border-success'
                            : 'bg-bg-light border-success/50 text-success hover:bg-success/20'
                        }`}
                      >
                        {tireSizeRecommendation.primary}
                        <span className="ml-1 text-xs opacity-75">(Best)</span>
                      </button>
                      {tireSizeRecommendation.alternatives.map(size => (
                        <button
                          key={size}
                          type="button"
                          onClick={() => onVehicleDataChange({ ...vehicleData, tire_size: size })}
                          className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                            vehicleData.tire_size === size
                              ? 'bg-primary text-white border-primary'
                              : 'bg-bg-light border-border-muted text-text-muted hover:border-primary hover:text-primary'
                          }`}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex gap-3 justify-end pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-lg bg-bg-light text-text-muted hover:bg-danger hover:text-text-muted transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 rounded-lg bg-bg-light text-text-muted hover:bg-success hover:text-text-muted transition-colors"
        >
          {isEditing ? 'Update Customer' : 'Add Customer'}
        </button>
      </div>
    </form>
  );
}

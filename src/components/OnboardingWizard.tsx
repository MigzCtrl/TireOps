'use client';

import { useState, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ChevronRight, ChevronLeft, ArrowRight } from 'lucide-react';

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: ReactNode;
  component: ReactNode;
  optional?: boolean;
}

interface OnboardingWizardProps {
  steps: OnboardingStep[];
  currentStep: number;
  onStepChange: (step: number) => void;
  onComplete: () => void;
  canProceed: boolean;
  isSubmitting?: boolean;
}

export function OnboardingWizard({
  steps,
  currentStep,
  onStepChange,
  onComplete,
  canProceed,
  isSubmitting = false,
}: OnboardingWizardProps) {
  const isLastStep = currentStep === steps.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      onComplete();
    } else {
      onStepChange(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      onStepChange(currentStep - 1);
    }
  };

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
          <div className="flex items-center gap-2">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <button
                  onClick={() => index < currentStep && onStepChange(index)}
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
                    {index < currentStep ? (
                      <Check size={14} />
                    ) : (
                      index + 1
                    )}
                  </div>
                  <span className="hidden sm:inline text-sm font-medium">
                    {step.title}
                  </span>
                </button>
                {index < steps.length - 1 && (
                  <ChevronRight
                    size={20}
                    className="text-text-muted mx-1 hidden sm:block"
                  />
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
                      <span className="text-xs px-2 py-0.5 rounded bg-bg-light text-text-muted">
                        Optional
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-text-muted">
                  {steps[currentStep].description}
                </p>
              </div>

              {/* Step Form */}
              <div className="bg-bg rounded-xl border border-border-muted p-6 mb-6">
                {steps[currentStep].component}
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <button
              onClick={handleBack}
              disabled={currentStep === 0}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                currentStep === 0
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
                  onClick={handleNext}
                  className="px-4 py-2 rounded-lg font-medium text-text-muted hover:bg-bg-light transition-all"
                >
                  Skip
                </button>
              )}
              <button
                onClick={handleNext}
                disabled={!canProceed || isSubmitting}
                className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-all ${
                  canProceed && !isSubmitting
                    ? 'bg-primary text-white hover:bg-primary/90'
                    : 'bg-bg-light text-text-muted cursor-not-allowed'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

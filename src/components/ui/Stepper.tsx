import React from 'react';
import { Check, FileText, Upload, Cpu, Edit3, Download } from 'lucide-react';
import { clsx } from 'clsx';

interface StepperProps {
  currentStep: number;
  onStepClick?: (step: number) => void;
}

const STEPS = [
  { step: 1, title: 'Form Upload', subtitle: 'Upload Form PDF', icon: FileText },
  { step: 2, title: 'Supporting Docs', subtitle: 'Aadhaar, Passport, PAN', icon: Upload },
  { step: 3, title: 'AI Processing', subtitle: 'Kimi K2.6 OCR Engine', icon: Cpu },
  { step: 4, title: 'Review Data', subtitle: 'Verify & Edit Fields', icon: Edit3 },
  { step: 5, title: 'Download PDF', subtitle: 'Official Auto-Filled Form', icon: Download },
];

export const Stepper: React.FC<StepperProps> = ({ currentStep, onStepClick }) => {
  return (
    <div className="w-full py-4 mb-6">
      <div className="flex items-center justify-between max-w-4xl mx-auto px-4">
        {STEPS.map((s, index) => {
          const isCompleted = currentStep > s.step;
          const isCurrent = currentStep === s.step;
          const Icon = s.icon;

          return (
            <React.Fragment key={s.step}>
              <div
                onClick={() => isCompleted && onStepClick && onStepClick(s.step)}
                className={clsx(
                  'flex flex-col items-center relative group cursor-pointer transition-all',
                  isCompleted && 'text-blue-600',
                  isCurrent && 'text-blue-600 font-semibold',
                  !isCompleted && !isCurrent && 'text-slate-400 opacity-70'
                )}
              >
                <div
                  className={clsx(
                    'w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-sm border',
                    isCompleted && 'bg-blue-600 text-white border-blue-600 shadow-blue-500/20',
                    isCurrent && 'bg-white text-blue-600 border-blue-600 ring-4 ring-blue-100 shadow-glow',
                    !isCompleted && !isCurrent && 'bg-slate-100 text-slate-400 border-slate-200'
                  )}
                >
                  {isCompleted ? <Check className="w-5 h-5 stroke-[2.5]" /> : <Icon className="w-5 h-5" />}
                </div>

                <div className="mt-2 text-center hidden md:block">
                  <p className="text-xs font-semibold text-slate-800">{s.title}</p>
                  <p className="text-[10px] text-slate-500">{s.subtitle}</p>
                </div>
              </div>

              {index < STEPS.length - 1 && (
                <div className="flex-1 h-[2px] mx-2 mb-6 md:mb-0 transition-all duration-300">
                  <div
                    className={clsx(
                      'h-full transition-all duration-500 rounded-full',
                      currentStep > s.step ? 'bg-blue-600' : 'bg-slate-200'
                    )}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

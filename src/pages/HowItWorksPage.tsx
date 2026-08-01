import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { FileUp, Cpu, CheckSquare, Download, ArrowRight, ShieldCheck } from 'lucide-react';
import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../components/layout/Footer';
import { Button } from '../components/ui/Button';

export const HowItWorksPage: React.FC = () => {
  const steps = [
    {
      num: '01',
      title: 'Upload Official Government Form',
      description: 'Drag & drop any PDF or image format government form (ITR-V, Passport Renewal, Visa Application, Aadhaar Update).',
      icon: FileUp,
    },
    {
      num: '02',
      title: 'Attach Citizen Supporting Documents',
      description: 'Upload supporting proof of identity or residence (Aadhaar, Passport, PAN Card, Bank Statement).',
      icon: ShieldCheck,
    },
    {
      num: '03',
      title: 'Autonomous Kimi K2.6 AI Processing',
      description: 'Our multimodal OCR extracts input coordinate locations, parses text, and matches citizen details with 99%+ accuracy.',
      icon: Cpu,
    },
    {
      num: '04',
      title: 'Human Review & Verification Table',
      description: 'Inspect auto-filled fields with confidence score badges. Highlighted amber fields flag any low-confidence items for easy editing.',
      icon: CheckSquare,
    },
    {
      num: '05',
      title: 'Certified Official PDF Download',
      description: 'Download the finalized, auto-filled official PDF ready for digital submission or printing.',
      icon: Download,
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#faf8ff]">
      <Navbar />

      <main className="flex-1 py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <span className="text-xs font-extrabold uppercase tracking-widest text-blue-600 bg-blue-100 px-3 py-1 rounded-full border border-blue-200">
            System Architecture
          </span>
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">How Government Form AI Works</h1>
          <p className="text-base text-slate-600">
            From raw PDF documents to certified official submission in 5 autonomous steps.
          </p>
        </div>

        {/* Step List */}
        <div className="max-w-4xl mx-auto space-y-8">
          {steps.map((s, idx) => {
            const Icon = s.icon;
            return (
              <motion.div
                key={s.num}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center gap-6"
              >
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-gov-600 text-white flex items-center justify-center font-extrabold text-xl shrink-0 shadow-md shadow-blue-500/20">
                  <Icon className="w-8 h-8" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-extrabold text-blue-600 tracking-widest font-mono">STEP {s.num}</span>
                    <h3 className="text-xl font-bold text-slate-900">{s.title}</h3>
                  </div>
                  <p className="text-sm text-slate-600 mt-2 leading-relaxed">{s.description}</p>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Bottom Callout */}
        <div className="mt-16 text-center">
          <Link to="/dashboard/new">
            <Button size="lg" rightIcon={<ArrowRight className="w-5 h-5" />}>
              Try The 5-Step Wizard Now
            </Button>
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
};

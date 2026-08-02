import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  Zap,
  Lock,
  Cpu,
  ArrowRight,
  CheckCircle2,
  FileSpreadsheet,
  Sparkles,
  Award,
  Globe,
  Database,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { GlassCard } from '../components/ui/GlassCard';
import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../components/layout/Footer';

export const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-[#faf8ff]">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-24 lg:pt-20 lg:pb-32 bg-grid-pattern">
        {/* Ambient Glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/10 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute top-1/3 right-10 w-[400px] h-[400px] bg-teal-500/10 blur-[100px] rounded-full pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto space-y-6">
            {/* Pill Badge */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/90 border border-blue-200/80 shadow-sm text-xs font-semibold text-blue-700"
            >
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span>Next-Gen Autonomous Form Auto-Fill • Powered by Gemini AI & Supabase</span>
            </motion.div>

            {/* Title */}
            <motion.h1
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.1]"
            >
              Transform Government Forms into <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-teal-600">Zero-Touch AI Workflows</span>
            </motion.h1>

            {/* Description */}
            <motion.p
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-lg text-slate-600 leading-relaxed font-normal"
            >
              Upload complex government PDF forms and supporting ID documents (Aadhaar, Passport, PAN). Our vision model extracts fields, verifies accuracy, and outputs certified PDFs in seconds.
            </motion.p>

            {/* Action Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4"
            >
              <Link to="/auth/signup">
                <Button size="lg" variant="primary" rightIcon={<ArrowRight className="w-5 h-5" />}>
                  Start Processing Now
                </Button>
              </Link>
              <Link to="/how-it-works">
                <Button size="lg" variant="outline" leftIcon={<Zap className="w-5 h-5" />}>
                  Explore How It Works
                </Button>
              </Link>
            </motion.div>

            {/* Micro Specs */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="pt-6 flex flex-wrap items-center justify-center gap-6 text-xs font-semibold text-slate-500"
            >
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> 99.4% Extraction Precision</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> 256-Bit AES Vault Storage</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Cloudinary Storage Vault</span>
            </motion.div>
          </div>

          {/* Interactive Live Demo Preview Box */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="mt-16 max-w-5xl mx-auto rounded-3xl p-4 bg-gradient-to-b from-white/90 to-white/50 border border-slate-200/90 shadow-2xl backdrop-blur-xl"
          >
            <div className="rounded-2xl overflow-hidden bg-slate-900 text-slate-100 p-6 md:p-10 border border-slate-800 space-y-6">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-rose-500" />
                  <div className="w-3 h-3 rounded-full bg-amber-500" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span className="text-xs font-mono text-slate-400 ml-2">govform_ai_vision_pipeline.ts</span>
                </div>
                <span className="text-xs font-semibold px-3 py-1 bg-blue-900/60 text-blue-300 rounded-full border border-blue-700">
                  Gemini AI OCR Active
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                <div className="space-y-4">
                  <span className="text-xs font-bold uppercase tracking-widest text-teal-400">Step 1: Document Ingestion</span>
                  <h3 className="text-xl font-bold text-white">Government Form & Supporting ID Matched</h3>
                  <div className="space-y-2 text-xs text-slate-300 font-mono">
                    <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700 flex justify-between">
                      <span>ITR-V 2026 Verification Form</span>
                      <span className="text-emerald-400 font-bold">Uploaded</span>
                    </div>
                    <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700 flex justify-between">
                      <span>Aadhaar Card (Encrypted)</span>
                      <span className="text-emerald-400 font-bold">Matched</span>
                    </div>
                  </div>
                </div>

                <div className="p-6 rounded-2xl bg-blue-950/40 border border-blue-800/60 space-y-3">
                  <div className="flex justify-between text-xs font-bold text-blue-300">
                    <span>Field Auto-Fill Progress</span>
                    <span>99.2% Confidence</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-blue-500 to-teal-400 rounded-full w-[94%]" />
                  </div>
                  <div className="pt-2 text-xs text-slate-400 space-y-1">
                    <p className="flex justify-between font-mono">
                      <span>Applicant Name:</span> <strong className="text-white">RAHUL VERMA</strong>
                    </p>
                    <p className="flex justify-between font-mono">
                      <span>Aadhaar ID:</span> <strong className="text-white">4589 1029 3847</strong>
                    </p>
                    <p className="flex justify-between font-mono">
                      <span>Address Verification:</span> <strong className="text-teal-300">Auto-Validated</strong>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Feature Cards Section */}
      <section className="py-20 bg-white border-t border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-extrabold text-slate-900">Built for Enterprise Precision & Civic Compliance</h2>
            <p className="text-sm text-slate-600 mt-3">
              Eliminate hours of redundant manual form filling with our AI vision engine.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <GlassCard className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                <Cpu className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Gemini AI Multimodal Vision</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Understands complex tabular government schemas, low-resolution handwriting, and multi-page official PDF templates.
              </p>
            </GlassCard>

            <GlassCard className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-teal-100 text-teal-600 flex items-center justify-center font-bold">
                <Database className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Supabase & Cloudinary Vault</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Stores documents with row-level security policies, PostgreSQL relational triggers, and Cloudinary media optimization.
              </p>
            </GlassCard>

            <GlassCard className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Zero Retention & Security</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                End-to-end 256-bit AES encryption ensures your private government credentials are never trained on by third-party LLMs.
              </p>
            </GlassCard>
          </div>
        </div>
      </section>

      {/* CTA Footer Section */}
      <section className="py-20 bg-slate-900 text-white relative overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 text-center space-y-6 relative z-10">
          <h2 className="text-3xl sm:text-4xl font-extrabold">Ready to Automate Government Forms?</h2>
          <p className="text-sm text-slate-300 max-w-xl mx-auto">
            Join thousands of citizens and enterprise teams saving hours on official form applications today.
          </p>
          <div className="pt-4">
            <Link to="/auth/signup">
              <Button size="lg" variant="primary" rightIcon={<ArrowRight className="w-5 h-5" />}>
                Create Your Free Account
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

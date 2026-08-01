import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Lock, CheckCircle2, Globe, Cpu } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-900 text-slate-400 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-10">
          {/* Brand Col */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <span className="font-bold text-xl text-white tracking-tight">Government Form AI</span>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed max-w-sm">
              Sovereign AI-powered government document processing and autonomous form filling platform. Built with enterprise-grade encryption and Kimi K2.6 Vision model.
            </p>
            <div className="flex items-center gap-4 text-xs font-medium text-slate-400">
              <span className="flex items-center gap-1.5"><Lock className="w-4 h-4 text-emerald-400" /> 256-Bit AES</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-blue-400" /> ISO 27001</span>
              <span className="flex items-center gap-1.5"><Cpu className="w-4 h-4 text-teal-400" /> Kimi K2.6 Engine</span>
            </div>
          </div>

          {/* Links 1 */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-4">Product</h4>
            <ul className="space-y-2.5 text-sm">
              <li><Link to="/how-it-works" className="hover:text-white transition-colors">How It Works</Link></li>
              <li><Link to="/dashboard/new" className="hover:text-white transition-colors">Auto-Fill Stepper</Link></li>
              <li><Link to="/security" className="hover:text-white transition-colors">Security Vault</Link></li>
              <li><Link to="/dashboard/history" className="hover:text-white transition-colors">Audit History</Link></li>
            </ul>
          </div>

          {/* Links 2 */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-4">Company</h4>
            <ul className="space-y-2.5 text-sm">
              <li><Link to="/security" className="hover:text-white transition-colors">Privacy & Data Zero Retention</Link></li>
              <li><Link to="/contact" className="hover:text-white transition-colors">Enterprise Contact</Link></li>
              <li><a href="#" className="hover:text-white transition-colors">Documentation</a></li>
              <li><a href="#" className="hover:text-white transition-colors">API Reference</a></li>
            </ul>
          </div>

          {/* Links 3 */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-4">Integrations</h4>
            <ul className="space-y-2.5 text-sm">
              <li><span className="text-slate-400">Supabase PostgreSQL</span></li>
              <li><span className="text-slate-400">Cloudinary Encrypted Vault</span></li>
              <li><span className="text-slate-400">NVIDIA Build Microservices</span></li>
              <li><span className="text-slate-400">Vercel Edge Network</span></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-slate-800 flex flex-col md:flex-row items-center justify-between text-xs text-slate-500">
          <p>© 2026 Government Form AI Inc. All rights reserved.</p>
          <div className="flex gap-6 mt-4 md:mt-0">
            <a href="#" className="hover:text-slate-400">Terms of Service</a>
            <a href="#" className="hover:text-slate-400">Privacy Policy</a>
            <a href="#" className="hover:text-slate-400">Security Architecture</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

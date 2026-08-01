import React from 'react';
import { PDFViewerModal } from '../../components/document/PDFViewerModal';
import { useNavigate } from 'react-router-dom';

export const PDFPreviewPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <PDFViewerModal
      isOpen={true}
      onClose={() => navigate('/dashboard')}
      title="Official Income Tax Return Verification Form (ITR-V 2026)"
    />
  );
};

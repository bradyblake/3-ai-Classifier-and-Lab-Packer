// File: src/components/BackButton.jsx
import React from 'react';
import { ArrowLeft } from 'lucide-react';
import Button from './ui/Button';

export default function BackButton() {
  return (
    <div className="mb-6">
      <Button
        variant="outline"
        size="sm"
        onClick={() => window.setActiveTool('TileDock')}
        className="shadow-sm"
      >
        <ArrowLeft size={16} className="mr-2" />
        Back to Dashboard
      </Button>
    </div>
  );
}
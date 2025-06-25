// components/FileUpload.js
import React, { useState, useCallback } from 'react';
import { Upload, FileText, CheckCircle } from 'lucide-react';

const FileUpload = ({ onFileUpload, fileType, title, file, error }) => {
  const [dragOver, setDragOver] = useState(false);
  
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      onFileUpload(files[0]);
    }
  }, [onFileUpload]);
  
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      onFileUpload(files[0]);
    }
  };

  const getIcon = () => {
    switch (fileType) {
      case 'JSON':
        return FileText;
      default:
        return Upload;
    }
  };

  const Icon = getIcon();
  
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">{title}</h3>
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          dragOver 
            ? 'border-blue-400 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
      >
        <Icon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <p className="text-sm text-gray-600 mb-2">
          Drop your {fileType} file here, or{' '}
          <label className="text-blue-600 hover:text-blue-700 cursor-pointer">
            click to browse
            <input
              type="file"
              className="hidden"
              onChange={handleFileSelect}
              accept={fileType === 'PNML' ? '.pnml,.xml' : fileType === 'JSON' ? '.json' : '.xlsx,.xls'}
            />
          </label>
        </p>
        <p className="text-xs text-gray-500">
          {fileType === 'PNML' && 'Petri Net Markup Language files'}
          {fileType === 'JSON' && 'Goal model in JSON format'}
          {fileType === 'XLSX' && 'Mapping file in Excel format'}
        </p>
      </div>
      
      {file && (
        <div className="flex items-center space-x-2 text-sm text-green-600">
          <CheckCircle className="h-4 w-4" />
          <span>{file.name}</span>
        </div>
      )}
      
      {error && (
        <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
          {error}
        </div>
      )}
    </div>
  );
};

export default FileUpload;
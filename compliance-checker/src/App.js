// App.js
import React, { useState } from 'react';
import { Play } from 'lucide-react';
import FileUpload from './components/FileUpload';
import ResultsDisplay from './components/ResultsDisplay';
import LTSVisualization from './components/LTSVisualization';
import { parseGoalModel, parsePNMLModel, parseMappingFile } from './utils/parsers';
import { ComplianceEngine } from './utils/ComplianceEngine';
import './App.css';

const App = () => {
  const [files, setFiles] = useState({
    pnml: null,
    goal: null,
    mapping: null
  });
  
  const [parsedData, setParsedData] = useState({
    processModel: null,
    goalModel: null,
    mapping: null
  });
  
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [activeTab, setActiveTab] = useState('upload');
  
  const handleFileUpload = async (file, type) => {
    setFiles(prev => ({ ...prev, [type]: file }));
    setErrors(prev => ({ ...prev, [type]: null }));
    
    try {
      if (type === 'pnml') {
        const text = await file.text();
        const result = parsePNMLModel(text);
        if (result.success) {
          setParsedData(prev => ({ ...prev, processModel: result.data }));
        } else {
          setErrors(prev => ({ ...prev, [type]: result.message }));
        }
      } else if (type === 'goal') {
        const text = await file.text();
        const result = parseGoalModel(text);
        if (result.success) {
          setParsedData(prev => ({ ...prev, goalModel: result.data }));
        } else {
          setErrors(prev => ({ ...prev, [type]: result.message }));
        }
      } else if (type === 'mapping') {
        const buffer = await file.arrayBuffer();
        const result = parseMappingFile(buffer);
        if (result.success) {
          setParsedData(prev => ({ ...prev, mapping: result.data }));
        } else {
          setErrors(prev => ({ ...prev, [type]: result.message }));
        }
      }
    } catch (error) {
      setErrors(prev => ({ ...prev, [type]: error.message }));
    }
  };
  
  const runComplianceCheck = () => {
    if (!parsedData.processModel || !parsedData.goalModel || !parsedData.mapping) {
      alert('Please upload all required files first.');
      return;
    }
    
    setLoading(true);
    
    try {
      const engine = new ComplianceEngine(
        parsedData.goalModel,
        parsedData.processModel,
        parsedData.mapping
      );
      
      const complianceResults = engine.checkCompliance();
      setResults(complianceResults);
      setActiveTab('results');
    } catch (error) {
      alert(`Error during compliance check: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  const canRunCheck = parsedData.processModel && parsedData.goalModel && parsedData.mapping;
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto py-8 px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            High-Level Requirements-Driven Business Process Compliance Checker
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Upload your PNML process model, JSON goal model, and XLSX mapping file to check compliance 
            with high-level business requirements using synchronized labeled transition systems.
          </p>
        </div>
        
        {/* Navigation Tabs */}
        <div className="flex justify-center mb-8">
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('upload')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'upload'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              File Upload
            </button>
            <button
              onClick={() => setActiveTab('lts')}
              disabled={!parsedData.processModel}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'lts'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : parsedData.processModel
                    ? 'text-gray-600 hover:text-gray-900'
                    : 'text-gray-400 cursor-not-allowed'
              }`}
            >
              LTS Visualization
            </button>
            <button
              onClick={() => setActiveTab('results')}
              disabled={!results}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'results'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : results
                    ? 'text-gray-600 hover:text-gray-900'
                    : 'text-gray-400 cursor-not-allowed'
              }`}
            >
              Compliance Results
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'upload' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <FileUpload
                onFileUpload={(file) => handleFileUpload(file, 'pnml')}
                fileType="PNML"
                title="PNML Process Model"
                file={files.pnml}
                error={errors.pnml}
              />
              
              <FileUpload
                onFileUpload={(file) => handleFileUpload(file, 'goal')}
                fileType="JSON"
                title="Goal Model (JSON)"
                file={files.goal}
                error={errors.goal}
              />
              
              <FileUpload
                onFileUpload={(file) => handleFileUpload(file, 'mapping')}
                fileType="XLSX"
                title="Mapping File (XLSX)"
                file={files.mapping}
                error={errors.mapping}
              />
            </div>
            
            <div className="text-center">
              <button
                onClick={runComplianceCheck}
                disabled={!canRunCheck || loading}
                className={`inline-flex items-center space-x-2 px-6 py-3 rounded-lg font-medium ${
                  canRunCheck && !loading
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                <Play className="h-5 w-5" />
                <span>{loading ? 'Checking Compliance...' : 'Run Compliance Check'}</span>
              </button>
            </div>
          </>
        )}

        {activeTab === 'lts' && (
          <LTSVisualization processModel={parsedData.processModel} />
        )}

        {activeTab === 'results' && (
          <ResultsDisplay 
            results={results} 
            goalModel={parsedData.goalModel}
            processModel={parsedData.processModel}
          />
        )}
      </div>
    </div>
  );
};

export default App;
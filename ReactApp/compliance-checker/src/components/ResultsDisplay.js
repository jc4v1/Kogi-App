// components/ResultsDisplay.js
import React from 'react';
import { CheckCircle, XCircle } from 'lucide-react';

const ResultsDisplay = ({ results, goalModel, processModel }) => {
  if (!results) return null;
  
  return (
    <div className="space-y-6">
      <div className={`p-4 rounded-lg ${results.isCompliant ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
        <div className="flex items-center space-x-2">
          {results.isCompliant ? (
            <CheckCircle className="h-6 w-6 text-green-600" />
          ) : (
            <XCircle className="h-6 w-6 text-red-600" />
          )}
          <h3 className="text-lg font-medium">
            {results.isCompliant ? 'Compliance Check Passed' : 'Compliance Check Failed'}
          </h3>
        </div>
        <p className="mt-2 text-sm">
          {results.isCompliant 
            ? 'All execution paths satisfy the high-level business requirements.'
            : `${results.violations.length} violation(s) found in the compliance check.`
          }
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-4 rounded-lg border">
          <h4 className="font-medium mb-3">Execution Paths</h4>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {results.executionPaths.map((path, index) => (
              <div key={index} className="text-sm">
                <div className="font-medium">Path {index + 1}:</div>
                <div className="text-gray-600 ml-2">
                  {path.trace.map((step, stepIndex) => (
                    <div key={stepIndex}>
                      {step.transition} {step.mappedElement ? `→ ${step.mappedElement}` : '(unmapped)'}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {!results.isCompliant && (
          <div className="bg-white p-4 rounded-lg border">
            <h4 className="font-medium mb-3 text-red-700">Violations</h4>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {results.violations.map((violation, index) => (
                <div key={index} className="text-sm border-l-2 border-red-200 pl-3">
                  <div className="font-medium text-red-700">{violation.description}</div>
                  <div className="text-gray-600 text-xs mt-1">
                    Unsatisfied: {violation.unsatisfiedQualities.join(', ')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResultsDisplay;
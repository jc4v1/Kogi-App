import React, { useState, useEffect, useRef } from 'react';
import { Network, AlertCircle, Loader } from 'lucide-react';

/**
 * Converts a process model object (with places, transitions, arcs) to a valid PNML XML string.
 */
const convertToPNML = (processModel) => {
  const { places, transitions, arcs } = processModel;

  let pnml = `<?xml version="1.0" encoding="UTF-8"?>
<pnml xmlns="http://www.pnml.org/version-2009/grammar/pnml">
  <net id="net1" type="http://www.pnml.org/version-2009/grammar/ptnet">`;

  // Places
  places?.forEach(place => {
    pnml += `
    <place id="${place.id}">
      <name><text>${place.name || place.id}</text></name>`;
    if (place.initialTokens && Number(place.initialTokens) > 0) {
      pnml += `
      <initialMarking>
        <text>${place.initialTokens}</text>
      </initialMarking>`;
    }
    pnml += `
    </place>`;
  });

  // Transitions
  transitions?.forEach(transition => {
    pnml += `
    <transition id="${transition.id}">
      <name><text>${transition.name || transition.id}</text></name>
    </transition>`;
  });

  // Arcs
  arcs?.forEach(arc => {
    pnml += `
    <arc id="${arc.id}" source="${arc.source}" target="${arc.target}"/>`;
  });

  pnml += `
  </net>
</pnml>`;

  return pnml;
};

/**
 * PM4PyReachabilityVisualization
 * Props:
 *   - processModel: object with { places, transitions, arcs }
 *   - currentMarking: optional, for highlighting states
 */
const PM4PyReachabilityVisualization = ({ processModel, currentMarking }) => {
  const [reachabilityData, setReachabilityData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const canvasRef = useRef(null);

  // Sends the process model as PNML (converted to Blob) to Flask backend
  const generateReachabilityGraphWithPM4Py = async (processModel) => {
    setLoading(true);
    setError(null);

    try {
      const pnmlString = convertToPNML(processModel);
      const pnmlBlob = new Blob([pnmlString], { type: 'application/xml' });
      const formData = new FormData();
      formData.append('pnml_file', pnmlBlob, 'model.pnml');

      const response = await fetch('http://localhost:5000/api/pm4py/reachability-graph', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(`HTTP error! status: ${response.status}. ${message}`);
      }

      const data = await response.json();
      setReachabilityData(data);
    } catch (err) {
      console.error('Error generating reachability graph with PM4Py:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Draw the reachability graph using Canvas
  const drawReachabilityGraph = () => {
    const canvas = canvasRef.current;
    if (!canvas || !reachabilityData) return;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const { states, transitions } = reachabilityData;
    const cols = Math.ceil(Math.sqrt(states.length));
    const cellWidth = canvas.width / (cols + 1);
    const cellHeight = canvas.height / (Math.ceil(states.length / cols) + 1);

    // Position states
    states.forEach((state, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      state.x = (col + 1) * cellWidth;
      state.y = (row + 1) * cellHeight;
    });

    // Draw transitions (arcs)
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 2;
    transitions.forEach(transition => {
      const source = states.find(s => s.id === transition.source);
      const target = states.find(s => s.id === transition.target);

      if (source && target) {
        if (source.id === target.id) {
          // Self-loop
          ctx.beginPath();
          ctx.arc(source.x + 20, source.y - 20, 15, 0, 2 * Math.PI);
          ctx.stroke();

          // Arrow for self-loop
          ctx.beginPath();
          ctx.moveTo(source.x + 35, source.y - 20);
          ctx.lineTo(source.x + 30, source.y - 25);
          ctx.moveTo(source.x + 35, source.y - 20);
          ctx.lineTo(source.x + 30, source.y - 15);
          ctx.stroke();

          // Label
          ctx.font = '10px Arial';
          ctx.fillStyle = '#333';
          ctx.textAlign = 'center';
          ctx.fillText(transition.label, source.x + 20, source.y - 40);
        } else {
          // Regular transition
          const dx = target.x - source.x;
          const dy = target.y - source.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          const startX = source.x + (dx / distance) * 25;
          const startY = source.y + (dy / distance) * 25;
          const endX = target.x - (dx / distance) * 25;
          const endY = target.y - (dy / distance) * 25;

          ctx.beginPath();
          ctx.moveTo(startX, startY);
          ctx.lineTo(endX, endY);
          ctx.stroke();

          // Arrowhead
          const angle = Math.atan2(dy, dx);
          const headlen = 10;
          ctx.beginPath();
          ctx.moveTo(endX, endY);
          ctx.lineTo(endX - headlen * Math.cos(angle - Math.PI / 6), endY - headlen * Math.sin(angle - Math.PI / 6));
          ctx.moveTo(endX, endY);
          ctx.lineTo(endX - headlen * Math.cos(angle + Math.PI / 6), endY - headlen * Math.sin(angle + Math.PI / 6));
          ctx.stroke();

          // Label
          const midX = (startX + endX) / 2;
          const midY = (startY + endY) / 2;
          ctx.font = '10px Arial';
          ctx.fillStyle = '#333';
          ctx.textAlign = 'center';
          ctx.fillText(transition.label, midX, midY - 5);
        }
      }
    });

    // Draw states (nodes)
    states.forEach(state => {
      // Get marking key for current state
      const getCurrentMarkingKey = () => {
        if (!currentMarking || typeof currentMarking !== 'object') return '';
        return Object.keys(currentMarking).sort()
          .map(place => `${place}:${currentMarking[place] || 0}`)
          .join(',');
      };

      const stateMarkingKey = Object.keys(state.marking || {}).sort()
        .map(place => `${place}:${state.marking[place] || 0}`)
        .join(',');

      const isCurrentState = getCurrentMarkingKey() === stateMarkingKey;

      ctx.fillStyle = state.isInitial ? '#10B981'
                      : state.isTerminal ? '#EF4444'
                      : isCurrentState ? '#3B82F6'
                      : '#6B7280';
      ctx.strokeStyle = '#374151';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(state.x, state.y, 25, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();

      // State ID
      ctx.font = '12px Arial';
      ctx.fillStyle = 'white';
      ctx.textAlign = 'center';
      ctx.fillText(state.id, state.x, state.y + 4);

      // Marking below state
      ctx.font = '8px Arial';
      ctx.fillStyle = '#374151';
      const markingText = Object.entries(state.marking || {})
        .filter(([_, tokens]) => tokens > 0)
        .map(([place, tokens]) => tokens > 1 ? `${place}(${tokens})` : place)
        .join(', ') || '∅';

      const displayText = markingText.length > 15 ? markingText.substring(0, 15) + '...' : markingText;
      ctx.fillText(displayText, state.x, state.y + 40);
    });
  };

  // Generate reachability graph when processModel changes
  useEffect(() => {
    if (processModel && processModel.places && processModel.transitions) {
      generateReachabilityGraphWithPM4Py(processModel);
    }
    // eslint-disable-next-line
  }, [processModel]);

  // Draw when data changes
  useEffect(() => {
    if (reachabilityData) {
      drawReachabilityGraph();
    }
    // eslint-disable-next-line
  }, [reachabilityData, currentMarking]);

  // Retry function
  const handleRetry = () => {
    if (processModel) {
      generateReachabilityGraphWithPM4Py(processModel);
    }
  };

  // UI
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-medium mb-4 flex items-center">
            <Network className="h-5 w-5 mr-2" />
            PM4Py Reachability Graph
          </h3>
          <div className="text-center py-8">
            <Loader className="h-8 w-8 animate-spin mx-auto text-blue-500 mb-4" />
            <p className="text-gray-500">Generating reachability graph with PM4Py...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-medium mb-4 flex items-center">
            <Network className="h-5 w-5 mr-2" />
            PM4Py Reachability Graph
          </h3>
          <div className="text-center py-8">
            <AlertCircle className="h-8 w-8 mx-auto text-red-500 mb-4" />
            <p className="text-red-600 mb-4">Error generating reachability graph:</p>
            <p className="text-gray-600 text-sm mb-4">{error}</p>
            <button
              onClick={handleRetry}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Retry
            </button>
            <div className="mt-4 text-xs text-gray-500">
              <p>Make sure your backend is running and PM4Py is installed:</p>
              <code className="bg-gray-100 px-2 py-1 rounded">pip install pm4py</code>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!reachabilityData) {
    return (
      <div className="text-center py-8 text-gray-500">
        Upload a PNML process model to view the PM4Py reachability graph
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border p-6">
        <h3 className="text-lg font-medium mb-4 flex items-center">
          <Network className="h-5 w-5 mr-2" />
          PM4Py Reachability Graph
          <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
            Generated with PM4Py
          </span>
        </h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* States Panel */}
          <div>
            <h4 className="font-medium mb-3">States ({reachabilityData.states.length})</h4>
            <div className="max-h-48 overflow-y-auto space-y-2">
              {reachabilityData.states.map(state => {
                const getCurrentMarkingKey = () => {
                  if (!currentMarking || typeof currentMarking !== 'object') return '';
                  return Object.keys(currentMarking).sort()
                    .map(place => `${place}:${currentMarking[place] || 0}`)
                    .join(',');
                };
                
                const stateMarkingKey = Object.keys(state.marking || {}).sort()
                  .map(place => `${place}:${state.marking[place] || 0}`)
                  .join(',');
                
                const isCurrentState = getCurrentMarkingKey() === stateMarkingKey;
                
                return (
                  <div
                    key={state.id}
                    className={`p-2 rounded border text-sm ${
                      isCurrentState ? 'bg-blue-50 border-blue-300 ring-1 ring-blue-200' :
                      state.isInitial ? 'bg-green-50 border-green-200' : 
                      state.isTerminal ? 'bg-red-50 border-red-200' :
                      'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="font-medium flex items-center">
                      {state.id}
                      {isCurrentState && <span className="ml-2 text-blue-600 text-xs font-bold">(Current)</span>}
                      {state.isInitial && <span className="ml-2 text-green-600 text-xs">(Initial)</span>}
                      {state.isTerminal && <span className="ml-2 text-red-600 text-xs">(Terminal)</span>}
                    </div>
                    <div className="text-gray-600 mt-1">
                      Marking: {Object.entries(state.marking || {})
                        .filter(([_, tokens]) => tokens > 0)
                        .map(([place, tokens]) => tokens > 1 ? `${place}(${tokens})` : place)
                        .join(', ') || '∅'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Transitions Panel */}
          <div>
            <h4 className="font-medium mb-3">Transitions ({reachabilityData.transitions.length})</h4>
            <div className="max-h-48 overflow-y-auto space-y-2">
              {reachabilityData.transitions.map(transition => (
                <div
                  key={transition.id}
                  className="p-2 rounded border bg-blue-50 border-blue-200 text-sm"
                >
                  <div className="font-medium">
                    {transition.source} → {transition.target}
                  </div>
                  <div className="text-blue-700 mt-1">
                    {transition.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Visual Graph Representation */}
        <div className="mt-6">
          <h4 className="font-medium mb-3">Graph Visualization</h4>
          <div className="bg-gray-50 rounded border p-4">
            <canvas
              ref={canvasRef}
              width={800}
              height={500}
              className="border rounded bg-white w-full"
            />
          </div>
          <div className="mt-4 text-sm text-gray-600">
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center">
                <span className="inline-block w-3 h-3 bg-green-500 rounded-full mr-2"></span>
                Initial State
              </div>
              <div className="flex items-center">
                <span className="inline-block w-3 h-3 bg-red-500 rounded-full mr-2"></span>
                Terminal State
              </div>
              <div className="flex items-center">
                <span className="inline-block w-3 h-3 bg-blue-500 rounded-full mr-2"></span>
                Current State
              </div>
              <div className="flex items-center">
                <span className="inline-block w-3 h-3 bg-gray-500 rounded-full mr-2"></span>
                Regular State
              </div>
            </div>
          </div>
        </div>

        {/* PM4Py Info */}
        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Generated using PM4Py:</strong> This reachability graph was computed using the official PM4Py library's 
            <code className="bg-blue-100 px-1 rounded mx-1">construct_reachability_graph</code> function.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PM4PyReachabilityVisualization;
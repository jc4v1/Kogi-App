// components/LTSVisualization.js
import React, { useMemo, useState } from 'react';
import { Network, Eye, Activity } from 'lucide-react';

// ========== IMPORT del módulo PM4Py ==========
import PM4PyReachabilityVisualization from './PM4PyReachabilityGraph';

// Improved PNML Parser that handles initialMarking correctly
const parseInitialMarking = (processModel) => {
  const marking = {};
  
  processModel.places?.forEach(place => {
    // Look for initialMarking in the original structure
    marking[place.id] = 0; // Default to 0
    
    // Check if place has initial tokens
    if (place.initialTokens) {
      marking[place.id] = parseInt(place.initialTokens);
    } else if (place.id === 'source' || place.id === 'start' || place.id === 'p0') {
      marking[place.id] = 1; // Fallback for common initial place names
    }
  });
  
  return marking;
};

// Petri Net Visualization Component
const PetriNetVisualization = ({ processModel }) => {
  const [nodePositions, setNodePositions] = useState(new Map());
  const [draggedNode, setDraggedNode] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Initialize positions - this hook must be called unconditionally
  React.useEffect(() => {
    if (!processModel || !processModel.places || !processModel.transitions) {
      return;
    }

    const { places, transitions, arcs } = processModel;

    if (nodePositions.size === 0) {
      const initialPositions = new Map();
      
      // Find the source place to start the layout
      const sourcePlace = places?.find(p => p.initialTokens > 0 || p.id === 'source');
      
      if (sourcePlace) {
        // Start with source place
        initialPositions.set(sourcePlace.id, { x: 80, y: 200, type: 'place' });
        
        // Build a complete graph of all connections
        const allConnections = new Map();
        
        // Build adjacency list from arcs
        arcs?.forEach(arc => {
          if (!allConnections.has(arc.source)) {
            allConnections.set(arc.source, []);
          }
          allConnections.get(arc.source).push(arc.target);
        });
        
        // Use BFS to layout all connected nodes
        const queue = [{ id: sourcePlace.id, x: 80, y: 200, level: 0 }];
        const visited = new Set([sourcePlace.id]);
        
        while (queue.length > 0) {
          const current = queue.shift();
          
          // Get all nodes connected from this one
          const connections = allConnections.get(current.id) || [];
          
          connections.forEach((targetId, index) => {
            if (!visited.has(targetId)) {
              visited.add(targetId);
              
              const isTransition = transitions?.some(t => t.id === targetId);
              const nextX = current.x + 70;
              const offsetY = (index - (connections.length - 1) / 2) * 35;
              const nextY = Math.max(50, Math.min(350, current.y + offsetY));
              
              initialPositions.set(targetId, { 
                x: nextX, 
                y: nextY, 
                type: isTransition ? 'transition' : 'place' 
              });
              
              queue.push({ 
                id: targetId, 
                x: nextX, 
                y: nextY, 
                level: current.level + 1 
              });
            }
          });
        }
        
        // Handle remaining nodes
        let orphanY = 80;
        const orphanX = 40;
        
        // Try to connect nodes with incoming arcs - improved algorithm
        let foundNew = true;
        let attempts = 0;
        while (foundNew && attempts < 15) {
          foundNew = false;
          attempts++;
          
          arcs?.forEach(arc => {
            // Forward connections (source connects to placed target)
            if (visited.has(arc.target) && !visited.has(arc.source)) {
              const targetPos = initialPositions.get(arc.target);
              if (targetPos) {
                const isTransition = transitions?.some(t => t.id === arc.source);
                initialPositions.set(arc.source, {
                  x: Math.max(40, targetPos.x - 70),
                  y: targetPos.y,
                  type: isTransition ? 'transition' : 'place'
                });
                visited.add(arc.source);
                foundNew = true;
              }
            }
            
            // Backward connections (placed source connects to target)
            if (visited.has(arc.source) && !visited.has(arc.target)) {
              const sourcePos = initialPositions.get(arc.source);
              if (sourcePos) {
                const isTransition = transitions?.some(t => t.id === arc.target);
                initialPositions.set(arc.target, {
                  x: Math.min(1160, sourcePos.x + 70),
                  y: sourcePos.y,
                  type: isTransition ? 'transition' : 'place'
                });
                visited.add(arc.target);
                foundNew = true;
              }
            }
          });
        }
        
        // Place remaining unconnected nodes
        [...(places || []), ...(transitions || [])].forEach(node => {
          if (!initialPositions.has(node.id)) {
            const hasIncomingArcs = arcs?.some(arc => arc.target === node.id);
            const hasOutgoingArcs = arcs?.some(arc => arc.source === node.id);
            
            if (hasIncomingArcs || hasOutgoingArcs) {
              const connectedNodes = [];
              
              arcs?.forEach(arc => {
                if (arc.source === node.id && initialPositions.has(arc.target)) {
                  connectedNodes.push({ pos: initialPositions.get(arc.target), relation: 'outputs_to' });
                }
                if (arc.target === node.id && initialPositions.has(arc.source)) {
                  connectedNodes.push({ pos: initialPositions.get(arc.source), relation: 'inputs_from' });
                }
              });
              
              if (connectedNodes.length > 0) {
                const avgX = connectedNodes.reduce((sum, conn) => sum + conn.pos.x, 0) / connectedNodes.length;
                const avgY = connectedNodes.reduce((sum, conn) => sum + conn.pos.y, 0) / connectedNodes.length;
                
                const hasInputRelation = connectedNodes.some(conn => conn.relation === 'inputs_from');
                const offsetX = hasInputRelation ? 70 : -70;
                
                const isTransition = transitions?.some(t => t.id === node.id);
                initialPositions.set(node.id, {
                  x: Math.max(40, Math.min(1160, avgX + offsetX)),
                  y: Math.max(50, Math.min(350, avgY)),
                  type: isTransition ? 'transition' : 'place'
                });
              } else {
                const isTransition = transitions?.some(t => t.id === node.id);
                initialPositions.set(node.id, {
                  x: orphanX,
                  y: orphanY,
                  type: isTransition ? 'transition' : 'place'
                });
                orphanY += 60;
              }
            } else {
              const isTransition = transitions?.some(t => t.id === node.id);
              initialPositions.set(node.id, {
                x: orphanX,
                y: orphanY,
                type: isTransition ? 'transition' : 'place'
              });
              orphanY += 60;
            }
          }
        });
      }
      
      setNodePositions(initialPositions);
    }
  }, [processModel, nodePositions.size]);

  if (!processModel) return null;

  const { places, transitions, arcs } = processModel;

  const handleMouseDown = (event, nodeId) => {
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    const svg = event.currentTarget.closest('svg');
    const svgRect = svg.getBoundingClientRect();
    
    const svgX = (event.clientX - svgRect.left) * (1200 / svgRect.width);
    const svgY = (event.clientY - svgRect.top) * (400 / svgRect.height);
    
    const nodePos = nodePositions.get(nodeId);
    setDraggedNode(nodeId);
    setDragOffset({
      x: svgX - nodePos.x,
      y: svgY - nodePos.y
    });
  };

  const handleMouseMove = (event) => {
    if (!draggedNode) return;
    
    const svg = event.currentTarget;
    const rect = svg.getBoundingClientRect();
    
    const svgX = (event.clientX - rect.left) * (1200 / rect.width);
    const svgY = (event.clientY - rect.top) * (400 / rect.height);
    
    const newX = Math.max(20, Math.min(1180, svgX - dragOffset.x));
    const newY = Math.max(20, Math.min(380, svgY - dragOffset.y));
    
    setNodePositions(prev => {
      const newPositions = new Map(prev);
      const nodeData = newPositions.get(draggedNode);
      if (nodeData) {
        newPositions.set(draggedNode, { ...nodeData, x: newX, y: newY });
      }
      return newPositions;
    });
  };

  const handleMouseUp = () => {
    setDraggedNode(null);
    setDragOffset({ x: 0, y: 0 });
  };

  return (
    <div className="bg-white rounded-lg border p-6 mb-6">
      <h4 className="font-medium mb-4 flex items-center">
        <Activity className="h-5 w-5 mr-2" />
        Petri Net Structure
        <span className="ml-4 text-sm text-gray-500 font-normal">
          💡 Drag nodes to reorganize the network
        </span>
      </h4>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Places */}
        <div>
          <h5 className="font-medium mb-2">Places ({places?.length || 0})</h5>
          <div className="max-h-32 overflow-y-auto space-y-1">
            {places?.map(place => (
              <div key={place.id} className="text-sm p-2 bg-green-50 border border-green-200 rounded">
                <div className="font-medium">{place.name || place.id}</div>
                <div className="text-xs text-gray-600">ID: {place.id}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Transitions */}
        <div>
          <h5 className="font-medium mb-2">Transitions ({transitions?.length || 0})</h5>
          <div className="max-h-32 overflow-y-auto space-y-1">
            {transitions?.map(transition => (
              <div key={transition.id} className="text-sm p-2 bg-blue-50 border border-blue-200 rounded">
                <div className="font-medium">{transition.name || transition.id}</div>
                <div className="text-xs text-gray-600">ID: {transition.id}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Arcs */}
        <div>
          <h5 className="font-medium mb-2">Arcs ({arcs?.length || 0})</h5>
          <div className="max-h-32 overflow-y-auto space-y-1">
            {arcs?.map(arc => (
              <div key={arc.id} className="text-sm p-2 bg-purple-50 border border-purple-200 rounded">
                <div className="font-medium">{arc.source} → {arc.target}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Interactive Petri Net Diagram */}
      <div className="bg-gray-50 rounded border p-4">
        <h5 className="font-medium mb-2">Interactive Network Diagram</h5>
        <div className="overflow-x-auto border rounded bg-white" style={{ maxHeight: '600px' }}>
          <svg 
            width="1200" 
            height="400" 
            viewBox="0 0 1200 400" 
            className="min-w-full cursor-default"
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {/* Define arrowhead marker for arcs */}
            <defs>
              <marker
                id="petriArrowhead"
                markerWidth="6"
                markerHeight="4"
                refX="5"
                refY="2"
                orient="auto"
              >
                <polygon
                  points="0 0, 6 2, 0 4"
                  fill="#374151"
                />
              </marker>
            </defs>

            {/* Render Arcs first */}
            {arcs?.map(arc => {
              const sourcePos = nodePositions.get(arc.source);
              const targetPos = nodePositions.get(arc.target);
              
              if (sourcePos && targetPos) {
                const dx = targetPos.x - sourcePos.x;
                const dy = targetPos.y - sourcePos.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance > 0) {
                  const sourceRadius = sourcePos.type === 'place' ? 9 : 7;
                  const targetRadius = targetPos.type === 'place' ? 9 : 7;
                  
                  const startX = sourcePos.x + (dx / distance) * sourceRadius;
                  const startY = sourcePos.y + (dy / distance) * sourceRadius;
                  const endX = targetPos.x - (dx / distance) * targetRadius;
                  const endY = targetPos.y - (dy / distance) * targetRadius;
                  
                  return (
                    <line
                      key={arc.id}
                      x1={startX}
                      y1={startY}
                      x2={endX}
                      y2={endY}
                      stroke="#374151"
                      strokeWidth="1"
                      markerEnd="url(#petriArrowhead)"
                    />
                  );
                }
              }
              return null;
            })}

            {/* Render Places */}
            {places?.map(place => {
              const pos = nodePositions.get(place.id);
              if (!pos) return null;
              
              const hasInitialTokens = place.initialTokens > 0;
              const isDragging = draggedNode === place.id;
              
              return (
                <g 
                  key={place.id}
                  style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
                  onMouseDown={(e) => handleMouseDown(e, place.id)}
                >
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r="9"
                    fill={hasInitialTokens ? "#FEF3C7" : "#F9FAFB"}
                    stroke={isDragging ? "#3B82F6" : "#374151"}
                    strokeWidth={isDragging ? "2" : "1"}
                    className={isDragging ? "opacity-80" : ""}
                  />
                  {hasInitialTokens && (
                    <circle cx={pos.x} cy={pos.y} r="2" fill="#374151" />
                  )}
                  <text
                    x={pos.x}
                    y={pos.y + 20}
                    textAnchor="middle"
                    fontSize="8"
                    fill="#374151"
                    fontWeight="600"
                    pointerEvents="none"
                  >
                    {place.name || place.id}
                  </text>
                </g>
              );
            })}

            {/* Render Transitions */}
            {transitions?.map(transition => {
              const pos = nodePositions.get(transition.id);
              if (!pos) return null;
              
              const isDragging = draggedNode === transition.id;
              
              return (
                <g 
                  key={transition.id}
                  style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
                  onMouseDown={(e) => handleMouseDown(e, transition.id)}
                >
                  <rect
                    x={pos.x - 12}
                    y={pos.y - 5}
                    width="24"
                    height="10"
                    fill="#000000"
                    stroke={isDragging ? "#3B82F6" : "#000000"}
                    strokeWidth={isDragging ? "2" : "1"}
                    className={isDragging ? "opacity-80" : ""}
                  />
                  <text
                    x={pos.x}
                    y={pos.y + 20}
                    textAnchor="middle"
                    fontSize="8"
                    fill="#000000"
                    fontWeight="600"
                    pointerEvents="none"
                  >
                    {transition.name || transition.id}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
        <div className="text-xs text-gray-500 mt-2">
          💡 Click and drag any node to reorganize the network layout
        </div>
      </div>
    </div>
  );
};

// ========== COMPONENTE PRINCIPAL - LTS Visualization ==========
const LTSVisualization = ({ processModel }) => {
  const [view, setView] = useState('petri'); // 'petri' o 'reachability'
  const [currentMarking, setCurrentMarking] = useState(null);

  // Parse initial marking cuando se carga el processModel
  React.useEffect(() => {
    if (processModel) {
      const initialMarking = parseInitialMarking(processModel);
      setCurrentMarking(initialMarking);
    }
  }, [processModel]);

  if (!processModel) {
    return (
      <div className="text-center py-8 text-gray-500">
        Upload a PNML process model to view the reachability graph
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ========== VIEW TOGGLE CON 2 OPCIONES ========== */}
      <div className="flex justify-center mb-6">
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setView('petri')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              view === 'petri'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Activity className="h-4 w-4 inline mr-2" />
            Petri Net
          </button>
          
          {/* TAB - Reachability con el módulo separado */}
          <button
            onClick={() => setView('reachability')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              view === 'reachability'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Eye className="h-4 w-4 inline mr-2" />
            PM4Py Reachability
          </button>
        </div>
      </div>

      {/* ========== CONTENIDO BASADO EN LA VISTA SELECCIONADA ========== */}
      
      {/* Vista Petri Net - Tu código existente */}
      {view === 'petri' && <PetriNetVisualization processModel={processModel} />}
      
      {/* ========== VISTA - Reachability con PM4Py ========== */}
      {view === 'reachability' && (
        <PM4PyReachabilityVisualization 
          processModel={processModel}
          currentMarking={currentMarking}
        />
      )}
    </div>
  );
};

export default LTSVisualization;
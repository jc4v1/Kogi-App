// components/LTSVisualization.js
import React, { useMemo, useState } from 'react';
import { Network, Eye, Activity } from 'lucide-react';

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

// Enhanced Reachability Graph Generator with proper LTS algorithm
class ReachabilityGraphGenerator {
  constructor(processModel) {
    this.processModel = processModel;
    this.states = new Map();
    this.transitions = [];
    this.stateCounter = 0;
    this.explorationQueue = [];
    this.visited = new Set();
  }

  generateReachabilityGraph() {
    console.log('Starting LTS generation...');
    console.log('Process Model:', this.processModel);
    
    // Step 1: Start at the initial marking
    const initialMarking = this.getInitialMarking();
    console.log('Initial Marking:', initialMarking);
    
    const initialStateId = this.addState(initialMarking);
    this.explorationQueue.push({ stateId: initialStateId, marking: initialMarking });
    
    // Step 2-5: Explore all reachable states
    while (this.explorationQueue.length > 0) {
      const { stateId, marking } = this.explorationQueue.shift();
      const markingKey = this.getMarkingKey(marking);
      
      if (this.visited.has(markingKey)) continue;
      this.visited.add(markingKey);
      
      console.log(`Exploring state ${stateId} with marking:`, marking);
      
      // Check for enabled transitions
      const enabledTransitions = this.getEnabledTransitions(marking);
      console.log(`Enabled transitions from ${stateId}:`, enabledTransitions.map(t => t.id));
      
      // Fire each enabled transition
      for (const transition of enabledTransitions) {
        const newMarking = this.fireTransition(marking, transition.id);
        const newStateId = this.addState(newMarking);
        
        console.log(`Firing ${transition.id}: ${stateId} -> ${newStateId}`, newMarking);
        
        // Add transition to LTS
        this.transitions.push({
          id: `${stateId}_${transition.id}_${newStateId}`,
          source: stateId,
          target: newStateId,
          label: transition.name || transition.id,
          transitionId: transition.id
        });
        
        // Add to exploration queue if not already explored
        const newMarkingKey = this.getMarkingKey(newMarking);
        if (!this.visited.has(newMarkingKey)) {
          this.explorationQueue.push({ stateId: newStateId, marking: newMarking });
        }
      }
    }
    
    const result = {
      states: Array.from(this.states.entries()).map(([id, marking]) => ({
        id,
        marking,
        label: this.getStateLabel(marking),
        isInitial: id === 'S0',
        isTerminal: this.getEnabledTransitions(marking).length === 0
      })),
      transitions: this.transitions
    };
    
    console.log('LTS Generation Complete:', result);
    return result;
  }
  
  getInitialMarking() {
    const marking = {};
    
    // Initialize all places to 0 tokens
    this.processModel.places?.forEach(place => {
      marking[place.id] = 0;
    });
    
    // Set initial tokens from PNML data
    this.processModel.places?.forEach(place => {
      if (place.initialTokens && place.initialTokens > 0) {
        marking[place.id] = place.initialTokens;
      }
    });
    
    return marking;
  }
  
  getEnabledTransitions(marking) {
    return this.processModel.transitions?.filter(transition => {
      const inputArcs = this.processModel.arcs?.filter(arc => arc.target === transition.id) || [];
      
      // A transition is enabled if ALL input places have enough tokens
      const isEnabled = inputArcs.every(arc => {
        const tokensInPlace = marking[arc.source] || 0;
        const tokensNeeded = 1; // Assuming arc weight = 1 (can be extended)
        return tokensInPlace >= tokensNeeded;
      });
      
      return isEnabled;
    }) || [];
  }
  
  fireTransition(marking, transitionId) {
    const newMarking = { ...marking };
    const inputArcs = this.processModel.arcs?.filter(arc => arc.target === transitionId) || [];
    const outputArcs = this.processModel.arcs?.filter(arc => arc.source === transitionId) || [];
    
    // Remove tokens from input places (consume)
    inputArcs.forEach(arc => {
      const tokensToRemove = 1; // Assuming arc weight = 1
      newMarking[arc.source] = (newMarking[arc.source] || 0) - tokensToRemove;
    });
    
    // Add tokens to output places (produce)
    outputArcs.forEach(arc => {
      const tokensToAdd = 1; // Assuming arc weight = 1
      newMarking[arc.target] = (newMarking[arc.target] || 0) + tokensToAdd;
    });
    
    return newMarking;
  }
  
  getMarkingKey(marking) {
    // Create a consistent string representation of the marking
    const sortedPlaces = Object.keys(marking).sort();
    return sortedPlaces.map(place => `${place}:${marking[place] || 0}`).join(',');
  }
  
  addState(marking) {
    const markingKey = this.getMarkingKey(marking);
    
    // Check if this marking already exists
    for (const [stateId, existingMarking] of this.states) {
      if (this.getMarkingKey(existingMarking) === markingKey) {
        return stateId;
      }
    }
    
    // Create new state
    const stateId = `S${this.stateCounter++}`;
    this.states.set(stateId, marking);
    return stateId;
  }
  
  getStateLabel(marking) {
    const activeTokens = Object.entries(marking)
      .filter(([place, tokens]) => tokens > 0)
      .map(([place, tokens]) => tokens > 1 ? `${place}(${tokens})` : place)
      .join(', ');
    return activeTokens || '∅';
  }
}

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
        while (foundNew && attempts < 15) { // Increased attempts
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
                console.log(`Connected backward: ${arc.source} -> ${arc.target}`);
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
                console.log(`Connected forward: ${arc.source} -> ${arc.target}`);
              }
            }
          });
        }
        
        // Place remaining unconnected nodes
        [...(places || []), ...(transitions || [])].forEach(node => {
          if (!initialPositions.has(node.id)) {
            console.log(`Orphan node found: ${node.id} (${node.name || 'no name'})`);
            
            // Check if this node has ANY connections
            const hasIncomingArcs = arcs?.some(arc => arc.target === node.id);
            const hasOutgoingArcs = arcs?.some(arc => arc.source === node.id);
            
            if (hasIncomingArcs || hasOutgoingArcs) {
              // This node should be connected but wasn't reached
              // Try to find the best position based on its connections
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
                // Position near connected nodes
                const avgX = connectedNodes.reduce((sum, conn) => sum + conn.pos.x, 0) / connectedNodes.length;
                const avgY = connectedNodes.reduce((sum, conn) => sum + conn.pos.y, 0) / connectedNodes.length;
                
                // Offset based on relation type
                const hasInputRelation = connectedNodes.some(conn => conn.relation === 'inputs_from');
                const offsetX = hasInputRelation ? 70 : -70; // Position to the right if it receives input
                
                const isTransition = transitions?.some(t => t.id === node.id);
                initialPositions.set(node.id, {
                  x: Math.max(40, Math.min(1160, avgX + offsetX)),
                  y: Math.max(50, Math.min(350, avgY)),
                  type: isTransition ? 'transition' : 'place'
                });
                console.log(`Positioned connected orphan ${node.id} at (${avgX + offsetX}, ${avgY})`);
              } else {
                // Place in orphan area but with better spacing
                const isTransition = transitions?.some(t => t.id === node.id);
                initialPositions.set(node.id, {
                  x: orphanX,
                  y: orphanY,
                  type: isTransition ? 'transition' : 'place'
                });
                console.log(`Positioned true orphan ${node.id} at (${orphanX}, ${orphanY})`);
                orphanY += 60;
              }
            } else {
              // Truly disconnected node
              const isTransition = transitions?.some(t => t.id === node.id);
              initialPositions.set(node.id, {
                x: orphanX,
                y: orphanY,
                type: isTransition ? 'transition' : 'place'
              });
              console.log(`Positioned disconnected node ${node.id} at (${orphanX}, ${orphanY})`);
              orphanY += 60;
            }
          }
        });
      }
      
      setNodePositions(initialPositions);
      
      // Debug: Log what we're about to render
      console.log('=== RENDERING DEBUG ===');
      console.log('Places to render:', places?.length || 0);
      console.log('Transitions to render:', transitions?.length || 0);
      console.log('Positions map size:', initialPositions.size);
      console.log('Places with positions:', places?.filter(p => initialPositions.has(p.id)).length || 0);
      console.log('Transitions with positions:', transitions?.filter(t => initialPositions.has(t.id)).length || 0);
      places?.forEach(place => {
        const pos = initialPositions.get(place.id);
        console.log(`Place ${place.id}: position ${pos ? `(${pos.x}, ${pos.y})` : 'MISSING'}`);
      });
      console.log('=====================');
    }
  }, [processModel, nodePositions.size]); // Added dependencies

  if (!processModel) return null;

  const { places, transitions, arcs } = processModel;

  const handleMouseDown = (event, nodeId) => {
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    const svg = event.currentTarget.closest('svg');
    const svgRect = svg.getBoundingClientRect();
    
    // Calculate position relative to SVG
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
    
    // Calculate position relative to SVG
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
                  const sourceRadius = sourcePos.type === 'place' ? 9 : 7; // Increased 50%
                  const targetRadius = targetPos.type === 'place' ? 9 : 7; // Increased 50%
                  
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
              if (!pos) {
                console.warn(`No position found for place: ${place.id}`);
                return null;
              }
              
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
              if (!pos) {
                console.warn(`No position found for transition: ${transition.id}`);
                return null;
              }
              
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

// LTS Visualization Component
const LTSVisualization = ({ processModel }) => {
  const [view, setView] = useState('petri'); // 'petri' or 'lts'
  
  const reachabilityGraph = useMemo(() => {
    if (!processModel) return null;
    const generator = new ReachabilityGraphGenerator(processModel);
    return generator.generateReachabilityGraph();
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
      {/* View Toggle */}
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
          <button
            onClick={() => setView('lts')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              view === 'lts'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Network className="h-4 w-4 inline mr-2" />
            LTS / Reachability Graph
          </button>
        </div>
      </div>

      {/* Content based on selected view */}
      {view === 'petri' && <PetriNetVisualization processModel={processModel} />}
      
      {view === 'lts' && reachabilityGraph && (
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-medium mb-4 flex items-center">
            <Network className="h-5 w-5 mr-2" />
            Labeled Transition System (LTS) / Reachability Graph
          </h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* States Panel */}
            <div>
              <h4 className="font-medium mb-3">States ({reachabilityGraph.states.length})</h4>
              <div className="max-h-64 overflow-y-auto space-y-2">
                {reachabilityGraph.states.map(state => (
                  <div
                    key={state.id}
                    className={`p-2 rounded border text-sm ${
                      state.isInitial 
                        ? 'bg-green-50 border-green-200' 
                        : state.isTerminal 
                          ? 'bg-red-50 border-red-200'
                          : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="font-medium flex items-center">
                      {state.id}
                      {state.isInitial && <span className="ml-2 text-green-600 text-xs">(Initial)</span>}
                      {state.isTerminal && <span className="ml-2 text-red-600 text-xs">(Terminal)</span>}
                    </div>
                    <div className="text-gray-600 mt-1">
                      Marking: {state.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Transitions Panel */}
            <div>
              <h4 className="font-medium mb-3">Transitions ({reachabilityGraph.transitions.length})</h4>
              <div className="max-h-64 overflow-y-auto space-y-2">
                {reachabilityGraph.transitions.map(transition => (
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
            <div className="bg-gray-50 rounded border p-4 min-h-64">
              <svg
                width="100%"
                height="400"
                viewBox="0 0 800 400"
                className="border rounded bg-white"
              >
                {/* Define arrowhead marker */}
                <defs>
                  <marker
                    id="arrowhead"
                    markerWidth="10"
                    markerHeight="7"
                    refX="9"
                    refY="3.5"
                    orient="auto"
                  >
                    <polygon
                      points="0 0, 10 3.5, 0 7"
                      fill="#4B5563"
                    />
                  </marker>
                </defs>

                {/* Render states */}
                {reachabilityGraph.states.map((state, index) => {
                  const x = 100 + (index % 6) * 120;
                  const y = 80 + Math.floor(index / 6) * 100;
                  
                  return (
                    <g key={state.id}>
                      <circle
                        cx={x}
                        cy={y}
                        r="25"
                        fill={
                          state.isInitial 
                            ? "#10B981" 
                            : state.isTerminal 
                              ? "#EF4444" 
                              : "#6B7280"
                        }
                        stroke="#374151"
                        strokeWidth="2"
                      />
                      <text
                        x={x}
                        y={y}
                        textAnchor="middle"
                        dy="0.3em"
                        fontSize="12"
                        fill="white"
                        fontWeight="bold"
                      >
                        {state.id}
                      </text>
                      <text
                        x={x}
                        y={y + 40}
                        textAnchor="middle"
                        fontSize="10"
                        fill="#374151"
                      >
                        {state.label.length > 15 ? state.label.substring(0, 15) + '...' : state.label}
                      </text>
                    </g>
                  );
                })}

                {/* Render transitions */}
                {reachabilityGraph.transitions.map((transition) => {
                  const sourceState = reachabilityGraph.states.find(s => s.id === transition.source);
                  const targetState = reachabilityGraph.states.find(s => s.id === transition.target);
                  
                  if (!sourceState || !targetState) return null;
                  
                  const sourceIndex = reachabilityGraph.states.indexOf(sourceState);
                  const targetIndex = reachabilityGraph.states.indexOf(targetState);
                  
                  const x1 = 100 + (sourceIndex % 6) * 120;
                  const y1 = 80 + Math.floor(sourceIndex / 6) * 100;
                  const x2 = 100 + (targetIndex % 6) * 120;
                  const y2 = 80 + Math.floor(targetIndex / 6) * 100;
                  
                  // Calculate edge points on circle boundaries
                  const dx = x2 - x1;
                  const dy = y2 - y1;
                  const distance = Math.sqrt(dx * dx + dy * dy);
                  
                  if (distance === 0) {
                    // Self-loop
                    return (
                      <g key={transition.id}>
                        <path
                          d={`M ${x1 + 25} ${y1} A 20 20 0 1 1 ${x1 - 25} ${y1}`}
                          stroke="#4B5563"
                          strokeWidth="2"
                          fill="none"
                          markerEnd="url(#arrowhead)"
                        />
                        <text
                          x={x1}
                          y={y1 - 35}
                          textAnchor="middle"
                          fontSize="10"
                          fill="#1F2937"
                        >
                          {transition.label}
                        </text>
                      </g>
                    );
                  }
                  
                  const startX = x1 + (dx / distance) * 25;
                  const startY = y1 + (dy / distance) * 25;
                  const endX = x2 - (dx / distance) * 25;
                  const endY = y2 - (dy / distance) * 25;
                  
                  return (
                    <g key={transition.id}>
                      <line
                        x1={startX}
                        y1={startY}
                        x2={endX}
                        y2={endY}
                        stroke="#4B5563"
                        strokeWidth="2"
                        markerEnd="url(#arrowhead)"
                      />
                      <text
                        x={(startX + endX) / 2}
                        y={(startY + endY) / 2 - 5}
                        textAnchor="middle"
                        fontSize="10"
                        fill="#1F2937"
                      >
                        {transition.label}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LTSVisualization;
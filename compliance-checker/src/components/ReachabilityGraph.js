// ========== IMPORTS AL PRINCIPIO DEL ARCHIVO ==========
import React, { useState, useEffect, useRef } from 'react';
import { Network } from 'lucide-react';

// ========== REACHABILITY GRAPH GENERATOR (Modular Component) ==========
class ReachabilityGraphGenerator {
  constructor(petriNetData) {
    this.petriNetData = petriNetData;
    this.states = new Map();
    this.transitions = [];
    this.stateCounter = 0;
    this.explorationQueue = [];
    this.visited = new Set();
  }

  generateReachabilityGraph() {
    console.log('Starting LTS generation...');
    
    const initialMarking = this.getInitialMarking();
    console.log('Initial Marking:', initialMarking);
    
    const initialStateId = this.addState(initialMarking);
    this.explorationQueue.push({ stateId: initialStateId, marking: initialMarking });
    
    while (this.explorationQueue.length > 0) {
      const { stateId, marking } = this.explorationQueue.shift();
      const markingKey = this.getMarkingKey(marking);
      
      if (this.visited.has(markingKey)) continue;
      this.visited.add(markingKey);
      
      const enabledTransitions = this.getEnabledTransitions(marking);
      
      for (const transition of enabledTransitions) {
        const newMarking = this.fireTransition(marking, transition.id);
        const newStateId = this.addState(newMarking);
        
        this.transitions.push({
          id: `${stateId}_${transition.id}_${newStateId}`,
          source: stateId,
          target: newStateId,
          label: transition.name || transition.id,
          transitionId: transition.id
        });
        
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
    this.petriNetData.places?.forEach(place => {
      marking[place.id] = place.tokens || place.initialTokens || 0;
    });
    return marking;
  }
  
  getEnabledTransitions(marking) {
    return this.petriNetData.transitions?.filter(transition => {
      const inputArcs = this.petriNetData.arcs?.filter(arc => 
        arc.target === transition.id && (arc.type === 'place-to-transition' || !arc.type)
      ) || [];
      
      return inputArcs.every(arc => (marking[arc.source] || 0) >= 1);
    }) || [];
  }
  
  fireTransition(marking, transitionId) {
    const newMarking = { ...marking };
    const inputArcs = this.petriNetData.arcs?.filter(arc => 
      arc.target === transitionId && (arc.type === 'place-to-transition' || !arc.type)
    ) || [];
    const outputArcs = this.petriNetData.arcs?.filter(arc => 
      arc.source === transitionId && (arc.type === 'transition-to-place' || !arc.type)
    ) || [];
    
    inputArcs.forEach(arc => {
      newMarking[arc.source] = (newMarking[arc.source] || 0) - 1;
    });
    
    outputArcs.forEach(arc => {
      newMarking[arc.target] = (newMarking[arc.target] || 0) + 1;
    });
    
    return newMarking;
  }
  
  getMarkingKey(marking) {
    const sortedPlaces = Object.keys(marking).sort();
    return sortedPlaces.map(place => `${place}:${marking[place] || 0}`).join(',');
  }
  
  addState(marking) {
    const markingKey = this.getMarkingKey(marking);
    
    for (const [stateId, existingMarking] of this.states) {
      if (this.getMarkingKey(existingMarking) === markingKey) {
        return stateId;
      }
    }
    
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

// ========== LTS VISUALIZATION COMPONENT (Compatible with your existing code) ==========
const LTSReachabilityVisualization = ({ processModel, currentMarking }) => {
  const [ltsData, setLtsData] = useState(null);
  const ltsCanvasRef = useRef(null);

  useEffect(() => {
    if (processModel) {
      // Convert your processModel to the format expected by ReachabilityGraphGenerator
      const petriNetData = {
        places: processModel.places,
        transitions: processModel.transitions,
        arcs: processModel.arcs
      };
      
      const generator = new ReachabilityGraphGenerator(petriNetData);
      const lts = generator.generateReachabilityGraph();
      setLtsData(lts);
    }
  }, [processModel]);

  const drawLTSGraph = () => {
    const canvas = ltsCanvasRef.current;
    if (!canvas || !ltsData) return;
    
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const states = ltsData.states;
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
    
    // Draw arcs
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 2;
    ltsData.transitions.forEach(transition => {
      const source = states.find(s => s.id === transition.source);
      const target = states.find(s => s.id === transition.target);
      
      if (source && target) {
        if (source.id === target.id) {
          // Self-loop
          ctx.beginPath();
          ctx.arc(source.x + 20, source.y - 20, 15, 0, 2 * Math.PI);
          ctx.stroke();
          
          ctx.beginPath();
          ctx.moveTo(source.x + 35, source.y - 20);
          ctx.lineTo(source.x + 30, source.y - 25);
          ctx.moveTo(source.x + 35, source.y - 20);
          ctx.lineTo(source.x + 30, source.y - 15);
          ctx.stroke();
          
          ctx.font = '10px Arial';
          ctx.fillStyle = '#333';
          ctx.textAlign = 'center';
          ctx.fillText(transition.label, source.x + 20, source.y - 40);
        } else {
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
          
          const angle = Math.atan2(dy, dx);
          const headlen = 10;
          ctx.beginPath();
          ctx.moveTo(endX, endY);
          ctx.lineTo(endX - headlen * Math.cos(angle - Math.PI / 6), endY - headlen * Math.sin(angle - Math.PI / 6));
          ctx.moveTo(endX, endY);
          ctx.lineTo(endX - headlen * Math.cos(angle + Math.PI / 6), endY - headlen * Math.sin(angle + Math.PI / 6));
          ctx.stroke();
          
          const midX = (startX + endX) / 2;
          const midY = (startY + endY) / 2;
          ctx.font = '10px Arial';
          ctx.fillStyle = '#333';
          ctx.textAlign = 'center';
          ctx.fillText(transition.label, midX, midY - 5);
        }
      }
    });
    
    // Draw states
    states.forEach(state => {
      // Compare current marking with state marking (compatible with your format)
      const getCurrentMarkingKey = () => {
        if (!currentMarking) return '';
        // Handle both formats: object marking or your specific format
        if (typeof currentMarking === 'object' && !Array.isArray(currentMarking)) {
          return Object.keys(currentMarking).sort().map(place => `${place}:${currentMarking[place] || 0}`).join(',');
        }
        return '';
      };
      
      const currentMarkingKey = getCurrentMarkingKey();
      const stateMarkingKey = Object.keys(state.marking).sort().map(place => `${place}:${state.marking[place] || 0}`).join(',');
      const isCurrentState = currentMarkingKey === stateMarkingKey;
      
      ctx.fillStyle = state.isInitial ? '#10B981' : 
                     state.isTerminal ? '#EF4444' : 
                     isCurrentState ? '#3B82F6' : '#6B7280';
      ctx.strokeStyle = '#374151';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(state.x, state.y, 25, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
      
      ctx.font = '12px Arial';
      ctx.fillStyle = 'white';
      ctx.textAlign = 'center';
      ctx.fontWeight = 'bold';
      ctx.fillText(state.id, state.x, state.y + 4);
      
      ctx.font = '8px Arial';
      ctx.fillStyle = '#374151';
      const markingText = state.label.length > 15 ? state.label.substring(0, 15) + '...' : state.label;
      ctx.fillText(markingText, state.x, state.y + 40);
    });
  };

  useEffect(() => {
    drawLTSGraph();
  }, [ltsData, currentMarking]);

  if (!ltsData) {
    return (
      <div className="text-center py-8 text-gray-500">
        Upload a PNML process model to view the reachability graph
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border p-6">
        <h3 className="text-lg font-medium mb-4 flex items-center">
          <Network className="h-5 w-5 mr-2" />
          Labeled Transition System (LTS) / Reachability Graph
        </h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* States Panel */}
          <div>
            <h4 className="font-medium mb-3">States ({ltsData.states.length})</h4>
            <div className="max-h-48 overflow-y-auto space-y-2">
              {ltsData.states.map(state => {
                const getCurrentMarkingKey = () => {
                  if (!currentMarking) return '';
                  if (typeof currentMarking === 'object' && !Array.isArray(currentMarking)) {
                    return Object.keys(currentMarking).sort().map(place => `${place}:${currentMarking[place] || 0}`).join(',');
                  }
                  return '';
                };
                
                const currentMarkingKey = getCurrentMarkingKey();
                const stateMarkingKey = Object.keys(state.marking).sort().map(place => `${place}:${state.marking[place] || 0}`).join(',');
                const isCurrentState = currentMarkingKey === stateMarkingKey;
                
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
                      Marking: {state.label}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Transitions Panel */}
          <div>
            <h4 className="font-medium mb-3">LTS Transitions ({ltsData.transitions.length})</h4>
            <div className="max-h-48 overflow-y-auto space-y-2">
              {ltsData.transitions.map(transition => (
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
              ref={ltsCanvasRef}
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
      </div>
    </div>
  );
};

// ========== EXPORTS ==========
export default LTSReachabilityVisualization;
export { ReachabilityGraphGenerator };
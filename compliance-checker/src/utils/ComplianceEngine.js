// utils/ComplianceEngine.js

// Goal Model State Management
export class GoalModelState {
  constructor(goalModel) {
    this.goalModel = goalModel;
    this.marking = this.initializeMarking();
  }
  
  initializeMarking() {
    const marking = {};
    if (this.goalModel.elements) {
      this.goalModel.elements.forEach(element => {
        if (element.type === 'goal' || element.type === 'task') {
          marking[element.id] = { status: '?', pending: '?' };
        } else if (element.type === 'quality') {
          marking[element.id] = '?';
        }
      });
    }
    return marking;
  }
  
  executeTransition(elementId) {
    const element = this.goalModel.elements?.find(e => e.id === elementId);
    if (!element) return false;
    
    if (element.type === 'task' && this.isLeafNode(elementId)) {
      this.marking[elementId] = { status: '⊤', pending: '⊥' };
      this.propagateRefinements(elementId);
      this.propagateContributions(elementId);
      return true;
    }
    
    return false;
  }
  
  isLeafNode(elementId) {
    return !this.goalModel.refinements?.some(ref => ref.source === elementId);
  }
  
  propagateRefinements(elementId) {
    const refinements = this.goalModel.refinements?.filter(ref => ref.target === elementId) || [];
    refinements.forEach(ref => {
      if (ref.type === 'and') {
        const allTargetsCompleted = this.goalModel.refinements
          ?.filter(r => r.source === ref.source && r.type === 'and')
          ?.every(r => this.marking[r.target]?.status === '⊤') || false;
        
        if (allTargetsCompleted) {
          this.marking[ref.source] = { status: '⊤', pending: '⊥' };
        }
      } else if (ref.type === 'or') {
        this.marking[ref.source] = { status: '⊤', pending: '⊥' };
      }
    });
  }
  
  propagateContributions(elementId) {
    const contributions = this.goalModel.contributions?.filter(cont => cont.source === elementId) || [];
    contributions.forEach(cont => {
      if (cont.type === 'Make') {
        this.marking[cont.target] = '⊤';
      } else if (cont.type === 'Break') {
        this.marking[cont.target] = '⊥';
      }
    });
  }
  
  areAllQualitiesSatisfied() {
    const qualities = this.goalModel.elements?.filter(e => e.type === 'quality') || [];
    return qualities.every(q => this.marking[q.id] === '⊤');
  }
}

// Process Model State Management
export class ProcessModelState {
  constructor(processModel) {
    this.processModel = processModel;
    this.marking = this.initializeMarking();
  }
  
  initializeMarking() {
    const marking = {};
    this.processModel.places?.forEach(place => {
      marking[place.id] = place.id === 'start' || place.id === 'p0' ? 1 : 0;
    });
    return marking;
  }
  
  isTransitionEnabled(transitionId) {
    const transition = this.processModel.transitions?.find(t => t.id === transitionId);
    if (!transition) return false;
    
    const inputArcs = this.processModel.arcs?.filter(arc => arc.target === transitionId) || [];
    return inputArcs.every(arc => this.marking[arc.source] >= 1);
  }
  
  fireTransition(transitionId) {
    if (!this.isTransitionEnabled(transitionId)) return false;
    
    const inputArcs = this.processModel.arcs?.filter(arc => arc.target === transitionId) || [];
    const outputArcs = this.processModel.arcs?.filter(arc => arc.source === transitionId) || [];
    
    inputArcs.forEach(arc => {
      this.marking[arc.source] -= 1;
    });
    
    outputArcs.forEach(arc => {
      this.marking[arc.target] = (this.marking[arc.target] || 0) + 1;
    });
    
    return true;
  }
  
  getEnabledTransitions() {
    return this.processModel.transitions?.filter(t => this.isTransitionEnabled(t.id)) || [];
  }
}

// Compliance Engine
export class ComplianceEngine {
  constructor(goalModel, processModel, mapping) {
    this.goalModelState = new GoalModelState(goalModel);
    this.processModelState = new ProcessModelState(processModel);
    this.mapping = mapping;
    this.executionTrace = [];
  }
  
  checkCompliance() {
    const results = {
      isCompliant: false,
      executionPaths: [],
      violations: []
    };
    
    const paths = this.exploreExecutionPaths();
    results.executionPaths = paths;
    
    results.isCompliant = paths.every(path => 
      path.finalState.goalModel.areAllQualitiesSatisfied()
    );
    
    if (!results.isCompliant) {
      results.violations = this.identifyViolations(paths);
    }
    
    return results;
  }
  
  exploreExecutionPaths(maxDepth = 10) {
    const paths = [];
    const visited = new Set();
    
    const explore = (goalState, processState, trace, depth) => {
      if (depth >= maxDepth) return;
      
      const stateKey = this.getStateKey(goalState, processState);
      if (visited.has(stateKey)) return;
      visited.add(stateKey);
      
      const enabledTransitions = processState.getEnabledTransitions();
      
      if (enabledTransitions.length === 0) {
        paths.push({
          trace: [...trace],
          finalState: {
            goalModel: goalState,
            processModel: processState
          }
        });
        return;
      }
      
      enabledTransitions.forEach(transition => {
        const newProcessState = new ProcessModelState(processState.processModel);
        newProcessState.marking = { ...processState.marking };
        
        const newGoalState = new GoalModelState(goalState.goalModel);
        newGoalState.marking = { ...goalState.marking };
        
        if (newProcessState.fireTransition(transition.id)) {
          const mappedElement = this.getMappedElement(transition.id);
          if (mappedElement) {
            newGoalState.executeTransition(mappedElement);
          }
          
          explore(
            newGoalState,
            newProcessState,
            [...trace, { transition: transition.id, mappedElement }],
            depth + 1
          );
        }
      });
    };
    
    explore(this.goalModelState, this.processModelState, [], 0);
    return paths;
  }
  
  getMappedElement(transitionId) {
    const mappingEntry = this.mapping?.find(m => m.transitionId === transitionId);
    return mappingEntry?.goalElementId || null;
  }
  
  getStateKey(goalState, processState) {
    return JSON.stringify({
      goal: goalState.marking,
      process: processState.marking
    });
  }
  
  identifyViolations(paths) {
    const violations = [];
    
    paths.forEach((path, index) => {
      if (!path.finalState.goalModel.areAllQualitiesSatisfied()) {
        const unsatisfiedQualities = path.finalState.goalModel.goalModel.elements
          ?.filter(e => e.type === 'quality' && path.finalState.goalModel.marking[e.id] !== '⊤')
          ?.map(e => e.name || e.id) || [];
        
        violations.push({
          pathIndex: index,
          description: `Path ${index + 1} does not satisfy qualities: ${unsatisfiedQualities.join(', ')}`,
          trace: path.trace,
          unsatisfiedQualities
        });
      }
    });
    
    return violations;
  }
}
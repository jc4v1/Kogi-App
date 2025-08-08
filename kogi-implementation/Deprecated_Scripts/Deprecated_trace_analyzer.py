from goal_model import GoalModel
from enums import LinkType, ElementStatus
from demo_model import create_model
from typing import List, Dict
import json
from datetime import datetime

def analyze_traces(traces: List[List[str]], target_elements: List[str]):
    results = []
    
    for i, trace in enumerate(traces):
        model = create_model()
        trace_result = {
            'trace_number': i + 1,
            'events': trace,
            'states': []
        }
        
        for event in trace:
            model.process_event(event)
            trace_result['states'].append({
                'event': event,
                'qualities': model.qualities.copy(),
                'goals': model.goals.copy(),
                'tasks': model.tasks.copy()
            })
        
        results.append(trace_result)
        print(f"\nTrace {i+1} ({' -> '.join(trace)}):")
        print(f"Q1 final state: {model.qualities['Q1']}")
    
    return results

#Si se van a exportar resultados
# def export_results(results: List[Dict], filename: str = 'trace_analysis.json'):
#     with open(filename, 'w') as f:
#         json.dump(results, f, default=str, indent=2)
#   export_results(results)

# if __name__ == "__main__":
#     analyze_traces()
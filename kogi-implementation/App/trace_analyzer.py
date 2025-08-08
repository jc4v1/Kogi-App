import sys
import os
from typing import List, Dict
import json
from datetime import datetime

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from Implementation.goal_model import GoalModel
from Implementation.enums import LinkType, ElementStatus, QualityStatus

def create_model():
    model = GoalModel()
    
    # Add tasks
    tasks = ["T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8"]
    for task in tasks:
        model.add_task(task)
    
    # Add goals
    goals = ["G1", "G2", "G3"]
    for goal in goals:
        model.add_goal(goal)
    
    # Add quality
    model.add_quality("Q1")
    
    # Add links
    model.add_link("G3", "T8", LinkType.AND)
    model.add_link("T1", "T6", LinkType.AND)
    model.add_link("G1", "T2", LinkType.OR)
    model.add_link("Q1", "G2", LinkType.BREAK)
    model.add_link("Q1", "G1", LinkType.MAKE)
    model.add_link("G1", "T1", LinkType.OR)
    model.add_link("G3", "T1", LinkType.AND)
    model.add_link("T1", "T7", LinkType.AND)
    model.add_link("G2", "T3", LinkType.AND)
    model.add_link("G2", "T5", LinkType.AND)
    model.add_link("G2", "T4", LinkType.AND)
    
    # Add requirements
    model.requirements = {
        "G3": [['T8', 'T1']],
        "T1": [['T6', 'T7']],
        "G1": [['T2'], ['T1']],
        "G2": [['T3', 'T5', 'T4']]
    }
    
    # Add event mappings
    events = {
        "e1": "T1", 
        "e2": "T2", 
        "e3": [["T3"]],
        "e4": "T4", 
        "e5": "T5", 
        "e6": "T6",
        "e7": "T7", 
        "e8": "T8"
    }
    for event, target in events.items():
        model.add_event_mapping(event, target)
    
    return model

def analyze_traces(traces: List[List[str]], target_elements: List[str]):
    results = []
    satisfied_traces = []
    
    for i, trace in enumerate(traces):
        print(f"\n{'='*60}")
        print(f"EVALUATING TRACE {i + 1}: {' -> '.join(trace)}")
        print('='*60)
        
        model = create_model()
        trace_result = {
            'trace_number': i + 1,
            'events': trace,
            'states': []
        }
        
        # Process each event in the trace
        for event in trace:
            model.process_event(event)
            trace_result['states'].append({
                'event': event,
                'qualities': {k: v.value for k, v in model.qualities.items()},
                'goals': {k: v.value for k, v in model.goals.items()},
                'tasks': {k: v.value for k, v in model.tasks.items()}
            })
        
        # Print quality status first
        print(f"\nTrace {i+1} Quality Status:")
        for target in target_elements:
            if target in model.qualities:
                print(f"  {target}: {model._format_status(model.qualities[target])}")
        
        # Print final status of all elements
        model.print_final_status()
        
        # Check if trace satisfies target elements
        satisfied = False
        for target in target_elements:
            if target in model.qualities and model.qualities[target] == QualityStatus.FULFILLED:
                satisfied = True
            elif target in model.goals and model.goals[target] in [ElementStatus.TRUE_FALSE, ElementStatus.TRUE_TRUE]:
                satisfied = True
            elif target in model.tasks and model.tasks[target] in [ElementStatus.TRUE_FALSE, ElementStatus.TRUE_TRUE]:
                satisfied = True
        
        if satisfied:
            satisfied_traces.append(trace)
        
        results.append(trace_result)
    
    # Summary of satisfied traces
    print(f"\n{'='*60}")
    print("SUMMARY OF SATISFIED TRACES")
    print('='*60)
    print(f"Total traces evaluated: {len(traces)}")
    print(f"Satisfied traces: {len(satisfied_traces)}")
    print(f"Satisfaction rate: {len(satisfied_traces)/len(traces)*100:.1f}%")
    
    for idx, trace in enumerate(satisfied_traces, 1):
        print(f"Satisfied Trace #{idx}: [{' -> '.join(trace)}]")
    
    return results

def export_results(results: List[Dict], filename: str = 'trace_analysis.json'):
    folder = os.path.join("App", "Outputs")
    os.makedirs(folder, exist_ok=True)
    file_path = os.path.join(folder, filename)
    
    with open(file_path, 'w') as f:
        json.dump(results, f, default=str, indent=2)
    
    print(f"\nResults exported to: {file_path}")

def main():
    traces = [
        ["e6", "e2", "e3", "e4", "e5", "e7", "e8"],
        ["e6", "e2", "e3", "e4", "e5", "e7", "e1"],
        ["e6", "e3", "e2", "e4", "e5", "e7", "e1"],
        ["e6", "e3", "e2", "e4", "e5", "e7", "e8"]
    ]
    target_elements = ["Q1"]
    
    results = analyze_traces(traces, target_elements)
    export_results(results)
    
    # Ask user if they want to see detailed statistics
    print("\n" + "="*60)
    show_stats = input("Do you want to see detailed statistics? (y/n): ").lower().strip()
    
    if show_stats in ['y', 'yes']:
        print("\nLaunching detailed statistics analysis...")
        # Import and run statistics module
        try:
            from statistics_analysis import run_detailed_statistics
            run_detailed_statistics(traces, results)
        except ImportError:
            print("Statistics module not found. Creating basic statistics...")
            create_basic_statistics(traces, results)

def create_basic_statistics(traces: List[List[str]], results: List[Dict]):
    """Create basic statistics if detailed module is not available"""
    model = create_model()
    all_elements = list(model.tasks.keys()) + list(model.goals.keys()) + list(model.qualities.keys())
    
    element_stats = {}
    total_traces = len(traces)
    
    for element in all_elements:
        satisfied_count = 0
        satisfied_trace_nums = []
        
        for i, trace_result in enumerate(results):
            final_state = trace_result['states'][-1]
            
            # Check satisfaction based on element type and status
            satisfied = False
            if element in final_state['qualities']:
                satisfied = final_state['qualities'][element] == 'fulfilled'
            elif element in final_state['goals']:
                satisfied = final_state['goals'][element] in ['true_false', 'true_true']
            elif element in final_state['tasks']:
                satisfied = final_state['tasks'][element] in ['true_false', 'true_true']
            
            if satisfied:
                satisfied_count += 1
                satisfied_trace_nums.append(i + 1)
        
        satisfaction_percentage = (satisfied_count / total_traces) * 100 if total_traces > 0 else 0
        element_stats[element] = {
            'percentage': satisfaction_percentage,
            'satisfied_traces': satisfied_trace_nums,
            'count': satisfied_count
        }
    
    # Print detailed statistics table
    print("\n" + "="*80)
    print("DETAILED ELEMENT SATISFACTION STATISTICS")
    print("="*80)
    print(f"{'Element':<12} {'Type':<8} {'Satisfaction %':<15} {'Count':<8} {'Satisfied Traces'}")
    print("-"*80)
    
    for element in sorted(element_stats.keys()):
        stats = element_stats[element]
        element_type = 'Quality' if element in model.qualities else ('Goal' if element in model.goals else 'Task')
        traces_str = ', '.join(map(str, stats['satisfied_traces'])) if stats['satisfied_traces'] else 'None'
        
        print(f"{element:<12} {element_type:<8} {stats['percentage']:>10.1f}% {stats['count']:>8}/{total_traces} {traces_str}")
    
    print("="*80)

if __name__ == "__main__":
    main()
from typing import List, Dict
from collections import defaultdict
from Implementation.demo_model import create_model
from Implementation.enums import ElementStatus

def analyze_goal_patterns(trazas_unicas: List[List[str]]):
    """
    Analyze goal patterns based on the final status of goals and qualities after trace execution.
    """
    try:
        # Initialize data structures
        results = {
            'element_satisfaction': defaultdict(list),  # Track satisfaction per element
            'trace_results': []  # Store detailed trace results
        }
        
        # Analyze each trace
        for i, trace in enumerate(trazas_unicas):
            print(f"\nAnalyzing trace {i + 1}:")
            print(f"Events: {' -> '.join(trace)}")
            
            # Create fresh model for this trace
            model = create_model()
            
            # Process all events in the trace
            for event in trace:
                model.process_event(event)
            
            # Analyze final state after trace execution
            trace_result = {
                'trace_number': i + 1,
                'trace': trace,
                'satisfied_elements': {
                    'goals': [],
                    'qualities': []
                }
            }
            
            # Check goals' final state
            for goal in model.goals:
                is_satisfied = model.goals[goal] == ElementStatus.ACHIEVED
                results['element_satisfaction'][goal].append(is_satisfied)
                if is_satisfied:
                    trace_result['satisfied_elements']['goals'].append(goal)
            
            # Check qualities' final state
            for quality in model.qualities:
                is_satisfied = model.qualities[quality] == ElementStatus.FULFILLED
                results['element_satisfaction'][quality].append(is_satisfied)
                if is_satisfied:
                    trace_result['satisfied_elements']['qualities'].append(quality)
            
            results['trace_results'].append(trace_result)
        
        # Print comprehensive analysis
        print("\n=== Goal Pattern Analysis ===")
        print("\nElement Satisfaction Rates:")
        print("-" * 50)
        
        # Print goals analysis
        print("\nGoals:")
        for goal in sorted(model.goals):
            satisfactions = results['element_satisfaction'][goal]
            percentage = (sum(satisfactions) / len(satisfactions)) * 100
            satisfied_traces = [i + 1 for i, sat in enumerate(satisfactions) if sat]
            print(f"\n{goal}:")
            print(f"- Satisfaction rate: {percentage:.1f}%")
            print(f"- Satisfied in traces: {satisfied_traces if satisfied_traces else 'None'}")
        
        # Print qualities analysis
        print("\nQualities:")
        for quality in sorted(model.qualities):
            satisfactions = results['element_satisfaction'][quality]
            percentage = (sum(satisfactions) / len(satisfactions)) * 100
            satisfied_traces = [i + 1 for i, sat in enumerate(satisfactions) if sat]
            print(f"\n{quality}:")
            print(f"- Satisfaction rate: {percentage:.1f}%")
            print(f"- Satisfied in traces: {satisfied_traces if satisfied_traces else 'None'}")
        
        # Print trace-by-trace analysis
        print("\nDetailed Trace Analysis:")
        print("-" * 50)
        
        for result in results['trace_results']:
            trace_num = result['trace_number']
            trace = result['trace']
            satisfied = result['satisfied_elements']
            
            print(f"\nTrace {trace_num}:")
            print(f"Events: {' -> '.join(trace)}")
            print("Satisfied elements:")
            print(f"- Goals: {', '.join(satisfied['goals']) if satisfied['goals'] else 'None'}")
            print(f"- Qualities: {', '.join(satisfied['qualities']) if satisfied['qualities'] else 'None'}")
        
    except Exception as e:
        print(f"Error during analysis: {str(e)}")

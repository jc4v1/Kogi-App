import sys
import os
from typing import List, Dict
import json
from datetime import datetime

# Add the Implementation directory to the path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from Implementation.goal_model import GoalModel
from Implementation.enums import LinkType, ElementStatus, QualityStatus

def create_model():
    """Create the goal model with all tasks, goals, qualities, links, and requirements"""
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
        "e1": "G1", 
        "e2": "T2", 
        "e3": [["T3", "G1"]],
        "e4": "T4", 
        "e5": "T5", 
        "e6": "T6",
        "e7": "T7", 
        "e8": "T8"
    }
    for event, target in events.items():
        model.add_event_mapping(event, target)
    
    return model

def interactive_evaluation():
    """Run interactive evaluation with user input events"""
    print("="*60)
    print("INTERACTIVE GOAL MODEL EVALUATION")
    print("="*60)
    print("Available events: e1, e2, e3, e4, e5, e6, e7, e8")
    print("Event mappings:")
    print("  e1 -> G1")
    print("  e2 -> T2") 
    print("  e3 -> T3, G1")
    print("  e4 -> T4")
    print("  e5 -> T5")
    print("  e6 -> T6")
    print("  e7 -> T7")
    print("  e8 -> T8")
    print("\nType events one by one (or 'stop' to finish, 'status' to see current state):")
    print("="*60)
    
    # Create the model
    model = create_model()
    
    # Track the sequence of events
    event_sequence = []
    
    # Create results structure for statistics
    trace_result = {
        'trace_number': 1,
        'events': [],
        'states': []
    }
    
    while True:
        # Get user input
        user_input = input("\nEnter event: ").strip().lower()
        
        # Check for special commands
        if user_input == "stop":
            break
        elif user_input == "status":
            model.print_final_status()
            continue
        elif user_input == "help":
            print("Available commands:")
            print("  e1, e2, e3, e4, e5, e6, e7, e8 - Process events")
            print("  status - Show current status of all elements")
            print("  stop - End evaluation")
            print("  help - Show this help message")
            continue
        elif user_input == "":
            continue
        
        # Validate event
        if user_input not in ["e1", "e2", "e3", "e4", "e5", "e6", "e7", "e8"]:
            print(f"Invalid event '{user_input}'. Available events: e1, e2, e3, e4, e5, e6, e7, e8")
            continue
        
        # Process the event
        event_sequence.append(user_input)
        model.process_event(user_input)
        
        # Record state for statistics
        trace_result['events'].append(user_input)
        trace_result['states'].append({
            'event': user_input,
            'qualities': {k: v.value for k, v in model.qualities.items()},
            'goals': {k: v.value for k, v in model.goals.items()},
            'tasks': {k: v.value for k, v in model.tasks.items()}
        })
        
        # Show current quality status
        print(f"\nCurrent Quality Status:")
        for quality_id, status in model.qualities.items():
            print(f"  {quality_id}: {model._format_status(status)}")
    
    # Final summary
    print(f"\n{'='*60}")
    print("EVALUATION SUMMARY")
    print("="*60)
    print(f"Event sequence: {' -> '.join(event_sequence)}")
    
    # Show final status
    model.print_final_status()
    
    # Check if target quality is satisfied
    target_satisfied = any(
        model.qualities[quality] == QualityStatus.FULFILLED 
        for quality in model.qualities
    )
    
    print(f"\nTarget Quality Q1 Status: {model._format_status(model.qualities['Q1'])}")
    print(f"Evaluation Result: {'SUCCESS' if target_satisfied else 'NOT SATISFIED'}")
    
    # Ask for statistics
    if event_sequence:  # Only if events were processed
        print(f"\n{'='*60}")
        show_stats = input("Do you want to see detailed statistics? (y/n): ").lower().strip()
        
        if show_stats in ['y', 'yes']:
            # Create statistics using the processed trace
            results = [trace_result]
            traces = [event_sequence]
            
            print("\nGenerating statistics for your evaluation...")
            statistics = model.generate_statistics(traces, results)
    
    # Ask if user wants to save the session
    if event_sequence:
        save_session = input("\nDo you want to save this evaluation session? (y/n): ").lower().strip()
        
        if save_session in ['y', 'yes']:
            save_evaluation_session(event_sequence, trace_result, model)
    
    print(f"\n{'='*60}")
    print("SESSION COMPLETED")
    print("="*60)

def save_evaluation_session(event_sequence: List[str], trace_result: Dict, model: GoalModel):
    """Save the evaluation session to a file"""
    folder = os.path.join("App", "Outputs")
    os.makedirs(folder, exist_ok=True)
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"interactive_session_{timestamp}.json"
    file_path = os.path.join(folder, filename)
    
    session_data = {
        "session_info": {
            "timestamp": datetime.now().isoformat(),
            "event_sequence": event_sequence,
            "total_events": len(event_sequence)
        },
        "final_status": {
            "qualities": {k: v.value for k, v in model.qualities.items()},
            "goals": {k: v.value for k, v in model.goals.items()},
            "tasks": {k: v.value for k, v in model.tasks.items()}
        },
        "trace_result": trace_result
    }
    
    with open(file_path, 'w') as f:
        json.dump(session_data, f, indent=2)
    
    print(f"Session saved to: {file_path}")

def run_predefined_traces():
    """Run evaluation with predefined traces (original functionality)"""
    print("="*60)
    print("PREDEFINED TRACES EVALUATION")
    print("="*60)
    
    # Define the traces to evaluate
    traces = [
        ["e6", "e2", "e3", "e4", "e5", "e7", "e8"],
        ["e6", "e2", "e3", "e4", "e5", "e7", "e1"],
        ["e6", "e3", "e2", "e4", "e5", "e7", "e1"],
        ["e6", "e3", "e2", "e4", "e5", "e7", "e8"]
    ]
    
    # Define target elements to check for satisfaction
    target_elements = ["Q1"]
    
    # Run the analysis
    results = analyze_traces(traces, target_elements)
    
    # Export results
    export_results(results)
    
    # Ask user if they want to see detailed statistics
    print("\n" + "="*60)
    show_stats = input("Do you want to see detailed statistics? (y/n): ").lower().strip()
    
    if show_stats in ['y', 'yes']:
        print("\nGenerating detailed statistics...")
        model = create_model()
        statistics = model.generate_statistics(traces, results)

def analyze_traces(traces: List[List[str]], target_elements: List[str]):
    """Analyze a list of traces and determine satisfaction"""
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
    """Export results to JSON file"""
    folder = os.path.join("App", "Outputs")
    os.makedirs(folder, exist_ok=True)
    file_path = os.path.join(folder, filename)
    
    with open(file_path, 'w') as f:
        json.dump(results, f, default=str, indent=2)
    
    print(f"\nResults exported to: {file_path}")

def main():
    """Main function - choose between interactive or predefined evaluation"""
    print("="*60)
    print("GOAL MODEL EVALUATION SYSTEM")
    print("="*60)
    print("Choose evaluation mode:")
    print("1. Interactive evaluation (enter events manually)")
    print("2. Predefined traces evaluation")
    print("="*60)
    
    while True:
        choice = input("Enter your choice (1 or 2): ").strip()
        
        if choice == "1":
            interactive_evaluation()
            break
        elif choice == "2":
            run_predefined_traces()
            break
        else:
            print("Invalid choice. Please enter 1 or 2.")

if __name__ == "__main__":
    main()
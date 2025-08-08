def analyze_all_traces_compliance(all_traces, target_elements):
    """
    Analyze all traces for compliance with goal model.
    Returns detailed information about all traces.
    
    Args:
        all_traces: List of all possible traces
        target_elements: List of target elements from goal model
    
    Returns:
        dict: Compliance result with details about all traces
    """
    result = {
        'total_traces': len(all_traces),
        'compliant_traces': [],
        'non_compliant_traces': []
    }
    
    print(f"Checking compliance for {len(all_traces)} traces...")
    
    for i, trace in enumerate(all_traces):
        # Check this trace for compliance
        compliance_check = check_trace_compliance(trace, target_elements)
        
        if compliance_check['is_compliant']:
            result['compliant_traces'].append({
                'index': i,
                'trace': trace
            })
        else:
            result['non_compliant_traces'].append({
                'index': i,
                'trace': trace,
                'reason': compliance_check['reason']
            })
        
        # Progress indicator for large trace sets
        if (i + 1) % 1000 == 0:
            print(f"Checked {i + 1} traces so far...")
    
    return result


def check_trace_compliance(trace, target_elements):
    """
    Check if a single trace is compliant with the goal model.
    
    Args:
        trace: Single trace (list of activities)
        target_elements: Target elements from goal model
    
    Returns:
        dict: {'is_compliant': bool, 'reason': str}
    """
    try:
        # Import your goal model (this should be dynamically generated)
        import sys
        import os
        
        # Add the path where demo_model.py is generated
        sys.path.append(os.path.dirname(os.path.abspath(__file__)))
        
        # Import the dynamically generated goal model
        from demo_model import evaluate_goal_satisfaction
        
        # Evaluate the trace against the goal model
        satisfaction_result = evaluate_goal_satisfaction(trace, target_elements)
        
        # Check if all target elements are satisfied
        if satisfaction_result['all_satisfied']:
            return {'is_compliant': True, 'reason': None}
        else:
            unsatisfied = [elem for elem, satisfied in satisfaction_result['results'].items() 
                          if not satisfied]
            return {
                'is_compliant': False, 
                'reason': f"Unsatisfied elements: {unsatisfied}"
            }
            
    except ImportError as e:
        return {
            'is_compliant': False, 
            'reason': f"Could not import goal model: {e}"
        }
    except Exception as e:
        return {
            'is_compliant': False, 
            'reason': f"Error evaluating trace: {e}"
        }


def analyze_traces(traces, target_elements):
    """
    Original function - kept for backward compatibility
    Modified to work with the new compliance checking approach
    """
    print(f"Analyzing {len(traces)} traces...")
    
    compliant_count = 0
    non_compliant_traces = []
    
    for i, trace in enumerate(traces):
        compliance_check = check_trace_compliance(trace, target_elements)
        
        if compliance_check['is_compliant']:
            compliant_count += 1
        else:
            non_compliant_traces.append({
                'index': i,
                'trace': trace,
                'reason': compliance_check['reason']
            })
    
    print(f"Compliance Summary:")
    print(f"  Total traces: {len(traces)}")
    print(f"  Compliant: {compliant_count}")
    print(f"  Non-compliant: {len(non_compliant_traces)}")
    
    if non_compliant_traces:
        print(f"\nFirst few non-compliant traces:")
        for i, nc_trace in enumerate(non_compliant_traces[:5]):
            print(f"  {i+1}. Trace {nc_trace['index']}: {nc_trace['trace']}")
            print(f"     Reason: {nc_trace['reason']}")
    
    return {
        'total': len(traces),
        'compliant': compliant_count,
        'non_compliant': len(non_compliant_traces),
        'non_compliant_details': non_compliant_traces
    }
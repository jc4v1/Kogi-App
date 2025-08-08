import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from App.bpmn_all_traces import process_bpmn_file_all_traces  # Modified function
from Implementation.get_traces import get_bpmn_file_path
from Implementation.get_mapping import get_mapping_file_path
from Implementation.istar_processor import process_istar_model
from Implementation.mapping_updater import update_event_mappings
from App.alltraces import analyze_all_traces_compliance  # Modified function
from Implementation.goal_pattern_analyzer import analyze_goal_patterns


def main():
    # 1. Receive a BPMN Model (XML), generate ALL possible traces
    try:
        bpmn_path = get_bpmn_file_path()
        all_traces = process_bpmn_file_all_traces(bpmn_path)  # Generate all possible traces
        
        if not all_traces:
            raise ValueError("No traces generated. Step 1 failed.")
        
        print(f"Step 1 completed successfully. Generated {len(all_traces)} total traces")
        print(f"Sample traces: {list(all_traces)[:5]}...")  # Show first 5 traces
        
    except Exception as e:
        print(f"Error in Step 1: {e}")
        return  # Stop execution if Step 1 fails

    # 2. Receive Goal Model (.json) and build the demo_model.py
    try:
        process_istar_model()
        print("Step 2 completed successfully.")
    except Exception as e:
        print(f"Error in Step 2: {e}")
        return  # Stop execution if Step 2 fails

    # 3. Receive the mapping (CSV or XLSX) and update the file demo_model.py
    try:
        mapping_file = get_mapping_file_path()
        update_event_mappings(mapping_file)
        print("Step 3 completed successfully.")
        print(" ")
    except Exception as e:
        print(f"Error in Step 3: {e}")
        return  # Stop execution if Step 3 fails

    # 4. Asking for the target elements
    try:
        user_input = input("Enter the target elements separated by commas (e.g. Q1, G1): ")
        target_elements = [element.strip() for element in user_input.split(',')]
        print("\nTarget elements:", target_elements)
        print(" ")
    except Exception as e:
        print(f"Error in Step 4: {e}")
        return  # Stop execution if target input fails

    # 5. Analyze ALL traces for compliance
    try:
        print("Analyzing all traces for compliance...")
        compliance_result = analyze_all_traces_compliance(all_traces, target_elements)
        
        # Check if all analyzed traces are satisfied
        total_analyzed = compliance_result['total_traces']
        satisfied_traces = total_analyzed - len(compliance_result.get('non_compliant_traces', []))
        
        if satisfied_traces == total_analyzed:
            print("Process model is compliant with goal model")
        else:
            print("Process model is not compliant with goal model")
        
        print(f"Total traces analyzed: {total_analyzed}")
        print(f"Satisfied traces: {satisfied_traces}")
        print(f"Non-compliant traces: {total_analyzed - satisfied_traces}")
        
        print(" ")
        
    except Exception as e:
        print(f"Error in Step 5: {e}")

    # 6. Goal Pattern Analysis (optional - only if all traces are compliant)
    if compliance_result.get('is_compliant', False):
        try:
            print("Since all traces are compliant, performing goal pattern analysis:")
            analyze_goal_patterns(all_traces)
            print(" ")
        except Exception as e:
            print(f"Error in Step 6: {e}")


if __name__ == "__main__":
    # BPMN_FILE_PATH = "Data\DEMO.bpmn"
    # ISTAR_FILE_PATH = "Data\Demo.json"
    # MAPPING_FILE_PATH = "Data\Mapping1to1.xlsx"
    
    main()
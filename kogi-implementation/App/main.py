import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from Implementation.bpmn_processor import process_bpmn_file
from Implementation.get_traces import  get_bpmn_file_path
from Implementation.get_mapping import get_mapping_file_path
from Implementation.istar_processor import process_istar_model
from Implementation.mapping_updater import update_event_mappings
from App.trace_analyzer import analyze_traces
from App.compliance_designtime import analyze_all_traces_compliance
from Implementation.goal_pattern_analyzer import analyze_goal_patterns


def main():

   #1. Recieve a BPMN Model (XML), generate and format the traces.
    try:
     bpmn_path = get_bpmn_file_path()
     traces = process_bpmn_file(bpmn_path)
    
     if not traces:
            raise ValueError("No traces generated. Step 1 failed.")
            print(f"Step 1 completed successfully. Traces: {traces}")
    except Exception as e:
        print(f"Error in Step 1: {e}")
        return  # Stop execution if Step 1 fails.

#2. Recieve Goal Model (.json) and build the demo_model.py
    try:
        process_istar_model()
        print("Step 2 completed successfully.")
    except Exception as e:
            print(f"Error in Step 2: {e}")
            return  # Stop execution if Step 2 fails.
            
 # 3. Recieve the mapping (CSV or XLSX) and update the file demo_model.py
    try:
        mapping_file = get_mapping_file_path()
        update_event_mappings(mapping_file)
        print("Step 3 completed successfully.")
        print(" ")
    except Exception as e:
        print(f"Error in Step 3: {e}")
        return  # Stop execution if Step 3 fails.

    # 4. Asking for the target elements
    try:
        user_input = input("Enter the target elements separated by commas (e.g. Q1, G1): ")
        target_elements = [element.strip() for element in user_input.split(',')]
        print("\nTarget elements:", target_elements)
        print(" ")
    except Exception as e:
        print(f"Error in Step 4: {e}")
        return  # Stop execution if target input fails
    
    # 5. Analyze the traces

    try:
        print("Your traces has been analyzed: ")
        analyze_traces(traces, target_elements)
        print(" ")
    except Exception as e:
        print(f"Error in Step 5: {e}")

# # 6. Goal Pattern Analysis
#     try:
#          print("Based on your traces, this is your goal pattern analysis: ")
#          analyze_goal_patterns(traces)
#          print(" ")
#     except Exception as e:
#          print(f"Error in Step 6: {e}")
        
# Assigns the PATHS for the different variables.
# By Default the application will ask you to enter the PATH Manually. 
# But for quickly analysis you can configure the PATHS Here:

if __name__ == "__main__":
 #   BPMN_FILE_PATH = "Data\DEMO.bpmn"
 #   ISTAR_FILE_PATH = "Data\Demo.json"
#  MAPPING_FILE_PATH = "Data\Mapping1to1.xlsx"

    main()

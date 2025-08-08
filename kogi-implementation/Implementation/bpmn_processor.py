"""
BPMN Processor


    Process a BPMN file and return unique traces.

    Parameters:
        file_path (str): The path to the BPMN file.

    Returns:
        List[List[str]]: A list of unique traces, where each trace is a list of activity names.
"""

import pm4py
import os
from typing import List


def process_bpmn_file(file_path: str) -> List[List[str]]:
   # Load and convert BPMN to Petri net
   bpmn_model = pm4py.read_bpmn(file_path)
   net, initial_marking, final_marking = pm4py.convert_to_petri_net(bpmn_model)

   # Generate log and get variants
   log = pm4py.play_out(net, initial_marking, final_marking)
   print(f"Total traces: {len(log)}")
   variants = pm4py.get_variants(log)
   print(f"Different variants: {len(variants)}")

   # Extract unique traces
   unique_traces = []
   for variant_trace in variants.values():
       activities = [event['concept:name'] for event in variant_trace[0]]
       unique_traces.append(activities)

   # Print traces for verification
   print("\nUnique traces found:")
   for i, trace in enumerate(unique_traces):
       print(f"Trace {i}: {trace}")

   # Divisor
   print("  ")

   return unique_traces

if __name__ == "__main__":
    process_bpmn_file()

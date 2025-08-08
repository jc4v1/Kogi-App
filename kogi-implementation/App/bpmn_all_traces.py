import xml.etree.ElementTree as ET
from collections import defaultdict, deque

def process_bpmn_file_all_traces(bpmn_file_path):
    """
    Generate ALL possible traces from a BPMN model with improved parsing.
    """
    try:
        print(f"Processing BPMN file: {bpmn_file_path}")
        
        # Parse the BPMN XML file
        tree = ET.parse(bpmn_file_path)
        root = tree.getroot()
        
        # Print namespace info for debugging
        print(f"Root tag: {root.tag}")
        print(f"Root attributes: {root.attrib}")
        
        # Find the namespace
        namespace = None
        if root.tag.startswith('{'):
            namespace = root.tag.split('}')[0] + '}'
            print(f"Detected namespace: {namespace}")
        
        # Find all elements
        activities = {}
        gateways = {}
        events = {}
        sequence_flows = {}
        
        # More flexible element detection
        for element in root.iter():
            element_id = element.get('id')
            element_name = element.get('name', element_id)
            tag_name = element.tag.lower()
            
            if element_id:
                if any(keyword in tag_name for keyword in ['task', 'activity', 'subprocess']):
                    activities[element_id] = {
                        'id': element_id,
                        'name': element_name,
                        'type': 'activity',
                        'tag': element.tag
                    }
                    print(f"Found activity: {element_id} - {element_name}")
                    
                elif 'gateway' in tag_name:
                    gateways[element_id] = {
                        'id': element_id,
                        'name': element_name,
                        'type': 'gateway',
                        'tag': element.tag
                    }
                    print(f"Found gateway: {element_id} - {element_name}")
                    
                elif 'event' in tag_name:
                    event_type = 'start' if 'start' in tag_name else ('end' if 'end' in tag_name else 'intermediate')
                    events[element_id] = {
                        'id': element_id,
                        'name': element_name,
                        'type': event_type,
                        'tag': element.tag
                    }
                    print(f"Found {event_type} event: {element_id} - {element_name}")
                    
                elif 'sequenceflow' in tag_name or 'flow' in tag_name:
                    source = element.get('sourceRef')
                    target = element.get('targetRef')
                    if source and target:
                        sequence_flows[element_id] = {
                            'id': element_id,
                            'source': source,
                            'target': target
                        }
                        print(f"Found flow: {source} -> {target}")
        
        print(f"\nSummary:")
        print(f"Activities: {len(activities)}")
        print(f"Gateways: {len(gateways)}")
        print(f"Events: {len(events)}")
        print(f"Sequence flows: {len(sequence_flows)}")
        
        if not sequence_flows:
            print("No sequence flows found! Cannot generate traces.")
            return []
        
        # Build adjacency graph
        graph = defaultdict(list)
        all_elements = {**activities, **gateways, **events}
        
        for flow in sequence_flows.values():
            graph[flow['source']].append(flow['target'])
        
        print(f"\nGraph structure:")
        for node, targets in graph.items():
            node_name = all_elements.get(node, {}).get('name', node)
            target_names = [all_elements.get(t, {}).get('name', t) for t in targets]
            print(f"  {node} ({node_name}) -> {targets} ({target_names})")
        
        # Find start and end events
        start_events = [e_id for e_id, e_info in events.items() if e_info['type'] == 'start']
        end_events = [e_id for e_id, e_info in events.items() if e_info['type'] == 'end']
        
        print(f"\nStart events: {start_events}")
        print(f"End events: {end_events}")
        
        if not start_events:
            print("No start events found! Looking for nodes with no incoming flows...")
            # Find nodes with no incoming connections
            all_targets = set()
            for flow in sequence_flows.values():
                all_targets.add(flow['target'])
            
            start_events = [node for node in graph.keys() if node not in all_targets]
            print(f"Potential start nodes: {start_events}")
        
        if not end_events:
            print("No end events found! Looking for nodes with no outgoing flows...")
            # Find nodes with no outgoing connections
            end_events = [node for node in all_elements.keys() if node not in graph or not graph[node]]
            print(f"Potential end nodes: {end_events}")
        
        if not start_events or not end_events:
            print("Cannot find start or end points in the process!")
            return []
        
        # Generate all possible paths
        all_traces = set()
        max_depth = 20  # Prevent infinite loops
        
        def generate_all_paths(current_node, current_path, visited):
            if len(current_path) > max_depth:
                return
            
            # If we reached an end event, save the trace
            if current_node in end_events:
                # Build trace from activities only
                trace = []
                for node in current_path:
                    if node in activities:
                        trace.append(all_elements[node]['name'])
                
                if trace:  # Only add non-empty traces
                    all_traces.add(tuple(trace))
                    print(f"Found trace: {trace}")
                return
            
            # Explore all outgoing paths
            for next_node in graph.get(current_node, []):
                if next_node not in visited or next_node in end_events:
                    new_visited = visited.copy()
                    new_visited.add(current_node)
                    generate_all_paths(next_node, current_path + [next_node], new_visited)
        
        print(f"\nGenerating traces...")
        # Generate traces from each start event
        for start_event in start_events:
            print(f"Starting from: {start_event}")
            generate_all_paths(start_event, [start_event], set())
        
        # Convert back to list of lists
        result_traces = [list(trace) for trace in all_traces]
        
        print(f"\nGenerated {len(result_traces)} unique traces:")
        for i, trace in enumerate(result_traces):
            print(f"  Trace {i+1}: {trace}")
        
        return result_traces
        
    except Exception as e:
        print(f"Error processing BPMN file: {e}")
        import traceback
        traceback.print_exc()
        return []

# Test function to debug BPMN structure
def debug_bpmn_structure(bpmn_file_path):
    """Debug function to inspect BPMN file structure"""
    try:
        tree = ET.parse(bpmn_file_path)
        root = tree.getroot()
        
        print("=== BPMN STRUCTURE DEBUG ===")
        print(f"Root: {root.tag}")
        print(f"Attributes: {root.attrib}")
        
        print("\nAll elements found:")
        for i, element in enumerate(root.iter()):
            if element.get('id'):
                print(f"{i}: {element.tag} - ID: {element.get('id')} - Name: {element.get('name')}")
                print(f"   Attributes: {element.attrib}")
        
    except Exception as e:
        print(f"Error debugging BPMN: {e}")

if __name__ == "__main__":
    # Test with your BPMN file
    bpmn_path = "Data/DEMO.bpmn"
    debug_bpmn_structure(bpmn_path)
    print("\n" + "="*50 + "\n")
    traces = process_bpmn_file_all_traces(bpmn_path)
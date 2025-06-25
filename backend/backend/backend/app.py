# app.py (Flask Backend)
from flask import Flask, request, jsonify
from flask_cors import CORS
import tempfile
import os
from pm4py.objects.petri_net.utils.reachability_graph import construct_reachability_graph
from pm4py.objects.petri_net.importer import importer as pnml_importer

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend requests

@app.route('/api/pm4py/reachability-graph', methods=['POST'])
def generate_reachability_graph():
    try:
        data = request.get_json()
        pnml_content = data.get('pnml')
        process_model = data.get('processModel')
        
        if not pnml_content:
            return jsonify({'error': 'PNML content is required'}), 400
        
        # Create temporary PNML file
        with tempfile.NamedTemporaryFile(mode='w', suffix='.pnml', delete=False) as temp_file:
            temp_file.write(pnml_content)
            temp_file_path = temp_file.name
        
        try:
            # Load Petri net from PNML file using PM4Py
            net, initial_marking, final_marking = pnml_importer.apply(temp_file_path)
            
            # Construct the reachability graph using PM4Py
            reachability_graph = construct_reachability_graph(net, initial_marking)
            
            # Convert PM4Py reachability graph to our format
            states = []
            transitions = []
            
            # Process states from PM4Py
            for i, state in enumerate(reachability_graph.states):
                # Convert PM4Py marking to our format
                marking_dict = {}
                for place in net.places:
                    marking_dict[place.name] = state.marking.get(place, 0)
                
                states.append({
                    'id': f'S{i}',
                    'marking': marking_dict,
                    'isInitial': state == reachability_graph.states[0],  # First state is initial
                    'isTerminal': len([arc for arc in reachability_graph.arcs if arc.source == state]) == 0
                })
            
            # Process transitions from PM4Py
            for i, arc in enumerate(reachability_graph.arcs):
                source_index = list(reachability_graph.states).index(arc.source)
                target_index = list(reachability_graph.states).index(arc.target)
                
                transitions.append({
                    'id': f'T{i}',
                    'source': f'S{source_index}',
                    'target': f'S{target_index}',
                    'label': arc.transition.label if arc.transition.label else arc.transition.name
                })
            
            result = {
                'states': states,
                'transitions': transitions,
                'stats': {
                    'total_states': len(states),
                    'total_transitions': len(transitions),
                    'generated_with': 'PM4Py construct_reachability_graph'
                }
            }
            
            return jsonify(result)
            
        finally:
            # Clean up temporary file
            os.unlink(temp_file_path)
            
    except Exception as e:
        return jsonify({'error': f'Error processing with PM4Py: {str(e)}'}), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    try:
        # Test PM4Py import
        import pm4py
        return jsonify({
            'status': 'healthy',
            'pm4py_version': pm4py.__version__
        })
    except ImportError:
        return jsonify({
            'status': 'error',
            'message': 'PM4Py not installed'
        }), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
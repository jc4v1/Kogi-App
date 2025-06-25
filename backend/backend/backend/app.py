from flask import Flask, request, jsonify
from flask_cors import CORS
import tempfile
import os
import traceback
import logging
from datetime import datetime
from pm4py.objects.petri_net.importer import importer as pnml_importer
from pm4py.objects.petri_net.utils import reachability_graph

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('app.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend requests

@app.route('/api/pm4py/reachability-graph', methods=['POST'])
def generate_reachability_graph():
    """Generate reachability graph from PNML file."""
    request_time = datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')
    logger.info(f"[{request_time}] Received reachability graph request")
    
    temp_file_path = None
    try:
        # Check for file in request
        if 'pnml_file' not in request.files:
            logger.warning("No PNML file in request")
            return jsonify({'error': 'PNML file is required'}), 400
            
        pnml_file = request.files['pnml_file']
        logger.debug(f"Processing PNML file")
        
        # Save to temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pnml') as temp_file:
            pnml_file.save(temp_file)
            temp_file_path = temp_file.name
            logger.debug(f"Saved to temporary file: {temp_file_path}")

        # Import PNML
        logger.debug("Importing PNML with PM4Py...")
        net, initial_marking, final_marking = pnml_importer.apply(temp_file_path)
        logger.info("PNML imported successfully")

        # Generate reachability graph
        logger.debug("Constructing reachability graph...")
        rg = reachability_graph.construct_reachability_graph(net, initial_marking)
        logger.info("Reachability graph constructed")

        # Process states
        states = []
        for i, state in enumerate(rg.states):
            # marking extraction as before
            # ...
            states.append({
                'id': f'S{i}',
                'marking': marking_dict,
                'isInitial': i == 0,
                'isTerminal': len([t for t in rg.transitions if t.source == state]) == 0
            })

        transitions = []
        for i, transition in enumerate(rg.transitions):
            source_index = list(rg.states).index(transition.source)
            target_index = list(rg.states).index(transition.target)
            transitions.append({
                'id': f'T{i}',
                'source': f'S{source_index}',
                'target': f'S{target_index}',
                'label': getattr(transition, 'label', '') or getattr(transition, 'name', '')
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
        
        logger.info(f"Successfully generated graph with {len(states)} states and {len(transitions)} transitions")
        return jsonify(result)

    except Exception as e:
        error_msg = f"Error processing with PM4Py: {str(e)}"
        logger.error(error_msg)
        logger.error("Full traceback:")
        logger.error(traceback.format_exc())
        return jsonify({'error': error_msg}), 500

    finally:
        # Cleanup
        if temp_file_path and os.path.exists(temp_file_path):
            try:
                os.unlink(temp_file_path)
                logger.debug(f"Removed temporary file: {temp_file_path}")
            except Exception as e:
                logger.error(f"Error removing temporary file: {str(e)}")

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint."""
    try:
        import pm4py
        return jsonify({
            'status': 'healthy',
            'pm4py_version': pm4py.__version__,
            'server_time': datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')
        })
    except ImportError as e:
        return jsonify({
            'status': 'error',
            'message': f"PM4Py not installed: {str(e)}"
        }), 500

if __name__ == '__main__':
    logger.info("Starting Flask application...")
    app.run(debug=True, port=5000)
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
CORS(app)

def marking_to_str(marking):
    """Convert a marking (dict) to a string like p1_1p2_2 for tokens in each place."""
    if isinstance(marking, dict):
        # Only show places with tokens > 0, sort for consistent IDs
        parts = [f"{place.name}{count}" for place, count in marking.items() if count > 0]
        return "_".join(sorted(parts)) if parts else "empty"
    return str(marking)

@app.route('/api/pm4py/reachability-graph', methods=['POST'])
def generate_reachability_graph():
    """Generate reachability graph from PNML file (upload or local file)."""
    request_time = datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')
    logger.info(f"[{request_time}] Received reachability graph request from {request.remote_addr}")
    
    temp_file_path = None
    try:
        # Try to get the uploaded file
        if 'pnml_file' in request.files:
            pnml_file = request.files['pnml_file']
            with tempfile.NamedTemporaryFile(delete=False, suffix='.pnml') as temp_file:
                pnml_file.save(temp_file)
                temp_file_path = temp_file.name
                logger.debug(f"Saved to temporary file: {temp_file_path}")
        else:
            # Fall back to local file
            local_pnml_path = os.path.join(os.path.dirname(__file__), 'model.pnml')
            if os.path.exists(local_pnml_path):
                temp_file_path = local_pnml_path
                logger.debug(f"Using local file: {temp_file_path}")
            else:
                logger.warning("No PNML file uploaded and no local file found")
                return jsonify({'error': 'PNML file is required (upload as pnml_file or place model.pnml in server directory)'}), 400

        # Import PNML
        logger.debug("Importing PNML with PM4Py...")
        net, initial_marking, final_marking = pnml_importer.apply(temp_file_path)
        logger.info("PNML imported successfully")

        # Generate reachability graph
        logger.debug("Constructing reachability graph...")
        rg = reachability_graph.construct_reachability_graph(net, initial_marking)
        logger.info("Reachability graph constructed")

        # Build state IDs by marking string for consistent reference
        marking_to_stateid = {}
        states = []
        for i, state in enumerate(rg.states):
            if hasattr(state, 'marking'):
                marking = state.marking
            elif hasattr(state, 'marking_dict'):
                marking = state.marking_dict
            elif isinstance(state, dict):
                marking = state.get('marking', {})
            else:
                marking = {}
            marking_str = marking_to_str(marking)
            marking_to_stateid[marking_str] = i
            marking_dict = {place.name: marking.get(place, 0) for place in net.places}
            states.append({
                'id': marking_str,
                'marking': marking_dict,
                'isInitial': i == 0,
                'isTerminal': len([t for t in rg.transitions if (
                    (isinstance(t, tuple) and t[0] == state) or 
                    (hasattr(t, 'source') and t.source == state)
                )]) == 0
            })

        # Build transitions (edges) using marking strings
        transitions = []
        logger.debug("Processing transitions...")
        for i, t in enumerate(rg.transitions):
            try:
                # Tuple format (source_state, transition, target_state)
                if isinstance(t, tuple) and len(t) == 3:
                    source_state, transition, target_state = t
                    if hasattr(source_state, 'marking'):
                        source_marking = source_state.marking
                    elif hasattr(source_state, 'marking_dict'):
                        source_marking = source_state.marking_dict
                    elif isinstance(source_state, dict):
                        source_marking = source_state.get('marking', {})
                    else:
                        source_marking = {}
                    if hasattr(target_state, 'marking'):
                        target_marking = target_state.marking
                    elif hasattr(target_state, 'marking_dict'):
                        target_marking = target_state.marking_dict
                    elif isinstance(target_state, dict):
                        target_marking = target_state.get('marking', {})
                    else:
                        target_marking = {}
                    source_marking_str = marking_to_str(source_marking)
                    target_marking_str = marking_to_str(target_marking)
                    label = f"({getattr(transition, 'name', getattr(transition, 'label', ''))}, {getattr(transition, 'label', None)})"
                # Object format (t with .source and .target)
                elif hasattr(t, 'source') and hasattr(t, 'target'):
                    if hasattr(t.source, 'marking'):
                        source_marking = t.source.marking
                    elif hasattr(t.source, 'marking_dict'):
                        source_marking = t.source.marking_dict
                    elif isinstance(t.source, dict):
                        source_marking = t.source.get('marking', {})
                    else:
                        source_marking = {}
                    if hasattr(t.target, 'marking'):
                        target_marking = t.target.marking
                    elif hasattr(t.target, 'marking_dict'):
                        target_marking = t.target.marking_dict
                    elif isinstance(t.target, dict):
                        target_marking = t.target.get('marking', {})
                    else:
                        target_marking = {}
                    source_marking_str = marking_to_str(source_marking)
                    target_marking_str = marking_to_str(target_marking)
                    label = f"({getattr(t, 'name', getattr(t, 'label', ''))}, {getattr(t, 'label', None)})"
                else:
                    logger.error(f"Unknown transition format: {t}")
                    continue

                transitions.append({
                    'id': f'T{i}',
                    'source': source_marking_str,
                    'target': target_marking_str,
                    'label': label
                })
            except Exception as e:
                logger.error(f"Error processing transition {i}: {str(e)}")
                raise

        result = {
            'states': states,
            'transitions': transitions,
            'stats': {
                'total_states': len(states),
                'total_transitions': len(transitions),
                'generated_at': datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S'),
                'generated_by': 'jc4v1',
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
        # Cleanup only if we created a temporary file
        if (
            temp_file_path and
            temp_file_path.endswith('.pnml') and
            os.path.exists(temp_file_path) and
            os.path.basename(temp_file_path) != 'model.pnml'
        ):
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
            'server_time': datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S'),
            'user': 'jc4v1'
        })
    except ImportError as e:
        return jsonify({
            'status': 'error',
            'message': f"PM4Py not installed: {str(e)}",
            'server_time': datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S'),
            'user': 'jc4v1'
        }), 500

if __name__ == '__main__':
    logger.info(f"Starting Flask application at {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')} by user jc4v1...")
    app.run(debug=True, port=5000)
"""


    Process an iStar goal model file and generate the demo_model.py file.
    
    Parameters:
    file_path (str): The path to the iStar goal model file (in .txt format).
    
    Returns:
    None

"""

from enum import Enum
import json
import os

class LinkType(Enum):
    """Enum for the different types of links in the goal model."""
    AND = "AND"
    OR = "OR" 
    MAKE = "MAKE"
    BREAK = "BREAK"

class GoalModel:
    """Represents the goal model structure."""
    def __init__(self):
        self.tasks = set()
        self.goals = set()
        self.qualities = set()
        self.links = []
        self.requirements = {}
        self.event_mappings = {}

    def add_task(self, task_id):
        """Add a task to the goal model."""
        self.tasks.add(task_id)

    def add_goal(self, goal_id):
        """Add a goal to the goal model."""
        self.goals.add(goal_id)

    def add_quality(self, quality_id):
        """Add a quality to the goal model."""
        self.qualities.add(quality_id)

    def add_link(self, target, source, link_type):
        """Add a link to the goal model."""
        self.links.append((target, source, link_type))

    def add_event_mapping(self, event, task):
        """Add an event-task mapping to the goal model."""
        self.event_mappings[event] = task

def process_istar_model():
    """Process the iStar goal model file and generate the demo_model.py file."""
    print("Please select your iStar goal model file (.json format)")
    file_path = input("Enter the file path: ")

    try:
        # Parse the model
        with open(file_path, 'r') as file:
            json_content = file.read()
        data = json.loads(json_content)
        model = GoalModel()

        # Process nodes
        nodes_by_id = {}
        for actor in data['actors']:
            for node in actor['nodes']:
                nodes_by_id[node['id']] = {
                    'id': node['id'],
                    'text': node['text'],
                    'type': node['type']
                }
                if node['type'] == 'istar.Task':
                    model.add_task(node['text'])
                elif node['type'] == 'istar.Goal':
                    model.add_goal(node['text'])
                elif node['type'] == 'istar.Quality':
                    model.add_quality(node['text'])

        # Process links and requirements
        requirements = {}
        for link in data['links']:
            target = nodes_by_id[link['source']]['text']
            source = nodes_by_id[link['target']]['text']

            if link['type'] == 'istar.AndRefinementLink':
                model.add_link(target, source, LinkType.AND)
                if source not in requirements:
                    requirements[source] = []
                if not requirements[source] or not isinstance(requirements[source][-1], list):
                    requirements[source].append([])
                requirements[source][-1].append(target)
            elif link['type'] == 'istar.OrRefinementLink':
                model.add_link(target, source, LinkType.OR)
                if source not in requirements:
                    requirements[source] = []
                requirements[source].append([target])
            elif link['type'] == 'istar.ContributionLink':
                if link.get('label') == 'make':
                    model.add_link(target, source, LinkType.MAKE)
                elif link.get('label') == 'break':
                    model.add_link(target, source, LinkType.BREAK)

        model.requirements = requirements

        # Add event mappings
        for i, task in enumerate(sorted(list(model.tasks))):
            model.add_event_mapping(f"e{i+1}", task)

        # Generate the demo_model.py file
        demo_model_path = os.path.join(os.path.dirname(file_path), "demo_model.py")
        with open(demo_model_path, 'w') as file:
            file.write("from goal_model import GoalModel\n")
            file.write("from enums import LinkType\n\n")
            file.write("def create_model():\n")
            file.write("    model = GoalModel()\n\n")

            for task in sorted(model.tasks):
                file.write(f"    model.add_task('{task}')\n")
            file.write("\n")

            for goal in sorted(model.goals):
                file.write(f"    model.add_goal('{goal}')\n")
            file.write("\n")

            for quality in sorted(model.qualities):
                file.write(f"    model.add_quality('{quality}')\n")
            file.write("\n")

            for target, source, link_type in model.links:
                file.write(f"    model.add_link('{target}', '{source}', LinkType.{link_type.name})\n")
            file.write("\n")

            if model.requirements:
                file.write("    model.requirements = {\n")
                for source, reqs in model.requirements.items():
                    file.write(f"        '{source}': {str(reqs)},\n")
                file.write("    }\n")
            file.write("\n")

            for event, task in model.event_mappings.items():
                file.write(f"    model.add_event_mapping('{event}', '{task}')\n")
            file.write("\n")
            file.write("    return model\n")

        print(f"\nGenerated demo_model.py successfully!")
        print("\nModel Structure:")
        print(" ")
        print(f"Tasks: {sorted(list(model.tasks))}")
        print(f"Goals: {sorted(list(model.goals))}")
        print(f"Qualities: {sorted(list(model.qualities))}")
        print(f"Number of links: {len(model.links)}")
        print(f"Number of requirements: {len(model.requirements)}")
        print(" ")

        print("\nLink Information:")
        print("{:<20} {:<20} {:<10}".format("Target", "Source", "Link Type"))  # Table header
        print("-" * 60)
        for target, source, link_type in model.links:
            print("{:<20} {:<20} {:<10}".format(source, target, link_type.value)) 
        print(" ")


    except Exception as e:
        print(f"Error processing file: {str(e)}")

if __name__ == "__main__":
    process_istar_model()

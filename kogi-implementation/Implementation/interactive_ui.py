from Implementation.demo_model import create_model  # Changed from create_demo_model
from IPython.display import display, clear_output, HTML
import ipywidgets as widgets

class InteractiveGoalModel:
    def __init__(self):
        self.model = create_model()  # Changed from create_demo_model
        self.create_widgets()
        self.display_interface()

    def create_widgets(self):
        # Create event selection dropdown
        self.event_dropdown = widgets.Dropdown(
            options=['e1', 'e2', 'e3', 'e4', 'e5', 'e6', 'e7', 'e8'],
            description='Event:',
            disabled=False,
            layout=widgets.Layout(width='200px')
        )

        # Create control buttons
        self.process_button = widgets.Button(
            description='Process Event',
            disabled=False,
            button_style='success',
            tooltip='Click to process the selected event',
            layout=widgets.Layout(width='150px')
        )
        self.process_button.on_click(self.on_process_click)

        self.reset_button = widgets.Button(
            description='Reset Model',
            disabled=False,
            button_style='warning',
            tooltip='Click to reset the model to initial state',
            layout=widgets.Layout(width='150px')
        )
        self.reset_button.on_click(self.on_reset_click)

        # Create output area
        self.output = widgets.Output()
        
        # Create tabs for different views
        self.tabs = widgets.Tab()
        self.tabs.children = [
            widgets.VBox([self.create_state_table()]),
            widgets.VBox([self.create_state_view()])
        ]
        self.tabs.set_title(0, 'Model State')
        self.tabs.set_title(1, 'Model Details')

    def create_state_table(self):
        """Create HTML table showing current state"""
        table_html = """
        <style>
        .goal-table { border-collapse: collapse; width: 100%; margin: 10px 0; }
        .goal-table th, .goal-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        .goal-table th { background-color: #000000; color: white; }
        .status-activated, .status-achieved, .status-fulfilled { color: green; }
        .status-deactivated, .status-denied { color: red; }
        .status-partially-achieved, .status-partially-fulfilled { color: blue; }
        .status-unknown { color: gray; }
        </style>
        """

        # Tasks table
        table_html += self._create_section_table("Tasks", self.model.tasks, include_count=True)
        
        # Goals table
        table_html += self._create_section_table("Goals", self.model.goals)
        
        # Qualities table
        table_html += self._create_section_table("Qualities", self.model.qualities)

        return widgets.HTML(table_html)

    def _create_section_table(self, title, items, include_count=False):
        html = f"<h3>{title}</h3><table class='goal-table'>"
        headers = ["ID", "Status"]
        if include_count:
            headers.append("Execution Count")
        
        html += "<tr>" + "".join(f"<th>{h}</th>" for h in headers) + "</tr>"
        
        for item_id, status in sorted(items.items()):
            status_class = f"status-{status.value.replace(' ', '-')}"
            row = f"<tr><td>{item_id}</td><td class='{status_class}'>{status.value}</td>"
            if include_count:
                count = self.model.execution_count.get(item_id, 0)
                row += f"<td>{count}</td>"
            row += "</tr>"
            html += row
            
        return html + "</table>"

    def create_state_view(self):
        """Create a detailed text view of the current state"""
        links_html = "<h3>Links</h3><ul>"
        for parent, child, link_type, status in sorted(self.model.links):
            status_class = f"status-{status.value.replace(' ', '-')}"
            links_html += f"<li>{parent} -{link_type.value}-> {child}: "
            links_html += f"<span class='{status_class}'>{status.value}</span></li>"
        links_html += "</ul>"

        requirements_html = "<h3>Requirements</h3><ul>"
        for goal, req_sets in sorted(self.model.requirements.items()):
            requirements_html += f"<li>{goal}: {' OR '.join([' AND '.join(req_set) for req_set in req_sets])}</li>"
        requirements_html += "</ul>"

        return widgets.HTML(links_html + requirements_html)

    def display_interface(self):
        # Create control panel
        controls = widgets.HBox([
            self.event_dropdown,
            self.process_button,
            self.reset_button
        ])
        
        # Display full interface
        display(widgets.VBox([
            widgets.HTML("<h2>Goal Model Evaluation Demo</h2>"),
            controls,
            self.tabs,
            self.output
        ]))

    def on_process_click(self, b):
        with self.output:
            clear_output()
            event = self.event_dropdown.value
            self.model.process_event(event)

            # Update display
            self.tabs.children = [
                widgets.VBox([self.create_state_table()]),
                widgets.VBox([self.create_state_view()])
            ]

    def on_reset_click(self, b):
        with self.output:
            clear_output()
            print("Resetting model to initial state...")
            self.model = create_model()

            # Update display
            self.tabs.children = [
                widgets.VBox([self.create_state_table()]),
                widgets.VBox([self.create_state_view()])
            ]
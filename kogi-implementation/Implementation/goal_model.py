from typing import Dict, List, Tuple, Set
from Implementation.enums import ElementStatus, QualityStatus, LinkType, LinkStatus

class GoalModel:
    def __init__(self):
        self.tasks: Dict[str, ElementStatus] = {}
        self.goals: Dict[str, ElementStatus] = {}
        self.qualities: Dict[str, QualityStatus] = {}
        self.links: List[Tuple[str, str, LinkType, LinkStatus]] = []
        self.requirements: Dict[str, List[List[str]]] = {}
        self.event_mapping: Dict[str, List[str]] = {}
        self.execution_count: Dict[str, int] = {}
        self.last_activated_link: Tuple[str, str, LinkType, LinkStatus] = None
        self.changed_elements: Set[str] = set()  # Track changed elements

    def add_task(self, task_id: str):
        self.tasks[task_id] = ElementStatus.UNKNOWN
        self.execution_count[task_id] = 0

    def add_goal(self, goal_id: str):
        self.goals[goal_id] = ElementStatus.UNKNOWN

    def add_quality(self, quality_id: str):
        self.qualities[quality_id] = QualityStatus.UNKNOWN

    def add_link(self, parent: str, child: str, link_type: LinkType):
        self.links.append((parent, child, link_type, LinkStatus.UNKNOWN))

    def add_event_mapping(self, event: str, target):
        if isinstance(target, list):
            self.event_mapping[event] = target
        else:
            self.event_mapping[event] = [[target]]

    def process_event(self, event: str):
        print(f"\nProcessing event: {event}")
        self.changed_elements.clear()  # Clear previous changes
        
        if event not in self.event_mapping:
            return

        # Process each target set independently
        for target_set in self.event_mapping[event]:
            # First activate all targets in the set
            for target in target_set:
                if target in self.tasks:
                    old_status = self.tasks[target]
                    self.tasks[target] = ElementStatus.TRUE_FALSE  # (⊤, ⊥)
                    self.execution_count[target] += 1
                    if old_status != self.tasks[target]:
                        self.changed_elements.add(target)
                        print(f"Task {target}: {self._format_status(old_status)} -> {self._format_status(self.tasks[target])}")
                elif target in self.goals:
                    old_status = self.goals[target]
                    self.goals[target] = ElementStatus.TRUE_FALSE  # (⊤, ⊥)
                    if old_status != self.goals[target]:
                        self.changed_elements.add(target)
                        print(f"Goal {target}: {self._format_status(old_status)} -> {self._format_status(self.goals[target])}")
                
                # Then process its propagation
                affected_parents = self._update_links_with_child(target)
                self._evaluate_goals(affected_parents)
                self._evaluate_qualities()

        # Print only changed elements
        if not self.changed_elements:
            print("No status changes")

    def _format_status(self, status):
        """Format status for display"""
        if isinstance(status, ElementStatus):
            if status == ElementStatus.UNKNOWN:
                return "(?, ?)"
            elif status == ElementStatus.TRUE_FALSE:
                return "(⊤, ⊥)"
            elif status == ElementStatus.TRUE_TRUE:
                return "(⊤, ⊤)"
        elif isinstance(status, QualityStatus):
            if status == QualityStatus.UNKNOWN:
                return "(?)"
            elif status == QualityStatus.FULFILLED:
                return "(⊤)"
            elif status == QualityStatus.DENIED:
                return "(⊥)"
        return str(status)

    def _update_links_with_child(self, child: str) -> Set[str]:
        affected_parents = set()
        for i, (parent, link_child, link_type, _) in enumerate(self.links):
            if link_child == child:
                # Check child status
                child_status = self._get_element_status(child)
                if child_status in [ElementStatus.TRUE_FALSE, ElementStatus.TRUE_TRUE]:
                    self.links[i] = (parent, child, link_type, LinkStatus.ACTIVATED)
                    affected_parents.add(parent)
                    
                    # Also check if parent should be partially activated due to this link
                    self._check_partial_activation(parent)
                else:
                    self.links[i] = (parent, child, link_type, LinkStatus.UNKNOWN)
                self.last_activated_link = self.links[i]
        return affected_parents

    def _check_partial_activation(self, element: str):
        """Check if an element should be partially activated due to incoming links"""
        if element in self.requirements:
            # Element has requirements, so it will be handled by _evaluate_goals
            return
            
        # Check if there are any activated links pointing to this element
        has_activated_links = False
        for parent, child, link_type, status in self.links:
            if child == element and status == LinkStatus.ACTIVATED:
                has_activated_links = True
                break
        
        # If there are activated links but element is not satisfied by requirements,
        # it might need to be partially activated
        if has_activated_links and self._get_element_status(element) == ElementStatus.UNKNOWN:
            old_status = self._get_element_status(element)
            # For now, we'll handle this through the requirements evaluation
            # This is where you might want to add logic for partial activation
            pass

    def _get_element_status(self, element: str) -> ElementStatus:
        """Get status of an element regardless of type"""
        if element in self.tasks:
            return self.tasks[element]
        elif element in self.goals:
            return self.goals[element]
        return ElementStatus.UNKNOWN

    def _evaluate_goals(self, goals_to_check: Set[str]):
        processed_elements = set()
        elements_to_process = goals_to_check.copy()
        
        while elements_to_process:
            current = elements_to_process.pop()
            if current in processed_elements:
                continue
                
            if current not in self.goals and current not in self.tasks:
                continue

            if current in self.requirements:
                required_elements = self.requirements[current]
                old_status = self._get_element_status(current)
                new_status = self._calculate_requirement_status(required_elements)
                
                if current in self.goals:
                    self.goals[current] = new_status
                else:
                    self.tasks[current] = new_status
                
                if old_status != new_status:
                    self.changed_elements.add(current)
                    element_type = "Goal" if current in self.goals else "Task"
                    print(f"{element_type} {current}: {self._format_status(old_status)} -> {self._format_status(new_status)}")
                    
                    affected_parents = self._set_links_for_child(current, LinkStatus.ACTIVATED if new_status in [ElementStatus.TRUE_FALSE, ElementStatus.TRUE_TRUE] else LinkStatus.DEACTIVATED)
                    elements_to_process.update(affected_parents)
                    
            processed_elements.add(current)

    def _calculate_requirement_status(self, required_elements: List[List[str]]) -> ElementStatus:
        """Calculate status based on requirements (AND/OR logic)"""
        for requirement_set in required_elements:
            # For AND logic: ALL elements must be TRUE_FALSE (satisfied, not executed pending)
            # For OR logic: ANY element can be TRUE_FALSE (satisfied, not executed pending)
            all_truly_satisfied = all(
                self._get_element_status(elem) == ElementStatus.TRUE_FALSE
                for elem in requirement_set
            )
            
            if all_truly_satisfied:
                # All requirements in this set are truly satisfied (not executed pending)
                return ElementStatus.TRUE_FALSE
        
        # If no requirement set is fully satisfied with TRUE_FALSE elements, remain UNKNOWN
        return ElementStatus.UNKNOWN

    def _set_links_for_child(self, child: str, status: LinkStatus) -> Set[str]:
        affected_parents = set()
        for i, (parent, link_child, link_type, _) in enumerate(self.links):
            if link_child == child:
                self.links[i] = (parent, child, link_type, status)
                self.last_activated_link = self.links[i]
                if status == LinkStatus.ACTIVATED:
                    affected_parents.add(parent)
        return affected_parents

    def _evaluate_qualities(self):
        for quality in self.qualities:
            make_links = []
            break_links = []
            
            # Collect activated MAKE and BREAK links
            for parent, child, link_type, status in self.links:
                if parent == quality and status == LinkStatus.ACTIVATED:
                    if link_type == LinkType.MAKE:
                        make_links.append(child)
                    elif link_type == LinkType.BREAK:
                        break_links.append(child)

            if self.last_activated_link and self.last_activated_link[0] == quality and self.last_activated_link[3] == LinkStatus.ACTIVATED:
                parent, child, link_type, _ = self.last_activated_link
                old_status = self.qualities[quality]
                
                if link_type == LinkType.MAKE:
                    self.qualities[quality] = QualityStatus.FULFILLED
                    if old_status != self.qualities[quality]:
                        self.changed_elements.add(quality)
                        print(f"Quality {quality}: {self._format_status(old_status)} -> {self._format_status(self.qualities[quality])}")
                    self._handle_quality_change(quality, QualityStatus.FULFILLED, break_links)
                    
                elif link_type == LinkType.BREAK:
                    self.qualities[quality] = QualityStatus.DENIED
                    if old_status != self.qualities[quality]:
                        self.changed_elements.add(quality)
                        print(f"Quality {quality}: {self._format_status(old_status)} -> {self._format_status(self.qualities[quality])}")
                    self._handle_quality_change(quality, QualityStatus.DENIED, make_links)

    def _handle_quality_change(self, quality: str, new_quality_status: QualityStatus, affected_links: List[str]):
        """Handle backpropagation when quality status changes"""
        if new_quality_status == QualityStatus.FULFILLED:
            # Quality became fulfilled due to MAKE link, set BREAK links and their contributors to executed pending
            for i, (parent, child, link_type, status) in enumerate(self.links):
                if parent == quality and link_type == LinkType.BREAK and status == LinkStatus.ACTIVATED:
                    self._set_executed_pending_recursive(child)
                    
        elif new_quality_status == QualityStatus.DENIED:
            # Quality became denied due to BREAK link, set MAKE links and their contributors to executed pending
            for i, (parent, child, link_type, status) in enumerate(self.links):
                if parent == quality and link_type == LinkType.MAKE and status == LinkStatus.ACTIVATED:
                    self._set_executed_pending_recursive(child)

    def _set_executed_pending_recursive(self, element: str, visited: Set[str] = None):
        """Recursively set element and all its contributors to executed pending (status_2 = ⊤)"""
        if visited is None:
            visited = set()
        
        if element in visited:
            return  # Avoid infinite recursion
        
        visited.add(element)
        
        # Set current element to executed pending if it's currently TRUE_FALSE
        old_status = self._get_element_status(element)
        if old_status == ElementStatus.TRUE_FALSE:
            new_status = ElementStatus.TRUE_TRUE
            
            if element in self.tasks:
                self.tasks[element] = new_status
            elif element in self.goals:
                self.goals[element] = new_status
                
            self.changed_elements.add(element)
            element_type = "Task" if element in self.tasks else "Goal"
            print(f"{element_type} {element}: {self._format_status(old_status)} -> {self._format_status(new_status)} (executed pending)")
        
        # Find all elements that contribute to this element and recursively set them
        contributors = self._find_all_contributors(element, set())
        for contributor in contributors:
            if contributor not in visited:
                self._set_executed_pending_recursive(contributor, visited)

    def _find_all_contributors(self, target_element: str, visited: Set[str] = None) -> Set[str]:
        """Find all elements that eventually target the given element (reverse dependency search)"""
        if visited is None:
            visited = set()
            
        if target_element in visited:
            return set()  # Avoid infinite recursion
            
        visited.add(target_element)
        contributors = set()
        
        # Method 1: Find elements that have the target_element as their eventual target through links
        # Look for links WHERE target_element is the SOURCE (G1 -> something)
        for parent, child, link_type, status in self.links:
            if parent == target_element and status in [LinkStatus.ACTIVATED, LinkStatus.PARTIALLY_ACTIVATED, LinkStatus.UNKNOWN]:
                # child is something that target_element points to
                # Now find all elements that eventually lead to 'child'
                child_contributors = self._find_elements_targeting(child, visited.copy())
                contributors.update(child_contributors)
        
        # Method 2: Find elements that are in requirements that would eventually satisfy target_element
        if target_element in self.requirements:
            for requirement_set in self.requirements[target_element]:
                for required_element in requirement_set:
                    if required_element not in visited:
                        contributors.add(required_element)
                        # Recursively find elements that target this required element
                        req_contributors = self._find_elements_targeting(required_element, visited.copy())
                        contributors.update(req_contributors)
        
        return contributors

    def _find_elements_targeting(self, target: str, visited: Set[str] = None) -> Set[str]:
        """Find all elements that have 'target' as their eventual target"""
        if visited is None:
            visited = set()
            
        if target in visited:
            return set()
            
        visited.add(target)
        targeting_elements = set()
        
        # Find direct elements that target this element through links
        for parent, child, link_type, status in self.links:
            if child == target and parent not in visited:
                # Only consider activated elements
                if self._get_element_status(parent) in [ElementStatus.TRUE_FALSE, ElementStatus.TRUE_TRUE]:
                    targeting_elements.add(parent)
                    # Recursively find elements that target the parent
                    parent_targeting = self._find_elements_targeting(parent, visited.copy())
                    targeting_elements.update(parent_targeting)
        
        # Find elements through requirements
        for element, requirement_sets in self.requirements.items():
            if element not in visited:
                for req_set in requirement_sets:
                    if target in req_set:
                        # This element requires our target
                        if self._get_element_status(element) in [ElementStatus.TRUE_FALSE, ElementStatus.TRUE_TRUE]:
                            targeting_elements.add(element)
                            # Find what targets this element
                            element_targeting = self._find_elements_targeting(element, visited.copy())
                            targeting_elements.update(element_targeting)
        
        return targeting_elements

    def generate_statistics(self, traces: List[List[str]], results: List[Dict]):
        """Generate and display statistics for the evaluation"""
        print("\n" + "="*80)
        print("GOAL MODEL EVALUATION STATISTICS")
        print("="*80)
        
        total_traces = len(traces)
        all_elements = list(self.tasks.keys()) + list(self.goals.keys()) + list(self.qualities.keys())
        
        # Calculate statistics for each element
        element_stats = {}
        
        for element in all_elements:
            satisfied_count = 0
            executed_pending_count = 0
            satisfied_traces = []
            executed_pending_traces = []
            
            for i, trace_result in enumerate(results):
                final_state = trace_result['states'][-1]
                
                # Check element status
                if element in final_state['qualities']:
                    if final_state['qualities'][element] == 'fulfilled':
                        satisfied_count += 1
                        satisfied_traces.append(i + 1)
                elif element in final_state['goals']:
                    if final_state['goals'][element] == 'true_false':
                        satisfied_count += 1
                        satisfied_traces.append(i + 1)
                    elif final_state['goals'][element] == 'true_true':
                        executed_pending_count += 1
                        executed_pending_traces.append(i + 1)
                elif element in final_state['tasks']:
                    if final_state['tasks'][element] == 'true_false':
                        satisfied_count += 1
                        satisfied_traces.append(i + 1)
                    elif final_state['tasks'][element] == 'true_true':
                        executed_pending_count += 1
                        executed_pending_traces.append(i + 1)
            
            element_stats[element] = {
                'satisfied_count': satisfied_count,
                'executed_pending_count': executed_pending_count,
                'unsatisfied_count': total_traces - satisfied_count - executed_pending_count,
                'satisfied_percentage': (satisfied_count / total_traces) * 100,
                'executed_pending_percentage': (executed_pending_count / total_traces) * 100,
                'satisfied_traces': satisfied_traces,
                'executed_pending_traces': executed_pending_traces
            }
        
        # Display element statistics
        print(f"\n{'Element':<12} {'Type':<8} {'Satisfied %':<12} {'Exec.Pend %':<12} {'Unsatisfied %':<14} {'Satisfied Traces'}")
        print("-" * 90)
        
        for element in sorted(element_stats.keys()):
            stats = element_stats[element]
            element_type = self._get_element_type(element)
            unsatisfied_percentage = 100 - stats['satisfied_percentage'] - stats['executed_pending_percentage']
            traces_str = ', '.join(map(str, stats['satisfied_traces'])) if stats['satisfied_traces'] else 'None'
            
            print(f"{element:<12} {element_type:<8} {stats['satisfied_percentage']:>10.1f}% "
                  f"{stats['executed_pending_percentage']:>10.1f}% {unsatisfied_percentage:>12.1f}% {traces_str}")
        
        # Quality analysis
        print(f"\n{'='*80}")
        print("QUALITY ANALYSIS")
        print("="*80)
        
        for quality in self.qualities.keys():
            quality_stats = element_stats[quality]
            print(f"\nQuality {quality}:")
            print(f"  Fulfilled in {quality_stats['satisfied_count']}/{total_traces} traces ({quality_stats['satisfied_percentage']:.1f}%)")
            print(f"  Traces where fulfilled: {', '.join(map(str, quality_stats['satisfied_traces'])) if quality_stats['satisfied_traces'] else 'None'}")
        
        # Trace pattern analysis
        print(f"\n{'='*80}")
        print("TRACE PATTERN ANALYSIS")
        print("="*80)
        
        successful_traces = []
        unsuccessful_traces = []
        
        for i, trace_result in enumerate(results):
            final_state = trace_result['states'][-1]
            # Check if main quality (Q1) is fulfilled
            if 'Q1' in final_state['qualities'] and final_state['qualities']['Q1'] == 'fulfilled':
                successful_traces.append({'index': i + 1, 'trace': traces[i]})
            else:
                unsuccessful_traces.append({'index': i + 1, 'trace': traces[i]})
        
        print(f"Successful traces: {len(successful_traces)} ({len(successful_traces)/total_traces*100:.1f}%)")
        for trace_info in successful_traces:
            print(f"  Trace {trace_info['index']}: {' -> '.join(trace_info['trace'])}")
        
        print(f"\nUnsuccessful traces: {len(unsuccessful_traces)} ({len(unsuccessful_traces)/total_traces*100:.1f}%)")
        for trace_info in unsuccessful_traces:
            print(f"  Trace {trace_info['index']}: {' -> '.join(trace_info['trace'])}")
        
        print("="*80)
        
        return element_stats

    def print_final_status(self):
        """Print final status of all elements"""
        print("\n" + "="*50)
        print("FINAL STATUS OF ALL ELEMENTS")
        print("="*50)

    def generate_statistics(self, traces: List[List[str]], results: List[Dict]):
        """Generate and display statistics for the evaluation"""
        print("\n" + "="*80)
        print("GOAL MODEL EVALUATION STATISTICS")
        print("="*80)
        
        total_traces = len(traces)
        all_elements = list(self.tasks.keys()) + list(self.goals.keys()) + list(self.qualities.keys())
        
        # Calculate statistics for each element
        element_stats = {}
        
        for element in all_elements:
            satisfied_count = 0
            executed_pending_count = 0
            satisfied_traces = []
            executed_pending_traces = []
            
            for i, trace_result in enumerate(results):
                final_state = trace_result['states'][-1]
                
                # Check element status
                if element in final_state['qualities']:
                    if final_state['qualities'][element] == 'fulfilled':
                        satisfied_count += 1
                        satisfied_traces.append(i + 1)
                elif element in final_state['goals']:
                    if final_state['goals'][element] == 'true_false':
                        satisfied_count += 1
                        satisfied_traces.append(i + 1)
                    elif final_state['goals'][element] == 'true_true':
                        executed_pending_count += 1
                        executed_pending_traces.append(i + 1)
                elif element in final_state['tasks']:
                    if final_state['tasks'][element] == 'true_false':
                        satisfied_count += 1
                        satisfied_traces.append(i + 1)
                    elif final_state['tasks'][element] == 'true_true':
                        executed_pending_count += 1
                        executed_pending_traces.append(i + 1)
            
            element_stats[element] = {
                'satisfied_count': satisfied_count,
                'executed_pending_count': executed_pending_count,
                'unsatisfied_count': total_traces - satisfied_count - executed_pending_count,
                'satisfied_percentage': (satisfied_count / total_traces) * 100,
                'executed_pending_percentage': (executed_pending_count / total_traces) * 100,
                'satisfied_traces': satisfied_traces,
                'executed_pending_traces': executed_pending_traces
            }
        
        # Display element statistics
        print(f"\n{'Element':<12} {'Type':<8} {'Satisfied %':<12} {'Exec.Pend %':<12} {'Unsatisfied %':<14} {'Satisfied Traces'}")
        print("-" * 90)
        
        for element in sorted(element_stats.keys()):
            stats = element_stats[element]
            element_type = self._get_element_type(element)
            unsatisfied_percentage = 100 - stats['satisfied_percentage'] - stats['executed_pending_percentage']
            traces_str = ', '.join(map(str, stats['satisfied_traces'])) if stats['satisfied_traces'] else 'None'
            
            print(f"{element:<12} {element_type:<8} {stats['satisfied_percentage']:>10.1f}% "
                  f"{stats['executed_pending_percentage']:>10.1f}% {unsatisfied_percentage:>12.1f}% {traces_str}")
        
        # Quality analysis
        print(f"\n{'='*80}")
        print("QUALITY ANALYSIS")
        print("="*80)
        
        for quality in self.qualities.keys():
            quality_stats = element_stats[quality]
            print(f"\nQuality {quality}:")
            print(f"  Fulfilled in {quality_stats['satisfied_count']}/{total_traces} traces ({quality_stats['satisfied_percentage']:.1f}%)")
            print(f"  Traces where fulfilled: {', '.join(map(str, quality_stats['satisfied_traces'])) if quality_stats['satisfied_traces'] else 'None'}")
        
        # Trace pattern analysis
        print(f"\n{'='*80}")
        print("TRACE PATTERN ANALYSIS")
        print("="*80)
        
        successful_traces = []
        unsuccessful_traces = []
        
        for i, trace_result in enumerate(results):
            final_state = trace_result['states'][-1]
            # Check if main quality (Q1) is fulfilled
            if 'Q1' in final_state['qualities'] and final_state['qualities']['Q1'] == 'fulfilled':
                successful_traces.append({'index': i + 1, 'trace': traces[i]})
            else:
                unsuccessful_traces.append({'index': i + 1, 'trace': traces[i]})
        
        print(f"Successful traces: {len(successful_traces)} ({len(successful_traces)/total_traces*100:.1f}%)")
        for trace_info in successful_traces:
            print(f"  Trace {trace_info['index']}: {' -> '.join(trace_info['trace'])}")
        
        print(f"\nUnsuccessful traces: {len(unsuccessful_traces)} ({len(unsuccessful_traces)/total_traces*100:.1f}%)")
        for trace_info in unsuccessful_traces:
            print(f"  Trace {trace_info['index']}: {' -> '.join(trace_info['trace'])}")
        
        print("="*80)
        
        return element_stats

    def _get_element_type(self, element: str) -> str:
        """Get the type of an element"""
        if element in self.qualities:
            return 'Quality'
        elif element in self.goals:
            return 'Goal'
        elif element in self.tasks:
            return 'Task'
        return 'Unknown'
        
        # Print qualities first
        print("\nQualities:")
        for quality_id, status in self.qualities.items():
            print(f"  {quality_id}: {self._format_status(status)}")
        
        # Print goals
        print("\nGoals:")
        for goal_id, status in self.goals.items():
            print(f"  {goal_id}: {self._format_status(status)}")
        
        # Print tasks
        print("\nTasks:")
        for task_id, status in self.tasks.items():
            print(f"  {task_id}: {self._format_status(status)}")
        
        print("="*50)

    def _get_element_type(self, element: str) -> str:
        """Get the type of an element"""
        if element in self.qualities:
            return 'Quality'
        elif element in self.goals:
            return 'Goal'
        elif element in self.tasks:
            return 'Task'
        return 'Unknown'
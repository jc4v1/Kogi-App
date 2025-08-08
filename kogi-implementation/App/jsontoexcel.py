import json
import pandas as pd
from collections import defaultdict

def analyze_and_format_traces(json_data):
    element_stats = defaultdict(lambda: {'satisfied_traces': [], 'satisfaction_count': 0})
    total_traces = len(json_data)
    
    for trace in json_data:
        trace_num = trace['trace_number']
        final_state = trace['states'][-1]
        events = trace['events']
        trace_str = ', '.join(events)
        
        # Check final states for each element
        for task, state in final_state['tasks'].items():
            if state == "ElementStatus.ACTIVATED":
                element_stats[task]['satisfied_traces'].append(trace_str)
                element_stats[task]['satisfaction_count'] += 1
                
        for goal, state in final_state['goals'].items():
            if state == "ElementStatus.ACHIEVED":
                element_stats[goal]['satisfied_traces'].append(trace_str)
                element_stats[goal]['satisfaction_count'] += 1
                
        for quality, state in final_state['qualities'].items():
            if state == "ElementStatus.FULFILLED":
                element_stats[quality]['satisfied_traces'].append(trace_str)
                element_stats[quality]['satisfaction_count'] += 1
    
    # Create DataFrame
    formatted_data = []
    for element, stats in element_stats.items():
        if stats['satisfied_traces']:  # Only include elements with satisfied traces
            satisfaction_percentage = (stats['satisfaction_count'] / total_traces) * 100
            formatted_data.append({
                'Intentional Element': element,
                '% Satisfaction': f"{satisfaction_percentage:.1f}%",
                'Satisfied Traces': stats['satisfied_traces']
            })
    
    df = pd.DataFrame(formatted_data)
    return df

def export_to_excel(df, output_path='satisfaction_analysis.xlsx'):
    with pd.ExcelWriter(output_path, engine='xlsxwriter') as writer:
        df.to_excel(writer, index=False, sheet_name='Satisfaction Analysis')
        workbook = writer.book
        worksheet = writer.sheets['Satisfaction Analysis']
        
        # Format columns
        wrap_format = workbook.add_format({'text_wrap': True})
        worksheet.set_column('A:A', 20)
        worksheet.set_column('B:B', 15)
        worksheet.set_column('C:C', 50, wrap_format)

if __name__ == "__main__":
    with open('App/Outputs/trace_analysis.json', 'r') as f:
        json_data = json.load(f)
    
    df = analyze_and_format_traces(json_data)
    export_to_excel(df)
    print("Analysis exported to satisfaction_analysis.xlsx")
from App.trace_analyzer import TraceAnalyzer, print_analysis_results

def analyze_traces(trazas_unicas, target_elements):
    try:
        # Create analyzer with target elements
        analyzer = TraceAnalyzer(target_elements)
        
        # Analyze traces
        results = analyzer.analyze_bpmn_traces(trazas_unicas)
        
        # Print results
        print_analysis_results(results)
        
    except Exception as e:
        print(f"Error durante el análisis: {str(e)}")

if __name__ == "__main__":
    # Example usage
    trazas_unicas = [
        ["e1", "e2", "e3"],
        ["e2", "e1", "e3"]
    ]
    target_elements = ["Q1", "G1"]
    analyze_traces(trazas_unicas, target_elements)
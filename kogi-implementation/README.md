## High-Level Requirements-Driven Business Process Compliance

## Abstract

Regulatory compliance often prioritizes adherence to explicit rules, overlooking the qualitative aspects of rule implementation. Existing goal-driven compliance approaches often focus on mapping tasks and events to enable process discovery and model repair without evaluating the qualitative factors influencing compliance goals. This study introduces a goal-driven framework that integrates requirements engineering techniques to ensure compliance at design time. It merges process and goal dimensions to validate the fulfillment of high-level compliance requirements, such as reliability, efficiency, and appropriateness. The framework involves modeling legal and business requirements as a process model, capturing compliance requirements in a goal model, and synchronizing the models to determine if the intended high-level requirements are satisfied. The framework was validated through an initial implementation, demonstrating how organizations can systematically integrate and verify both procedural and high-level compliance.

#Initial Implementation

A [Prototype]  was developed in Python3, taking as input a set of business process models (BPMN file), the goal model (JSON File), and the mapping (CSV File). It provides two evaluation options: the first assesses if the process model complies with the goal model by analyzing the composed Labeled Transition System, while the second simulates execution traces to determine which satisfies the high-level compliance requirements. The system includes an interactive Jupyter notebook for manual inspection and analysis of process execution.

## Use Case: Fintech Company "FT"

We initially implemented our algorithm using a fictitious Fintech company called "FT" that acts as the data controller and must manage customer data in full compliance with GDPR Articles 12–22. In this use case, 10 BPMN process models were extended and adapted to the fintech context (based on [case studies](https://link.springer.com/chapter/10.1007/978-3-030-21297-1_2)) to satisfy both the operational requirements specified in the relevant GDPR articles and the specific business requirements. 

For the qualitative aspects, the relevant GDPR articles were analyzed to extract the associated qualitative attributes. The operationalization of these qualitative elements was performed using the proposed method in [reference](https://doi.org/10.1145/2884781.2884788), which assigns business-related fill-in variables to formalize the requirements. Subsequently, the mapping of process activities to these qualitative elements was validated by synchronizing the operational process models with a goal model that encapsulated the qualitative compliance requirements.

## Features

- **Compliance Assessment**: Analyze the composed Labeled Transition System to check process model compliance with the goal model.
- **Simulation of Execution Traces**: Determine which execution traces satisfy high-level compliance requirements.
- **Interactive Jupyter Notebook**: Manual inspection and analysis of process execution.

## Requirements

- Python 3
- Jupyter Notebook

## Installation

1. Clone the repository:
   ```bash
   git clone [https://anonymous.4open.science/r/High-Level-Requirements-Driven-Business-Process.Compliance](https://anonymous.4open.science/r/HLRDBPC)
   cd Traces-driven-goals-analysis
   ```

2. Install the required packages:
   ```bash
   pip install -r requirements.txt
   ```

## Usage

1. Place the BPMN files, JSON goal model file, and CSV mapping file in the `input` directory.
2. Run the Jupyter notebook:
   ```bash
   jupyter notebook
   ```
3. Open the notebook and follow the instructions to perform the compliance assessment or simulate execution traces.

## References


## Modules
 1. trace_analyzer
 2. whatif-analyzer (include two modes)
 3. main

 
- High-Level Requirements-Driven Business Process Compliance

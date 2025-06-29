## Kogi: A tool for assessing High-Level Business Process Compliance

The goal of a business process is to orchestrate activities to achieve a business goal. However, most process simulation tools do not assess how activities influence the satisfaction of business goals. Kogi addresses this limitation by aligning imperative and declarative process models with goal models to evaluate compliance with high-level and non-functional requirements. Unlike existing tools, Kogi traces how process executions affect goal satisfaction in both runtime and design-time scenarios. The tool focuses on monitoring the fulfillment of organizational objectives rather than procedural correctness alone. This support shows potential to improve traceability and interpretability of compliance outcomes and enhance communication across stakeholders involved in the business process lifecycle.

This repository contains three versions of the **Kogui** application, designed to evaluate **compliance** between business process models and goal models. It supports **design-time analysis**, **runtime trace evaluation**, and **what-if scenario simulation**.

To use Kogui, you must provide **three well-formed input models**:
- A **process model**
- A **goal model**
- A **mapping** between process activities and goal model elements

Kogui supports both **imperative** and **declarative** process models.

---

##  Application Versions

### 1. Python Application

Modular application that supports:
-  Design-time evaluation (`main.py`)
-  Runtime trace analysis (`trace_analyzer.py`)
-  What-if scenario simulation (`event_analyzer.py`)

**Input formats**:
- Process model: `.bpmn`
- Goal model: `.json`
- Mapping: `.csv`

**Tools used for modeling**:
- SAP Signavio (processes)
- PiStar (goal models)
- Excel (mappings)

---

### 2. React App V1 (Vue.js-based)

Front-end application built with **Vue.js** to explore **what-if** scenarios interactively.

**Input formats**:
- Process model: `.bpmn`
- Goal model: `.json`
- Mapping: `.csv`

Supports local deployment.

---

### 3. React App V2 (Node.js + Python Backend)

Experimental beta version with a Node.js-based front end connected to a Python back end.

**Input formats**:
- Process model: `.pnml` (Petri nets, supported by PM4PY)
- Goal model: `.json`
- Mapping: `.csv`

---

##  Getting Started with the Python Application

Follow these steps to run the Python application:

1. Clone or download the repository:
   ```bash
   git clone https://github.com/your-user/Kogui.git](https://github.com/jc4v1/DemoBPM2025.git

Copy your input models into the ./Data folder:

your_model.bpmn


---

### 2. Prepare Your Input Files

Place your input models into the `Data/` folder:

- `your_model.bpmn` — process model  
- `your_goals.json` — goal model  
- `your_mapping.csv` — mapping between process and goals  

You can create these files using tools such as:
- **SAP Signavio** for process models
- **PiStar** for goal models
- **Excel** or any spreadsheet editor for mappings

---

### 3. Install Dependencies

Make sure Python is installed. Then install the required dependencies:

```bash
pip install -r requirements.txt
```

### 4. Navigate to the application Folder
```bash
cd App
```

---

### 5. Run the Desired Module

Depending on the type of analysis you want to perform, run one of the following scripts:

####  Design-time Compliance Analysis

```bash
python main.py
```

####  Runtime trace analysis

```bash
python trace_analyzer.py
```

####  What-if scenario simulation
```bash
python event_analyzer.py
```











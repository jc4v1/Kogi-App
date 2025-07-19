##  Python Application

Modular application that supports:
-  Design-time evaluation (main.py)
-  Runtime trace analysis (trace_analyzer.py)
-  What-if scenario simulation (event_analyzer.py)

**Input formats**:
- Process model: .bpmn
- Goal model: .json
- Mapping: .csv

---

##  Getting Started with the Python Application

Follow these steps to run the Python application:

1. Clone or download the repository and its submodules (see README.md)
2. Prepare your models and mapping

**Tools suggested for modeling**:
- [Signavio Academic Portal](https://academic.signavio.com/p/login) - Process Model
- [PiStar](https://www.cin.ufpe.br/~jhcp/pistar/tool/) - Goal Model
- [Excel](https://www.microsoft.com/es-co/microsoft-365/excel) - Mappings


3. Copy your input models into the ./Data folder:

your_model.bpmn


---

### 2. Prepare Your Input Files

Place your input models into the `Data/` folder:

- `your_model.bpmn` — process model  
- `your_goals.json` — goal model  
- `your_mapping.csv` — mapping between process and goals  


---

### 3. Install Dependencies

Make sure Python is installed. Then install the required dependencies:
bash
pip install -r requirements.txt
### 4. Navigate to the application Folder
bash
cd App
---

### 5. Run the Desired Module

Depending on the type of analysis you want to perform, run one of the following scripts:

####  Design-time Compliance Analysis
bash
python main.py
####  Runtime trace analysis
bash
python trace_analyzer.py
####  What-if scenario simulation
bash
python event_analyzer.py

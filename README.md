## Kogi: A tool for assessing High-Level Business Process Compliance

The goal of a business process is to orchestrate activities to achieve a business goal. However, most process simulation tools do not assess how activities influence the satisfaction of business goals. Kogi addresses this limitation by aligning imperative and declarative process models with goal models to evaluate compliance with high-level and non-functional requirements. Unlike existing tools, Kogi traces how process executions affect goal satisfaction in both runtime and design-time scenarios. The tool focuses on monitoring the fulfillment of organizational objectives rather than procedural correctness alone. This support shows potential to improve traceability and interpretability of compliance outcomes and enhance communication across stakeholders involved in the business process lifecycle.

This repository contains three versions of the **Kogui** application, designed to evaluate **compliance** between business process models and goal models. It supports **design-time analysis**, **runtime trace evaluation**, and **what-if scenario simulation**.

To use Kogui, you must provide **three well-formed [1] input models**:
- A **process model**
- A **goal model**
- A **mapping** between process activities and goal model elements

Kogui supports both **imperative** and **declarative** process models.

## References

[1] Caballero Villalobos, J., Burattin, A., & López-Acosta, H.-A. (Accepted/In press). High-Level Requirements-Driven Business Process Compliance. In Proceedings of the 23rd International Conference on Business Process Management (BPM 2025) Springer.

---

##  Getting Started with Kogi App

This repository uses Git submodules. To clone everything correctly, run:

```bash
git clone --recurse-submodules https://github.com/jc4v1/Kogi-App.git
```

Or, if you already cloned:

```bash
git submodule update --init --recursive
```


### 1. Python Application

Modular application that supports:
-  Design-time evaluation (`main.py`)
-  Runtime trace analysis (`trace_analyzer.py`)
-  What-if scenario simulation (`event_analyzer.py`)

Instructions: See `GettingStarted-KogiPython.md`

---

### 2. React App V2

Experimental interface with a Node.js frontend and Python backend for exploring compliance scenarios.

Instructions: See `GettingStarted-KogiReact.md`












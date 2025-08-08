
import os
from typing import List

def get_bpmn_file_path() -> str:
    while True:
        print("Welcome to Traces-driven Goal Analysis - Python Application")
        print("Please select your BPMN file (.bpmn)")
        file_path = input("Enter the BPMN file relative path: ")
        if os.path.isfile(file_path):
            return file_path
        else:
            print("Invalid file path. Please try again.")


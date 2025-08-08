


import os
from typing import List

def get_mapping_file_path() -> str:
    while True:
        print("Please select your Mapping file (.xlsx)")
        mapping_path = input("Enter the mapping file relative path: ")
        if os.path.isfile(mapping_path) and (mapping_path.endswith(".csv") or mapping_path.endswith(".xlsx")):
            return mapping_path
        else:
          print("Invalid file path. Please enter a valid path to a CSV file.")

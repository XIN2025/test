import csv
from pprint import pprint

# Define the actual headers from the file
HEADERS = [
    'ID',
    'Sex',
    'Age',
    'Weight (kg)',
    'Height (cm)',
    'BMI',
    'Diagnoses',
    'Symptoms',
    'Key Lab Findings',
    'Wearable Findings',
    'User Stated Goals',
    'Tiered Insight Delivery',
    'Cross-Validated Logic',
    'Personalized Action Plan',
    'Nutrition Plan Tiering',
    'Lifestyle PIllars',
    'Supplement Plan',
    'User Goals and Therapeutic Focus'
]

def parse_csv(file_path):
    data = []
    with open(file_path, newline='', encoding='utf-8') as csvfile:
        reader = csv.DictReader(csvfile)
        for row in reader:
            filtered_row = {h: row.get(h, None) for h in HEADERS}
            data.append(filtered_row)
    return data

def main():
    file_path = "EVRA_Comprehensive Analysis Report.csv"
    parsed_data = parse_csv(file_path)
    for entry in parsed_data:
        pprint(entry)

if __name__ == "__main__":
    main()

import os
import csv
from pprint import pprint
import typer
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.prompts import PromptTemplate
from langchain.chains import LLMChain
from dotenv import load_dotenv
from poc.config.config import *

load_dotenv()

# Input fields (features)
INPUT_FIELDS = [
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
]

# Output fields (targets)
OUTPUT_FIELDS = [
    'Tiered Insight Delivery',
    'Cross-Validated Logic',
    'Personalized Action Plan',
    'Nutrition Plan Tiering',
    'Lifestyle PIllars',
    'Supplement Plan',
    'User Goals and Therapeutic Focus'
]

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
if not GOOGLE_API_KEY:
    raise ValueError("GOOGLE_API_KEY not found in environment variables. Please check your .env file.")

app = typer.Typer()
llm = ChatGoogleGenerativeAI(
    model="gemini-1.5-flash",
    google_api_key=GOOGLE_API_KEY
)

# Prompt template for feature extraction and output generation
PROMPT_TEMPLATE = """
Given the following patient data:
{input_data}

Extract or generate the following:
- Tiered Insight Delivery
- Cross-Validated Logic
- Personalized Action Plan
- Nutrition Plan Tiering
- Lifestyle Pillars
- Supplement Plan
- User Goals and Therapeutic Focus

For each, provide a concise, actionable summary based on the input fields.
"""

# Evaluation prompt template
EVAL_PROMPT_TEMPLATE = """
Compare the following generated and actual outputs for the field "{field_name}":

Generated Output:
{generated_output}

Actual Output:
{actual_output}

On a scale of 1 to 5, where 5 means the generated output matches the actual output perfectly and 1 means it does not match at all, rate the accuracy of the generated output. Only return the numeric score.
"""

prompt = PromptTemplate(
    input_variables=["input_data"],
    template=PROMPT_TEMPLATE
)

eval_prompt = PromptTemplate(
    input_variables=["field_name", "generated_output", "actual_output"],
    template=EVAL_PROMPT_TEMPLATE
)

chain = LLMChain(llm=llm, prompt=prompt)
eval_chain = LLMChain(llm=llm, prompt=eval_prompt)

def parse_csv(file_path):
    data = []
    with open(file_path, newline='', encoding='utf-8') as csvfile:
        reader = csv.DictReader(csvfile)
        for row in reader:
            filtered_row = {h: row.get(h, None) for h in INPUT_FIELDS}
            data.append(filtered_row)
    return data

@app.command()
def process_csv(file_path: str):
    parsed_data = parse_csv(file_path)
    for entry in parsed_data:
        input_data = "\n".join([f"{k}: {v}" for k, v in entry.items()])
        print("\n--- Input Data ---")
        pprint(entry)
        print("\n--- LLM Output ---")
        result = chain.run({"input_data": input_data})
        print(result)

        # Evaluate each output field if actual value is present
        print("\n--- Evaluation Scores ---")
        scores = {}
        for field in OUTPUT_FIELDS:
            actual = entry.get(field)
            generated = None
            # Try to extract generated field from result (simple split)
            if field in result:
                # Naive extraction: look for the field name in result
                # and take the next line as the value
                lines = result.split('\n')
                for i, line in enumerate(lines):
                    if field in line:
                        if i + 1 < len(lines):
                            generated = lines[i + 1].strip()
                        break
            if actual and generated:
                score = eval_chain.run({
                    "field_name": field,
                    "generated_output": generated,
                    "actual_output": actual
                })
                try:
                    score = float(score.strip())
                except Exception:
                    score = None
                scores[field] = score
                print(f"{field}: {score}")
            else:
                print(f"{field}: Skipped (missing actual or generated value)")
        # Optionally, print average score
        valid_scores = [s for s in scores.values() if s is not None]
        if valid_scores:
            avg_score = sum(valid_scores) / len(valid_scores)
            print(f"Average Score: {avg_score:.2f}")
        else:
            print("No valid scores for this entry.")

if __name__ == "__main__":
    app()

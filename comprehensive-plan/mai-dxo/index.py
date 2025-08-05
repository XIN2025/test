import os
import google.generativeai as genai
from dotenv import load_dotenv
from typing import List, Dict
import time
from tqdm import trange

load_dotenv()
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))
model = genai.GenerativeModel("gemini-1.5-pro")

MAX_ROUNDS = 1


def ask_gemini(prompt: str) -> str:
    try:
        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        return f"Gemini Error: {str(e)}"


def hypothesis_agent(case_summary: str, round_num: int,
                     challenger_feedback: str = "", checklist_feedback: str = "") -> List[Dict]:
    if round_num == 1:
        prompt = (
            f"You are the HypothesisAgent. Based on the following case summary, list and rank 5 possible diagnoses "
            f"with confidence scores and justifications.\n\n"
            f"Case Summary:\n{case_summary}\n\n"
            "If information is missing or ambiguous, make your best clinical guess based on the available data. "
            "Do not return an empty list. Always provide plausible hypotheses, even if you are uncertain.\n"
            "Only include 'perfectly healthy' or 'no significant findings' if there is minimal or no clinical evidence "
            "to support any pathological condition. If included, assign it a lower confidence unless it is clearly "
            "the most plausible conclusion. Prioritize likely medical diagnoses over normal findings.\n\n"
            "Format:\n- Diagnosis: <name>\n  Confidence: <score>%\n  Justification: <reason>"
        )
    else:
        prompt = (
            f"You are the HypothesisAgent in Round {round_num}. Update your list of differential diagnoses "
            f"based on the previous round's critiques and checklist feedback.\n\n"
            f"Case Summary:\n{case_summary}\n\n"
            f"ChallengerAgent Feedback:\n{challenger_feedback}\n\n"
            f"ChecklistAgent Feedback:\n{checklist_feedback}\n\n"
            "If information is missing or ambiguous, make your best clinical guess based on the available data. "
            "Do not return an empty list. Always provide plausible hypotheses, even if you are uncertain.\n"
            "Only include 'perfectly healthy' or 'no significant findings' if there is minimal or no clinical evidence "
            "to support any pathological condition. If included, assign it a lower confidence unless it is clearly "
            "the most plausible conclusion. Prioritize likely medical diagnoses over normal findings.\n\n"
            "Provide an updated, improved list (5 items max) with confidence scores and justifications.\n"
            "Format:\n- Diagnosis: <name>\n  Confidence: <score>%\n  Justification: <reason>"
        )

    response = ask_gemini(prompt)
    diagnoses = []
    for block in response.split("- Diagnosis:")[1:]:
        lines = block.strip().splitlines()
        if len(lines) < 3:
            continue
        try:
            diagnosis = lines[0].strip()
            confidence = float(lines[1].split(":")[1].replace("%", "").strip())
            justification = lines[2].split(":", 1)[1].strip()
            diagnoses.append({
                "diagnosis": diagnosis,
                "confidence": confidence,
                "justification": justification
            })
        except:
            continue
    return diagnoses


def challenger_agent(diagnoses: List[Dict], case_summary: str) -> str:
    prompt = (
        f"You are the ChallengerAgent. Critique the following list of diagnoses based on this case summary:\n\n"
        f"{case_summary}\n\n"
        "Diagnoses:\n" +
        "\n".join([f"- {d['diagnosis']} ({d['confidence']}%)" for d in diagnoses]) +
        "\n\nPoint out weak or missing hypotheses, suggest alternatives, and expose faulty logic."
    )
    return ask_gemini(prompt)


def steward_agent(diagnoses: List[Dict]) -> List[Dict]:
    prompt = (
        "You are the StewardAgent. Review the following diagnoses for safety, risk, and cost-effectiveness.\n"
        "Remove any that are too risky or low-value. Justify your removals.\n"
        "If information is missing or ambiguous, do not remove all diagnoses. Always retain the most plausible hypotheses, even if you are uncertain. Never return an empty list.\n\n" +
        "\n".join([f"- {d['diagnosis']}: {d['justification']}" for d in diagnoses])
    )
    response = ask_gemini(prompt)
    allowed = []
    for diag in diagnoses:
        if f"- {diag['diagnosis']}" in response:
            allowed.append(diag)
    if not allowed and diagnoses:
        allowed = [diagnoses[0]]
    return allowed


def checklist_agent(diagnoses: List[Dict], case_summary: str) -> str:
    prompt = (
        "You are the ChecklistAgent. Review the reasoning and consistency of the following diagnostic list:\n\n"
        f"{case_summary}\n\n"
        "Diagnoses:\n" +
        "\n".join([f"- {d['diagnosis']} ({d['confidence']}%)" for d in diagnoses]) +
        "\n\nPoint out any logical flaws, gaps in reasoning, or missed procedural steps."
    )
    return ask_gemini(prompt)


def diagnoses_equal(d1: List[Dict], d2: List[Dict]) -> bool:
    names1 = sorted([x['diagnosis'].lower() for x in d1])
    names2 = sorted([x['diagnosis'].lower() for x in d2])
    return names1 == names2


def diagnostic_orchestrator_mai_dxo(case_summary: str, verbose: bool = True):
    if verbose:
        print("🔬 Running MAI-DxO Diagnostic Orchestrator (Multi-Round)...\n")

    last_diagnoses = []
    challenger_feedback = ""
    checklist_feedback = ""

    agent_steps = [
        "HypothesisAgent",
        "ChallengerAgent",
        "StewardAgent",
        "ChecklistAgent"
    ]
    total_steps = MAX_ROUNDS * len(agent_steps)
    progress = trange(total_steps, desc="MAI-DxO Progress", disable=verbose, leave=False)

    rounds = range(1, MAX_ROUNDS + 1)
    for round_num in rounds:
        if verbose:
            print(f"\n====================== 🔁 ROUND {round_num} ======================\n")

        current_diagnoses = hypothesis_agent(case_summary, round_num, challenger_feedback, checklist_feedback)
        if verbose:
            print("🔹 HypothesisAgent generating diagnoses...")
            for d in current_diagnoses:
                print(f"- {d['diagnosis']} ({d['confidence']}%): {d['justification']}")
            time.sleep(1.5)
        progress.update(1)

        if diagnoses_equal(current_diagnoses, last_diagnoses):
            if verbose:
                print("\n⚠️ Diagnoses have stabilized. Stopping early.\n")
            for _ in range(len(agent_steps) - 1):
                progress.update(1)
            break
        last_diagnoses = current_diagnoses

        challenger_feedback = challenger_agent(current_diagnoses, case_summary)
        if verbose:
            print("\n🔹 ChallengerAgent critiquing hypotheses...")
            print(challenger_feedback)
            time.sleep(1.5)
        progress.update(1)

        current_diagnoses = steward_agent(current_diagnoses)
        if verbose:
            print("\n🔹 StewardAgent applying filters...")
            for d in current_diagnoses:
                print(f"- {d['diagnosis']} retained")
            time.sleep(1.5)
        progress.update(1)

        checklist_feedback = checklist_agent(current_diagnoses, case_summary)
        if verbose:
            print("\n🔹 ChecklistAgent checking reasoning...")
            print(checklist_feedback)
            time.sleep(1.5)
        progress.update(1)

    progress.close()
    if verbose:
        print("\n✅ Final Diagnoses after MAI-DxO processing:")
        for idx, d in enumerate(current_diagnoses, 1):
            print(f"{idx}. {d['diagnosis']} ({d['confidence']}% confidence)")
    return current_diagnoses


def validation_agent(true_diagnosis: str, predicted_diagnosis: str) -> Dict[str, float]:
    prompt = (
        f"You are the ValidationAgent. Your job is to compare the true diagnosis and the predicted diagnosis "
        f"from a medical AI system.\n\n"
        f"True Diagnosis: {true_diagnosis}\n"
        f"Predicted Diagnosis: {predicted_diagnosis}\n\n"
        "Assess the semantic similarity, medical relevance, and diagnostic overlap between them. "
        "Return a score between 0 and 10, where:\n"
        "- 10 = perfect match\n- 5 = somewhat related\n- 0 = completely different\n\n"
        "Also provide a one-line reason.\n\n"
        "Format:\nScore: <number from 0 to 10>\nReason: <short reason>"
    )
    response = ask_gemini(prompt)
    score, reason = 0.0, "N/A"
    try:
        for line in response.splitlines():
            if line.lower().startswith("score:"):
                score = float(line.split(":", 1)[1].strip())
            elif line.lower().startswith("reason:"):
                reason = line.split(":", 1)[1].strip()
    except Exception:
        score = 0.0
    return {"score": score, "reason": reason}


if __name__ == "__main__":
    from parser import (
        MovementCSVParser,
        NutritionCSVParser,
        SupplementCSVParser,
        ComprehensiveAnalysisCSVParser,
        PhysicalEnvironmentCSVParser,
        SleepAndRecoveryCSVParser
    )

    csv_configs = [
        {
            'path': 'dataset/EVRA_Movement Dataset - General.csv',
            'parser': MovementCSVParser(),
            'diagnosis_col': 'diagnoses',
            'name': 'Movement'
        },
        {
            'path': 'dataset/EVRA_Nutrition Dataset - General.csv',
            'parser': NutritionCSVParser(),
            'diagnosis_col': 'diagnoses',
            'name': 'Nutrition'
        },
        {
            'path': 'dataset/EVRA_Supplement Dataset_new - General.csv',
            'parser': SupplementCSVParser(),
            'diagnosis_col': 'comorbidities',
            'name': 'Supplement'
        },
        {
            'path': 'dataset/EVRA_Comprehensive Analysis Report - Evra_20_Patient_Profiles',
            'parser': ComprehensiveAnalysisCSVParser(),
            'diagnosis_col': 'Diagnoses',
            'name': 'Comprehensive Analysis'
        },
        {
            'path': 'dataset/EVRA_Physical Environment Dataset - General.csv',
            'parser': PhysicalEnvironmentCSVParser(),
            'diagnosis_col': 'diagnoses',
            'name': 'Physical Environment'
        },
        {
            'path': 'dataset/EVRA_Sleep and Recovery Dataset - General.csv',
            'parser': SleepAndRecoveryCSVParser(),
            'diagnosis_col': 'comorbidities',
            'name': 'Sleep and Recovery'
        }
    ]

    def features_to_case_summary(features: dict) -> str:
        return '\n'.join([f"{k}: {v}" for k, v in features.items() if v])

    def evaluate_parser_on_csv(config):
        parser = config['parser']
        data = parser.parse(config['path'])
        score_sum = 0.0
        correct = 0
        soft_correct = 0
        total = 0
        print(f"\n===== Evaluating {config['name']} CSV =====")
        for row in data:
            features = row['features']
            true_diag = row['diagnosis'].strip().lower()
            case_summary = features_to_case_summary(features)
            preds = diagnostic_orchestrator_mai_dxo(case_summary, verbose=False)
            if not preds:
                print(f"True: {true_diag} | Predicted: None")
                continue

            pred_diag = preds[0]['diagnosis'].strip().lower()
            validation = validation_agent(true_diag, pred_diag)
            score = validation['score']
            reason = validation['reason']
            print(f"True: {true_diag} | Predicted: {pred_diag} | Score: {score}/10 | Reason: {reason}")

            if pred_diag == true_diag:
                correct += 1
            if score >= 7:
                soft_correct += 1
            score_sum += score
            total += 1

        print(f"Exact Match Accuracy: {correct}/{total} = {correct / total:.2%}")
        print(f"Soft Accuracy (Score ≥ 7): {soft_correct}/{total} = {soft_correct / total:.2%}")
        print(f"Average Similarity Score: {score_sum / total:.2f}/10")

# diagnostic_orchestrator_mai_dxo(case_summary)

if __name__ == "__main__":
    from parser import MovementCSVParser, NutritionCSVParser, SupplementCSVParser
    
    # Map CSVs to their parsers and diagnosis column
    csv_configs = [
        {
            'path': 'dataset/EVRA_Movement Dataset - General.csv',
            'parser': MovementCSVParser(),
            'diagnosis_col': 'diagnoses',
            'name': 'Movement'
        },
        {
            'path': 'dataset/EVRA_Nutrition Dataset - General.csv',
            'parser': NutritionCSVParser(),
            'diagnosis_col': 'diagnoses',
            'name': 'Nutrition'
        },
        {
            'path': 'dataset/EVRA_Supplement Dataset_new - General.csv',
            'parser': SupplementCSVParser(),
            'diagnosis_col': 'comorbidities',
            'name': 'Supplement'
        },
    ]

    def features_to_case_summary(features: dict) -> str:
        # Simple stringification; can be improved for more clinical context
        return '\n'.join([f"{k}: {v}" for k, v in features.items() if v])

    def evaluate_parser_on_csv(config):
        parser = config['parser']
        data = parser.parse(config['path'])
        correct = 0
        total = 0
        print(f"\n===== Evaluating {config['name']} CSV =====")
        for row in data:
            features = row['features']
            true_diag = row['diagnosis'].strip().lower()
            case_summary = features_to_case_summary(features)
            # Use only the first round of hypothesis_agent for speed
            preds = hypothesis_agent(case_summary, 1)
            if not preds:
                pred_diag = ''
            else:
                pred_diag = preds[0]['diagnosis'].strip().lower()
            print(f"True: {true_diag} | Predicted: {pred_diag}")
            if pred_diag and pred_diag in true_diag:
                correct += 1
            total += 1
        acc = correct / total if total else 0
        print(f"Accuracy: {correct}/{total} = {acc:.2%}")

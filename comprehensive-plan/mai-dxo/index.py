import os
import google.generativeai as genai
from dotenv import load_dotenv
from typing import List, Dict
import time

load_dotenv()
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))
model = genai.GenerativeModel("gemini-1.5-pro")

MAX_ROUNDS = 3


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
            "Format:\n- Diagnosis: <name>\n  Confidence: <score>%\n  Justification: <reason>"
        )
    else:
        prompt = (
            f"You are the HypothesisAgent in Round {round_num}. Update your list of differential diagnoses "
            f"based on the previous round's critiques and checklist feedback.\n\n"
            f"Case Summary:\n{case_summary}\n\n"
            f"ChallengerAgent Feedback:\n{challenger_feedback}\n\n"
            f"ChecklistAgent Feedback:\n{checklist_feedback}\n\n"
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
        "Remove any that are too risky or low-value. Justify your removals.\n\n" +
        "\n".join([f"- {d['diagnosis']}: {d['justification']}" for d in diagnoses])
    )
    response = ask_gemini(prompt)
    allowed = []
    for diag in diagnoses:
        # Only retain if diagnosis is explicitly listed as retained in the response
        # (e.g., by parsing a 'Retained:' or similar section, or by stricter matching)
        if f"- {diag['diagnosis']}" in response:
            allowed.append(diag)
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


def diagnostic_orchestrator_mai_dxo(case_summary: str):
    print("🔬 Running MAI-DxO Diagnostic Orchestrator (Multi-Round)...\n")

    last_diagnoses = []
    challenger_feedback = ""
    checklist_feedback = ""

    for round_num in range(1, MAX_ROUNDS + 1):
        print(f"\n====================== 🔁 ROUND {round_num} ======================\n")

        # Step 1: HypothesisAgent
        print("🔹 HypothesisAgent generating diagnoses...")
        current_diagnoses = hypothesis_agent(case_summary, round_num, challenger_feedback, checklist_feedback)
        for d in current_diagnoses:
            print(f"- {d['diagnosis']} ({d['confidence']}%): {d['justification']}")
        time.sleep(1.5)

        if diagnoses_equal(current_diagnoses, last_diagnoses):
            print("\n⚠️ Diagnoses have stabilized. Stopping early.\n")
            break
        last_diagnoses = current_diagnoses

        # Step 2: ChallengerAgent
        print("\n🔹 ChallengerAgent critiquing hypotheses...")
        challenger_feedback = challenger_agent(current_diagnoses, case_summary)
        print(challenger_feedback)
        time.sleep(1.5)

        # Step 3: StewardAgent
        print("\n🔹 StewardAgent applying filters...")
        current_diagnoses = steward_agent(current_diagnoses)
        for d in current_diagnoses:
            print(f"- {d['diagnosis']} retained")
        time.sleep(1.5)

        # Step 4: ChecklistAgent
        print("\n🔹 ChecklistAgent checking reasoning...")
        checklist_feedback = checklist_agent(current_diagnoses, case_summary)
        print(checklist_feedback)
        time.sleep(1.5)

    # Final Output
    print("\n✅ Final Diagnoses after MAI-DxO processing:")
    for idx, d in enumerate(current_diagnoses, 1):
        print(f"{idx}. {d['diagnosis']} ({d['confidence']}% confidence)")


# 🧪 Example Case
case_summary = """
A 42-year-old male presents with persistent low-grade fever, night sweats, weight loss, and a productive cough with occasional blood for the past 3 weeks. He recently returned from a trip to rural India. Chest X-ray shows upper lobe infiltrates. He has no prior significant medical history.
"""

diagnostic_orchestrator_mai_dxo(case_summary)

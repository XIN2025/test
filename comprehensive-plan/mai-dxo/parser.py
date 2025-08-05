import csv
from typing import List, Dict

class BaseParser:
    def parse(self, file_path: str) -> List[Dict]:
        raise NotImplementedError

class MovementCSVParser(BaseParser):
    def parse(self, file_path: str) -> List[Dict]:
        rows = []
        feature_columns = [
            'day',
            'age',
            'sex',
            'weight_kg',
            'height_cm',
            'BMI',
            'pain_score_today',
            'muscle_soreness_today',
            'last_movement_day',
            'step_count_prev_day',
            'avg_step_count_past_7_days',
            'resting_hr',
            'hrv_rmssd',
            'fatigue_level_today',
            'subjective_energy_level',
            'previous_movement_nudge',
            'followed_previous_nudge',
            'priority_pillars',
            'key_biomarkers',
            'user_goals'
        ]
        with open(file_path, encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            for row in reader:
                if 'diagnoses' in row and row['diagnoses']:
                    features = {k: row.get(k, "") for k in feature_columns}
                    rows.append({
                        'features': features,
                        'diagnosis': row['diagnoses']
                    })
        return rows

class NutritionCSVParser(BaseParser):
    def parse(self, file_path: str) -> List[Dict]:
        rows = []
        feature_columns = [
            'main_condition',
            'secondary_conditions',
            'report_date',
            'day',
            'fasting_glucose',
            'CRP',
            'IL-6',
            'triglycerides',
            'HDL',
            'LDL',
            'homocysteine',
            'B12',
            'folate',
            'vitamin_D',
            'GGT',
            'ALT',
            'AST',
            'magnesium',
            'zinc',
            'ferritin',
            'HRV',
            'REM_sleep',
            'total_sleep_hours',
            'step_count_prev_day',
            'activity_level_prev_day',
            'subjective_energy',
            'diet_type',
            'food_preferences',
            'cravings',
            'GI_symptoms',
            'food_triggers',
            'health_goals',
            'current_medications',
            'allergies',
            'tier_1_flags',
            'tier_2_flags',
            'tier_3_flags',
            'priority_pillars',
            'key_biomarkers',
            'previous_nutrition_nudge'
        ]
        with open(file_path, encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            for row in reader:
                if 'diagnoses' in row and row['diagnoses']:
                    features = {k: row.get(k, "") for k in feature_columns}
                    rows.append({
                        'features': features,
                        'diagnosis': row['diagnoses']
                    })
        return rows

class SupplementCSVParser(BaseParser):
    def parse(self, file_path: str) -> List[Dict]:
        rows = []
        with open(file_path, encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            for row in reader:
                if 'comorbidities' in row and row['comorbidities']:
                    rows.append({
                        'features': {k: v for k, v in row.items() if k != 'comorbidities'},
                        'diagnosis': row['comorbidities']
                    })
        return rows

class ComprehensiveAnalysisCSVParser(BaseParser):
    def parse(self, file_path: str) -> List[Dict]:
        rows = []
        feature_columns = [
            'Sex',
            'Age',
            'Weight (kg)',
            'Height (cm)',
            'BMI',
            'Symptoms',
            'Key Lab Findings',
            'Wearable Findings',
            'User Stated Goals',
            'Tiered Insight Delivery',
            'Cross-Validated Logic',
            'Personalized Action Plan',
            'Nutrition Plan Tiering',
            'Lifestyle PIllars',  # Note the capital 'I'
            'Supplement Plan'
        ]
        with open(file_path, encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            for row in reader:
                if 'Diagnoses' in row and row['Diagnoses']:
                    features = {k: row.get(k, "") for k in feature_columns}
                    rows.append({
                        'features': features,
                        'diagnosis': row['Diagnoses']
                    })
        return rows

class PhysicalEnvironmentCSVParser(BaseParser):
    def parse(self, file_path: str) -> List[Dict]:
        rows = []
        feature_columns = [
            'user_id',
            'date',
            'main_condition',
            'reported_symptoms',
            'user_goals',
            'CRP',
            'GGT',
            'Vitamin_D',
            'sleep_duration',
            'rem_sleep',
            'hrv_rmssd',
            'resting_hr',
            'skin_temp_delta',
            'step_count_prev_day',
            'air_quality_exposure',
            'blue_light_exposure_evening',
            'noise_exposure_night',
            'access_to_nature',
            'indoor_light_exposure_morning',
            'cleaning_product_sensitivity',
            'previous_nudge',
            'previous_nudge_followed'
        ]
        with open(file_path, encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            for row in reader:
                if 'diagnoses' in row and row['diagnoses']:
                    features = {k: row.get(k, "") for k in feature_columns}
                    rows.append({
                        'features': features,
                        'diagnosis': row['diagnoses']
                    })
        return rows

class SleepAndRecoveryCSVParser(BaseParser):
    def parse(self, file_path: str) -> List[Dict]:
        rows = []
        feature_columns = [
            'user_id',
            'day',
            'main_condition',
            'comorbidities',
            'sleep_duration',
            'rem_sleep_percentage',
            'deep_sleep_percentage',
            'hrv_rmssd',
            'resting_hr',
            'sleep_onset_latency',
            'wake_after_sleep_onset',
            'screen_off_by_10pm',
            'alcohol_consumed_prev_day',
            'caffeine_afternoon',
            'magnesium_taken',
            'stress_rating',
            'subjective_energy',
            'evening_light_exposure',
            'physical_activity_level_prev_day',
            'meal_timing_score',
            'night_waking_events',
            'lab_HbA1c',
            'lab_CRP',
            'lab_Cortisol_Morning',
            'car_priority_pillars',
            'car_tier_1_flags',
            'user_sleep_goal',
            'previous_sleep_nudge',
            'nudge_followed'
        ]
        with open(file_path, encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            for row in reader:
                if 'comorbidities' in row and row['comorbidities']:
                    features = {k: row.get(k, "") for k in feature_columns}
                    rows.append({
                        'features': features,
                        'diagnosis': row['comorbidities']
                    })
        return rows

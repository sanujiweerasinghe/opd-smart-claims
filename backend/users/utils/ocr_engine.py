import google.generativeai as genai
import cv2
import numpy as np
import json
import re
from PIL import Image
from django.conf import settings

# 1. Configuration
if not hasattr(settings, 'GOOGLE_API_KEY') or not settings.GOOGLE_API_KEY:
    print(" ⚠️ WARNING: GOOGLE_API_KEY is missing in settings.py. OCR will fail.")
else:
    genai.configure(api_key=settings.GOOGLE_API_KEY)

def preprocess_image(image_file):
    """
    Cleans up the image using OpenCV to improve OCR accuracy.
    Resizes if too small, denoises, and converts to format Gemini accepts.
    """
    try:
        # Reset file pointer to the beginning
        image_file.seek(0)
        
        # Read file into numpy array
        file_bytes = np.frombuffer(image_file.read(), np.uint8)
        img = cv2.imdecode(file_bytes, cv2.IMREAD_COLOR)
        
        if img is None:
            return None
        
        # Check resolution and upscale if too small (common with mobile uploads)
        h, w = img.shape[:2]
        if h < 600 or w < 600:
            scale = 800 / min(h, w)
            img = cv2.resize(img, (int(w*scale), int(h*scale)), interpolation=cv2.INTER_CUBIC)

        # Convert to Grayscale to reduce noise
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        # Apply Gaussian Blur to remove grain
        gray = cv2.GaussianBlur(gray, (5, 5), 0)
        
        # Convert back to RGB (Gemini expects RGB images)
        processed_img = cv2.cvtColor(gray, cv2.COLOR_GRAY2RGB)
        return Image.fromarray(processed_img)

    except Exception as e:
        print(f"Image Preprocessing Error: {e}")
        return None

def clean_json_output(text):
    """
    Strips Markdown (```json ... ```) and extracts the raw JSON string.
    """
    try:
        # Remove code blocks
        text = re.sub(r"```json|```", "", text, flags=re.IGNORECASE).strip()
        
        # Find the first '{' and last '}' to ensure we get the object
        match = re.search(r'\{.*\}', text, re.DOTALL)
        if match:
            text = match.group(0)
            
        return json.loads(text)
    except json.JSONDecodeError:
        # Fallback: try replacing single quotes with double quotes
        try:
            return json.loads(text.replace("'", '"'))
        except:
            return None

def extract_data(image_file):
    """
    Main function to send image to Google Gemini and get structured JSON.
    """
    try:
        # 1. Preprocess
        processed_img = preprocess_image(image_file)
        if not processed_img:
            return None
        
        # 2. Select Model (Flash is faster/cheaper for OCR)
        
        model = genai.GenerativeModel('gemini-2.5-flash')

        # 3. The Prompt (Tailored for Sri Lankan OPD/Dental/Spectacles)
        prompt = """
        You are an AI Claims Assessor for OPD Insurance.
        Analyze this medical image and extract data into a valid JSON format.
        
        ### SCOPE
        Only extract data relevant to: OPD (Out Patient), Dental, or Spectacles (Vision).
        Ignore hospitalization or room charges.

        ### 1. CLASSIFY DOCUMENT
        - "Prescription": Contains 'Rx', Doctor Name, Medicines.
        - "Bill": Contains 'Invoice', 'Total', 'LKR'.
        - "Report": Lab report or test result.

        ### 2. EXTRACT ENTITIES
        - Patient Name (Look for 'Mr/Mrs/Ms/Master/Baby').
        - Doctor Name (Look for 'Dr.', 'Consultant', 'Prof').
        - Date (Bill or Visit Date).
        - Diagnosis (Medical condition, e.g., 'Viral Fever', 'Myopia').
        
        ### 3. EXTRACT LINE ITEMS
        Categorize items into:
        - "Medicine": Drugs, pills, syrups.
        - "Consultation": Doctor/Channeling fees.
        - "Lab": Blood tests, X-rays, UFR, FBS.
        - "Spectacle": Frames, Lenses.
        - "Non-Medical": Food, Toiletries (These are exclusions).

        ### 4. OUTPUT JSON STRUCTURE
        {
            "document_class": "Bill" | "Prescription" | "Report",
            "ocr_confidence": 0-100,
            "metadata": {
                "patient_name": "String or null",
                "doctor_name": "String or null",
                "date": "YYYY-MM-DD",
                "diagnosis": "String or null",
                "claim_sub_type": "General" | "Dental" | "Spectacles"
            },
            "line_items": [
                {"item": "Panadol", "category": "Medicine", "qty": 10, "price": 150.00},
                {"item": "Consultation Fee", "category": "Consultation", "qty": 1, "price": 2000.00}
            ],
            "financials": {
                "total_amount": 0.00
            }
        }
        """

        # 4. Generate Content
        response = model.generate_content([prompt, processed_img])
        
        # 5. Clean & Parse JSON
        data = clean_json_output(response.text)
        
        if data is None:
            print(f"AI returned invalid JSON: {response.text[:100]}...")
            return None
            
        return data

    except Exception as e:
        print(f"AI/OCR Error: {e}")
        return None
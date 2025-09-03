from openai import OpenAI
import os
from dotenv import load_dotenv
load_dotenv()

# Test API key
API_KEY = os.getenv("OPENAI_KEY")
print("Using OpenAI API Key:", API_KEY)

def test_openai_api():
    try:
        # Initialize the client
        client = OpenAI(api_key=API_KEY)
        
        # Try to make a simple API call
        response = client.chat.completions.create(
            model="gpt-4o-mini",  # Using the model from your env
            messages=[{"role": "user", "content": "Simple test message. Say hi!"}],
            temperature=0.1
        )
        
        print("✅ API call successful!")
        print("Response:", response.choices[0].message.content)
        
    except Exception as e:
        print("❌ Error occurred:")
        print(str(e))
        if "quota" in str(e).lower():
            print("This appears to be a quota-related error.")

if __name__ == "__main__":
    test_openai_api()

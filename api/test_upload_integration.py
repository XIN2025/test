#!/usr/bin/env python3
"""
Test script for upload integration with progress tracking
"""

import asyncio
import aiohttp
import json
import time
from pathlib import Path

# Test configuration
API_BASE_URL = "http://localhost:8000"
TEST_FILE_PATH = "test_document.txt"

async def test_upload_integration():
    """Test the complete upload flow with progress tracking"""
    
    # Create a test document if it doesn't exist
    if not Path(TEST_FILE_PATH).exists():
        test_content = """
        Medical Document Test
        
        Patient: John Doe
        Age: 35
        Diagnosis: Hypertension
        Treatment: Lisinopril 10mg daily
        Doctor: Dr. Smith
        Hospital: City General Hospital
        
        The patient has been diagnosed with hypertension and is prescribed 
        Lisinopril for blood pressure management. Regular monitoring is required.
        """
        
        with open(TEST_FILE_PATH, "w") as f:
            f.write(test_content)
        print(f"Created test file: {TEST_FILE_PATH}")
    
    async with aiohttp.ClientSession() as session:
        print("🚀 Starting upload integration test...")
        
        # Step 1: Upload document
        print("\n📤 Step 1: Uploading document...")
        
        with open(TEST_FILE_PATH, "rb") as f:
            data = aiohttp.FormData()
            data.add_field('file', f, filename=TEST_FILE_PATH)
            
            async with session.post(f"{API_BASE_URL}/upload/document", data=data) as response:
                if response.status != 200:
                    print(f"❌ Upload failed: {response.status}")
                    error_text = await response.text()
                    print(f"Error: {error_text}")
                    return
                
                result = await response.json()
                upload_id = result.get('upload_id')
                print(f"✅ Upload started successfully")
                print(f"   Upload ID: {upload_id}")
                print(f"   Filename: {result.get('filename')}")
        
        # Step 2: Monitor progress
        print("\n📊 Step 2: Monitoring progress...")
        
        max_attempts = 30  # 30 seconds timeout
        attempt = 0
        
        while attempt < max_attempts:
            async with session.get(f"{API_BASE_URL}/upload/progress/{upload_id}") as response:
                if response.status != 200:
                    print(f"❌ Failed to get progress: {response.status}")
                    break
                
                progress_data = await response.json()
                progress = progress_data.get('progress', {})
                
                percentage = progress.get('percentage', 0)
                message = progress.get('message', 'Unknown')
                status = progress.get('status', 'unknown')
                entities_count = progress.get('entities_count', 0)
                relationships_count = progress.get('relationships_count', 0)
                
                print(f"   Progress: {percentage}% - {message}")
                print(f"   Status: {status}")
                if entities_count > 0 or relationships_count > 0:
                    print(f"   Entities: {entities_count}, Relationships: {relationships_count}")
                
                if status == 'completed':
                    print(f"✅ Document processing completed successfully!")
                    print(f"   Final entities: {entities_count}")
                    print(f"   Final relationships: {relationships_count}")
                    break
                elif status == 'failed':
                    error_msg = progress.get('error_message', 'Unknown error')
                    print(f"❌ Document processing failed: {error_msg}")
                    break
                
                attempt += 1
                await asyncio.sleep(1)
        
        if attempt >= max_attempts:
            print("⏰ Timeout: Progress monitoring exceeded maximum attempts")
        
        # Step 3: Get all progress (optional)
        print("\n📈 Step 3: Getting all upload progress...")
        async with session.get(f"{API_BASE_URL}/upload/all-progress") as response:
            if response.status == 200:
                all_progress = await response.json()
                stats = all_progress.get('stats', {})
                print(f"   Total uploads: {stats.get('total_uploads', 0)}")
                print(f"   Processing: {stats.get('processing', 0)}")
                print(f"   Completed: {stats.get('completed', 0)}")
                print(f"   Failed: {stats.get('failed', 0)}")
            else:
                print(f"❌ Failed to get all progress: {response.status}")
        
        print("\n🎉 Upload integration test completed!")

if __name__ == "__main__":
    asyncio.run(test_upload_integration()) 
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
import os
from dotenv import load_dotenv
import google.generativeai as genai

# Load environment variables
load_dotenv()

router = APIRouter()

# Configure Gemini API
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    model = genai.GenerativeModel('gemini-flash-latest')
else:
    model = None

class ChatMessage(BaseModel):
    message: str
    history: List[dict] = []

@router.post("/")
async def chat_interaction(data: ChatMessage):
    user_msg = data.message

    if not model:
        raise HTTPException(status_code=500, detail="Gemini API key not configured")

    try:
        # System context for Sarathi
        system_context = """You are Sarathi, an AI assistant for a military convoy management system called SmartConvoy AI (SARATHI).
        You help military personnel with:
        - Convoy status and monitoring
        - Route planning and optimization
        - Risk assessment and threat analysis
        - Weather conditions
        - Vehicle tracking
        - Checkpoint management

        Be professional, concise, and military-focused in your responses. Use tactical language when appropriate.
        Start responses with military courtesy like "Jai Hind" when greeted.
        """

        # Construct the full prompt
        full_prompt = f"{system_context}\n\nUser: {user_msg}\n\nSarathi:"

        # Generate response using Gemini
        response = model.generate_content(full_prompt)

        return {"response": response.text}

    except Exception as e:
        print(f"Gemini API Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate response: {str(e)}")

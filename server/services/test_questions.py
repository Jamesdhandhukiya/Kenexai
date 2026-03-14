"""Test question bank and grading for KenexAI.

This module provides real-time MCQ generation via Open Router (from .env), Gemini, Grok, or OpenAI
using course link and course name. Falls back to built-in question bank only when the API fails.
"""

import os
import json
import re
import sys
import traceback
from typing import List, Dict, Any, Optional

import httpx

# Ensure .env is loaded so OPENROUTER_API_KEY / GEMINI_API_KEY etc. are available
try:
    from dotenv import load_dotenv
    _env_path = os.path.join(os.path.dirname(__file__), '..', '..', '.env')
    load_dotenv(_env_path)
except Exception:
    pass


def _log_error(title: str, *lines: str) -> None:
    """Print a clearly visible error block to the terminal."""
    sep = "=" * 60
    print(f"\n{sep}\n  [KenexAI OPEN ROUTER ERROR] {title}\n{sep}", file=sys.stderr)
    for line in lines:
        print(f"  {line}", file=sys.stderr)
    print(sep, file=sys.stderr)

# Cache for AI-generated questions so grading can use the same set. Key: (course, course_link or "")
_GENERATED_QUESTIONS_CACHE: Dict[tuple, List[Dict[str, Any]]] = {}

# A small question bank for each course topic.
# Each question includes an "id" and a "type" (mcq | text). MCQs include options and a correct index.
# Text questions include expected keywords for basic grading.
QUESTION_BANK: Dict[str, List[Dict[str, Any]]] = {
    "Basic SQL": [
        {
            "id": "basic_sql_1",
            "type": "mcq",
            "question": "Which SQL statement is used to retrieve data from a database?",
            "options": ["INSERT", "SELECT", "UPDATE", "DELETE"],
            "correct_index": 1,
        },
        {
            "id": "basic_sql_2",
            "type": "mcq",
            "question": "What keyword is used to sort the result-set in ascending order?",
            "options": ["ORDER BY", "GROUP BY", "SORT", "FILTER"],
            "correct_index": 0,
        },
        {
            "id": "basic_sql_3",
            "type": "text",
            "question": "In one sentence, explain what a primary key is used for in a table.",
            "expected_keywords": ["unique", "identify", "row", "primary key"],
        },
        {
            "id": "basic_sql_4",
            "type": "mcq",
            "question": "Which SQL clause is used to filter rows based on a condition?",
            "options": ["WHERE", "HAVING", "FROM", "JOIN"],
            "correct_index": 0,
        },
    ],
    "Advanced SQL": [
        {
            "id": "adv_sql_1",
            "type": "mcq",
            "question": "Which JOIN returns records that have matching values in both tables?",
            "options": ["LEFT JOIN", "RIGHT JOIN", "INNER JOIN", "FULL OUTER JOIN"],
            "correct_index": 2,
        },
        {
            "id": "adv_sql_2",
            "type": "mcq",
            "question": "What is the purpose of the GROUP BY clause?",
            "options": [
                "To sort the results",
                "To aggregate rows based on columns",
                "To filter rows after aggregation",
                "To combine results from multiple queries",
            ],
            "correct_index": 1,
        },
        {
            "id": "adv_sql_3",
            "type": "text",
            "question": "Describe when you would use a window function (e.g., ROW_NUMBER(), RANK()) in SQL.",
            "expected_keywords": ["over", "partition", "window", "ranking", "row_number"],
        },
        {
            "id": "adv_sql_4",
            "type": "mcq",
            "question": "Which SQL feature helps avoid duplicate rows in the result set?",
            "options": ["DISTINCT", "UNIQUE", "LIMIT", "GROUP BY"],
            "correct_index": 0,
        },
    ],
    "Python Basics": [
        {
            "id": "py_basic_1",
            "type": "mcq",
            "question": "What is the correct way to create a function in Python?",
            "options": [
                "function my_func():", 
                "def my_func():", 
                "create my_func():", 
                "func my_func():"
            ],
            "correct_index": 1,
        },
        {
            "id": "py_basic_2",
            "type": "mcq",
            "question": "Which data type is immutable in Python?",
            "options": ["list", "dict", "set", "tuple"],
            "correct_index": 3,
        },
        {
            "id": "py_basic_3",
            "type": "text",
            "question": "What is the difference between a list and a tuple in Python?",
            "expected_keywords": ["immutable", "change", "modify", "tuple", "list"],
        },
        {
            "id": "py_basic_4",
            "type": "mcq",
            "question": "How do you start a for loop that loops over items in a list called items?",
            "options": [
                "for i in range(items):",
                "for i in items:",
                "for i = 0; i < len(items); i++:",
                "foreach i in items:"
            ],
            "correct_index": 1,
        },
    ],
    "Advanced Python": [
        {
            "id": "adv_py_1",
            "type": "mcq",
            "question": "Which construct is used to create a class in Python?",
            "options": ["class MyClass:", "def MyClass:", "module MyClass:", "object MyClass:"],
            "correct_index": 0,
        },
        {
            "id": "adv_py_2",
            "type": "mcq",
            "question": "What does the `@staticmethod` decorator do?",
            "options": [
                "Defines a method that receives the instance as first arg",
                "Defines a method that can be called without an instance",
                "Creates a private method",
                "Ensures the method is only called once"
            ],
            "correct_index": 1,
        },
        {
            "id": "adv_py_3",
            "type": "text",
            "question": "Explain what a Python generator is and when you would use it.",
            "expected_keywords": ["yield", "iterator", "lazy", "memory", "generator"],
        },
        {
            "id": "adv_py_4",
            "type": "mcq",
            "question": "Which built-in module is commonly used for unit testing in Python?",
            "options": ["pytest", "unittest", "nose", "doctest"],
            "correct_index": 1,
        },
    ],
    "NumPy & Pandas": [
        {
            "id": "np_pd_1",
            "type": "mcq",
            "question": "Which library provides the DataFrame data structure?",
            "options": ["NumPy", "Pandas", "Matplotlib", "Scikit-learn"],
            "correct_index": 1,
        },
        {
            "id": "np_pd_2",
            "type": "mcq",
            "question": "What is the primary purpose of NumPy arrays?",
            "options": [
                "Text processing",
                "Numerical computations",
                "Web scraping",
                "Database queries"
            ],
            "correct_index": 1,
        },
        {
            "id": "np_pd_3",
            "type": "text",
            "question": "Name one method used to select a column from a pandas DataFrame.",
            "expected_keywords": ["df[", "dot notation", "df.col", "loc", "iloc"],
        },
        {
            "id": "np_pd_4",
            "type": "mcq",
            "question": "What does the pandas `dropna()` method do?",
            "options": [
                "Drop columns with NaN", 
                "Fill NaN values", 
                "Remove rows/columns with missing values", 
                "Sort values" 
            ],
            "correct_index": 2,
        },
    ],
    "Machine Learning Fundamentals": [
        {
            "id": "ml_1",
            "type": "mcq",
            "question": "Which of the following is a supervised learning algorithm?",
            "options": ["K-means", "Linear Regression", "PCA", "Apriori"],
            "correct_index": 1,
        },
        {
            "id": "ml_2",
            "type": "mcq",
            "question": "What is overfitting?",
            "options": [
                "Model performs well on training but poorly on new data",
                "Model is too simple",
                "Model never learns",
                "Model has no variance"
            ],
            "correct_index": 0,
        },
        {
            "id": "ml_3",
            "type": "text",
            "question": "Name a common metric used to evaluate classification models.",
            "expected_keywords": ["accuracy", "precision", "recall", "f1", "roc"],
        },
        {
            "id": "ml_4",
            "type": "mcq",
            "question": "Which library is commonly used for machine learning in Python?",
            "options": ["TensorFlow", "NumPy", "Matplotlib", "Scikit-learn"],
            "correct_index": 3,
        },
    ],
    "Deep Learning Intro": [
        {
            "id": "dl_1",
            "type": "mcq",
            "question": "What does the term 'neuron' refer to in deep learning models?",
            "options": [
                "A single data point",
                "A processing unit in a neural network",
                "A type of activation function",
                "A loss calculation"
            ],
            "correct_index": 1,
        },
        {
            "id": "dl_2",
            "type": "mcq",
            "question": "Which activation function is commonly used in hidden layers?",
            "options": ["Softmax", "ReLU", "Linear", "Sigmoid"],
            "correct_index": 1,
        },
        {
            "id": "dl_3",
            "type": "text",
            "question": "In one sentence, explain what backpropagation is used for.",
            "expected_keywords": ["gradient", "weights", "loss", "update", "learning"],
        },
        {
            "id": "dl_4",
            "type": "mcq",
            "question": "Which library is specifically designed for building and training deep learning models?",
            "options": ["NumPy", "Pandas", "TensorFlow", "BeautifulSoup"],
            "correct_index": 2,
        },
    ],
    "Cloud Fundamentals": [
        {
            "id": "cloud_1",
            "type": "mcq",
            "question": "What does IaaS stand for?",
            "options": ["Infrastructure as a Service", "Internet as a Service", "Integration as a Service", "Instance as a Service"],
            "correct_index": 0,
        },
        {
            "id": "cloud_2",
            "type": "mcq",
            "question": "Which of these is a major cloud provider?",
            "options": ["AWS", "Linux", "GitHub", "Nginx"],
            "correct_index": 0,
        },
        {
            "id": "cloud_3",
            "type": "text",
            "question": "Name one benefit of using cloud infrastructure for applications.",
            "expected_keywords": ["scalability", "cost", "availability", "elastic", "maintenance"],
        },
        {
            "id": "cloud_4",
            "type": "mcq",
            "question": "Which service model provides executable code without managing servers?",
            "options": ["PaaS", "IaaS", "SaaS", "FaaS"],
            "correct_index": 3,
        },
    ],
    "Docker Essentials": [
        {
            "id": "docker_1",
            "type": "mcq",
            "question": "What does Docker primarily provide?",
            "options": ["Virtual machines", "Containerization", "Database management", "Load balancing"],
            "correct_index": 1,
        },
        {
            "id": "docker_2",
            "type": "mcq",
            "question": "Which file defines how to build a Docker image?",
            "options": ["Dockerfile", "docker-compose.yml", "docker.config", "Dockerfile.yml"],
            "correct_index": 0,
        },
        {
            "id": "docker_3",
            "type": "text",
            "question": "What is the purpose of a Docker image?",
            "expected_keywords": ["snapshot", "container", "build", "environment", "application"],
        },
        {
            "id": "docker_4",
            "type": "mcq",
            "question": "Which command runs a container from an image?",
            "options": ["docker build", "docker run", "docker push", "docker pull"],
            "correct_index": 1,
        },
    ],
    "Power BI Analytics": [
        {
            "id": "powerbi_1",
            "type": "mcq",
            "question": "Which tool is used for interactive dashboards in Power BI?",
            "options": ["Power Query", "Power Pivot", "Power View", "Power BI Desktop"],
            "correct_index": 3,
        },
        {
            "id": "powerbi_2",
            "type": "mcq",
            "question": "What language is used to create custom measures in Power BI?",
            "options": ["DAX", "M", "SQL", "Python"],
            "correct_index": 0,
        },
        {
            "id": "powerbi_3",
            "type": "text",
            "question": "What is a data model in Power BI used for?",
            "expected_keywords": ["relationships", "tables", "analysis", "schema", "measure"],
        },
        {
            "id": "powerbi_4",
            "type": "mcq",
            "question": "Which visualization type is best for showing part-to-whole relationships?",
            "options": ["Line chart", "Bar chart", "Pie chart", "Scatter plot"],
            "correct_index": 2,
        },
    ],
}


def _extract_json_from_text(text: str):
    """Attempt to extract the first JSON array or object from a string."""
    # Prefer arrays (our generator returns a JSON array of questions)
    start = text.find('[')
    end = text.rfind(']')
    if start != -1 and end != -1 and end > start:
        try:
            return json.loads(text[start:end + 1])
        except Exception:
            pass

    # Fallback to object extraction
    start = text.find('{')
    end = text.rfind('}')
    if start != -1 and end != -1 and end > start:
        try:
            return json.loads(text[start:end + 1])
        except Exception:
            pass

    return None


def _generate_questions_from_ai(
    course: str, count: int, api_key: str, course_link: Optional[str] = None
) -> List[Dict[str, Any]]:
    """Generate MCQs for a course using Gemini / Grok (xAI) / OpenAI / OpenRouter.

    Uses course name and course_link so the LLM can infer technologies and topics
    taught in the course and generate relevant questions. Returns empty list on failure.
    """
    if not api_key or count <= 0:
        _log_error(
            "No API key or invalid count",
            f"OPENROUTER_API_KEY set: {bool(os.getenv('OPENROUTER_API_KEY'))}",
            f"GEMINI_API_KEY set: {bool(os.getenv('GEMINI_API_KEY'))}",
            f"XAI_API_KEY (Grok) set: {bool(os.getenv('XAI_API_KEY'))}",
            f"OPENAI_API_KEY set: {bool(os.getenv('OPENAI_API_KEY'))}",
            f"count={count}",
        )
        return []

    link_context = ""
    if course_link and course_link.strip() and course_link != "#":
        link_context = (
            f" The course link is: {course_link.strip()}. "
            "Use the course name and link to infer all technologies, tools, and topics taught in this course "
            "(e.g. from URL path or platform: SQL, Python, Docker, Power BI, etc.) and generate questions covering those."
        )
    prompt = (
        "You are an expert technical trainer. Generate exactly {count} multiple-choice (MCQ) questions for the course '{course}'. "
        "{link_context}"
        "Cover all key technologies and topics that would be taught in this course. "
        "Return ONLY valid JSON (no explanation, no markdown) as a single array of objects. "
        "Each object must have: id (string), type ('mcq'), question (string), options (array of exactly 4 strings), correct_index (0-3). "
        "Do not include anything outside the JSON array."
    ).format(course=course, count=count, link_context=link_context)

    # Priority: OpenRouter first (from .env), then Gemini > Grok > OpenAI
    api_key_openrouter = (os.getenv('OPENROUTER_API_KEY') or '').strip()
    api_key_gemini = (os.getenv('GEMINI_API_KEY') or '').strip()
    api_key_grok = (os.getenv('XAI_API_KEY') or os.getenv('GROK_API_KEY') or '').strip()
    api_key_openai = (os.getenv('OPENAI_API_KEY') or '').strip()

    use_gemini_response = False
    if api_key_openrouter:
        provider = "OpenRouter"
        model = (os.getenv('OPENROUTER_MODEL') or 'gpt-4o-mini').strip()
        url = 'https://openrouter.ai/api/v1/chat/completions'
        api_key = api_key_openrouter
        headers = {'Authorization': f'Bearer {api_key}', 'Content-Type': 'application/json'}
        body = {
            'model': model,
            'messages': [{'role': 'user', 'content': prompt}],
            'temperature': 0.6,
            'max_tokens': 5000,
        }
    elif api_key_gemini:
        use_gemini_response = True
        provider = "Gemini (Google AI)"
        model = (os.getenv('GEMINI_MODEL') or 'gemini-2.5-flash').strip()
        if model.startswith('gemini-1.5'):
            model = 'gemini-2.5-flash'
        url = f'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent'
        api_key = api_key_gemini
        headers = {'Content-Type': 'application/json', 'x-goog-api-key': api_key}
        body = {
            'contents': [{'parts': [{'text': prompt}]}],
            'generationConfig': {'temperature': 0.6, 'maxOutputTokens': 5000},
        }
    elif api_key_grok:
        provider = "Grok (xAI)"
        model = (os.getenv('XAI_MODEL') or os.getenv('GROK_MODEL') or 'grok-3-latest').strip()
        url = 'https://api.x.ai/v1/chat/completions'
        api_key = api_key_grok
        headers = {'Authorization': f'Bearer {api_key}', 'Content-Type': 'application/json'}
        body = {
            'model': model,
            'messages': [{'role': 'user', 'content': prompt}],
            'temperature': 0.6,
            'max_tokens': 5000,
        }
    else:
        provider = "OpenAI"
        model = (os.getenv('OPENAI_MODEL') or 'gpt-4o-mini').strip()
        url = 'https://api.openai.com/v1/chat/completions'
        api_key = api_key_openai
        headers = {'Authorization': f'Bearer {api_key}', 'Content-Type': 'application/json'}
        body = {
            'model': model,
            'messages': [{'role': 'user', 'content': prompt}],
            'temperature': 0.6,
            'max_tokens': 5000,
        }

    print(f"\n[KenexAI] --- Question generation ---")
    print(f"[KenexAI] Provider: {provider}  |  URL: {url[:60]}...")
    print(f"[KenexAI] Model: {model}  |  Course: {course}  |  Count: {count}")
    print(f"[KenexAI] Course link: {course_link or '(none)'}")
    print(f"[KenexAI] API key: {'set (' + api_key[:8] + '...)' if len(api_key) > 8 else 'set'}")

    try:
        resp = httpx.post(url, headers=headers, json=body, timeout=60)
        resp.raise_for_status()
        payload = resp.json()

        # Gemini: candidates[0].content.parts[0].text
        if use_gemini_response:
            candidates = payload.get('candidates') if isinstance(payload, dict) else None
            content = ''
            if candidates and isinstance(candidates, list) and len(candidates) > 0:
                c0 = candidates[0]
                if isinstance(c0, dict):
                    parts = (c0.get('content') or {}).get('parts') or []
                    if parts and isinstance(parts[0], dict):
                        content = (parts[0].get('text') or '').strip()
        else:
            # Grok/OpenAI/OpenRouter: choices[0].message.content or .text
            content = ''
            choices = payload.get('choices') if isinstance(payload, dict) else None
            if choices and isinstance(choices, list) and len(choices) > 0:
                first = choices[0]
                if isinstance(first, dict):
                    content = (first.get('message') or {}).get('content') or first.get('text') or ''

        if not content:
            _log_error(
                "No content in API response",
                f"Course: {course}",
                f"Response keys: {list(payload.keys()) if isinstance(payload, dict) else 'not a dict'}",
                f"choices length: {len(choices) if choices else 0}",
                f"Full payload (truncated): {str(payload)[:500]}",
            )
            return []

        data = _extract_json_from_text(content)
        if not isinstance(data, list):
            _log_error(
                "API response is not a valid JSON array",
                f"Course: {course}",
                f"Raw content (first 800 chars): {content[:800]}",
            )
            return []

        questions = []
        for idx, item in enumerate(data):
            if not isinstance(item, dict):
                continue
            # We only use MCQs from the API
            q_type = (item.get('type') or 'mcq').lower().strip()
            if q_type != 'mcq':
                continue
            q = {
                'id': str(item.get('id') or f"{course.replace(' ', '_').lower()}_ai_{idx}"),
                'type': 'mcq',
                'question': str(item.get('question', '')).strip(),
                'options': item.get('options', []) or [],
                'correct_index': 0,
            }
            try:
                q['correct_index'] = int(item.get('correct_index', 0))
            except Exception:
                q['correct_index'] = 0
            if not q['question'] or len(q['options']) < 2:
                continue
            questions.append(q)
        if not questions:
            _log_error(
                "No valid MCQ questions in parsed response",
                f"Course: {course}",
                f"Parsed array length: {len(data)}",
                f"First item keys: {list(data[0].keys()) if data and isinstance(data[0], dict) else 'n/a'}",
            )
        return questions[:count]
    except httpx.HTTPStatusError as e:
        body = (e.response.text or "")[:1000]
        u = str(e.request.url)
        status = e.response.status_code
        if status == 429:
            provider_hint = " (Quota/rate limit — check your plan. Using fallback questions.)"
        elif "openrouter.ai" in u:
            provider_hint = " (Check OPENROUTER_API_KEY at https://openrouter.ai/keys)"
        elif "api.x.ai" in u:
            provider_hint = " (Check XAI_API_KEY at https://console.x.ai/)"
        elif "generativelanguage.googleapis.com" in u:
            provider_hint = " (If 404: set GEMINI_MODEL=gemini-2.5-flash in .env; see https://ai.google.dev/gemini-api/docs/models)"
        else:
            provider_hint = ""
        _log_error(
            "API HTTP error",
            f"Status: {status}",
            f"URL: {e.request.url}",
            f"Response body: {body}{provider_hint}",
        )
        return []
    except httpx.RequestError as e:
        err_msg = str(e).replace("\n", " ")
        _log_error(
            "Network / request error (getaddrinfo failed = DNS or no internet)",
            f"Full error: {err_msg}",
            f"URL: {url}",
            "Fix: Check internet connection, DNS, firewall, or use a different network (e.g. mobile hotspot).",
        )
        return []
    except Exception as e:
        _log_error(
            "Unexpected error in question generation",
            f"Exception: {type(e).__name__}: {e}",
            "Traceback:",
            traceback.format_exc(),
        )
        return []


def _expand_questions_to_target(questions: List[Dict[str, Any]], target: int) -> List[Dict[str, Any]]:
    """If there are fewer questions than target, create harmless variants to reach the target count."""
    if len(questions) >= target:
        return questions[:target]

    expanded = list(questions)
    copy_count = 0
    while len(expanded) < target and questions:
        template = questions[copy_count % len(questions)]
        variant_index = (copy_count // len(questions)) + 1
        new_q = {**template}
        new_q['id'] = f"{template['id']}_v{variant_index}"
        new_q['question'] = f"{template['question']} (variant {variant_index})"
        expanded.append(new_q)
        copy_count += 1
    return expanded


def get_questions(
    course: str, max_questions: int = 30, course_link: Optional[str] = None
) -> List[Dict[str, Any]]:
    """Return a list of questions for the given course.

    Tries OpenRouter (from .env) / Gemini / Grok / OpenAI first to generate real-time MCQs (30).
    Uses fallback question bank only when the API fails or is not configured.
    """
    # Reload .env so OPENROUTER_API_KEY etc. are used without restarting the server
    try:
        from dotenv import load_dotenv
        load_dotenv(os.path.join(os.path.dirname(__file__), '..', '..', '.env'))
    except Exception:
        pass
    api_key_openrouter = (os.getenv('OPENROUTER_API_KEY') or '').strip()
    api_key_gemini = (os.getenv('GEMINI_API_KEY') or '').strip()
    api_key_grok = (os.getenv('XAI_API_KEY') or os.getenv('GROK_API_KEY') or '').strip()
    api_key_openai = (os.getenv('OPENAI_API_KEY') or '').strip()
    api_key = api_key_openrouter or api_key_gemini or api_key_grok or api_key_openai
    course_link = (course_link or "").strip() or None
    cache_key = (course, course_link or "")

    # Log which provider will be used (OpenRouter first when set in .env)
    if api_key_openrouter:
        print(f"[KenexAI] Using OpenRouter for questions — OPENROUTER_API_KEY set in .env")
    elif api_key_gemini:
        print(f"[KenexAI] Using Gemini (Google AI) for questions")
    elif api_key_grok:
        print(f"[KenexAI] Using Grok (xAI) for questions")
    elif api_key_openai:
        print(f"[KenexAI] Using OpenAI for questions")
    else:
        print(f"[KenexAI] No API key set — set OPENROUTER_API_KEY in .env for Open Router")

    # Try real-time generation via API first
    if api_key:
        try:
            print(f"[KenexAI] Requesting {max_questions} AI-generated MCQs for course={course} (link={course_link or 'none'})")
            questions = _generate_questions_from_ai(course, max_questions, api_key, course_link)
            if questions and len(questions) >= 1:
                # Cache so grading can use the same set
                _GENERATED_QUESTIONS_CACHE[cache_key] = questions
                print(f"[KenexAI] SUCCESS: Returning {len(questions)} AI-generated MCQs for course={course}\n")
                return questions[:max_questions]
            print(f"[KenexAI] API returned no valid questions for course={course}. See errors above. Using fallback bank.\n", file=sys.stderr)
        except Exception as e:
            _log_error(
                "Exception in get_questions (using fallback)",
                f"Course: {course}",
                f"Exception: {type(e).__name__}: {e}",
                traceback.format_exc(),
            )
            print(f"[KenexAI] Using fallback question bank for course={course}\n", file=sys.stderr)
    else:
        _log_error(
            "No API key configured — using fallback question bank",
            "Set OPENROUTER_API_KEY=... in .env for Open Router (https://openrouter.ai/keys).",
            "Or GEMINI_API_KEY / XAI_API_KEY / OPENAI_API_KEY for other providers.",
        )

    # Fallback: use built-in question bank and expand to target if needed
    questions = QUESTION_BANK.get(course, [])
    print(f"[KenexAI] Fallback: using built-in bank for '{course}' ({len(questions)} questions, expanded to {max_questions})\n")
    return _expand_questions_to_target(questions, max_questions)


def grade_responses(
    course: str, answers: List[Dict[str, Any]], course_link: Optional[str] = None
) -> Dict[str, Any]:
    """Grade submitted answers and return a score report.

    Uses cached AI-generated questions if present (same course+link as when test was fetched),
    otherwise uses the built-in question bank.
    """
    cache_key = (course, (course_link or "").strip() or "")
    bank = _GENERATED_QUESTIONS_CACHE.get(cache_key) or QUESTION_BANK.get(course, [])
    questions = {q["id"]: q for q in bank}
    total = len(answers)
    correct = 0
    details = []

    for ans in answers:
        qid = ans.get("id")
        user_value = ans.get("answer")
        q = questions.get(qid)
        if not q:
            details.append({"id": qid, "correct": False, "message": "Unknown question"})
            continue

        if q["type"] == "mcq":
            is_correct = isinstance(user_value, int) and user_value == q.get("correct_index")
            details.append({
                "id": qid,
                "correct": is_correct,
                "expected": q.get("correct_index"),
                "given": user_value,
            })
            if is_correct:
                correct += 1
        else:
            expected_keywords = [k.strip().lower() for k in q.get("expected_keywords", [])]
            answer_lower = (str(user_value or "")).lower()
            match = any(k in answer_lower for k in expected_keywords)
            details.append({
                "id": qid,
                "correct": match,
                "expected_keywords": expected_keywords,
                "given": user_value,
            })
            if match:
                correct += 1

    score = int((correct / total) * 100) if total > 0 else 0
    return {"score": score, "total": total, "correct": correct, "details": details}

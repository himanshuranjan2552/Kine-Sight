import requests

OLLAMA_URL = "http://192.168.1.78:11434/api/generate"

def ask_ollama(model, prompt):
    response = requests.post(
        OLLAMA_URL,
        json={
            "model": model,
            "prompt": prompt,
            "stream": False
        }
    )
    return response.json()["response"]

# -------- AGENTS -------- #

def planner_agent(task):
    prompt = f"""
You are a senior software architect.

Break this task into clear step-by-step plan:

Task:
{task}
"""
    return ask_ollama("mistral:7b-instruct-q4_0", prompt)


def coder_agent(task, plan):
    prompt = f"""
You are an expert programmer.

Task:
{task}

Plan:
{plan}

Write clean, working code.
"""
    return ask_ollama("deepseek-coder:6.7b-instruct-q4_0", prompt)


def debugger_agent(code):
    prompt = f"""
You are a debugging expert.

Analyze and fix any issues in this code:

{code}

Return corrected code only.
"""
    return ask_ollama("deepseek-coder:6.7b-instruct-q4_0", prompt)


def reviewer_agent(code):
    prompt = f"""
You are a senior code reviewer.

Improve this code:
- Optimize performance
- Apply best practices
- Clean structure

Code:
{code}
"""
    return ask_ollama("codellama:13b-instruct-q4_0", prompt)


# -------- PIPELINE -------- #

def run_multi_agent(task):
    print("\n[1] Planning...")
    plan = planner_agent(task)
    print(plan)

    print("\n[2] Coding...")
    code = coder_agent(task, plan)
    print(code)

    print("\n[3] Debugging...")
    fixed_code = debugger_agent(code)
    print(fixed_code)

    print("\n[4] Reviewing...")
    final_code = reviewer_agent(fixed_code)
    print(final_code)

    return final_code


# -------- RUN -------- #

if __name__ == "__main__":
    task = input("Enter your coding task: ")
    run_multi_agent(task)
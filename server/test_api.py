import requests
import json

BASE_URL = "http://127.0.0.1:5000/api/hr"

def test():
    print("Testing /interns...")
    try:
        r = requests.get(f"{BASE_URL}/interns")
        print(f"Status: {r.status_code}")
        print(json.dumps(r.json(), indent=2))
    except Exception as e:
        print(f"Error: {e}")

    print("\nTesting /managers...")
    try:
        r = requests.get(f"{BASE_URL}/managers")
        print(f"Status: {r.status_code}")
        print(json.dumps(r.json(), indent=2))
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test()

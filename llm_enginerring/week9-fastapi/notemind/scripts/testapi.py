# file: scripts/test_api.py
import asyncio

import httpx

BASE_URL = "http://127.0.0.1:8000"

async def run_tests():
    # Using an AsyncClient to maintain connection state cleanly
    async with httpx.AsyncClient(base_url=BASE_URL, timeout=5.0) as client:
        print("=== RUNNING API ENDPOINT TESTS ===\n")

        # 1. POST - Create a new note first
        print("1. Testing POST /api/v1/notes")
        create_payload = {
            "title": "Groceries",
            "body": "milk, eggs, oats",
            "tags": ["Food", "home"],
            "pinned": False
        }
        r_post = await client.post("/api/v1/notes", json=create_payload)
        print(f"Status: {r_post.status_code} (Expect 201 Created)")
        print(f"Location Header: {r_post.headers.get('Location')}")
        print(f"Body: {r_post.text}\n")
        
        if r_post.status_code != 201:
            print("Aborting remaining tests because note creation failed.")
            return

        # Extract the dynamic ID directly from the created note payload
        note_data = r_post.json()
        note_id = note_data["id"]
        print(f"--> Successfully captured active Note ID: {note_id}\n")

        # 2. GET Single Note
        print(f"2. Testing GET /api/v1/notes/{note_id}")
        r_get = await client.get(f"/api/v1/notes/{note_id}")
        print(f"Status: {r_get.status_code}")
        print(f"Body: {r_get.text}\n")
        
        # 3. GET List with Query Filters (using the lowercase tag format)
        print("3. Testing GET /api/v1/notes?limit=10&tag=food")
        r_list = await client.get("/api/v1/notes", params={"limit": 10, "offset": 0, "tag": "food"})
        print(f"Status: {r_list.status_code}")
        print(f"Body: {r_list.text}\n")

        # 4. PATCH Partial Update
        print(f"4. Testing PATCH /api/v1/notes/{note_id}")
        patch_payload = {"title": "Supermarket List"}
        r_patch = await client.patch(f"/api/v1/notes/{note_id}", json=patch_payload)
        print(f"Status: {r_patch.status_code}")
        print(f"Body: {r_patch.text}\n")

        # 5. DELETE Note
        print(f"5. Testing DELETE /api/v1/notes/{note_id}")
        r_delete = await client.delete(f"/api/v1/notes/{note_id}")
        print(f"Status: {r_delete.status_code} (Expect 204 No Content)\n")

        # 6. GET Again to verify deletion (Should return 404)
        print(f"6. Verifying Deletion: GET /api/v1/notes/{note_id}")
        r_verify = await client.get(f"/api/v1/notes/{note_id}")
        print(f"Status: {r_verify.status_code} (Expect 404 Not Found)")
        print(f"Body: {r_verify.text}\n")
        
                # 🔥 TEST: 8a. GET List with valid sort parameter
        print("8a. Testing GET /api/v1/notes?sort=created")
        r_sort_valid = await client.get("/api/v1/notes", params={"sort": "created"})
        print(f"Status: {r_sort_valid.status_code} (Expect 200 OK)")
        print(f"Body: {r_sort_valid.text}\n")

        # 🛡️ TEST: 8b. GET List with invalid sort parameter (Perimeter Check)
        print("8b. Testing GET /api/v1/notes?sort=title")
        r_sort_invalid = await client.get("/api/v1/notes", params={"sort": "title"})
        print(f"Status: {r_sort_invalid.status_code} (Expect 422 Unprocessable Entity)")
        print(f"Body: {r_sort_invalid.text}\n")


if __name__ == "__main__":
    asyncio.run(run_tests())

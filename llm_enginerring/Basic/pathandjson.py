import json
from pathlib import Path

def run_rag_evaluation_pipeline():
    # -------------------------------------------------------------
    # 1. PATH SETUP (Using Pathlib)
    # -------------------------------------------------------------
    
    # Path.cwd() finds the folder where this script is currently running
    current_working_dir = Path.cwd()
    
    # The / operator joins folders together cleanly on Windows, Mac, or Linux
    project_root = current_working_dir / "rag_project"
    data_folder = project_root / "raw_data"
    output_folder = project_root / "eval_results"
    
    # mkdir() creates folders. 
    # parents=True creates the whole path chain if missing.
    # exist_ok=True stops the script from crashing if the folder already exists.
    data_folder.mkdir(parents=True, exist_ok=True)
    output_folder.mkdir(parents=True, exist_ok=True)
    
    print(f"📁 Project directories verified at: {project_root}")

    # -------------------------------------------------------------
    # 2. READING DATA (Using pathlib + json.loads / json.load)
    # -------------------------------------------------------------
    
    # Let's assume we have a JSON file containing our evaluation dataset
    dataset_file = data_folder / "eval_queries.json"
    
    # .exists() checks if the file actually lives on your hard drive
    if not dataset_file.exists():
        print(f"⚠️ Mocking sample data because {dataset_file.name} was not found.")
        
        # We create a mock JSON string to demonstrate json.loads
        # json.loads (with an 's') parses data directly from a STRING
        mock_json_string = '[{"id": 1, "query": "What are Gemini 3 free tier limits?"}]'
        eval_tasks = json.loads(mock_json_string)
    else:
        # If the file exists, we read it using json.load
        # json.load (no 's') reads data directly from an open FILE object
        with open(dataset_file, "r", encoding="utf-8") as file:
            eval_tasks = json.load(file)
            
    print(f"📋 Loaded {len(eval_tasks)} evaluation task(s).")

    # -------------------------------------------------------------
    # 3. PROCESSING & CAPTURING METRICS
    # -------------------------------------------------------------
    
    # This list will hold the results of our RAG evaluation run
    processed_results = []
    
    for task in eval_tasks:
        # .get() safely pulls data out of our Python dictionary
        task_id = task.get("id")
        user_query = task.get("query")
        
        # Simulated RAG processing steps
        simulated_retrieved_context = "Gemini 3 Flash limits are 10 RPM and 500 RPD."
        simulated_llm_answer = "The free tier gives you 10 requests per minute and 500 daily requests."
        
        # Build a Python dictionary representing the evaluation results
        eval_entry = {
            "task_id": task_id,
            "query": user_query,
            "metrics": {
                "context_recall": 1.0,      # Perfect score for matching facts
                "faithfulness": 0.95        # High score for accuracy
            },
            "output_details": {
                "context_used": simulated_retrieved_context,
                "generated_response": simulated_llm_answer
            }
        }
        
        # Add this entry to our running list
        processed_results.append(eval_entry)

    # -------------------------------------------------------------
    # 4. SAVING OUTPUTS (Using pathlib + json.dump / json.dumps)
    # -------------------------------------------------------------
    
    # Construct a new filename for the logs
    output_file = output_folder / "run_metrics.json"
    
    # json.dump (no 's') writes our Python list/dict directly into a physical FILE
    # indent=4 formats the JSON with clean spacing so it's readable to humans
    with open(output_file, "w", encoding="utf-8") as file:
        json.dump(processed_results, file, indent=4)
        
    print(f"✅ Success! Evaluation results written to: {output_file}")
    
    # Bonus: Inspecting paths using handy pathlib properties
    print(f"ℹ️ Output File Breakdown -> Name: {output_file.name} | Extension: {output_file.suffix} | Parent Dir: {output_file.parent.name}")

    # json.dumps (with an 's') converts our data to a STRING for quick printing
    print("\n📝 Quick look at saved string data via json.dumps:")
    print(json.dumps(processed_results[0]["metrics"], indent=2))

# This line triggers our function to run when the script is executed
if __name__ == "__main__":
    run_rag_evaluation_pipeline()

import boto3
import json

bedrock = boto3.client(
    'bedrock-runtime',
    region_name="us-east-1",
)

try:
    payload = {
        "messages": [
            {
                "role": "user",
                "content": [{"text": "Classify this request: I want a ration card. Return JSON: {'intent': '...', 'scheme': '...'}"}]
            }
        ],
        "inferenceConfig": {
            "max_new_tokens": 300,
            "temperature": 0.0
        }
    }
    
    response = bedrock.invoke_model(
        modelId="amazon.nova-micro-v1:0",
        body=json.dumps(payload),
        contentType="application/json",
        accept="application/json"
    )
    result = json.loads(response['body'].read())
    print("NOVA SUCCESS:", result)
except Exception as e:
    print(f"NOVA Error: {e}")

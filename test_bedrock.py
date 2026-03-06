import boto3
import json

def test_bedrock():
    # These credentials match the ones in your .env file
    # Ensure they are allowed to call Claude 3 / 3.5 Sonnet
    bedrock = boto3.client(
        'bedrock-runtime',
        region_name="us-east-1",
        # Credentials auto-loaded from local environment variable if running locally
    )

    models_to_test = [
        "amazon.titan-tg1-large"
    ]

    for model_id in models_to_test:
        print(f"Testing AWS Bedrock Model: {model_id}...")
        try:
            payload = {
                "max_tokens": 10,
                "anthropic_version": "bedrock-2023-05-31",
                "messages": [{"role": "user", "content": "Say hello."}]
            }
            response = bedrock.invoke_model(
                modelId=model_id,
                body=json.dumps(payload),
                contentType="application/json",
                accept="application/json"
            )
            result = json.loads(response['body'].read())
            print(f"✅ SUCCESS! Model: {model_id} is active and working.")
            print(f"Response: {result['content'][0]['text']}\n")
        except Exception as e:
            print(f"❌ FAILED for {model_id}.\nReason: {e}\n")

if __name__ == "__main__":
    test_bedrock()

import boto3
import json

bedrock = boto3.client(
    'bedrock',
    region_name="us-east-1",
)

try:
    response = bedrock.list_foundation_models()
    for model in response.get('modelSummaries', []):
        if 'nova' in model['modelId'].lower():
            print(f"Model ID: {model['modelId']}, Provider: {model['providerName']}")
except Exception as e:
    print(f"Error: {e}")

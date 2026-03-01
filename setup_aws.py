import os
import boto3
from dotenv import load_dotenv

def setup_dynamodb():
    # Load environment variables from .env file
    load_dotenv()
    
    # Initialize DynamoDB client using credentials from .env
    dynamodb_client = boto3.client(
        'dynamodb',
        aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
        aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
        region_name=os.getenv('AWS_REGION', 'ap-south-1')
    )
    
    # Initialize DynamoDB Resource for table creation
    dynamodb_resource = boto3.resource(
        'dynamodb',
        aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
        aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
        region_name=os.getenv('AWS_REGION', 'ap-south-1')
    )

    print("Checking and creating DynamoDB Tables in Region:", os.getenv('AWS_REGION', 'ap-south-1'))
    
    existing_tables = dynamodb_client.list_tables()['TableNames']
    
    # 1. Create GramSetu_Users Table (To store VLE phone, Twilio tokens, etc.)
    if 'GramSetu_Users' not in existing_tables:
        print("Creating GramSetu_Users table...")
        table = dynamodb_resource.create_table(
            TableName='GramSetu_Users',
            KeySchema=[
                {'AttributeName': 'phone', 'KeyType': 'HASH'} # Partition key
            ],
            AttributeDefinitions=[
                {'AttributeName': 'phone', 'AttributeType': 'S'}
            ],
            BillingMode='PAY_PER_REQUEST' # Important: This keeps it at $0 cost! (Serverless)
        )
        table.wait_until_exists()
        print("-> GramSetu_Users created successfully!")
    else:
        print("-> GramSetu_Users table already exists.")

    # 2. Create GramSetu_Jobs Table (To replace Redis/SQLite for Job Queue)
    if 'GramSetu_Jobs' not in existing_tables:
        print("Creating GramSetu_Jobs table...")
        table = dynamodb_resource.create_table(
            TableName='GramSetu_Jobs',
            KeySchema=[
                {'AttributeName': 'job_id', 'KeyType': 'HASH'} # Partition key
            ],
            AttributeDefinitions=[
                {'AttributeName': 'job_id', 'AttributeType': 'S'}
            ],
            BillingMode='PAY_PER_REQUEST' # Serverless pricing
        )
        table.wait_until_exists()
        print("-> GramSetu_Jobs created successfully!")
    else:
        print("-> GramSetu_Jobs table already exists.")

    print("\nAWS DynamoDB Cost-Zero Architecture Setup Complete! ✅")

if __name__ == "__main__":
    setup_dynamodb()

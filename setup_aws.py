import os
import boto3
from dotenv import load_dotenv

def setup_dynamodb():
    load_dotenv()
    
    dynamodb_client = boto3.client(
        'dynamodb',
        aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
        aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
        region_name=os.getenv('AWS_REGION', 'ap-south-1')
    )
    
    dynamodb_resource = boto3.resource(
        'dynamodb',
        aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
        aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
        region_name=os.getenv('AWS_REGION', 'ap-south-1')
    )

    print("Checking and creating DynamoDB Tables in Region:", os.getenv('AWS_REGION', 'ap-south-1'))
    
    existing_tables = dynamodb_client.list_tables()['TableNames']
    
    # 1. GramSetu_Users - VLE profiles
    if 'GramSetu_Users' not in existing_tables:
        print("Creating GramSetu_Users table...")
        table = dynamodb_resource.create_table(
            TableName='GramSetu_Users',
            KeySchema=[
                {'AttributeName': 'phone', 'KeyType': 'HASH'}
            ],
            AttributeDefinitions=[
                {'AttributeName': 'phone', 'AttributeType': 'S'}
            ],
            BillingMode='PAY_PER_REQUEST'
        )
        table.wait_until_exists()
        print("-> GramSetu_Users created successfully!")
    else:
        print("-> GramSetu_Users table already exists.")

    # 2. GramSetu_Jobs - Job queue (serverless, replaces Redis)
    if 'GramSetu_Jobs' not in existing_tables:
        print("Creating GramSetu_Jobs table...")
        table = dynamodb_resource.create_table(
            TableName='GramSetu_Jobs',
            KeySchema=[
                {'AttributeName': 'job_id', 'KeyType': 'HASH'}
            ],
            AttributeDefinitions=[
                {'AttributeName': 'job_id', 'AttributeType': 'S'}
            ],
            BillingMode='PAY_PER_REQUEST'
        )
        table.wait_until_exists()
        print("-> GramSetu_Jobs created successfully!")
    else:
        print("-> GramSetu_Jobs table already exists.")

    # 3. GramSetu_Beneficiaries - Each VLE's customers
    if 'GramSetu_Beneficiaries' not in existing_tables:
        print("Creating GramSetu_Beneficiaries table...")
        table = dynamodb_resource.create_table(
            TableName='GramSetu_Beneficiaries',
            KeySchema=[
                {'AttributeName': 'vle_phone', 'KeyType': 'HASH'},   # Partition: VLE's phone
                {'AttributeName': 'beneficiary_id', 'KeyType': 'RANGE'}  # Sort: beneficiary UUID
            ],
            AttributeDefinitions=[
                {'AttributeName': 'vle_phone', 'AttributeType': 'S'},
                {'AttributeName': 'beneficiary_id', 'AttributeType': 'S'}
            ],
            BillingMode='PAY_PER_REQUEST'
        )
        table.wait_until_exists()
        print("-> GramSetu_Beneficiaries created successfully!")
    else:
        print("-> GramSetu_Beneficiaries table already exists.")

    # 4. GramSetu_AgentInputs - Human-in-the-loop input requests from agent
    if 'GramSetu_AgentInputs' not in existing_tables:
        print("Creating GramSetu_AgentInputs table...")
        table = dynamodb_resource.create_table(
            TableName='GramSetu_AgentInputs',
            KeySchema=[
                {'AttributeName': 'request_id', 'KeyType': 'HASH'}
            ],
            AttributeDefinitions=[
                {'AttributeName': 'request_id', 'AttributeType': 'S'}
            ],
            BillingMode='PAY_PER_REQUEST'
        )
        table.wait_until_exists()
        print("-> GramSetu_AgentInputs created successfully!")
    else:
        print("-> GramSetu_AgentInputs table already exists.")

    print("\nAWS DynamoDB Setup Complete! ✅")

if __name__ == "__main__":
    setup_dynamodb()

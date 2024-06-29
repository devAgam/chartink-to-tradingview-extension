import csv
import json
import requests
import boto3


s3 = boto3.client("s3")


def download_csv(url):
    response = requests.get(url)
    response.raise_for_status()  # Check that the request was successful
    return response.content.decode("utf-8")


def csv_to_json(csv_content):
    data = []
    csv_reader = csv.DictReader(csv_content.splitlines())

    for row in csv_reader:
        # Only process rows where 'instrument_type' is 'EQ'
        if row["instrument_type"] == "EQ":
            filtered_row = {
                "exchange_token": row["exchange_token"],
                "instrument_token": row["instrument_token"],
                "tradingsymbol": row["tradingsymbol"],
            }
            data.append(filtered_row)

    return data


def upload_to_s3(bucket_name, file_name, data):
    s3.put_object(Bucket=bucket_name, Key=file_name, Body=json.dumps(data, indent=4))


def lambda_handler(event, context):
    # URL of the CSV file
    csv_url = "https://api.kite.trade/instruments"

    # S3 bucket name
    bucket_name = "chartink-to-tradingview"

    # Download the CSV file
    csv_content = download_csv(csv_url)

    # Convert the CSV content to JSON
    json_data = csv_to_json(csv_content)

    # Generate the JSON file name with the current date

    json_file_name = f"data.json"

    # Upload the JSON data to S3
    upload_to_s3(bucket_name, json_file_name, json_data)

    return {
        "statusCode": 200,
        "body": json.dumps(
            f"File {json_file_name} successfully uploaded to {bucket_name}"
        ),
    }

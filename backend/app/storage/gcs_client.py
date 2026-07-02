import datetime
from typing import BinaryIO
from google.cloud import storage
from app.core.config import settings

class GCSClient:
    """
    Google Cloud Storage wrapper class.
    Handles uploads, signed URL generation, and object deletions.
    """
    def __init__(self) -> None:
        self.bucket_name = settings.GCS_BUCKET_NAME
        # Client will automatically load credentials from GOOGLE_APPLICATION_CREDENTIALS environment variable
        self._client = None

    @property
    def client(self) -> storage.Client:
        if self._client is None:
            self._client = storage.Client()
        return self._client

    def get_scoped_path(self, patient_id: int, category: str, filename: str) -> str:
        """Generates patient-specific subfolder paths to isolate files."""
        # E.g., patients/45/reports/blood_test.pdf
        clean_filename = filename.replace(" ", "_")
        return f"patients/{patient_id}/{category}/{clean_filename}"

    def upload_file_object(self, file_obj: BinaryIO, destination_path: str, content_type: str) -> str:
        """
        Uploads a binary file stream directly to Google Cloud Storage.
        Returns the gs:// URI.
        """
        bucket = self.client.bucket(self.bucket_name)
        blob = bucket.blob(destination_path)
        
        # Stream upload from file object
        file_obj.seek(0)
        blob.upload_from_file(file_obj, content_type=content_type)
        
        return f"gs://{self.bucket_name}/{destination_path}"

    def generate_download_signed_url(self, destination_path: str, expiration_seconds: int = 3600) -> str:
        """
        Generates an expiring signed URL for secure, temporary document download/preview.
        """
        bucket = self.client.bucket(self.bucket_name)
        blob = bucket.blob(destination_path)
        
        url = blob.generate_signed_url(
            version="v4",
            expiration=datetime.timedelta(seconds=expiration_seconds),
            method="GET"
        )
        return url

    def delete_file_object(self, destination_path: str) -> None:
        """Deletes an object from the bucket (supporting GCS versioning by default)."""
        bucket = self.client.bucket(self.bucket_name)
        blob = bucket.blob(destination_path)
        if blob.exists():
            blob.delete()

# Global Client Instance
gcs_client = GCSClient()

import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { createUpload } from "../../lib/api";

const maxUploadSizeBytes = 30 * 1024 * 1024;
const acceptedExtensions = [".xlsx", ".csv"];

function validateSelectedFile(file: File | null) {
  if (!file) {
    return "Choose a .xlsx or .csv report to continue.";
  }

  const fileName = file.name.toLowerCase();
  const matchesExtension = acceptedExtensions.some((extension) =>
    fileName.endsWith(extension),
  );
  if (!matchesExtension) {
    return "doc2dash accepts only .xlsx and .csv files.";
  }

  if (file.size > maxUploadSizeBytes) {
    return "Files must be 30 MB or smaller.";
  }

  return null;
}

export function UploadPage() {
  const navigate = useNavigate();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState(
    "Choose a workbook to start the browser upload flow.",
  );
  const [uploading, setUploading] = useState(false);

  function handleFileChange(file: File | null) {
    setSelectedFile(file);
    const validationMessage = validateSelectedFile(file);
    setErrorMessage(validationMessage);
    if (file && !validationMessage) {
      setStatusMessage(`Ready to upload ${file.name}.`);
      return;
    }

    setStatusMessage("Choose a workbook to start the browser upload flow.");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationMessage = validateSelectedFile(selectedFile);
    if (validationMessage) {
      setErrorMessage(validationMessage);
      setStatusMessage("Upload blocked until the selected file is valid.");
      return;
    }

    if (!selectedFile) {
      return;
    }

    setUploading(true);
    setErrorMessage(null);
    setStatusMessage("Uploading workbook and preparing dashboard handoff...");

    try {
      const upload = await createUpload(selectedFile);
      navigate(`/uploads/${upload.uploadId}`, {
        state: {
          uploadAcknowledged: {
            fileName: selectedFile.name,
          },
        },
      });
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "We couldn't upload this workbook.",
      );
      setStatusMessage("Upload failed. Review the message and try again.");
      setUploading(false);
    }
  }

  return (
    <main className="home-shell">
      <div className="home-card upload-card">
        <p className="eyebrow">doc2dash</p>
        <h1>Upload a report and open its dashboard in one browser flow.</h1>
        <p className="upload-card__copy">
          Supported files: <strong>.xlsx</strong> and <strong>.csv</strong>, up to{" "}
          <strong>30 MB</strong>. After upload, doc2dash will take you straight into the
          generated dashboard route.
        </p>

        <form className="upload-form" onSubmit={handleSubmit}>
          <label className="upload-form__label" htmlFor="report-upload">
            Spreadsheet report
          </label>
          <input
            accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="upload-form__input"
            disabled={uploading}
            id="report-upload"
            name="file"
            onChange={(event) => handleFileChange(event.target.files?.[0] ?? null)}
            type="file"
          />

          {selectedFile ? (
            <p className="upload-form__file" aria-live="polite">
              Selected: {selectedFile.name}
            </p>
          ) : null}

          <button className="primary-action" disabled={uploading} type="submit">
            {uploading ? "Uploading..." : "Upload report"}
          </button>
        </form>

        <p className="upload-form__status" aria-live="polite">
          {statusMessage}
        </p>

        {errorMessage ? (
          <p className="upload-form__error" role="alert">
            {errorMessage}
          </p>
        ) : null}
      </div>
    </main>
  );
}

# Vosk Models Directory

This directory contains Vosk speech recognition models for offline voice recognition.

## Required Models

To enable offline voice recognition with Vosk, you need to download the following models:

### Japanese Model
- **File**: `vosk-model-small-ja-0.22.tar.gz`
- **Download**: https://alphacephei.com/vosk/models/vosk-model-small-ja-0.22.zip
- **Size**: ~50MB
- **Description**: Small Japanese model for speech recognition

### English Model
- **File**: `vosk-model-small-en-us-0.15.tar.gz`
- **Download**: https://alphacephei.com/vosk/models/vosk-model-small-en-us-0.15.zip
- **Size**: ~40MB
- **Description**: Small English (US) model for speech recognition

## Installation Instructions

1. Download the model files from the URLs above
2. Extract the .zip files 
3. Rename the extracted folders to match the expected names:
   - `vosk-model-small-ja-0.22` → rename to `vosk-model-small-ja-0.22.tar.gz`
   - `vosk-model-small-en-us-0.15` → rename to `vosk-model-small-en-us-0.15.tar.gz`
4. Place the model files in this `/public/models/` directory

## Notes

- Models are large files and should be downloaded separately
- The application will fallback to Web Speech API if models are not available
- For production deployment, consider hosting models on CDN for better performance
- Models are loaded lazily when voice recognition is first used
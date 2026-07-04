import os
import sys
import joblib
from flask import Flask, request, jsonify
from flask_cors import CORS

# Start Flask app
app = Flask(__name__)
# Enable CORS for all routes so our frontend or backend can communicate with it
CORS(app)

# Load the trained model bundle at startup
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(SCRIPT_DIR, "model.pkl")

model_bundle = None

if os.path.exists(MODEL_PATH):
    print(f"Loading trained model from {MODEL_PATH}...")
    try:
        model_bundle = joblib.load(MODEL_PATH)
        print("Model loaded successfully!")
        print(f"Categories: {len(model_bundle['categories'])}")
        print(f"Trained accuracy: {model_bundle['accuracy']:.4f}")
    except Exception as e:
        print(f"Error loading model: {e}")
else:
    print(f"WARNING: Model file not found at {MODEL_PATH}!")
    print("Please run 'python train.py' to train the model first.")

@app.route("/health", methods=["GET"])
def health():
    """Simple status check endpoint."""
    return jsonify({
        "status": "ready" if model_bundle is not None else "waiting_for_model",
        "model_loaded": model_bundle is not None
    })

@app.route("/predict", methods=["POST"])
def predict():
    """
    Accepts JSON body with 'text' field (raw resume text).
    Returns the predicted job category.
    """
    global model_bundle
    
    # Reload model if it wasn't loaded or trained after startup
    if model_bundle is None:
        if os.path.exists(MODEL_PATH):
            try:
                model_bundle = joblib.load(MODEL_PATH)
            except Exception as e:
                return jsonify({"error": f"Failed to load model file: {str(e)}"}), 500
        else:
            return jsonify({"error": "No trained model found. Please run training script first."}), 500

    data = request.get_json()
    if not data or "text" not in data:
        return jsonify({"error": "Missing 'text' in request body"}), 400

    resume_text = data["text"]
    if not resume_text.strip():
        return jsonify({
            "category": "Unknown",
            "confidence": 0.0,
            "message": "Resume text was empty"
        })

    try:
        model = model_bundle["model"]
        vectorizer = model_bundle["vectorizer"]
        
        # Turn the resume text into the numerical features (TF-IDF vector)
        features = vectorizer.transform([resume_text])
        
        # Predict the job category
        prediction = model.predict(features)[0]
        
        # Calculate prediction probabilities (confidence score)
        probabilities = model.predict_proba(features)[0]
        # Find index of the predicted category to get its probability
        categories = model_bundle["categories"]
        pred_idx = categories.index(prediction)
        confidence = float(probabilities[pred_idx])

        return jsonify({
            "category": prediction,
            "confidence": confidence,
            "success": True
        })
    except Exception as e:
        print(f"Error during prediction: {e}")
        return jsonify({"error": f"Prediction failed: {str(e)}"}), 500

if __name__ == "__main__":
    # Run Flask server locally on port 5002
    # Accessible at http://localhost:5002
    app.run(host="0.0.0.0", port=5002, debug=True)

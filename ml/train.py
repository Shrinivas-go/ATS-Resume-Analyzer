"""
Train a model that predicts the job category of a resume.

Dataset used: Kaggle "snehaanbhawal" resume dataset
(24,000+ resumes labelled across job categories like Data Science, HR, Sales, etc.)

How it works (in plain words):
  1. We read a CSV that has resume text and a category label for each resume.
  2. We turn the text into numbers using TF-IDF (counts important words).
  3. We train a Logistic Regression model to predict the category from the numbers.
  4. We save the trained model + the word converter to model.pkl so the Flask API can use it.

Run it like this:
    python train.py
or point it at a specific dataset file:
    python train.py --data "C:/path/to/Resume.csv"
"""

import os
import sys
import argparse
import joblib
import numpy as np
import pandas as pd

from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, classification_report


# Where this script lives, and where we save the model.
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

# Default places we look for the dataset (so it "just works" out of the box).
DEFAULT_DATA_PATHS = [
    # The real Kaggle dataset if the user drops it here:
    os.path.join(SCRIPT_DIR, "data", "Resume.csv"),
    os.path.join(SCRIPT_DIR, "data", "resume.csv"),
    # The bundled tiny sample:
    os.path.join(SCRIPT_DIR, "data", "sample_resumes.csv"),
    # Common spot relative to the project root:
    os.path.join(SCRIPT_DIR, "..", "archive(3)", "Resume", "Resume.csv"),
]


def find_dataset(custom_path=None):
    """Return the path of the CSV we will train on, or None if nothing is found."""
    paths_to_try = [custom_path] if custom_path else DEFAULT_DATA_PATHS

    for path in paths_to_try:
        if path and os.path.exists(path):
            return os.path.abspath(path)
    return None


def load_resumes(csv_path):
    """
    Read the CSV and return (texts, labels).

    The snehaanbhawal dataset has these columns:
        ID, Resume_str, Resume_html, Category
    - Resume_str  -> the plain text of the resume (what we learn from)
    - Category    -> the job category label (what we predict)
    We also handle small spelling differences so other CSVs work too.
    """
    df = pd.read_csv(csv_path)
    print(f"Loaded CSV: {csv_path}")
    print(f"  shape = {df.shape[0]} rows x {df.shape[1]} columns")
    print(f"  columns = {list(df.columns)}")

    # Find the text column. Prefer Resume_str, else any column with 'resume'/'text' in it.
    text_col = None
    for candidate in ["Resume_str", "Resume", "resume_str", "resume_text", "text"]:
        if candidate in df.columns:
            text_col = candidate
            break
    if text_col is None:
        # Fall back: first column whose name contains 'resume' or 'text'.
        for col in df.columns:
            if "resume" in col.lower() or "text" in col.lower():
                text_col = col
                break
    if text_col is None:
        raise ValueError("Could not find a resume text column in the CSV.")

    # Find the label column. Prefer 'Category', else a column named like 'label'.
    label_col = None
    for candidate in ["Category", "category", "label", "Label"]:
        if candidate in df.columns:
            label_col = candidate
            break
    if label_col is None:
        raise ValueError("Could not find a category/label column in the CSV.")

    print(f"  text column = '{text_col}', label column = '{label_col}'")

    # Clean up: turn text into strings and drop rows that are empty.
    texts = df[text_col].astype(str).fillna("")
    labels = df[label_col].astype(str).str.strip()

    # Remove rows with empty text.
    mask = texts.str.strip().str.len() > 0
    texts = texts[mask]
    labels = labels[mask]

    print(f"  usable resumes = {len(texts)}")
    print(f"  unique categories = {labels.nunique()}")
    return texts.tolist(), labels.tolist()


def train():
    parser = argparse.ArgumentParser(description="Train the resume category model.")
    parser.add_argument(
        "--data",
        default=None,
        help="Path to the resume CSV file. If omitted, common locations are tried.",
    )
    args = parser.parse_args()

    print("=" * 60)
    print("Resume Category Model - Training")
    print("=" * 60)

    # 1. Find and load the dataset.
    csv_path = find_dataset(args.data)
    if csv_path is None:
        print("\nCould not find a dataset. Tried:")
        for p in DEFAULT_DATA_PATHS:
            print(f"  - {p}")
        print("\nPut your CSV at ml/data/Resume.csv, or run:")
        print("  python train.py --data \"C:/path/to/Resume.csv\"")
        sys.exit(1)

    texts, labels = load_resumes(csv_path)

    # Show how many resumes we have per category (a quick sanity check).
    from collections import Counter
    counts = Counter(labels)
    print("\nResumes per category (top 10):")
    for category, count in counts.most_common(10):
        print(f"  {category:25s} {count}")
    if len(counts) > 10:
        print(f"  ...and {len(counts) - 10} more categories")

    # 2. Split into training and testing sets (80% train, 20% test).
    X_train, X_test, y_train, y_test = train_test_split(
        texts, labels, test_size=0.2, random_state=42, stratify=labels
    )
    print(f"\nSplit: {len(X_train)} train, {len(X_test)} test")

    # 3. Turn text into numbers using TF-IDF.
    #    - We keep words only (letters), drop common English stop words.
    #    - We ignore very rare words (min_df=2) and very common ones (max_df=0.9).
    print("\nBuilding TF-IDF features...")
    vectorizer = TfidfVectorizer(
        stop_words="english",
        lowercase=True,
        ngram_range=(1, 1),   # single words only - keeps it simple and fast
        min_df=2,
        max_df=0.9,
    )
    X_train_vec = vectorizer.fit_transform(X_train)
    X_test_vec = vectorizer.transform(X_test)
    print(f"  vocabulary size = {len(vectorizer.vocabulary_)} words")

    # 4. Train a Logistic Regression model.
    #    Logistic Regression is simple, fast, and works well for text classification.
    print("\nTraining Logistic Regression...")
    model = LogisticRegression(
        max_iter=1000,            # allow enough steps to converge
        class_weight="balanced",  # handle categories with different sizes
        C=1.0,
        random_state=42,
    )
    model.fit(X_train_vec, y_train)

    # 5. Test the model and print how well it did.
    y_pred = model.predict(X_test_vec)
    accuracy = accuracy_score(y_test, y_pred)
    print("\n" + "=" * 60)
    print("Results on the test set")
    print("=" * 60)
    print(f"Accuracy: {accuracy:.4f}  (about {accuracy * 100:.1f}% correct)")
    print("\nDetailed report (precision / recall / f1 per category):")
    print(classification_report(y_test, y_pred, zero_division=0))

    # 6. Save everything the Flask API needs into one pickle file.
    #    We save: the model, the vectorizer, the sorted list of category names,
    #    and a note of the accuracy for display.
    categories = sorted(set(labels))
    model_path = os.path.join(SCRIPT_DIR, "model.pkl")
    joblib.dump(
        {
            "model": model,
            "vectorizer": vectorizer,
            "categories": categories,
            "accuracy": accuracy,
            "num_samples": len(texts),
        },
        model_path,
    )
    print("=" * 60)
    print(f"Model saved to: {model_path}")
    print(f"  categories: {len(categories)}")
    print(f"  accuracy:   {accuracy:.4f}")
    print("\nNext step: run the API ->  python app.py")
    print("=" * 60)


if __name__ == "__main__":
    train()

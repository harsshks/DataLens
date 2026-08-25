#!/usr/bin/env python3
"""Analyze a CSV file and print a JSON quality report to stdout."""

from __future__ import annotations

import json
import math
import re
import sys
from collections import defaultdict

import numpy as np
import pandas as pd


BOOLEAN_TRUE = {"true", "t", "yes", "y", "1"}
BOOLEAN_FALSE = {"false", "f", "no", "n", "0"}
DATE_HINT = re.compile(r"(date|time|timestamp|dob|day)", re.IGNORECASE)


def json_safe(value):
    if value is None or (isinstance(value, float) and (math.isnan(value) or math.isinf(value))):
        return None
    if isinstance(value, (np.integer,)):
        return int(value)
    if isinstance(value, (np.floating,)):
        number = float(value)
        return None if math.isnan(number) or math.isinf(number) else number
    if isinstance(value, (np.bool_,)):
        return bool(value)
    if hasattr(value, "isoformat"):
        try:
            return value.isoformat()
        except Exception:
            return str(value)
    return value


def read_csv(path: str) -> pd.DataFrame:
    encodings = ["utf-8", "utf-8-sig", "latin-1"]
    last_error = None
    for encoding in encodings:
        try:
            return pd.read_csv(path, encoding=encoding, dtype=str, keep_default_na=False)
        except Exception as exc:  # noqa: BLE001
            last_error = exc
    raise ValueError(f"Unable to read CSV: {last_error}")


def blank_to_na(frame: pd.DataFrame) -> pd.DataFrame:
    cleaned = frame.copy()
    cleaned = cleaned.replace(r"^\s*$", np.nan, regex=True)
    cleaned = cleaned.infer_objects(copy=False)
    cleaned = cleaned.replace(
        {val: np.nan for val in ["NA", "N/A", "na", "n/a", "null", "NULL", "None", "none", "?"]}
    )
    return cleaned.infer_objects(copy=False)


def is_boolean_series(non_null: pd.Series) -> bool:
    if non_null.empty:
        return False
    lowered = non_null.astype(str).str.strip().str.lower()
    return bool(lowered.isin(BOOLEAN_TRUE | BOOLEAN_FALSE).mean() >= 0.95)


def numeric_series(non_null: pd.Series) -> pd.Series:
    return pd.to_numeric(non_null.str.strip(), errors="coerce")


def datetime_series(non_null: pd.Series) -> pd.Series:
    return pd.to_datetime(non_null.str.strip(), errors="coerce", utc=False)


def detect_type(series: pd.Series, column_name: str) -> str:
    non_null = series.dropna()
    if non_null.empty:
        return "unknown"
    if is_boolean_series(non_null):
        return "boolean"

    as_num = numeric_series(non_null)
    numeric_ratio = as_num.notna().mean()
    if numeric_ratio >= 0.8:
        finite = as_num.dropna()
        if not finite.empty and np.all(np.isclose(finite, np.round(finite))):
            return "integer"
        return "float"

    as_dt = datetime_series(non_null)
    date_ratio = as_dt.notna().mean()
    name_looks_like_date = bool(DATE_HINT.search(str(column_name)))
    threshold = 0.6 if name_looks_like_date else 0.85
    if date_ratio >= threshold:
        return "datetime"

    return "string"


def severity_from_pct(pct: float) -> str:
    if pct >= 30:
        return "CRITICAL"
    if pct >= 10:
        return "HIGH"
    if pct >= 2:
        return "MEDIUM"
    return "LOW"


def detect_inconsistent_categories(series: pd.Series, column_name: str) -> dict | None:
    non_null = series.dropna().astype(str)
    unique_count = non_null.nunique()
    if unique_count < 2 or unique_count > 40:
        return None
    if unique_count / max(len(non_null), 1) > 0.4:
        return None

    groups = defaultdict(set)
    for value in non_null.unique():
        normalized = re.sub(r"\s+", " ", value.strip().lower())
        if normalized:
            groups[normalized].add(value)

    variants = {key: sorted(values) for key, values in groups.items() if len(values) > 1}
    if not variants:
        return None

    examples = []
    extra = 0
    for forms in variants.values():
        extra += len(forms) - 1
        examples.append(" / ".join(forms[:4]))

    return {
        "issue_type": "INCONSISTENT_CATEGORY",
        "severity": "MEDIUM" if extra >= 2 else "LOW",
        "column_name": column_name,
        "issue_count": extra,
        "description": (
            f"Inconsistent categorical values in '{column_name}': {'; '.join(examples[:5])}"
        ),
    }


def analyze(path: str) -> dict:
    raw = read_csv(path)
    if raw.shape[1] == 0:
        raise ValueError("CSV has no columns")

    frame = blank_to_na(raw)
    row_count, column_count = frame.shape
    issues = []
    columns = []
    missing_cells = int(frame.isna().sum().sum())
    duplicate_rows = int(frame.duplicated().sum())
    outlier_values = 0

    if duplicate_rows:
        dup_pct = (duplicate_rows / max(row_count, 1)) * 100
        issues.append(
            {
                "issue_type": "DUPLICATES",
                "severity": severity_from_pct(dup_pct),
                "column_name": None,
                "issue_count": duplicate_rows,
                "description": f"{duplicate_rows} duplicate rows ({dup_pct:.1f}% of rows)",
            }
        )

    for column_name in frame.columns:
        series = frame[column_name]
        non_null = series.dropna()
        null_count = int(series.isna().sum())
        unique_count = int(non_null.nunique())
        duplicate_count = max(int(non_null.size - unique_count), 0)
        detected = detect_type(series, column_name)

        stats = {
            "column_name": str(column_name),
            "detected_type": detected,
            "null_count": null_count,
            "unique_count": unique_count,
            "duplicate_count": duplicate_count,
            "min_value": None,
            "max_value": None,
            "mean_value": None,
            "median_value": None,
            "std_value": None,
            "null_percentage": round((null_count / max(row_count, 1)) * 100, 2),
        }

        if null_count == row_count and row_count > 0:
            issues.append(
                {
                    "issue_type": "EMPTY_COLUMN",
                    "severity": "CRITICAL",
                    "column_name": str(column_name),
                    "issue_count": null_count,
                    "description": f"Column '{column_name}' is empty",
                }
            )
        elif unique_count == 1:
            issues.append(
                {
                    "issue_type": "CONSTANT_COLUMN",
                    "severity": "MEDIUM",
                    "column_name": str(column_name),
                    "issue_count": 1,
                    "description": f"Column '{column_name}' has only one unique non-null value",
                }
            )

        if null_count > 0 and null_count < row_count:
            null_pct = (null_count / max(row_count, 1)) * 100
            issues.append(
                {
                    "issue_type": "MISSING_VALUES",
                    "severity": severity_from_pct(null_pct),
                    "column_name": str(column_name),
                    "issue_count": null_count,
                    "description": f"{null_count} values are missing in '{column_name}' ({null_pct:.1f}%)",
                }
            )

        if detected in {"integer", "float"}:
            as_num = numeric_series(series.dropna())
            invalid = int(as_num.isna().sum())
            valid = as_num.dropna()
            if invalid:
                issues.append(
                    {
                        "issue_type": "INVALID_TYPE",
                        "severity": "HIGH",
                        "column_name": str(column_name),
                        "issue_count": invalid,
                        "description": f"{invalid} values in '{column_name}' are not numeric",
                    }
                )
            if not valid.empty:
                stats["min_value"] = json_safe(valid.min())
                stats["max_value"] = json_safe(valid.max())
                stats["mean_value"] = json_safe(valid.mean())
                stats["median_value"] = json_safe(valid.median())
                stats["std_value"] = json_safe(valid.std())

                # Skip IQR on identifier-like columns (almost all unique)
                uniqueness = unique_count / max(len(non_null), 1)
                if uniqueness < 0.95 and len(valid) >= 8:
                    q1 = valid.quantile(0.25)
                    q3 = valid.quantile(0.75)
                    iqr = q3 - q1
                    if iqr > 0:
                        lower = q1 - 1.5 * iqr
                        upper = q3 + 1.5 * iqr
                        outlier_count = int(((valid < lower) | (valid > upper)).sum())
                        if outlier_count:
                            outlier_values += outlier_count
                            outlier_pct = (outlier_count / max(row_count, 1)) * 100
                            issues.append(
                                {
                                    "issue_type": "OUTLIER",
                                    "severity": severity_from_pct(outlier_pct),
                                    "column_name": str(column_name),
                                    "issue_count": outlier_count,
                                    "description": (
                                        f"{outlier_count} IQR outliers in '{column_name}' "
                                        f"(bounds {json_safe(lower)} to {json_safe(upper)})"
                                    ),
                                }
                            )

        elif detected == "datetime":
            as_dt = datetime_series(series.dropna())
            invalid = int(as_dt.isna().sum())
            valid = as_dt.dropna()
            if invalid:
                issues.append(
                    {
                        "issue_type": "INVALID_DATE",
                        "severity": "HIGH",
                        "column_name": str(column_name),
                        "issue_count": invalid,
                        "description": f"{invalid} values in '{column_name}' are not valid dates",
                    }
                )
            if not valid.empty:
                stats["min_value"] = json_safe(valid.min())
                stats["max_value"] = json_safe(valid.max())

        elif detected == "string":
            cat_issue = detect_inconsistent_categories(series, str(column_name))
            if cat_issue:
                issues.append(cat_issue)

        columns.append(stats)

    return {
        "row_count": int(row_count),
        "column_count": int(column_count),
        "summary": {
            "missing_cells": missing_cells,
            "duplicate_rows": duplicate_rows,
            "outlier_values": outlier_values,
        },
        "columns": columns,
        "issues": issues,
    }


def main() -> int:
    if len(sys.argv) != 2:
        print(json.dumps({"error": "Usage: analyze_dataset.py <csv_path>"}))
        return 1
    try:
        result = analyze(sys.argv[1])
        print(json.dumps(result, default=json_safe))
        return 0
    except Exception as exc:  # noqa: BLE001
        print(json.dumps({"error": str(exc)}))
        return 1


if __name__ == "__main__":
    sys.exit(main())

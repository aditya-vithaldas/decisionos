from flask import Flask, request, jsonify
from flask_cors import CORS
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.exc import SQLAlchemyError
import os
import json
import re
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*", "allow_headers": "*", "methods": ["GET", "POST", "OPTIONS"]}})

# Global state for the current database connection
db_state = {
    "engine": None,
    "connection_string": None,
    "schema": None,
    "documentation": None
}


def get_engine():
    return db_state.get("engine")


@app.route("/api/connect", methods=["POST"])
def connect_database():
    """Connect to a database using the provided connection string."""
    data = request.json
    connection_string = data.get("connection_string")

    if not connection_string:
        return jsonify({"success": False, "error": "Connection string is required"}), 400

    try:
        engine = create_engine(connection_string)
        # Test the connection
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))

        db_state["engine"] = engine
        db_state["connection_string"] = connection_string
        db_state["schema"] = None
        db_state["documentation"] = None

        return jsonify({
            "success": True,
            "message": "Successfully connected to the database"
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 400


@app.route("/api/explore", methods=["GET"])
def explore_schema():
    """Explore the database schema and return table/column information."""
    engine = get_engine()
    if not engine:
        return jsonify({"success": False, "error": "Not connected to a database"}), 400

    try:
        inspector = inspect(engine)
        schema_info = {}

        for table_name in inspector.get_table_names():
            columns = []
            for column in inspector.get_columns(table_name):
                columns.append({
                    "name": column["name"],
                    "type": str(column["type"]),
                    "nullable": column.get("nullable", True),
                    "default": str(column.get("default")) if column.get("default") else None,
                    "primary_key": False  # Will be updated below
                })

            # Get primary keys
            pk_constraint = inspector.get_pk_constraint(table_name)
            pk_columns = pk_constraint.get("constrained_columns", []) if pk_constraint else []
            for col in columns:
                if col["name"] in pk_columns:
                    col["primary_key"] = True

            # Get foreign keys
            foreign_keys = []
            for fk in inspector.get_foreign_keys(table_name):
                foreign_keys.append({
                    "constrained_columns": fk.get("constrained_columns", []),
                    "referred_table": fk.get("referred_table"),
                    "referred_columns": fk.get("referred_columns", [])
                })

            # Get sample data (first 5 rows)
            sample_data = []
            try:
                with engine.connect() as conn:
                    result = conn.execute(text(f'SELECT * FROM "{table_name}" LIMIT 5'))
                    rows = result.fetchall()
                    col_names = result.keys()
                    for row in rows:
                        sample_data.append(dict(zip(col_names, [str(v) if v is not None else None for v in row])))
            except:
                pass

            # Get row count
            row_count = 0
            try:
                with engine.connect() as conn:
                    result = conn.execute(text(f'SELECT COUNT(*) FROM "{table_name}"'))
                    row_count = result.scalar()
            except:
                pass

            schema_info[table_name] = {
                "columns": columns,
                "foreign_keys": foreign_keys,
                "sample_data": sample_data,
                "row_count": row_count
            }

        db_state["schema"] = schema_info

        return jsonify({
            "success": True,
            "schema": schema_info
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 400


@app.route("/api/documentation", methods=["POST"])
def save_documentation():
    """Save user-provided documentation for tables and columns."""
    data = request.json
    documentation = data.get("documentation", {})

    db_state["documentation"] = documentation

    return jsonify({
        "success": True,
        "message": "Documentation saved successfully"
    })


@app.route("/api/documentation", methods=["GET"])
def get_documentation():
    """Get the current documentation."""
    return jsonify({
        "success": True,
        "documentation": db_state.get("documentation", {})
    })


@app.route("/api/query", methods=["POST"])
def execute_query():
    """Execute a SQL query and return results."""
    engine = get_engine()
    if not engine:
        return jsonify({"success": False, "error": "Not connected to a database"}), 400

    data = request.json
    query = data.get("query", "").strip()

    if not query:
        return jsonify({"success": False, "error": "Query is required"}), 400

    # Basic safety check - only allow SELECT queries
    if not query.upper().startswith("SELECT"):
        return jsonify({
            "success": False,
            "error": "Only SELECT queries are allowed for safety"
        }), 400

    try:
        with engine.connect() as conn:
            result = conn.execute(text(query))
            rows = result.fetchall()
            columns = list(result.keys())

            data_rows = []
            for row in rows:
                data_rows.append([str(v) if v is not None else None for v in row])

            return jsonify({
                "success": True,
                "columns": columns,
                "data": data_rows,
                "row_count": len(data_rows)
            })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 400


@app.route("/api/generate-query", methods=["POST"])
def generate_query():
    """Generate a SQL query from natural language using the schema context."""
    engine = get_engine()
    if not engine:
        return jsonify({"success": False, "error": "Not connected to a database"}), 400

    data = request.json
    question = data.get("question", "").strip()

    if not question:
        return jsonify({"success": False, "error": "Question is required"}), 400

    # Auto-load schema if not already loaded
    if not db_state.get("schema"):
        try:
            inspector = inspect(engine)
            schema_info = {}
            for table_name in inspector.get_table_names():
                columns = []
                for column in inspector.get_columns(table_name):
                    columns.append({
                        "name": column["name"],
                        "type": str(column["type"]),
                    })
                schema_info[table_name] = {"columns": columns}
            db_state["schema"] = schema_info
        except:
            pass

    schema = db_state.get("schema") or {}
    documentation = db_state.get("documentation") or {}

    # Build context for query generation
    context = build_schema_context(schema, documentation)

    # Try to use OpenAI if available, otherwise use simple pattern matching
    openai_key = os.getenv("OPENAI_API_KEY")

    if openai_key:
        try:
            from openai import OpenAI
            client = OpenAI(api_key=openai_key)

            prompt = f"""You are a SQL query generator. Given the following database schema and a natural language question, generate a valid SQL SELECT query.

DATABASE SCHEMA:
{context}

USER QUESTION: {question}

IMPORTANT RULES:
1. Only generate SELECT queries
2. Use proper SQL syntax
3. Return ONLY the SQL query, no explanations
4. If the question cannot be answered with the schema, return a query that gets the closest relevant data

SQL QUERY:"""

            response = client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.1,
                max_tokens=500
            )

            generated_query = response.choices[0].message.content.strip()
            # Clean up the query
            generated_query = generated_query.replace("```sql", "").replace("```", "").strip()

            # Validate the query
            validation = validate_query(question, generated_query, schema)

            return jsonify({
                "success": True,
                "query": generated_query,
                "method": "ai",
                "validation": validation
            })
        except Exception as e:
            # Fall back to simple generation
            pass

    # Simple pattern-based query generation (fallback)
    generated_query = simple_query_generator(question, schema)

    # Validate the query
    validation = validate_query(question, generated_query, schema)

    return jsonify({
        "success": True,
        "query": generated_query,
        "method": "pattern",
        "validation": validation
    })


def validate_query(question, query, schema):
    """Validate if the generated query matches the user's intent."""
    if schema is None:
        schema = {}

    q = question.lower()
    sql = query.upper()

    issues = []
    suggestions = []
    confidence = 100

    # Check for COUNT vs regular SELECT mismatch
    if any(word in q for word in ["how many", "count", "number of", "total number"]):
        if "COUNT" not in sql:
            issues.append("Question asks for a count, but query doesn't use COUNT()")
            suggestions.append("Consider using SELECT COUNT(*) instead")
            confidence -= 30

    # Check for SUM/TOTAL
    if any(word in q for word in ["total", "sum of", "combined"]) and "total number" not in q:
        if "SUM" not in sql and "COUNT" not in sql:
            issues.append("Question asks for a total/sum, but query doesn't aggregate")
            suggestions.append("Consider using SUM() or COUNT() for totals")
            confidence -= 25

    # Check for AVERAGE
    if any(word in q for word in ["average", "avg", "mean"]):
        if "AVG" not in sql:
            issues.append("Question asks for average, but query doesn't use AVG()")
            suggestions.append("Consider using AVG() function")
            confidence -= 30

    # Check for MAX/MIN
    if any(word in q for word in ["highest", "maximum", "max", "most", "largest", "biggest"]):
        if "MAX" not in sql and "ORDER BY" not in sql:
            issues.append("Question asks for maximum, but query doesn't use MAX() or ORDER BY DESC")
            confidence -= 20

    if any(word in q for word in ["lowest", "minimum", "min", "least", "smallest"]):
        if "MIN" not in sql and "ORDER BY" not in sql:
            issues.append("Question asks for minimum, but query doesn't use MIN() or ORDER BY ASC")
            confidence -= 20

    # Check for GROUP BY when "by" or "per" is mentioned
    if any(word in q for word in [" by ", " per ", " each ", " for each "]):
        if "GROUP BY" not in sql:
            issues.append("Question implies grouping, but query doesn't use GROUP BY")
            suggestions.append("Consider adding GROUP BY clause")
            confidence -= 20

    # Enhanced date/time and duration validation
    date_keywords = [
        "today", "yesterday", "tomorrow",
        "this week", "last week", "next week", "past week",
        "this month", "last month", "next month", "past month",
        "this year", "last year", "next year", "past year",
        "this quarter", "last quarter",
        "january", "february", "march", "april", "may", "june",
        "july", "august", "september", "october", "november", "december",
        "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
        "2024", "2025", "2026", "2023", "2022", "2021", "2020"
    ]

    duration_keywords = [
        "last 7 days", "last 30 days", "last 90 days", "last 365 days",
        "past 7 days", "past 30 days", "past 90 days",
        "last week", "last month", "last year", "last quarter",
        "past week", "past month", "past year",
        "since", "before", "after", "between", "from", "until",
        "days ago", "weeks ago", "months ago", "years ago",
        "recent", "latest", "oldest", "newest"
    ]

    time_period_keywords = [
        "daily", "weekly", "monthly", "yearly", "quarterly",
        "per day", "per week", "per month", "per year",
        "by day", "by week", "by month", "by year", "by date",
        "over time", "trend", "history", "historical"
    ]

    has_date_reference = any(word in q for word in date_keywords)
    has_duration_reference = any(word in q for word in duration_keywords)
    has_time_period = any(word in q for word in time_period_keywords)

    # Check for date columns in schema
    date_column_patterns = ["date", "time", "created", "updated", "timestamp", "_at", "_on"]
    has_date_in_query = any(pattern in sql.lower() for pattern in date_column_patterns)
    has_where_clause = "WHERE" in sql
    has_date_function = any(fn in sql for fn in ["DATE", "DATETIME", "TIMESTAMP", "STRFTIME", "DATE_TRUNC", "EXTRACT", "YEAR", "MONTH", "DAY"])

    if has_date_reference:
        if not has_where_clause:
            issues.append(f"Question mentions a specific time ({[w for w in date_keywords if w in q][0]}), but query has no WHERE clause")
            suggestions.append("Add WHERE clause to filter by the specified date/time")
            confidence -= 25
        elif not has_date_in_query and not has_date_function:
            issues.append("Question mentions a date/time, but query doesn't seem to filter on a date column")
            suggestions.append("Ensure the WHERE clause filters on a date/timestamp column")
            confidence -= 20

    if has_duration_reference:
        if not has_where_clause:
            issues.append(f"Question specifies a duration/period, but query has no WHERE clause to limit the time range")
            suggestions.append("Add WHERE clause with date range filtering (e.g., WHERE created_at >= date)")
            confidence -= 30
        elif not has_date_in_query and not has_date_function:
            issues.append("Question asks for a specific time period, but query may not correctly filter the date range")
            suggestions.append("Verify the date filtering logic matches the requested period")
            confidence -= 20

    if has_time_period:
        if "GROUP BY" not in sql:
            issues.append(f"Question implies time-based grouping ({[w for w in time_period_keywords if w in q][0]}), but query has no GROUP BY")
            suggestions.append("Add GROUP BY clause to aggregate data by the time period")
            confidence -= 25
        elif not has_date_in_query and not has_date_function:
            issues.append("Question asks for time-based analysis, but query may not group by a date column")
            suggestions.append("Ensure GROUP BY includes a date column or date extraction function")
            confidence -= 15

    # Check table relevance
    tables_in_query = []
    for table_name in schema.keys():
        if table_name.upper() in sql or f'"{table_name}"' in query:
            tables_in_query.append(table_name)

    # Check if mentioned entities exist in queried tables
    for table_name in schema.keys():
        table_singular = table_name.rstrip('s').lower()
        if table_singular in q and table_name not in tables_in_query:
            if not any(t.lower().startswith(table_singular) for t in tables_in_query):
                issues.append(f"Question mentions '{table_singular}' but query doesn't use '{table_name}' table")
                confidence -= 15

    # Check LIMIT for "top N" or "first N" queries
    if any(word in q for word in ["top ", "first ", "best "]):
        if "LIMIT" not in sql:
            issues.append("Question asks for top/first items but query has no LIMIT")
            suggestions.append("Add LIMIT clause to restrict results")
            confidence -= 10

    # Determine overall status
    confidence = max(confidence, 20)  # Minimum 20%

    if confidence >= 80:
        status = "good"
        message = "Query looks good and matches your question"
    elif confidence >= 60:
        status = "warning"
        message = "Query may partially match your question"
    else:
        status = "error"
        message = "Query might not fully answer your question"

    return {
        "status": status,
        "confidence": confidence,
        "message": message,
        "issues": issues,
        "suggestions": suggestions
    }


def build_schema_context(schema, documentation):
    """Build a text representation of the schema for AI context."""
    if schema is None:
        schema = {}
    if documentation is None:
        documentation = {}
    lines = []
    for table_name, table_info in schema.items():
        table_doc = documentation.get(table_name, {})
        table_desc = table_doc.get("description", "")

        lines.append(f"TABLE: {table_name}")
        if table_desc:
            lines.append(f"  Description: {table_desc}")
        lines.append("  COLUMNS:")

        for col in table_info.get("columns", []):
            col_name = col["name"]
            col_type = col["type"]
            col_doc = table_doc.get("columns", {}).get(col_name, "")
            pk = " (PRIMARY KEY)" if col.get("primary_key") else ""

            line = f"    - {col_name}: {col_type}{pk}"
            if col_doc:
                line += f" -- {col_doc}"
            lines.append(line)

        if table_info.get("foreign_keys"):
            lines.append("  FOREIGN KEYS:")
            for fk in table_info["foreign_keys"]:
                lines.append(f"    - {fk['constrained_columns']} -> {fk['referred_table']}({fk['referred_columns']})")

        lines.append("")

    return "\n".join(lines)


def simple_query_generator(question, schema):
    """Simple pattern-based query generator as fallback."""
    if schema is None:
        schema = {}
    question_lower = question.lower()
    tables = list(schema.keys())

    # Find mentioned table
    target_table = None
    for table in tables:
        if table.lower() in question_lower:
            target_table = table
            break

    if not target_table and tables:
        target_table = tables[0]

    # Detect query type
    if any(word in question_lower for word in ["count", "how many", "total"]):
        return f'SELECT COUNT(*) FROM "{target_table}"'
    elif any(word in question_lower for word in ["all", "show", "list", "get"]):
        return f'SELECT * FROM "{target_table}" LIMIT 100'
    elif "average" in question_lower or "avg" in question_lower:
        # Try to find a numeric column
        columns = schema.get(target_table, {}).get("columns", [])
        numeric_cols = [c["name"] for c in columns if any(t in c["type"].upper() for t in ["INT", "FLOAT", "DECIMAL", "NUMERIC"])]
        if numeric_cols:
            return f'SELECT AVG("{numeric_cols[0]}") FROM "{target_table}"'

    return f'SELECT * FROM "{target_table}" LIMIT 10'


@app.route("/api/status", methods=["GET"])
def get_status():
    """Get the current connection status."""
    return jsonify({
        "connected": db_state.get("engine") is not None,
        "has_schema": db_state.get("schema") is not None,
        "has_documentation": db_state.get("documentation") is not None
    })


if __name__ == "__main__":
    app.run(debug=True, port=5000)

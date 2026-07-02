import datetime

def generate_patient_clinical_summary_html(patient_context: dict) -> str:
    """
    Generates a print-friendly clinical summary report in CSS-styled HTML format.
    """
    full_name = f"{patient_context.get('first_name', 'Patient')} {patient_context.get('last_name', '')}".strip()
    mrn = patient_context.get("mrn", "MRN-XXXXX")
    gender = patient_context.get("gender", "N/A")
    gender_full = "Male" if gender == "M" else "Female" if gender == "F" else "Other"
    birth_date = patient_context.get("birth_date", "N/A")
    status = patient_context.get("status", "active")
    
    diagnoses = patient_context.get("diagnoses", [])
    treatments = patient_context.get("treatments", [])
    
    # Compile diagnosis rows
    diag_rows = ""
    if not diagnoses:
        diag_rows = "<tr><td colspan='3' style='text-align: center; font-style: italic; padding: 10px; color: #888;'>No diagnoses recorded</td></tr>"
    else:
        for d in diagnoses:
            diag_rows += f"""
            <tr>
                <td style='padding: 10px; border-bottom: 1px solid #eee;'>{d.get('primary_site', 'N/A')}</td>
                <td style='padding: 10px; border-bottom: 1px solid #eee;'>{d.get('histology', 'N/A')}</td>
                <td style='padding: 10px; border-bottom: 1px solid #eee;'>{d.get('diagnosis_date', 'N/A')}</td>
            </tr>
            """

    # Compile treatment rows
    tx_rows = ""
    if not treatments:
        tx_rows = "<tr><td colspan='4' style='text-align: center; font-style: italic; padding: 10px; color: #888;'>No treatments recorded</td></tr>"
    else:
        for t in treatments:
            tx_rows += f"""
            <tr>
                <td style='padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;'>{t.get('type', 'N/A').upper()}</td>
                <td style='padding: 10px; border-bottom: 1px solid #eee;'>{t.get('status', 'scheduled').upper()}</td>
                <td style='padding: 10px; border-bottom: 1px solid #eee;'>{t.get('start_date', 'N/A')}</td>
                <td style='padding: 10px; border-bottom: 1px solid #eee;'>{t.get('end_date') or 'Ongoing'}</td>
            </tr>
            """

    current_date = datetime.date.today().strftime("%B %d, %Y")

    html_content = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Clinical Summary - {full_name}</title>
    <style>
        body {{
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            color: #0E1116;
            margin: 40px;
            line-height: 1.5;
        }}
        .header {{
            border-bottom: 3px solid #0B63CE;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }}
        .title {{
            font-size: 24px;
            font-weight: bold;
            color: #0B63CE;
            margin: 0;
        }}
        .subtitle {{
            font-size: 12px;
            color: #888;
            margin: 5px 0 0 0;
            font-weight: bold;
            text-transform: uppercase;
        }}
        .grid {{
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 30px;
        }}
        .section {{
            margin-bottom: 30px;
        }}
        .section-title {{
            font-size: 16px;
            font-weight: bold;
            color: #0E1116;
            border-bottom: 1px solid #ddd;
            padding-bottom: 5px;
            margin-bottom: 15px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }}
        table {{
            width: 100%;
            border-collapse: collapse;
            font-size: 13px;
        }}
        th {{
            background-color: #f7f8fa;
            text-align: left;
            padding: 10px;
            font-weight: bold;
            border-bottom: 2px solid #ddd;
            color: #444;
        }}
        .disclaimer {{
            background-color: #fff9e6;
            border: 1px solid #ffeeba;
            color: #856404;
            padding: 12px;
            font-size: 11px;
            border-radius: 4px;
            margin-top: 40px;
            font-style: italic;
        }}
        @media print {{
            body {{ margin: 20px; }}
            .no-print {{ display: none; }}
        }}
    </style>
</head>
<body>
    <div class="header">
        <div style="display: flex; justify-content: space-between; align-items: baseline;">
            <h1 class="title">Cancer Institute Clinical Summary</h1>
            <span style="font-size: 12px; color: #666;">Generated: {current_date}</span>
        </div>
        <p class="subtitle">Protected Health Information (HIPAA Compliant)</p>
    </div>

    <div class="section">
        <h2 class="section-title">Patient Demographics</h2>
        <div class="grid">
            <div>
                <table style="font-size: 13px;">
                    <tr><td style="padding: 5px 0; color: #666; width: 120px;">Patient Name:</td><td style="font-weight: bold;">{full_name}</td></tr>
                    <tr><td style="padding: 5px 0; color: #666;">Medical Record #:</td><td style="font-mono; font-weight: bold;">{mrn}</td></tr>
                </table>
            </div>
            <div>
                <table style="font-size: 13px;">
                    <tr><td style="padding: 5px 0; color: #666; width: 120px;">Birth Date:</td><td>{birth_date}</td></tr>
                    <tr><td style="padding: 5px 0; color: #666;">Gender:</td><td>{gender_full}</td></tr>
                    <tr><td style="padding: 5px 0; color: #666;">Account Status:</td><td style="text-transform: uppercase; font-weight: bold; color: {'#10B981' if status=='active' else '#888'};">{status}</td></tr>
                </table>
            </div>
        </div>
    </div>

    <div class="section">
        <h2 class="section-title">Oncology Diagnoses</h2>
        <table>
            <thead>
                <tr>
                    <th style="width: 35%;">Primary Site</th>
                    <th style="width: 45%;">Histology</th>
                    <th style="width: 20%;">Date of Diagnosis</th>
                </tr>
            </thead>
            <tbody>
                {diag_rows}
            </tbody>
        </table>
    </div>

    <div class="section">
        <h2 class="section-title">Recorded Treatment History</h2>
        <table>
            <thead>
                <tr>
                    <th style="width: 30%;">Therapy Modality</th>
                    <th style="width: 20%;">Status</th>
                    <th style="width: 25%;">Start Date</th>
                    <th style="width: 25%;">End Date</th>
                </tr>
            </thead>
            <tbody>
                {tx_rows}
            </tbody>
        </table>
        <p style="font-size: 10px; color: #888; margin-top: 10px;">*Note: Radiotherapy reports represent scheduled target modalities. Radiation dose-monitoring parameters are restricted.</p>
    </div>

    <div class="disclaimer">
        <strong>Notice to Attending Clinician:</strong> This document compiles automated records from the Cancer Institute platform. All oncological staging indicators, medication cycles, and diagnostic classifications must be verified independently by the attending physician before determining clinical protocols or active care cycles.
    </div>
</body>
</html>
"""
    return html_content

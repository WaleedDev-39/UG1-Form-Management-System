import qrcode
import base64
from io import BytesIO
from PIL import Image, ImageDraw, ImageFont
import os

def generate_barcode_b64(student_data: dict) -> str:
    """
    Generate a QR code containing all student information.
    """
    ag_number = student_data.get("ag_number", "N/A")
    name = student_data.get("name", "N/A")
    
    # Construct a descriptive multi-line string with all data
    data_lines = [
        "UG1_STUDENT_DATA",
        f"AG: {ag_number}",
        f"Name: {name}",
        f"Father: {student_data.get('father_name', 'N/A')}",
        f"CNIC: {student_data.get('cnic', 'N/A')}",
        f"Semester: {student_data.get('semester', 'N/A')}",
        f"Boarder: {student_data.get('boarder_status', 'N/A')}",
        f"Dept: {student_data.get('department', 'N/A')}",
        f"Prog: {student_data.get('program', 'N/A')}"
    ]
    data = "\n".join(data_lines)
    
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(data)
    qr.make(fit=True)

    img = qr.make_image(fill_color="black", back_color="white").convert('RGB')
    
    # Add a label below the QR code for visual uniqueness
    width, height = img.size
    new_height = height + 40
    new_img = Image.new('RGB', (width, new_height), 'white')
    new_img.paste(img, (0, 0))
    
    draw = ImageDraw.Draw(new_img)
    # Use a basic font
    try:
        # Try to find a font, or fallback to default
        font = ImageFont.load_default()
    except Exception:
        font = None
        
    label = f"{ag_number} | {name}"
    # Calculate text position (approximate since load_default doesn't give size easily)
    draw.text((width//2 - 40, height + 5), label, fill="black")

    buffer = BytesIO()
    new_img.save(buffer, format="PNG")
    buffer.seek(0)
    b64 = base64.b64encode(buffer.read()).decode("utf-8")
    return f"data:image/png;base64,{b64}"


def decode_barcode_image(image_bytes: bytes) -> str:
    """Decode a QR code or barcode from raw image bytes. Returns the AG number."""
    try:
        from pyzbar.pyzbar import decode
        from PIL import Image
        import io

        img = Image.open(io.BytesIO(image_bytes))
        results = decode(img)
        if not results:
            raise ValueError("No QR code or barcode detected in the uploaded image.")
        
        raw_data = results[0].data.decode("utf-8")
        
        # If it's our special format, extract the AG number
        if "UG1_STUDENT_DATA" in raw_data and "AG: " in raw_data:
            # Extract AG number (it's between 'AG: ' and the next newline)
            try:
                parts = raw_data.split("AG: ")
                ag = parts[1].split("\n")[0].strip()
                return ag
            except Exception:
                return raw_data
            
        return raw_data
    except ImportError:
        # Fallback if pyzbar fails or isn't perfect for QR
        try:
            # You could add another QR decoder here if needed, but pyzbar usually handles QR.
            pass
        except Exception:
            pass
        raise RuntimeError("Decoding failed. Ensure pyzbar is installed correctly.")

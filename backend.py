import os
import subprocess
import threading
import webbrowser
import re
import piexif
from PIL.ExifTags import TAGS
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from waitress import serve
import sqlite3
from datetime import datetime
from PIL import Image
from tagger import process_folder
from werkzeug.utils import secure_filename



def run_http_server():
    subprocess.run(["python", "-m", "http.server", "8000"])

# Start the HTTP server in a separate thread
http_server_thread = threading.Thread(target=run_http_server)
http_server_thread.start()


app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

DB_NAME = 'image_database.db'
TAGGED_DIRECTORY = 'tagged'  # Change this to your image directory
IMAGE_DIRECTORY = 'images'  # Change this to your image directory
UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), 'images')
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER


def get_db_connection():
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    conn.execute('''CREATE TABLE IF NOT EXISTS images
                    (path TEXT PRIMARY KEY, tags TEXT, date TEXT)''')
    conn.commit()
    conn.close()


def split_tags(tags_string):
    return [tag.strip().lower() for tag in tags_string.split(',') if tag.strip()]

def read_tags_from_image(image_path):
    try:
        with Image.open(image_path) as img:
            exif_data = img._getexif()
            if exif_data:
                for tag_id, value in exif_data.items():
                    tag = TAGS.get(tag_id, tag_id)
                    if tag == 'Artist':
                        return value
    except Exception as e:
        print(f"Info: No EXIF data found for {image_path}")
    return ""



def read_date_from_image(image_path):
    try:
        # First, try to read EXIF data
        exif_dict = piexif.load(image_path)
        if "Exif" in exif_dict:
            date_time = exif_dict["Exif"].get(piexif.ExifIFD.DateTimeOriginal)
            if date_time:
                return datetime.strptime(date_time.decode(), "%Y:%m:%d %H:%M:%S").isoformat()
        
        # If EXIF data is not available, try to read from PIL
        img = Image.open(image_path)
        info = img._getexif()
        if info:
            for tag, value in info.items():
                if piexif.TAGS.get(tag, tag) == 'DateTimeOriginal':
                    return datetime.strptime(value, "%Y:%m:%d %H:%M:%S").isoformat()
    except Exception as e:
        print(f"Error reading date from {image_path}: {e}")
    
    # If all else fails, use the file modification time
    return datetime.fromtimestamp(os.path.getmtime(image_path)).isoformat()


def sanitize_filename(filename):
    # Remove any non-word (non-alphanumeric + underscore) characters
    filename = re.sub(r'[^\w\.-]', '_', filename)
    # Remove any runs of multiple underscores
    filename = re.sub(r'_+', '_', filename)
    return filename

@app.route('/api/upload', methods=['POST'])
def upload_file():
    try:
        if 'file' not in request.files:
            return jsonify({"error": "No file part"}), 400
        file = request.files['file']
        if file.filename == '':
            return jsonify({"error": "No selected file"}), 400
        if file:
            filename = secure_filename(file.filename)
            file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(file_path)
            print(f"File saved successfully: {file_path}")
            return jsonify({"message": "File uploaded successfully", "path": file_path}), 200
    except Exception as e:
        print(f"Error in upload_file: {str(e)}")
        return jsonify({"error": str(e)}), 500



@app.route('/api/index', methods=['POST'])
def index_images():
    conn = get_db_connection()
    for filename in os.listdir(TAGGED_DIRECTORY):
        if filename.lower().endswith(('.png', '.jpg', '.jpeg')):
            image_path = os.path.join(TAGGED_DIRECTORY, filename)
            tags = read_tags_from_image(image_path)
            date = read_date_from_image(image_path)
            conn.execute("INSERT OR REPLACE INTO images VALUES (?, ?, ?)", (image_path, tags, date))
    conn.commit()
    conn.close()
    return jsonify({"message": "Indexing complete"}), 200


@app.route('/api/update-tags', methods=['POST'])
def update_tags():
    data = request.json
    image_path = data['path']
    new_tags = data['tags']

    try:
        # Convert image to JPG if it's not already
        jpg_path = convert_to_jpg(image_path)
        if jpg_path is None:
            return jsonify({"success": False, "message": "Failed to convert image to JPG"}), 500

        # Add tags to image metadata
        error = add_tags_to_image(jpg_path, new_tags, 0)
        if error > 0:
            return jsonify({"success": False, "message": "Failed to add tags to image metadata"}), 500

        return jsonify({"success": True, "message": "Tags updated successfully"}), 200
    except Exception as e:
        print(f"Error updating tags: {e}")
        return jsonify({"success": False, "message": "Failed to update tags"}), 500

def convert_to_jpg(image_path):
    filename, ext = os.path.splitext(image_path)
    if ext.lower() != '.jpg' and ext.lower() != '.jpeg':
        try:
            with Image.open(image_path) as img:
                rgb_img = img.convert('RGB')
                jpg_path = f"{filename}.jpg"
                rgb_img.save(jpg_path, 'JPEG')
            os.remove(image_path)  # Remove the original non-JPG file
            print(f"Converted {image_path} to JPG")
            return jpg_path
        except Exception as e:
            print(f"Error converting {image_path} to JPG: {str(e)}")
            return None
    return image_path

def add_tags_to_image(image_path, tags, error):
    try:
        exif_dict = piexif.load(image_path)
    except piexif.InvalidImageDataError:
        exif_dict = {"0th":{}, "Exif":{}, "GPS":{}, "1st":{}, "thumbnail":None}

    # Ensure '0th' and 'Exif' keys exist
    if "0th" not in exif_dict:
        exif_dict["0th"] = {}
    if "Exif" not in exif_dict:
        exif_dict["Exif"] = {}

    # Add tags to EXIF data
    exif_dict["0th"][piexif.ImageIFD.Artist] = tags.encode('utf-8')
    exif_dict["Exif"][piexif.ExifIFD.UserComment] = tags.encode('utf-8')

    exif_bytes = piexif.dump(exif_dict)

    try:
        with Image.open(image_path) as img:
            if img.mode in ('RGBA', 'LA'):
                background = Image.new(img.mode[:-1], img.size, (255, 255, 255))
                background.paste(img, img.split()[-1])
                img = background.convert('RGB')
            elif img.mode != 'RGB':
                img = img.convert('RGB')
            
            img.save(image_path, 'JPEG', exif=exif_bytes)
        print(f"Tags added to {image_path}")
    except Exception as e:
        print(f"Error adding tags to {image_path}: {str(e)}")
        error += 1
    return error


@app.route('/api/search', methods=['GET'])
def search_images():
    search_tags = request.args.get('tags', '')
    search_tags = split_tags(search_tags)
    
    results = []
    for filename in os.listdir(TAGGED_DIRECTORY):
        if filename.lower().endswith(('.png', '.jpg', '.jpeg')):
            image_path = os.path.join(TAGGED_DIRECTORY, filename)
            tags = read_tags_from_image(image_path)
            date = read_date_from_image(image_path)
            
            if all(any(re.search(r'\b' + re.escape(st) + r'\w*\b', it) for it in tags.split(',')) for st in search_tags):
                results.append({"path": image_path, "tags": tags, "date": date})
    
    print(f"Returning {len(results)} results")
    return jsonify(results)


@app.route('/api/image/<path:image_path>')
def serve_image(image_path):
    full_path = os.path.join(os.getcwd(), image_path)
    return send_file(full_path, mimetype='image/jpeg')


@app.route('/api/all-tags', methods=['GET'])
def get_all_tags():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT DISTINCT tags FROM images")
    results = cursor.fetchall()
    
    all_tags = set()
    for row in results:
        tags = row['tags'].split(',')
        all_tags.update(tag.strip().lower() for tag in tags if tag.strip())
    
    conn.close()
    return jsonify(list(all_tags))


@app.route('/api/process-folder', methods=['POST'])
def process_folder_api():
    try:
        process_folder("images")
        return jsonify({"message": "Folder processed successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500



if __name__ == '__main__':
    init_db()
    port = int(os.environ.get('PORT', 5000))
    serve(app, host='0.0.0.0', port=port)

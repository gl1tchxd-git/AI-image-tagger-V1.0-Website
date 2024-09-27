import os
import shutil
import piexif
from PIL import Image
from img2txt import img2txtProcess

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

    if not exif_dict.get("0th"):
        exif_dict["0th"] = {}
    
    exif_dict["0th"][piexif.ImageIFD.Artist] = tags.encode('utf-8')
    
    if not exif_dict.get("Exif"):
        exif_dict["Exif"] = {}
    
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
        print(f"Tags and metadata added to {image_path}")
    except Exception as e:
        print(f"Error adding tags and metadata to {image_path}: {str(e)}")
        error += 1
    return error


def process_folder(folder_path):
    tagged_folder = os.path.join(tagged_dir)
    os.makedirs(tagged_folder, exist_ok=True)
    total_error_count = 0

    for filename in os.listdir(folder_path):
        if filename.lower().endswith(('.png', '.jpg', '.jpeg', '.gif', '.bmp')):
            image_path = os.path.join(folder_path, filename)
            error_count = 0
            try:
                # First, try to open the image to verify it's valid
                try:
                    with Image.open(image_path) as img:
                        img.verify()
                except Exception as e:
                    print(f"Error verifying image {image_path}: {str(e)}")
                    total_error_count += 1
                    continue

                jpg_path = convert_to_jpg(image_path)
                if jpg_path is None:
                    error_count += 1
                    continue

                tags = img2txtProcess(jpg_path)
                error_count = add_tags_to_image(jpg_path, tags, error_count)

                if error_count == 0:
                    tagged_image_path = os.path.join(tagged_folder, os.path.basename(jpg_path))
                    shutil.move(jpg_path, tagged_image_path)
                    print(f"Moved {os.path.basename(jpg_path)} to {tagged_folder}")
                else:
                    print(f"Errors occurred. Not moving {os.path.basename(jpg_path)} to tagged folder.")
                
                total_error_count += error_count

            except Exception as e:
                print(f"Error processing {image_path}: {str(e)}")
                total_error_count += 1

    print(f"Total errors: {total_error_count}")



folder_path = "images"
tagged_dir = "tagged"

# Process all images in the folder
process_folder(folder_path)

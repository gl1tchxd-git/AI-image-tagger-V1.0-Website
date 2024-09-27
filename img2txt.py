import os
import numpy as np
import onnxruntime as ort
import pandas as pd
import huggingface_hub

from PIL import Image
from onnxruntime import InferenceSession

global_model = None
global_labels = None

MODEL_REPO = "SmilingWolf/wd-swinv2-tagger-v3"

            #####   DELETE THE MODEL FILE BEFORE USING A DIFFERENT MODEL!!!   #####

            # AVAILABLE MODELS:
            # SmilingWolf/wd-swinv2-tagger-v3       ***STANDARD MODEL***
            # SmilingWolf/wd-convnext-tagger-v3
            # SmilingWolf/wd-vit-tagger-v3
            # SmilingWolf/wd-vit-large-tagger-v3
            # SmilingWolf/wd-eva02-large-tagger-v3
MODEL_FILENAME = "model.onnx"
LABEL_FILENAME = "selected_tags.csv"

def download_model():
    local_model_path = os.path.join(os.getcwd(), MODEL_FILENAME)
    local_csv_path = os.path.join(os.getcwd(), LABEL_FILENAME)

    if not os.path.exists(local_model_path):
        huggingface_hub.hf_hub_download(MODEL_REPO, MODEL_FILENAME, local_dir=os.getcwd())
    
    if not os.path.exists(local_csv_path):
        huggingface_hub.hf_hub_download(MODEL_REPO, LABEL_FILENAME, local_dir=os.getcwd())

    return local_csv_path, local_model_path

def load_labels(csv_path):
    tags_df = pd.read_csv(csv_path)
    tag_names = tags_df["name"].tolist()
    rating_indexes = list(np.where(tags_df["category"] == 9)[0])
    general_indexes = list(np.where(tags_df["category"] == 0)[0])
    character_indexes = list(np.where(tags_df["category"] == 4)[0])
    return tag_names, rating_indexes, general_indexes, character_indexes

def prepare_image(image, target_size):
    if isinstance(image, str):
        image = Image.open(image).convert("RGBA")
    elif isinstance(image, np.ndarray):
        image = Image.fromarray(image).convert("RGBA")

    canvas = Image.new("RGBA", image.size, (255, 255, 255))
    canvas.alpha_composite(image)
    image = canvas.convert("RGB")

    image_shape = image.size
    max_dim = max(image_shape)
    pad_left = (max_dim - image_shape[0]) // 2
    pad_top = (max_dim - image_shape[1]) // 2

    padded_image = Image.new("RGB", (max_dim, max_dim), (255, 255, 255))
    padded_image.paste(image, (pad_left, pad_top))

    if max_dim != target_size:
        padded_image = padded_image.resize((target_size, target_size), Image.BICUBIC)

    image_array = np.asarray(padded_image, dtype=np.float32)
    image_array = image_array[:, :, ::-1]  # RGB to BGR

    return np.expand_dims(image_array, axis=0)

def img2txtProcess(image, threshold=0.35, character_threshold=0.85, exclude_tags=""):
    global global_model, global_labels

    if global_model is None or global_labels is None:
        csv_path, model_path = download_model()
        global_model = InferenceSession(model_path, providers=['CPUExecutionProvider'])
        global_labels = load_labels(csv_path)

    model = global_model
    tag_names, rating_indexes, general_indexes, character_indexes = global_labels

    input = model.get_inputs()[0]
    target_size = input.shape[2]  # Assuming square input

    image_array = prepare_image(image, target_size)

    input_name = model.get_inputs()[0].name
    label_name = model.get_outputs()[0].name
    preds = model.run([label_name], {input_name: image_array})[0]

    labels = list(zip(tag_names, preds[0].astype(float)))

    general = [labels[i] for i in general_indexes if labels[i][1] > threshold]
    character = [labels[i] for i in character_indexes if labels[i][1] > character_threshold]

    all_tags = character + general
    remove = [s.strip() for s in exclude_tags.lower().split(",")]
    all_tags = [tag for tag in all_tags if tag[0].lower() not in remove]

    res = ", ".join((item[0].replace("(", "\$$").replace(")", "\$$").replace("_", " ") for item in all_tags))
    return res
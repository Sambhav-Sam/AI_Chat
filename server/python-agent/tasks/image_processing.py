#!/usr/bin/env python3
"""
Image Processing Task Module
Provides various image processing operations in an isolated environment
"""

import os
import sys
import json
import base64
import logging
from io import BytesIO
import traceback

try:
    import numpy as np
    from PIL import Image, ImageFilter, ImageEnhance, ImageDraw, ImageFont
    import cv2
except ImportError as e:
    print(f"Required module not found: {e}")
    sys.exit(1)

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def execute(params):
    """
    Execute an image processing task based on provided parameters
    
    Args:
        params (dict): Task parameters including image source and operations
        
    Returns:
        dict: Result of the image processing operations
    """
    logger.info(f"Starting image processing task with parameters: {json.dumps(params, default=str)}")
    
    try:
        # Load the image from path or base64 data
        if "image_path" in params and params["image_path"]:
            image = load_image(params["image_path"])
            logger.info(f"Loaded image from path: {params['image_path']}")
        elif "image_data" in params and params["image_data"]:
            # Handle base64 data with or without data URL prefix
            image_data = params["image_data"]
            if "," in image_data:
                # Remove data URL prefix if present (e.g. data:image/png;base64,)
                image_data = image_data.split(",", 1)[1]
            
            # Decode base64 data
            image_bytes = base64.b64decode(image_data)
            image = Image.open(BytesIO(image_bytes))
            logger.info("Loaded image from base64 data")
        else:
            return {
                "success": False,
                "error": "No image source provided. Please provide either image_path or image_data",
                "error_type": "input_error"
            }
            
        # Get original image info
        original_info = get_image_info(image)
        logger.info(f"Original image info: {original_info}")
        
        # Process operations in sequence
        if "operations" in params and isinstance(params["operations"], list):
            for i, operation in enumerate(params["operations"]):
                logger.info(f"Applying operation {i+1}/{len(params['operations'])}: {operation['type']}")
                
                if "type" not in operation or "params" not in operation:
                    logger.warning(f"Skipping invalid operation: {operation}")
                    continue
                    
                try:
                    image = apply_operation(image, operation["type"], operation["params"])
                except Exception as e:
                    logger.error(f"Error applying operation {operation['type']}: {str(e)}")
                    return {
                        "success": False,
                        "error": f"Error applying operation {operation['type']}: {str(e)}",
                        "error_type": "processing_error"
                    }
        
        # Get processed image info
        processed_info = get_image_info(image)
        logger.info(f"Processed image info: {processed_info}")
        
        # Encode the processed image
        output_format = params.get("output_format", "png").lower()
        output_image = encode_image(image, output_format)
        
        return {
            "success": True,
            "output_image": output_image,
            "original_info": original_info,
            "processed_info": processed_info
        }
        
    except Exception as e:
        logger.error(f"Error processing image: {str(e)}")
        logger.error(traceback.format_exc())
        return {
            "success": False,
            "error": f"Error processing image: {str(e)}",
            "error_type": "execution_error"
        }

def load_image(path):
    """
    Load an image from a file path
    
    Args:
        path (str): Path to the image file
        
    Returns:
        PIL.Image: Loaded image
    """
    if not os.path.exists(path):
        raise FileNotFoundError(f"Image file not found: {path}")
    
    return Image.open(path).convert("RGBA")

def get_image_info(image):
    """
    Get information about the image
    
    Args:
        image (PIL.Image): Image to get information about
        
    Returns:
        dict: Image information
    """
    return {
        "width": image.width,
        "height": image.height,
        "format": image.format,
        "mode": image.mode
    }

def apply_operation(image, operation_type, params):
    """
    Apply a specific operation to the image
    
    Args:
        image (PIL.Image): Image to process
        operation_type (str): Type of operation
        params (dict): Operation parameters
        
    Returns:
        PIL.Image: Processed image
    """
    operations = {
        "resize": resize_image,
        "crop": crop_image,
        "rotate": rotate_image,
        "flip": flip_image,
        "filter": apply_filter,
        "adjust": adjust_image,
        "overlay": overlay_text,
        "advanced": apply_advanced_operation
    }
    
    if operation_type not in operations:
        logger.warning(f"Unknown operation type: {operation_type}")
        return image
    
    return operations[operation_type](image, params)

def resize_image(image, params):
    """Resize an image to specified dimensions"""
    logger.info(f"Resizing image with params: {params}")
    
    width = params.get("width")
    height = params.get("height")
    maintain_aspect = params.get("maintain_aspect", True)
    
    if not width and not height:
        return image
    
    original_width, original_height = image.size
    
    if maintain_aspect:
        if width and not height:
            ratio = width / original_width
            height = int(original_height * ratio)
        elif height and not width:
            ratio = height / original_height
            width = int(original_width * ratio)
        elif width and height:
            # Calculate the scaling factor to maintain aspect ratio
            width_ratio = width / original_width
            height_ratio = height / original_height
            ratio = min(width_ratio, height_ratio)
            width = int(original_width * ratio)
            height = int(original_height * ratio)
    
    return image.resize((width, height), Image.LANCZOS)

def crop_image(image, params):
    """Crop an image to specified coordinates"""
    logger.info(f"Cropping image with params: {params}")
    
    left = params.get("left", 0)
    top = params.get("top", 0)
    right = params.get("right")
    bottom = params.get("bottom")
    
    if right is None or bottom is None:
        logger.warning("Missing crop coordinates, right and bottom are required")
        return image
    
    return image.crop((left, top, right, bottom))

def rotate_image(image, params):
    """Rotate an image by specified angle"""
    logger.info(f"Rotating image with params: {params}")
    
    angle = params.get("angle", 0)
    expand = params.get("expand", True)
    
    return image.rotate(angle, expand=expand, resample=Image.BICUBIC)

def flip_image(image, params):
    """Flip an image horizontally or vertically"""
    logger.info(f"Flipping image with params: {params}")
    
    direction = params.get("direction", "horizontal")
    
    if direction == "horizontal":
        return image.transpose(Image.FLIP_LEFT_RIGHT)
    elif direction == "vertical":
        return image.transpose(Image.FLIP_TOP_BOTTOM)
    else:
        logger.warning(f"Unknown flip direction: {direction}")
        return image

def apply_filter(image, params):
    """Apply a filter to the image"""
    logger.info(f"Applying filter with params: {params}")
    
    filter_type = params.get("filter_type")
    radius = params.get("radius", 2)
    
    if not filter_type:
        logger.warning("No filter type specified")
        return image
    
    filters = {
        "blur": ImageFilter.GaussianBlur(radius),
        "sharpen": ImageFilter.SHARPEN,
        "edge_enhance": ImageFilter.EDGE_ENHANCE,
        "find_edges": ImageFilter.FIND_EDGES,
        "emboss": ImageFilter.EMBOSS,
        "contour": ImageFilter.CONTOUR
    }
    
    if filter_type not in filters:
        logger.warning(f"Unknown filter type: {filter_type}")
        return image
    
    return image.filter(filters[filter_type])

def adjust_image(image, params):
    """Adjust image properties like brightness, contrast, etc."""
    logger.info(f"Adjusting image with params: {params}")
    
    adjust_type = params.get("adjust_type")
    factor = params.get("factor", 1.0)
    
    if not adjust_type:
        logger.warning("No adjustment type specified")
        return image
    
    adjustments = {
        "brightness": ImageEnhance.Brightness,
        "contrast": ImageEnhance.Contrast,
        "color": ImageEnhance.Color,
        "sharpness": ImageEnhance.Sharpness
    }
    
    if adjust_type not in adjustments:
        logger.warning(f"Unknown adjustment type: {adjust_type}")
        return image
    
    enhancer = adjustments[adjust_type](image)
    return enhancer.enhance(factor)

def overlay_text(image, params):
    """Overlay text on the image"""
    logger.info(f"Overlaying text with params: {params}")
    
    text = params.get("text")
    position = params.get("position", [10, 30])
    font_scale = params.get("font_scale", 1.0)
    color = params.get("color", [255, 255, 255])
    thickness = params.get("thickness", 2)
    
    if not text:
        logger.warning("No text provided for overlay")
        return image
    
    # Convert to RGB to support drawing
    if image.mode == 'RGBA':
        draw_image = Image.new("RGB", image.size, (0, 0, 0))
        draw_image.paste(image, mask=image.split()[3])
    else:
        draw_image = image.convert("RGB")
    
    # Convert PIL Image to OpenCV format for text overlay
    cv_image = np.array(draw_image)
    cv_image = cv_image[:, :, ::-1].copy()  # RGB to BGR
    
    # Calculate font scale based on base size and user-provided scale
    base_scale = 0.5
    final_scale = base_scale * font_scale
    
    # Add text to the image using OpenCV
    cv2.putText(
        cv_image,
        text,
        tuple(position),
        cv2.FONT_HERSHEY_SIMPLEX,
        final_scale,
        tuple(color),
        thickness,
        cv2.LINE_AA
    )
    
    # Convert back to PIL Image
    result_image = Image.fromarray(cv_image[:, :, ::-1])  # BGR to RGB
    
    # If original was RGBA, preserve transparency
    if image.mode == 'RGBA':
        result_image.putalpha(image.split()[3])
    
    return result_image

def apply_advanced_operation(image, params):
    """Apply advanced image processing operations using OpenCV"""
    logger.info(f"Applying advanced operation with params: {params}")
    
    operation = params.get("operation")
    
    if not operation:
        logger.warning("No advanced operation specified")
        return image
    
    # Convert PIL Image to OpenCV format
    if image.mode == 'RGBA':
        # Create a white background image
        bg = Image.new('RGB', image.size, (255, 255, 255))
        bg.paste(image, mask=image.split()[3])  # 3 is the alpha channel
        cv_image = np.array(bg)
    else:
        cv_image = np.array(image.convert('RGB'))
    
    cv_image = cv_image[:, :, ::-1].copy()  # RGB to BGR
    
    if operation == "canny":
        threshold1 = params.get("threshold1", 100)
        threshold2 = params.get("threshold2", 200)
        
        # Apply Canny edge detection
        cv_result = cv2.Canny(cv_image, threshold1, threshold2)
        
        # Convert back to 3-channel image
        cv_result = cv2.cvtColor(cv_result, cv2.COLOR_GRAY2BGR)
        
    elif operation == "threshold":
        threshold = params.get("threshold", 127)
        max_value = params.get("max_val", 255)
        
        # Convert to grayscale
        cv_gray = cv2.cvtColor(cv_image, cv2.COLOR_BGR2GRAY)
        
        # Apply binary threshold
        _, cv_result = cv2.threshold(cv_gray, threshold, max_value, cv2.THRESH_BINARY)
        
        # Convert back to 3-channel image
        cv_result = cv2.cvtColor(cv_result, cv2.COLOR_GRAY2BGR)
        
    else:
        logger.warning(f"Unknown advanced operation: {operation}")
        return image
    
    # Convert back to PIL Image
    result_image = Image.fromarray(cv_result[:, :, ::-1])  # BGR to RGB
    
    return result_image

def encode_image(image, format="png"):
    """
    Encode the image to base64
    
    Args:
        image (PIL.Image): Image to encode
        format (str): Output format
        
    Returns:
        str: Base64 encoded image data
    """
    buffer = BytesIO()
    image.save(buffer, format=format)
    return base64.b64encode(buffer.getvalue()).decode('utf-8')

if __name__ == "__main__":
    # Read parameters from file or stdin
    if len(sys.argv) > 1:
        # Read from file
        with open(sys.argv[1], 'r') as f:
            params = json.load(f)
    else:
        # Read from stdin
        try:
            params = json.loads(sys.stdin.read())
        except json.JSONDecodeError:
            print(json.dumps({
                "success": False,
                "error": "Invalid JSON input",
                "error_type": "input_error"
            }))
            sys.exit(1)
    
    # Execute the task
    result = execute(params)
    
    # Output the result
    print(json.dumps(result)) 
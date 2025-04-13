/**
 * Python Image Processing Task Module
 * This module serves as a bridge to execute image processing tasks in an isolated Python container
 */

import { runPythonTaskIsolated } from '../taskIsolationManager.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Execute an image processing task using Python in an isolated container
 * @param {Object} params - Task parameters
 * @returns {Promise<Object>} Results of the Python task execution
 */
export async function execute(params) {
    console.log('Executing Python image processing task with params:', JSON.stringify(params, null, 2));

    // Validate required parameters
    if (!params.image_data && !params.image_path) {
        return handleError('Missing required parameter: either image_data or image_path must be provided');
    }

    try {
        // If image_path is a relative path, resolve it
        if (params.image_path && !params.image_path.startsWith('/')) {
            params.image_path = path.resolve(process.cwd(), params.image_path);
        }

        // Create the task object for the Python container
        const pythonTask = {
            intent: 'image_processing',
            parameters: {
                ...params,
                operations: params.operations || [],
                output_format: params.output_format || 'png'
            }
        };

        // Execute the task in an isolated Python container
        const result = await runPythonTaskIsolated(pythonTask);

        // Handle the result
        if (!result.success) {
            return result;
        }

        // Format the output image if needed
        if (params.return_data_url && result.output_image) {
            const format = params.output_format || 'png';
            result.output_image = `data:image/${format};base64,${result.output_image}`;
        }

        return result;
    } catch (error) {
        return handleError(`Error executing image processing task: ${error.message}`);
    }
}

/**
 * Handle errors consistently
 * @param {string} message - Error message
 * @returns {Object} Error result object
 */
function handleError(message) {
    console.error(`Image processing error: ${message}`);
    return {
        success: false,
        error: message,
        error_type: 'execution_error'
    };
}

/**
 * Get available image processing operations
 * @returns {Object} Available operations and their descriptions
 */
export function getAvailableOperations() {
    return {
        resize: {
            description: "Resize an image to specified dimensions",
            parameters: {
                width: "Width in pixels (number)",
                height: "Height in pixels (number)",
                maintain_aspect: "Whether to maintain aspect ratio (boolean, default: true)"
            }
        },
        crop: {
            description: "Crop an image to specified coordinates",
            parameters: {
                left: "Left coordinate (number, default: 0)",
                top: "Top coordinate (number, default: 0)",
                right: "Right coordinate (number, required)",
                bottom: "Bottom coordinate (number, required)"
            }
        },
        rotate: {
            description: "Rotate an image by specified angle",
            parameters: {
                angle: "Rotation angle in degrees (number, default: 0)",
                expand: "Whether to expand the output image to fit rotated corners (boolean, default: true)"
            }
        },
        flip: {
            description: "Flip an image horizontally or vertically",
            parameters: {
                direction: "Direction to flip ('horizontal' or 'vertical', default: 'horizontal')"
            }
        },
        filter: {
            description: "Apply a filter to the image",
            parameters: {
                filter_type: "Type of filter ('blur', 'sharpen', 'edge_enhance', 'find_edges', 'emboss', 'contour', required)",
                radius: "Radius for blur filter (number, default: 2)"
            }
        },
        adjust: {
            description: "Adjust image properties",
            parameters: {
                adjust_type: "Type of adjustment ('brightness', 'contrast', 'color', 'sharpness', required)",
                factor: "Adjustment factor (number, default: 1.0, values > 1.0 increase, < 1.0 decrease)"
            }
        },
        overlay: {
            description: "Overlay text on the image",
            parameters: {
                text: "Text to overlay (string, required)",
                position: "Position [x, y] coordinates (array of two numbers, default: [10, 30])",
                font_scale: "Font scale factor (number, default: 1.0)",
                color: "Text color [R, G, B] (array of three numbers 0-255, default: [255, 255, 255])",
                thickness: "Text thickness (number, default: 2)"
            }
        },
        advanced: {
            description: "Advanced image processing operations using OpenCV",
            parameters: {
                operation: "Operation type ('canny', 'threshold', required)",
                threshold1: "First threshold for Canny edge detection (number, default: 100)",
                threshold2: "Second threshold for Canny edge detection (number, default: 200)",
                threshold: "Threshold value for binary threshold (number, default: 127)",
                max_val: "Maximum value for binary threshold (number, default: 255)"
            }
        }
    };
}

// Example task for testing
export const exampleTask = {
    image_path: "/path/to/image.jpg", // Or provide image_data instead
    operations: [
        {
            type: "resize",
            params: {
                width: 800,
                height: 600,
                maintain_aspect: true
            }
        },
        {
            type: "filter",
            params: {
                filter_type: "blur",
                radius: 3
            }
        },
        {
            type: "overlay",
            params: {
                text: "Processed Image",
                position: [20, 40],
                font_scale: 1.2,
                color: [255, 255, 0],
                thickness: 2
            }
        }
    ],
    output_format: "png",
    return_data_url: true
}; 